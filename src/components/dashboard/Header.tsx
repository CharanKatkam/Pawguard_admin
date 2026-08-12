import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaUserCheck,
  FaShieldAlt,
  FaEnvelope,
} from "react-icons/fa";
import { getCurrentUser, getCurrentUserRole, getRoleTitle } from "../../utils/roleUtils";
import { canViewSettings } from "../../utils/rbac";
import authService from "../../services/auth/authService";
import { clearAuthData } from "../../utils/authStorage";
import NotificationDropdown from "./NotificationDropdown";
import Modal from "../common/Modal";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

const getPageTitle = (pathname: string): string => {
  const path = pathname.toLowerCase();

  if (path.includes("/dashboard")) {
    if (path.includes("/super-admin")) return "Super Admin Dashboard";
    if (path.includes("/rescue-centre-admin")) return "Rescue Centre Admin Dashboard";
    if (path.includes("/rescue-coordinator")) return "Rescue Coordinator Dashboard";
    if (path.includes("/rescue-agent")) return "Rescue Agent Dashboard";
    if (path.includes("/veterinarian")) return "Veterinarian Dashboard";
    if (path.includes("/shelter-manager")) return "Shelter Manager Dashboard";
    if (path.includes("/adoption-coordinator")) return "Adoption Coordinator Dashboard";
    if (path.includes("/foster-coordinator")) return "Foster Coordinator Dashboard";
    if (path.includes("/volunteer-coordinator")) return "Volunteer Coordinator Dashboard";
    if (path.includes("/inventory-manager")) return "Inventory Manager Dashboard";
    if (path.includes("/finance")) return "Finance Dashboard";
    if (path.includes("/volunteer")) return "Volunteer Dashboard";
    if (path.includes("/foster-family")) return "Foster Family Dashboard";
    if (path.includes("/donor")) return "Donor Dashboard";
    if (path.includes("/public")) return "General Public Dashboard";
    return "Dashboard";
  }

  if (path.includes("/users")) return "User Management";
  if (path.includes("/rescues")) return "Rescue Management";
  if (path.includes("/rescue-requests")) return "Rescue Requests";
  if (path.includes("/rescue-dispatch")) return "Rescue Dispatch";
  if (path.includes("/pets")) return "Dog & Animal Management";
  if (path.includes("/medical-records")) return "Medical Management";
  if (path.includes("/medical-reminders")) return "Vaccination & Medication Reminders";

  if (path.includes("/shelters")) return "Shelter Management";
  if (path.includes("/adoptions")) return "Adoption Management";
  if (path.includes("/fosters")) return "Foster Management";
  if (path.includes("/volunteers")) return "Volunteer Management";
  if (path.includes("/lost-and-found")) return "Lost & Found";
  if (path.includes("/inventory")) return "Inventory Management";
  if (path.includes("/finance")) return "Donations & Finance";
  if (path.includes("/vehicles")) return "Vehicle Management";
  if (path.includes("/reports")) return "Reports & Analytics";
  if (path.includes("/settings")) return "Settings";
  if (path.includes("/roles-permissions")) return "Roles & Permissions";
  if (path.includes("/audit-logs")) return "Audit Logs";
  if (path.includes("/certificates")) return "Certificates";

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0) {
    const raw = segments[segments.length - 1].replace(/-/g, " ");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return "Dashboard";
};

const Header = ({ onToggleSidebar, isSidebarCollapsed }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const displayName =
    user?.name ||
    user?.email?.split("@")[0] ||
    "Authenticated User";

  const currentRole = getCurrentUserRole();
  const roleTitle = getRoleTitle(currentRole);
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthData();
      navigate("/");
    }
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: "var(--header-height, 64px)",
          background: "#FFFFFF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05)",
        }}
      >
        {/* Left: Sidebar Toggle + Current Page Title ONLY */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              width: "38px",
              height: "38px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <FaChevronLeft size={16} /> : <FaChevronRight size={16} />}
          </button>

          {/* Clean Page Title */}
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            {pageTitle}
          </h2>
        </div>

        {/* Right Controls: Notifications, Settings, Profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Role-Specific Notifications */}
          <NotificationDropdown />

          {/* Quick Settings (Super Admin only) */}
          {canViewSettings(currentRole ?? undefined) && (
            <button
              onClick={() => navigate("/settings")}
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="System Settings"
            >
              <FaCog size={17} />
            </button>
          )}

          <div style={{ width: "1px", height: "24px", background: "#E2E8F0" }} />

          {/* Authenticated User Profile Badge (Clickable) */}
          <div
            onClick={() => setIsProfileModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "8px",
              transition: "background 0.15s ease",
            }}
            title="View My Profile Details"
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <FaUserCircle size={36} style={{ color: "#2563EB" }} />
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
                {displayName}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#2563EB",
                  background: "#EFF6FF",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  marginTop: "2px",
                  display: "inline-block",
                  width: "fit-content",
                }}
              >
                {roleTitle}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderRadius: "10px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#EF4444",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Sign Out"
          >
            <FaSignOutAlt size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Interactive Profile Details Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Authenticated Staff Profile">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
            <FaUserCircle size={48} style={{ color: "#2563EB" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>{displayName}</h3>
              <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 700, background: "#EFF6FF", padding: "2px 8px", borderRadius: "4px", marginTop: "4px", display: "inline-block" }}>
                {roleTitle}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569" }}>
              <FaEnvelope style={{ color: "#64748B" }} /> <strong>Email:</strong> {user?.email || "admin@pawguard.org"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569" }}>
              <FaShieldAlt style={{ color: "#64748B" }} /> <strong>Internal Role Code:</strong> {currentRole || "super_admin"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569" }}>
              <FaUserCheck style={{ color: "#10B981" }} /> <strong>Session Status:</strong> Active JWT Authenticated Session
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              onClick={() => setIsProfileModalOpen(false)}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#0F172A", cursor: "pointer", fontWeight: 600 }}
            >
              Close
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFFFFF", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Header;