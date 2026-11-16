import { useState } from "react";
import type { User } from "../../lib/api";
import dashboardIcon from "../../assets/figma/asset-1.svg";
import historyIcon from "../../assets/figma/asset-2.svg";
import privacyIcon from "../../assets/figma/asset-3.svg";
import logoutIcon from "../../assets/figma/asset-4.svg";

interface WorkspaceSidebarProps {
  user: User;
  view: "dashboard" | "attendance" | "employees" | "profile";
  busy: boolean;
  onViewChange: (view: "dashboard" | "attendance" | "employees") => void;
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
              ♙
            </span>
            <span>Data Karyawan</span>
          </button>
        )}
        <button
          aria-current={view === "attendance" ? "page" : undefined}
          onClick={() => onViewChange("attendance")}
        >
          <img src={historyIcon} alt="" />{" "}
          <span>
            {user.role === "HRD" ? "Monitoring Absensi" : "Riwayat Absensi"}
          </span>
        </button>
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
