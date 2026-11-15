import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Department, DepartmentCode } from "../../lib/api";

export interface EmployeeFormValues {
  email: string;
  fullName: string;
  employeeNumber: string;
  department: DepartmentCode | '';
  position: string;
}
interface EmployeeFormProps {
  form: EmployeeFormValues;
  setForm: Dispatch<SetStateAction<EmployeeFormValues>>;
  editing: string | null;
  departments: Department[];
  busy: boolean;
  onSave: (event: FormEvent) => void;
  onCancel: () => void;
}
export function EmployeeForm({
  form,
  setForm,
  editing,
  departments,
  busy,
  onSave,
  onCancel,
}: EmployeeFormProps) {
  return (
    <section className="card">
      <h2>{editing ? "Ubah karyawan" : "Karyawan baru"}</h2>
      <form onSubmit={onSave} className="employee-form">
        {(
          [
            ["fullName", "Nama lengkap"],
            ["employeeNumber", "Nomor karyawan"],
            ["email", "Email"],
            ["position", "Jabatan"],
          ] as const
        ).map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              value={form[field]}
              type={
                field === "email"
                    ? "email"
                    : "text"
              }
              required
              minLength={1}
              maxLength={
                field === "employeeNumber"
                    ? 50
                    : field === "position"
                      ? 100
                      : field === "fullName"
                        ? 150
                        : 191
              }
              autoComplete="off"
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          </label>
        ))}
        <label>
          Departemen
          <select
            required
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value as DepartmentCode | '' })}
          >
            <option value="">Pilih departemen</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button className="primary" disabled={busy}>
            Simpan
          </button>
          <button type="button" disabled={busy} onClick={() => onCancel()}>
            Batal
          </button>
        </div>
      </form>
    </section>
  );
}
