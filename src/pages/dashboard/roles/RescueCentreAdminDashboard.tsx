import { useState, useEffect } from "react";
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

interface RescueCall {
  id: string;
  ticket: string;
  reporter: string;
  animal_count: number;
  status: string;
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
  const [statsData, setStatsData] = useState<RescueDashboardData>({
    total_calls: 0,
    pending: 0,
    dispatched: 0,
    rescued: 0,
    recent_calls: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getRescueCentreDashboard();
      console.log("Rescue Centre Dashboard:", response);

      const data = response?.data || response || {};
      setStatsData({
        total_calls: data.total_calls ?? data.totalCalls ?? 0,
        pending: data.pending ?? data.pendingCases ?? 0,
        dispatched: data.dispatched ?? data.dispatchedCases ?? 0,
        rescued: data.rescued ?? data.rescuedAnimals ?? 0,
        recent_calls: Array.isArray(data.recent_calls) ? data.recent_calls : Array.isArray(data.recentCalls) ? data.recentCalls : [],
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
      title: "Rescued Animals",
      value: loading ? "..." : statsData.rescued,
      trend: "Successfully Rescued",
      color: "#6366F1",
      icon: <FaPaw />,
    },
  ];

  const columns = [
    { key: "ticket", title: "Ticket" },
    { key: "reporter", title: "Reporter" },
    { key: "animal_count", title: "Animals" },
    { key: "status", title: "Status" },
    { key: "created_at", title: "Reported At" },
  ];

  const data = statsData.recent_calls.map((item) => ({
    ...item,
    created_at: new Date(item.created_at).toLocaleString(),
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
          onClick={() => alert("Dispatch Rescue")}
        />

        <QuickActionCard
          icon={<FaStethoscope />}
          title="Medical Intake"
          subtitle="Register Animal"
          color="#10B981"
          onClick={() => alert("Medical Intake")}
        />

        <QuickActionCard
          icon={<FaBoxes />}
          title="Inventory"
          subtitle="Shelter Supplies"
          color="#F59E0B"
          onClick={() => alert("Inventory")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Generate Report"
          subtitle="Operational Reports"
          color="#6366F1"
          onClick={() => alert("Reports")}
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
        </div>

        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default RescueCentreAdminDashboard;