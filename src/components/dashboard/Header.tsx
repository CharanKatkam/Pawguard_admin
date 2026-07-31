import { useLocation, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaCog,
  FaSignOutAlt,
  FaBars,
} from "react-icons/fa";
import { getCurrentUser, getCurrentUserRole, getRoleTitle } from "../../utils/roleUtils";
import NotificationDropdown from "./NotificationDropdown";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

const getPageTitle = (pathname: string): string => {
  const path = pathname.toLowerCase();

  if (path.includes("/dashboard")) {
    if (path.includes("/super-admin")) return "Dashboard";
    if (path.includes("/rescue-centre-admin")) return "Rescue Centre Admin";
    if (path.includes("/rescue-coordinator")) return "Rescue Coordinator";
    if (path.includes("/rescue-agent")) return "Rescue Agent";
    if (path.includes("/veterinarian")) return "Veterinarian";
    if (path.includes("/shelter-manager")) return "Shelter Manager";
    if (path.includes("/adoption-coordinator")) return "Adoption Coordinator";
    if (path.includes("/foster-coordinator")) return "Foster Coordinator";
    if (path.includes("/volunteer-coordinator")) return "Volunteer Coordinator";
    if (path.includes("/inventory-manager")) return "Inventory Manager";
    if (path.includes("/finance")) return "Finance";
    if (path.includes("/volunteer")) return "Volunteer";
    if (path.includes("/foster-family")) return "Foster Family";
    if (path.includes("/donor")) return "Donor";
    if (path.includes("/public")) return "General Public";
    return "Dashboard";
  }

  if (path.includes("/users")) return "Users";
  if (path.includes("/pets")) return "Animals & Pets";
  if (path.includes("/shelters")) return "Shelters & Centres";
  if (path.includes("/adoptions")) return "Adoptions";
  if (path.includes("/medical-records")) return "Medical Records";
  if (path.includes("/inventory")) return "Inventory";
  if (path.includes("/finance")) return "Finance & Donations";
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

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const displayName =
    user?.name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : null) ||
    user?.email?.split("@")[0] ||
    "Authenticated User";

  const currentRole = getCurrentUserRole();
  const roleTitle = getRoleTitle(currentRole);
  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
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
          title="Toggle Navigation Sidebar"
        >
          <FaBars size={16} />
        </button>

        {/* Clean Page Title (No "Portal >" or breadcrumb arrows) */}
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

        {/* Quick Settings */}
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

        <div style={{ width: "1px", height: "24px", background: "#E2E8F0" }} />

        {/* Authenticated User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
  );
};

export default Header;