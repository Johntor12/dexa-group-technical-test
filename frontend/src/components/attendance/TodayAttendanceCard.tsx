import type { Attendance } from "../../lib/api";
import type { AttendanceCaptureBundle } from "./AttendanceCaptureForm";
import { AttendanceCaptureForm } from "./AttendanceCaptureForm";
import { StatusBadge } from "../ui/StatusBadge";

export function TodayAttendanceCard({
  today,
  busy,
  loading,
  keyRef,
  onSubmit,
  onDashboard,
  formatTime,
}: {
  today: Attendance | null;
  busy: boolean;
  loading: boolean;
  keyRef: { current: string };
  onSubmit: (bundle: AttendanceCaptureBundle) => void;
  onDashboard: () => void;
  formatTime: (value: string) => string;
}) {
  if (today)
    return (
      <section className="attendance-submit-page">
        <div role="status" className="card grid gap-[1vw]">
          <StatusBadge
            active
            activeLabel="Check-in tercatat"
            inactiveLabel=""
          />
          <strong>Check-in hari ini sudah tercatat.</strong>
          <p>Waktu check-in server: {formatTime(today.submittedAt)} WIB</p>
        </div>
      </section>
    );

  return (
    <section className="attendance-submit-page grid gap-[1.2vw]">
      <div className="attendance-page-intro">
        <button
          type="button"
          className="back-link mb-[0.8vw]"
          onClick={onDashboard}
        >
          ← Kembali ke dashboard
        </button>
        <h2>Absensi WFH</h2>
        <p>
          Ambil bukti area kerja dan selfie langsung dari browser untuk memulai
          sesi.
        </p>
      </div>
      <AttendanceCaptureForm
        phase="CHECKIN"
        busy={busy}
        loading={loading}
        keyRef={keyRef}
        onSubmit={onSubmit}
        onCancel={onDashboard}
      />
    </section>
  );
}
