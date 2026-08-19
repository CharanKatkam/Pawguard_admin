import { useEffect, useState, useMemo } from "react";
import StatCard from "../../components/dashboard/StatCard";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import VolunteerActivityChart from "../../components/dashboard/VolunteerActivityChart";
import { useToast } from "../../context/ToastContext";
import { useDataSync } from "../../utils/dataSync";
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
} from "react-icons/fa";
import volunteerService from "../../services/volunteerService";
import reportsService from "../../services/reportsService";

const Reports = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [statsObj, setStatsObj] = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
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

      setVolunteers(volList);
      setShifts(shiftList);
      setStatsObj(statsData);

      // Fetch attendance streams for shift fulfillment and completion analytics
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
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  useDataSync(loadReportsData);

  // Derived Volunteer Metrics
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

  // 6-Month Volunteer Activity History
  const chartPoints = useMemo(() => {
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

  // Export handlers
  const handleExportCsv = async () => {
    try {
      addToast("Exporting Volunteer Activity Report (CSV)...", "info");
      await reportsService.generateAndDownloadReport({ report_type: "volunteer", format: "csv" });
      addToast("Volunteer Activity Report downloaded successfully!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export CSV report.", "error");
    }
  };

  const handleExportPdf = async () => {
    try {
      addToast("Exporting Volunteer Activity Report (PDF)...", "info");
      await reportsService.generateAndDownloadReport({ report_type: "volunteer", format: "pdf" });
      addToast("Volunteer Activity Report downloaded successfully!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export PDF report.", "error");
    }
  };

  const handleExportAttendanceCsv = () => {
    try {
      addToast("Exporting Shift Attendance Stream...", "info");
      const headers = "Attendance_ID,Shift_Role,Volunteer_ID,Check_In_Time,Check_Out_Time,Hours_Served,Status\n";
      const rows = allAttendance
        .map(
          (a) =>
            `"${a.id}","${a.shift?.role_name || "Volunteer Shift"}","${a.volunteer_id}","${a.check_in_at || "-"}","${a.check_out_at || "-"}","${a.hours_served || 0}","${a.check_out_at ? "completed" : a.check_in_at ? "checked_in" : "enrolled"}"`
        )
        .join("\n");

      const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `volunteer_attendance_stream_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Attendance Stream CSV downloaded successfully!", "success");
    } catch {
      addToast("Failed to export attendance stream.", "error");
    }
  };

  const statCards = [
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
      trend: "Awaiting Review",
      color: "#F59E0B",
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
          Volunteer Network &amp; Operational Analytics
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Live analytical reports on volunteer applications, roster activity, shift capacity fulfillment, attendance rates, and hours served.
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
          title="Export Volunteer Report (CSV)"
          subtitle="Full volunteer activity raw dataset"
          color="#2563EB"
          onClick={handleExportCsv}
        />
        <QuickActionCard
          icon={<FaFileDownload />}
          title="Export Volunteer Report (PDF)"
          subtitle="Formatted PDF analytics summary"
          color="#10B981"
          onClick={handleExportPdf}
        />
        <QuickActionCard
          icon={<FaFileDownload />}
          title="Export Attendance Stream"
          subtitle="Real-time check-in/out logs (CSV)"
          color="#6366F1"
          onClick={handleExportAttendanceCsv}
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
        {statCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* 6-Month Activity Trend Chart */}
      <VolunteerActivityChart data={chartPoints} />
    </div>
  );
};

export default Reports;