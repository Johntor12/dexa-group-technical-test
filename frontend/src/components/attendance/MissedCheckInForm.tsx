import { useState } from "react";
import type { FormEvent } from "react";

export interface MissedClaimValues {
  workDate: string;
  claimedCheckInTime: string;
  claimedCheckOutTime: string;
  reason: string;
  truthConfirmed: boolean;
}
export function MissedCheckInForm({
  busy,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  onSubmit: (values: MissedClaimValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<MissedClaimValues>({
    workDate: "",
    claimedCheckInTime: "",
    claimedCheckOutTime: "",
    reason: "",
    truthConfirmed: false,
  });
  const update = (key: keyof MissedClaimValues, value: string | boolean) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const maxDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  return (
    <section className="card mx-auto grid max-w-[52vw] gap-[1vw] max-lg:max-w-full">
      <span className="eyebrow">KLAIM CHECK-IN</span>
      <h2>Lupa check-in?</h2>
      <p>
        Klaim hanya untuk tanggal lampau. Pengajuan akan ditinjau HRD dan belum
        menjadi catatan kehadiran sampai disetujui.
      </p>
      <form
        className="grid gap-[1vw]"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void onSubmit(values);
        }}
      >
        <label>
          Tanggal kerja *
          <input
            required
            type="date"
            max={maxDate}
            value={values.workDate}
            onChange={(e) => update("workDate", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-[1vw] max-sm:grid-cols-1">
          <label>
            Perkiraan waktu mulai *
            <input
              required
              type="time"
              value={values.claimedCheckInTime}
              onChange={(e) => update("claimedCheckInTime", e.target.value)}
            />
          </label>
          <label>
            Perkiraan waktu selesai *
            <input
              required
              type="time"
              value={values.claimedCheckOutTime}
              onChange={(e) => update("claimedCheckOutTime", e.target.value)}
            />
          </label>
        </div>
        <label>
          Alasan lupa check-in *
          <textarea
            required
            minLength={20}
            maxLength={1000}
            value={values.reason}
            onChange={(e) => update("reason", e.target.value)}
            placeholder="Jelaskan alasan dan konteks pengajuan (minimal 20 karakter)"
          />
        </label>
        <label className="flex items-start gap-[0.6vw]">
          <input
            required
            type="checkbox"
            checked={values.truthConfirmed}
            onChange={(e) => update("truthConfirmed", e.target.checked)}
          />
          <span>
            Saya menyatakan informasi yang diberikan benar dan dapat
            diverifikasi.
          </span>
        </label>
        <p className="small muted">
          Timestamp pengajuan dan keputusan reviewer tetap dicatat oleh server.
          Waktu yang Anda isi adalah waktu klaim, bukan timestamp sistem.
        </p>
        <div className="flex gap-[1vw]">
          <button className="primary" disabled={busy} type="submit">
            Kirim untuk ditinjau
          </button>
          <button type="button" onClick={onCancel}>
            Batal
          </button>
        </div>
      </form>
    </section>
  );
}
