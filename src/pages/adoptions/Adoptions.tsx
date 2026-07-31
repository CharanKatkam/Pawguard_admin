import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaHeart, FaUserCheck, FaClipboardCheck, FaPlus } from "react-icons/fa";
import adoptionService from "../../services/adoptionService";

const Adoptions = () => {
  const [adoptions, setAdoptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAdoptions = async () => {
      try {
        setLoading(true);
        const response = await adoptionService.getAdoptions();
        if (response && Array.isArray(response.data)) {
          setAdoptions(response.data);
        }
      } catch {
        // Handled by service fallback
      } finally {
        setLoading(false);
      }
    };
    fetchAdoptions();
  }, []);

  const stats = [
    { title: "Adoptions Completed", value: `${adoptions.length || 186} Pets`, trend: "+14 this month", color: "#10B981", icon: <FaHeart /> },
    { title: "Pending Applications", value: "32 Reviews", trend: "5 Priority", color: "#F59E0B", icon: <FaClipboardCheck /> },
    { title: "Home Verifications", value: "12 Scheduled", trend: "Active", color: "#2563EB", icon: <FaUserCheck /> },
  ];

  const columns = [
    { key: "applicationId", title: "App ID" },
    { key: "applicantName", title: "Applicant Name" },
    { key: "petName", title: "Pet Interested" },
    { key: "date", title: "Applied Date" },
    { key: "status", title: "Decision Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Adoption Requests & Approvals</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Adoption workflow: review applicant questionnaires, conduct home visits, schedule interviews, and issue adoption agreements.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlus />} title="New Adoption Request" subtitle="Log walk-in applicant" color="#2563EB" onClick={() => alert("New Application modal")} />
        <QuickActionCard icon={<FaUserCheck />} title="Schedule Home Verification" subtitle="Assign field coordinator" color="#10B981" onClick={() => alert("Schedule Visit modal")} />
        <QuickActionCard icon={<FaHeart />} title="Approve Adoption" subtitle="Issue certificate & finalize" color="#6366F1" onClick={() => alert("Approve modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Adoption Applications Queue
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading applications...</span>}
        </div>
        <DataTable columns={columns} data={adoptions} onView={(r) => alert(`Application: ${r.applicationId}`)} onEdit={(r) => alert(`Review Application: ${r.applicationId}`)} />
      </div>
    </div>
  );
};

export default Adoptions;