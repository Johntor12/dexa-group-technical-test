import type { Attendance } from "../../lib/api";
import type { AttendanceEvidenceImages } from "./SessionFlow";
import { EmptyState } from "../ui/EmptyState";
import { departmentLabel } from "../../lib/departments";

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    : "—";
const clock = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

export function AttendanceDetail({
  attendance,
  images,
  onBack,
  formatTime,
}: {
  attendance: Attendance;
  images: AttendanceEvidenceImages;
  onBack: () => void;
  formatTime: (value: string) => string;
}) {
  const missedCheckInClaim = attendance.source === "MISSED_CHECK_IN_CLAIM";
  const checkoutLabel = attendance.checkOutAt
    ? clock(attendance.checkOutAt) + " WIB"
    : attendance.checkOutDueAt
      ? "Belum · estimasi " + formatTime(attendance.checkOutDueAt) + " WIB"
      : "Belum tercatat";
  const totalMinutes = Math.max(
    0,
    Math.floor(
      ((attendance.checkOutAt
        ? new Date(attendance.checkOutAt).getTime()
        : Date.now()) -
        new Date(attendance.submittedAt).getTime()) /
        60000,
    ),
  );
  const labels: [keyof AttendanceEvidenceImages, string, string][] = [
    [
      "CHECKIN_WORK_PROOF",
      "Bukti area kerja saat check-in",
      "Waktu check-in server: " + dateTime(attendance.submittedAt),
    ],
    [
      "CHECKIN_SELFIE",
      "Selfie saat check-in",
      "Waktu check-in server: " + dateTime(attendance.submittedAt),
    ],
    [
      "CHECKOUT_WORK_PROOF",
      "Bukti area kerja saat check-out",
      "Waktu check-out server: " + dateTime(attendance.checkOutAt),
    ],
    [
      "CHECKOUT_SELFIE",
      "Selfie saat check-out",
      "Waktu check-out server: " + dateTime(attendance.checkOutAt),
    ],
  ];
  return (
    <section className="attendance-detail-page">
      <button
        type="button"
        className="back-link attendance-detail-back"
        onClick={onBack}
      >
        ← Kembali ke monitoring
      </button>
      <div className="attendance-detail-heading">
        <h1>Detail sesi WFH</h1>
        <p>
          {attendance.employeeName} · {attendance.employeeNumber} ·{" "}
          {departmentLabel(attendance.department)} · {attendance.workDate}
        </p>
      </div>
      {missedCheckInClaim && (
        <div role="status" className="missed-claim-notice">
          Check-in ini tercatat setelah klaim lupa check-in disetujui reviewer.
          Waktu pengajuan dan persetujuan tercatat oleh server.
        </div>
      )}
      <div className="attendance-detail-metrics">
        <article>
          <span>Check-in resmi</span>
          <strong>{clock(attendance.submittedAt)} WIB</strong>
          <small>Waktu dicatat oleh server</small>
        </article>
        <article>
          <span>
            {attendance.checkOutType === "AUTO"
              ? "Check-out otomatis"
              : attendance.checkOutAt
                ? "Check-out manual"
                : "Check-out"}
          </span>
          <strong className="metric-checkout">{checkoutLabel}</strong>
          <small>
            {attendance.checkOutType === "AUTO" && attendance.checkOutRecordedAt
              ? "Sistem mencatat pada " +
                formatTime(attendance.checkOutRecordedAt) +
                " WIB"
              : attendance.checkOutAt
                ? "Sesi WFH selesai"
                : attendance.checkOutDueAt
                  ? "Otomatis setelah 8 jam dari check-in"
                  : "Sesi belum ditutup"}
          </small>
        </article>
        <article>
          <span>Durasi WFH</span>
          <strong>
            {Math.floor(totalMinutes / 60)} jam {totalMinutes % 60} menit
          </strong>
          <small>
            {attendance.checkOutAt
              ? "Dihitung dari waktu server"
              : "Sesi masih berjalan"}
          </small>
        </article>
      </div>
      <section className="attendance-detail-photo-card">
        <div className="attendance-detail-card-heading">
          <h2>Bukti visual check-in dan check-out</h2>
          <span className="attendance-source-badge">Akses privat</span>
        </div>
        {missedCheckInClaim ? (
          <EmptyState
            title="Tidak ada bukti capture langsung"
            description="Kehadiran ini dicatat setelah klaim check-in yang terlupa disetujui."
          />
        ) : (
          <div className="grid grid-cols-2 gap-[1.2vw] max-md:grid-cols-1">
            {labels.map(([kind, label, time]) => (
              <article
                key={kind}
                className="grid gap-2 rounded-xl border border-slate-200 p-[1vw]"
              >
                <h3 className="font-semibold">{label}</h3>
                {images[kind] ? (
                  <img
                    src={images[kind]}
                    alt={label + " oleh " + attendance.employeeName}
                    className="attendance-detail-photo max-h-[32vw] object-contain"
                  />
                ) : (
                  <EmptyState
                    title="Belum tersedia"
                    description={
                      attendance.checkOutType === "AUTO" &&
                      kind.startsWith("CHECKOUT")
                        ? "Check-out otomatis tidak meminta bukti capture."
                        : "Tidak ada capture untuk catatan ini."
                    }
                  />
                )}
                <p className="small muted">{time}</p>
              </article>
            ))}
          </div>
        )}
        <p className="attendance-detail-readonly">
          Bukti visual dapat dibandingkan oleh HRD, tetapi tidak memverifikasi
          lokasi dan tidak mendeteksi perpindahan otomatis. Timestamp resmi
          berasal dari server; teks yang tertanam pada capture memakai jam
          perangkat.
        </p>
      </section>
      <section className="attendance-detail-info-card mt-[1vw]">
        <h2>Informasi sesi</h2>
        <dl className="grid grid-cols-2 gap-[0.8vw] max-sm:grid-cols-1">
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">Nama karyawan</dt>
            <dd className="break-words font-semibold text-slate-900">
              {attendance.employeeName}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">ID karyawan</dt>
            <dd className="break-words font-semibold text-slate-900">
              {attendance.employeeNumber}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">Departemen</dt>
            <dd className="break-words font-semibold text-slate-900">
              {departmentLabel(attendance.department)}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">Jabatan</dt>
            <dd className="break-words font-semibold text-slate-900">
              {attendance.employee?.position ?? "—"}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">Tanggal kerja</dt>
            <dd className="break-words font-semibold text-slate-900">
              {attendance.workDate}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">Check-in server</dt>
            <dd className="break-words font-semibold text-slate-900">
              {dateTime(attendance.submittedAt)}
            </dd>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[1vw] max-sm:p-3">
            <dt className="mb-1 text-sm text-slate-500">Check-out</dt>
            <dd className="break-words font-semibold text-slate-900">
              {checkoutLabel}
            </dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
