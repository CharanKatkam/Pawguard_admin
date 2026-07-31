import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaCoins, FaFileInvoiceDollar, FaHandHoldingHeart, FaChartLine } from "react-icons/fa";
import financeService from "../../../services/financeService";

const FinanceUserDashboard = () => {
  const [financeData, setFinanceData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        setLoading(true);
        const res = await financeService.getFinanceRecords();
        if (res && Array.isArray(res.data)) {
          setFinanceData(res.data);
        }
      } catch {
        // Fallback handled by service
      } finally {
        setLoading(false);
      }
    };
    fetchFinance();
  }, []);

  const stats = [
    { title: "Total Revenue / Donations", value: "$124,500", trend: "+18.4% YoY", color: "#10B981", icon: <FaCoins /> },
    { title: "Operational Expenses", value: "$48,200", trend: "Within budget", color: "#2563EB", icon: <FaFileInvoiceDollar /> },
    { title: "Donor Contributions", value: "340 Donors", trend: "+14 this month", color: "#6366F1", icon: <FaHandHoldingHeart /> },
    { title: "Net Reserve Balance", value: "$76,300", trend: "Healthy", color: "#F59E0B", icon: <FaChartLine /> },
  ];

  const columns = [
    { key: "txId", title: "Transaction ID" },
    { key: "entity", title: "Donor / Entity" },
    { key: "type", title: "Category" },
    { key: "amount", title: "Amount ($)" },
    { key: "date", title: "Date" },
    { key: "status", title: "Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Finance & Accounting Console</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Financial ledger control: track incoming public donations, audit shelter medical expenses, log bills, and generate balance sheets.
        </p>
      </div>

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
        <DataTable columns={columns} data={financeData} />
      </div>
    </div>
  );
};

export default FinanceUserDashboard;
