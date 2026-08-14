import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaCoins, FaFileInvoiceDollar, FaHandHoldingHeart, FaChartLine, FaPlus, FaReceipt } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import financeService from "../../../services/financeService";
import { useDataSync } from "../../../utils/dataSync";

const numericValue = (val: unknown): number => {
  const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (val: unknown): string =>
  `₹${numericValue(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FinanceUserDashboard = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardRes, txRes, summaryRes] = await Promise.allSettled([
        dashboardService.getFinanceDashboard(),
        financeService.getFinanceRecords(),
        financeService.getFinanceSummary(),
      ]);

      if (dashboardRes.status === "fulfilled") {
        setSummary(dashboardRes.value?.data ?? dashboardRes.value ?? {});
      } else {
        setSummary(null);
      }

      const txBody =
        txRes.status === "fulfilled" ? txRes.value : null;
      setTransactions(
        Array.isArray(txBody?.data) ? txBody.data : Array.isArray(txBody) ? txBody : []
      );

      if (dashboardRes.status === "rejected" && txRes.status === "rejected") {
        const err: any = dashboardRes.reason;
        setError(
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load finance metrics. Access may be restricted."
        );
      } else {
        setError(null);
      }

      // Surface a usable summary dict from /finance/summary when the dashboard
      // endpoint is unavailable, so the stat cards stay backed by real data.
      if ((summaryRes.status === "fulfilled" && summaryRes.value?.data) || (summaryRes.status === "fulfilled" && summaryRes.value)) {
        const s = summaryRes.value?.data ?? summaryRes.value;
        setSummary((prev: any) => (prev && Object.keys(prev).length ? prev : s));
      }
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

  useEffect(() => {
    fetchFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDataSync(fetchFinance);

  const totalRevenue = transactions
    .filter((t) => /income|donation|revenue/.test(String(t.type || "").toLowerCase()))
    .reduce((sum, t) => sum + numericValue(t.amount), 0);
  const totalExpenses = transactions
    .filter((t) => /expense/.test(String(t.type || "").toLowerCase()))
    .reduce((sum, t) => sum + Math.abs(numericValue(t.amount)), 0);
  const donorCount = transactions
    .filter((t) => /income|donation|revenue/.test(String(t.type || "").toLowerCase()))
    .reduce((set, t) => {
      const entity = String(t.entity ?? t.description ?? "").trim();
      if (entity) set.add(entity);
      return set;
    }, new Set<string>()).size;

  const summaryRevenue = summary?.total_donations ?? summary?.totalRevenue ?? summary?.total_revenue ?? summary?.total_income;
  const summaryExpenses = summary?.expenses ?? summary?.operationalExpenses ?? summary?.total_expenses;
  const summaryDonors = summary?.donor_count ?? summary?.totalDonors ?? summary?.donorCount;
  const summaryNet = summary?.net_balance ?? summary?.netBalance ?? summary?.net;

  const stats = [
    { title: "Total Revenue / Donations", value: loading ? "..." : summaryRevenue !== undefined && summaryRevenue !== null ? formatCurrency(summaryRevenue) : formatCurrency(totalRevenue), trend: "Donations", color: "#10B981", icon: <FaCoins />, onClick: () => navigate("/finance") },
    { title: "Operational Expenses", value: loading ? "..." : summaryExpenses !== undefined && summaryExpenses !== null ? formatCurrency(summaryExpenses) : formatCurrency(totalExpenses), trend: "Expenses", color: "#2563EB", icon: <FaFileInvoiceDollar />, onClick: () => navigate("/finance") },
    { title: "Donor Contributions", value: loading ? "..." : String(summaryDonors ?? donorCount), trend: "Donors", color: "#6366F1", icon: <FaHandHoldingHeart />, onClick: () => navigate("/finance") },
    { title: "Net Reserve Balance", value: loading ? "..." : summaryNet !== undefined && summaryNet !== null ? formatCurrency(summaryNet) : formatCurrency(totalRevenue - totalExpenses), trend: "Balance", color: "#F59E0B", icon: <FaChartLine />, onClick: () => navigate("/finance") },
  ];

  const columns = [
    { key: "txId", title: "Transaction ID" },
    { key: "entity", title: "Donor / Entity" },
    { key: "type", title: "Category" },
    { key: "amount", title: "Amount (₹)" },
    { key: "date", title: "Date" },
    { key: "status", title: "Status" },
  ];

  const formattedTransactions = transactions.map((tx: any) => ({
    txId: tx.id ?? tx.transaction_id ?? tx.tx_id ?? "",
    entity: tx.entity ?? tx.donor ?? tx.name ?? tx.description ?? "",
    type: tx.category ?? tx.type ?? "",
    amount: tx.amount !== undefined && tx.amount !== null ? `₹${tx.amount}` : "",
    date: tx.created_at ?? tx.date ?? "",
    status: tx.status ?? "",
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
        <QuickActionCard icon={<FaPlus />} title="Record Donation" subtitle="Log sponsor contribution" color="#10B981" onClick={() => navigate("/finance?action=donation")} />
        <QuickActionCard icon={<FaFileInvoiceDollar />} title="Log Expense Bill" subtitle="Record medical or shelter bill" color="#2563EB" onClick={() => navigate("/finance?action=expense")} />
        <QuickActionCard icon={<FaReceipt />} title="Donation Report" subtitle="Export donation PDF" color="#F59E0B" onClick={() => navigate("/reports")} />
        <QuickActionCard icon={<FaChartLine />} title="Financial Audit Report" subtitle="Export balance sheet" color="#6366F1" onClick={() => navigate("/reports")} />
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
