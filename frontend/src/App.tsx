import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AttendanceCaptureBundle } from "./components/attendance/AttendanceCaptureForm";
import type { AttendanceEvidenceImages } from "./components/attendance/SessionFlow";
import { api, ApiError } from "./lib/api";
import type {
  User,
  Employee,
  Attendance,
  Page,
  Department,
  DepartmentCode,
} from "./lib/api";
import { SignInPage } from "./components/auth/SignInPage";
import { ActivateAccountPage } from "./components/auth/ActivateAccountPage";
import { WorkspaceSidebar } from "./components/layout/WorkspaceSidebar";
import { EmployeeForm } from "./components/employees/EmployeeForm";
import type { EmployeeFormValues } from "./components/employees/EmployeeForm";
import { TodayAttendanceCard } from "./components/attendance/TodayAttendanceCard";
import { AttendanceDetail } from "./components/attendance/AttendanceDetail";
import { AttendanceTodaySection } from "./components/attendance/AttendanceTodaySection";
import { MissedCheckInClaimsPanel } from "./components/attendance/MissedCheckInClaimsPanel";
import { ProfilePage } from "./components/profile/ProfilePage";
import { RecordsSection } from "./components/records/RecordsSection";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { Modal } from "./components/ui/Modal";
import { Button } from "./components/ui/Button";
import {
  CheckoutConfirmation,
  SessionCompletion,
  CheckInReceipt,
} from "./components/attendance/SessionFlow";
import { MissedCheckInForm } from "./components/attendance/MissedCheckInForm";

type View =
  | "dashboard"
  | "attendance"
  | "attendance-today"
  | "claim-review"
  | "employees"
  | "submit"
  | "success"
  | "detail"
  | "profile"
  | "employee-form"
  | "checkout"
  | "checkout-success"
  | "checkout-auto"
  | "missed-checkin";
const time = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
const jakartaDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const emptyForm: EmployeeFormValues = {
  email: "",
  fullName: "",
  employeeNumber: "",
  department: "",
  position: "",
};
const base = (role: User["role"]) => (role === "HRD" ? "/hr" : "/app");
function pathFor(view: View, role: User["role"], id?: string) {
  const root = base(role);
  if (view === "dashboard") return root;
  if (view === "profile") return `${root}/profile`;
  if (view === "submit") return "/app/check-in";
  if (view === "success") return "/app/check-in/success";
  if (view === "checkout") return "/app/check-out";
  if (view === "checkout-success") return "/app/check-out/success";
  if (view === "checkout-auto") return "/app/check-out/automatic";
  if (view === "missed-checkin") return "/app/check-in/missed";
  if (view === "attendance-today") return "/hr/attendance/today";
  if (view === "claim-review") return "/hr/attendance/claims";
  if (view === "employees") return "/hr/employees";
  if (view === "employee-form")
    return id ? `/hr/employees/${id}/edit` : "/hr/employees/new";
  if (view === "detail") return `${root}/attendance/${id}`;
  return role === "HRD" ? "/hr/attendance" : "/app/attendance/history";
}
function routeFor(
  path: string,
  role: User["role"],
): { view: View; id?: string } {
  if (path === `${base(role)}/profile`) return { view: "profile" };
  if (role === "EMPLOYEE") {
    if (path === "/app/check-in" || path === "/app/attendance/new")
      return { view: "submit" };
    if (path === "/app/check-in/success" || path === "/app/attendance/success")
      return { view: "success" };
    if (path === "/app/check-out") return { view: "checkout" };
    if (path === "/app/check-out/success") return { view: "checkout-success" };
    if (path === "/app/check-out/automatic") return { view: "checkout-auto" };
    if (path === "/app/check-in/missed") return { view: "missed-checkin" };
    if (
      path.startsWith("/app/attendance/") &&
      path !== "/app/attendance/history"
    )
      return { view: "detail", id: path.split("/").pop() };
    if (path === "/app/attendance/history") return { view: "attendance" };
  } else {
    if (path === "/hr/attendance/today") return { view: "attendance-today" };
    if (path === "/hr/attendance/claims") return { view: "claim-review" };
    if (path === "/hr/employees/new") return { view: "employee-form" };
    if (/^\/hr\/employees\/[^/]+\/edit$/.test(path))
      return { view: "employee-form", id: path.split("/")[3] };
    if (path === "/hr/employees") return { view: "employees" };
    if (path.startsWith("/hr/attendance/"))
      return { view: "detail", id: path.split("/").pop() };
    if (path === "/hr/attendance") return { view: "attendance" };
  }
  return { view: "dashboard" };
}
async function allPages<T>(path: string, token: string): Promise<T[]> {
  const join = path.includes("?") ? "&" : "?";
  const first = await api<Page<T>>(`${path}${join}page=1&limit=100`, token);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, i) =>
      api<Page<T>>(`${path}${join}page=${i + 2}&limit=100`, token),
    ),
  );
  return [first, ...rest].flatMap((result) => result.data);
}

type EvidenceKind =
  | "CHECKIN_WORK_PROOF"
  | "CHECKIN_SELFIE"
  | "CHECKOUT_WORK_PROOF"
  | "CHECKOUT_SELFIE";
async function loadEvidenceImages(
  id: string,
  token: string,
): Promise<AttendanceEvidenceImages> {
  const kinds: EvidenceKind[] = [
    "CHECKIN_WORK_PROOF",
    "CHECKIN_SELFIE",
    "CHECKOUT_WORK_PROOF",
    "CHECKOUT_SELFIE",
  ];
  const entries = await Promise.all(
    kinds.map(async (kind) => {
      try {
        return [
          kind,
          await api<Blob>(`/attendances/${id}/evidence/${kind}`, token),
        ] as const;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404)
          return [kind, null] as const;
        throw error;
      }
    }),
  );
  const images: AttendanceEvidenceImages = {};
  for (const [kind, blob] of entries)
    if (blob) images[kind] = URL.createObjectURL(blob);
  return images;
}
function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [page, setPage] = useState(1);
  const [attendanceLimit, setAttendanceLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [department, setDepartment] = useState<DepartmentCode | "">("");
  const [employeeStatus, setEmployeeStatus] = useState<
    "" | "ACTIVE" | "INACTIVE" | "PENDING_ACTIVATION"
  >("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Page<Employee> | null>(null);
  const [attendances, setAttendances] = useState<Page<Attendance> | null>(null);
  const [todayAttendances, setTodayAttendances] = useState<Attendance[]>([]);
  const [todayStaff, setTodayStaff] = useState<Employee[]>([]);
  const [today, setToday] = useState<Attendance | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    submitted: number;
    pending: number;
    completed: number;
    running: number;
  } | null>(null);
  const [missingEmployees, setMissingEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [employeeActive, setEmployeeActive] = useState(true);
  const key = useRef(crypto.randomUUID());
  const [detail, setDetail] = useState<Attendance | null>(null);
  const [images, setImages] = useState<AttendanceEvidenceImages>({});
  const [employeeLoginActive, setEmployeeLoginActive] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [activation, setActivation] = useState<{
    token: string;
    expiresAt: string;
    email: string;
  } | null>(null);
  const generation = useRef(0);
  const navigate = useCallback(
    (next: View, role: User["role"], id?: string) => {
      window.history.pushState({}, "", pathFor(next, role, id));
      setView(next);
      setError("");
      setNotice("");
      if (
        next === "attendance" ||
        next === "attendance-today" ||
        next === "claim-review" ||
        next === "employees"
      ) {
        setPage(1);
        setSearch("");
        if (
          (next === "attendance" || next === "attendance-today") &&
          role === "HRD"
        )
          setDate((current) => current || jakartaDate());
      }
    },
    [],
  );
  const report = useCallback((e: unknown) => {
    setError(
      e instanceof Error ? e.message : "Terjadi kesalahan. Coba kembali.",
    );
    if (e instanceof ApiError && e.status === 401) {
      generation.current++;
      setUser(null);
      setToken("");
      setEmployees(null);
      setAttendances(null);
      setTodayStaff([]);
      setTodayAttendances([]);
      setToday(null);
      setDepartments([]);
      setImages({});
      setLoading(false);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  const reload = useCallback(async () => {
    if (!user) return;
    const current = ++generation.current;
    setLoading(true);
    try {
      if (view === "detail") {
        const id = window.location.pathname.split("/").pop();
        const record = await api<Attendance>(`/attendances/${id}`, token);
        const evidenceImages =
          record.source === "MISSED_CHECK_IN_CLAIM"
            ? {}
            : await loadEvidenceImages(record.id, token);
        if (current === generation.current) {
          setDetail(record);
          setImages(evidenceImages);
        } else
          Object.values(evidenceImages).forEach((url) =>
            URL.revokeObjectURL(url),
          );
      } else if (
        view === "employee-form" &&
        window.location.pathname.endsWith("/edit")
      ) {
        const id = window.location.pathname.split("/")[3];
        const employee = await api<Employee>(`/employees/${id}`, token);
        if (current === generation.current) {
          setEditing(id);
          setEditingEmployee(employee);
          setEmployeeActive(employee.active);
          setEmployeeLoginActive(employee.user.active);
          setForm({
            email: employee.user.email,
            fullName: employee.fullName,
            employeeNumber: employee.employeeNumber,
            position: employee.position,
            department: employee.department,
          });
        }
      } else if (view === "employees") {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(attendanceLimit),
        });
        if (search) q.set("search", search);
        if (department) q.set("department", department);
        if (employeeStatus) q.set("employeeStatus", employeeStatus);
        const result = await api<Page<Employee>>(`/employees?${q}`, token);
        if (current === generation.current) setEmployees(result);
      } else if (view === "attendance-today" && user.role === "HRD") {
        const todayDate = jakartaDate();
        const [staff, records] = await Promise.all([
          allPages<Employee>("/employees", token),
          allPages<Attendance>(`/attendances?date=${todayDate}`, token),
        ]);
        const activeStaff = staff.filter(
          (employee) => employee.active && employee.user.active,
        );
        const directCheckIns = records.filter(
          (record) => record.source !== "MISSED_CHECK_IN_CLAIM",
        );
        if (current === generation.current) {
          setTodayStaff(activeStaff);
          setTodayAttendances(directCheckIns);
        }
      } else if (view === "dashboard" || view === "attendance") {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(
            view === "attendance" && user.role === "HRD" ? attendanceLimit : 20,
          ),
        });
        if (search && view === "attendance") q.set("search", search);
        if (date && view === "attendance") q.set("date", date);
        if (department && view === "attendance")
          q.set("department", department);
        const result = await api<Page<Attendance>>(
          `/attendances${user.role === "EMPLOYEE" ? "/me" : ""}?${q}`,
          token,
        );
        if (current === generation.current) setAttendances(result);
        if (view === "attendance" && user.role === "HRD") {
          const [staff, records] = await Promise.all([
            allPages<Employee>("/employees", token),
            allPages<Attendance>(
              `/attendances?date=${date || jakartaDate()}`,
              token,
            ),
          ]);
          const submitted = new Set(records.map((record) => record.employeeId));
          if (current === generation.current)
            setMissingEmployees(
              staff.filter(
                (employee) => employee.active && !submitted.has(employee.id),
              ),
            );
        }
        if (view === "dashboard" && user.role === "HRD") {
          const [staff, records] = await Promise.all([
            allPages<Employee>("/employees", token),
            allPages<Attendance>(`/attendances?date=${jakartaDate()}`, token),
          ]);
          const active = staff.filter((employee) => employee.active);
          const submitted = new Set(records.map((record) => record.employeeId));
          if (current === generation.current) {
            setTodayAttendances(records);
            setStats({
              total: active.length,
              submitted: active.filter((employee) => submitted.has(employee.id))
                .length,
              pending: active.filter((employee) => !submitted.has(employee.id))
                .length,
              completed: records.filter((record) => !!record.checkOutAt).length,
              running: records.filter(
                (record) =>
                  !record.checkOutAt &&
                  record.source !== "MISSED_CHECK_IN_CLAIM",
              ).length,
            });
          }
        }
      }
      if (
        user.role === "EMPLOYEE" &&
        (view === "dashboard" ||
          view === "submit" ||
          view === "attendance" ||
          view === "success" ||
          view === "checkout" ||
          view === "checkout-success" ||
          view === "checkout-auto")
      ) {
        const result = await api<Attendance | null>(
          "/attendances/me/today",
          token,
        );
        if (current === generation.current) setToday(result);
        if (
          (view === "success" ||
            view === "checkout-success" ||
            view === "checkout-auto") &&
          result
        ) {
          const evidenceImages = await loadEvidenceImages(result.id, token);
          if (current === generation.current) setImages(evidenceImages);
          else
            Object.values(evidenceImages).forEach((url) =>
              URL.revokeObjectURL(url),
            );
        }
      }
    } catch (e) {
      if (current === generation.current) report(e);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [
    user,
    token,
    page,
    attendanceLimit,
    search,
    date,
    department,
    employeeStatus,
    view,
    report,
  ]);
  useEffect(() => {
    let active = true;
    const invalidate = () => {
      generation.current++;
    };
    queueMicrotask(() => {
      if (active) void reload();
    });
    return () => {
      active = false;
      invalidate();
    };
  }, [reload]);
  useEffect(() => {
    if (user?.role === "HRD")
      void api<Department[]>("/employees/departments", token)
        .then(setDepartments)
        .catch(report);
  }, [user, token, report]);
  useEffect(() => {
    if (!user) return;
    const pop = () => {
      const route = routeFor(window.location.pathname, user.role);
      setView(route.view);
      setError("");
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [user]);
  useEffect(
    () => () => {
      Object.values(images).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    },
    [images],
  );
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ accessToken: string; user: User }>(
        "/auth/login",
        "",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      setUser(result.user);
      setToken(result.accessToken);
      setPassword("");
      setNotice("");
      setPage(1);
      const route = routeFor(window.location.pathname, result.user.role);
      setView(route.view);
      if (route.view === "dashboard")
        window.history.replaceState({}, "", base(result.user.role));
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/auth/logout", token, { method: "POST" });
      generation.current++;
      setEmployees(null);
      setAttendances(null);
      setTodayStaff([]);
      setTodayAttendances([]);
      setDepartments([]);
      setLoading(false);
      setToken("");
      setUser(null);
      setSearch("");
      setDate("");
      setDepartment("");
      setEmployeeStatus("");
      setToday(null);
      setImages({});
      setNotice("");
      setError("");
      window.history.replaceState({}, "", "/");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<
        Employee & { activation?: { token: string; expiresAt: string } }
      >(`/employees${editing ? `/${editing}` : ""}`, token, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(
          ({ employeeNumber: _employeeNumber, ...employeeData } = form) =>
            employeeData,
        ),
      });
      const message = editing
        ? "Data karyawan diperbarui."
        : "Karyawan dan akun berhasil dibuat.";
      if (result.activation)
        setActivation({ ...result.activation, email: result.user.email });
      setForm(emptyForm);
      setEditing(null);
      navigate("employees", "HRD");
      setNotice(message);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function deactivate(reason: string) {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await api(`/employees/${editing}`, token, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
      setEmployeeActive(false);
      navigate("employees", "HRD");
      setNotice("Karyawan dinonaktifkan. Alasan tersimpan di audit.");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function reissue(employee: Employee) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ token: string; expiresAt: string }>(
        `/employees/${employee.id}/activation-link`,
        token,
        { method: "POST" },
      );
      setActivation({ ...result, email: employee.user.email });
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function submit(bundle: AttendanceCaptureBundle) {
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("workProof", bundle.workProof);
      data.append("selfie", bundle.selfie);
      data.append("workProofType", bundle.workProofType);
      const record = await api<Attendance>("/attendances", token, {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
        body: data,
      });
      setToday(record);
      setImages(await loadEvidenceImages(record.id, token));
      key.current = crypto.randomUUID();
      navigate("success", "EMPLOYEE");
    } catch (e) {
      if (e instanceof ApiError && e.status >= 500) {
        try {
          const existing = await api<Attendance | null>(
            "/attendances/me/today",
            token,
          );
          if (existing) {
            setToday(existing);
            setImages(await loadEvidenceImages(existing.id, token));
            key.current = crypto.randomUUID();
            navigate("success", "EMPLOYEE");
            return;
          }
        } catch {
          // Retain the capture and idempotency key for a safe retry.
        }
      }
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function checkOut(bundle: AttendanceCaptureBundle) {
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("workProof", bundle.workProof);
      data.append("selfie", bundle.selfie);
      data.append("workProofType", bundle.workProofType);
      const record = await api<Attendance>("/attendances/me/check-out", token, {
        method: "POST",
        headers: { "Idempotency-Key": key.current },
        body: data,
      });
      setToday(record);
      setImages(await loadEvidenceImages(record.id, token));
      key.current = crypto.randomUUID();
      navigate(
        record.checkOutType === "AUTO" ? "checkout-auto" : "checkout-success",
        "EMPLOYEE",
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function submitMissedCheckIn(values: {
    workDate: string;
    claimedCheckInTime: string;
    claimedCheckOutTime: string;
    reason: string;
    truthConfirmed: boolean;
  }) {
    setBusy(true);
    setError("");
    try {
      const claim = await api<{ id: string }>("/attendance-claims", token, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(values),
      });
      setNotice(
        `Klaim check-in dikirim untuk ditinjau. Referensi: ${claim.id}`,
      );
      navigate("attendance", "EMPLOYEE");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  function edit(employee: Employee) {
    setEditing(employee.id);
    setEditingEmployee(employee);
    setEmployeeActive(employee.active);
    setEmployeeLoginActive(employee.user.active);
    setForm({
      email: employee.user.email,
      fullName: employee.fullName,
      employeeNumber: employee.employeeNumber,
      position: employee.position,
      department: employee.department,
    });
    navigate("employee-form", "HRD", employee.id);
  }
  function openDetail(id: string) {
    setDetail(null);
    setImages({});
    navigate("detail", user!.role, id);
  }
  if (window.location.pathname.startsWith("/activate/"))
    return (
      <ActivateAccountPage
        token={window.location.pathname.split("/")[2]}
        onComplete={() => {
          window.history.replaceState({}, "", "/");
          setUser(null);
          setToken("");
          setNotice("Akun aktif. Silakan masuk dengan kata sandi baru Anda.");
        }}
      />
    );
  if (!user)
    return (
      <SignInPage
        email={email}
        password={password}
        busy={busy}
        error={error}
        notice={notice}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={login}
      />
    );
  const section =
    view === "attendance-today" || view === "claim-review"
      ? view
      : view === "employees" || view === "employee-form"
        ? "employees"
        : view === "dashboard" ||
            (user.role === "EMPLOYEE" &&
              (view === "submit" ||
                view === "success" ||
                view === "checkout" ||
                view === "checkout-success" ||
                view === "checkout-auto" ||
                view === "missed-checkin"))
          ? "dashboard"
          : view === "profile"
            ? "profile"
            : "attendance";
  const title =
    view === "employees"
      ? "Data Karyawan"
      : view === "attendance-today"
        ? "Check-in Hari Ini"
        : view === "claim-review"
          ? "Review Klaim Absensi"
          : view === "employee-form"
            ? editing
              ? "Ubah Karyawan"
              : "Tambah Karyawan"
            : view === "dashboard"
              ? user.role === "HRD"
                ? "Dashboard HRD"
                : "Dashboard"
              : view === "submit"
                ? "Check-in"
                : view === "checkout"
                  ? "Check-out"
                  : view === "missed-checkin"
                    ? "Klaim lupa check-in"
                    : view === "success"
                      ? "Check-in berhasil"
                      : view === "profile"
                        ? "Profil saya"
                        : view === "detail"
                          ? "Detail absensi"
                          : user.role === "HRD"
                            ? view === "attendance"
                              ? "Monitoring WFH"
                              : "Monitoring Absensi"
                            : "Riwayat absensi";
  return (
    <div className="workspace">
      <WorkspaceSidebar
        user={user}
        view={section}
        busy={busy}
        onViewChange={(next) => navigate(next, user.role)}
        onLogout={() => void logout()}
      />
      <main className="content">
        <div className="workspace-topbar">
          <div className="mobile-workspace-brand" aria-label="DexaWork">
            <span>Dexa</span>Work
          </div>
          <span className="workspace-crumb">
            Workspace / {user.role === "HRD" ? "People Operations" : "Karyawan"}
          </span>
          <div className="header-actions">
            <time className="header-date" dateTime={new Date().toISOString()}>
              {new Intl.DateTimeFormat("id-ID", {
                dateStyle: "medium",
                timeZone: "Asia/Jakarta",
              }).format(new Date())}
              <span>Asia/Jakarta · WIB</span>
            </time>
            <button
              className="account-chip"
              onClick={() => navigate("profile", user.role)}
              aria-label="Buka profil akun"
            >
              <span className="account-avatar">
                {(user.employee?.fullName ?? "HR")
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <span>
                <strong>{user.employee?.fullName ?? "Human Resources"}</strong>
                <small>{user.role === "HRD" ? "HRD" : "Karyawan"}</small>
              </span>
            </button>
          </div>
        </div>
        {!(user.role === "EMPLOYEE" && view === "submit") &&
          !(user.role === "HRD" && view === "employee-form") &&
          view !== "detail" && (
            <header className="page-heading">
              <div>
                {user.role === "EMPLOYEE" && view === "dashboard" ? (
                  <>
                    <h1>
                      Selamat datang, {user.employee?.fullName ?? "Karyawan"}
                    </h1>
                    <p className="muted">
                      Siap bekerja hari ini? Kirim absensi WFH Anda dengan foto
                      setup kerja dan lokasi.
                    </p>
                  </>
                ) : view === "success" ? (
                  <>
                    <p className="checkin-success-date">
                      {new Intl.DateTimeFormat("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(today?.submittedAt ?? Date.now()))}
                      {" · "}
                      {new Intl.DateTimeFormat("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(today?.submittedAt ?? Date.now()))}
                      {" WIB"}
                    </p>
                    <h1>Check-in berhasil</h1>
                    <p className="muted">
                      Catatan waktu WFH Anda tersimpan dengan jelas.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="eyebrow">
                      PHARMAWORK /{" "}
                      {user.role === "HRD"
                        ? "PEOPLE OPERATIONS"
                        : "MY WORKSPACE"}
                    </span>
                    <h1>{title}</h1>
                    <p className="muted">
                      {view === "dashboard" && user.role === "HRD"
                        ? `${new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date())} · Pembaruan ${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(new Date())} WIB`
                        : view === "employees"
                          ? "Kelola informasi dan akses karyawan."
                          : view === "employee-form"
                            ? "Lengkapi data karyawan dan informasi akunnya."
                            : view === "attendance-today"
                              ? "Lihat karyawan yang sudah dan belum check-in WFH hari ini."
                              : view === "claim-review"
                                ? "Tinjau klaim karyawan yang lupa check-in pada tanggal sebelumnya."
                                : view === "attendance" && user.role === "HRD"
                                  ? "Pantau seluruh sesi check-in dan check-out karyawan."
                                  : "Kehadiran WFH tercatat berdasarkan waktu server."}
                    </p>
                  </>
                )}
              </div>
              {view === "employees" && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="whitespace-nowrap"
                  onClick={() => {
                    setForm({
                      ...emptyForm,
                      department: departments[0]?.code ?? "",
                    });
                    setEditing(null);
                    setEditingEmployee(null);
                    setEmployeeActive(true);
                    setEmployeeLoginActive(false);
                    navigate("employee-form", "HRD");
                  }}
                >
                  + Tambah Karyawan
                </Button>
              )}
              {view === "dashboard" && user.role === "HRD" && (
                <button onClick={() => navigate("claim-review", "HRD")}>
                  Review Klaim
                </button>
              )}
            </header>
          )}
        {error && (
          <div role="alert" className="alert error">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="alert success">
            {notice}
          </div>
        )}
        {view === "dashboard" && (
          <DashboardOverview
            user={user}
            today={today}
            attendances={attendances}
            todayAttendances={todayAttendances}
            stats={stats}
            onDetail={openDetail}
            onMissedCheckIn={() => navigate("missed-checkin", "EMPLOYEE")}
            onNavigate={() =>
              navigate(
                user.role === "EMPLOYEE"
                  ? !today
                    ? "submit"
                    : today.checkOutType === "AUTO"
                      ? "checkout-auto"
                      : today.checkOutAt
                        ? "attendance"
                        : "checkout"
                  : "attendance-today",
                user.role,
              )
            }
            formatTime={time}
          />
        )}
        {user.role === "EMPLOYEE" && view === "submit" && (
          <TodayAttendanceCard
            today={today}
            busy={busy}
            loading={loading}
            keyRef={key}
            onSubmit={submit}
            onDashboard={() => navigate("dashboard", "EMPLOYEE")}
            formatTime={time}
          />
        )}
        {view === "success" && today && (
          <CheckInReceipt
            attendance={today}
            images={images}
            onDashboard={() => navigate("dashboard", "EMPLOYEE")}
            onHistory={() => navigate("attendance", "EMPLOYEE")}
          />
        )}
        {view === "checkout" && today && !today.checkOutAt && (
          <CheckoutConfirmation
            attendance={today}
            busy={busy}
            loading={loading}
            keyRef={key}
            onConfirm={checkOut}
            onCancel={() => navigate("dashboard", "EMPLOYEE")}
          />
        )}
        {(view === "checkout-success" || view === "checkout-auto") &&
          today?.checkOutAt && (
            <SessionCompletion
              attendance={today}
              automatic={
                view === "checkout-auto" || today.checkOutType === "AUTO"
              }
              images={images}
              onDashboard={() => navigate("dashboard", "EMPLOYEE")}
              onHistory={() => navigate("attendance", "EMPLOYEE")}
            />
          )}
        {view === "missed-checkin" && (
          <MissedCheckInForm
            busy={busy}
            onSubmit={submitMissedCheckIn}
            onCancel={() => navigate("dashboard", "EMPLOYEE")}
          />
        )}
        {view === "profile" && (
          <ProfilePage
            user={user}
            onLogout={() => void logout()}
            onBack={() => navigate("dashboard", user.role)}
          />
        )}
        {view === "employee-form" && (
          <EmployeeForm
            form={form}
            setForm={setForm}
            editing={editing}
            active={employeeActive}
            loginActive={employeeLoginActive}
            departments={departments}
            busy={busy}
            onSave={save}
            onDeactivate={deactivate}
            onReissueActivation={() => {
              if (editingEmployee) void reissue(editingEmployee);
            }}
            onCancel={() => navigate("employees", "HRD")}
          />
        )}
        {view === "detail" &&
          (detail ? (
            <AttendanceDetail
              attendance={detail}
              images={images}
              onBack={() => navigate("attendance", user.role)}
              formatTime={time}
            />
          ) : (
            <p className="muted">
              {loading
                ? "Memuat detail absensi..."
                : "Detail absensi belum tersedia."}
            </p>
          ))}
        {view === "attendance-today" && user.role === "HRD" && (
          <AttendanceTodaySection
            employees={todayStaff}
            attendances={todayAttendances}
            date={jakartaDate()}
            loading={loading}
            onViewAll={() => {
              setDate(jakartaDate());
              setDepartment("");
              navigate("attendance", "HRD");
            }}
          />
        )}
        {(view === "attendance" || view === "employees") && (
          <RecordsSection
            view={view}
            user={user}
            employees={employees}
            attendances={attendances}
            missingEmployees={missingEmployees}
            departments={departments}
            page={page}
            pageSize={attendanceLimit}
            onPageSizeChange={(value) => {
              setAttendanceLimit(value);
              setPage(1);
              requestAnimationFrame(() =>
                window.scrollTo({ top: 0, behavior: "smooth" }),
              );
            }}
            search={search}
            date={date}
            department={department}
            employeeStatus={employeeStatus}
            loading={loading}
            busy={busy}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onDateChange={(value) => {
              setDate(value);
              setPage(1);
            }}
            onDepartmentChange={(value) => {
              setDepartment(value);
              setPage(1);
            }}
            onEmployeeStatusChange={(value) => {
              setEmployeeStatus(value);
              setPage(1);
            }}
            onPageChange={(value) => {
              setPage(value);
              requestAnimationFrame(() =>
                window.scrollTo({ top: 0, behavior: "smooth" }),
              );
            }}
            onReload={reload}
            onEdit={edit}
            onEvidence={async (id) => openDetail(id)}
          />
        )}
        {view === "attendance" && user.role === "EMPLOYEE" && (
          <MissedCheckInClaimsPanel
            token={token}
            user={user}
            onChanged={reload}
          />
        )}
        {view === "claim-review" && user.role === "HRD" && (
          <MissedCheckInClaimsPanel
            token={token}
            user={user}
            onChanged={reload}
          />
        )}
        <p className="small muted footer-note">
          DexaWork / Bukti absensi langsung diakses pemilik dan HRD.
        </p>
      </main>
      <Modal
        open={!!activation}
        title="Tautan aktivasi akun"
        onClose={() => setActivation(null)}
      >
        <p>
          Bagikan tautan ini secara pribadi kepada {activation?.email}. Tautan
          berlaku sampai{" "}
          {activation?.expiresAt ? time(activation.expiresAt) : ""} WIB dan
          hanya dapat dipakai sekali.
        </p>
        <p
          className="mt-[1vw] break-all rounded-lg border border-dexa-border bg-dexa-bg p-[1vw]"
          data-testid="activation-link"
        >
          {activation
            ? `${window.location.origin}/activate/${activation.token}`
            : ""}
        </p>
        <button
          className="primary mt-[1vw]"
          onClick={() => {
            if (activation)
              void navigator.clipboard.writeText(
                `${window.location.origin}/activate/${activation.token}`,
              );
          }}
        >
          Salin tautan
        </button>
      </Modal>
    </div>
  );
}
export default App;
