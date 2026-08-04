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
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: any[];
}

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
      console.error("Rescue Coordinator Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load rescue coordinator metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useDataSync(fetchDashboard);

  const stats = [
    {
      title: "Total Rescue Calls",
      value: loading ? "..." : dashboardData.total_calls,
      trend: "All Rescue Requests",
      color: "#EF4444",
      icon: <FaExclamationTriangle />,
    },
    {
      title: "Pending Cases",
      value: loading ? "..." : dashboardData.pending,
      trend: "Awaiting Dispatch",
      color: "#F59E0B",
      icon: <FaClipboardList />,
    },
    {
      title: "Agents Assigned",
      value: loading ? "..." : dashboardData.dispatched,
      trend: "Currently Assigned",
      color: "#2563EB",
      icon: <FaAmbulance />,
    },
    {
      title: "Animals Rescued",
      value: loading ? "..." : dashboardData.rescued,
      trend: "Successfully Completed",
      color: "#10B981",
      icon: <FaCheckCircle />,
    },
  ];

  const columns = [
    { key: "ticket", title: "Ticket" },
    { key: "reporter", title: "Reporter" },
    { key: "animal_count", title: "Animals" },
    { key: "status", title: "Status" },
    { key: "created_at", title: "Reported At" },
  ];

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
          onClick={() => navigate("/users")}
        />

        <QuickActionCard
          icon={<FaMapMarkerAlt />}
          title="Track Agents"
          subtitle="Live Tracking"
          color="#10B981"
          onClick={() => navigate("/dispatch")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Export Logs"
          subtitle="Download Reports"
          color="#6366F1"
          onClick={async () => {
            addToast("Exporting rescue logs...", "info");
            await reportsService.exportCsvDump();
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
            Recent Rescue Requests
          </h3>

          {loading && (
            <span style={{ color: "#2563EB", fontSize: "12px" }}>
              Loading...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={dashboardData.recent_calls}
        />
      </div>
    </div>
  );
};

export default RescueCoordinatorDashboard;