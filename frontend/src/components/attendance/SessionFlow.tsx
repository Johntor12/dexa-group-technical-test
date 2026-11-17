import type { Attendance } from "../../lib/api";
import {
  AttendanceCaptureForm,
  type AttendanceCaptureBundle,
} from "./AttendanceCaptureForm";
import { Button } from "../ui/Button";

export type AttendanceEvidenceImages = Partial<
  Record<
    | "CHECKIN_WORK_PROOF"
    | "CHECKIN_SELFIE"
    | "CHECKOUT_WORK_PROOF"
    | "CHECKOUT_SELFIE",
    string
  >
>;
const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    : "—";

export function CheckoutConfirmation({
  attendance,
  busy,
  loading,
  keyRef,
  onConfirm,
  onCancel,
}: {
  attendance: Attendance;
  busy: boolean;
  loading: boolean;
  keyRef: { current: string };
  onConfirm: (bundle: AttendanceCaptureBundle) => void;
  onCancel: () => void;
}) {
  const elapsed = Math.max(
    0,
    Date.now() - new Date(attendance.submittedAt).getTime(),
  );
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  return (
    <section className="card employee-wfh-flow-container grid gap-[1.2vw]">
      <span className="eyebrow">W F H / CHECK-OUT</span>
      <h2>Check-out WFH</h2>
      <p>Ambil ulang bukti area kerja dan selfie sebelum menutup sesi.</p>
      <dl className="grid grid-cols-2 gap-[1vw] max-sm:grid-cols-1">
        <div>
          <dt className="muted">Check-in (waktu server)</dt>
          <dd>{dateTime(attendance.submittedAt)}</dd>
        </div>
        <div>
          <dt className="muted">Durasi berjalan</dt>
          <dd>
            {hours} jam {minutes} menit
          </dd>
        </div>
        <div>
          <dt className="muted">Perkiraan check-out otomatis</dt>
          <dd>{dateTime(attendance.checkOutDueAt)}</dd>
        </div>
      </dl>
      <p className="small muted">
        Jika Anda tidak check-out, sistem menutup sesi otomatis 8 jam setelah
        check-in server. Sesi otomatis tidak memiliki capture check-out.
      </p>
      <AttendanceCaptureForm
        phase="CHECKOUT"
        busy={busy}
        loading={loading}
        keyRef={keyRef}
        onSubmit={onConfirm}
        onCancel={onCancel}
      />
    </section>
  );
}

function EvidenceGrid({
  images,
  phase,
  className = "",
}: {
  images: AttendanceEvidenceImages;
  phase: "CHECKIN" | "CHECKOUT" | "ALL";
  className?: string;
}) {
  const cards = [
    ...(phase !== "CHECKOUT"
      ? ([
          ["CHECKIN_WORK_PROOF", "Foto setup kerja saat check-in"],
          ["CHECKIN_SELFIE", "Foto karyawan saat check-in"],
        ] as const)
      : []),
    ...(phase !== "CHECKIN"
      ? ([
          ["CHECKOUT_WORK_PROOF", "Bukti kerja saat check-out"],
          ["CHECKOUT_SELFIE", "Selfie saat check-out"],
        ] as const)
      : []),
  ];
  return (
    <div className={`grid grid-cols-2 gap-[1vw] max-sm:grid-cols-1 ${className}`}>
      {cards.map(([key, label]) =>
        images[key] ? (
          <figure key={key} className="grid gap-2">
            <figcaption className="font-medium">{label}</figcaption>
            <img
              src={images[key]}
              alt={label}
              className="max-h-[28vw] w-full rounded-xl object-contain"
            />
          </figure>
        ) : null,
      )}
    </div>
  );
}

export function SessionCompletion({
  attendance,
  automatic,
  images,
  onDashboard,
  onHistory,
}: {
  attendance: Attendance;
  automatic: boolean;
  images: AttendanceEvidenceImages;
  onDashboard: () => void;
  onHistory: () => void;
}) {
  return (
    <section
      role="status"
      className="card employee-wfh-flow-container grid gap-[1.2vw]"
    >
      <span className="text-[clamp(2rem,3vw,3rem)] text-[#21653a]">✓</span>
      <h2>{automatic ? "Check-out otomatis selesai" : "Check-out berhasil"}</h2>
      <p>
        {automatic
          ? "Sesi ditutup setelah 8 jam berdasarkan waktu check-in server."
          : "Sesi WFH Anda telah selesai."}
      </p>
      <dl className="grid grid-cols-2 gap-[1vw] max-sm:grid-cols-1">
        <div>
          <dt className="muted">Check-in server</dt>
          <dd>{dateTime(attendance.submittedAt)}</dd>
        </div>
        <div>
          <dt className="muted">Check-out server</dt>
          <dd>{dateTime(attendance.checkOutAt)}</dd>
        </div>
        <div className="col-span-2 max-sm:col-span-1">
          <dt className="muted">Uraian aktivitas</dt>
          <dd className="whitespace-pre-wrap">{attendance.activityDescription || "Tidak diisi"}</dd>
        </div>
        {attendance.checkOutRecordedAt &&
          attendance.checkOutType === "AUTO" && (
            <div>
              <dt className="muted">Otomatis dicatat</dt>
              <dd>{dateTime(attendance.checkOutRecordedAt)}</dd>
            </div>
          )}
      </dl>
      <EvidenceGrid images={images} phase="ALL" />
      <p className="small muted">
        Capture membantu HRD meninjau bukti visual. Capture layar atau foto
        tidak membuktikan lokasi dan tidak mendeteksi perpindahan secara
        otomatis.
      </p>
      <div className="flex flex-wrap gap-[1vw]">
        <button className="primary" onClick={onDashboard}>
          Ke dashboard
        </button>
        <button onClick={onHistory}>Lihat riwayat</button>
      </div>
    </section>
  );
}

export function CheckInReceipt({
  attendance,
  images,
  onDashboard,
  onHistory,
}: {
  attendance: Attendance;
  images: AttendanceEvidenceImages;
  onDashboard: () => void;
  onHistory: () => void;
}) {
  const checkInDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(attendance.submittedAt));
  const checkInClock = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(new Date(attendance.submittedAt));
  const hasCheckInPhotos = !!(
    images.CHECKIN_WORK_PROOF || images.CHECKIN_SELFIE
  );

  return (
    <section
      role="status"
      className="checkin-receipt-page employee-wfh-flow-container grid gap-[1.4vw]"
    >
      <article className="checkin-receipt-card">
        <span className="checkin-receipt-status">✓ Check-in tercatat</span>
        <div className="checkin-receipt-time">
          <span>Waktu check-in resmi</span>
          <strong>{checkInClock} WIB</strong>
          <p>{checkInDate} · Waktu server</p>
        </div>
        <p className="checkin-receipt-metadata-note">
          Waktu check-in resmi dicatat oleh server. Timestamp yang tertulis
          pada foto tidak digunakan sebagai awal durasi WFH.
        </p>
        <p className="checkin-receipt-deadline">
          Batas check-out otomatis:{" "}
          <strong>
            {attendance.checkOutDueAt
              ? dateTime(attendance.checkOutDueAt)
              : "Belum tersedia"}
          </strong>{" "}
          (8 jam sejak check-in).
        </p>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="checkin-receipt-dashboard-button"
          onClick={onDashboard}
        >
          Ke Dashboard
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="checkin-receipt-history-button"
          onClick={onHistory}
        >
          Lihat riwayat
        </Button>
      </article>

      <details className="checkin-receipt-photos">
        <summary>Lihat Foto Check-in</summary>
        {hasCheckInPhotos ? (
          <EvidenceGrid
            images={images}
            phase="CHECKIN"
            className="checkin-receipt-photo-grid"
          />
        ) : (
          <p className="checkin-receipt-no-photos">
            Foto check-in belum tersedia. Buka riwayat untuk memuat ulang bukti
            sesi.
          </p>
        )}
      </details>
    </section>
  );
}
