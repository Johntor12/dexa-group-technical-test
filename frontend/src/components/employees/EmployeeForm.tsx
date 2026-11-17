import { useEffect, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Department, DepartmentCode } from "../../lib/api";

export interface EmployeeFormValues {
  email: string;
  fullName: string;
  employeeNumber: string;
  department: DepartmentCode | "";
  position: string;
}
interface EmployeeFormProps {
  form: EmployeeFormValues;
  setForm: Dispatch<SetStateAction<EmployeeFormValues>>;
  editing: string | null;
  active: boolean;
  loginActive: boolean;
  departments: Department[];
  busy: boolean;
  onSave: (event: FormEvent) => void;
  onDeactivate: (reason: string) => Promise<void>;
  onReissueActivation: () => void;
  onCancel: () => void;
}
export function EmployeeForm({
  form,
  setForm,
  editing,
  active,
  loginActive,
  departments,
  busy,
  onSave,
  onDeactivate,
  onReissueActivation,
  onCancel,
}: EmployeeFormProps) {
  const [deactivationOpen, setDeactivationOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const expectedConfirmation = `Nonaktifkan ${form.employeeNumber}`;

  useEffect(() => {
    setDeactivationOpen(false);
    setDeactivationReason("");
    setConfirmationText("");
  }, [editing]);

  return (
    <section className="employee-form-page">
      <button
        type="button"
        className="back-link employee-form-back"
        disabled={busy}
        onClick={onCancel}
      >
        ← Data Karyawan
      </button>
      <h1 className="employee-form-title">
        {editing ? "Ubah Karyawan" : "Tambah Karyawan"}
      </h1>
      <p className="employee-form-description">
        Lengkapi data karyawan dan informasi akunnya.
      </p>
      <form onSubmit={onSave} className="employee-form-shell">
        <div className="employee-form-card">
          <h2>Informasi Karyawan</h2>
          <p className="muted">Semua kolom bertanda * wajib diisi.</p>
          <div className="employee-form">
            {editing && <label>ID Karyawan<input value={form.employeeNumber} readOnly /></label>}
            {(
              [
                ["fullName", "Nama lengkap"],
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  value={form[field]}
                  type="text"
                  required
                  minLength={1}
                  maxLength={150}
                  autoComplete="off"
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Departemen *
              <select
                required
                value={form.department}
                onChange={(e) =>
                  setForm({
                    ...form,
                    department: e.target.value as DepartmentCode | "",
                  })
                }
              >
                <option value="">Pilih departemen</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ["position", "Jabatan"],
                ["email", "Email kantor"],
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                {label} *
                <input
                  value={form[field]}
                  type={field === "email" ? "email" : "text"}
                  required
                  minLength={1}
                  maxLength={field === "position" ? 100 : 191}
                  autoComplete="off"
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Status *
              <select disabled value={active ? "ACTIVE" : "INACTIVE"}>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </label>
            {editing && active && !loginActive && (
              <div className="employee-account-panel">
                <strong>Akun belum diaktifkan</strong>
                <p>Kirim ulang tautan aktivasi jika tautan sebelumnya kedaluwarsa.</p>
                <button type="button" disabled={busy} onClick={onReissueActivation}>
                  Kirim ulang tautan aktivasi
                </button>
              </div>
            )}
            {editing && active && (
              <div className="employee-deactivation-panel col-span-full rounded-xl border border-rose-200 bg-rose-50 p-[1.2vw] max-sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong className="text-rose-900">Nonaktifkan karyawan</strong>
                    <p className="mt-1 text-sm text-rose-800">
                      Akses akun akan dicabut dan riwayat absensi tetap tersimpan.
                    </p>
                  </div>
                  {!deactivationOpen && (
                    <button type="button" disabled={busy} onClick={() => setDeactivationOpen(true)}>
                      Nonaktifkan
                    </button>
                  )}
                </div>
                {deactivationOpen && (
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1 text-sm font-medium text-slate-800">
                      Alasan penonaktifan
                      <textarea
                        aria-required="true"
                        maxLength={500}
                        rows={3}
                        value={deactivationReason}
                        onChange={(event) => setDeactivationReason(event.target.value)}
                        placeholder="Contoh: Karyawan sedang cuti mulai tanggal ..."
                        className="rounded-lg border border-slate-300 bg-white p-3 font-normal"
                      />
                      <span className="font-normal text-slate-500">Minimal 10 karakter.</span>
                    </label>
                    <label className="grid gap-1 text-sm font-medium text-slate-800">
                      Ketik ulang pernyataan untuk mengonfirmasi
                      <span className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-mono text-rose-900">
                        {expectedConfirmation}
                      </span>
                      <input
                        aria-required="true"
                        autoComplete="off"
                        value={confirmationText}
                        onChange={(event) => setConfirmationText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.preventDefault();
                        }}
                        placeholder={expectedConfirmation}
                        className="rounded-lg border border-slate-300 bg-white p-3 font-normal"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="primary"
                        disabled={busy || deactivationReason.trim().length < 10 || confirmationText !== expectedConfirmation}
                        onClick={() => void onDeactivate(deactivationReason.trim())}
                      >
                        {busy ? "Memproses…" : "Konfirmasi nonaktifkan"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setDeactivationOpen(false);
                          setDeactivationReason("");
                          setConfirmationText("");
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="employee-account-panel">
              <strong>Akun Login</strong>
              <p>
                Peran: Karyawan. Email kantor digunakan untuk masuk ke DexaWork.
              </p>
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" disabled={busy} onClick={() => onCancel()}>
            Batal
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Menyimpan…"
              : editing
                ? "Simpan Perubahan"
                : "Simpan Karyawan"}
          </button>
        </div>
      </form>
    </section>
  );
}
