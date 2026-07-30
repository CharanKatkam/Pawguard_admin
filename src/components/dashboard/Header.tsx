import { FaBell, FaUserCircle } from "react-icons/fa";

const Header = () => {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        height: "75px",
        background: "#FFFFFF",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
        borderBottom: "1px solid #E5E7EB",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Left */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "28px",
            color: "#0F172A",
            fontWeight: "700",
          }}
        >
          Dashboard
        </h2>

        <p
          style={{
            margin: "4px 0 0",
            color: "#64748B",
            fontSize: "14px",
          }}
        >
          Welcome back, Admin 👋
        </p>
      </div>

      {/* Right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "25px",
        }}
      >
        {/* Notification */}
        <div
          style={{
            position: "relative",
            cursor: "pointer",
          }}
        >
          <FaBell
            size={22}
            color="#475569"
          />

          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#EF4444",
            }}
          />
        </div>

        {/* Admin Profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
        >
          <FaUserCircle
            size={42}
            color="#2563EB"
          />

          <div>
            <h4
              style={{
                margin: 0,
                color: "#0F172A",
                fontSize: "16px",
              }}
            >
              Admin
            </h4>

            <small
              style={{
                color: "#64748B",
              }}
            >
              Super Administrator
            </small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;