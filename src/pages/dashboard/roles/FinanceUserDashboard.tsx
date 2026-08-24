import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable, { type Column } from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import {
  FaCoins,
  FaHandHoldingHeart,
  FaChartLine,
  FaPlus,
  FaReceipt,
  FaDownload,
  FaUsers,
  FaUndo,
} from "react-icons/fa";
import donationsService, {
  isCompletedDonationStatus,
  isRefundedDonationStatus,
  isValidSponsorshipStatus,
} from "../../../services/donationsService";
import { useDataSync } from "../../../utils/dataSync";
import { useToast } from "../../../context/ToastContext";
import { formatDateTime } from "../../../utils/dateUtils";

const numericValue = (val: unknown): number => {
  const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (val: unknown): string =>
  `₹${numericValue(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FinanceUserDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [donations, setDonations] = useState<Record<string, unknown>[]>([]);
  const [sponsorships, setSponsorships] = useState<Record<string, unknown>[]>([]);
  const [donors, setDonors] = useState<Record<string, unknown>[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFinanceDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [donRes, sponRes, donorRes, sumRes] = await Promise.allSettled([
        donationsService.getDonations(),
        donationsService.getSponsorships(),
        donationsService.getDonors(),
        donationsService.getDonationSummary(),
      ]);

      const donList = donRes.status === "fulfilled"
        ? (Array.isArray(donRes.value?.data) ? donRes.value.data : Array.isArray(donRes.value) ? donRes.value : [])
        : [];
      const sponList = sponRes.status === "fulfilled"
        ? (Array.isArray(sponRes.value?.data) ? sponRes.value.data : Array.isArray(sponRes.value) ? sponRes.value : [])
        : [];
      const donorList = donorRes.status === "fulfilled"
        ? (Array.isArray(donorRes.value?.data) ? donorRes.value.data : Array.isArray(donorRes.value) ? donorRes.value : [])
        : [];
      const sumObj = sumRes.status === "fulfilled" ? sumRes.value : null;

      setDonations(donList);
      setSponsorships(sponList);
      setDonors(donorList);
      setSummaryData(sumObj);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceDashboardData();
  }, []);

  useDataSync(fetchFinanceDashboardData);

  // Exact Financial Metrics (Considers all non-failed/non-refunded/non-cancelled donations as valid revenue)
  const totalDonationsSum = useMemo(() => {
    if (summaryData?.total_donations_amount !== undefined && summaryData?.total_donations_amount !== null && Number(summaryData.total_donations_amount) > 0) {
      return Number(summaryData.total_donations_amount);
    }
    return donations
      .filter((d) => isCompletedDonationStatus(d.status))
      .reduce((sum, d) => sum + numericValue(d.amount), 0);
  }, [donations, summaryData]);

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

  const donorCountVal = useMemo(() => {
    if (donors.length > 0) return donors.length;
    const set = new Set<string>();
    donations.forEach((d) => {
      const name = String(d.donorName || d.donor_name || d.donorEmail || "").trim();
      if (name && isCompletedDonationStatus(d.status)) {
        set.add(name);
      }
    });
    return set.size;
  }, [donations, donors]);

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

  const stats = [
    { title: "Total Donations / Revenue", value: loading ? "..." : formatCurrency(totalDonationsSum), trend: "Verified Income", color: "#10B981", icon: <FaCoins />, onClick: () => navigate("/finance?tab=donations") },
    { title: "Sponsorship Revenue", value: loading ? "..." : formatCurrency(sponsorshipRevenueSum), trend: "Dog Sponsorships", color: "#2563EB", icon: <FaHandHoldingHeart />, onClick: () => navigate("/finance?tab=sponsorships") },
    { title: "Refunded Payments", value: loading ? "..." : formatCurrency(totalRefundsSum), trend: "Refunded Records", color: "#F59E0B", icon: <FaUndo />, onClick: () => navigate("/finance?tab=donations") },
    { title: "Net Revenue Reserve", value: loading ? "..." : formatCurrency(netBalanceVal), trend: "Net Balance", color: "#6366F1", icon: <FaChartLine />, onClick: () => navigate("/finance?tab=donations") },
    { title: "Registered Donors", value: loading ? "..." : String(donorCountVal), trend: "Active Contributors", color: "#0284C7", icon: <FaUsers />, onClick: () => navigate("/finance?tab=donations") },
  ];

  const columns: Column<any>[] = [
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
    { key: "donorName", header: "Donor / Reference Entity" },
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
        const color = isCompletedDonationStatus(s) ? "#047857" : isRefundedDonationStatus(s) ? "#7C3AED" : s === "pending" ? "#D97706" : "#DC2626";
        const bg = isCompletedDonationStatus(s) ? "#ECFDF5" : isRefundedDonationStatus(s) ? "#F3E8FF" : s === "pending" ? "#FEF3C7" : "#FEE2E2";
        return (
          <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
            {s}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Hero Header */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800 }}>Finance &amp; Accounting Console</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Financial ledger control: monitor incoming public donations, dog sponsorships, donor records, and official accounting statements.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Navigation */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlus />} title="Record Donation" subtitle="Log manual donation" color="#10B981" onClick={() => navigate("/finance?action=donation")} />
        <QuickActionCard icon={<FaHandHoldingHeart />} title="New Sponsorship" subtitle="Register dog sponsor" color="#2563EB" onClick={() => navigate("/finance?action=sponsorship")} />
        <QuickActionCard icon={<FaReceipt />} title="Financial Audit Reports" subtitle="Export balance sheets &amp; PDFs" color="#6366F1" onClick={() => navigate("/reports")} />
      </div>

      {/* Financial Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Financial Transaction Ledger Table */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "18px", fontWeight: 800 }}>
            Real-Time Verified Donation Ledger ({donations.length})
          </h3>
          {loading && <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>Syncing ledger...</span>}
        </div>

        <DataTable
          columns={columns}
          data={donations}
          loading={loading}
          emptyMessage="No donation records found in ledger."
          renderRowActions={(row: any) => (
            <button
              type="button"
              onClick={() => void handleDownloadReceipt(row)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#2563EB",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FaDownload /> Receipt
            </button>
          )}
        />
      </div>
    </div>
  );
};

export default FinanceUserDashboard;
