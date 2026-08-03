import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";

const AdminLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sidebarWidth = isSidebarCollapsed ? 70 : 260;

  return (
    <div
      style={{
        background: "#F8FAFC",
        minHeight: "100vh",
        display: "flex",
        width: "100%",
      }}
    >
      {/* Fixed Sidebar */}
      <Sidebar collapsed={isSidebarCollapsed} />

      {/* Main Container */}
      <div
        style={{
          marginLeft: `${sidebarWidth}px`,
          minHeight: "100vh",
          width: `calc(100% - ${sidebarWidth}px)`,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Compact Header */}
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Dynamic Page Content */}
        <main
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
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