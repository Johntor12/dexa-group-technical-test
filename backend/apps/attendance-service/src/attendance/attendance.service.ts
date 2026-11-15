import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { fail } from '../../../../libs/common/src/errors.js';
import { workDate } from '../../../../libs/common/src/time.js';
import {
  ListDto,
  SubmitDto,
  pageResult,
} from '../../../../libs/contracts/src/dto.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';
@Injectable()
export class AttendanceService {
  constructor(
    private readonly repo: AttendanceRepository,
    private readonly storage: PhotoStorage,
  ) {}
  async submit(p: Principal, d: SubmitDto) {
    if (p.role !== 'EMPLOYEE' || !p.employee)
      fail(403, 'FORBIDDEN', 'Only employees may submit attendance.');
    const employee = p.employee;
    const previous = await this.repo.db.idempotency.findUnique({
      where: { employeeId_key: { employeeId: employee.id, key: d.key } },
      include: { attendance: true },
    });
    if (previous) {
      if (previous.fingerprint !== d.fingerprint)
        fail(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This key was used with a different photo.',
        );
      return { record: previous.attendance, replayed: true };
    }
    await this.storage.verify(d);
    const now = new Date();
    try {
      const record = await this.repo.db.$transaction(async (tx) =>
        tx.attendance.create({
          data: {
            employeeId: employee.id,
            employeeName: employee.fullName,
            employeeNumber: employee.employeeNumber,
            department: employee.department,
            submittedAt: now,
            workDate: workDate(now),
            latitude: d.latitude,
            longitude: d.longitude,
            locationAccuracy: d.locationAccuracy,
            wfhReason: d.wfhReason?.trim() || null,
            evidence: {
              create: {
                storageKey: d.storageKey,
                mimeType: d.mimeType,
                size: d.size,
                sha256: d.fingerprint,
              },
            },
            idempotency: {
              create: {
                employeeId: employee.id,
                key: d.key,
                fingerprint: d.fingerprint,
              },
            },
          },
        }),
      );
      return { record, replayed: false };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const replay = await this.repo.db.idempotency.findUnique({
          where: { employeeId_key: { employeeId: employee.id, key: d.key } },
          include: { attendance: true },
        });
        if (replay && replay.fingerprint === d.fingerprint)
          return { record: replay.attendance, replayed: true };
        fail(
          409,
          'ALREADY_SUBMITTED',
          'Attendance already submitted today or key already used.',
        );
      }
      throw error;
    }
  }
  async list(p: Principal, q: ListDto, own: boolean) {
    if (own && (p.role !== 'EMPLOYEE' || !p.employee))
      fail(403, 'FORBIDDEN', 'Employee access required.');
    if (!own && p.role !== 'HRD')
      fail(403, 'FORBIDDEN', 'HRD access required.');
    const where = {
      ...(own
        ? { employeeId: p.employee!.id }
        : q.employeeId
          ? { employeeId: q.employeeId }
          : {}),
      ...(q.date ? { workDate: q.date } : {}),
      ...(q.department ? { department: q.department } : {}),
      ...(q.search
        ? {
            OR: [
              { employeeName: { contains: q.search } },
              { employeeNumber: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.repo.db.$transaction([
      this.repo.db.attendance.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
      }),
      this.repo.db.attendance.count({ where }),
    ]);
    return pageResult(data, total, q);
  }
  async today(p: Principal) {
    if (p.role !== 'EMPLOYEE' || !p.employee)
      fail(403, 'FORBIDDEN', 'Employee access required.');
    return this.repo.db.attendance.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: p.employee.id,
          workDate: workDate(),
        },
      },
    });
  }
  async detail(p: Principal, id: string) {
    const row = await this.repo.db.attendance.findUnique({ where: { id } });
    if (!row) fail(404, 'NOT_FOUND', 'Attendance not found.');
    if (p.role !== 'HRD' && row.employeeId !== p.employee?.id)
      fail(403, 'FORBIDDEN', 'You cannot view this attendance.');
    return row;
  }
  async evidence(p: Principal, id: string) {
    await this.detail(p, id);
    const row = await this.repo.db.evidence.findUnique({
      where: { attendanceId: id },
    });
    if (!row) fail(404, 'NOT_FOUND', 'Evidence not found.');
    return row;
  }
}
