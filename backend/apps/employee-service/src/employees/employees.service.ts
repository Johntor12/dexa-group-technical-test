import { Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { EmployeesRepository } from './employees.repository.js';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListDto,
  pageResult,
} from '../../../../libs/contracts/src/dto.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';
import { fail } from '../../../../libs/common/src/errors.js';
import { departments } from '../../../../libs/contracts/src/department.js';
const include = {
  user: { select: { email: true, active: true } },
} as const;
const activation = () => {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
};
@Injectable()
export class EmployeesService {
  constructor(private readonly repo: EmployeesRepository) {}
  private authorize(p: Principal) {
    if (p.role !== 'HRD') fail(403, 'FORBIDDEN', 'HRD access required.');
  }
  async create(p: Principal, dto: CreateEmployeeDto) {
    this.authorize(p);
    const passwordHash = await hash(randomBytes(32).toString('hex'), 12);
    const invite = activation();
    return this.repo.db.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeNumber: dto.employeeNumber,
          fullName: dto.fullName,
          position: dto.position,
          department: dto.department,
          user: { create: { email: dto.email.toLowerCase(), passwordHash, active: false } },
        },
        include,
      });
      await tx.activationToken.create({
        data: { userId: employee.userId, tokenHash: invite.tokenHash, expiresAt: invite.expiresAt },
      });
      await tx.auditEvent.create({
        data: {
          actorId: p.userId,
          employeeId: employee.id,
          action: 'CREATE',
          changes: {
            fields: [
              'employeeNumber',
              'fullName',
              'position',
              'department',
              'email',
            ],
          },
        },
      });
      return { ...employee, activation: { token: invite.token, expiresAt: invite.expiresAt } };
    });
  }
  async activationLink(p: Principal, id: string) {
    const employee = await this.detail(p, id);
    if (!employee.active || employee.user.active) fail(409, 'ACCOUNT_NOT_PENDING', 'Only pending active employees can receive an activation link.');
    const invite = activation();
    await this.repo.db.$transaction(async (tx) => {
      await tx.activationToken.upsert({
        where: { userId: employee.userId },
        create: { userId: employee.userId, tokenHash: invite.tokenHash, expiresAt: invite.expiresAt },
        update: { tokenHash: invite.tokenHash, expiresAt: invite.expiresAt, usedAt: null },
      });
      await tx.auditEvent.create({ data: { actorId: p.userId, employeeId: id, action: 'REISSUE_ACTIVATION', changes: { expiresAt: invite.expiresAt.toISOString() } } });
    });
    return { token: invite.token, expiresAt: invite.expiresAt };
  }
  async list(p: Principal, q: ListDto) {
    this.authorize(p);
    const filters: Record<string, unknown>[] = [];
    if (q.search)
      filters.push({
        OR: [
          { fullName: { contains: q.search } },
          { employeeNumber: { contains: q.search } },
          { user: { email: { contains: q.search } } },
        ],
      });
    if (q.employeeStatus === 'ACTIVE')
      filters.push({ active: true, user: { active: true } });
    if (q.employeeStatus === 'INACTIVE') filters.push({ active: false });
    if (q.employeeStatus === 'PENDING_ACTIVATION')
      filters.push({ active: true, user: { active: false } });
    const where = {
      ...(q.department ? { department: q.department } : {}),
      ...(filters.length ? { AND: filters } : {}),
    };
    const [data, total] = await this.repo.db.$transaction([
      this.repo.db.employee.findMany({
        where,
        include,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.repo.db.employee.count({ where }),
    ]);
    return pageResult(data, total, q);
  }
  async detail(p: Principal, id: string) {
    this.authorize(p);
    const row = await this.repo.db.employee.findUnique({
      where: { id },
      include,
    });
    if (!row) fail(404, 'NOT_FOUND', 'Employee not found.');
    return row;
  }
  async update(p: Principal, id: string, dto: UpdateEmployeeDto) {
    const before = await this.detail(p, id);
    const { email, ...fields } = dto;
    return this.repo.db.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          ...fields,
          user: {
            update: email ? { email: email.toLowerCase() } : {},
          },
        },
        include,
      });
      await tx.auditEvent.create({
        data: {
          actorId: p.userId,
          employeeId: id,
          action: 'UPDATE',
          changes: {
            before: {
              email: before.user.email,
              fullName: before.fullName,
              employeeNumber: before.employeeNumber,
              department: before.department,
              position: before.position,
            },
            after: {
              email: employee.user.email,
              fullName: employee.fullName,
              employeeNumber: employee.employeeNumber,
              department: employee.department,
              position: employee.position,
            },
          },
        },
      });
      return employee;
    });
  }
  async deactivate(p: Principal, id: string) {
    await this.detail(p, id);
    return this.repo.db.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: { active: false, user: { update: { active: false } } },
        include,
      });
      await tx.session.updateMany({
        where: { userId: employee.userId },
        data: { revoked: true },
      });
      await tx.auditEvent.create({
        data: {
          actorId: p.userId,
          employeeId: id,
          action: 'DEACTIVATE',
          changes: { active: false },
        },
      });
      return employee;
    });
  }
  async departments(p: Principal) {
    this.authorize(p);
    return departments;
  }
}
