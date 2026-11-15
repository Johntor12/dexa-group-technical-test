import type { Attendance } from "../../lib/api";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { LocationDetails } from './LocationDetails'
import { departmentLabel } from '../../lib/departments'

export function AttendanceDetail({
  attendance,
  image,
  onBack,
  formatTime,
}: {
  attendance: Attendance;
  image: string;
  onBack: () => void;
  formatTime: (value: string) => string;
}) {
  return (
    <section className="card mx-auto grid max-w-[52.8vw] gap-[1.5vw] max-lg:max-w-full">
      <Button className="justify-self-start" onClick={onBack}>
        ← Kembali
      </Button>
      <h2>Detail Absensi</h2>
      {attendance.source === 'CORRECTION' && <p role="status" className="rounded-lg border border-dexa-border p-[1vw]">Tercatat melalui koreksi. Waktu tercatat adalah waktu persetujuan aktual, bukan waktu absen pada tanggal kerja. Referensi: {attendance.correctionRequestId}</p>}
      <div>
        <strong>{attendance.employeeName}</strong>
        <p className="muted">
          {attendance.employeeNumber} · {departmentLabel(attendance.department)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-[1vw] max-sm:grid-cols-1">
        <div>
          <dt className="muted">Tanggal kerja</dt>
          <dd>{attendance.workDate}</dd>
        </div>
        <div>
          <dt className="muted">Waktu tercatat</dt>
          <dd>{formatTime(attendance.submittedAt)} WIB</dd>
        </div>
      </dl>
      <LocationDetails attendance={attendance} />
      {attendance.wfhReason && <div><strong>Alasan WFH</strong><p className="muted whitespace-pre-wrap">{attendance.wfhReason}</p></div>}
      {attendance.source === 'CORRECTION' ? <p className="muted">Bukti pendukung retroaktif tersedia pada permintaan koreksi terkait.</p> : image ? (
        <img
          src={image}
          alt={`Bukti absensi ${attendance.employeeName}`}
          className="max-h-[30vw] w-full rounded-lg object-contain max-md:max-h-[70vw]"
        />
      ) : (
        <EmptyState
          title="Foto belum tersedia"
          description="Coba lagi dari daftar absensi."
        />
      )}
      <p className="muted">
        {attendance.source === 'CORRECTION'
          ? 'Catatan ini hanya dapat dilihat. Bukti pendukung koreksi hanya tersedia bagi pemilik dan reviewer yang berwenang.'
          : 'Data absensi hanya dapat dilihat. Bukti hanya tersedia bagi pemilik dan HRD.'}
      </p>
    </section>
  );
}
