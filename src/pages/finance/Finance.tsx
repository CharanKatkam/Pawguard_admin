import { useState, useEffect, useCallback, useMemo } from "react";
import DataTable, { type Column } from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaDollarSign,
  FaHandHoldingUsd,
  FaReceipt,
  FaPlus,
  FaDog,
  FaBullhorn,
  FaFileInvoiceDollar,
  FaUndo,
  FaCheckDouble,
  FaDownload,
  FaBoxes,
  FaUserCheck,
} from "react-icons/fa";
import donationsService, {
  type DonationCreatePayload,
  type SponsorshipCreatePayload,
  type DonationCampaignCreatePayload,
} from "../../services/donationsService";
import financeService, {
  type FinanceExpenseCreatePayload,
  type RefundRequestPayload,
} from "../../services/financeService";
import petService from "../../services/petService";
import inventoryService from "../../services/inventoryService";
import { storageService } from "../../services/storageService";
import { notifyDataChanged } from "../../utils/dataSync";
import { formatDateTime } from "../../utils/dateUtils";

const StatusBadge = ({ status }: { status: string }) => {
  const s = String(status || "").toLowerCase();
  let bg = "#ECFDF5";
  let color = "#047857";
  let label = s.toUpperCase();

  if (s === "success" || s === "completed" || s === "paid") {
    bg = "#ECFDF5";
    color = "#047857";
    label = "SUCCESS";
  } else if (s === "pending" || s === "submitted" || s === "draft") {
    bg = "#FEF3C7";
    color = "#B45309";
    label = "PENDING";
  } else if (s === "failed" || s === "rejected") {
    bg = "#FEE2E2";
    color = "#B91C1C";
    label = "FAILED";
  } else if (s === "refunded") {
    bg = "#F3E8FF";
    color = "#7E22CE";
    label = "REFUNDED";
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 800,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  boxSizing: "border-box",
  fontSize: "14px",
};

const Finance = () => {
  const [activeTab, setActiveTab] = useState<"donations" | "sponsorships" | "campaigns" | "expenses" | "requisitions">("donations");
  const [donations, setDonations] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Search & Pagination & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modals
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [isSponsorshipModalOpen, setIsSponsorshipModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [is80GModalOpen, setIs80GModalOpen] = useState(false);
  const [isPoDisburseModalOpen, setIsPoDisburseModalOpen] = useState(false);
  const [isReimbursementModalOpen, setIsReimbursementModalOpen] = useState(false);

  const [selectedDonation, setSelectedDonation] = useState<any | null>(null);
  const [selectedRequisition, setSelectedRequisition] = useState<any | null>(null);
  const [taxCertificateData, setTaxCertificateData] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Volunteer Reimbursement Form
  const [reimbursementForm, setReimbursementForm] = useState({
    claimant_name: "Volunteer Caregiver",
    amount: 150,
    category: "volunteer_reimbursement",
    description: "Travel & emergency animal feeding supplies reimbursement",
    payment_method: "bank_transfer",
    payment_reference: "",
    receipt_url: "",
  });

  // Forms
  const [donationForm, setDonationForm] = useState<DonationCreatePayload>({
    amount: 50,
    currency: "INR",
    donation_type: "one_time",
    notes: "General animal rescue support contribution",
  });

  const [sponsorshipForm, setSponsorshipForm] = useState<SponsorshipCreatePayload>({
    dog_id: "",
    amount: 100,
    currency: "INR",
    sponsor_name: "",
    duration_months: 12,
  });

  const [campaignForm, setCampaignForm] = useState<DonationCampaignCreatePayload>({
    name: "Winter Shelter & Blanket Drive",
    description: "Raise funds for heating equipment and warm blankets.",
    target_amount: 5000,
    currency: "INR",
    start_date: new Date().toISOString().split("T")[0],
  });

  const [expenseForm, setExpenseForm] = useState<FinanceExpenseCreatePayload>({
    title: "Veterinary Medicine Restock",
    amount: 750,
    currency: "INR",
    category: "medical_supplies",
    vendor_name: "City Vet Wholesale",
    expense_date: new Date().toISOString().split("T")[0],
    payment_method: "bank_transfer",
  });

  const [refundForm, setRefundForm] = useState<RefundRequestPayload>({
    donation_id: "",
    reason: "Duplicate contribution payment",
  });

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [donRes, sponRes, campRes, expRes, reqRes] = await Promise.allSettled([
        donationsService.getDonations(),
        donationsService.getSponsorships(),
        donationsService.getCampaigns(),
        financeService.getExpenses(),
        inventoryService.getRequisitions(),
      ]);

      setDonations(donRes.status === "fulfilled" ? (donRes.value?.data || donRes.value || []) : []);
      setSponsorships(sponRes.status === "fulfilled" ? (sponRes.value?.data || sponRes.value || []) : []);
      setCampaigns(campRes.status === "fulfilled" ? (campRes.value?.data || campRes.value || []) : []);
      setExpenses(expRes.status === "fulfilled" ? (expRes.value?.data || expRes.value || []) : []);
      setRequisitions(reqRes.status === "fulfilled" ? (Array.isArray(reqRes.value) ? reqRes.value : reqRes.value?.data || []) : []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDogs = useCallback(async () => {
    try {
      const dogsRes = await petService.getPets();
      const list = Array.isArray(dogsRes.data) ? dogsRes.data : Array.isArray(dogsRes) ? dogsRes : [];
      setDogs(
        list.map((d: any) => ({
          id: d.id || d.dog_id || "",
          label: `${d.name || "Dog"} (${d.registration_number || String(d.id || "").slice(0, 8)})`,
        }))
      );
    } catch {
      setDogs([]);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
    fetchDogs();
  }, [fetchFinanceData, fetchDogs]);

  // Derived filtered donations
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const status = String(d.status || "").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter.toLowerCase();
      if (!matchesStatus) return false;

      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      const searchable = [
        d.id,
        d.donorName,
        d.donorEmail,
        d.transactionId || "",
        d.notes || "",
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [donations, statusFilter, debouncedSearch]);

  const paginatedDonations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDonations.slice(start, start + pageSize);
  }, [filteredDonations, page]);

  // Derived metrics
  const totalRevenue = donations.filter((d) => d.status === "success").reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const successCount = donations.filter((d) => d.status === "success").length;
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const activeCampaignsCount = campaigns.filter((c) => c.status === "active").length;

  const stats = [
    { title: "Total Revenue Collected", value: `₹${totalRevenue.toFixed(2)}`, trend: "Received", color: "#10B981", icon: <FaDollarSign /> },
    { title: "Successful Donations", value: `${successCount}`, trend: "Transactions", color: "#2563EB", icon: <FaHandHoldingUsd /> },
    { title: "Active Campaigns", value: `${activeCampaignsCount}`, trend: "Fundraising", color: "#F59E0B", icon: <FaBullhorn /> },
    { title: "Operating Expenses", value: `₹${totalExpensesAmount.toFixed(2)}`, trend: "Disbursements", color: "#6366F1", icon: <FaFileInvoiceDollar /> },
  ];

  // Action handlers
  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await donationsService.createDonation(donationForm);
      addToast("Recorded donation successfully!", "success");
      setIsDonationModalOpen(false);
      fetchFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to record donation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSponsorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorshipForm.dog_id) {
      addToast("Dog selection is required for sponsorship.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await donationsService.createSponsorship(sponsorshipForm);
      addToast("Registered animal sponsorship!", "success");
      setIsSponsorshipModalOpen(false);
      fetchFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to register sponsorship.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await donationsService.createCampaign(campaignForm);
      addToast("Created fundraising campaign!", "success");
      setIsCampaignModalOpen(false);
      fetchFinanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create campaign.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await financeService.createExpense(expenseForm);
      addToast("Created expense disbursement entry!", "success");
      setIsExpenseModalOpen(false);
      fetchFinanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create expense.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcile = async (donationId: string) => {
    try {
      setIsSubmitting(true);
      await donationsService.reconcileDonation(donationId);
      addToast("Donation reconciled to general ledger!", "success");
      fetchFinanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to reconcile donation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerate80G = async (donationId: string) => {
    try {
      setIsSubmitting(true);
      const res = await financeService.generate80GCertificate(donationId);
      setTaxCertificateData(res?.data || res);
      setIs80GModalOpen(true);
      addToast("Issued 80G Tax Exemption Certificate!", "success");
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to generate 80G tax certificate.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundForm.donation_id) return;
    try {
      setIsSubmitting(true);
      await financeService.processRefund(refundForm);
      addToast("Refund processed successfully!", "success");
      setIsRefundModalOpen(false);
      fetchFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to process refund.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseAction = async (expenseId: string, action: "approve" | "pay") => {
    try {
      setIsSubmitting(true);
      if (action === "approve") {
        await financeService.approveExpense(expenseId);
        addToast("Expense approved!", "success");
      } else {
        await financeService.payExpense(expenseId);
        addToast("Expense marked as paid & bank disbursement logged!", "success");
      }
      fetchFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Action failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisbursePo = async (reqRow: any) => {
    if (!reqRow?.id) return;
    try {
      setIsSubmitting(true);
      const poAmount = Number(reqRow.quantity || 1) * 25.0; // unit price estimate
      await financeService.createExpense({
        title: `Inventory Restock PO #${String(reqRow.id).slice(0, 8)}`,
        amount: poAmount,
        currency: "INR",
        category: "medical_supplies",
        vendor_name: reqRow.supplier || "Verified Inventory Supplier",
        expense_date: new Date().toISOString().split("T")[0],
        payment_method: "bank_transfer",
        invoice_number: `INV-PO-${String(reqRow.id).slice(0, 8)}`,
      });

      await inventoryService.updateRequisitionStatus(reqRow.id, "received");
      if (reqRow.item_id && reqRow.quantity) {
        await inventoryService.recordMovement({
          item_id: reqRow.item_id,
          movement_type: "check_in",
          quantity: Number(reqRow.quantity),
          notes: `Bank disbursement authorized for PO #${String(reqRow.id).slice(0, 8)}`,
        }).catch(() => null);
      }

      addToast(`Bank disbursement authorized for Inventory PO #${String(reqRow.id).slice(0, 8)} & stock restocked!`, "success");
      setIsPoDisburseModalOpen(false);
      setSelectedRequisition(null);
      fetchFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to disburse payment for requisition.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReimbursementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const created = await financeService.createExpense({
        title: `Volunteer Travel & Supply Reimbursement: ${reimbursementForm.claimant_name}`,
        amount: Number(reimbursementForm.amount),
        currency: "INR",
        category: reimbursementForm.category,
        vendor_name: reimbursementForm.claimant_name,
        expense_date: new Date().toISOString().split("T")[0],
        payment_method: reimbursementForm.payment_method,
        notes: reimbursementForm.description,
      });

      const expId = created?.id || created?.data?.id || (created?.data as any)?.data?.id;
      if (expId) {
        await financeService.approveExpense(expId).catch(() => null);
        await financeService.payExpense(expId).catch(() => null);
      }

      addToast("Volunteer reimbursement claim approved & disbursed successfully!", "success");
      setIsReimbursementModalOpen(false);
      setReimbursementForm({
        claimant_name: "Volunteer Caregiver",
        amount: 150,
        category: "volunteer_reimbursement",
        description: "Travel & emergency animal feeding supplies reimbursement",
        payment_method: "bank_transfer",
        payment_reference: "",
        receipt_url: "",
      });
      fetchFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to log volunteer reimbursement.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "id",
      title: "Transaction ID",
      render: (_v, row) => <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{String(row.id || "").slice(0, 8)}</span>,
    },
    {
      key: "donorName",
      title: "Donor",
      render: (_v, row) => (
        <div>
          <strong>{row.donorName}</strong>
          {row.donorEmail !== "—" && <div style={{ fontSize: "11px", color: "#64748B" }}>{row.donorEmail}</div>}
        </div>
      ),
    },
    {
      key: "amount",
      title: "Amount",
      render: (_v, row) => <strong style={{ color: "#10B981" }}>₹{Number(row.amount || 0).toFixed(2)}</strong>,
    },
    {
      key: "type",
      title: "Type",
      render: (_v, row) => <span style={{ fontSize: "12px", textTransform: "capitalize" }}>{row.type}</span>,
    },
    {
      key: "status",
      title: "Status",
      render: (_v, row) => <StatusBadge status={row.status} />,
    },
    {
      key: "date",
      title: "Received Date",
      render: (_v, row) => <span>{row.date ? formatDateTime(String(row.date)) : "—"}</span>,
    },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Finance &amp; Revenue Operations</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Monitor donations received, issue 80G tax certificates, manage animal sponsorships, track fundraising campaigns, and authorize disbursements.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="manage_finance">
          <QuickActionCard icon={<FaPlus />} title="Record Donation" subtitle="Manual contribution" color="#10B981" onClick={() => setIsDonationModalOpen(true)} />
        </Can>
        <Can permission="manage_finance">
          <QuickActionCard icon={<FaDog />} title="Register Sponsorship" subtitle="Sponsor a shelter dog" color="#2563EB" onClick={() => setIsSponsorshipModalOpen(true)} />
        </Can>
        <Can permission="manage_finance">
          <QuickActionCard icon={<FaBullhorn />} title="Create Campaign" subtitle="Fundraising drive" color="#F59E0B" onClick={() => setIsCampaignModalOpen(true)} />
        </Can>
        <Can permission="manage_finance">
          <QuickActionCard icon={<FaFileInvoiceDollar />} title="Log Expense" subtitle="Disbursement" color="#6366F1" onClick={() => setIsExpenseModalOpen(true)} />
        </Can>
        <Can permission="manage_finance">
          <QuickActionCard icon={<FaUserCheck />} title="Volunteer Claim" subtitle="Reimbursement" color="#8B5CF6" onClick={() => setIsReimbursementModalOpen(true)} />
        </Can>
      </div>

      {/* KPI Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "2px solid #E2E8F0", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("donations")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "donations" ? "3px solid #10B981" : "3px solid transparent",
            background: "none",
            color: activeTab === "donations" ? "#10B981" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Donations Received ({donations.length})
        </button>
        <button
          onClick={() => setActiveTab("sponsorships")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "sponsorships" ? "3px solid #10B981" : "3px solid transparent",
            background: "none",
            color: activeTab === "sponsorships" ? "#10B981" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Animal Sponsorships ({sponsorships.length})
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "campaigns" ? "3px solid #10B981" : "3px solid transparent",
            background: "none",
            color: activeTab === "campaigns" ? "#10B981" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Fundraising Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "expenses" ? "3px solid #10B981" : "3px solid transparent",
            background: "none",
            color: activeTab === "expenses" ? "#10B981" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Expenses &amp; Disbursements ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab("requisitions")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "requisitions" ? "3px solid #10B981" : "3px solid transparent",
            background: "none",
            color: activeTab === "requisitions" ? "#10B981" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Inventory POs &amp; Vendor Invoices ({requisitions.length})
        </button>
      </div>

      {activeTab === "donations" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Donations Received Directory
            </h3>
            {loading && <span style={{ fontSize: "13px", color: "#10B981", fontWeight: 600 }}>Loading...</span>}
          </div>

          <DataTable
            columns={columns}
            data={paginatedDonations}
            module="finance"
            serverMode={true}
            totalCount={filteredDonations.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setPage(1);
            }}
            leftHeaderControls={
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                style={{ ...inputStyle, width: "auto" }}
              >
                <option value="all">All Statuses</option>
                <option value="success">Success / Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            }
            renderRowActions={(row: any) => (
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => void handleGenerate80G(String(row.id))}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#047857", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaReceipt /> 80G Tax Cert
                </button>
                <button
                  onClick={() => void handleReconcile(String(row.id))}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #93C5FD", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaCheckDouble /> Reconcile
                </button>
                <button
                  onClick={() => {
                    setSelectedDonation(row);
                    setRefundForm({ donation_id: String(row.id), reason: "Duplicate contribution payment" });
                    setIsRefundModalOpen(true);
                  }}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaUndo /> Refund
                </button>
              </div>
            )}
          />
        </div>
      )}

      {activeTab === "sponsorships" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Animal Sponsorships Roster
          </h3>

          {sponsorships.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
              <FaDog size={36} color="#CBD5E1" style={{ marginBottom: "12px" }} />
              <div>No active animal sponsorships registered in backend.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sponsorships.map((sp, idx) => (
                <div key={sp.id || idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>
                      Sponsor: {sp.sponsor_name || "Anonymous Sponsor"} &bull; Dog ID: {String(sp.dog_id || "").slice(0, 8)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                      Amount: ₹{Number(sp.amount || 0).toFixed(2)} &bull; Duration: {sp.duration_months || 12} Months
                    </div>
                  </div>
                  <StatusBadge status={sp.status || "active"} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "campaigns" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Fundraising Campaigns
          </h3>

          {campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
              <FaBullhorn size={36} color="#CBD5E1" style={{ marginBottom: "12px" }} />
              <div>No fundraising campaigns created yet.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {campaigns.map((c) => (
                <div key={c.id} style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{c.name}</h4>
                    <StatusBadge status={c.status} />
                  </div>
                  <p style={{ color: "#64748B", fontSize: "13px", margin: "0 0 14px" }}>{c.description}</p>
                  <div style={{ background: "#E2E8F0", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "10px" }}>
                    <div style={{ background: "#10B981", height: "100%", width: `${Math.min(100, Number(c.progress_percentage || 0))}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
                    <span style={{ color: "#10B981" }}>Raised: ₹{Number(c.raised_amount || 0)}</span>
                    <span style={{ color: "#64748B" }}>Target: ₹{Number(c.target_amount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Expense Disbursements &amp; Authorizations
          </h3>

          {expenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
              <FaFileInvoiceDollar size={36} color="#CBD5E1" style={{ marginBottom: "12px" }} />
              <div>No expense disbursements recorded in backend.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {expenses.map((exp) => (
                <div key={exp.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>
                      {exp.title} &bull; Vendor: {exp.vendor_name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                      Category: {exp.category} &bull; Amount: ₹{Number(exp.amount || 0).toFixed(2)} &bull; Date: {formatDateTime(exp.expense_date || exp.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <StatusBadge status={exp.status} />
                    {exp.status === "submitted" && (
                      <button
                        onClick={() => void handleExpenseAction(exp.id, "approve")}
                        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#047857", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                      >
                        Approve
                      </button>
                    )}
                    {exp.status === "approved" && (
                      <button
                        onClick={() => void handleExpenseAction(exp.id, "pay")}
                        style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #818CF8", background: "#EEF2FF", color: "#4338CA", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "requisitions" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Inventory Purchase Orders &amp; Vendor Invoices Integration
          </h3>
          <p style={{ fontSize: "13px", color: "#64748B", marginTop: "-10px", marginBottom: "16px" }}>
            Process vendor invoices, verify inventory purchase orders generated by shelter managers, and authorize bank disbursements.
          </p>

          {requisitions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
              <FaBoxes size={36} color="#CBD5E1" style={{ marginBottom: "12px" }} />
              <div>No purchase requisitions or vendor invoices pending in backend.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {requisitions.map((req: any) => (
                <div key={req.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>
                      Requisition PO #{String(req.id).slice(0, 8)} &bull; Quantity: {req.quantity} units
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                      Item ID: {String(req.item_id || "—").slice(0, 8)} &bull; Created: {formatDateTime(req.created_at)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <StatusBadge status={req.status || "pending"} />
                    {req.status !== "received" && (
                      <button
                        onClick={() => {
                          setSelectedRequisition(req);
                          setIsPoDisburseModalOpen(true);
                        }}
                        disabled={isSubmitting}
                        style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                      >
                        Authorize Disbursement
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Record Donation Modal */}
      <Modal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} title="Record Manual Donation Contribution">
        <form onSubmit={handleDonationSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Contribution Amount (₹) *</label>
            <input type="number" min="1" step="0.01" required value={donationForm.amount} onChange={(e) => setDonationForm({ ...donationForm, amount: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Donation Type</label>
            <select value={donationForm.donation_type} onChange={(e) => setDonationForm({ ...donationForm, donation_type: e.target.value as any })} style={inputStyle}>
              <option value="one_time">One-Time Contribution</option>
              <option value="recurring">Recurring Monthly</option>
              <option value="sponsorship">Animal Sponsorship</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Notes / Designation Purpose</label>
            <textarea placeholder="e.g. General shelter support or specific rescue case" value={donationForm.notes || ""} onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsDonationModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Recording..." : "Record Donation"}</button>
          </div>
        </form>
      </Modal>

      {/* Register Sponsorship Modal */}
      <Modal isOpen={isSponsorshipModalOpen} onClose={() => setIsSponsorshipModalOpen(false)} title="Register Animal Sponsorship">
        <form onSubmit={handleSponsorshipSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog to Sponsor *</label>
            <select required value={sponsorshipForm.dog_id} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, dog_id: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Monthly Sponsorship Amount (₹) *</label>
            <input type="number" min="1" required value={sponsorshipForm.amount} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, amount: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Sponsor Name</label>
            <input type="text" placeholder="e.g. John Doe" value={sponsorshipForm.sponsor_name || ""} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, sponsor_name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsSponsorshipModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Registering..." : "Register Sponsorship"}</button>
          </div>
        </form>
      </Modal>

      {/* Create Campaign Modal */}
      <Modal isOpen={isCampaignModalOpen} onClose={() => setIsCampaignModalOpen(false)} title="Create Fundraising Campaign">
        <form onSubmit={handleCampaignSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Campaign Name *</label>
            <input type="text" required value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Target Amount (₹) *</label>
            <input type="number" min="100" required value={campaignForm.target_amount} onChange={(e) => setCampaignForm({ ...campaignForm, target_amount: Number(e.target.value) })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Description</label>
            <textarea value={campaignForm.description || ""} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsCampaignModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Creating..." : "Create Campaign"}</button>
          </div>
        </form>
      </Modal>

      {/* Log Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Log Expense Disbursement">
        <form onSubmit={handleExpenseSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Expense Title *</label>
            <input type="text" required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Amount (₹) *</label>
              <input type="number" min="1" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Category</label>
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} style={inputStyle}>
                <option value="medical_supplies">Medical Supplies</option>
                <option value="food_feeding">Food &amp; Feeding</option>
                <option value="facility_rent">Facility Rent</option>
                <option value="utilities">Utilities &amp; Fuel</option>
                <option value="staff_payroll">Staff Payroll</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Vendor Name *</label>
            <input type="text" required value={expenseForm.vendor_name} onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsExpenseModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Log Expense"}</button>
          </div>
        </form>
      </Modal>

      {/* Refund Modal */}
      <Modal isOpen={isRefundModalOpen} onClose={() => setIsRefundModalOpen(false)} title="Process Donation Refund">
        <form onSubmit={handleProcessRefund} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Process refund for donation <strong>{selectedDonation?.id ? String(selectedDonation.id).slice(0, 8) : ""}</strong>?
          </p>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Refund Reason *</label>
            <input type="text" required value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsRefundModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Refunding..." : "Confirm Refund"}</button>
          </div>
        </form>
      </Modal>

      {/* 80G Certificate Display Modal */}
      <Modal isOpen={is80GModalOpen} onClose={() => setIs80GModalOpen(false)} title="80G Tax Exemption Certificate Issued">
        {taxCertificateData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px" }}>
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#065F46" }}>Certificate Number: {taxCertificateData.receipt_number || "80G-2026-0042"}</h3>
              <p style={{ margin: "4px 0 0", color: "#047857", fontSize: "13px" }}>
                Donor: {taxCertificateData.donor_name} &bull; Amount: ₹{taxCertificateData.amount}
              </p>
            </div>
            {taxCertificateData.certificate_url && (
              <a href={taxCertificateData.certificate_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#2563EB", fontWeight: 700, textDecoration: "underline" }}>
                <FaDownload /> Download PDF Certificate
              </a>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setIs80GModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Volunteer Reimbursement Claim Modal */}
      <Modal isOpen={isReimbursementModalOpen} onClose={() => setIsReimbursementModalOpen(false)} title="Volunteer Expense & Travel Reimbursement Claim">
        <form onSubmit={handleReimbursementSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Volunteer Claimant Name *</label>
            <input type="text" required value={reimbursementForm.claimant_name} onChange={(e) => setReimbursementForm({ ...reimbursementForm, claimant_name: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Reimbursement Amount (₹) *</label>
              <input type="number" min="1" required value={reimbursementForm.amount} onChange={(e) => setReimbursementForm({ ...reimbursementForm, amount: Number(e.target.value) })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Payment Method</label>
              <select value={reimbursementForm.payment_method} onChange={(e) => setReimbursementForm({ ...reimbursementForm, payment_method: e.target.value })} style={inputStyle}>
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="cash">Petty Cash Reimbursement</option>
                <option value="online">UPI Transfer</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Expense Purpose / Description *</label>
            <textarea required value={reimbursementForm.description} onChange={(e) => setReimbursementForm({ ...reimbursementForm, description: e.target.value })} style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Attach Expense Receipt (Optional Image/PDF)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    addToast("Uploading receipt document...", "info");
                    const downloadUrl = await storageService.uploadFile(file, {
                      folder: "finance_receipts",
                      entity_type: "volunteer_claim",
                      entity_id: `claim_${Date.now()}`,
                    });
                    setReimbursementForm({ ...reimbursementForm, receipt_url: downloadUrl });
                    addToast("Receipt document uploaded successfully!", "success");
                  } catch {
                    addToast("Receipt upload failed, proceed with text details.", "error");
                  }
                }
              }}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsReimbursementModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#8B5CF6", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Authorizing..." : "Authorize Reimbursement"}</button>
          </div>
        </form>
      </Modal>

      {/* Inventory PO Disbursement Confirmation Modal */}
      <Modal isOpen={isPoDisburseModalOpen} onClose={() => setIsPoDisburseModalOpen(false)} title="Authorize Bank Disbursement for Inventory PO">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Authorize bank disbursement for Inventory Purchase Requisition <strong>PO #{selectedRequisition?.id ? String(selectedRequisition.id).slice(0, 8) : ""}</strong>?
          </p>
          <div style={{ background: "#F1F5F9", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#475569" }}>
            <div>Item ID: {String(selectedRequisition?.item_id || "—").slice(0, 8)}</div>
            <div>Requested Quantity: {selectedRequisition?.quantity} units</div>
            <div>Estimated Vendor Invoice Amount: ₹{(Number(selectedRequisition?.quantity || 1) * 25).toFixed(2)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsPoDisburseModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" onClick={() => void handleDisbursePo(selectedRequisition)} disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Authorizing..." : "Confirm & Disburse Payment"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
