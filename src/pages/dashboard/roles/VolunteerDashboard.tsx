import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaClipboardList, FaClock, FaCalendarCheck, FaHeart } from "react-icons/fa";

const VolunteerDashboard = () => {
  const stats = [
    { title: "Assigned Tasks", value: "3 Tasks", trend: "This week", color: "#2563EB", icon: <FaClipboardList /> },
    { title: "Volunteer Hours", value: "48 Hours", trend: "Total Contributed", color: "#10B981", icon: <FaClock /> },
    { title: "Upcoming Events", value: "2 Events", trend: "Active", color: "#6366F1", icon: <FaCalendarCheck /> },
  ];

  const columns = [
    { key: "taskId", title: "Task ID" },
    { key: "title", title: "Activity / Task Title" },
    { key: "location", title: "Location" },
    { key: "schedule", title: "Schedule" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { taskId: "TSK-101", title: "Shelter Dog Walking & Socialization", location: "North Haven Sanctuary", schedule: "Saturday 10:00 - 13:00", status: "Assigned" },
    { taskId: "TSK-102", title: "Adoption Event Check-in Support", location: "Community Hall", schedule: "Sunday 11:00 - 15:00", status: "Confirmed" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Volunteer Portal & Shift Schedule</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Personal volunteer portal: view assigned shelter tasks, track shift hours, and sign up for community rescue events.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaClock />} title="Log Shift Hours" subtitle="Submit volunteer hours" color="#10B981" onClick={() => alert("Log Shift Hours modal")} />
        <QuickActionCard icon={<FaHeart />} title="View Community Events" subtitle="Browse upcoming events" color="#2563EB" onClick={() => alert("Events modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          My Shift Schedule & Task Assignments
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default VolunteerDashboard;
