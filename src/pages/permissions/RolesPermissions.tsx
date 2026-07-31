import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaUserShield, FaLock, FaUsers, FaPlusCircle } from "react-icons/fa";

const RolesPermissions = () => {
  const stats = [
    { title: "System Roles", value: "15 Active Roles", trend: "Configured", color: "#2563EB", icon: <FaUserShield /> },
    { title: "Super Admins", value: "3 Users", trend: "Full Privileges", color: "#EF4444", icon: <FaLock /> },
    { title: "Total Users Enrolled", value: "1,248 Users", trend: "+28 this week", color: "#10B981", icon: <FaUsers /> },
  ];

  const columns = [
    { key: "roleName", title: "Role Identifier" },
    { key: "category", title: "Category" },
    { key: "userCount", title: "Assigned Users" },
    { key: "accessLevel", title: "Access Scope" },
    { key: "status", title: "Policy Status" },
  ];

  const data = [
    { roleName: "Super Administrator", category: "System Governance", userCount: "3 Admins", accessLevel: "Full System Access (24 Modules)", status: "Active" },
    { roleName: "Rescue Centre Admin", category: "Operations", userCount: "14 Users", accessLevel: "Shelter & Rescue Modules (9 Modules)", status: "Active" },
    { roleName: "Veterinarian", category: "Medical Clinical", userCount: "28 Vets", accessLevel: "Medical & Patient Care (8 Modules)", status: "Active" },
    { roleName: "Shelter Manager", category: "Facility Management", userCount: "24 Managers", accessLevel: "Shelter Cages & Staff (6 Modules)", status: "Active" },
    { roleName: "Adoption Coordinator", category: "Adoptions", userCount: "12 Coordinators", accessLevel: "Adoptions & Applicants (4 Modules)", status: "Active" },
    { roleName: "Volunteer", category: "Field Volunteer", userCount: "850 Volunteers", accessLevel: "Assigned Tasks Only (2 Modules)", status: "Active" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Roles & Permission Governance</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Super Administrator Security Suite: configure access control policies, manage role definitions, and assign module permissions.
        </p>
      </div>

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
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
          System Role Permissions Matrix
        </h3>
        <DataTable columns={columns} data={data} onView={(r) => alert(`Role: ${r.roleName}`)} onEdit={(r) => alert(`Edit Role: ${r.roleName}`)} />
      </div>
    </div>
  );
};

export default RolesPermissions;
