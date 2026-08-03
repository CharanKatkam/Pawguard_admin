import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaCoins, FaFileInvoiceDollar, FaHandHoldingHeart, FaChartLine } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";

const FinanceUserDashboard = () => {
  const [financeData, setFinanceData] = useState<Record<string, unknown>[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinance();
  }, []);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getFinanceDashboard();
      console.log("Finance Dashboard:", res);
      const data = res?.data || res || {};
      setSummaryData(data);

      const txList = Array.isArray(data)
        ? data
        : Array.isArray(data?.transactions)
        ? data.transactions
        : Array.isArray(data?.records)
        ? data.records
        : [];
      setFinanceData(txList);
    } catch (err: any) {
      console.error("Finance Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load finance metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: any, fallback: string) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === "number") return `$${val.toLocaleString()}`;
    return String(val);
  };

  const stats = [
    { title: "Total Revenue / Donations", value: loading ? "..." : formatCurrency(summaryData?.total_donations ?? summaryData?.totalRevenue, "$0"), trend: "Donations", color: "#10B981", icon: <FaCoins /> },
    { title: "Operational Expenses", value: loading ? "..." : formatCurrency(summaryData?.expenses ?? summaryData?.operationalExpenses, "$0"), trend: "Expenses", color: "#2563EB", icon: <FaFileInvoiceDollar /> },
    { title: "Donor Contributions", value: loading ? "..." : String(summaryData?.donor_count ?? summaryData?.totalDonors ?? "0 Donors"), trend: "Donors", color: "#6366F1", icon: <FaHandHoldingHeart /> },
    { title: "Net Reserve Balance", value: loading ? "..." : formatCurrency(summaryData?.net_balance ?? summaryData?.netBalance, "$0"), trend: "Balance", color: "#F59E0B", icon: <FaChartLine /> },
  ];

  const columns = [
    { key: "txId", title: "Transaction ID" },
    { key: "entity", title: "Donor / Entity" },
    { key: "type", title: "Category" },
    { key: "amount", title: "Amount ($)" },
    { key: "date", title: "Date" },
    { key: "status", title: "Status" },
  ];

  const formattedTransactions = financeData.map((tx: any, idx: number) => ({
    txId: tx.txId || tx.id || `TX-${901 + idx}`,
    entity: tx.entity || tx.donor || tx.name || "-",
    type: tx.type || tx.category || "Donation",
    amount: tx.amount !== undefined ? `$${tx.amount}` : "-",
    date: tx.date || tx.created_at || "-",
    status: tx.status || "Completed",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Finance & Accounting Console</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Financial ledger control: track incoming public donations, audit shelter medical expenses, log bills, and generate balance sheets.
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
        <QuickActionCard icon={<FaHandHoldingHeart />} title="Record Donation" subtitle="Log sponsor contribution" color="#10B981" onClick={() => alert("Record Donation modal")} />
        <QuickActionCard icon={<FaFileInvoiceDollar />} title="Log Expense Bill" subtitle="Record medical or shelter bill" color="#2563EB" onClick={() => alert("Log Expense modal")} />
        <QuickActionCard icon={<FaChartLine />} title="Financial Audit Report" subtitle="Export balance sheet" color="#6366F1" onClick={() => alert("Financial Audit modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Financial Transaction Ledger Stream
          </h3>
          {loading && <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>Syncing transactions...</span>}
        </div>
        <DataTable columns={columns} data={formattedTransactions} />

      </div>
    </div>
  );
};

export default FinanceUserDashboard;
