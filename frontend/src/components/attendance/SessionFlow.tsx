import type { Attendance } from "../../lib/api";
import {
  AttendanceCaptureForm,
  type AttendanceCaptureBundle,
} from "./AttendanceCaptureForm";

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
    <section className="card mx-auto grid max-w-[58vw] gap-[1.2vw] max-lg:max-w-full">
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
}: {
  images: AttendanceEvidenceImages;
  phase: "CHECKIN" | "CHECKOUT" | "ALL";
}) {
  const cards = [
    ...(phase !== "CHECKOUT"
      ? ([
          ["CHECKIN_WORK_PROOF", "Bukti kerja saat check-in"],
          ["CHECKIN_SELFIE", "Selfie saat check-in"],
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
    <div className="grid grid-cols-2 gap-[1vw] max-sm:grid-cols-1">
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
      className="card mx-auto grid max-w-[58vw] gap-[1.2vw] max-lg:max-w-full"
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
  return (
    <section
      role="status"
      className="card mx-auto grid max-w-[58vw] gap-[1.2vw] max-lg:max-w-full"
    >
      <span className="text-[clamp(2rem,3vw,3rem)] text-[#21653a]">✓</span>
      <h2>Check-in berhasil</h2>
      <p>
        Waktu check-in resmi:{" "}
        <strong>{dateTime(attendance.submittedAt)}</strong>
      </p>
      <EvidenceGrid images={images} phase="CHECKIN" />
      <p className="small muted">
        Waktu resmi berasal dari server. Tulisan timestamp pada gambar memakai
        waktu perangkat dan hanya sebagai penanda visual.
      </p>
      <p>
        Perkiraan check-out otomatis:{" "}
        <strong>{dateTime(attendance.checkOutDueAt)}</strong>
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
