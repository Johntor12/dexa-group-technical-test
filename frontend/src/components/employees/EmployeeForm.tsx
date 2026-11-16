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
  departments: Department[];
  busy: boolean;
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
}
export function EmployeeForm({
  form,
  setForm,
  editing,
  active,
  departments,
  busy,
  onSave,
  onCancel,
}: EmployeeFormProps) {
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
            {(
              [
                ["employeeNumber", "ID Karyawan"],
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
                  maxLength={field === "employeeNumber" ? 50 : 150}
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
