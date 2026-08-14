import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaUsers, FaCalendarAlt, FaClipboardList, FaUserCheck } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const VolunteerCoordinatorDashboard = () => {
  const navigate = useNavigate();
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
        "Failed to load volunteer coordinator metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useDataSync(fetchDashboard);

  const shiftsList = Array.isArray(dashboardData?.shifts)
    ? dashboardData.shifts
    : Array.isArray(dashboardData?.volunteers)
    ? dashboardData.volunteers
    : Array.isArray(dashboardData)
    ? dashboardData
    : [];

  const stats = [
    { title: "Registered Volunteers", value: loading ? "..." : String(dashboardData?.registered_volunteers ?? dashboardData?.totalVolunteers ?? shiftsList.length), trend: "Volunteers", color: "#2563EB", icon: <FaUsers />, onClick: () => navigate("/volunteers") },
    { title: "Active Shift Coverage", value: loading ? "..." : `${dashboardData?.shift_coverage ?? dashboardData?.shiftCoverage ?? 100}%`, trend: "Coverage", color: "#10B981", icon: <FaUserCheck />, onClick: () => navigate("/volunteers") },
    { title: "Community Events", value: loading ? "..." : String(dashboardData?.upcoming_events ?? dashboardData?.upcomingEvents ?? "0"), trend: "Upcoming", color: "#F59E0B", icon: <FaCalendarAlt />, onClick: () => navigate("/reports") },
  ];

  const columns = [
    { key: "volunteerId", title: "Vol ID" },
    { key: "name", title: "Volunteer Name" },
    { key: "assignedTask", title: "Assigned Event / Task" },
    { key: "shiftTime", title: "Shift Schedule" },
    { key: "attendance", title: "Attendance" },
  ];

  const formattedData = shiftsList.map((item: any) => ({
    volunteerId: item.id ?? item.volunteer_id ?? "",
    name: item.volunteer_name ?? item.name ?? "",
    assignedTask: item.task ?? item.title ?? item.assignedTask ?? "",
    shiftTime: item.schedule ?? item.time ?? item.shiftTime ?? "",
    attendance: item.attendance ?? item.status ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Volunteer Network Console</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Volunteer coordination suite: schedule shift rosters, track event attendance, assign shelter duties, and manage volunteers.
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
        <QuickActionCard icon={<FaUsers />} title="Onboard Volunteer" subtitle="Register new volunteer" color="#2563EB" onClick={() => navigate("/users")} />
        <QuickActionCard icon={<FaCalendarAlt />} title="Schedule Shift Roster" subtitle="Assign shelter tasks" color="#10B981" onClick={() => navigate("/volunteers")} />
        <QuickActionCard icon={<FaClipboardList />} title="Log Attendance" subtitle="Verify volunteer hours" color="#6366F1" onClick={() => navigate("/volunteers")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Volunteer Shift Schedule & Attendance Stream
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading volunteer data...</span>}
        </div>
        <DataTable columns={columns} data={formattedData} />
      </div>
    </div>
  );
};

export default VolunteerCoordinatorDashboard;

