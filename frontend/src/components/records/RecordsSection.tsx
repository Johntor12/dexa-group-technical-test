import { DataTable } from '../ui/DataTable'
import { Button } from '../ui/Button'
import type {
  User,
  Employee,
  Attendance,
  Page,
  Department,
  DepartmentCode,
} from "../../lib/api";
import { departmentLabel } from '../../lib/departments'

interface RecordsSectionProps {
  view: "dashboard" | "attendance" | "employees";
  user: User;
  employees: Page<Employee> | null;
  attendances: Page<Attendance> | null;
  missingEmployees: Employee[];
  departments: Department[];
  page: number;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  search: string;
  date: string;
  department: DepartmentCode | '';
  employeeStatus: '' | 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION';
  loading: boolean;
  busy: boolean;
  onSearchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDepartmentChange: (value: DepartmentCode | '') => void;
  onEmployeeStatusChange: (value: '' | 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION') => void;
  onPageChange: (value: number) => void;
  onReload: () => Promise<void>;
  onEdit: (employee: Employee) => void;
  onEvidence: (id: string) => Promise<void>;
}
export function RecordsSection({
  view,
  user,
  employees,
  attendances,
  missingEmployees,
  departments,
  page,
  pageSize,
  onPageSizeChange,
  search,
  date,
  department,
  employeeStatus,
  loading,
  busy,
  onSearchChange,
  onDateChange,
  onDepartmentChange,
  onEmployeeStatusChange,
  onPageChange,
  onReload,
  onEdit,
  onEvidence,
}: RecordsSectionProps) {
  const clock = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : '—';
  const duration = (row: Attendance) => {
    if (row.source === 'MISSED_CHECK_IN_CLAIM') return 'Klaim check-in disetujui';
    const elapsed = Math.max(0, (row.checkOutAt ? new Date(row.checkOutAt).getTime() : Date.now()) - new Date(row.submittedAt).getTime());
    const hours = Math.floor(elapsed / 3600000); const minutes = Math.floor(elapsed % 3600000 / 60000);
    return row.checkOutAt ? `${hours}j ${String(minutes).padStart(2, '0')}m` : 'Berjalan';
  };
  const meta = view === "employees" ? employees?.meta : attendances?.meta;
  return (
    <section className="records">
      <div className="section-title">
        <h2 className="sr-only">
          {view === "employees" ? "Daftar karyawan" : user.role === 'HRD' ? "Sesi Check-in / Check-out" : "Riwayat kehadiran"}
        </h2>
        <button onClick={() => void onReload()} disabled={loading || busy}>
          Muat ulang
        </button>
      </div>
      {view === 'attendance' && user.role === 'HRD' && <p className="hr-readonly-banner">Catatan aktual hanya dapat dilihat. Klaim ditinjau pada pengajuan terpisah.</p>}
      {view === 'attendance' && user.role === 'HRD' && <p className="small muted attendance-sort-note">Diurutkan berdasarkan waktu absensi terbaru.</p>}
      <div className="filters">
        <label>
          Cari
          <input
            placeholder={view === 'employees' ? 'Cari nama atau ID karyawan' : 'Cari nama atau ID karyawan'}
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
        {view === 'employees' && <label>Status<select aria-label="Filter status karyawan" value={employeeStatus} onChange={e => onEmployeeStatusChange(e.target.value as typeof employeeStatus)}><option value="">Semua status</option><option value="ACTIVE">Aktif</option><option value="PENDING_ACTIVATION">Menunggu aktivasi</option><option value="INACTIVE">Nonaktif</option></select></label>}
      </div>
      <div aria-live="polite">
        {loading && <p className="muted">Memuat data...</p>}
      </div>
      {view === 'employees' ? <DataTable<Employee> caption="Daftar karyawan" loading={loading} rows={employees?.data ?? []} emptyTitle="Belum ada karyawan sesuai filter." columns={[
       { key: 'employee', header: 'Karyawan', cell: e => <div className="employee-cell"><span className="employee-avatar" aria-hidden="true">{e.fullName.split(' ').map(part => part[0]).slice(0,2).join('').toUpperCase()}</span><span><strong>{e.fullName}</strong><span className="cell-secondary">{e.employeeNumber}</span></span></div> },
       { key: 'email', header: 'Email', cell: e => e.user.email },
       { key: 'department', header: 'Departemen', cell: e => departmentLabel(e.department) },
       { key: 'status', header: 'Status', cell: e => e.active && !e.user.active ? <span className="employee-status pending">Menunggu aktivasi</span> : <span className={`employee-status ${e.active ? 'active' : 'inactive'}`}><span aria-hidden="true">{e.active ? '✓' : '×'}</span>{e.active ? 'Aktif' : 'Nonaktif'}</span> },
       { key: 'actions', header: 'Aksi', cell: e => <div className="row-actions employee-actions"><button className="edit-action" disabled={busy} onClick={() => onEdit(e)}>Edit</button></div> }
      ]} /> : <DataTable<Attendance> caption="Riwayat kehadiran" loading={loading} rows={attendances?.data ?? []} emptyTitle="Belum ada absensi sesuai filter." columns={[
       { key: 'employee', header: 'Karyawan', cell: a => <><strong>{a.employeeName}</strong><span className="cell-secondary">{a.employeeNumber}</span></> },
       { key: 'department', header: 'Departemen', cell: a => departmentLabel(a.department) },
       { key: 'checkin', header: 'Check-in', cell: a => a.source === 'MISSED_CHECK_IN_CLAIM' ? '—' : clock(a.submittedAt) },
       { key: 'checkout', header: 'Check-out', cell: a => clock(a.checkOutAt) },
       { key: 'duration', header: 'Durasi', cell: a => duration(a) },
       { key: 'source', header: 'Sumber / Status', cell: a => a.source === 'MISSED_CHECK_IN_CLAIM' ? <span className="status">Klaim check-in disetujui</span> : a.checkOutType === 'AUTO' ? <span className="checkout-auto-label">Otomatis</span> : a.checkOutAt ? 'Manual' : 'Sesi aktif' },
       { key: 'evidence', header: 'Detail', cell: a => <button className="detail-action" disabled={busy} onClick={() => void onEvidence(a.id)}>Lihat Detail</button> }
      ]} />}
      {user.role === 'HRD' && view === 'attendance' && <div className="mt-[2vw]"><h3 className="mb-[1vw] font-semibold">Belum tercatat pada {date || 'hari ini'} (jadwal belum diverifikasi)</h3><DataTable<Employee> caption="Karyawan tanpa catatan absensi" loading={loading} rows={missingEmployees.filter(employee => (!department || employee.department === department) && (!search || `${employee.fullName} ${employee.employeeNumber}`.toLowerCase().includes(search.toLowerCase())))} emptyTitle="Tidak ada karyawan tanpa catatan sesuai filter." columns={[{key:'employee',header:'Karyawan',cell:e => <><strong>{e.fullName}</strong><span className="cell-secondary">{e.employeeNumber}</span></>},{key:'department',header:'Departemen',cell:e => departmentLabel(e.department)},{key:'status',header:'Status',cell:() => <span>Perlu verifikasi jadwal</span> }]} /></div>}
      <footer className="pagination">
        <div className="pagination-summary"><span>{meta?.total ?? 0} data · Halaman {page} dari {Math.max(1, meta?.totalPages ?? 1)}</span>{(view === 'attendance' || view === 'employees') && user.role === 'HRD' && <label className="page-size-select">Tampilkan<select aria-label="Jumlah data per halaman" value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}><option value={10}>10 data</option><option value={25}>25 data</option></select></label>}</div>
        <div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={page >= (meta?.totalPages ?? 1) || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </footer>
    </section>
  );
}
