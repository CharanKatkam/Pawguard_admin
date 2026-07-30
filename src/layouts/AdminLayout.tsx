import { Outlet } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import Header from "../components/dashboard/Header";

const SIDEBAR_WIDTH = 260;

const AdminLayout = () => {
  return (
    <div
      style={{
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        style={{
          marginLeft: `${SIDEBAR_WIDTH}px`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            padding: "30px",
            overflowY: "auto",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;