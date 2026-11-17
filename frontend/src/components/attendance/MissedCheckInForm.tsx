import { useState } from "react";
import type { FormEvent } from "react";

export interface MissedClaimValues {
  workDate: string;
  claimedCheckInTime: string;
  claimedCheckOutTime: string;
  reason: string;
  truthConfirmed: boolean;
  evidence: File | null;
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
  const [fileError, setFileError] = useState("");
  const [values, setValues] = useState<MissedClaimValues>({
    workDate: "",
    claimedCheckInTime: "",
    claimedCheckOutTime: "",
    reason: "",
    truthConfirmed: false,
    evidence: null,
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
          if (values.evidence) void onSubmit(values);
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
        <label>
          Bukti aktivitas kerja *
          <input
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > 5 * 1024 * 1024) {
                event.target.value = "";
                setValues((previous) => ({ ...previous, evidence: null }));
                setFileError("Ukuran file maksimal 5 MiB.");
                return;
              }
              setFileError("");
              setValues((previous) => ({ ...previous, evidence: file }));
            }}
          />
          <span className="small muted">Foto (JPEG, PNG, WebP) atau PDF · maksimal 5 MiB.</span>
          {fileError && <span role="alert" className="text-sm text-red-700">{fileError}</span>}
          {values.evidence && (
            <span className="text-sm text-slate-700">{values.evidence.name} · {(values.evidence.size / (1024 * 1024)).toFixed(2)} MiB</span>
          )}
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
