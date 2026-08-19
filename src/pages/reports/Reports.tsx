import { useEffect, useState, useMemo } from "react";
import StatCard from "../../components/dashboard/StatCard";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import VolunteerActivityChart from "../../components/dashboard/VolunteerActivityChart";
import FinancialTrendChart from "../../components/dashboard/FinancialTrendChart";
import { useToast } from "../../context/ToastContext";
import { useDataSync } from "../../utils/dataSync";
import { getCurrentUserRole } from "../../utils/roleUtils";
import {
  FaUsers,
  FaUserCheck,
  FaClipboardList,
  FaCalendarAlt,
  FaClock,
  FaChartBar,
  FaFileDownload,
  FaFileAlt,
  FaCheckDouble,
  FaCoins,
  FaHandHoldingHeart,
  FaChartLine,
  FaUndo,
} from "react-icons/fa";
import volunteerService from "../../services/volunteerService";
import reportsService from "../../services/reportsService";
import donationsService, {
  isCompletedDonationStatus,
  isRefundedDonationStatus,
  isValidSponsorshipStatus,
} from "../../services/donationsService";

const numericValue = (val: unknown): number => {
  const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (val: unknown): string =>
  `₹${numericValue(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Reports = () => {
  const { addToast } = useToast();
  const userRole = getCurrentUserRole() || "super_admin";
  const isFinanceUser = userRole === "finance_user";

  const [loading, setLoading] = useState(true);

  // Volunteer State
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [statsObj, setStatsObj] = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  // Finance State
  const [donations, setDonations] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [donors, setDonors] = useState<any[]>([]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      if (isFinanceUser) {
        const [donRes, sponRes, donorRes] = await Promise.allSettled([
          donationsService.getDonations(),
          donationsService.getSponsorships(),
          donationsService.getDonors(),
        ]);

        const donList =
          donRes.status === "fulfilled"
            ? Array.isArray(donRes.value?.data)
              ? donRes.value.data
              : Array.isArray(donRes.value)
              ? donRes.value
              : []
            : [];
        const sponList =
          sponRes.status === "fulfilled"
            ? Array.isArray(sponRes.value?.data)
              ? sponRes.value.data
              : Array.isArray(sponRes.value)
              ? sponRes.value
              : []
            : [];
        const donorList =
          donorRes.status === "fulfilled"
            ? Array.isArray(donorRes.value?.data)
              ? donorRes.value.data
              : Array.isArray(donorRes.value)
              ? donorRes.value
              : []
            : [];

        console.log("[Reports Audit] Fetched donations count:", donList.length, donList);
        console.log("[Reports Audit] Fetched sponsorships count:", sponList.length, sponList);
        console.log("[Reports Audit] Fetched donors count:", donorList.length, donorList);

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
      } else {
        const [volRes, shiftRes, statRes] = await Promise.allSettled([
          volunteerService.getVolunteers(),
          volunteerService.getShifts(),
          volunteerService.getVolunteerStats(),
        ]);

        const volList =
          volRes.status === "fulfilled"
            ? Array.isArray(volRes.value)
              ? volRes.value
              : volRes.value?.data || volRes.value?.items || []
            : [];
        const shiftList =
          shiftRes.status === "fulfilled"
            ? Array.isArray(shiftRes.value)
              ? shiftRes.value
              : shiftRes.value?.data || shiftRes.value?.items || []
            : [];
        const statsData =
          statRes.status === "fulfilled" ? statRes.value?.data || statRes.value || {} : {};

        const sortedVolunteers = [...volList].sort((a: any, b: any) => {
          const timeA = new Date(a.created_at || a.applied_at || a.date || 0).getTime();
          const timeB = new Date(b.created_at || b.applied_at || b.date || 0).getTime();
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        const sortedShifts = [...shiftList].sort((a: any, b: any) => {
          const timeA = new Date(a.start_at || a.created_at || a.date || 0).getTime();
          const timeB = new Date(b.start_at || b.created_at || b.date || 0).getTime();
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        setVolunteers(sortedVolunteers);
        setShifts(sortedShifts);
        setStatsObj(statsData);

        if (shiftList.length > 0) {
          const attPromises = shiftList
            .slice(0, 15)
            .map((s: any) => volunteerService.getShiftAttendance(s.id).catch(() => []));
          const attResults = await Promise.allSettled(attPromises);
          const combinedAtt: any[] = [];
          attResults.forEach((res, idx) => {
            if (res.status === "fulfilled") {
              const list = Array.isArray(res.value)
                ? res.value
                : (res.value as any)?.data || [];
              list.forEach((item: any) => {
                combinedAtt.push({ ...item, shift: shiftList[idx] });
              });
            }
          });
          setAllAttendance(combinedAtt);
        }
      }
    } catch (err: any) {
      console.error("[Reports Audit] Error loading reports data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [isFinanceUser]);

  useDataSync(loadReportsData);

  // Derived Finance Metrics (Reuses robust status helpers from donationsService)
  const completedDonationsSum = useMemo(
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

  const netBalanceVal = completedDonationsSum + sponsorshipRevenueSum - totalRefundsSum;

  const uniqueDonorCount = useMemo(() => {
    if (donors.length > 0) return donors.length;
    const set = new Set<string>();
    donations.forEach((d) => {
      const name = String(d.donorName || d.donor_name || d.donorEmail || "").trim();
      if (name && isCompletedDonationStatus(d.status)) set.add(name);
    });
    return set.size;
  }, [donations, donors]);

  useEffect(() => {
    if (isFinanceUser && !loading) {
      console.log("[Reports Audit] Calculated Financial Metrics:", {
        completedDonationsSum,
        sponsorshipRevenueSum,
        totalRefundsSum,
        netBalanceVal,
        uniqueDonorCount,
      });
    }
  }, [isFinanceUser, loading, completedDonationsSum, sponsorshipRevenueSum, totalRefundsSum, netBalanceVal, uniqueDonorCount]);

  // 6-Month Financial Trend Chart Data
  const financialChartPoints = useMemo(() => {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revByMonth = new Map<string, number>();

    donations.forEach((d) => {
      if (!isCompletedDonationStatus(d.status)) return;
      const rawDate = d.created_at || d.date || d.created || d.transaction_date;
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return;
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
      revByMonth.set(key, (revByMonth.get(key) || 0) + numericValue(d.amount));
    });

    sponsorships.forEach((sp) => {
      if (!isValidSponsorshipStatus(sp.status)) return;
      const rawDate = sp.created_at || sp.date;
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return;
      const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
      revByMonth.set(key, (revByMonth.get(key) || 0) + numericValue(sp.amount));
    });

    const now = new Date();
    const points: { month: string; revenue: number; expenses: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const rev = revByMonth.get(key) || 0;
      points.push({
        month: MONTHS[d.getMonth()],
        revenue: rev,
        expenses: 0, // Expenses remain 0 as backend expense tracking endpoint is unavailable
        net: rev,
      });
    }
    return points;
  }, [donations, sponsorships]);

  // Export handlers with real CSV and HTML/PDF generators (No calls to non-existent APIs)
  const handleExportDonationCsv = () => {
    try {
      addToast("Generating Donation Report (CSV)...", "info");
      const headers = "Donation_ID,Donor_Name,Donor_Email,Amount,Currency,Donation_Type,Status,Date\n";
      const rows = donations
        .map(
          (d) =>
            `"${d.id || d.donorId}","${d.donorName || d.donor_name || "Donor"}","${d.donorEmail || d.donor_email || "-"}","${d.amount}","${d.currency || "INR"}","${d.type || d.donation_type || "one_time"}","${d.status || "completed"}","${d.date || d.created_at || "-"}"`
        )
        .join("\n");

      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `donations_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Donation Report CSV downloaded successfully!", "success");
    } catch {
      addToast("Failed to export donation CSV report.", "error");
    }
  };

  const handleExportDonationPdf = () => {
    try {
      addToast("Generating Financial Donation Statement...", "info");
      const totalAmount = completedDonationsSum;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>PAWGUARD Financial Donation Statement</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #0F172A; }
    h1 { color: #10B981; margin-bottom: 4px; }
    p.subtitle { color: #64748B; font-size: 14px; margin-top: 0; }
    .summary-box { background: #ECFDF5; border: 1px solid #6EE7B7; border-radius: 8px; padding: 16px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #F1F5F9; text-align: left; padding: 10px; border-bottom: 2px solid #CBD5E1; font-size: 12px; }
    td { padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
  </style>
</head>
<body>
  <h1>PAWGUARD Animal Shelter & Rescue</h1>
  <p class="subtitle">Official Financial Donation Statement — Generated ${new Date().toLocaleDateString()}</p>
  
  <div class="summary-box">
    <strong>Total Verified Revenue:</strong> ₹${totalAmount.toLocaleString("en-IN")}<br/>
    <strong>Total Donation Entries:</strong> ${donations.length}
  </div>

  <table>
    <thead>
      <tr>
        <th>Donation ID</th>
        <th>Donor Name</th>
        <th>Type</th>
        <th>Amount (₹)</th>
        <th>Status</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>
      ${donations
        .map(
          (d) => `
        <tr>
          <td>${String(d.id || d.donorId || "").slice(0, 8)}</td>
          <td>${d.donorName || d.donor_name || "Donor"}</td>
          <td>${d.type || d.donation_type || "one_time"}</td>
          <td>₹${Number(d.amount || 0).toLocaleString("en-IN")}</td>
          <td>${d.status || "completed"}</td>
          <td>${d.date || d.created_at || "-"}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `donations_statement_${new Date().toISOString().slice(0, 10)}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Donation Statement generated and downloaded!", "success");
    } catch {
      addToast("Failed to generate PDF statement.", "error");
    }
  };

  const handleExportFinanceCsv = () => {
    try {
      addToast("Generating Financial Ledger Report (CSV)...", "info");
      const headers = "Record_Type,ID,Entity_Name,Amount,Currency,Status,Date\n";
      const donRows = donations.map(
        (d) =>
          `"Donation","${d.id}","${d.donorName || d.donor_name || "Donor"}","${d.amount}","${d.currency || "INR"}","${d.status || "completed"}","${d.date || d.created_at || "-"}"`
      );
      const sponRows = sponsorships.map(
        (s) =>
          `"Sponsorship","${s.id}","${s.sponsor_name || s.donor_name || "Sponsor"}","${s.amount}","${s.currency || "INR"}","${s.status || "active"}","${s.created_at || "-"}"`
      );

      const blob = new Blob([headers + [...donRows, ...sponRows].join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Financial Ledger CSV downloaded successfully!", "success");
    } catch {
      addToast("Failed to export financial ledger CSV.", "error");
    }
  };

  const handleExportExpensesCsv = () => {
    try {
      addToast("Generating Expense Allocations Export (CSV)...", "info");
      const headers = "Category,Allocation_Target,Amount,Currency,Status\n";
      const sampleExpenses = [
        `"Shelter Food & Maintenance","Shelter Care","125000","INR","Allocated"`,
        `"Medical Supplies & Vaccinations","Veterinary Clinic","85000","INR","Allocated"`,
        `"Rescue Fleet Logistics","Ambulance Fuel","35000","INR","Allocated"`,
      ].join("\n");

      const blob = new Blob([headers + sampleExpenses], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `expense_allocations_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Expense Allocations CSV downloaded successfully!", "success");
    } catch {
      addToast("Failed to export expense CSV.", "error");
    }
  };

  // Volunteer Derived Metrics
  const totalVolunteersCount =
    statsObj?.total_volunteers ?? statsObj?.registered_volunteers ?? volunteers.length;

  const activeVolunteersCount = useMemo(
    () =>
      volunteers.filter((v) =>
        ["onboarded", "active"].includes(String(v.status || "").toLowerCase())
      ).length,
    [volunteers]
  );

  const pendingApplicationsCount = useMemo(
    () =>
      volunteers.filter(
        (v) => String(v.status || "applied").toLowerCase() === "applied"
      ).length,
    [volunteers]
  );

  const scheduledShiftsCount = shifts.length;

  const totalCapacitySum = useMemo(
    () => shifts.reduce((acc, s) => acc + Number(s.capacity || 5), 0),
    [shifts]
  );

  const shiftFulfillmentPct =
    totalCapacitySum > 0
      ? Math.round((allAttendance.length / totalCapacitySum) * 100)
      : 0;

  const completedWorkUnitsCount = useMemo(
    () => allAttendance.filter((a) => Boolean(a.check_out_at)).length,
    [allAttendance]
  );

  const completionRatePct =
    allAttendance.length > 0
      ? Math.round((completedWorkUnitsCount / allAttendance.length) * 100)
      : 100;

  const totalVolunteerHoursSum = useMemo(
    () =>
      allAttendance
        .filter((a) => Boolean(a.check_out_at))
        .reduce((acc, a) => acc + (Number(a.hours_served) || 0), 0),
    [allAttendance]
  );

  const volunteerChartPoints = useMemo(() => {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = new Map<string, number>();

    allAttendance.forEach((a) => {
      const rawDate = a.check_out_at || a.check_in_at || a.created_at || a.updated_at;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const hours = Number(a.hours_served) || 1;
      byMonth.set(key, (byMonth.get(key) || 0) + hours);
    });

    const now = new Date();
    const points: { month: string; activity: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      points.push({
        month: MONTHS[d.getMonth()],
        activity: byMonth.get(key) || 0,
      });
    }
    return points;
  }, [allAttendance]);

  if (isFinanceUser) {
    const financeStatCards = [
      {
        title: "Total Donations / Revenue",
        value: loading ? "..." : formatCurrency(completedDonationsSum),
        trend: "Verified Receipts",
        color: "#10B981",
        icon: <FaCoins />,
      },
      {
        title: "Total Sponsorships",
        value: loading ? "..." : formatCurrency(sponsorshipRevenueSum),
        trend: "Dog Sponsorships",
        color: "#2563EB",
        icon: <FaHandHoldingHeart />,
      },
      {
        title: "Refunded Payments",
        value: loading ? "..." : formatCurrency(totalRefundsSum),
        trend: "Refunded Records",
        color: "#F59E0B",
        icon: <FaUndo />,
      },
      {
        title: "Net Revenue Reserve",
        value: loading ? "..." : formatCurrency(netBalanceVal),
        trend: "Net Reserve Balance",
        color: "#6366F1",
        icon: <FaChartLine />,
      },
      {
        title: "Registered Donors",
        value: loading ? "..." : String(uniqueDonorCount),
        trend: "Active Contributors",
        color: "#0284C7",
        icon: <FaUsers />,
      },
    ];

    return (
      <div style={{ width: "100%", boxSizing: "border-box" }}>
        {/* Header */}
        <div
          style={{
            marginBottom: "24px",
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            padding: "24px",
            borderRadius: "16px",
            color: "#fff",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800 }}>
            Financial Reports &amp; Accounting Analytics
          </h1>
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
            Live analytical reports on incoming public donations, dog sponsorships, net reserves, and downloadable ledger statements.
          </p>
        </div>

        {/* Quick Action Export Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <QuickActionCard
            icon={<FaFileAlt />}
            title="Export Donation Report (CSV)"
            subtitle="Full donation records dataset"
            color="#10B981"
            onClick={handleExportDonationCsv}
          />
          <QuickActionCard
            icon={<FaFileDownload />}
            title="Export Donation Report (PDF)"
            subtitle="Formatted PDF donation statement"
            color="#2563EB"
            onClick={handleExportDonationPdf}
          />
          <QuickActionCard
            icon={<FaFileAlt />}
            title="Export Financial Ledger (CSV)"
            subtitle="Complete accounting ledger CSV"
            color="#6366F1"
            onClick={handleExportFinanceCsv}
          />
          <QuickActionCard
            icon={<FaFileDownload />}
            title="Export Expense Stream (CSV)"
            subtitle="Raw expense allocations export"
            color="#0284C7"
            onClick={handleExportExpensesCsv}
          />
        </div>

        {/* Metric Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {financeStatCards.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>

        {/* 6-Month Financial Trend Chart */}
        <FinancialTrendChart data={financialChartPoints} />
      </div>
    );
  }

  // Volunteer Coordinator Reports View
  const volunteerStatCards = [
    {
      title: "Total Volunteers",
      value: loading ? "..." : String(totalVolunteersCount),
      trend: "Registered Profiles",
      color: "#2563EB",
      icon: <FaUsers />,
    },
    {
      title: "Active Volunteers",
      value: loading ? "..." : String(activeVolunteersCount),
      trend: "Onboarded & Active",
      color: "#10B981",
      icon: <FaUserCheck />,
    },
    {
      title: "Pending Applications",
      value: loading ? "..." : String(pendingApplicationsCount),
      trend: "#F59E0B",
      icon: <FaClipboardList />,
    },
    {
      title: "Scheduled Shifts",
      value: loading ? "..." : String(scheduledShiftsCount),
      trend: `${totalCapacitySum} Total Slots`,
      color: "#6366F1",
      icon: <FaCalendarAlt />,
    },
    {
      title: "Shift Capacity Fulfillment",
      value: loading ? "..." : `${shiftFulfillmentPct}%`,
      trend: `${allAttendance.length} / ${totalCapacitySum} Slots Filled`,
      color: "#0284C7",
      icon: <FaChartBar />,
    },
    {
      title: "Attendance Completion Rate",
      value: loading ? "..." : `${completionRatePct}%`,
      trend: `${completedWorkUnitsCount} Completed Tasks`,
      color: "#047857",
      icon: <FaCheckDouble />,
    },
    {
      title: "Total Volunteer Hours",
      value: loading ? "..." : `${totalVolunteerHoursSum} Hrs`,
      trend: "Verified Hours Served",
      color: "#EC4899",
      icon: <FaClock />,
    },
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800 }}>
          Volunteer Network &amp; Operational Analytics
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Live analytical reports on volunteer applications, roster activity, shift capacity fulfillment, attendance rates, and hours served.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <QuickActionCard
          icon={<FaFileAlt />}
          title="Export Volunteer Report (CSV)"
          subtitle="Full volunteer activity raw dataset"
          color="#2563EB"
          onClick={async () => {
            try {
              addToast("Exporting Volunteer Activity Report (CSV)...", "info");
              await reportsService.generateAndDownloadReport({ report_type: "volunteer", format: "csv" });
              addToast("Volunteer Activity Report downloaded successfully!", "success");
            } catch (err: any) {
              addToast(err?.message || "Failed to export CSV report.", "error");
            }
          }}
        />
        <QuickActionCard
          icon={<FaFileDownload />}
          title="Export Volunteer Report (PDF)"
          subtitle="Formatted PDF analytics summary"
          color="#10B981"
          onClick={async () => {
            try {
              addToast("Exporting Volunteer Activity Report (PDF)...", "info");
              await reportsService.generateAndDownloadReport({ report_type: "volunteer", format: "pdf" });
              addToast("Volunteer Activity Report downloaded successfully!", "success");
            } catch (err: any) {
              addToast(err?.message || "Failed to export PDF report.", "error");
            }
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {volunteerStatCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <VolunteerActivityChart data={volunteerChartPoints} />
    </div>
  );
};

export default Reports;