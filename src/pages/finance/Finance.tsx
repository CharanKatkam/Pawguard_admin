import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaCoins, FaHandHoldingHeart, FaFileInvoiceDollar, FaChartLine, FaPlus } from "react-icons/fa";
import financeService from "../../services/financeService";

const Finance = () => {
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchFinance = async () => {
      try {
        setLoading(true);
        const response = await financeService.getFinanceRecords();
        if (response && Array.isArray(response.data)) {
          setTransactions(response.data);
        }
      } catch {
        // Handled by service fallback
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
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Donations & Financial Management</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Track rescue organization revenue, incoming public donations, medical expenses, vendor bills, and financial ledger reports.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlus />} title="Record Donation" subtitle="Log new sponsor contribution" color="#10B981" onClick={() => alert("Record Donation modal")} />
        <QuickActionCard icon={<FaFileInvoiceDollar />} title="Log Expense Bill" subtitle="Record medical or shelter bill" color="#2563EB" onClick={() => alert("Log Expense modal")} />
        <QuickActionCard icon={<FaChartLine />} title="Generate Financial Report" subtitle="Download quarterly balance" color="#6366F1" onClick={() => alert("Report modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Financial Transaction Ledger
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading transactions...</span>}
        </div>
        <DataTable columns={columns} data={transactions} onView={(r) => alert(`TX: ${r.txId}`)} />
      </div>
    </div>
  );
};

export default Finance;
