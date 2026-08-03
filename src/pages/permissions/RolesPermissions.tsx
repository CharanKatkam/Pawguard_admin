import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaUserShield, FaLock, FaUsers, FaPlusCircle } from "react-icons/fa";
import userService from "../../services/userService";

const RolesPermissions = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesRes, permsRes] = await Promise.allSettled([
        userService.getRoles(),
        userService.getPermissions(),
      ]);

      if (rolesRes.status === "fulfilled") {
        const rawRoles = Array.isArray(rolesRes.value)
          ? rolesRes.value
          : Array.isArray(rolesRes.value?.data)
          ? rolesRes.value.data
          : [];

        const formatted = rawRoles.map((r: any) => ({
          roleName: r.name || r.roleName || r.title || "-",
          category: r.category || "System Governance",
          userCount: r.userCount !== undefined ? `${r.userCount} Users` : "-",
          accessLevel: Array.isArray(r.permissions) ? `${r.permissions.length} Permissions` : r.accessLevel || "Configured Scope",
          status: r.is_active !== false ? "Active" : "Inactive",
        }));
        setRoles(formatted);
      } else {
        throw rolesRes.reason;
      }

      if (permsRes.status === "fulfilled") {
        const rawPerms = Array.isArray(permsRes.value)
          ? permsRes.value
          : Array.isArray(permsRes.value?.data)
          ? permsRes.value.data
          : [];
        setPermissions(rawPerms);
      }
    } catch (err: any) {
      console.error("Roles and Permissions Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load roles and permissions matrix. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { title: "System Roles", value: loading ? "..." : `${roles.length} Roles`, trend: "Configured Roles", color: "#2563EB", icon: <FaUserShield /> },
    { title: "Total Permissions", value: loading ? "..." : `${permissions.length} Permissions`, trend: "System Scope", color: "#EF4444", icon: <FaLock /> },
    { title: "Active Governance", value: loading ? "..." : `${roles.filter((r) => r.status === "Active").length} Active`, trend: "Policy Enforced", color: "#10B981", icon: <FaUsers /> },
  ];

  const columns = [
    { key: "roleName", title: "Role Identifier" },
    { key: "category", title: "Category" },
    { key: "userCount", title: "Assigned Users" },
    { key: "accessLevel", title: "Access Scope" },
    { key: "status", title: "Policy Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Roles & Permission Governance</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Super Administrator Security Suite: configure access control policies, manage role definitions, and assign module permissions.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlusCircle />} title="Create Custom Role" subtitle="Define new permission set" color="#2563EB" onClick={() => alert("Create Role modal")} />
        <QuickActionCard icon={<FaUserShield />} title="Audit Role Matrix" subtitle="Review active permissions" color="#10B981" onClick={() => alert("Audit Role Matrix")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            System Role Permissions Matrix
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading roles...</span>}
        </div>
        <DataTable columns={columns} data={roles} onView={(r) => alert(`Role: ${r.roleName}`)} onEdit={(r) => alert(`Edit Role: ${r.roleName}`)} />
      </div>
    </div>
  );
};

export default RolesPermissions;

