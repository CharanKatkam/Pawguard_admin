import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHeart, FaCoins, FaFileInvoice, FaAward } from "react-icons/fa";

const DonorDashboard = () => {
  const stats = [
    { title: "Total Contributions", value: "$2,450", trend: "+$500 this year", color: "#10B981", icon: <FaCoins /> },
    { title: "Rescues Funded", value: "14 Pets", trend: "Direct Impact", color: "#2563EB", icon: <FaHeart /> },
    { title: "Donor Tier", value: "Gold Patron", trend: "Top 5% Supporter", color: "#F59E0B", icon: <FaAward /> },
  ];

  const columns = [
    { key: "txId", title: "Receipt ID" },
    { key: "campaign", title: "Funded Campaign / Cause" },
    { key: "amount", title: "Contribution ($)" },
    { key: "date", title: "Date" },
    { key: "taxReceipt", title: "Tax Receipt Status" },
  ];

  const data = [
    { txId: "DON-9901", campaign: "Emergency Surgery Fund (Max - GSD)", amount: "$500.00", date: "2026-07-20", taxReceipt: "Available (PDF)" },
    { txId: "DON-9902", campaign: "Monthly Shelter Kibble Fund", amount: "$150.00", date: "2026-07-01", taxReceipt: "Available (PDF)" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Donor Patron Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Donor contribution portal: track financial impact, view funded animal rescues, and download tax exemption receipts.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaHeart />} title="Make New Donation" subtitle="Sponsor emergency rescue" color="#10B981" onClick={() => alert("Make Donation modal")} />
        <QuickActionCard icon={<FaFileInvoice />} title="Download Tax Receipts" subtitle="Export 80G tax receipt" color="#2563EB" onClick={() => alert("Tax Receipt modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          My Contribution History & Impact Record
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default DonorDashboard;
