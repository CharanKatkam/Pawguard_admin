import { useEffect, useState } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import {
  FaAmbulance,
  FaCamera,
  FaCheckCircle,
  FaClipboardCheck,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: any[];
}

const RescueAgentDashboard = () => {
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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getRescueDashboard();
      console.log("Rescue Agent Dashboard:", response);

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


  const stats = [
    {
      title: "Assigned Cases",
      value: loading ? "..." : dashboardData.dispatched,
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
    { key: "status", title: "Status" },
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
          onClick={() => alert("Upload Photos")}
        />

        <QuickActionCard
          icon={<FaClipboardCheck />}
          title="Update Status"
          subtitle="Complete Rescue"
          color="#10B981"
          onClick={() => alert("Update Status")}
        />

        <QuickActionCard
          icon={<FaAmbulance />}
          title="Confirm Delivery"
          subtitle="Send to Shelter"
          color="#6366F1"
          onClick={() => alert("Confirm Delivery")}
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
          data={dashboardData.recent_calls}
        />
      </div>
    </div>
  );
};

export default RescueAgentDashboard;