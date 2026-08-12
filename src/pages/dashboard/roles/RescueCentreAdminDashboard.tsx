import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import {
  FaUsers,
  FaPaw,
  FaAmbulance,
  FaStethoscope,
  FaClipboardList,
  FaBoxes,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import rescueService from "../../../services/rescueService";
import { rescueStatusBadge, dispatchStage, dispatchAgentNames } from "../../../utils/rescueStatus.tsx";
import { useDataSync } from "../../../utils/dataSync";

interface RescueCall {
  id: string;
  ticket: string;
  reporter: string;
  animal_count: number;
  status: string;
  dispatch_status: string;
  coordinator: string;
  agent: string;
  created_at: string;
}

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: RescueCall[];
}

const RescueCentreAdminDashboard = () => {
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<RescueDashboardData>({
    total_calls: 0,
    pending: 0,
    dispatched: 0,
    rescued: 0,
    recent_calls: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, callsRes] = await Promise.allSettled([
        dashboardService.getRescueCentreDashboard(),
        rescueService.getRescueCases({ page: 1, page_size: 5 }),
      ]);

      const data =
        dashRes.status === "fulfilled"
          ? dashRes.value?.data || dashRes.value || {}
          : {};
      const callsResolved = callsRes.status === "fulfilled" ? callsRes.value : [];
      const calls = Array.isArray(callsResolved)
        ? callsResolved
        : Array.isArray(callsResolved?.data)
        ? callsResolved.data
        : [];

      const recent: RescueCall[] = calls.map((item: any) => {
        const stage = dispatchStage({ status: item.status, dispatch: item.dispatch });
        const agents = dispatchAgentNames(item.dispatch);
        return {
          id: item.id || "",
          ticket: item.ticket_number || item.id || "-",
          reporter: item.reporter_name || "-",
          animal_count: item.animal_count ?? 0,
          status: String(item.status || "").toLowerCase(),
          dispatch_status: stage.label,
          coordinator: "-",
          agent: agents.agents.length > 0 ? agents.agents.join(", ") : "-",
          created_at: item.created_at || "",
        };
      });

      setStatsData({
        total_calls: data.total_calls ?? data.totalCalls ?? 0,
        pending: data.pending ?? data.pendingCases ?? 0,
        dispatched: data.dispatched ?? data.dispatchedCases ?? 0,
        rescued: data.rescued ?? data.rescuedAnimals ?? 0,
        recent_calls: recent,
      });
    } catch (err: any) {
      console.error("Rescue Centre Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load rescue centre metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useDataSync(fetchDashboardData);

  const stats = [
    {
      title: "Total Rescue Calls",
      value: loading ? "..." : statsData.total_calls,
      trend: "All Rescue Requests",
      color: "#2563EB",
      icon: <FaAmbulance />,
    },
    {
      title: "Pending Cases",
      value: loading ? "..." : statsData.pending,
      trend: "Awaiting Action",
      color: "#F59E0B",
      icon: <FaClipboardList />,
    },
    {
      title: "Dispatched Cases",
      value: loading ? "..." : statsData.dispatched,
      trend: "Agents Assigned",
      color: "#10B981",
      icon: <FaUsers />,
    },
    {
      title: "Rescued Dogs",
      value: loading ? "..." : statsData.rescued,
      trend: "Successfully Rescued",
      color: "#6366F1",
      icon: <FaPaw />,
    },
  ];

  const columns = [
    { key: "ticket", header: "Ticket" },
    { key: "reporter", header: "Reporter" },
    { key: "animal_count", header: "Dogs" },
    {
      key: "status",
      header: "Status",
      render: rescueStatusBadge,
    },
    {
      key: "dispatch_status",
      header: "Dispatch Status",
      render: (_val: string, row: any) => {
        const stage = dispatchStage({ status: row.status });
        return (
          <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: stage.bg, color: stage.color }}>
            {stage.label}
          </span>
        );
      },
    },
    { key: "coordinator", header: "Coordinator" },
    { key: "agent", header: "Agent" },
    { key: "created_at", header: "Reported At" },
  ];

  const data = statsData.recent_calls.map((item) => ({
    ...item,
    created_at: item.created_at ? new Date(item.created_at).toLocaleString() : "-",
  }));

  return (
    <div>
      {/* Hero Section */}

      <div
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
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
          Rescue Centre Management Portal
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94A3B8",
            fontSize: "13px",
          }}
        >
          Facility management: rescue operations, dispatch management,
          medical intake, and shelter monitoring.
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
          icon={<FaAmbulance />}
          title="Dispatch Rescue"
          subtitle="Assign Rescue Agent"
          color="#2563EB"
          onClick={() => navigate("/rescue-dispatch")}
        />

        <QuickActionCard
          icon={<FaStethoscope />}
          title="Medical Intake"
          subtitle="Register Dog"
          color="#10B981"
          onClick={() => navigate("/medical-records")}
        />

        <QuickActionCard
          icon={<FaBoxes />}
          title="Inventory"
          subtitle="Shelter Supplies"
          color="#F59E0B"
          onClick={() => navigate("/inventory")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Generate Report"
          subtitle="Operational Reports"
          color="#6366F1"
          onClick={() => navigate("/reports")}
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

      {/* Recent Rescue Calls */}

      <div className="soft-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
            Recent Rescue Calls
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {loading && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#2563EB",
                  fontWeight: 600,
                }}
              >
                Loading...
              </span>
            )}
            <button
              onClick={() => navigate("/rescue-requests")}
              style={{
                background: "none",
                border: "none",
                color: "#2563EB",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              View All →
            </button>
          </div>
        </div>

        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default RescueCentreAdminDashboard;
