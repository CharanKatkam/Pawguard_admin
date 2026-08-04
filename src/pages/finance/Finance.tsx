import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import { FaCoins, FaHandHoldingHeart, FaFileInvoiceDollar, FaChartLine, FaPlus, FaTrash } from "react-icons/fa";
import financeService from "../../services/financeService";
import reportsService from "../../services/reportsService";
import { notifyDataChanged } from "../../utils/dataSync";

const Finance = () => {
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  // Modals state
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTx, _setSelectedTx] = useState<any | null>(null);

  // Form states
  const [donationForm, setDonationForm] = useState({ entity: "", category: "Sponsor Donation", amount: "500.00" });
  const [expenseForm, setExpenseForm] = useState({ entity: "VetCare Supplies Ltd", category: "Medical Expense", amount: "250.00" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFinance();
  }, []);

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

  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(donationForm.amount);
    if (!donationForm.entity) {
      addToast("Donor name is required", "error");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Please enter a valid donation amount greater than zero.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await financeService.createTransaction({
        entity: donationForm.entity,
        category: donationForm.category,
        amount,
        type: "donation",
        status: "Completed",
      });
      addToast(`Donation of $${amount.toFixed(2)} recorded from ${donationForm.entity}!`, "success");
      setIsDonationModalOpen(false);
      setDonationForm({ entity: "", category: "Sponsor Donation", amount: "500.00" });
      fetchFinance();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to record donation.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.entity) {
      addToast("Vendor name is required", "error");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Please enter a valid expense amount greater than zero.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await financeService.logExpense({
        entity: expenseForm.entity,
        category: expenseForm.category,
        amount,
        type: "expense",
        status: "Completed",
      });
      addToast(`Expense bill of $${amount.toFixed(2)} logged for ${expenseForm.entity}!`, "success");
      setIsExpenseModalOpen(false);
      fetchFinance();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to log expense.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportReport = async () => {
    try {
      addToast("Generating quarterly financial balance report...", "info");
      await reportsService.exportExecutivePdf();
      addToast("Financial Report PDF downloaded!", "success");
      setIsReportModalOpen(false);
    } catch (err: any) {
      addToast(err?.message || "Failed to generate financial report.", "error");
    }
  };

  const handleDeleteTx = async () => {
    if (!selectedTx) return;
    try {
      setIsSubmitting(true);
      await financeService.deleteTransaction(selectedTx.txId);
      addToast(`Deleted transaction ${selectedTx.txId}`, "success");
      setIsDeleteModalOpen(false);
      fetchFinance();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete transaction.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericFrom = (value: unknown): number => {
    const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const totalDonations = transactions
    .filter((t) => String(t.type || "").toLowerCase().includes("donation"))
    .reduce((sum, t) => sum + numericFrom(t.amount), 0);
  const totalExpenses = transactions
    .filter((t) => String(t.type || "").toLowerCase().includes("expense"))
    .reduce((sum, t) => sum + Math.abs(numericFrom(t.amount)), 0);
  const donorCount = new Set(
    transactions
      .filter((t) => String(t.type || "").toLowerCase().includes("donation"))
      .map((t) => String(t.entity || "").trim())
      .filter(Boolean)
  ).size;

  const currency = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stats = [
    { title: "Total Revenue / Donations", value: currency(totalDonations), trend: "All Time", color: "#10B981", icon: <FaCoins /> },
    { title: "Operational Expenses", value: currency(totalExpenses), trend: "All Time", color: "#2563EB", icon: <FaFileInvoiceDollar /> },
    { title: "Donor Contributions", value: `${donorCount} Donors`, trend: "Recorded", color: "#6366F1", icon: <FaHandHoldingHeart /> },
    { title: "Net Reserve Balance", value: currency(totalDonations - totalExpenses), trend: "Net Position", color: "#F59E0B", icon: <FaChartLine /> },
  ];

  const columns = [
    { key: "txId", title: "Transaction ID" },
    { key: "entity", title: "Donor / Entity" },
    { key: "category", title: "Category" },
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
        <QuickActionCard icon={<FaPlus />} title="Record Donation" subtitle="Log new sponsor contribution" color="#10B981" onClick={() => setIsDonationModalOpen(true)} />
        <QuickActionCard icon={<FaFileInvoiceDollar />} title="Log Expense Bill" subtitle="Record medical or shelter bill" color="#2563EB" onClick={() => setIsExpenseModalOpen(true)} />
        <QuickActionCard icon={<FaChartLine />} title="Generate Financial Report" subtitle="Download quarterly balance" color="#6366F1" onClick={() => setIsReportModalOpen(true)} />
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
        <DataTable
          columns={columns}
          data={transactions}
          onEdit={async (r) => {
            await financeService.updateTransaction(r.txId || r.id || "1", r);
            fetchFinance();
          }}
          onDelete={async (r) => {
            await financeService.deleteTransaction(r.txId || r.id || "1");
            fetchFinance();
          }}
        />
      </div>

      {/* Record Donation Modal */}
      <Modal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} title="Record Sponsor Donation">
        <form onSubmit={handleRecordDonation} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Donor / Entity Name *</label>
            <input type="text" required placeholder="e.g. Global Animal Foundation" value={donationForm.entity} onChange={(e) => setDonationForm({ ...donationForm, entity: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Amount ($ USD) *</label>
            <input type="number" step="0.01" min="1" required value={donationForm.amount} onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsDonationModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Recording..." : "Record Donation"}</button>
          </div>
        </form>
      </Modal>

      {/* Log Expense Bill Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Log Medical / Operational Expense">
        <form onSubmit={handleLogExpense} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Vendor / Service Provider *</label>
            <input type="text" required placeholder="e.g. VetCare Supplies Ltd" value={expenseForm.entity} onChange={(e) => setExpenseForm({ ...expenseForm, entity: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Bill Amount ($ USD) *</label>
            <input type="number" step="0.01" min="1" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsExpenseModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Log Expense"}</button>
          </div>
        </form>
      </Modal>

      {/* Financial Report Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Financial Statement Export">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Generate executive quarterly financial statement and ledger audit summary:
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsReportModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" onClick={handleExportReport} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>Download PDF Report</button>
          </div>
        </div>
      </Modal>



      {/* Delete Transaction Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Remove Transaction Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove transaction <strong>{selectedTx?.txId}</strong> ({selectedTx?.entity})?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDeleteTx} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><FaTrash /> Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
