import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaCoins, FaHandHoldingHeart, FaFileInvoiceDollar, FaChartLine, FaPlus, FaDownload, FaEdit, FaReceipt, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from "react-icons/fa";
import financeService, { getCurrentFinancialYearPeriod } from "../../services/financeService";
import donationsService, { type DonationType, type DonationStatus } from "../../services/donationsService";
import reportsService from "../../services/reportsService";
import { notifyDataChanged } from "../../utils/dataSync";

type TabKey = "donations" | "transactions";

const DONATION_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Types" },
  { value: "one_time", label: "One-Time" },
  { value: "recurring", label: "Recurring" },
  { value: "sponsorship", label: "Sponsorship" },
];

const DONATION_STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const formatDate = (value: unknown): string => {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const numericValue = (val: unknown): number => {
  const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (val: unknown): string =>
  `₹${numericValue(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Finance = () => {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    searchParams.get("action") === "expense" ? "transactions" : "donations"
  );

  // Transactions
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(true);
  const [txError, setTxError] = useState<string | null>(null);

  // Finance Summary (for dashboard stats)
  const [financeSummary, setFinanceSummary] = useState<Record<string, unknown> | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);

  // Donations
  const [donations, setDonations] = useState<Record<string, unknown>[]>([]);
  const [donationLoading, setDonationLoading] = useState<boolean>(true);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [donationSearch, setDonationSearch] = useState("");
  const [donationFilterStatus, setDonationFilterStatus] = useState("");
  const [donationFilterType, setDonationFilterType] = useState("");

  // Modals state
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(() => searchParams.get("action") === "donation");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(() => searchParams.get("action") === "expense");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Record<string, unknown> | null>(null);
  const [donationStatusDraft, setDonationStatusDraft] = useState<DonationStatus>("success");

  // Form states (empty defaults - no sample data)
  const [donationForm, setDonationForm] = useState({
    amount: "",
    currency: "INR",
    donation_type: "one_time" as DonationType,
    notes: "",
    donor_name: "",
    donor_email: "",
    donor_phone: "",
    payment_method: "",
    transaction_id: "",
    purpose: "",
  });
  const [expenseForm, setExpenseForm] = useState({ entity: "", category: "Medical Expense", amount: "", date: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFinance = useCallback(async () => {
    try {
      setTxLoading(true);
      setTxError(null);
      const response = await financeService.getFinanceRecords();
      if (response && Array.isArray(response.data)) {
        setTransactions(response.data);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      setTxError(err?.response?.data?.detail || err?.response?.data?.message || "Failed to load transaction ledger.");
    } finally {
      setTxLoading(false);
    }
  }, []);

  const fetchFinanceSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const response = await financeService.getFinanceSummary();
      setFinanceSummary(response?.data ?? response ?? null);
    } catch (err: any) {
      // Error is handled via summaryLoading state and missing data
      setFinanceSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchDonations = useCallback(async () => {
    try {
      setDonationLoading(true);
      setDonationError(null);
      const response = await donationsService.getDonations({
        status: donationFilterStatus ? (donationFilterStatus as DonationStatus) : undefined,
        donation_type: donationFilterType ? (donationFilterType as DonationType) : undefined,
        page: 1,
        page_size: 100,
        sort_by: "created_at",
        sort_order: "desc",
      });
      if (response && Array.isArray(response.data)) {
        setDonations(response.data);
      } else {
        setDonations([]);
      }
    } catch (err: any) {
      setDonationError(err?.response?.data?.detail || err?.response?.data?.message || "Failed to load donations.");
    } finally {
      setDonationLoading(false);
    }
  }, [donationFilterStatus, donationFilterType]);

  useEffect(() => {
    fetchFinance();
    fetchFinanceSummary();
  }, [fetchFinance, fetchFinanceSummary]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "donation" || action === "expense") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(donationForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast("Please enter a valid donation amount greater than zero.", "error");
      return;
    }
    if (!donationForm.donor_name) {
      addToast("Donor name is required.", "error");
      return;
    }
    if (!donationForm.donor_email) {
      addToast("Donor email/phone is required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await donationsService.createDonation({
        amount,
        currency: donationForm.currency || "INR",
        donation_type: donationForm.donation_type,
        notes: donationForm.notes || undefined,
        donor_name: donationForm.donor_name || undefined,
        donor_email: donationForm.donor_email || undefined,
        donor_phone: donationForm.donor_phone || undefined,
        payment_method: donationForm.payment_method || undefined,
        transaction_id: donationForm.transaction_id || undefined,
        purpose: donationForm.purpose || undefined,
      });
      addToast(`Donation of ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} recorded!`, "success");
      setIsDonationModalOpen(false);
      setDonationForm({ amount: "", currency: "INR", donation_type: "one_time", notes: "", donor_name: "", donor_email: "", donor_phone: "", payment_method: "", transaction_id: "", purpose: "" });
      fetchDonations();
      fetchFinance();
      fetchFinanceSummary();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to record donation.", "error");
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
        date: expenseForm.date || undefined,
      });
      addToast(`Expense bill of ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} logged for ${expenseForm.entity}!`, "success");
      setIsExpenseModalOpen(false);
      setExpenseForm({ entity: "", category: "Medical Expense", amount: "", date: "" });
      fetchFinance();
      fetchFinanceSummary();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to log expense.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportReport = async () => {
    try {
      addToast("Generating financial audit report...", "info");
      const { period_start, period_end } = getCurrentFinancialYearPeriod();
      await reportsService.generateAndDownloadReport({ report_type: "finance", format: "pdf", period_start, period_end });
      addToast("Financial Audit Report PDF downloaded!", "success");
      setIsReportModalOpen(false);
    } catch (err: any) {
      addToast(err?.message || "Failed to generate financial report.", "error");
    }
  };

  const handleExportDonationReport = async () => {
    try {
      addToast("Generating donation report PDF...", "info");
      const { period_start, period_end } = getCurrentFinancialYearPeriod();
      await reportsService.generateAndDownloadReport({ report_type: "donation", format: "pdf", period_start, period_end });
      addToast("Donation Report PDF downloaded!", "success");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to generate donation report.";
      if (err?.response?.status === 403) {
        addToast("Access denied: You may not have permission to export donation reports.", "error");
      } else {
        addToast(msg, "error");
      }
    }
  };

  const openStatusModal = (row: any) => {
    setSelectedDonation(row);
    setDonationStatusDraft((row?.status || "success") as DonationStatus);
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const donationId = selectedDonation?.id ? String(selectedDonation.id) : "";
    if (!donationId) return;
    try {
      setIsSubmitting(true);
      await donationsService.updateDonationStatus(donationId, donationStatusDraft);
      addToast(`Donation ${donationId} marked as ${donationStatusDraft}.`, "success");
      setIsStatusModalOpen(false);
      fetchDonations();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to update donation status.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = async (row: any) => {
    if (!row?.id) {
      addToast("No donation record available for receipt.", "error");
      return;
    }
    try {
      addToast("Fetching donation receipt...", "info");
      const receipt = await donationsService.getDonationReceipt(row.id);
      const url = receipt?.download_url;
      if (!url) {
        addToast("No receipt is available for this donation yet.", "error");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      addToast("Donation receipt opened.", "success");
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to fetch donation receipt.", "error");
    }
  };

  // Calculate stats from finance summary (preferred) or fallback to transactions/donations
  const summaryRevenue = financeSummary?.total_donations ?? financeSummary?.totalRevenue ?? financeSummary?.total_revenue ?? financeSummary?.total_income;
  const summaryExpenses = financeSummary?.expenses ?? financeSummary?.operationalExpenses ?? financeSummary?.total_expenses;
  const summaryDonors = financeSummary?.donor_count ?? financeSummary?.totalDonors ?? financeSummary?.donorCount;
  const summaryNet = financeSummary?.net_balance ?? financeSummary?.netBalance ?? financeSummary?.net;
  const summarySuccessfulDonations = financeSummary?.successful_donations ?? financeSummary?.successfulDonations;
  const summaryPendingDonations = financeSummary?.pending_donations ?? financeSummary?.pendingDonations;
  const summaryFailedDonations = financeSummary?.failed_donations ?? financeSummary?.failedDonations;

  // Fallback calculations from transactions
  const totalRevenue = transactions
    .filter((t) => /income|donation|revenue/.test(String(t.type || "").toLowerCase()))
    .reduce((sum, t) => sum + numericValue(t.amount), 0);
  const totalExpenses = transactions
    .filter((t) => /expense/.test(String(t.type || "").toLowerCase()))
    .reduce((sum, t) => sum + Math.abs(numericValue(t.amount)), 0);

  // Unique donor count from donations (not just donation count)
  const donorCount = donations
    .filter((d) => /income|donation|revenue/.test(String(d.type || "one_time").toLowerCase()))
    .reduce((set, d) => {
      const entity = String(d.donorId ?? d.transactionId ?? d.notes ?? "").trim();
      if (entity) set.add(entity);
      return set;
    }, new Set<string>()).size;

  // Donation status counts
  const successfulDonations = summarySuccessfulDonations !== undefined && summarySuccessfulDonations !== null
    ? summarySuccessfulDonations
    : donations.filter((d) => String(d.status) === "success").length;
  const pendingDonations = summaryPendingDonations !== undefined && summaryPendingDonations !== null
    ? summaryPendingDonations
    : donations.filter((d) => String(d.status) === "pending").length;
  const failedDonations = summaryFailedDonations !== undefined && summaryFailedDonations !== null
    ? summaryFailedDonations
    : donations.filter((d) => String(d.status) === "failed").length;

  const stats = [
    {
      title: "Total Revenue / Donations",
      value: summaryLoading ? "..." : (summaryRevenue !== undefined && summaryRevenue !== null ? formatCurrency(summaryRevenue) : formatCurrency(totalRevenue)),
      trend: summaryLoading ? "Loading..." : (summaryRevenue !== undefined && summaryRevenue !== null ? "Backend Summary" : "From Transactions"),
      color: "#10B981",
      icon: <FaCoins />,
      onClick: () => {
        setActiveTab("donations");
        setDonationFilterStatus("");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Operational Expenses",
      value: summaryLoading ? "..." : (summaryExpenses !== undefined && summaryExpenses !== null ? formatCurrency(summaryExpenses) : formatCurrency(totalExpenses)),
      trend: summaryLoading ? "Loading..." : (summaryExpenses !== undefined && summaryExpenses !== null ? "Backend Summary" : "From Transactions"),
      color: "#2563EB",
      icon: <FaFileInvoiceDollar />,
      onClick: () => {
        setActiveTab("transactions");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Donor Contributions",
      value: summaryLoading ? "..." : String(summaryDonors ?? donorCount),
      trend: summaryLoading ? "Loading..." : (summaryDonors !== undefined && summaryDonors !== null ? "Unique Donors (Backend)" : "Unique Donors"),
      color: "#6366F1",
      icon: <FaHandHoldingHeart />,
      onClick: () => {
        setActiveTab("donations");
        setDonationFilterStatus("");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Net Reserve Balance",
      value: summaryLoading ? "..." : (summaryNet !== undefined && summaryNet !== null ? formatCurrency(summaryNet) : formatCurrency(totalRevenue - totalExpenses)),
      trend: summaryLoading ? "Loading..." : (summaryNet !== undefined && summaryNet !== null ? "Backend Net Balance" : "Calculated"),
      color: "#F59E0B",
      icon: <FaChartLine />,
      onClick: () => {
        setActiveTab("transactions");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Total Transactions",
      value: summaryLoading ? "..." : String(transactions.length),
      trend: "All Records",
      color: "#64748B",
      icon: <FaFileInvoiceDollar />,
      onClick: () => {
        setActiveTab("transactions");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Successful Donations",
      value: summaryLoading ? "..." : String(successfulDonations),
      trend: "Completed",
      color: "#10B981",
      icon: <FaCheckCircle />,
      onClick: () => {
        setActiveTab("donations");
        setDonationFilterStatus("success");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Pending Donations",
      value: summaryLoading ? "..." : String(pendingDonations),
      trend: "Awaiting",
      color: "#F59E0B",
      icon: <FaHourglassHalf />,
      onClick: () => {
        setActiveTab("donations");
        setDonationFilterStatus("pending");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Failed/Cancelled Donations",
      value: summaryLoading ? "..." : String(failedDonations),
      trend: "Failed",
      color: "#EF4444",
      icon: <FaTimesCircle />,
      onClick: () => {
        setActiveTab("donations");
        setDonationFilterStatus("failed");
        document.getElementById("finance-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
  ];

  const txColumns = [
    { key: "txId", title: "Transaction ID" },
    { key: "entity", title: "Donor / Entity" },
    { key: "category", title: "Category" },
    { key: "amount", title: "Amount (₹)" },
    { key: "date", title: "Date" },
    { key: "status", title: "Status" },
  ];

  const filteredDonations = useMemo(() => {
    if (!donationSearch.trim()) return donations;
    const lower = donationSearch.toLowerCase();
    return donations.filter((d) =>
      ["id", "transactionId", "donorId", "notes", "type", "status"]
        .some((key) => {
          const val = d[key];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
        })
    );
  }, [donations, donationSearch]);

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Donations & Financial Management</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Track rescue organization revenue, incoming public donations, medical expenses, vendor bills, and financial ledger reports.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_finance">
          <QuickActionCard icon={<FaPlus />} title="Record Donation" subtitle="Log new sponsor contribution" color="#10B981" onClick={() => { setActiveTab("donations"); setIsDonationModalOpen(true); }} />
        </Can>
        <Can permission="create_finance">
          <QuickActionCard icon={<FaFileInvoiceDollar />} title="Log Expense Bill" subtitle="Record medical or shelter bill" color="#2563EB" onClick={() => { setActiveTab("transactions"); setIsExpenseModalOpen(true); }} />
        </Can>
        <Can permission="export_finance">
          <QuickActionCard icon={<FaChartLine />} title="Generate Financial Report" subtitle="Download quarterly balance" color="#6366F1" onClick={() => setIsReportModalOpen(true)} />
        </Can>
        <Can permission="export_finance">
          <QuickActionCard icon={<FaReceipt />} title="Export Donation Report" subtitle="Download donation summary PDF" color="#10B981" onClick={handleExportDonationReport} />
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Tabs */}
      <div id="finance-table-card" style={{ display: "flex", gap: "8px", borderBottom: "2px solid #E2E8F0", marginBottom: "20px" }}>
        {(["donations", "transactions"] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 22px",
              borderRadius: "10px 10px 0 0",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              background: activeTab === tab ? "#0F172A" : "transparent",
              color: activeTab === tab ? "#FFFFFF" : "#64748B",
              transition: "all 0.15s ease",
            }}
          >
            {tab === "donations" ? "Donations" : "Financial Ledger"}
          </button>
        ))}
      </div>

      {activeTab === "donations" ? (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Donation Records
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search donations..."
                value={donationSearch}
                onChange={(e) => setDonationSearch(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", minWidth: "200px", outline: "none" }}
              />
              <select
                value={donationFilterType}
                onChange={(e) => { setDonationFilterType(e.target.value); }}
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF", outline: "none" }}
              >
                {DONATION_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={donationFilterStatus}
                onChange={(e) => { setDonationFilterStatus(e.target.value); }}
                style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF", outline: "none" }}
              >
                {DONATION_STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Can permission="create_finance">
                <button
                  onClick={() => setIsDonationModalOpen(true)}
                  style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaPlus /> Record Donation
                </button>
              </Can>
            </div>
          </div>

          {donationError && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {donationError}
            </div>
          )}

          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "separate", borderSpacing: 0, background: "#FFFFFF", fontSize: "13px", textAlign: "left", border: "1px solid #E2E8F0", borderRadius: "12px" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Donation ID", "Donor / Reference", "Type", "Amount", "Status", "Date", "Actions"].map((h, hi) => (
                    <th key={h} style={{ padding: "14px 16px", fontWeight: 700, color: "#475569", whiteSpace: "nowrap", background: "#F8FAFC", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid #E2E8F0", borderTopLeftRadius: hi === 0 ? "11px" : 0, borderTopRightRadius: hi === 6 ? "11px" : 0, textAlign: hi === 6 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {donationLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#2563EB" }}>
                      <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #EFF6FF", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "#64748B", fontWeight: 500 }}>Loading donations from server...</div>
                    </td>
                  </tr>
                ) : filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>
                      {donationSearch || donationFilterStatus || donationFilterType ? "No donations match the current filters." : "No donation records found."}
                    </td>
                  </tr>
                ) : (
                  filteredDonations.map((d: any, idx) => {
                    const isLastRow = idx === filteredDonations.length - 1;
                    return (
                    <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px 16px", color: "#0F172A", fontWeight: 600, whiteSpace: "nowrap", borderBottom: "1px solid #F1F5F9", borderBottomLeftRadius: isLastRow ? "11px" : 0 }}>{d.id || "—"}</td>
                      <td style={{ padding: "14px 16px", color: "#475569", borderBottom: "1px solid #F1F5F9" }}>
                        {d.donorName || d.transactionId || d.notes || (d.donorId ? `Donor ${String(d.donorId).slice(0, 8)}` : "Manual")}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#0F172A", textTransform: "capitalize", borderBottom: "1px solid #F1F5F9" }}>{String(d.type || "one_time").replace("_", " ")}</td>
                      <td style={{ padding: "14px 16px", color: "#10B981", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "1px solid #F1F5F9" }}>
                        {(d.currency || "USD")} {Number(d.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
                        <span style={{
                          background: String(d.status) === "success" ? "#ECFDF5" : String(d.status) === "failed" ? "#FEF2F2" : "#FFFBEB",
                          color: String(d.status) === "success" ? "#10B981" : String(d.status) === "failed" ? "#EF4444" : "#F59E0B",
                          padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, textTransform: "capitalize", display: "inline-block", whiteSpace: "nowrap",
                        }}>
                          {d.status || "pending"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#64748B", whiteSpace: "nowrap", borderBottom: "1px solid #F1F5F9" }}>{formatDate(d.date)}</td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap", borderBottom: "1px solid #F1F5F9", borderBottomRightRadius: isLastRow ? "11px" : 0 }}>
                        <Can permission="edit_finance">
                          <button
                            onClick={() => openStatusModal(d)}
                            title="Update status"
                            style={{ marginRight: "8px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#475569", cursor: "pointer", fontSize: "12px" }}
                          >
                            <FaEdit /> Status
                          </button>
                        </Can>
                        <button
                          onClick={() => handleDownloadReceipt(d)}
                          title="Download receipt"
                          style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#2563EB", cursor: "pointer", fontSize: "12px" }}
                        >
                          <FaDownload /> Receipt
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B" }}>
            Showing <strong>{filteredDonations.length}</strong> donation record(s).
          </div>
        </div>
      ) : (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Financial Transaction Ledger
            </h3>
            {txLoading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading transactions...</span>}
          </div>
          {txError && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {txError}
            </div>
          )}
          <DataTable
            columns={txColumns}
            data={transactions}
            module="finance"
            onEdit={async (r) => {
              await financeService.updateTransaction(r.txId || r.id || "1", r);
              fetchFinance();
            }}
            onDelete={async (r) => {
              await financeService.deleteTransaction(r.txId || r.id);
              fetchFinance();
            }}
          />
        </div>
      )}

      {/* Record Donation Modal */}
      <Modal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} title="Record Sponsor Donation">
        <form onSubmit={handleRecordDonation} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Donor Name *</label>
              <input type="text" required placeholder="e.g. John Doe" value={donationForm.donor_name} onChange={(e) => setDonationForm({ ...donationForm, donor_name: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Donor Email/Phone *</label>
              <input type="text" required placeholder="e.g. john@example.com or +91-9876543210" value={donationForm.donor_email} onChange={(e) => setDonationForm({ ...donationForm, donor_email: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Amount (INR) *</label>
            <input type="number" step="0.01" min="1" required placeholder="e.g. 5000.00" value={donationForm.amount} onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Donation Type</label>
              <select value={donationForm.donation_type} onChange={(e) => setDonationForm({ ...donationForm, donation_type: e.target.value as DonationType })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", outline: "none" }}>
                <option value="one_time">One-Time</option>
                <option value="recurring">Recurring</option>
                <option value="sponsorship">Sponsorship</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Payment Method</label>
              <select value={donationForm.payment_method} onChange={(e) => setDonationForm({ ...donationForm, payment_method: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", outline: "none" }}>
                <option value="">Select Method</option>
                <option value="upi">UPI</option>
                <option value="net_banking">Net Banking</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Transaction/Reference ID</label>
              <input type="text" placeholder="e.g. TXN123456789" value={donationForm.transaction_id} onChange={(e) => setDonationForm({ ...donationForm, transaction_id: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Donation Purpose/Category</label>
              <select value={donationForm.purpose} onChange={(e) => setDonationForm({ ...donationForm, purpose: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", outline: "none" }}>
                <option value="">Select Purpose</option>
                <option value="general">General Donation</option>
                <option value="medical">Medical Care</option>
                <option value="food">Food & Nutrition</option>
                <option value="shelter">Shelter Maintenance</option>
                <option value="rescue">Rescue Operations</option>
                <option value="adoption">Adoption Support</option>
                <option value="education">Education & Awareness</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Notes (optional)</label>
            <textarea rows={2} placeholder="e.g. In memory of Rex" value={donationForm.notes} onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsDonationModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}>{isSubmitting ? "Recording..." : "Record Donation"}</button>
          </div>
        </form>
      </Modal>

      {/* Log Expense Bill Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Log Medical / Operational Expense">
        <form onSubmit={handleLogExpense} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Vendor / Service Provider *</label>
            <input type="text" required placeholder="e.g. VetCare Supplies Ltd" value={expenseForm.entity} onChange={(e) => setExpenseForm({ ...expenseForm, entity: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Category</label>
            <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", outline: "none" }}>
              <option value="Medical Expense">Medical Expense</option>
              <option value="Operational Expense">Operational Expense</option>
              <option value="Shelter Expense">Shelter Expense</option>
              <option value="Supply Purchase">Supply Purchase</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Bill Amount (INR) *</label>
            <input type="number" step="0.01" min="1" required placeholder="e.g. 25000.00" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Bill Date</label>
            <input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsExpenseModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}>{isSubmitting ? "Logging..." : "Log Expense"}</button>
          </div>
        </form>
      </Modal>

      {/* Donation Status Update Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Donation Status">
        <form onSubmit={handleStatusUpdate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0, fontSize: "14px" }}>
            Update status for donation <strong>{selectedDonation?.id ? String(selectedDonation.id) : "—"}</strong>:
          </p>
          <select value={donationStatusDraft} onChange={(e) => setDonationStatusDraft(e.target.value as DonationStatus)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", outline: "none" }}>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsStatusModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer" }}>{isSubmitting ? "Updating..." : "Update Status"}</button>
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
            <button type="button" onClick={() => setIsReportModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={handleExportReport} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600, cursor: "pointer" }}>Download PDF Report</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
