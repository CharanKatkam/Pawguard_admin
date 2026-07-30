import {
  FaTachometerAlt,
  FaUsers,
  FaPaw,
  FaHome,
  FaHeart,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const menus = [
    { name: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt /> },
    { name: "Users", path: "/users", icon: <FaUsers /> },
    { name: "Pets", path: "/pets", icon: <FaPaw /> },
    { name: "Shelters", path: "/shelters", icon: <FaHome /> },
    { name: "Adoptions", path: "/adoptions", icon: <FaHeart /> },
    { name: "Reports", path: "/reports", icon: <FaChartBar /> },
    { name: "Settings", path: "/settings", icon: <FaCog /> },
  ];

  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        background: "#0F172A",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",

        /* Fixed Sidebar */
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,

        overflowY: "auto",
      }}
    >
      <div>
        {/* Logo */}
        <div
          style={{
            padding: "28px 30px",
            fontSize: "34px",
            fontWeight: "700",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          🐾 PawGuard
        </div>

        {/* Menu */}
        <div style={{ padding: "20px" }}>
          {menus.map((menu) => (
            <NavLink
              key={menu.name}
              to={menu.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "15px",
                padding: "15px 18px",
                marginBottom: "12px",
                borderRadius: "12px",
                textDecoration: "none",
                color: "#fff",
                fontSize: "18px",
                fontWeight: 500,
                background: isActive ? "#2563EB" : "transparent",
                transition: "all .3s ease",
              })}
            >
              <span style={{ fontSize: "20px" }}>{menu.icon}</span>
              {menu.name}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div
        style={{
          padding: "20px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <NavLink
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            padding: "15px 18px",
            borderRadius: "12px",
            textDecoration: "none",
            color: "#F87171",
            fontSize: "18px",
            fontWeight: 500,
          }}
        >
          <FaSignOutAlt />
          Logout
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;