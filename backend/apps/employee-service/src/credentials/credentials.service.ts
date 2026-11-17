import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { secret } from '../../../../libs/common/src/config.js';
import { fail } from '../../../../libs/common/src/errors.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';
@Injectable()
export class CredentialsService {
  private readonly jwt = new JwtService({
    secret: secret('JWT_SECRET'),
    signOptions: {
      algorithm: 'HS256',
      issuer: 'pharmawork',
      audience: 'pharmawork-web',
      expiresIn: '1h',
    },
  });
  constructor(private readonly repo: EmployeesRepository) {}
  async activate(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const invite = await this.repo.db.activationToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { employee: true } } },
    });
    if (!invite || invite.usedAt || invite.expiresAt <= now || invite.user.active || !invite.user.employee?.active)
      fail(400, 'INVALID_ACTIVATION', 'Activation link is invalid or expired.');
    const passwordHash = await hash(password, 12);
    await this.repo.db.$transaction(async (tx) => {
      const claimed = await tx.activationToken.updateMany({
        where: { id: invite.id, tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) fail(400, 'INVALID_ACTIVATION', 'Activation link is invalid or expired.');
      await tx.user.update({ where: { id: invite.userId }, data: { passwordHash, active: true } });
      await tx.auditEvent.create({ data: { actorId: invite.userId, employeeId: invite.user.employee!.id, action: 'ACTIVATE_ACCOUNT', changes: { activated: true } } });
    });
    return { success: true };
  }
  async login(email: string, password: string) {
    const user = await this.repo.db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { employee: true, missedCheckInReviewGrants: true },
    });
    // Fixed valid bcrypt hash keeps the nonexistent-user path computationally expensive.
    const valid = await compare(
      password,
      user?.passwordHash ??
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxfvpH5yauGQmJwbHVnTaDr4W4q',
    );
    if (
      !user ||
      !valid ||
      !user.active ||
      (user.role === 'EMPLOYEE' && !user.employee?.active)
    )
      fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    const sid = randomUUID();
    const expiresAt = new Date(Date.now() + 3600000);
    await this.repo.db.session.create({
      data: { id: sid, userId: user.id, expiresAt },
    });
    return {
      sessionId: sid,
      userId: user.id,
      expiresAt,
      user: {
        userId: user.id,
        role: user.role,
        sessionId: sid,
        missedCheckInReviewDepartments: user.missedCheckInReviewGrants.filter(g => g.permission === 'MISSED_CHECK_IN_CLAIM_REVIEW').map(g => g.department),
        ...(user.employee
          ? {
              employee: {
                id: user.employee.id,
                fullName: user.employee.fullName,
                employeeNumber: user.employee.employeeNumber,
                department: user.employee.department,
              },
            }
          : {}),
      },
    };
  }
  async identity(token?: string): Promise<Principal> {
    if (!token) fail(401, 'UNAUTHORIZED', 'Authentication required.');
    let claims: { sub: string; sid: string };
    try {
      claims = await this.jwt.verifyAsync(token, {
        algorithms: ['HS256'],
        issuer: 'pharmawork',
        audience: 'pharmawork-web',
      });
    } catch {
      fail(401, 'UNAUTHORIZED', 'Session expired or invalid.');
    }
    if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string')
      fail(401, 'UNAUTHORIZED', 'Invalid session.');
    const session = await this.repo.db.session.findUnique({
      where: { id: claims.sid },
      include: {
        user: { include: { employee: true, missedCheckInReviewGrants: true } },
      },
    });
    if (
      !session ||
      session.revoked ||
      session.expiresAt <= new Date() ||
      session.userId !== claims.sub ||
      !session.user.active ||
      (session.user.role === 'EMPLOYEE' && !session.user.employee?.active)
    )
      fail(401, 'UNAUTHORIZED', 'Session expired or invalid.');
    const { user } = session;
    return {
      userId: user.id,
      role: user.role,
      sessionId: session.id,
      missedCheckInReviewDepartments: user.missedCheckInReviewGrants.filter(g => g.permission === 'MISSED_CHECK_IN_CLAIM_REVIEW').map(g => g.department),
      ...(user.employee
        ? {
            employee: {
              id: user.employee.id,
              fullName: user.employee.fullName,
              employeeNumber: user.employee.employeeNumber,
              department: user.employee.department,
            },
          }
        : {}),
    };
  }
  async logout(token?: string) {
    const user = await this.identity(token);
    await this.repo.db.session.update({
      where: { id: user.sessionId },
      data: { revoked: true },
    });
    return { success: true };
  }
}
