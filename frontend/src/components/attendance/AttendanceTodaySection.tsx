import { useMemo, useState } from "react";
import type { Attendance, Employee } from "../../lib/api";
import { departmentLabel } from "../../lib/departments";
import { DataTable } from "../ui/DataTable";

interface CheckInRow {
  id: string;
  employee: Employee;
  attendance: Attendance | null;
}

export function AttendanceTodaySection({
  employees,
  attendances,
  date,
  loading,
  onViewAll,
}: {
  employees: Employee[];
  attendances: Attendance[];
  date: string;
  loading: boolean;
  onViewAll: () => void;
}) {
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const directCheckIns = new Map(
      attendances
        .filter((attendance) => attendance.source !== "MISSED_CHECK_IN_CLAIM")
        .map((attendance) => [attendance.employeeId, attendance]),
    );
    return employees.map((employee) => ({
      id: employee.id,
      employee,
      attendance: directCheckIns.get(employee.id) ?? null,
    }));
  }, [employees, attendances]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const checkedIn = rows.filter((row) => row.attendance).length;
  const firstItem = rows.length ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, rows.length);
  const clock = (value?: string) =>
    value
      ? new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone: "Asia/Jakarta",
        }).format(new Date(value)) + " WIB"
      : "—";

  return (
    <section className="mt-[2vw] grid w-full gap-[1.2vw] rounded-xl border border-dexa-border bg-white p-[1.5vw] max-sm:p-[4vw]">
      <div className="flex flex-wrap items-end justify-between gap-[1vw]">
        <div>
          <h2 className="text-[clamp(1.2rem,1.5vw,1.5rem)] font-semibold text-slate-900">
            Status Absensi karyawan
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {date} · {checkedIn} dari {rows.length} karyawan sudah check-in hari
            ini.
          </p>
        </div>
        <button type="button" onClick={onViewAll}>
          Lihat data lengkap
        </button>
      </div>

      <DataTable<CheckInRow>
        caption="Status Absensi WFH karyawan hari ini"
        loading={loading}
        rows={visibleRows}
        emptyTitle="Belum ada karyawan aktif yang dapat ditampilkan."
        columns={[
          {
            key: "employee",
            header: "Karyawan",
            cell: (row) => (
              <div className="grid gap-0.5">
                <strong>{row.employee.fullName}</strong>
                <span className="cell-secondary">
                  {row.employee.user.email}
                </span>
              </div>
            ),
          },
          {
            key: "employee-number",
            header: "ID Karyawan",
            cell: (row) => row.employee.employeeNumber,
          },
          {
            key: "department",
            header: "Departemen",
            cell: (row) => departmentLabel(row.employee.department),
          },
          {
            key: "check-in-status",
            header: "Status Absensi",
            cell: (row) =>
              row.attendance ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                  Sudah check-in
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                  Belum check-in
                </span>
              ),
          },
          {
            key: "check-in-time",
            header: "Waktu check-in",
            cell: (row) => clock(row.attendance?.submittedAt),
          },
        ]}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          Menampilkan {firstItem}–{lastItem} dari {rows.length} karyawan · 5 per
          halaman
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Sebelumnya
          </button>
          <span className="self-center" aria-live="polite">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Berikutnya
          </button>
        </div>
      </footer>
    </section>
  );
}
