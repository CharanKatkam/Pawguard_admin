import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaUsers, FaCalendarAlt, FaClipboardList, FaUserCheck } from "react-icons/fa";

const VolunteerCoordinatorDashboard = () => {
  const stats = [
    { title: "Registered Volunteers", value: "850 Users", trend: "+28 this week", color: "#2563EB", icon: <FaUsers /> },
    { title: "Active Shift Coverage", value: "92%", trend: "Optimal", color: "#10B981", icon: <FaUserCheck /> },
    { title: "Community Events", value: "4 Upcoming", trend: "This month", color: "#F59E0B", icon: <FaCalendarAlt /> },
  ];

  const columns = [
    { key: "volunteerId", title: "Vol ID" },
    { key: "name", title: "Volunteer Name" },
    { key: "assignedTask", title: "Assigned Event / Task" },
    { key: "shiftTime", title: "Shift Schedule" },
    { key: "attendance", title: "Attendance" },
  ];

  const data = [
    { volunteerId: "VOL-501", name: "Emily Watson", assignedTask: "Adoption Drive Support", shiftTime: "Sat 09:00 - 13:00", attendance: "Confirmed" },
    { volunteerId: "VOL-502", name: "Chris Hemsworth", assignedTask: "Shelter Dog Walking", shiftTime: "Sun 10:00 - 14:00", attendance: "Confirmed" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Volunteer Network Console</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Volunteer coordination suite: schedule shift rosters, track event attendance, assign shelter duties, and manage volunteers.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaUsers />} title="Onboard Volunteer" subtitle="Register new volunteer" color="#2563EB" onClick={() => alert("Onboard Volunteer modal")} />
        <QuickActionCard icon={<FaCalendarAlt />} title="Schedule Shift Roster" subtitle="Assign shelter tasks" color="#10B981" onClick={() => alert("Schedule Roster modal")} />
        <QuickActionCard icon={<FaClipboardList />} title="Log Attendance" subtitle="Verify volunteer hours" color="#6366F1" onClick={() => alert("Log Attendance modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          Volunteer Shift Schedule & Attendance Stream
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default VolunteerCoordinatorDashboard;
