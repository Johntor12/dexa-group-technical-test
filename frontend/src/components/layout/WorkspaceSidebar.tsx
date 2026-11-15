import type { User } from "../../lib/api";

interface WorkspaceSidebarProps {
  user: User;
  view: "dashboard" | "attendance" | "employees" | "profile";
  busy: boolean;
  onViewChange: (view: "dashboard" | "attendance" | "employees") => void;
  onSubmit: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export function WorkspaceSidebar({
  user,
  view,
  busy,
  onViewChange,
  onSubmit,
  onProfile,
  onLogout,
}: WorkspaceSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">P</span> DexaWork
      </div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Navigasi utama">
        <button
          aria-current={view === "dashboard" ? "page" : undefined}
          onClick={() => onViewChange("dashboard")}
        >
          Dashboard
        </button>
        {user.role === "EMPLOYEE" && <button onClick={onSubmit}>Kirim absensi</button>}
        <button
          aria-current={view === "attendance" ? "page" : undefined}
          onClick={() => {
            onViewChange("attendance");
          }}
        >
          {user.role === "HRD" ? "Monitor absensi" : "Riwayat Absensi"}
        </button>
        {user.role === "HRD" && (
          <button
            aria-current={view === "employees" ? "page" : undefined}
            onClick={() => {
              onViewChange("employees");
            }}
          >
            Data karyawan
          </button>
        )}
        <button aria-current={view === "profile" ? "page" : undefined} onClick={onProfile}>Profil saya</button>
      </nav>
      <div className="sidebar-bottom">
        <span className="role-badge">{user.role}</span>
        <p>{user.employee?.fullName ?? "Human Resources"}</p>
        <button disabled={busy} onClick={() => onLogout()}>
          Keluar
        </button>
      </div>
    </aside>
  );
}
