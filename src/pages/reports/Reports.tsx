import { useEffect, useState } from "react";
import AdoptionChart from "../../components/dashboard/AdoptionChart";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { useToast } from "../../context/ToastContext";
import { useDataSync } from "../../utils/dataSync";
import Can from "../../components/rbac/Can";
import { buildMonthlyAdoptionHistory } from "../../utils/adoptionStats";
import { FaChartBar, FaFileDownload, FaFileAlt, FaFilter, FaReceipt } from "react-icons/fa";
import reportsService from "../../services/reportsService";
import adoptionService from "../../services/adoptionService";
import rescueService from "../../services/rescueService";
import medicalService from "../../services/medicalService";

const Reports = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [adoptions, setAdoptions] = useState<any[]>([]);
  const [rescues, setRescues] = useState<any[]>([]);
  const [medical, setMedical] = useState<any[]>([]);

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const loadReports = async () => {
    try {
      setLoading(true);
      const [adoptRes, rescueRes, medicalRes] = await Promise.allSettled([
        adoptionService.getAdoptions(),
        rescueService.getRescueCases(),
        medicalService.getMedicalRecords(),
      ]);
      setAdoptions(
        adoptRes.status === "fulfilled" ? unwrapList(adoptRes.value) : []
      );
      setRescues(
        rescueRes.status === "fulfilled" ? unwrapList(rescueRes.value) : []
      );
      setMedical(
        medicalRes.status === "fulfilled" ? unwrapList(medicalRes.value) : []
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDataSync(loadReports);

  const handleExportPdf = async () => {
    try {
      addToast("Exporting Finance Report (PDF)...", "info");
      await reportsService.generateAndDownloadReport({ report_type: "finance", format: "pdf" });
      addToast("Finance Report PDF downloaded successfully!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export PDF report.", "error");
    }
  };

  const handleExportCsv = async () => {
    try {
      addToast("Exporting Rescue Report (CSV)...", "info");
      await reportsService.generateAndDownloadReport({ report_type: "rescue", format: "csv" });
      addToast("Rescue Report CSV downloaded successfully!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export CSV data.", "error");
    }
  };

  const handleExportDonationPdf = async () => {
    try {
      addToast("Exporting Donation Report (PDF)...", "info");
      await reportsService.generateAndDownloadReport({ report_type: "donation", format: "pdf" });
      addToast("Donation Report PDF downloaded successfully!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export donation report.", "error");
    }
  };

  const pct = (numerator: number, denominator: number) =>
    denominator === 0 ? "0%" : `${Math.round((numerator / denominator) * 100)}%`;

  const successfulRescues = rescues.filter(
    (r) => /admitted|rescued/i.test(String(r.status ?? ""))
  ).length;
  const approvedAdoptions = adoptions.filter(
    (a) => /approved|completed|adopted|finalized/i.test(String(a.status ?? ""))
  ).length;
  const clearedMedical = medical.filter(
    (m) => /discharged|recovered|cleared|healthy|completed/i.test(String(m.status ?? ""))
  ).length;

  const stats = [
    {
      title: "Rescue Success Rate",
      value: loading ? "..." : pct(successfulRescues, rescues.length),
      trend: `${rescues.length} total cases`,
      color: "#2563EB",
      icon: <FaChartBar />,
    },
    {
      title: "Adoption Success Index",
      value: loading ? "..." : pct(approvedAdoptions, adoptions.length),
      trend: `${adoptions.length} total applications`,
      color: "#10B981",
      icon: <FaFileAlt />,
    },
    {
      title: "Medical Clearance Rate",
      value: loading ? "..." : pct(clearedMedical, medical.length),
      trend: `${medical.length} total records`,
      color: "#6366F1",
      icon: <FaFilter />,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Reports & Operational Analytics</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Live analytical reports on rescue response times, shelter capacities, medical costs, adoption conversion rates, and donor metrics.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="view_finance">
          <QuickActionCard icon={<FaFileDownload />} title="Export Finance Report" subtitle="Download PDF finance report" color="#2563EB" onClick={handleExportPdf} />
        </Can>
        <Can permission="view_finance">
          <QuickActionCard icon={<FaReceipt />} title="Export Donation Report" subtitle="Download PDF donation report" color="#10B981" onClick={handleExportDonationPdf} />
        </Can>
        <QuickActionCard icon={<FaFileAlt />} title="Export Rescue Report" subtitle="Raw rescue datasets (CSV)" color="#6366F1" onClick={handleExportCsv} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Analytics Visualization */}
      <AdoptionChart data={buildMonthlyAdoptionHistory(adoptions)} />
    </div>
  );
};

export default Reports;