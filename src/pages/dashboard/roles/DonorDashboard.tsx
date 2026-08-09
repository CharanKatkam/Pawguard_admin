import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { useToast } from "../../../context/ToastContext";
import reportsService from "../../../services/reportsService";
import { FaHeart, FaCoins, FaFileInvoice, FaAward } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const DonorDashboard = () => {
  const { addToast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getStaffDashboard();
      const data = res?.data || res || {};
      setDashboardData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load donor portal data. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useDataSync(fetchDashboard);

  const donationsList = Array.isArray(dashboardData?.donations)
    ? dashboardData.donations
    : Array.isArray(dashboardData?.history)
    ? dashboardData.history
    : Array.isArray(dashboardData)
    ? dashboardData
    : [];

  const formatCurrency = (val: any, fallback: string) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === "number") return `$${val.toLocaleString()}`;
    return String(val);
  };

  const stats = [
    { title: "Total Contributions", value: loading ? "..." : formatCurrency(dashboardData?.total_contributions ?? dashboardData?.totalContributions, "$0"), trend: "Contributions", color: "#10B981", icon: <FaCoins /> },
    { title: "Rescues Funded", value: loading ? "..." : String(dashboardData?.rescues_funded ?? dashboardData?.rescuesFunded ?? donationsList.length), trend: "Impact", color: "#2563EB", icon: <FaHeart /> },
    { title: "Donor Tier", value: loading ? "..." : String(dashboardData?.donor_tier ?? dashboardData?.donorTier ?? "Patron"), trend: "Tier", color: "#F59E0B", icon: <FaAward /> },
  ];

  const columns = [
    { key: "txId", title: "Receipt ID" },
    { key: "campaign", title: "Funded Campaign / Cause" },
    { key: "amount", title: "Contribution ($)" },
    { key: "date", title: "Date" },
    { key: "taxReceipt", title: "Tax Receipt Status" },
  ];

  const formattedData = donationsList.map((item: any) => ({
    txId: item.id ?? item.transaction_id ?? item.tx_id ?? "",
    campaign: item.campaign ?? item.cause ?? item.title ?? "",
    amount: item.amount !== undefined && item.amount !== null ? `$${item.amount}` : "",
    date: item.date ?? item.created_at ?? "",
    taxReceipt: item.receipt_status ?? item.taxReceipt ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Donor Patron Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Donor contribution portal: track financial impact, view funded animal rescues, and download tax exemption receipts.
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
        <QuickActionCard icon={<FaHeart />} title="Make New Donation" subtitle="Sponsor emergency rescue" color="#10B981" onClick={() => addToast("Open the Finance module to make a donation", "info")} />
        <QuickActionCard icon={<FaFileInvoice />} title="Download Tax Receipts" subtitle="Export donation report" color="#2563EB" onClick={async () => {
          addToast("Generating donation report PDF...", "info");
          await reportsService.generateAndDownloadReport({ report_type: "donation", format: "pdf" });
          addToast("Donation report downloaded!", "success");
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            My Contribution History & Impact Record
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading donor record...</span>}
        </div>
        <DataTable columns={columns} data={formattedData} />
      </div>
    </div>
  );
};

export default DonorDashboard;

