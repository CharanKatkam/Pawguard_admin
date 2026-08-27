import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable, { type Column } from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHeart, FaClipboardCheck, FaUserCheck, FaFileContract } from "react-icons/fa";
import adoptionService from "../../../services/adoptionService";
import { petService } from "../../../services/petService";
import { useDataSync } from "../../../utils/dataSync";

const StatusBadge = ({ status }: { status: string }) => {
  const s = String(status || "").toLowerCase();
  let bg = "#EFF6FF";
  let color = "#2563EB";
  let label = s.toUpperCase();

  if (s === "submitted") {
    bg = "#EFF6FF";
    color = "#2563EB";
    label = "Submitted";
  } else if (s === "screening") {
    bg = "#F3E8FF";
    color = "#7E22CE";
    label = "Screening";
  } else if (s === "interview") {
    bg = "#FEF3C7";
    color = "#D97706";
    label = "Interview";
  } else if (s === "home_check") {
    bg = "#E0E7FF";
    color = "#4338CA";
    label = "Home Visit";
  } else if (s === "approved") {
    bg = "#D1FAE5";
    color = "#047857";
    label = "Approved";
  } else if (s === "completed") {
    bg = "#DCFCE7";
    color = "#15803D";
    label = "Completed";
  } else if (s === "rejected") {
    bg = "#FEE2E2";
    color = "#B91C1C";
    label = "Rejected";
  } else if (s === "vetting") {
    bg = "#E0F2FE";
    color = "#0369A1";
    label = "Vetting";
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
};

const AdoptionCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [adoptions, setAdoptions] = useState<any[]>([]);
  const [adoptableDogsCount, setAdoptableDogsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<"all" | "approve" | "schedule" | "review">("all");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [adoptionsRes, dogsRes] = await Promise.all([
        adoptionService.getAdoptions(),
        petService.getAllDogs(),
      ]);

      const adoptionsList = Array.isArray(adoptionsRes?.data)
        ? adoptionsRes.data
        : Array.isArray(adoptionsRes)
        ? adoptionsRes
        : [];
      setAdoptions(adoptionsList);

      const dogsList = Array.isArray(dogsRes?.data)
        ? dogsRes.data
        : Array.isArray(dogsRes)
        ? dogsRes
        : [];
      const adoptableCount = dogsList.filter((d: any) => d.is_adoptable).length;
      setAdoptableDogsCount(adoptableCount);
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

  const completedCount = adoptions.filter((a) => String(a.status).toLowerCase() === "completed").length;
  const pendingCount = adoptions.filter((a) => ["submitted", "vetting", "screening", "interview", "home_check"].includes(String(a.status).toLowerCase())).length;
  const homeVisitsCount = adoptions.filter((a) => a.home_inspection_scheduled_at || String(a.status).toLowerCase() === "home_check").length;

  const stats = [
    { title: "Adoptions Completed", value: loading ? "..." : String(completedCount), trend: "YoY Progress", color: "#10B981", icon: <FaHeart />, onClick: () => navigate("/adoptions") },
    { title: "Pending Applications", value: loading ? "..." : String(pendingCount), trend: "Queue", color: "#F59E0B", icon: <FaClipboardCheck />, onClick: () => navigate("/adoptions") },
    { title: "Home Visits Scheduled", value: loading ? "..." : String(homeVisitsCount), trend: "Active Visits", color: "#2563EB", icon: <FaUserCheck />, onClick: () => navigate("/adoptions") },
    { title: "Adoptable Dogs", value: loading ? "..." : String(adoptableDogsCount), trend: "Ready", color: "#6366F1", icon: <FaFileContract />, onClick: () => navigate("/pets") },
  ];

  const columns: Column<any>[] = [
    { key: "appId", title: "App ID" },
    { key: "applicant", title: "Applicant Name" },
    { key: "pet", title: "Pet Interested" },
    { key: "homeVisit", title: "Home Visit Verification" },
    { key: "date", title: "Applied Date" },
    { key: "status", title: "Decision Status", render: (val: string) => <StatusBadge status={val} /> },
  ];

  const filteredAdoptions = adoptions.filter((app: any) => {
    const status = String(app.status || "").toLowerCase();
    if (actionFilter === "approve") {
      return status === "approved";
    }
    if (actionFilter === "schedule") {
      return status === "home_check" || status === "interview";
    }
    if (actionFilter === "review") {
      return status === "submitted" || status === "vetting" || status === "screening";
    }
    return true;
  });

  const formattedData = filteredAdoptions.map((app: any) => ({
    appId: String(app.id || app.applicationId || ""),
    applicant: String(app.applicantName || "—"),
    pet: String(app.petName || "—"),
    homeVisit: app.home_inspection_scheduled_at
      ? `Scheduled: ${new Date(app.home_inspection_scheduled_at).toLocaleDateString()}`
      : "Not Scheduled",
    date: app.date || app.created_at || "-",
    status: app.status || "submitted",
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
        <QuickActionCard
          icon={<FaHeart />}
          title="Approve Adoption"
          subtitle={actionFilter === "approve" ? "★ FILTER ACTIVE (Click to Clear)" : "Finalize legal paperwork"}
          color={actionFilter === "approve" ? "#EF4444" : "#10B981"}
          onClick={() => setActionFilter(actionFilter === "approve" ? "all" : "approve")}
        />
        <QuickActionCard
          icon={<FaUserCheck />}
          title="Schedule Home Verification"
          subtitle={actionFilter === "schedule" ? "★ FILTER ACTIVE (Click to Clear)" : "Assign field coordinator"}
          color={actionFilter === "schedule" ? "#EF4444" : "#2563EB"}
          onClick={() => setActionFilter(actionFilter === "schedule" ? "all" : "schedule")}
        />
        <QuickActionCard
          icon={<FaClipboardCheck />}
          title="Review Applicants"
          subtitle={actionFilter === "review" ? "★ FILTER ACTIVE (Click to Clear)" : "Inspect questionnaire"}
          color={actionFilter === "review" ? "#EF4444" : "#F59E0B"}
          onClick={() => setActionFilter(actionFilter === "review" ? "all" : "review")}
        />
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

