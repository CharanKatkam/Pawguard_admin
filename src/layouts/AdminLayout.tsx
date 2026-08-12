import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaShieldAlt } from "react-icons/fa";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";
import {
  getCurrentUserRole,
  getDashboardRoleFromPath,
  getRoleTitle,
} from "../utils/roleUtils";

const AdminLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // "Active dashboard" context for Super Admin viewing another role's dashboard.
  const currentRole = getCurrentUserRole();
  const activeDashRole = getDashboardRoleFromPath(location.pathname);
  const viewingRoleDashboard =
    currentRole === "super_admin" && activeDashRole && activeDashRole !== "super_admin";

  const sidebarWidth = isSidebarCollapsed ? 70 : 260;

  return (
    <div
      style={{
        background: "#F8FAFC",
        height: "100vh",
        display: "flex",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Fixed Sidebar */}
      <Sidebar collapsed={isSidebarCollapsed} />

      {/* Main Container */}
      <div
        style={{
          marginLeft: `${sidebarWidth}px`,
          height: "100vh",
          width: `calc(100% - ${sidebarWidth}px)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Compact Header */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Super Admin module-view context bar: active dashboard ≠ auth role */}
        {viewingRoleDashboard && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              padding: "10px 24px",
              background: "#EFF6FF",
              borderBottom: "1px solid #BFDBFE",
              fontSize: "13px",
              color: "#1E40AF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                <FaShieldAlt size={12} />
                Active Dashboard: {getRoleTitle(activeDashRole)}
              </span>
              <span style={{ opacity: 0.7 }}>·</span>
              <span style={{ fontWeight: 600 }}>
                Logged in as: {getRoleTitle(currentRole)}
              </span>
            </div>
            <button
              onClick={() => navigate("/dashboard/super-admin")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                padding: "7px 14px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "12.5px",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1D4ED8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#2563EB")}
            >
              <FaArrowLeft size={11} />
              Back to Super Admin
            </button>
          </div>
        )}

        {/* Dynamic Page Content */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
            overflowX: "auto",
            maxWidth: "1600px",
            width: "100%",
            boxSizing: "border-box",
            margin: "0 auto",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
