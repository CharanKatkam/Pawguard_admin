import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHeart, FaClipboardCheck, FaUserCheck, FaFileContract } from "react-icons/fa";

const AdoptionCoordinatorDashboard = () => {
  const stats = [
    { title: "Adoptions Completed", value: "186 Pets", trend: "+18% YoY", color: "#10B981", icon: <FaHeart /> },
    { title: "Pending Applications", value: "32 Queue", trend: "5 Priority", color: "#F59E0B", icon: <FaClipboardCheck /> },
    { title: "Home Visits Scheduled", value: "12 Visits", trend: "Active", color: "#2563EB", icon: <FaUserCheck /> },
    { title: "Adoptable Dogs", value: "124 Ready", trend: "High Interest", color: "#6366F1", icon: <FaFileContract /> },
  ];

  const columns = [
    { key: "appId", title: "App ID" },
    { key: "applicant", title: "Applicant Name" },
    { key: "pet", title: "Pet Interested" },
    { key: "homeVisit", title: "Home Visit Verification" },
    { key: "date", title: "Applied Date" },
    { key: "status", title: "Decision Status" },
  ];

  const data = [
    { appId: "ADP-301", applicant: "Emily Clark", pet: "Bella (DOG-415)", homeVisit: "Approved", date: "2026-07-28", status: "Approved" },
    { appId: "ADP-302", applicant: "Michael Scott", pet: "Daisy (DOG-420)", homeVisit: "Scheduled 08/02", date: "2026-07-27", status: "In Review" },
    { appId: "ADP-303", applicant: "Jessica Taylor", pet: "Rocky (DOG-388)", homeVisit: "Pending Visit", date: "2026-07-25", status: "Pending" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Adoption Operations Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Adoption management: review applications, conduct home verification visits, hold interviews, and issue adoption clearance.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaHeart />} title="Approve Adoption" subtitle="Finalize legal paperwork" color="#10B981" onClick={() => alert("Approve modal")} />
        <QuickActionCard icon={<FaUserCheck />} title="Schedule Home Verification" subtitle="Assign field coordinator" color="#2563EB" onClick={() => alert("Schedule Visit modal")} />
        <QuickActionCard icon={<FaClipboardCheck />} title="Review Applicants" subtitle="Inspect questionnaire" color="#F59E0B" onClick={() => alert("Review Applicants modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          Adoption Applications Queue & Verification Progress
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default AdoptionCoordinatorDashboard;
