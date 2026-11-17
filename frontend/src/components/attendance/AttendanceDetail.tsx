import type { Attendance } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";
import { LocationDetails } from "./LocationDetails";
import { departmentLabel } from "../../lib/departments";

const clock = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

function elapsedLabel(attendance: Attendance) {
  if (attendance.source === "CORRECTION") return "Catatan koreksi";
  const end = attendance.checkOutAt
    ? new Date(attendance.checkOutAt).getTime()
    : Date.now();
  const totalMinutes = Math.max(
    0,
    Math.floor((end - new Date(attendance.submittedAt).getTime()) / 60000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return (
    hours +
    " jam " +
    minutes +
    " menit" +
    (attendance.checkOutAt ? "" : " · berjalan")
  );
}

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
  const correction = attendance.source === "CORRECTION";
  const checkoutLabel = attendance.checkOutAt
    ? clock(attendance.checkOutAt) + " WIB"
    : attendance.checkOutDueAt
      ? "Belum · estimasi " + formatTime(attendance.checkOutDueAt) + " WIB"
      : "Belum tercatat";
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
      {correction && (
        <div role="status" className="attendance-correction-banner">
          Catatan ini dibuat melalui koreksi. Waktu tercatat menunjukkan waktu
          persetujuan aktual, bukan waktu check-in yang diklaim. Referensi:{" "}
          {attendance.correctionRequestId || "—"}.
        </div>
      )}
      <div className="attendance-detail-metrics">
        <article>
          <span>{correction ? "Keputusan koreksi" : "Check-in resmi"}</span>
          <strong>{clock(attendance.submittedAt)} WIB</strong>
          <small>
            {correction
              ? "Timestamp persetujuan server"
              : "Dicatat oleh server"}
          </small>
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
            {attendance.checkOutRecordedAt && attendance.checkOutType === "AUTO"
              ? "Sistem mencatat pada " +
                formatTime(attendance.checkOutRecordedAt) +
                " WIB"
              : attendance.checkOutDueAt && !attendance.checkOutAt
                ? "Otomatis setelah 8 jam dari check-in"
                : attendance.checkOutAt
                  ? "Sesi WFH selesai"
                  : "Sesi belum ditutup"}
          </small>
        </article>
        <article>
          <span>Durasi WFH</span>
          <strong>{elapsedLabel(attendance)}</strong>
          <small>
            {correction
              ? "Durasi kerja tidak dihitung dari timestamp koreksi"
              : "Dihitung dari check-in server"}
          </small>
        </article>
      </div>
      <div className="attendance-detail-layout">
        <section className="attendance-detail-photo-card">
          <div className="attendance-detail-card-heading">
            <h2>Foto check-in</h2>
            {!correction && (
              <span className="attendance-source-badge">Bukti privat</span>
            )}
          </div>
          {correction ? (
            <EmptyState
              title="Tidak ada foto check-in langsung"
              description="Bukti pendukung koreksi dikelola pada permintaan koreksi terkait."
            />
          ) : image ? (
            <img
              src={image}
              alt={
                "Foto setup kerja saat check-in oleh " + attendance.employeeName
              }
              className="attendance-detail-photo"
            />
          ) : (
            <EmptyState
              title="Foto belum tersedia"
              description="Bukti check-in tidak dapat dimuat saat ini."
            />
          )}
          <div className="attendance-photo-caption">
            <strong>Waktu pengambilan foto</strong>
            <span>
              {attendance.checkInPhotoCapturedAt
                ? attendance.checkInPhotoCapturedAt +
                  (attendance.checkInPhotoOffset
                    ? " " + attendance.checkInPhotoOffset
                    : "")
                : "Metadata foto tidak tersedia"}
            </span>
            <p>
              Durasi kerja dimulai dari waktu check-in server, terpisah dari
              waktu pengambilan foto.
            </p>
          </div>
        </section>
        <section className="attendance-detail-info-card">
          <h2>Detail aktivitas dan sumber</h2>
          <div className="attendance-activity-block">
            <h3>Task yang dikerjakan</h3>
            <p>
              {attendance.taskDescription ||
                "Task tidak dicantumkan pada catatan lama."}
            </p>
          </div>
          <div className="attendance-activity-block">
            <h3>Alasan WFH</h3>
            <p>{attendance.wfhReason?.trim() || "Tidak diisi (opsional)."}</p>
          </div>
          <div className="attendance-location-block">
            <LocationDetails attendance={attendance} />
          </div>
          <div className="attendance-audit-block">
            <h3>Informasi sesi</h3>
            <dl>
              <div>
                <dt>Tanggal kerja</dt>
                <dd>{attendance.workDate}</dd>
              </div>
              <div>
                <dt>Check-in server</dt>
                <dd>{formatTime(attendance.submittedAt)} WIB</dd>
              </div>
              <div>
                <dt>Check-out aktual</dt>
                <dd>{checkoutLabel}</dd>
              </div>
              <div>
                <dt>Sumber check-out</dt>
                <dd>
                  {attendance.checkOutType === "AUTO"
                    ? "Otomatis oleh sistem"
                    : attendance.checkOutAt
                      ? "Manual oleh karyawan"
                      : "Belum check-out"}
                </dd>
              </div>
              {attendance.checkOutDueAt && (
                <div>
                  <dt>Batas otomatis</dt>
                  <dd>{formatTime(attendance.checkOutDueAt)} WIB</dd>
                </div>
              )}
              {attendance.checkOutRecordedAt &&
                attendance.checkOutType === "AUTO" && (
                  <div>
                    <dt>Waktu sistem mencatat</dt>
                    <dd>{formatTime(attendance.checkOutRecordedAt)} WIB</dd>
                  </div>
                )}
              {attendance.correctionRequestId && (
                <div>
                  <dt>Referensi koreksi</dt>
                  <dd>{attendance.correctionRequestId}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      </div>
      <p className="attendance-detail-readonly">
        Catatan aktual hanya dapat dilihat. Check-out tidak meminta atau
        menampilkan bukti foto baru.{" "}
        {correction
          ? "Bukti pendukung hanya dapat dilihat pemilik dan reviewer yang berwenang."
          : "Foto bukti check-in hanya dapat dilihat pemilik dan HRD."}
      </p>
    </section>
  );
}
