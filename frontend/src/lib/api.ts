export const API_URL = process.env.API_URL ?? "http://localhost:3000/api/v1";
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
      "Tidak dapat menjangkau backend. Periksa URL API dan pastikan layanan backend aktif.",
      0,
    );
  });
  if (!response.ok) {
    const rawError = await response.text().catch(() => "");
    let error: { message?: string | string[] } = {};
    if (rawError.trim()) {
      try {
        error = JSON.parse(rawError) as { message?: string | string[] };
      } catch {
        error = { message: rawError };
      }
    }
    throw new ApiError(
      Array.isArray(error.message)
        ? error.message.join("; ")
        : (error.message ?? "Permintaan gagal. Silakan coba kembali."),
      response.status,
    );
  }
  if (response.headers.get("content-type")?.startsWith("image/"))
    return (await response.blob()) as T;
  // Nest may return 204 (or an empty body) for nullable resources such as
  // /attendances/me/today. Treat that as null instead of throwing a JSON parse error.
  const raw = await response.text();
  if (!raw.trim()) return null as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError(
      "Backend mengirim respons yang bukan JSON valid.",
      response.status,
    );
  }
}
export interface User {
  userId: string;
  role: "HRD" | "EMPLOYEE";
  missedCheckInReviewDepartments?: DepartmentCode[];
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
  employee?: { position: string };
  submittedAt: string;
  workDate: string;
  source?: "DIRECT" | "MISSED_CHECK_IN_CLAIM";
  checkOutDueAt?: string | null;
  checkOutAt?: string | null;
  checkOutRecordedAt?: string | null;
  checkOutType?: "MANUAL" | "AUTO" | null;
}
export interface MissedCheckInClaim {
  id: string;
  employeeId: string;
  workDate: string;
  claimedCheckInTime: string;
  claimedCheckOutTime: string;
  taskDescription?: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  attendance?: Attendance | null;
  employee?: {
    fullName: string;
    employeeNumber: string;
    department: DepartmentCode;
  };
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
  | "SALES"
  | "MARKETING"
  | "PRODUCTION"
  | "FINANCE"
  | "HR"
  | "IT"
  | "R_AND_D"
  | "LOGISTIC"
  | "ADMINISTRATION_AND_SECRETARY"
  | "DESIGN_DEPARTMENT";
