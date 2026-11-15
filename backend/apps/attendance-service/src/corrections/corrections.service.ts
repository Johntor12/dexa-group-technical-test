import { Injectable } from '@nestjs/common';
import { Database } from '../../../../libs/common/src/database.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { fail } from '../../../../libs/common/src/errors.js';
import { workDate } from '../../../../libs/common/src/time.js';
import { pageResult, type ListDto, type CorrectionCreateDto, type CorrectionInboxDto } from '../../../../libs/contracts/src/dto.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';

const include = { employee: { select: { id: true, userId: true, fullName: true, employeeNumber: true, department: true } }, evidence: true, attendance: true } as const;
const publicRow = (row: any) => ({ id: row.id, employeeId: row.employeeId, employee: row.employee, workDate: row.workDate, requestType: row.requestType, reason: row.reason, status: row.status, requestedAt: row.requestedAt, reviewedAt: row.reviewedAt, reviewedByUserId: row.reviewedByUserId, reviewNote: row.reviewNote, version: row.version, priorRejectedRequestId: row.priorRejectedRequestId, evidence: row.evidence.map((e: any) => ({ id: e.id, mimeType: e.mimeType, size: e.size, uploadedAt: e.uploadedAt })), attendance: row.attendance });
const maxDays = () => {
  const n = Number(process.env.CORRECTION_WINDOW_DAYS ?? 7);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('CORRECTION_WINDOW_DAYS must be 1-365');
  return n;
};
function daysAgo(date: string) {
  const today = workDate();
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
}
@Injectable()
export class CorrectionsService {
  constructor(private readonly database: Database, private readonly storage: PhotoStorage) {}
  private get db() { return this.database.client; }
  private employee(p: Principal) {
    if (p.role !== 'EMPLOYEE' || !p.employee) fail(403, 'FORBIDDEN', 'Employee access required.');
    return p.employee;
  }
  private async eligible(employeeId: string, date: string) {
    const gap = daysAgo(date);
    if (gap < 1 || gap > maxDays()) return false;
    return !!await this.db.correctionEligibleDay.findUnique({ where: { employeeId_workDate: { employeeId, workDate: date } } });
  }
  async days(p: Principal) {
    const employee = this.employee(p);
    const today = workDate();
    const start = new Date(Date.parse(`${today}T00:00:00Z`) - maxDays() * 86400000).toISOString().slice(0, 10);
    const dates = await this.db.correctionEligibleDay.findMany({ where: { employeeId: employee.id, workDate: { gte: start, lt: today } }, orderBy: { workDate: 'desc' } });
    const [attendance, requests] = await Promise.all([
      this.db.attendance.findMany({ where: { employeeId: employee.id, workDate: { in: dates.map(d => d.workDate) } } }),
      this.db.attendanceCorrectionRequest.findMany({ where: { employeeId: employee.id, workDate: { in: dates.map(d => d.workDate) } }, orderBy: { requestedAt: 'desc' } }),
    ]);
    return dates.map(d => {
      const record = attendance.find(a => a.workDate === d.workDate);
      const request = requests.find(r => r.workDate === d.workDate);
      return { workDate: d.workDate, status: record?.source === 'CORRECTION' ? 'CORRECTION_APPROVED' : record ? 'SUBMITTED' : request?.status === 'PENDING' ? 'CORRECTION_PENDING' : request?.status === 'REJECTED' ? 'CORRECTION_REJECTED' : 'NOT_RECORDED', requestId: request?.id ?? null, submittedAt: record?.submittedAt ?? null, reviewedAt: request?.reviewedAt ?? null, reviewNote: request?.reviewNote ?? null };
    });
  }
  async create(p: Principal, d: CorrectionCreateDto) {
    const employee = this.employee(p);
    if (d.reason.trim().length < 20) fail(400, 'INVALID_CORRECTION_REASON', 'Reason must contain at least 20 non-whitespace characters.');
    const existing = await this.db.attendanceCorrectionRequest.findUnique({ where: { employeeId_idempotencyKey: { employeeId: employee.id, idempotencyKey: d.key } }, include });
    if (existing) {
      if (existing.workDate !== d.workDate || existing.reason !== d.reason.trim() || existing.evidence[0]?.sha256 !== d.fingerprint) fail(409, 'IDEMPOTENCY_CONFLICT', 'Key was used with different request data.');
      return { record: publicRow(existing), replayed: true };
    }
    if (!await this.eligible(employee.id, d.workDate)) fail(422, 'CORRECTION_NOT_ELIGIBLE', 'No verified eligible WFH day in the request window.');
    if (await this.db.attendance.findUnique({ where: { employeeId_workDate: { employeeId: employee.id, workDate: d.workDate } } })) fail(409, 'ATTENDANCE_ALREADY_RECORDED', 'Attendance already recorded for this date.');
    const priorRejected = await this.db.attendanceCorrectionRequest.findFirst({ where: { employeeId: employee.id, workDate: d.workDate, status: 'REJECTED' }, orderBy: { requestedAt: 'desc' }, select: { id: true } });
    await this.storage.verify(d);
    try {
      const row = await this.db.$transaction(async tx => {
        const created = await tx.attendanceCorrectionRequest.create({
          data: { employeeId: employee.id, workDate: d.workDate, reason: d.reason.trim(), idempotencyKey: d.key, pendingKey: `${employee.id}:${d.workDate}`, priorRejectedRequestId: priorRejected?.id, evidence: { create: { storageKey: d.storageKey, mimeType: d.mimeType, size: d.size, sha256: d.fingerprint } } }, include,
        });
        await tx.auditEvent.create({ data: { actorId: p.userId, employeeId: employee.id, action: 'CORRECTION_REQUEST', changes: { correctionId: created.id, workDate: d.workDate, status: 'PENDING' } } });
        return created;
      });
      return { record: publicRow(row), replayed: false };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const replay = await this.db.attendanceCorrectionRequest.findUnique({ where: { employeeId_idempotencyKey: { employeeId: employee.id, idempotencyKey: d.key } }, include });
        if (replay && replay.workDate === d.workDate && replay.reason === d.reason.trim() && replay.evidence[0]?.sha256 === d.fingerprint) return { record: publicRow(replay), replayed: true };
        fail(409, 'CORRECTION_ALREADY_PENDING', 'A correction is already pending for this date.');
      }
      throw error;
    }
  }
  async mine(p: Principal, q: ListDto) {
    const employee = this.employee(p);
    const where = { employeeId: employee.id };
    const [rows, total] = await this.db.$transaction([this.db.attendanceCorrectionRequest.findMany({ where, include, orderBy: { requestedAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }), this.db.attendanceCorrectionRequest.count({ where })]);
    return pageResult(rows.map(publicRow), total, q);
  }
  private scope(p: Principal, department: string, ownerId: string) {
    if (p.userId === ownerId) fail(403, 'REVIEW_SCOPE_FORBIDDEN', 'Self-review is prohibited.');
    if (!p.reviewDepartments?.includes(department as any)) fail(403, 'REVIEW_SCOPE_FORBIDDEN', 'Reviewer grant does not cover this department.');
  }
  async detail(p: Principal, id: string) {
    const row = await this.db.attendanceCorrectionRequest.findUnique({ where: { id }, include });
    if (!row) fail(404, 'CORRECTION_NOT_FOUND', 'Correction request not found.');
    if (row.employeeId !== p.employee?.id) this.scope(p, row.employee.department, row.employee.userId);
    return publicRow(row);
  }
  async evidence(p: Principal, id: string, evidenceId: string) {
    await this.detail(p, id);
    const row = await this.db.attendanceCorrectionEvidence.findUnique({ where: { id: evidenceId } });
    if (!row || row.correctionId !== id) fail(404, 'CORRECTION_NOT_FOUND', 'Correction evidence not found.');
    return row;
  }
  async pending(p: Principal, q: CorrectionInboxDto) {
    if (!p.reviewDepartments?.length) fail(403, 'REVIEW_SCOPE_FORBIDDEN', 'Reviewer permission required.');
    const where = { status: q.status ?? 'PENDING', employee: { department: { in: p.reviewDepartments }, userId: { not: p.userId } } };
    const [rows, total] = await this.db.$transaction([this.db.attendanceCorrectionRequest.findMany({ where, include, orderBy: { requestedAt: 'asc' }, skip: (q.page - 1) * q.limit, take: q.limit }), this.db.attendanceCorrectionRequest.count({ where })]);
    return pageResult(rows.map(publicRow), total, q);
  }
  async cancel(p: Principal, id: string) {
    const employee = this.employee(p);
    await this.db.$transaction(async tx => {
      const changed = await tx.attendanceCorrectionRequest.updateMany({ where: { id, employeeId: employee.id, status: 'PENDING' }, data: { status: 'CANCELLED', pendingKey: null, version: { increment: 1 } } });
      if (!changed.count) fail(409, 'CORRECTION_ALREADY_REVIEWED', 'Request is not pending or does not belong to you.');
      await tx.auditEvent.create({ data: { actorId: p.userId, employeeId: employee.id, action: 'CORRECTION_CANCEL', changes: { correctionId: id, status: 'CANCELLED' } } });
    });
    return this.detail(p, id);
  }
  async decide(p: Principal, id: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    if (decision === 'REJECTED' && (!note || note.trim().length < 20)) fail(400, 'INVALID_CORRECTION_REASON', 'Rejection reason must contain at least 20 non-whitespace characters.');
    const row = await this.db.attendanceCorrectionRequest.findUnique({ where: { id }, include });
    if (!row) fail(404, 'CORRECTION_NOT_FOUND', 'Correction request not found.');
    this.scope(p, row.employee.department, row.employee.userId);
    if (row.status !== 'PENDING') fail(409, 'CORRECTION_ALREADY_REVIEWED', 'Request has already been decided.');
    try {
      await this.db.$transaction(async tx => {
        if (decision === 'APPROVED' && await tx.attendance.findUnique({ where: { employeeId_workDate: { employeeId: row.employeeId, workDate: row.workDate } } })) fail(409, 'ATTENDANCE_ALREADY_RECORDED', 'Attendance already recorded for this date.');
        const now = new Date();
        const claimed = await tx.attendanceCorrectionRequest.updateMany({ where: { id, status: 'PENDING', version: row.version }, data: { status: decision, reviewedAt: now, reviewedByUserId: p.userId, reviewNote: note?.trim() || null, pendingKey: null, version: { increment: 1 } } });
        if (!claimed.count) fail(409, 'CORRECTION_ALREADY_REVIEWED', 'Request was decided by another reviewer.');
        if (decision === 'APPROVED') await tx.attendance.create({ data: { employeeId: row.employeeId, employeeName: row.employee.fullName, employeeNumber: row.employee.employeeNumber, department: row.employee.department, workDate: row.workDate, submittedAt: now, source: 'CORRECTION', correctionRequestId: id } });
        await tx.auditEvent.create({ data: { actorId: p.userId, employeeId: row.employeeId, action: decision === 'APPROVED' ? 'CORRECTION_APPROVE' : 'CORRECTION_REJECT', changes: { correctionId: id, workDate: row.workDate, from: 'PENDING', to: decision, note: note?.trim() || null, reviewedAt: now.toISOString() } } });
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') fail(409, 'ATTENDANCE_ALREADY_RECORDED', 'Attendance already recorded for this date.');
      if ((error as { code?: string }).code === 'P2034') fail(409, 'CORRECTION_ALREADY_REVIEWED', 'Concurrent decision conflict. Refresh and retry.');
      throw error;
    }
    return this.detail(p, id);
  }
}
