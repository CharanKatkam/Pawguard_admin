import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { useToast } from "../../../context/ToastContext";
import reportsService from "../../../services/reportsService";
import {
  FaAmbulance,
  FaUserPlus,
  FaMapMarkerAlt,
  FaClipboardList,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaTruck,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import rescueService from "../../../services/rescueService";
import { useDataSync } from "../../../utils/dataSync";

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: Record<string, unknown>[];
}

const unwrapList = (v: unknown): Record<string, unknown>[] => {
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  const obj = v as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).data)) {
    return (obj.data as Record<string, unknown>).data as Record<string, unknown>[];
  }
  if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).items)) {
    return (obj.data as Record<string, unknown>).items as Record<string, unknown>[];
  }
  return [];
};

const formatAssigned = (c: Record<string, unknown>) => ({
  id: String(c.id || c.ticket_number || ""),
  ticket: String(c.ticket_number || c.id || "-"),
  reporter: String(c.reporter_name || c.reporter || "-"),
  animal_count: (c.animal_count ?? "-") as string | number,
  status: String(c.status || "-"),
  location: String(c.location_address || c.location || "-"),
  severity: String(c.severity || "-"),
  created_at: c.created_at ? new Date(String(c.created_at)).toLocaleString() : "-",
});

const RescueCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [dashboardData, setDashboardData] =
    useState<RescueDashboardData>({
      total_calls: 0,
      pending: 0,
      dispatched: 0,
      rescued: 0,
      recent_calls: [],
    });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedCases, setAssignedCases] = useState<Record<string, unknown>[]>([]);

  // Cases where this coordinator is the assigned coordinator — only those are
  // shown under "Assigned to You" (backend `assigned_to_me` capability).
  const fetchAssignedCases = async () => {
    try {
      const response = await rescueService.getRescueCases({ assigned_to_me: true });
      setAssignedCases(unwrapList(response).map(formatAssigned));
    } catch {
      setAssignedCases([]);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getRescueDashboard();

      const data = (response as { data?: Record<string, unknown> })?.data || (response as Record<string, unknown>) || {};
      setDashboardData({
        total_calls: Number(data.total_calls ?? data.totalCalls ?? 0),
        pending: Number(data.pending ?? data.pendingCases ?? 0),
        dispatched: Number(data.dispatched ?? data.dispatchedCases ?? 0),
        rescued: Number(data.rescued ?? data.rescuedAnimals ?? 0),
        recent_calls: Array.isArray(data.recent_calls) ? (data.recent_calls as Record<string, unknown>[]) : Array.isArray(data.recentCalls) ? (data.recentCalls as Record<string, unknown>[]) : [],
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Failed to load rescue coordinator metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDashboard();
    void fetchAssignedCases();
  }, []);

  useDataSync(() => {
    void fetchDashboard();
    void fetchAssignedCases();
  });

  const stats = [
    {
      title: "Total Rescue Calls",
      value: loading ? "..." : dashboardData.total_calls,
      trend: "All Rescue Requests",
      color: "#EF4444",
      icon: <FaExclamationTriangle />,
    },
    {
      title: "My Assigned Cases",
      value: loading ? "..." : assignedCases.length,
      trend: "Assigned to You",
      color: "#2563EB",
      icon: <FaClipboardList />,
    },
    {
      title: "Pending Cases",
      value: loading ? "..." : dashboardData.pending,
      trend: "Awaiting Dispatch",
      color: "#F59E0B",
      icon: <FaClock />,
    },
    {
      title: "Dogs Rescued",
      value: loading ? "..." : dashboardData.rescued,
      trend: "Successfully Completed",
      color: "#10B981",
      icon: <FaCheckCircle />,
    },
  ];

  const columns = [
    { key: "ticket", title: "Ticket" },
    { key: "reporter", title: "Reporter" },
    { key: "animal_count", title: "Dogs" },
    { key: "location", title: "Location" },
    {
      key: "severity",
      title: "Priority",
      render: (val: string) => (
        <span style={{ textTransform: "uppercase", fontWeight: 600, fontSize: "12px", color: val === "critical" ? "#DC2626" : val === "high" ? "#EA580C" : val === "medium" ? "#F59E0B" : "#16A34A" }}>
          {val || "-"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (val: string) => (
        <span style={{ textTransform: "capitalize", fontWeight: 600, fontSize: "12px" }}>{val || "-"}</span>
      ),
    },
    { key: "created_at", title: "Reported At" },
  ];

  const rowActions = (row: Record<string, unknown>) => {
    const isVerified = String(row.status || "").toLowerCase() === "verified";
    return (
      <button
        onClick={() => navigate(`/rescue-dispatch?case_id=${encodeURIComponent(String(row.id || ""))}`)}
        disabled={!["verified", "dispatched", "located"].includes(String(row.status || "").toLowerCase())}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "none",
          background: isVerified ? "#10B981" : "#2563EB",
          color: "#FFF",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          opacity: ["verified", "dispatched", "located"].includes(String(row.status || "").toLowerCase()) ? 1 : 0.45,
        }}
      >
        <FaTruck /> {isVerified ? "Accept & Assign Team" : "Assign Team"}
      </button>
    );
  };

  return (
    <div>
      <div
        style={{
          marginBottom: "20px",
          background:
            "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          color: "#fff",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: 800,
          }}
        >
          Rescue Coordinator Control Center
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94A3B8",
            fontSize: "13px",
          }}
        >
          Emergency response management: dispatch field agents,
          monitor rescue requests and coordinate rescue operations.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}


      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <QuickActionCard
          icon={<FaAmbulance />}
          title="New Emergency"
          subtitle="Log Distress Call"
          color="#EF4444"
          onClick={() => navigate("/pets")}
        />

        <QuickActionCard
          icon={<FaUserPlus />}
          title="Assign Agent"
          subtitle="Dispatch Field Agent"
          color="#2563EB"
          onClick={() => navigate("/rescue-dispatch")}
        />

        <QuickActionCard
          icon={<FaMapMarkerAlt />}
          title="Track Agents"
          subtitle="Live Tracking"
          color="#10B981"
          onClick={() => navigate("/rescue-dispatch")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Export Logs"
          subtitle="Download Reports"
          color="#6366F1"
          onClick={async () => {
            addToast("Exporting rescue logs...", "info");
            await reportsService.generateAndDownloadReport({ report_type: "rescue", format: "csv" });
            addToast("Rescue logs exported successfully!", "success");
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            My Assigned Cases
          </h3>

          {loading && (
            <span style={{ color: "#2563EB", fontSize: "12px" }}>
              Loading...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={assignedCases}
          loading={loading}
          error={error}
          onRetry={() => {
            fetchAssignedCases();
            fetchDashboard();
          }}
          emptyMessage="No rescue cases are assigned to you yet."
          renderRowActions={rowActions}
          onRowClick={(row) => navigate(`/rescue-dispatch?case_id=${encodeURIComponent(String(row.id || ""))}`)}
        />
      </div>
    </div>
  );
};

export default RescueCoordinatorDashboard;