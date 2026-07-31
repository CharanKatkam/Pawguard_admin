import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaAmbulance, FaUserPlus, FaMapMarkerAlt, FaClipboardList, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const RescueCoordinatorDashboard = () => {
  const stats = [
    { title: "Active Emergency Cases", value: "6 Calls", trend: "High Priority", trendUp: false, color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Agents On Field", value: "12 Agents", trend: "Deployed", color: "#2563EB", icon: <FaAmbulance /> },
    { title: "Rescues Today", value: "14 Rescued", trend: "+4 vs yesterday", color: "#10B981", icon: <FaCheckCircle /> },
    { title: "Tracking Active", value: "100%", trend: "GPS Online", color: "#6366F1", icon: <FaMapMarkerAlt /> },
  ];

  const columns = [
    { key: "rescueId", title: "Rescue ID" },
    { key: "distressType", title: "Incident Details" },
    { key: "location", title: "Location" },
    { key: "agent", title: "Assigned Agent" },
    { key: "priority", title: "Priority" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { rescueId: "DIST-1092", distressType: "Injured Dog near Central Station", location: "Central Railway Gate 2", agent: "Alex Rivera", priority: "Urgent", status: "In Transit" },
    { rescueId: "DIST-1093", distressType: "Abandoned Puppies in Construction", location: "Sector 14 Block B", agent: "Sam Wilson", priority: "High", status: "Assigned" },
    { rescueId: "DIST-1094", distressType: "Trapped Dog in Canal", location: "Westside Bridge", agent: "David Miller", priority: "Critical", status: "En Route" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Rescue Coordinator Control Center</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Emergency response management: dispatch field agents, track rescue vehicles, and coordinate animal intake.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaAmbulance />} title="New Emergency Case" subtitle="Log distress call" color="#EF4444" onClick={() => alert("Distress Call modal")} />
        <QuickActionCard icon={<FaUserPlus />} title="Assign Field Agent" subtitle="Dispatch agent to scene" color="#2563EB" onClick={() => alert("Assign Agent modal")} />
        <QuickActionCard icon={<FaMapMarkerAlt />} title="Track Agents" subtitle="Live GPS map view" color="#10B981" onClick={() => alert("Live Tracking GPS")} />
        <QuickActionCard icon={<FaClipboardList />} title="Rescue Log Export" subtitle="Download reports" color="#6366F1" onClick={() => alert("Export Logs")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          Active Distress Calls & Agent Dispatch Stream
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default RescueCoordinatorDashboard;
