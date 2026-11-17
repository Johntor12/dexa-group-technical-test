import type { Attendance, Page, User } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
interface DashboardOverviewProps {
  user: User; today: Attendance | null; attendances: Page<Attendance> | null;
  todayAttendances?: Attendance[];
  stats: { total: number; submitted: number; pending: number; completed?: number; running?: number } | null;
  onDetail: (id: string) => void;
  onNavigate: () => void; onMissedCheckIn?: () => void; formatTime: (value: string) => string;
}
const clock = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' }).format(new Date(value)) : '—';
const duration = (row: Attendance) => { if (row.source === 'MISSED_CHECK_IN_CLAIM') return 'Klaim check-in disetujui'; const end = row.checkOutAt ? new Date(row.checkOutAt).getTime() : Date.now(); const mins = Math.max(0, Math.floor((end - new Date(row.submittedAt).getTime()) / 60000)); return row.checkOutAt ? Math.floor(mins / 60) + 'j ' + String(mins % 60).padStart(2, '0') + 'm' : 'Berjalan'; };
export function DashboardOverview({ user, today, attendances, todayAttendances = [], stats, onDetail, onNavigate, onMissedCheckIn, formatTime }: DashboardOverviewProps) {
  if (user.role === 'HRD') {
    const sessions = todayAttendances.filter(row => row.source !== 'MISSED_CHECK_IN_CLAIM').slice(0, 3);
    return <section className="hr-dashboard-content">
      <div className="hr-summary-grid" aria-label="Ringkasan karyawan dan sesi WFH">
        <article className="hr-summary-card"><span>Total Karyawan</span><div><strong>{stats?.total ?? '—'}</strong><small>Aktif</small></div></article>
        <article className="hr-summary-card"><span>Sudah Check-in</span><div><strong>{stats?.submitted ?? '—'}</strong><small>{stats?.completed ?? 0} selesai · {stats?.running ?? 0} berjalan</small></div></article>
        <article className="hr-summary-card"><span>Belum Check-in</span><div><strong>{stats?.pending ?? '—'}</strong><small>Belum memulai sesi</small></div></article>
      </div>
      <section className="hr-session-section">
        <div className="hr-section-heading"><h2>Sesi WFH terbaru</h2><button className="hr-text-action" onClick={onNavigate}>Lihat Monitoring →</button></div>
        <div className="hr-session-table-wrap"><table className="hr-session-table"><thead><tr><th>Karyawan</th><th>Check-in</th><th>Check-out</th><th>Durasi</th><th>Sumber / Status</th><th>Detail</th></tr></thead><tbody>
          {sessions.map(row => <tr key={row.id}><td data-label="Karyawan"><strong>{row.employeeName}</strong><small>{row.employeeNumber} · {row.department}</small></td><td data-label="Check-in">{clock(row.submittedAt)}</td><td data-label="Check-out">{clock(row.checkOutAt)}</td><td data-label="Durasi">{duration(row)}</td><td data-label="Sumber / Status">{row.checkOutType === 'AUTO' ? <span className="checkout-auto-label">Otomatis</span> : row.checkOutAt ? 'Manual' : 'Sesi aktif'}</td><td data-label="Detail"><button className="hr-text-action" onClick={() => onDetail(row.id)}>Lihat Detail</button></td></tr>)}
          {!sessions.length && <tr><td colSpan={6} className="hr-empty-row">Belum ada check-in hari ini.</td></tr>}
        </tbody></table><footer className="hr-table-footer">WIB · Menampilkan {sessions.length} dari {stats?.total ?? 0} karyawan</footer></div>
      </section>
      <div className="hr-privacy-note"><strong>Privasi karyawan tetap terjaga</strong><span>Foto area kerja dan selfie hanya menjadi bukti visual untuk ditinjau pada monitoring kehadiran.</span></div>
    </section>;
  }
  const latest = attendances?.data[0];
  return <section className="employee-dashboard-content mx-auto mb-[2vw] max-w-[72vw] max-lg:max-w-full">
    <div className="employee-dashboard-today-card card border-t-[0.28vw] border-t-dexa-red">
      <h2>Kehadiran hari ini</h2>
      <div className="employee-dashboard-status"><StatusBadge active={!!today} activeLabel={today?.checkOutAt ? 'WFH selesai' : 'Sedang bekerja'} inactiveLabel="Belum check-in" /></div>
      <p className="employee-dashboard-status-copy text-dexa-muted">{today?.checkOutAt ? 'Sesi WFH hari ini sudah selesai.' : today ? 'Sesi WFH sedang berjalan. Check-out saat aktivitas selesai.' : 'Mulai sesi WFH dengan mengambil foto area kerja dan selfie secara langsung.'}</p>
      <div className="employee-dashboard-actions">
        <button className="employee-dashboard-primary-action primary" onClick={onNavigate}>{today ? today.checkOutAt ? 'Lihat riwayat' : 'Check-out' : 'Check-in'}</button>
        {!today && onMissedCheckIn && <button className="employee-dashboard-claim-action" onClick={onMissedCheckIn}>Lupa check-in?</button>}
      </div>
    </div>
    {latest && <div className="employee-dashboard-latest-card card"><h3>Kehadiran terakhir</h3><p>{latest.employeeName} / {formatTime(latest.submittedAt)} WIB</p>{latest.source === 'MISSED_CHECK_IN_CLAIM' && <p>Tercatat melalui klaim check-in</p>}</div>}
    <div className="employee-dashboard-privacy-card card border-l-[0.28vw] border-l-dexa-red"><strong>Bukti kerja, bukan ruang pribadi.</strong><p>Hindari dokumen rahasia atau orang lain dalam foto. Bukti hanya dapat dilihat pemilik dan HRD.</p></div>
  </section>;
}
