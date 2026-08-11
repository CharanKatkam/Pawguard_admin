import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { useToast } from "../../../context/ToastContext";
import {
  FaAmbulance,
  FaCamera,
  FaCheckCircle,
  FaClipboardCheck,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import rescueService from "../../../services/rescueService";
import { useDataSync } from "../../../utils/dataSync";

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: any[];
}

const unwrapList = (v: any): any[] =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

const formatAssigned = (c: any) => ({
  id: c.id || c.ticket_number || "",
  ticket: c.ticket_number || c.id || "-",
  reporter: c.reporter_name || c.reporter || "-",
  animal_count: c.animal_count ?? "-",
  status: c.status || "-",
  location: c.location_address || c.location || "-",
  severity: c.severity || "-",
  driver: c.dispatch?.assigned_driver_id || "-",
  vehicle: c.dispatch?.assigned_vehicle_id || c.dispatch?.vehicle_id || "-",
  agents: Array.isArray(c.dispatch?.agents) && c.dispatch.agents.length > 0
    ? c.dispatch.agents.map((a: any) => a.agent_id).join(", ")
    : "-",
  created_at: c.created_at ? new Date(c.created_at).toLocaleString() : "-",
});

const RescueAgentDashboard = () => {
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

  const [assignedCases, setAssignedCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only cases assigned to the current user (dispatch agents) — the shared
  // /dashboards/rescue payload is NOT user-scoped and must not be presented
  // as "Assigned to You".
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

      const data = response?.data || response || {};
      setDashboardData({
        total_calls: data.total_calls ?? data.totalCalls ?? 0,
        pending: data.pending ?? data.pendingCases ?? 0,
        dispatched: data.dispatched ?? data.dispatchedCases ?? 0,
        rescued: data.rescued ?? data.rescuedAnimals ?? 0,
        recent_calls: Array.isArray(data.recent_calls) ? data.recent_calls : Array.isArray(data.recentCalls) ? data.recentCalls : [],
      });
    } catch (err: any) {
      console.error("Rescue Agent Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load rescue agent metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAssignedCases();
  }, []);

  useDataSync(() => {
    fetchDashboard();
    fetchAssignedCases();
  });

  const stats = [
    {
      title: "Assigned Cases",
      value: loading ? "..." : assignedCases.length,
      trend: "Assigned to You",
      color: "#2563EB",
      icon: <FaAmbulance />,
    },
    {
      title: "Pending Cases",
      value: loading ? "..." : dashboardData.pending,
      trend: "Awaiting Rescue",
      color: "#F59E0B",
      icon: <FaClipboardCheck />,
    },
    {
      title: "Completed Rescues",
      value: loading ? "..." : dashboardData.rescued,
      trend: "Successfully Completed",
      color: "#10B981",
      icon: <FaCheckCircle />,
    },
    {
      title: "Total Rescue Calls",
      value: loading ? "..." : dashboardData.total_calls,
      trend: "Overall Requests",
      color: "#6366F1",
      icon: <FaCamera />,
    },
  ];

  const columns = [
    { key: "ticket", title: "Ticket" },
    { key: "reporter", title: "Reporter" },
    { key: "animal_count", title: "Animals" },
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
    { key: "driver", title: "Driver" },
    { key: "vehicle", title: "Vehicle" },
    {
      key: "status",
      title: "Status",
      render: (val: string) => (
        <span style={{ textTransform: "capitalize", fontWeight: 600, fontSize: "12px" }}>{val || "-"}</span>
      ),
    },
    { key: "created_at", title: "Reported At" },
  ];

  return (
    <div>
      {/* Hero */}
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
          Field Rescue Agent Console
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94A3B8",
            fontSize: "13px",
          }}
        >
          View assigned rescue requests, update rescue status,
          upload rescue photos and complete field operations.
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


      {/* Quick Actions */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <QuickActionCard
          icon={<FaCamera />}
          title="Upload Photos"
          subtitle="Attach Rescue Images"
          color="#2563EB"
          onClick={() => addToast("Select rescue photos from device to attach", "info")}
        />

        <QuickActionCard
          icon={<FaClipboardCheck />}
          title="Update Status"
          subtitle="Complete Rescue"
          color="#10B981"
          onClick={() => navigate("/pets")}
        />

        <QuickActionCard
          icon={<FaAmbulance />}
          title="Confirm Delivery"
          subtitle="Send to Shelter"
          color="#6366F1"
          onClick={() => navigate("/rescues")}
        />
      </div>

      {/* Statistics */}

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

      {/* Assigned Rescue Requests */}

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
            Assigned Rescue Requests
          </h3>

          {loading && (
            <span
              style={{
                color: "#2563EB",
                fontSize: "12px",
              }}
            >
              Loading...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={assignedCases}
        />
      </div>
    </div>
  );
};

export default RescueAgentDashboard;