import type { Attendance, Page, User } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { LocationDetails } from '../attendance/LocationDetails'
interface DashboardOverviewProps {
  user: User;
  today: Attendance | null;
  attendances: Page<Attendance> | null;
  stats: { total: number; submitted: number; pending: number } | null;
  previewUrls: Record<string, string>;
  onDetail: (id: string) => void;
  onNavigate: () => void;
  formatTime: (value: string) => string;
}
export function DashboardOverview({
  user,
  today,
  attendances,
  stats,
  previewUrls,
  onDetail,
  onNavigate,
  formatTime,
}: DashboardOverviewProps) {
  const latest = attendances?.data[0];
  return (
    <section className="mx-auto mb-[2vw] max-w-[52.8vw] max-lg:max-w-full">
      <p className="text-[clamp(0.8rem,0.95vw,1rem)] text-dexa-muted">
        {latest?.workDate ?? "Asia/Jakarta / WIB"}
      </p>
      <h2 className="mt-[1vw] text-[clamp(1.7rem,2.5vw,2.8rem)]">
        {user.role === "HRD"
          ? "Ringkasan kehadiran"
          : `Selamat datang, ${user.employee?.fullName ?? "Karyawan"}`}
      </h2>
      <p className="mb-[2vw] text-dexa-muted">
        {user.role === "HRD"
          ? "Pantau absensi WFH melalui catatan yang dikirim karyawan."
          : "Mulai hari dengan satu langkah sederhana."}
      </p>
      {user.role === "HRD" && (
        <div
          className="mb-[1.5vw] grid grid-cols-3 gap-[1vw] max-sm:grid-cols-1"
          aria-label="Ringkasan absensi hari ini"
        >
          {(
            [
              ["Total karyawan", stats?.total],
              ["Sudah absen hari ini", stats?.submitted],
              ["Belum tercatat (jadwal belum diverifikasi)", stats?.pending],
            ] as const
          ).map(([label, value]) => (
            <div className="card" key={label}>
              <p className="muted">{label}</p>
              <strong className="text-[clamp(1.5rem,2.4vw,2.5rem)]">
                {value ?? "—"}
              </strong>
            </div>
          ))}
        </div>
      )}
      <div className="card border-t-[0.28vw] border-t-dexa-red">
        <h3 className="text-[clamp(1.2rem,1.6vw,1.6rem)] font-semibold">
          {user.role === "HRD" ? "Absensi terkirim" : "Absensi hari ini"}
        </h3>
        <div className="mt-[1vw]">
          <StatusBadge
            active={user.role === "HRD" ? !!attendances?.meta.total : !!today}
            activeLabel={
              user.role === "HRD"
                ? `${attendances?.meta.total ?? 0} catatan`
                : "Sudah terkirim"
            }
            inactiveLabel={
              user.role === "HRD"
                ? "Belum ada catatan"
                : "Belum mengirim absensi"
            }
          />
        </div>
        <p className="mt-[1.5vw] text-dexa-muted">
          {user.role === "HRD"
            ? "Buka monitoring untuk melihat waktu dan bukti foto."
            : "Unggah foto bukti kerja WFH Anda. Waktu akan dicatat otomatis saat dikirim."}
        </p>
        <button className="primary mt-[1.5vw]" onClick={onNavigate}>
          {user.role === "HRD"
            ? "Lihat monitoring"
            : today
              ? "Lihat riwayat"
              : "Kirim absensi"}
        </button>
      </div>
      {latest && (
        <div className="card">
          <h3 className="font-semibold">Absensi terakhir</h3>
          <p className="text-dexa-muted">
            {latest.employeeName} / {formatTime(latest.submittedAt)} WIB
          </p>
          {latest.source === 'CORRECTION' && <p>Tercatat melalui koreksi</p>}
        </div>
      )}
      {user.role === 'HRD' && !!attendances?.data.length && <section aria-label="Absensi terbaru">
        <h3 className="mb-[1vw] font-semibold">Foto dan lokasi absensi terbaru</h3>
        <div className="grid grid-cols-3 gap-[1vw] max-md:grid-cols-1">
          {attendances.data.slice(0, 3).map(record => <article key={record.id} className="card grid gap-[0.8vw]">
            {record.source === 'CORRECTION' ? <p className="muted">Tercatat melalui koreksi; bukti pendukung ada pada permintaan koreksi.</p> : previewUrls[record.id] ? <img src={previewUrls[record.id]} alt={`Foto setup kerja ${record.employeeName}`} className="h-[12vw] w-full rounded-lg object-contain max-md:h-[40vw]" /> : <p className="muted">Memuat foto...</p>}
            <strong>{record.employeeName}</strong>
            <p className="small muted">{formatTime(record.submittedAt)} WIB</p>
            <LocationDetails attendance={record} />
            {record.wfhReason && <p className="small muted">Alasan: {record.wfhReason}</p>}
            <button onClick={() => onDetail(record.id)}>Lihat detail</button>
          </article>)}
        </div>
      </section>}
      <div className="card border-l-[0.28vw] border-l-dexa-red">
        <strong>Bukti kerja, bukan ruang pribadi.</strong>
        <p className="text-dexa-muted">
          Hindari dokumen rahasia atau orang lain dalam foto. Bukti hanya dapat
          dilihat pemilik dan HRD.
        </p>
      </div>
    </section>
  );
}
