import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaCoins,
  FaHandHoldingHeart,
  FaChartLine,
  FaPlus,
  FaDownload,
  FaFilter,
  FaSearch,
  FaUndo,
  FaCheckDouble,
  FaDog,
  FaEdit,
} from "react-icons/fa";
import donationsService, {
  type DonationType,
  type DonationStatus,
  isCompletedDonationStatus,
  isRefundedDonationStatus,
  isValidSponsorshipStatus,
} from "../../services/donationsService";
import { notifyDataChanged } from "../../utils/dataSync";
import { formatDateTime } from "../../utils/dateUtils";

type TabKey = "donations" | "sponsorships" | "donors";

const DONATION_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Donation Types" },
  { value: "one_time", label: "One-Time Donation" },
  { value: "recurring", label: "Recurring Monthly" },
  { value: "sponsorship", label: "Dog Sponsorship" },
];

const DONATION_STATUSES: Array<{ value: DonationStatus | ""; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
];

const SPONSORSHIP_STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

const numericValue = (val: unknown): number => {
  const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (val: unknown): string =>
  `₹${numericValue(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Finance = () => {
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const act = searchParams.get("action") || searchParams.get("tab");
    if (act === "sponsorship" || act === "sponsorships") return "sponsorships";
    if (act === "donor" || act === "donors") return "donors";
    return "donations";
  });

  // Data States
  const [donations, setDonations] = useState<Record<string, unknown>[]>([]);
  const [sponsorships, setSponsorships] = useState<Record<string, unknown>[]>([]);
  const [donors, setDonors] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [donationFilterType, setDonationFilterType] = useState("");
  const [donationFilterStatus, setDonationFilterStatus] = useState("");
  const [sponsorshipFilterStatus, setSponsorshipFilterStatus] = useState("");

  // Modals state
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(() => searchParams.get("action") === "donation");
  const [isSponsorshipModalOpen, setIsSponsorshipModalOpen] = useState(() => searchParams.get("action") === "sponsorship");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSponStatusModalOpen, setIsSponStatusModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);

  const [selectedDonation, setSelectedDonation] = useState<Record<string, unknown> | null>(null);
  const [selectedSponsorship, setSelectedSponsorship] = useState<Record<string, unknown> | null>(null);

  const [donationStatusDraft, setDonationStatusDraft] = useState<DonationStatus>("completed");
  const [sponsorshipStatusDraft, setSponsorshipStatusDraft] = useState<string>("active");
  const [reconcileNotesDraft, setReconcileNotesDraft] = useState<string>("Verified & Reconciled by Finance User");

  // Form states
  const [donationForm, setDonationForm] = useState({
    amount: "",
    currency: "INR",
    donation_type: "one_time" as DonationType,
    notes: "",
    donor_name: "",
    donor_email: "",
    donor_phone: "",
    payment_method: "UPI / Online Payment",
    transaction_id: "",
    purpose: "General Animal Shelter Support",
  });

  const [sponsorshipForm, setSponsorshipForm] = useState({
    dog_id: "",
    amount: "",
    currency: "INR",
    sponsor_name: "",
    sponsor_email: "",
    sponsor_phone: "",
    payment_method: "Razorpay / Online",
    duration_months: 12,
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [donRes, sponRes, donorRes] = await Promise.allSettled([
        donationsService.getDonations(),
        donationsService.getSponsorships(),
        donationsService.getDonors(),
      ]);

      const donList = donRes.status === "fulfilled" ? (Array.isArray(donRes.value?.data) ? donRes.value.data : Array.isArray(donRes.value) ? donRes.value : []) : [];
      const sponList = sponRes.status === "fulfilled" ? (Array.isArray(sponRes.value?.data) ? sponRes.value.data : Array.isArray(sponRes.value) ? sponRes.value : []) : [];
      const donorList = donorRes.status === "fulfilled" ? (Array.isArray(donorRes.value?.data) ? donorRes.value.data : Array.isArray(donorRes.value) ? donorRes.value : []) : [];

      const sortedDonations = [...donList].sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.date || a.payment_date || 0).getTime();
        const timeB = new Date(b.created_at || b.date || b.payment_date || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      const sortedSponsorships = [...sponList].sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.start_date || a.date || 0).getTime();
        const timeB = new Date(b.created_at || b.start_date || b.date || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      const sortedDonors = [...donorList].sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.last_donation_date || 0).getTime();
        const timeB = new Date(b.created_at || b.last_donation_date || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setDonations(sortedDonations);
      setSponsorships(sortedSponsorships);
      setDonors(sortedDonors);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllFinanceData();
  }, [fetchAllFinanceData]);

  // Derived Totals
  const totalDonationsSum = useMemo(
    () =>
      donations
        .filter((d) => isCompletedDonationStatus(d.status))
        .reduce((sum, d) => sum + numericValue(d.amount), 0),
    [donations]
  );

  const sponsorshipRevenueSum = useMemo(
    () =>
      sponsorships
        .filter((s) => isValidSponsorshipStatus(s.status))
        .reduce((sum, s) => sum + numericValue(s.amount), 0),
    [sponsorships]
  );

  const totalRefundsSum = useMemo(
    () =>
      donations
        .filter((d) => isRefundedDonationStatus(d.status))
        .reduce((sum, d) => sum + numericValue(d.amount), 0),
    [donations]
  );

  const netBalanceVal = totalDonationsSum + sponsorshipRevenueSum - totalRefundsSum;

  // Filtered Datasets
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const donor = String(d.donorName || d.donor_name || d.donor_email || d.donorEmail || "").toLowerCase();
      const notes = String(d.notes || d.purpose || "").toLowerCase();
      const txId = String(d.id || d.transactionId || "").toLowerCase();
      const matchesQ = !q || donor.includes(q) || notes.includes(q) || txId.includes(q);
      const matchesType = !donationFilterType || String(d.type || d.donation_type || "").toLowerCase() === donationFilterType.toLowerCase();
      const matchesStatus = !donationFilterStatus || String(d.status || "").toLowerCase() === donationFilterStatus.toLowerCase();
      return matchesQ && matchesType && matchesStatus;
    });
  }, [donations, searchQuery, donationFilterType, donationFilterStatus]);

  const filteredSponsorships = useMemo(() => {
    return sponsorships.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const sponsor = String(s.sponsor_name || s.donor_name || (s.user as any)?.full_name || "").toLowerCase();
      const dogName = String(s.dog_name || s.pet_name || s.dog_id || "").toLowerCase();
      const matchesQ = !q || sponsor.includes(q) || dogName.includes(q);
      const matchesStatus = !sponsorshipFilterStatus || String(s.status || "").toLowerCase() === sponsorshipFilterStatus.toLowerCase();
      return matchesQ && matchesStatus;
    });
  }, [sponsorships, searchQuery, sponsorshipFilterStatus]);

  const filteredDonors = useMemo(() => {
    return donors.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const name = String(d.full_name || d.name || d.donor_name || "").toLowerCase();
      const email = String(d.email || d.donor_email || "").toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    });
  }, [donors, searchQuery]);

  // Action Handlers
  const handleRecordDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationForm.amount || Number(donationForm.amount) <= 0) {
      addToast("Valid donation amount is required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await donationsService.createDonation({
        amount: Number(donationForm.amount),
        currency: donationForm.currency,
        donation_type: donationForm.donation_type,
        donor_name: donationForm.donor_name || "Anonymous Donor",
        donor_email: donationForm.donor_email || undefined,
        donor_phone: donationForm.donor_phone || undefined,
        payment_method: donationForm.payment_method,
        transaction_id: donationForm.transaction_id || `TX-${Date.now()}`,
        purpose: donationForm.purpose,
        notes: donationForm.notes,
      });

      addToast("Donation recorded successfully!", "success");
      setIsDonationModalOpen(false);
      setDonationForm({
        amount: "",
        currency: "INR",
        donation_type: "one_time",
        notes: "",
        donor_name: "",
        donor_email: "",
        donor_phone: "",
        payment_method: "UPI / Online Payment",
        transaction_id: "",
        purpose: "General Animal Shelter Support",
      });
      fetchAllFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to record donation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSponsorshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorshipForm.dog_id || !sponsorshipForm.amount || Number(sponsorshipForm.amount) <= 0) {
      addToast("Valid Dog Reference ID and Amount are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await donationsService.createSponsorship({
        dog_id: sponsorshipForm.dog_id,
        amount: Number(sponsorshipForm.amount),
        currency: sponsorshipForm.currency,
        sponsor_name: sponsorshipForm.sponsor_name || "Sponsor",
        sponsor_email: sponsorshipForm.sponsor_email || undefined,
        sponsor_phone: sponsorshipForm.sponsor_phone || undefined,
        payment_method: sponsorshipForm.payment_method,
        duration_months: Number(sponsorshipForm.duration_months) || 12,
        notes: sponsorshipForm.notes,
      });

      addToast("Dog sponsorship registered successfully!", "success");
      setIsSponsorshipModalOpen(false);
      setSponsorshipForm({ dog_id: "", amount: "", currency: "INR", sponsor_name: "", sponsor_email: "", sponsor_phone: "", payment_method: "Razorpay / Online", duration_months: 12, notes: "" });
      fetchAllFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to register sponsorship.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDonationStatus = async () => {
    if (!selectedDonation?.id) return;
    try {
      setIsSubmitting(true);
      await donationsService.updateDonationStatus(String(selectedDonation.id), donationStatusDraft);
      addToast(`Donation status updated to ${donationStatusDraft.toUpperCase()}!`, "success");
      setIsStatusModalOpen(false);
      setSelectedDonation(null);
      fetchAllFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to update donation status.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSponsorshipStatus = async () => {
    if (!selectedSponsorship?.id) return;
    try {
      setIsSubmitting(true);
      await donationsService.updateSponsorshipStatus(String(selectedSponsorship.id), sponsorshipStatusDraft);
      addToast(`Sponsorship status set to ${sponsorshipStatusDraft.toUpperCase()}!`, "success");
      setIsSponStatusModalOpen(false);
      setSelectedSponsorship(null);
      fetchAllFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to update sponsorship status.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcileSubmit = async () => {
    if (!selectedDonation?.id) return;
    try {
      setIsSubmitting(true);
      await donationsService.reconcileDonation(String(selectedDonation.id), reconcileNotesDraft);
      addToast(`Donation ${String(selectedDonation.id).slice(0, 8)} reconciled successfully!`, "success");
      setIsReconcileModalOpen(false);
      setSelectedDonation(null);
      fetchAllFinanceData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to reconcile donation.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = async (record: any) => {
    const targetId = record.id || record.donation_id || record.donationId || record.txId || record.transactionId;
    if (!targetId) {
      addToast("Receipt not available for this donation", "error");
      return;
    }
    try {
      addToast("Resolving receipt document...", "info");
      const res = await donationsService.getDonationReceipt(String(targetId));
      const data = res?.data ?? res;
      const url = data?.receipt_url || data?.url || data?.download_url || data?.pdf_url || res?.receipt_url || res?.url;

      if (url) {
        window.open(url, "_blank");
        addToast("Receipt opened successfully!", "success");
        return;
      }

      if (data instanceof Blob || (typeof data === "string" && data.startsWith("%PDF"))) {
        const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `receipt_${String(targetId).slice(0, 8)}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast("Receipt downloaded successfully!", "success");
        return;
      }

      addToast("Receipt not available for this donation", "error");
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) {
        addToast("Receipt not available for this donation", "error");
      } else {
        addToast(err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Receipt not available for this donation", "error");
      }
    }
  };

  // Table Columns Setup
  const donationColumns = [
    {
      key: "id",
      header: "Donation ID",
      render: (v: string, r: any) => (
        <div>
          <strong style={{ color: "#0F172A" }}>{String(v).slice(0, 8)}</strong>
          {r.transactionId && <div style={{ fontSize: "11px", color: "#64748B" }}>Tx: {r.transactionId}</div>}
        </div>
      ),
    },
    {
      key: "donorName",
      header: "Donor / Reference",
      render: (v: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v || r.donor_name || "Anonymous Donor"}</div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>{r.donorEmail || r.donor_email || "No email"}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Donation Type",
      render: (v: string) => <span style={{ fontWeight: 700, color: "#2563EB", textTransform: "capitalize" }}>{v || "one_time"}</span>,
    },
    {
      key: "amount",
      header: "Amount (₹)",
      render: (v: unknown) => <strong style={{ color: "#047857" }}>{formatCurrency(v)}</strong>,
    },
    {
      key: "date",
      header: "Date",
      render: (v: unknown) => (v ? formatDateTime(v as string) : "-"),
    },
    {
      key: "status",
      header: "Status",
      render: (v: string) => {
        const s = String(v || "completed").toLowerCase();
        const color = s === "completed" || s === "success" ? "#047857" : s === "pending" ? "#D97706" : s === "refunded" ? "#7C3AED" : "#DC2626";
        const bg = s === "completed" || s === "success" ? "#ECFDF5" : s === "pending" ? "#FEF3C7" : s === "refunded" ? "#F3E8FF" : "#FEE2E2";
        return (
          <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
            {s}
          </span>
        );
      },
    },
  ];

  const sponsorshipColumns = [
    {
      key: "id",
      header: "Sponsorship ID",
      render: (v: string) => <strong style={{ color: "#0F172A" }}>{String(v).slice(0, 8)}</strong>,
    },
    {
      key: "sponsor_name",
      header: "Sponsor / Donor",
      render: (_: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{r.sponsor_name || r.donor_name || (r.user as any)?.full_name || "Sponsor Profile"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>{r.sponsor_email || r.donor_email || "-"}</div>
        </div>
      ),
    },
    {
      key: "dog_name",
      header: "Sponsored Dog Reference",
      render: (_: string, r: any) => (
        <span style={{ fontWeight: 700, color: "#D97706", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <FaDog /> {r.dog_name || r.pet_name || r.dog_id || "Shelter Dog"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Sponsorship Amount",
      render: (v: unknown) => <strong style={{ color: "#2563EB" }}>{formatCurrency(v)}</strong>,
    },
    {
      key: "status",
      header: "Status",
      render: (v: string) => {
        const s = String(v || "active").toLowerCase();
        const color = s === "active" || s === "completed" ? "#047857" : s === "pending" ? "#D97706" : "#DC2626";
        const bg = s === "active" || s === "completed" ? "#ECFDF5" : s === "pending" ? "#FEF3C7" : "#FEE2E2";
        return (
          <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
            {s}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: "Registered Date",
      render: (v: unknown) => (v ? formatDateTime(v as string) : "-"),
    },
  ];

  const donorColumns = [
    {
      key: "id",
      header: "Donor ID",
      render: (v: string) => <strong style={{ color: "#0F172A" }}>{String(v || "DNR").slice(0, 8)}</strong>,
    },
    {
      key: "full_name",
      header: "Donor Name",
      render: (_: string, r: any) => <strong style={{ color: "#0F172A" }}>{r.full_name || r.name || r.donor_name || "Donor Profile"}</strong>,
    },
    {
      key: "email",
      header: "Email",
      render: (v: string, r: any) => <div>{v || r.donor_email || "-"}</div>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (v: string, r: any) => <div>{v || r.donor_phone || "-"}</div>,
    },
    {
      key: "total_donated",
      header: "Total Contributions",
      render: (v: unknown) => <strong style={{ color: "#10B981" }}>{formatCurrency(v)}</strong>,
    },
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800 }}>Donations &amp; Financial Management</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Official accounting suite: manage incoming public donations, dog sponsorships, donor records, and payment reconciliation.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Donations" value={loading ? "..." : formatCurrency(totalDonationsSum)} trend="Verified Income" color="#10B981" icon={<FaCoins />} onClick={() => setActiveTab("donations")} />
        <StatCard title="Sponsorship Revenue" value={loading ? "..." : formatCurrency(sponsorshipRevenueSum)} trend="Dog Sponsorships" color="#2563EB" icon={<FaHandHoldingHeart />} onClick={() => setActiveTab("sponsorships")} />
        <StatCard title="Refunded Payments" value={loading ? "..." : formatCurrency(totalRefundsSum)} trend="Refunded Records" color="#F59E0B" icon={<FaUndo />} onClick={() => setActiveTab("donations")} />
        <StatCard title="Net Reserve Revenue" value={loading ? "..." : formatCurrency(netBalanceVal)} trend="Net Revenue Balance" color="#6366F1" icon={<FaChartLine />} onClick={() => setActiveTab("donations")} />
      </div>

      {/* Main Tabbed Workspace */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        {/* Workspace Navigation Bar */}
        <div style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: "12px", marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("donations")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "donations" ? "2px solid #10B981" : "1px solid #CBD5E1",
                background: activeTab === "donations" ? "#ECFDF5" : "#FFFFFF",
                color: activeTab === "donations" ? "#047857" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaCoins /> Donations ({filteredDonations.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sponsorships")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "sponsorships" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "sponsorships" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "sponsorships" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaDog /> Sponsorships ({filteredSponsorships.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("donors")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "donors" ? "2px solid #6366F1" : "1px solid #CBD5E1",
                background: activeTab === "donors" ? "#EEF2FF" : "#FFFFFF",
                color: activeTab === "donors" ? "#4338CA" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaHandHoldingHeart /> Donor Roster ({filteredDonors.length})
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {activeTab === "donations" && (
              <button
                type="button"
                onClick={() => setIsDonationModalOpen(true)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaPlus /> Record Donation
              </button>
            )}
            {activeTab === "sponsorships" && (
              <button
                type="button"
                onClick={() => setIsSponsorshipModalOpen(true)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaPlus /> Register Sponsorship
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: DONATIONS */}
        {activeTab === "donations" && (
          <DataTable
            columns={donationColumns}
            data={filteredDonations}
            loading={loading}
            emptyMessage="No donation records found matching criteria."
            leftHeaderControls={
              <>
                <div style={{ position: "relative" }}>
                  <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
                  <input
                    type="text"
                    placeholder="Search donor, email, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "240px" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaFilter size={12} color="#64748B" />
                  <select value={donationFilterType} onChange={(e) => setDonationFilterType(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
                    {DONATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <select value={donationFilterStatus} onChange={(e) => setDonationFilterStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
                    {DONATION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </>
            }
            renderRowActions={(row: any) => (
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDonation(row);
                    setDonationStatusDraft((row.status as DonationStatus) || "completed");
                    setIsStatusModalOpen(true);
                  }}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#475569", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaEdit /> Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDonation(row);
                    setIsReconcileModalOpen(true);
                  }}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaCheckDouble /> Reconcile
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadReceipt(row)}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaDownload /> Receipt
                </button>
              </div>
            )}
          />
        )}

        {/* TAB 2: SPONSORSHIPS */}
        {activeTab === "sponsorships" && (
          <DataTable
            columns={sponsorshipColumns}
            data={filteredSponsorships}
            loading={loading}
            emptyMessage="No dog sponsorship financial records found."
            leftHeaderControls={
              <>
                <div style={{ position: "relative" }}>
                  <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
                  <input
                    type="text"
                    placeholder="Search sponsor, dog, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "240px" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaFilter size={12} color="#64748B" />
                  <select value={sponsorshipFilterStatus} onChange={(e) => setSponsorshipFilterStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
                    {SPONSORSHIP_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </>
            }
            renderRowActions={(row: any) => (
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSponsorship(row);
                    setSponsorshipStatusDraft(row.status || "active");
                    setIsSponStatusModalOpen(true);
                  }}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#475569", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaEdit /> Status
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadReceipt(row)}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaDownload /> Receipt
                </button>
              </div>
            )}
          />
        )}

        {/* TAB 3: DONORS ROSTER */}
        {activeTab === "donors" && (
          <DataTable
            columns={donorColumns}
            data={filteredDonors}
            loading={loading}
            emptyMessage="No registered donor records found."
            leftHeaderControls={
              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
                <input
                  type="text"
                  placeholder="Search donor name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "240px" }}
                />
              </div>
            }
          />
        )}
      </div>

      {/* MODAL 1: Record Manual Donation (POST /donations) */}
      <Modal isOpen={isDonationModalOpen} onClose={() => setIsDonationModalOpen(false)} title="Record Incoming Donation">
        <form onSubmit={handleRecordDonationSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Donor Full Name *</label>
              <input type="text" required placeholder="e.g. Rahul Sharma" value={donationForm.donor_name} onChange={(e) => setDonationForm({ ...donationForm, donor_name: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Donor Email</label>
              <input type="email" placeholder="donor@example.com" value={donationForm.donor_email} onChange={(e) => setDonationForm({ ...donationForm, donor_email: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Donation Amount (₹) *</label>
              <input type="number" min="1" step="any" required placeholder="e.g. 2500" value={donationForm.amount} onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Donation Type</label>
              <select value={donationForm.donation_type} onChange={(e) => setDonationForm({ ...donationForm, donation_type: e.target.value as DonationType })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
                <option value="one_time">One-Time Contribution</option>
                <option value="recurring">Recurring Monthly Subscription</option>
                <option value="sponsorship">Dog Sponsorship</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Payment Method</label>
              <input type="text" placeholder="UPI / NetBanking / Cheque" value={donationForm.payment_method} onChange={(e) => setDonationForm({ ...donationForm, payment_method: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Transaction Ref / ID</label>
              <input type="text" placeholder="Optional gateway ref #" value={donationForm.transaction_id} onChange={(e) => setDonationForm({ ...donationForm, transaction_id: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Donation Purpose / Notes</label>
            <textarea rows={2} placeholder="Attribution, campaign notes, or emergency medical fund..." value={donationForm.notes} onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsDonationModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Saving..." : "Record Donation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Register Sponsorship (POST /donations/sponsorships) */}
      <Modal isOpen={isSponsorshipModalOpen} onClose={() => setIsSponsorshipModalOpen(false)} title="Register Dog Sponsorship">
        <form onSubmit={handleCreateSponsorshipSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Sponsored Dog Reference / ID *</label>
            <input type="text" required placeholder="e.g. dog_123 or Buddy" value={sponsorshipForm.dog_id} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, dog_id: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Sponsor Full Name</label>
              <input type="text" placeholder="e.g. Vikram Malhotra" value={sponsorshipForm.sponsor_name} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, sponsor_name: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Sponsor Email</label>
              <input type="email" placeholder="sponsor@example.com" value={sponsorshipForm.sponsor_email} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, sponsor_email: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Sponsorship Amount (₹) *</label>
              <input type="number" min="1" step="any" required placeholder="e.g. 5000" value={sponsorshipForm.amount} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, amount: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Duration (Months)</label>
              <input type="number" min="1" value={sponsorshipForm.duration_months} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, duration_months: Number(e.target.value) })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Sponsorship Notes</label>
            <textarea rows={2} placeholder="Monthly care, food & medical sponsorship notes..." value={sponsorshipForm.notes} onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, notes: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsSponsorshipModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Saving..." : "Register Sponsorship"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Update Donation Status (PATCH /donations/{id}/status according to DonationStatusUpdate) */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Donation Status">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Updating backend status for donation ID <strong>{selectedDonation?.id ? String(selectedDonation.id).slice(0, 8) : ""}</strong>.
          </p>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Backend Status (DonationStatus)</label>
            <select value={donationStatusDraft} onChange={(e) => setDonationStatusDraft(e.target.value as DonationStatus)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsStatusModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleUpdateDonationStatus} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Updating..." : "Save Status"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Update Sponsorship Status (PATCH /donations/sponsorships/{id}/status) */}
      <Modal isOpen={isSponStatusModalOpen} onClose={() => setIsSponStatusModalOpen(false)} title="Update Sponsorship Status">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Updating sponsorship status for ID <strong>{selectedSponsorship?.id ? String(selectedSponsorship.id).slice(0, 8) : ""}</strong>.
          </p>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Select Status</label>
            <select value={sponsorshipStatusDraft} onChange={(e) => setSponsorshipStatusDraft(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
              <option value="active">active (Active Sponsorship)</option>
              <option value="completed">completed (Completed Term)</option>
              <option value="pending">pending (Pending Verification)</option>
              <option value="cancelled">cancelled (Cancelled)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsSponStatusModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleUpdateSponsorshipStatus} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Updating..." : "Save Status"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Reconcile Donation (POST /donations/{id}/reconcile) */}
      <Modal isOpen={isReconcileModalOpen} onClose={() => setIsReconcileModalOpen(false)} title="Reconcile Donation Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Perform accounting reconciliation for donation ID <strong>{selectedDonation?.id ? String(selectedDonation.id).slice(0, 8) : ""}</strong>.
          </p>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Reconciliation Audit Notes</label>
            <textarea rows={3} value={reconcileNotesDraft} onChange={(e) => setReconcileNotesDraft(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsReconcileModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleReconcileSubmit} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Reconciling..." : "Confirm Reconciliation"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
