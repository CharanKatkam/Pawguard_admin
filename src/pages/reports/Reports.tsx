import AdoptionChart from "../../components/dashboard/AdoptionChart";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaChartBar, FaFileDownload, FaFileAlt, FaFilter } from "react-icons/fa";

const Reports = () => {
  const stats = [
    { title: "Monthly Rescue Rate", value: "94.2%", trend: "+3.1%", color: "#2563EB", icon: <FaChartBar /> },
    { title: "Adoption Success Index", value: "88.6%", trend: "+5.4%", color: "#10B981", icon: <FaFileAlt /> },
    { title: "Medical Clearance Rate", value: "98.1%", trend: "Optimal", color: "#6366F1", icon: <FaFilter /> },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Reports & Operational Analytics</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Generate custom analytical reports on rescue response times, shelter capacities, medical costs, adoption conversion rates, and donor metrics.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaFileDownload />} title="Export Executive Report" subtitle="Download PDF executive summary" color="#2563EB" onClick={() => alert("Exporting PDF Report...")} />
        <QuickActionCard icon={<FaFileAlt />} title="Export CSV Data Dump" subtitle="Raw datasets for audit" color="#10B981" onClick={() => alert("Exporting CSV...")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Analytics Visualization */}
      <AdoptionChart />
    </div>
  );
};

export default Reports;