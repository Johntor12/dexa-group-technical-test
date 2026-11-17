import { Injectable } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { fail } from '../../../../libs/common/src/errors.js';
import { workDate } from '../../../../libs/common/src/time.js';
import {
  ListDto,
  SubmitDto,
  CheckOutDto,
  pageResult,
} from '../../../../libs/contracts/src/dto.js';
import { AttendanceEvidenceKind } from '../../../../libs/contracts/src/attendance-evidence.js';
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
    const expectedCheckInKinds = [
      AttendanceEvidenceKind.CHECKIN_WORK_PROOF,
      AttendanceEvidenceKind.CHECKIN_SELFIE,
    ];
    if (
      d.evidence.length !== 2 ||
      expectedCheckInKinds.some((kind) => !d.evidence.some((item) => item.kind === kind))
    )
      fail(400, 'CAPTURE_PAIR_REQUIRED', 'Check-in requires work proof and selfie.');
    await Promise.all(d.evidence.map((item) => this.storage.verify(item)));
    const now = new Date();
    const checkOutDueAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
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
            checkOutDueAt,
            evidence: { create: d.evidence.map((item) => ({
              kind: item.kind,
              workProofType: item.kind === AttendanceEvidenceKind.CHECKIN_WORK_PROOF ? d.workProofType : null,
              storageKey: item.storageKey,
              mimeType: item.mimeType,
              size: item.size,
              sha256: item.fingerprint,
              recordedAt: now,
            })) },
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
      ...(q.source ? { source: q.source } : {}),
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
        include: { missedCheckInClaim: true },
      }),
      this.repo.db.attendance.count({ where }),
    ]);
    return pageResult(data, total, q);
  }
  async hrDashboard(p: Principal) {
    if (p.role !== 'HRD') fail(403, 'FORBIDDEN', 'HRD access required.');
    const date = workDate();
    const [total, submitted, completed, running, recent] = await Promise.all([
      this.repo.db.employee.count({ where: { active: true } }),
      this.repo.db.attendance.groupBy({ by: ['employeeId'], where: { workDate: date } }),
      this.repo.db.attendance.count({ where: { workDate: date, checkOutAt: { not: null } } }),
      this.repo.db.attendance.count({ where: { workDate: date, source: 'DIRECT', checkOutAt: null } }),
      this.repo.db.attendance.findMany({
        where: { workDate: date, source: 'DIRECT' },
        orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
        take: 3,
      }),
    ]);
    return {
      stats: { total, submitted: submitted.length, pending: Math.max(0, total - submitted.length), completed, running },
      recent,
    };
  }
  async hrTodayMonitoring(p: Principal, q: ListDto) {
    if (p.role !== 'HRD') fail(403, 'FORBIDDEN', 'HRD access required.');
    const date = workDate();
    const where = { active: true, user: { active: true } };
    const [employees, total, checkedIn] = await Promise.all([
      this.repo.db.employee.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, active: true } },
          attendances: {
            where: { workDate: date, source: 'DIRECT' },
            select: {
              id: true, employeeId: true, employeeName: true, employeeNumber: true,
              department: true, submittedAt: true, workDate: true, source: true,
              checkOutAt: true, checkOutType: true,
            },
            take: 1,
          },
        },
      }),
      this.repo.db.employee.count({ where }),
      this.repo.db.employee.count({
        where: { ...where, attendances: { some: { workDate: date, source: 'DIRECT' } } },
      }),
    ]);
    const data = employees.map(({ attendances, ...employee }) => ({
      employee,
      attendance: attendances[0] ?? null,
    }));
    return { ...pageResult(data, total, q), checkedIn };
  }
  async hrMissingAttendance(p: Principal, q: ListDto) {
    if (p.role !== 'HRD') fail(403, 'FORBIDDEN', 'HRD access required.');
    const date = q.date || workDate();
    const where = {
      active: true,
      attendances: { none: { workDate: date } },
      ...(q.department ? { department: q.department } : {}),
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search } },
              { employeeNumber: { contains: q.search } },
              { user: { email: { contains: q.search } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.repo.db.$transaction([
      this.repo.db.employee.findMany({
        where,
        include: { user: { select: { email: true, active: true } } },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.repo.db.employee.count({ where }),
    ]);
    return pageResult(data, total, q);
  }
  async today(p: Principal) {
    if (p.role !== 'EMPLOYEE' || !p.employee)
      fail(403, 'FORBIDDEN', 'Employee access required.');
    await this.closeDueSessions(new Date());
    return this.repo.db.attendance.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: p.employee.id,
          workDate: workDate(),
        },
      },
      include: { missedCheckInClaim: true },
    });
  }
  async checkOut(p: Principal, d: CheckOutDto) {
    if (p.role !== 'EMPLOYEE' || !p.employee)
      fail(403, 'FORBIDDEN', 'Only employees may check out.');
    const employeeId = p.employee.id;
    const today = workDate();
    const row = await this.repo.db.attendance.findUnique({
      where: { employeeId_workDate: { employeeId, workDate: today } },
    });
    if (!row) fail(409, 'CHECKIN_REQUIRED', 'Check in before checking out.');
    if (row.checkOutAt) {
      if (row.checkOutType === 'AUTO') return { record: row, replayed: true };
      if (row.checkOutIdempotencyKey === d.key && row.checkOutFingerprint === d.fingerprint)
        return { record: row, replayed: true };
      fail(409, 'ALREADY_CHECKED_OUT', 'This attendance session is already closed.');
    }
    const now = new Date();
    if (row.checkOutDueAt && row.checkOutDueAt <= now) {
      await this.repo.db.attendance.updateMany({
        where: { id: row.id, checkOutAt: null },
        data: { checkOutAt: row.checkOutDueAt, checkOutRecordedAt: now, checkOutType: 'AUTO' },
      });
      return {
        record: await this.repo.db.attendance.findUniqueOrThrow({ where: { id: row.id } }),
        replayed: true,
      };
    }
    const expectedCheckoutKinds = [
      AttendanceEvidenceKind.CHECKOUT_WORK_PROOF,
      AttendanceEvidenceKind.CHECKOUT_SELFIE,
    ];
    if (
      d.evidence.length !== 2 ||
      expectedCheckoutKinds.some((kind) => !d.evidence.some((item) => item.kind === kind))
    )
      fail(400, 'CAPTURE_PAIR_REQUIRED', 'Check-out requires work proof and selfie.');
    await Promise.all(d.evidence.map((item) => this.storage.verify(item)));
    const changed = await this.repo.db.$transaction(async (tx) => {
      const updated = await tx.attendance.updateMany({
        where: { id: row.id, checkOutAt: null },
        data: {
          checkOutAt: now,
          checkOutRecordedAt: now,
          checkOutType: 'MANUAL',
          checkOutIdempotencyKey: d.key,
          checkOutFingerprint: d.fingerprint,
        },
      });
      if (updated.count !== 1) return false;
      await tx.evidence.createMany({
        data: d.evidence.map((item) => ({
          attendanceId: row.id,
          kind: item.kind,
          workProofType: item.kind === AttendanceEvidenceKind.CHECKOUT_WORK_PROOF ? d.workProofType : null,
          storageKey: item.storageKey,
          mimeType: item.mimeType,
          size: item.size,
          sha256: item.fingerprint,
          recordedAt: now,
        })),
      });
      return true;
    });
    const record = await this.repo.db.attendance.findUniqueOrThrow({ where: { id: row.id } });
    if (!changed) {
      if (record.checkOutType === 'AUTO' || (record.checkOutIdempotencyKey === d.key && record.checkOutFingerprint === d.fingerprint))
        return { record, replayed: true };
      fail(409, 'ALREADY_CHECKED_OUT', 'This attendance session is already closed.');
    }
    return { record, replayed: false };
  }
  async closeDueSessions(now = new Date()) {
    const due = await this.repo.db.attendance.findMany({
      where: { checkOutAt: null, checkOutDueAt: { lte: now } },
      select: { id: true, checkOutDueAt: true },
      take: 100,
    });
    let closed = 0;
    for (const row of due) {
      const updated = await this.repo.db.attendance.updateMany({
        where: { id: row.id, checkOutAt: null },
        data: {
          checkOutAt: row.checkOutDueAt,
          checkOutRecordedAt: now,
          checkOutType: 'AUTO',
        },
      });
      closed += updated.count;
    }
    return closed;
  }
  async detail(p: Principal, id: string) {
    const row = await this.repo.db.attendance.findUnique({
      where: { id },
      include: {
        missedCheckInClaim: true,
        employee: { select: { position: true } },
      },
    });
    if (!row) fail(404, 'NOT_FOUND', 'Attendance not found.');
    if (p.role !== 'HRD' && row.employeeId !== p.employee?.id)
      fail(403, 'FORBIDDEN', 'You cannot view this attendance.');
    return row;
  }
  async evidence(p: Principal, request: { id: string; kind: AttendanceEvidenceKind }) {
    await this.detail(p, request.id);
    const row = await this.repo.db.evidence.findUnique({
      where: { attendanceId_kind: { attendanceId: request.id, kind: request.kind } },
    });
    if (!row) fail(404, 'NOT_FOUND', 'Evidence not found.');
    return row;
  }
}
