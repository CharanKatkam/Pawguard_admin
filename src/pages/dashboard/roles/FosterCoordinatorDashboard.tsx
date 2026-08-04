import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHome, FaPaw, FaUserPlus, FaCalendarCheck } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const FosterCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getFosterDashboard();
      const data = res?.data || res || {};
      setDashboardData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load foster coordinator metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useDataSync(fetchDashboard);

  const placementsList = Array.isArray(dashboardData?.placements)
    ? dashboardData.placements
    : Array.isArray(dashboardData?.fosters)
    ? dashboardData.fosters
    : Array.isArray(dashboardData)
    ? dashboardData
    : [];

  const stats = [
    { title: "Active Foster Homes", value: loading ? "..." : String(dashboardData?.active_homes ?? dashboardData?.activeHomes ?? "0"), trend: "Active Homes", color: "#2563EB", icon: <FaHome /> },
    { title: "Pets in Foster Care", value: loading ? "..." : String(dashboardData?.pets_in_care ?? dashboardData?.petsInCare ?? placementsList.length), trend: "Temporary Care", color: "#10B981", icon: <FaPaw /> },
    { title: "Foster Requests Queue", value: loading ? "..." : String(dashboardData?.pending_requests ?? dashboardData?.pendingRequests ?? "0"), trend: "Pending Match", color: "#F59E0B", icon: <FaUserPlus /> },
    { title: "Follow-Up Inspections", value: loading ? "..." : String(dashboardData?.follow_ups ?? dashboardData?.followUps ?? "0"), trend: "Scheduled", color: "#6366F1", icon: <FaCalendarCheck /> },
  ];

  const columns = [
    { key: "fosterId", title: "Foster ID" },
    { key: "family", title: "Foster Family Name" },
    { key: "pet", title: "Fostered Pet" },
    { key: "duration", title: "Care Duration" },
    { key: "followUp", title: "Next Follow-Up" },
    { key: "status", title: "Status" },
  ];

  const formattedData = placementsList.map((item: any) => ({
    fosterId: item.id ?? item.foster_id ?? "",
    family: item.foster_name ?? item.family ?? item.user_name ?? "",
    pet: item.dog_name ?? item.pet ?? "",
    duration: item.duration ?? "",
    followUp: item.next_follow_up ?? item.followUp ?? "",
    status: item.status ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Foster Management Station</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Foster care administration: onboard foster families, match animals with temporary homes, and schedule care follow-ups.
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
        <QuickActionCard icon={<FaUserPlus />} title="Onboard Foster Family" subtitle="Register new home" color="#2563EB" onClick={() => navigate("/users")} />
        <QuickActionCard icon={<FaPaw />} title="Assign Pet to Foster" subtitle="Match dog with family" color="#10B981" onClick={() => navigate("/pets")} />
        <QuickActionCard icon={<FaCalendarCheck />} title="Schedule Follow-up" subtitle="Book home inspection" color="#6366F1" onClick={() => navigate("/fosters")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Active Foster Placements & Follow-up Schedule
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading foster data...</span>}
        </div>
        <DataTable columns={columns} data={formattedData} />
      </div>
    </div>
  );
};

export default FosterCoordinatorDashboard;

