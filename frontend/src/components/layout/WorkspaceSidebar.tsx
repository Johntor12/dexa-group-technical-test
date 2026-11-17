import { useEffect, useState } from "react";
import type { User } from "../../lib/api";
import dashboardIcon from "../../assets/figma/asset-1.svg";
import historyIcon from "../../assets/figma/asset-2.svg";
import privacyIcon from "../../assets/figma/asset-3.svg";
import logoutIcon from "../../assets/figma/asset-4.svg";

interface WorkspaceSidebarProps {
  user: User;
  view:
    | "dashboard"
    | "attendance"
    | "attendance-today"
    | "claim-review"
    | "employees"
    | "profile";
  busy: boolean;
  onViewChange: (
    view: "dashboard" | "attendance" | "attendance-today" | "claim-review" | "employees",
  ) => void;
  onLogout: () => void;
}

export function WorkspaceSidebar({
  user,
  view,
  busy,
  onViewChange,
  onLogout,
}: WorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const monitoringActive =
    view === "attendance" ||
    view === "attendance-today" ||
    view === "claim-review";
  const [attendanceOpen, setAttendanceOpen] = useState(monitoringActive);
  useEffect(() => {
    if (monitoringActive) setAttendanceOpen(true);
  }, [monitoringActive]);
  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-heading">
        <div className="brand" aria-label="DexaWork">
          <span className="brand-dexa">Dexa</span>
          <span className="brand-work">Work</span>
        </div>
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
        </button>
      </div>
      <p className="nav-label">
        {user.role === "HRD" ? "WORKSPACE HRD" : "WORKSPACE"}
      </p>
      <nav aria-label="Navigasi utama">
        <button
          aria-current={view === "dashboard" ? "page" : undefined}
          onClick={() => onViewChange("dashboard")}
        >
          <img src={dashboardIcon} alt="" /> <span>Dashboard</span>
        </button>
        {user.role === "HRD" && (
          <button
            aria-current={view === "employees" ? "page" : undefined}
            onClick={() => {
              onViewChange("employees");
            }}
          >
            <span className="nav-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
              </svg>
            </span>
            <span className="nav-text">Data Karyawan</span>
          </button>
        )}
        {user.role === "HRD" ? (
          <div className="sidebar-nav-group">
            <button
              type="button"
              aria-current={monitoringActive ? "page" : undefined}
              aria-expanded={attendanceOpen}
              onClick={() => setAttendanceOpen((open) => !open)}
            >
              <img src={historyIcon} alt="" />
              <span>Monitoring Absensi</span>
              <span className="sidebar-chevron" aria-hidden="true">
                {attendanceOpen ? "⌄" : "›"}
              </span>
            </button>
            {attendanceOpen && (
              <div className="sidebar-submenu" aria-label="Menu monitoring absensi">
                <button
                  type="button"
                  aria-current={view === "attendance-today" ? "page" : undefined}
                  onClick={() => onViewChange("attendance-today")}
                >
                  <span className="sidebar-submenu-dot" aria-hidden="true">•</span>
                  <span>Check-in Hari Ini</span>
                </button>
                <button
                  type="button"
                  aria-current={view === "claim-review" ? "page" : undefined}
                  onClick={() => onViewChange("claim-review")}
                >
                  <span className="sidebar-submenu-dot" aria-hidden="true">•</span>
                  <span>Review Klaim Absensi</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            aria-current={view === "attendance" ? "page" : undefined}
            onClick={() => onViewChange("attendance")}
          >
            <img src={historyIcon} alt="" />
            <span>Riwayat Absensi</span>
          </button>
        )}
      </nav>
      <div className="sidebar-spacer" />
      {!collapsed && (
        <div className="privacy-card">
          <img src={privacyIcon} alt="" />
          <strong>Privasi terjaga</strong>
          <p>Bukti kerja hanya untuk Anda dan HRD.</p>
        </div>
      )}
      <div className="sidebar-bottom">
        <button disabled={busy} onClick={() => onLogout()}>
          <img src={logoutIcon} alt="" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
