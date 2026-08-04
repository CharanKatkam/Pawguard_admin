import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHeart, FaClipboardCheck, FaUserCheck, FaFileContract } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const AdoptionCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getAdoptionDashboard();
      const data = res?.data || res || {};
      setDashboardData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load adoption coordinator metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useDataSync(fetchDashboard);

  const applicationsList = Array.isArray(dashboardData?.applications)
    ? dashboardData.applications
    : Array.isArray(dashboardData?.queue)
    ? dashboardData.queue
    : Array.isArray(dashboardData)
    ? dashboardData
    : [];

  const stats = [
    { title: "Adoptions Completed", value: loading ? "..." : String(dashboardData?.adoptions_completed ?? dashboardData?.completedAdoptions ?? "0"), trend: "YoY Progress", color: "#10B981", icon: <FaHeart /> },
    { title: "Pending Applications", value: loading ? "..." : String(dashboardData?.pending_applications ?? dashboardData?.pendingApplications ?? applicationsList.length), trend: "Queue", color: "#F59E0B", icon: <FaClipboardCheck /> },
    { title: "Home Visits Scheduled", value: loading ? "..." : String(dashboardData?.home_visits ?? dashboardData?.homeVisits ?? "0"), trend: "Active Visits", color: "#2563EB", icon: <FaUserCheck /> },
    { title: "Adoptable Dogs", value: loading ? "..." : String(dashboardData?.adoptable_dogs ?? dashboardData?.adoptableDogs ?? "0"), trend: "Ready", color: "#6366F1", icon: <FaFileContract /> },
  ];

  const columns = [
    { key: "appId", title: "App ID" },
    { key: "applicant", title: "Applicant Name" },
    { key: "pet", title: "Pet Interested" },
    { key: "homeVisit", title: "Home Visit Verification" },
    { key: "date", title: "Applied Date" },
    { key: "status", title: "Decision Status" },
  ];

  const formattedData = applicationsList.map((app: any) => ({
    appId: app.id ?? app.application_id ?? "",
    applicant: app.applicant_name ?? app.applicant ?? app.user ?? "",
    pet: app.dog_name ?? app.dog ?? app.pet ?? "",
    homeVisit: app.home_visit_status ?? app.homeVisit ?? "",
    date: app.created_at ?? app.date ?? "",
    status: app.status ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Adoption Operations Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Adoption management: review applications, conduct home verification visits, hold interviews, and issue adoption clearance.
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
        <QuickActionCard icon={<FaHeart />} title="Approve Adoption" subtitle="Finalize legal paperwork" color="#10B981" onClick={() => navigate("/adoptions")} />
        <QuickActionCard icon={<FaUserCheck />} title="Schedule Home Verification" subtitle="Assign field coordinator" color="#2563EB" onClick={() => navigate("/adoptions")} />
        <QuickActionCard icon={<FaClipboardCheck />} title="Review Applicants" subtitle="Inspect questionnaire" color="#F59E0B" onClick={() => navigate("/adoptions")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Adoption Applications Queue & Verification Progress
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading applications...</span>}
        </div>
        <DataTable columns={columns} data={formattedData} />
      </div>
    </div>
  );
};

export default AdoptionCoordinatorDashboard;

