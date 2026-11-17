import { Injectable } from '@nestjs/common';
import { Database } from '../../../../libs/common/src/database.js';
import { fail } from '../../../../libs/common/src/errors.js';
import { workDate } from '../../../../libs/common/src/time.js';
import {
  MissedCheckInClaimDecisionDto,
  MissedCheckInClaimDto,
  MissedCheckInClaimQueueDto,
  MissedCheckInClaimRejectDto,
  ListDto,
  pageResult,
} from '../../../../libs/contracts/src/dto.js';
import type { Principal } from '../../../../libs/contracts/src/contracts.js';

const claimInclude = {
  employee: {
    select: {
      id: true,
      userId: true,
      fullName: true,
      employeeNumber: true,
      department: true,
    },
  },
  reviewer: { select: { id: true, email: true } },
  attendance: true,
} as const;

const publicClaim = (row: any) => {
  const { userId: _userId, ...employee } = row.employee;
  return {
    id: row.id,
    employeeId: row.employeeId,
    employee,
    workDate: row.workDate,
    claimedCheckInTime: row.claimedCheckInTime,
    claimedCheckOutTime: row.claimedCheckOutTime,
    taskDescription: row.taskDescription,
    reason: row.reason,
    truthConfirmed: row.truthConfirmed,
    status: row.status,
    requestedAt: row.requestedAt,
    reviewedAt: row.reviewedAt,
    reviewer: row.reviewer,
    reviewNote: row.reviewNote,
    attendance: row.attendance,
  };
};

function claimedMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function daysAgo(date: string) {
  const today = workDate();
  return Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
      86400000,
  );
}

function claimWindowDays() {
  const days = Number(process.env.MISSED_CHECKIN_CLAIM_WINDOW_DAYS ?? 7);
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error('MISSED_CHECKIN_CLAIM_WINDOW_DAYS must be 1-365');
  return days;
}

@Injectable()
export class MissedCheckInClaimsService {
  constructor(private readonly database: Database) {}

  private get db() {
    return this.database.client;
  }

  private employee(principal: Principal) {
    if (principal.role !== 'EMPLOYEE' || !principal.employee)
      fail(403, 'FORBIDDEN', 'Employee access required.');
    return principal.employee;
  }

  private reviewerDepartments(principal: Principal) {
    const departments = principal.missedCheckInReviewDepartments;
    if (!departments?.length)
      fail(403, 'REVIEW_SCOPE_FORBIDDEN', 'Missed check-in reviewer permission required.');
    return departments;
  }

  async create(principal: Principal, dto: MissedCheckInClaimDto) {
    const employee = this.employee(principal);
    if (!dto.truthConfirmed)
      fail(400, 'TRUTH_CONFIRMATION_REQUIRED', 'Confirm that the claim matches the WFH work you performed.');
    if (dto.reason.trim().length < 20)
      fail(400, 'INVALID_CLAIM_REASON', 'Reason must contain at least 20 non-whitespace characters.');

    const daysOld = daysAgo(dto.workDate);
    if (daysOld < 1 || daysOld > claimWindowDays())
      fail(422, 'CLAIM_DATE_INVALID', 'Only past dates inside the claim window can be submitted.');
    const duration = claimedMinutes(dto.claimedCheckOutTime) - claimedMinutes(dto.claimedCheckInTime);
    if (duration <= 0 || duration > 480)
      fail(422, 'CLAIM_DURATION_INVALID', 'Claimed work duration must be between 1 minute and 8 hours.');

    const existing = await this.db.missedCheckInClaim.findUnique({
      where: {
        employeeId_idempotencyKey: {
          employeeId: employee.id,
          idempotencyKey: dto.key,
        },
      },
      include: claimInclude,
    });
    if (existing) {
      if (
        existing.workDate !== dto.workDate ||
        existing.claimedCheckInTime !== dto.claimedCheckInTime ||
        existing.claimedCheckOutTime !== dto.claimedCheckOutTime ||
        existing.reason !== dto.reason.trim()
      )
        fail(409, 'IDEMPOTENCY_CONFLICT', 'Key was used with different claim data.');
      return publicClaim(existing);
    }

    if (
      await this.db.attendance.findUnique({
        where: {
          employeeId_workDate: {
            employeeId: employee.id,
            workDate: dto.workDate,
          },
        },
      })
    )
      fail(409, 'ATTENDANCE_ALREADY_RECORDED', 'An attendance record already exists for this date.');

    const row = await this.db.missedCheckInClaim
      .create({
        data: {
          employeeId: employee.id,
          workDate: dto.workDate,
          claimedCheckInTime: dto.claimedCheckInTime,
          claimedCheckOutTime: dto.claimedCheckOutTime,
          reason: dto.reason.trim(),
          truthConfirmed: true,
          idempotencyKey: dto.key,
          pendingKey: `${employee.id}:${dto.workDate}`,
        },
        include: claimInclude,
      })
      .catch((error: unknown) => {
        if ((error as { code?: string }).code === 'P2002')
          fail(409, 'CLAIM_ALREADY_PENDING', 'A claim is already pending for this date.');
        throw error;
      });

    await this.db.auditEvent.create({
      data: {
        actorId: principal.userId,
        employeeId: employee.id,
        action: 'MISSED_CHECKIN_CLAIM',
        changes: { claimId: row.id, workDate: dto.workDate, status: 'PENDING' },
      },
    });
    return publicClaim(row);
  }

  async mine(principal: Principal, query: ListDto) {
    const employee = this.employee(principal);
    const where = { employeeId: employee.id };
    const [rows, total] = await this.db.$transaction([
      this.db.missedCheckInClaim.findMany({
        where,
        include: claimInclude,
        orderBy: { requestedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.missedCheckInClaim.count({ where }),
    ]);
    return pageResult(rows.map(publicClaim), total, query);
  }

  async pending(principal: Principal, query: MissedCheckInClaimQueueDto) {
    const departments = this.reviewerDepartments(principal);
    const where = {
      status: query.status ?? 'PENDING',
      employee: {
        department: { in: departments },
        userId: { not: principal.userId },
      },
    };
    const [rows, total] = await this.db.$transaction([
      this.db.missedCheckInClaim.findMany({
        where,
        include: claimInclude,
        orderBy: { requestedAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.missedCheckInClaim.count({ where }),
    ]);
    return pageResult(rows.map(publicClaim), total, query);
  }

  async decide(
    principal: Principal,
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    note?: string,
  ) {
    if (decision === 'REJECTED' && (!note || note.trim().length < 20))
      fail(400, 'INVALID_CLAIM_REJECTION', 'Rejection reason must contain at least 20 characters.');
    const row = await this.db.missedCheckInClaim.findUnique({
      where: { id },
      include: claimInclude,
    });
    if (!row) fail(404, 'CLAIM_NOT_FOUND', 'Missed check-in claim not found.');
    const departments = this.reviewerDepartments(principal);
    if (
      principal.userId === row.employee.userId ||
      !departments.includes(row.employee.department)
    )
      fail(403, 'REVIEW_SCOPE_FORBIDDEN', 'Reviewer grant does not cover this employee.');
    if (row.status !== 'PENDING')
      fail(409, 'CLAIM_ALREADY_REVIEWED', 'Claim has already been decided.');

    const now = new Date();
    await this.db.$transaction(async (tx) => {
      if (
        decision === 'APPROVED' &&
        (await tx.attendance.findUnique({
          where: {
            employeeId_workDate: {
              employeeId: row.employeeId,
              workDate: row.workDate,
            },
          },
        }))
      )
        fail(409, 'ATTENDANCE_ALREADY_RECORDED', 'An attendance record already exists for this date.');

      const changed = await tx.missedCheckInClaim.updateMany({
        where: { id, status: 'PENDING', version: row.version },
        data: {
          status: decision,
          reviewedAt: now,
          reviewedByUserId: principal.userId,
          reviewNote: note?.trim() || null,
          pendingKey: null,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        fail(409, 'CLAIM_ALREADY_REVIEWED', 'Claim was decided by another reviewer.');

      if (decision === 'APPROVED') {
        const attendance = await tx.attendance.create({
          data: {
            employeeId: row.employeeId,
            employeeName: row.employee.fullName,
            employeeNumber: row.employee.employeeNumber,
            department: row.employee.department,
            workDate: row.workDate,
            submittedAt: now,
            source: 'MISSED_CHECK_IN_CLAIM',
          },
        });
        await tx.missedCheckInClaim.update({
          where: { id },
          data: { attendanceId: attendance.id },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorId: principal.userId,
          employeeId: row.employeeId,
          action: decision === 'APPROVED' ? 'MISSED_CHECKIN_APPROVE' : 'MISSED_CHECKIN_REJECT',
          changes: {
            claimId: id,
            workDate: row.workDate,
            from: 'PENDING',
            to: decision,
            reviewedAt: now.toISOString(),
            note: note?.trim() || null,
          },
        },
      });
    });

    const updated = await this.db.missedCheckInClaim.findUniqueOrThrow({
      where: { id },
      include: claimInclude,
    });
    return publicClaim(updated);
  }
}
