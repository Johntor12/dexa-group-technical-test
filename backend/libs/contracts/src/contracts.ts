export type Role = 'EMPLOYEE' | 'HRD';
import type { DepartmentCode } from './department.js';
export interface Principal {
  userId: string;
  role: Role;
  sessionId: string;
  missedCheckInReviewDepartments?: DepartmentCode[];
  employee?: {
    id: string;
    fullName: string;
    employeeNumber: string;
    department: DepartmentCode;
  };
}
export interface Envelope {
  secret: string;
  requestId: string;
  token?: string;
  data: unknown;
}
export const patterns = {
  login: 'auth.login',
  identity: 'auth.identity',
  logout: 'auth.logout',
  activate: 'auth.activate',
  forgotPassword: 'auth.forgotPassword',
  resetPassword: 'auth.resetPassword',
  changePassword: 'auth.changePassword',
  employees: 'employees.list',
  create: 'employees.create',
  detail: 'employees.detail',
  update: 'employees.update',
  deactivate: 'employees.deactivate',
  departments: 'employees.departments',
  activationLink: 'employees.activation-link',
  submit: 'attendance.submit',
  list: 'attendance.list',
  mine: 'attendance.mine',
  today: 'attendance.today',
  checkOut: 'attendance.checkOut',
  attendance: 'attendance.detail',
  evidence: 'attendance.evidence',
  hrDashboard: 'attendance.hrDashboard',
  hrTodayMonitoring: 'attendance.hrTodayMonitoring',
  hrMissingAttendance: 'attendance.hrMissingAttendance',
  sweep: 'evidence.sweep',
  health: 'health',
  missedCheckInCreate: 'missedCheckIn.create',
  missedCheckInMine: 'missedCheckIn.mine',
  missedCheckInEvidence: 'missedCheckIn.evidence',
  missedCheckInPending: 'missedCheckIn.pending',
  missedCheckInApprove: 'missedCheckIn.approve',
  missedCheckInReject: 'missedCheckIn.reject',
} as const;
