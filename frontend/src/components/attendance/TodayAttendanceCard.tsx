import type { FormEvent } from "react";
import type { Attendance } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { FileUpload } from "../ui/FileUpload";
import { Button } from "../ui/Button";
import { LocationCapture } from './LocationCapture'
import type { WfhLocation } from './LocationCapture'

interface TodayAttendanceCardProps {
  today: Attendance | null;
  busy: boolean;
  loading: boolean;
  file: File | null;
  location: WfhLocation | null;
  setLocation: (location: WfhLocation) => void;
  reason: string;
  setReason: (reason: string) => void;
  setFile: (file: File | null) => void;
  setError: (error: string) => void;
  keyRef: { current: string };
  onSubmit: (event: FormEvent) => void;
  formatTime: (value: string) => string;
}

export function TodayAttendanceCard({
  today,
  busy,
  loading,
  file,
  location,
  setLocation,
  reason,
  setReason,
  setFile,
  setError,
  keyRef,
  onSubmit,
  formatTime,
}: TodayAttendanceCardProps) {
  return (
    <section className="card mx-auto max-w-[52.8vw] max-lg:max-w-full">
      <h2>Foto bukti kerja WFH</h2>
      <p className="mb-[1.5vw] text-dexa-muted">
        Unggah foto aktivitas kerja Anda. Hindari dokumen rahasia atau orang
        lain dalam foto.
      </p>
      {today ? (
        <div role="status" className="grid gap-[1vw]">
          <StatusBadge active activeLabel="Sudah terkirim" inactiveLabel="" />
          <strong>Absensi hari ini sudah tercatat.</strong>
          <p>Waktu tercatat: {formatTime(today.submittedAt)} WIB</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-[1.5vw]">
          <FileUpload
            file={file}
            disabled={busy || loading}
            onError={setError}
            onChange={(selected) => {
              setFile(selected);
              keyRef.current = crypto.randomUUID();
            }}
          />
          <LocationCapture location={location} disabled={busy || loading} onChange={selected => { setLocation(selected); keyRef.current = crypto.randomUUID() }} onError={setError} />
          <label>Alasan WFH (opsional)<textarea maxLength={500} rows={3} value={reason} onChange={event => { setReason(event.target.value); keyRef.current = crypto.randomUUID() }} placeholder="Contoh: fokus menyelesaikan pekerjaan dari rumah" className="w-full rounded-[0.56vw] border border-dexa-border bg-white px-[0.97vw] py-[0.83vw] text-dexa-ink" /></label>
          <Button
            type="submit"
            variant="primary"
            loading={busy}
            disabled={loading || !file || !location}
          >
            Kirim Absensi
          </Button>
        </form>
      )}
    </section>
  );
}
