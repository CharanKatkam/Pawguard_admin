import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import {
  FaUserPlus,
  FaUsers,
  FaUserCheck,
  FaUserShield,
} from "react-icons/fa";
import userService from "../../services/userService";

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUsers();
      const userList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formattedUsers = userList.map((user: any) => ({
        id: user.id || user.user_id || "-",
        name: user.full_name || user.name || user.username || "-",
        email: user.email || "-",
        role: Array.isArray(user.roles) ? user.roles.join(", ") : user.role || "-",
        department: user.department || user.facility || "-",
        status: user.is_active !== undefined ? (user.is_active ? "Active" : "Inactive") : (user.status || "Active"),
      }));

      setUsers(formattedUsers);
    } catch (err: any) {
      console.error("Users Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load registered users. Please check permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: "Total Registered Users",
      value: loading ? "..." : `${users.length} Users`,
      trend: "Organization Accounts",
      color: "#2563EB",
      icon: <FaUsers />,
    },
    {
      title: "Active Personnel",
      value: loading
        ? "..."
        : `${users.filter((u) => u.status === "Active").length} Active`,
      trend: "Current Workforce",
      color: "#10B981",
      icon: <FaUserCheck />,
    },
    {
      title: "Administrators",
      value: loading
        ? "..."
        : `${
            users.filter((u) =>
              String(u.role).toLowerCase().includes("admin")
            ).length
          } Admins`,
      trend: "System Access",
      color: "#EF4444",
      icon: <FaUserShield />,
    },
  ];

  const columns = [
    { key: "id", title: "User ID" },
    { key: "name", title: "Full Name" },
    { key: "email", title: "Email Address" },
    { key: "role", title: "Assigned Role" },
    { key: "department", title: "Department / Facility" },
    { key: "status", title: "Status" },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
          }}
        >
          User Management & Personnel
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94A3B8",
            fontSize: "14px",
          }}
        >
          Manage user accounts, assign role permissions, onboard rescue
          staff, veterinarians, coordinators and volunteers.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <QuickActionCard
          icon={<FaUserPlus />}
          title="Provision User Account"
          subtitle="Onboard new staff member"
          color="#2563EB"
          onClick={() => alert("Provision User")}
        />

        <QuickActionCard
          icon={<FaUserShield />}
          title="Manage Role Access"
          subtitle="Update user permissions"
          color="#6366F1"
          onClick={() => alert("Manage Role Access")}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div
        className="soft-card"
        style={{
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#0F172A",
            }}
          >
            Registered Organization Accounts
          </h3>

          {loading && (
            <span
              style={{
                fontSize: "13px",
                color: "#2563EB",
                fontWeight: 600,
              }}
            >
              Loading users...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={users}
          onView={(row) => alert(`User: ${row.name}`)}
          onEdit={(row) => alert(`Edit User: ${row.name}`)}
          onDelete={(row) => alert(`Delete User: ${row.name}`)}
        />
      </div>
    </div>
  );
};

export default Users;