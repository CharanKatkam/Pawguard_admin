import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaAmbulance, FaCamera, FaCheckCircle, FaClipboardCheck } from "react-icons/fa";

const RescueAgentDashboard = () => {
  const stats = [
    { title: "Assigned Cases", value: "3 Rescues", trend: "2 In Progress", color: "#2563EB", icon: <FaAmbulance /> },
    { title: "Completed Today", value: "4 Rescued", trend: "+100% Target", color: "#10B981", icon: <FaCheckCircle /> },
    { title: "Photos Uploaded", value: "18 Images", trend: "Intake Verified", color: "#6366F1", icon: <FaCamera /> },
  ];

  const columns = [
    { key: "caseId", title: "Case ID" },
    { key: "location", title: "Rescue Location" },
    { key: "details", title: "Animal Condition" },
    { key: "eta", title: "ETA to Scene" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { caseId: "RSC-801", location: "Central Railway Gate 2", details: "Injured Dog - Hind Leg Fracture", eta: "10 Mins", status: "En Route" },
    { caseId: "RSC-802", location: "Sector 14 Construction Site", details: "3 Puppies - Malnourished", eta: "On Scene", status: "In Progress" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Field Rescue Agent Console</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Field execution suite: view assigned dispatch cases, update rescue status, upload intake photos, and log animal arrival.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaCamera />} title="Upload Rescue Photos" subtitle="Attach scene evidence" color="#2563EB" onClick={() => alert("Upload Photos modal")} />
        <QuickActionCard icon={<FaClipboardCheck />} title="Update Case Status" subtitle="Mark arrived or complete" color="#10B981" onClick={() => alert("Update Status modal")} />
        <QuickActionCard icon={<FaAmbulance />} title="Confirm Shelter Delivery" subtitle="Handover to vet team" color="#6366F1" onClick={() => alert("Shelter Delivery modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          Assigned Dispatch Worklist
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default RescueAgentDashboard;
