import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHome, FaPaw, FaUserPlus, FaCalendarCheck } from "react-icons/fa";

const FosterCoordinatorDashboard = () => {
  const stats = [
    { title: "Active Foster Homes", value: "42 Families", trend: "+6 this month", color: "#2563EB", icon: <FaHome /> },
    { title: "Pets in Foster Care", value: "28 Dogs", trend: "Temporary Care", color: "#10B981", icon: <FaPaw /> },
    { title: "Foster Requests Queue", value: "14 Requests", trend: "Pending Match", color: "#F59E0B", icon: <FaUserPlus /> },
    { title: "Follow-Up Inspections", value: "8 Scheduled", trend: "Active", color: "#6366F1", icon: <FaCalendarCheck /> },
  ];

  const columns = [
    { key: "fosterId", title: "Foster ID" },
    { key: "family", title: "Foster Family Name" },
    { key: "pet", title: "Fostered Pet" },
    { key: "duration", title: "Care Duration" },
    { key: "followUp", title: "Next Follow-Up" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { fosterId: "FST-101", family: "Mark & Sarah Stevens", pet: "Daisy (DOG-420)", duration: "2 Months", followUp: "2026-08-05", status: "Active" },
    { fosterId: "FST-102", family: "Laura Palmer", pet: "Milo (DOG-435)", duration: "1 Month", followUp: "2026-08-02", status: "Active" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Foster Management Station</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Foster care administration: onboard foster families, match animals with temporary homes, and schedule care follow-ups.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaUserPlus />} title="Onboard Foster Family" subtitle="Register new home" color="#2563EB" onClick={() => alert("Onboard Foster modal")} />
        <QuickActionCard icon={<FaPaw />} title="Assign Pet to Foster" subtitle="Match dog with family" color="#10B981" onClick={() => alert("Assign Foster modal")} />
        <QuickActionCard icon={<FaCalendarCheck />} title="Schedule Follow-up" subtitle="Book home inspection" color="#6366F1" onClick={() => alert("Schedule Inspection modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          Active Foster Placements & Follow-up Schedule
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default FosterCoordinatorDashboard;
