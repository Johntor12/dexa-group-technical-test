import { DataTable } from '../ui/DataTable'
import type {
  User,
  Employee,
  Attendance,
  Page,
  Department,
  DepartmentCode,
} from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { departmentLabel } from '../../lib/departments'

interface RecordsSectionProps {
  view: "dashboard" | "attendance" | "employees";
  user: User;
  employees: Page<Employee> | null;
  attendances: Page<Attendance> | null;
  missingEmployees: Employee[];
  departments: Department[];
  page: number;
  search: string;
  date: string;
  department: DepartmentCode | '';
  loading: boolean;
  busy: boolean;
  onSearchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDepartmentChange: (value: DepartmentCode | '') => void;
  onPageChange: (value: number) => void;
  onReload: () => Promise<void>;
  onEdit: (employee: Employee) => void;
  onReissue: (employee: Employee) => Promise<void>;
  onDeactivate: (employee: Employee) => Promise<void>;
  onEvidence: (id: string) => Promise<void>;
  formatTime: (value: string) => string;
}
export function RecordsSection({
  view,
  user,
  employees,
  attendances,
  missingEmployees,
  departments,
  page,
  search,
  date,
  department,
  loading,
  busy,
  onSearchChange,
  onDateChange,
  onDepartmentChange,
  onPageChange,
  onReload,
  onEdit,
  onReissue,
  onDeactivate,
  onEvidence,
  formatTime,
}: RecordsSectionProps) {
  const meta = view === "employees" ? employees?.meta : attendances?.meta;
  return (
    <section className="card records">
      <div className="section-title">
        <h2>
          {view === "employees" ? "Daftar karyawan" : "Riwayat kehadiran"}
        </h2>
        <button onClick={() => void onReload()} disabled={loading || busy}>
          Muat ulang
        </button>
      </div>
      <div className="filters">
        <label>
          Cari
          <input
            placeholder="Nama atau nomor karyawan"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
            }}
          />
        </label>
        {view === "attendance" && (
          <label>
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(e) => {
                onDateChange(e.target.value);
              }}
            />
          </label>
        )}
        {user.role === "HRD" && (
          <label>
            Departemen
            <select
              value={department}
              onChange={(e) => {
                onDepartmentChange(e.target.value as DepartmentCode | '');
              }}
            >
              <option value="">Semua departemen</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div aria-live="polite">
        {loading && <p className="muted">Memuat data...</p>}
      </div>
      {view === 'employees' ? <DataTable<Employee> caption="Daftar karyawan" loading={loading} rows={employees?.data ?? []} emptyTitle="Belum ada karyawan sesuai filter." columns={[
       { key: 'employee', header: 'Karyawan', cell: e => <><strong>{e.fullName}</strong><span className="cell-secondary">{e.employeeNumber} / {e.user.email}</span></> },
       { key: 'department', header: 'Departemen', cell: e => departmentLabel(e.department) },
       { key: 'position', header: 'Jabatan', cell: e => e.position },
       { key: 'status', header: 'Status', cell: e => e.active && !e.user.active ? <span className="status">Menunggu aktivasi</span> : <StatusBadge active={e.active} activeLabel="Aktif" inactiveLabel="Nonaktif" /> },
       { key: 'actions', header: 'Aksi', cell: e => <div className="row-actions"><button disabled={busy} onClick={() => onEdit(e)}>Ubah</button>{e.active && !e.user.active && <button disabled={busy} onClick={() => void onReissue(e)}>Tautan baru</button>}<button disabled={busy || !e.active} onClick={() => void onDeactivate(e)}>Nonaktifkan</button></div> }
      ]} /> : <DataTable<Attendance> caption="Riwayat kehadiran" loading={loading} rows={attendances?.data ?? []} emptyTitle="Belum ada absensi sesuai filter." columns={[
       { key: 'employee', header: 'Karyawan', cell: a => <><strong>{a.employeeName}</strong><span className="cell-secondary">{a.employeeNumber}</span></> },
       { key: 'department', header: 'Departemen', cell: a => departmentLabel(a.department) },
       { key: 'time', header: 'Waktu absensi (WIB)', cell: a => formatTime(a.submittedAt) },
       { key: 'date', header: 'Tanggal kerja', cell: a => a.workDate },
       { key: 'status', header: 'Status', cell: a => <span>{a.source === 'CORRECTION' ? '✓ Tercatat melalui koreksi' : '✓ Sudah absen'}</span> },
       { key: 'evidence', header: 'Bukti', cell: a => <button disabled={busy} onClick={() => void onEvidence(a.id)}>Lihat detail</button> }
      ]} />}
      {user.role === 'HRD' && view === 'attendance' && <div className="mt-[2vw]"><h3 className="mb-[1vw] font-semibold">Belum tercatat pada {date || 'hari ini'} (jadwal belum diverifikasi)</h3><DataTable<Employee> caption="Karyawan tanpa catatan absensi" loading={loading} rows={missingEmployees.filter(employee => (!department || employee.department === department) && (!search || `${employee.fullName} ${employee.employeeNumber}`.toLowerCase().includes(search.toLowerCase())))} emptyTitle="Tidak ada karyawan tanpa catatan sesuai filter." columns={[{key:'employee',header:'Karyawan',cell:e => <><strong>{e.fullName}</strong><span className="cell-secondary">{e.employeeNumber}</span></>},{key:'department',header:'Departemen',cell:e => departmentLabel(e.department)},{key:'status',header:'Status',cell:() => <span>Perlu verifikasi jadwal</span> }]} /></div>}
      <footer className="pagination">
        <span>
          {meta?.total ?? 0} data / Halaman {page} dari{" "}
          {Math.max(1, meta?.totalPages ?? 1)}
        </span>
        <div>
          <button
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Sebelumnya
          </button>
          <button
            disabled={page >= (meta?.totalPages ?? 1) || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Berikutnya
          </button>
        </div>
      </footer>
    </section>
  );
}
