export const API_URL =
  process.env.REACT_APP_API_URL ?? "http://localhost:3000/api/v1";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  token = "",
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  }).catch(() => {
    throw new ApiError(
      'Tidak dapat terhubung ke backend. Jalankan MySQL dan layanan NestJS, lalu coba lagi.',
      0,
    );
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      Array.isArray(error.message)
        ? error.message.join("; ")
        : (error.message ?? "Permintaan gagal. Silakan coba kembali."),
      response.status,
    );
  }
  if (response.headers.get("content-type")?.startsWith("image/"))
    return (await response.blob()) as T;
  return response.json() as Promise<T>;
}
export interface User {
  userId: string;
  role: "HRD" | "EMPLOYEE";
  reviewDepartments?: DepartmentCode[];
  employee?: { id: string; fullName: string };
}
export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  position: string;
  department: DepartmentCode;
  user: { email: string; active: boolean };
  active: boolean;
}
export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department: DepartmentCode;
  submittedAt: string;
  workDate: string;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  wfhReason: string | null;
  source?: 'DIRECT' | 'CORRECTION';
  correctionRequestId?: string | null;
}
export interface CorrectionDay { workDate: string; status: 'NOT_RECORDED' | 'CORRECTION_PENDING' | 'CORRECTION_APPROVED' | 'CORRECTION_REJECTED' | 'SUBMITTED'; requestId: string | null; submittedAt: string | null; reviewedAt: string | null; reviewNote: string | null }
export interface CorrectionRequest {
  id: string; employeeId: string; workDate: string; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; requestedAt: string; reviewedAt: string | null; reviewNote: string | null;
  employee: { fullName: string; employeeNumber: string; department: DepartmentCode };
  priorRejectedRequestId: string | null;
  evidence: { id: string; mimeType: string; size: number; uploadedAt: string }[];
  attendance: Attendance | null;
}
export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface Department {
  code: DepartmentCode;
  name: string;
}
export type DepartmentCode =
  | 'SALES' | 'MARKETING' | 'PRODUCTION' | 'FINANCE' | 'HR' | 'IT'
  | 'R_AND_D' | 'LOGISTIC' | 'ADMINISTRATION_AND_SECRETARY' | 'DESIGN_DEPARTMENT';
