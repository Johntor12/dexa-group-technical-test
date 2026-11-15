import type { Attendance } from "../../lib/api";
import { Button } from "../ui/Button";

export function SubmissionSuccess({
  attendance,
  preview,
  onHistory,
  formatTime,
}: {
  attendance: Attendance;
  preview: string;
  onHistory: () => void;
  formatTime: (value: string) => string;
}) {
  return (
    <section
      className="card mx-auto grid max-w-[52.8vw] gap-[1.5vw] max-lg:max-w-full"
      role="status"
    >
      <span
        className="text-[#21653a] text-[clamp(2rem,3vw,3rem)]"
        aria-hidden="true"
      >
        ✓
      </span>
      <h2>Absensi berhasil dikirim</h2>
      <p>
        Waktu tercatat:{" "}
        <strong>{formatTime(attendance.submittedAt)} WIB</strong>
      </p>
      <p className="muted">
        Tanggal kerja: {attendance.workDate} · Asia/Jakarta
      </p>
      {preview && (
        <img
          src={preview}
          alt="Foto bukti kerja yang berhasil dikirim"
          className="max-h-[18vw] w-full rounded-lg object-contain max-md:max-h-[50vw]"
        />
      )}
      <Button variant="primary" onClick={onHistory}>
        Lihat Riwayat
      </Button>
    </section>
  );
}
