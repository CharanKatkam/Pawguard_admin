import {
  FaTachometerAlt,
  FaUsers,
  FaPaw,
  FaHome,
  FaHeart,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaAmbulance,
  FaStethoscope,
  FaBoxes,
  FaCoins,
  FaClipboardList,
  FaShieldAlt,
  FaCertificate,
  FaLifeRing,
  FaHandHoldingHeart,
  FaUserFriends,
  FaSearchLocation,
  FaTruck,
  FaBell,
} from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import {
  getCurrentUserRole,
  getMenusForRole,
  getMenuViewPermission,
  getSidebarRole,
} from "../../utils/roleUtils";
import type { RoleMenuItem } from "../../utils/roleUtils";
import { DEFAULT_ROLE_PERMISSIONS } from "../../utils/permissionsCatalog";
import { usePermissions } from "../../context/PermissionContext";
import { notifyAuthChanged } from "../../utils/dataSync";
import { clearAuthData } from "../../utils/authStorage";
import PawGuardLogo from "../common/PawGuardLogo";

interface SidebarProps {
  collapsed?: boolean;
}

const renderIcon = (iconType: RoleMenuItem["iconType"]) => {
  switch (iconType) {
    case "dashboard":
      return <FaTachometerAlt />;
    case "users":
      return <FaUsers />;
    case "pets":
      return <FaPaw />;
    case "shelters":
      return <FaHome />;
    case "adoptions":
      return <FaHeart />;
    case "reports":
      return <FaChartBar />;
    case "settings":
      return <FaCog />;
    case "ambulance":
      return <FaAmbulance />;
    case "medical":
      return <FaStethoscope />;
    case "inventory":
      return <FaBoxes />;
    case "finance":
      return <FaCoins />;
    case "heart":
      return <FaHeart />;
    case "tasks":
      return <FaClipboardList />;
    case "audit":
      return <FaShieldAlt />;
    case "certificates":
      return <FaCertificate />;
    case "rescues":
      return <FaLifeRing />;
    case "fosters":
      return <FaHandHoldingHeart />;
    case "volunteers":
      return <FaUserFriends />;
    case "lostfound":
      return <FaSearchLocation />;
    case "vehicles":
      return <FaTruck />;
    case "notifications":
      return <FaBell />;
    default:
      return <FaTachometerAlt />;
  }
};

const Sidebar = ({ collapsed = false }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = getCurrentUserRole() || "super_admin";
  // When a Super Admin is viewing another role's dashboard, the sidebar renders
  // that role's own menus (authenticated role/session is never changed).
  const sidebarRole = getSidebarRole(currentRole, location.pathname);
  const { has, loading } = usePermissions();

  // For Super Admin, we know they have all permissions. Use a local check that
  // works immediately without waiting for PermissionContext to load from backend.
  // This prevents the sidebar from showing only "Dashboard" during initial load.
  const hasPermission = (permission: string): boolean => {
    if (sidebarRole === "super_admin") return true;
    // For other roles, use the context's has function.
    // If still loading, fall back to DEFAULT_ROLE_PERMISSIONS to avoid flicker.
    if (loading && sidebarRole) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[sidebarRole] || [];
      return defaults.includes(permission);
    }
    return has(permission);
  };

  // Enforce permission-based visibility: menus for modules the user is not
  // allowed to view are hidden immediately when permissions change.
  const menus = getMenusForRole(sidebarRole).filter((menu) => {
    const required = getMenuViewPermission(menu.path);
    return !required || hasPermission(required);
  });

  const navContainerRef = useRef<HTMLDivElement>(null);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearAuthData();
    notifyAuthChanged();
    navigate("/");
  };

  // Explicit active-state resolution based on the current page path.
  // Query strings / hashes are ignored (they never affect which menu is open).
  const isPathActive = (menuPath: string): boolean => {
    const current = location.pathname;

    // Dashboard links are role-specific (/dashboard/<role>). Keep them active
    // while on the generic /dashboard redirect and their own sub-paths only.
    if (menuPath.startsWith("/dashboard")) {
      if (current === "/dashboard") return true;
      return current === menuPath || current.startsWith(`${menuPath}/`);
    }

    if (current === menuPath) return true;
    return current.startsWith(`${menuPath}/`);
  };

  // Scroll active item into view when route changes
  useEffect(() => {
    if (!navContainerRef.current) return;
    const activeElement = navContainerRef.current.querySelector('[data-active="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [location.pathname, menus.length]);

  const sidebarWidth = collapsed ? "70px" : "260px";

  return (
    <aside
      style={{
        width: sidebarWidth,
        height: "100vh",
        background: "#0F172A",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "4px 0 25px rgba(15, 23, 42, 0.15)",
        overflowX: "hidden",
        overflowY: "hidden",
      }}
    >
      {/* Brand Header with Clean SVG Logo - Fixed at top */}
      <div
        style={{
          height: "64px",
          padding: collapsed ? "0 14px" : "0 22px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <PawGuardLogo size={34} badgeBg="#2563EB" iconColor="#FFFFFF" />
        {!collapsed && (
          <span
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            PawGuard
          </span>
        )}
      </div>

      {/* Role Permitted Navigation Items - Scrollable area */}
      <div
        ref={navContainerRef}
        style={{
          padding: collapsed ? "14px 8px" : "14px 14px",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
        }}
      >
        {menus.map((menu) => {
          const active = isPathActive(menu.path);
          return (
            <NavLink
              key={menu.name}
              to={menu.path}
              title={menu.name}
              data-active={active}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: collapsed ? "12px" : "10px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                marginBottom: "4px",
                borderRadius: "10px",
                textDecoration: "none",
                color: active ? "#FFFFFF" : "#94A3B8",
                fontSize: "14px",
                fontWeight: active ? 600 : 500,
                background: active ? "#2563EB" : "transparent",
                boxShadow: active ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget;
                if (!active) {
                  target.style.background = "rgba(255, 255, 255, 0.06)";
                  target.style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget;
                if (!active) {
                  target.style.background = "transparent";
                  target.style.color = "#94A3B8";
                }
              }}
            >
              <span style={{ fontSize: "17px", display: "flex", alignItems: "center", flexShrink: 0 }}>
                {renderIcon(menu.iconType)}
              </span>
              {!collapsed && (
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {menu.name}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Logout Footer - Fixed at bottom */}
      <div
        style={{
          padding: collapsed ? "14px 8px" : "14px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          flexShrink: 0,
        }}
      >
        <a
          href="/"
          onClick={handleLogout}
          title="Logout"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: collapsed ? "12px" : "10px 14px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: "10px",
            textDecoration: "none",
            color: "#F87171",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            background: "rgba(239, 68, 68, 0.08)",
            transition: "all 0.15s ease",
          }}
        >
          <FaSignOutAlt size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;