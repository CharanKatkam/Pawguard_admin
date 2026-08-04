import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { useToast } from "../../../context/ToastContext";
import { FaClipboardList, FaClock, FaCalendarCheck, FaHeart } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const VolunteerDashboard = () => {
  const { addToast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getVolunteerDashboard();
      const data = res?.data || res || {};
      setDashboardData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load volunteer shift data. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useDataSync(fetchDashboard);

  const tasksList = Array.isArray(dashboardData?.tasks)
    ? dashboardData.tasks
    : Array.isArray(dashboardData?.shifts)
    ? dashboardData.shifts
    : Array.isArray(dashboardData)
    ? dashboardData
    : [];

  const stats = [
    { title: "Assigned Tasks", value: loading ? "..." : String(dashboardData?.assigned_tasks ?? dashboardData?.assignedTasks ?? tasksList.length), trend: "Tasks", color: "#2563EB", icon: <FaClipboardList /> },
    { title: "Volunteer Hours", value: loading ? "..." : `${dashboardData?.volunteer_hours ?? dashboardData?.volunteerHours ?? 0} Hours`, trend: "Contributed", color: "#10B981", icon: <FaClock /> },
    { title: "Upcoming Events", value: loading ? "..." : String(dashboardData?.upcoming_events ?? dashboardData?.upcomingEvents ?? "0"), trend: "Events", color: "#6366F1", icon: <FaCalendarCheck /> },
  ];

  const columns = [
    { key: "taskId", title: "Task ID" },
    { key: "title", title: "Activity / Task Title" },
    { key: "location", title: "Location" },
    { key: "schedule", title: "Schedule" },
    { key: "status", title: "Status" },
  ];

  const formattedData = tasksList.map((t: any) => ({
    taskId: t.id ?? t.task_id ?? "",
    title: t.title ?? t.activity ?? "",
    location: t.location ?? t.facility ?? "",
    schedule: t.schedule ?? t.time ?? "",
    status: t.status ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Volunteer Portal & Shift Schedule</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Personal volunteer portal: view assigned shelter tasks, track shift hours, and sign up for community rescue events.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaClock />} title="Log Shift Hours" subtitle="Submit volunteer hours" color="#10B981" onClick={() => addToast("Open the Volunteers module to log shift hours", "info")} />
        <QuickActionCard icon={<FaHeart />} title="View Community Events" subtitle="Browse upcoming events" color="#2563EB" onClick={() => addToast("Open the Volunteers module to view community events", "info")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            My Shift Schedule & Task Assignments
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading shift schedule...</span>}
        </div>
        <DataTable columns={columns} data={formattedData} />
      </div>
    </div>
  );
};

export default VolunteerDashboard;

