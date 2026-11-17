import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { secret } from '../../../../libs/common/src/config.js';
import { fail } from '../../../../libs/common/src/errors.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';
@Injectable()
export class CredentialsService {
  private readonly logger = new Logger(CredentialsService.name);
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
  async forgotPassword(email: string) {
    if (process.env.NODE_ENV === 'production' &&
      (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM))
      fail(503, 'PASSWORD_RESET_UNAVAILABLE', 'Layanan reset kata sandi sedang tidak tersedia.');
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.repo.db.user.findUnique({
      where: { email: normalizedEmail },
      include: { employee: true },
    });
    // Keep the public response identical for unknown, disabled, or eligible accounts.
    if (!user || !user.active || (user.role === 'EMPLOYEE' && !user.employee?.active))
      return { success: true };

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.repo.db.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tokenHash, expiresAt },
      update: { tokenHash, expiresAt, usedAt: null, createdAt: new Date() },
    });

    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('Password reset email is unavailable: RESEND_API_KEY is not configured.');
      } else {
        this.logger.warn(`Development password reset link (valid for 30 minutes): ${resetUrl}`);
      }
      return process.env.NODE_ENV === 'production'
        ? { success: true }
        : { success: true, developmentResetUrl: resetUrl };
    }
    if (process.env.NODE_ENV === 'production' && !process.env.EMAIL_FROM) {
      this.logger.error('Password reset email is unavailable: EMAIL_FROM is not configured.');
      return { success: true };
    }
    void this.sendPasswordResetEmail(user.email, resetUrl, apiKey);
    return { success: true };
  }
  private async sendPasswordResetEmail(email: string, resetUrl: string, apiKey: string) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'DexaWork <onboarding@resend.dev>',
          to: [email],
          subject: 'Atur ulang kata sandi DexaWork',
          html: `<p>Kami menerima permintaan untuk mengatur ulang kata sandi akun DexaWork Anda.</p><p><a href="${resetUrl}">Atur ulang kata sandi</a></p><p>Tautan berlaku selama 30 menit dan hanya dapat digunakan satu kali. Abaikan email ini jika Anda tidak meminta reset kata sandi.</p>`,
          text: `Atur ulang kata sandi DexaWork: ${resetUrl}\nTautan berlaku selama 30 menit dan hanya dapat digunakan satu kali. Abaikan email ini jika Anda tidak meminta reset kata sandi.`,
        }),
      });
      if (!response.ok)
        this.logger.error(`Password reset email provider returned HTTP ${response.status}.`);
    } catch {
      this.logger.error('Password reset email could not be delivered.');
    }
  }
  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.repo.db.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { employee: true } } },
    });
    const now = new Date();
    if (!reset || reset.usedAt || reset.expiresAt <= now || !reset.user.active ||
      (reset.user.role === 'EMPLOYEE' && !reset.user.employee?.active))
      fail(400, 'INVALID_PASSWORD_RESET', 'Tautan reset tidak valid atau sudah kedaluwarsa.');

    const passwordHash = await hash(password, 12);
    await this.repo.db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1)
        fail(400, 'INVALID_PASSWORD_RESET', 'Tautan reset tidak valid atau sudah kedaluwarsa.');
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await tx.session.updateMany({ where: { userId: reset.userId }, data: { revoked: true } });
    });
    return { success: true };
  }
  async changePassword(principal: Principal, currentPassword: string, newPassword: string) {
    const user = await this.repo.db.user.findUnique({
      where: { id: principal.userId },
      select: { passwordHash: true, active: true },
    });
    if (!user?.active || !(await compare(currentPassword, user.passwordHash)))
      fail(400, 'INVALID_CURRENT_PASSWORD', 'Kata sandi saat ini tidak sesuai.');
    const passwordHash = await hash(newPassword, 12);
    await this.repo.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: principal.userId }, data: { passwordHash } });
      // Force every device, including the current browser, to authenticate again.
      await tx.session.updateMany({ where: { userId: principal.userId }, data: { revoked: true } });
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
