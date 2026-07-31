import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHome, FaUsers, FaPaw, FaBoxes, FaAmbulance, FaStethoscope, FaClipboardList } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";

const RescueCentreAdminDashboard = () => {
  const [statsData, setStatsData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getDashboardStats("rescue_centre_admin");
        if (res && res.data) {
          setStatsData(res.data);
        }
      } catch {
        // Fallback handled by dashboardService
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stats = [
    { title: "Rescued Dogs", value: `${statsData.totalPets || 84} Animals`, trend: "+8 this week", color: "#2563EB", icon: <FaPaw /> },
    { title: "Active Agents", value: "14 On Duty", trend: "Full Deployment", color: "#10B981", icon: <FaUsers /> },
    { title: "Facility Occupancy", value: String(statsData.shelterOccupancy || "78%"), trend: "38 / 50 Cages", color: "#F59E0B", icon: <FaHome /> },
    { title: "Inventory Stock", value: "1,240 Units", trend: "Stocked", color: "#6366F1", icon: <FaBoxes /> },
  ];

  const columns = [
    { key: "caseId", title: "Case ID" },
    { key: "petName", title: "Dog / Breed" },
    { key: "assignedAgent", title: "Rescue Agent" },
    { key: "location", title: "Intake Location" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { caseId: "RSC-901", petName: "Max (GSD Mix)", assignedAgent: "Alex Rivera", location: "Downtown Park", status: "Active Intake" },
    { caseId: "RSC-902", petName: "Bella (Labrador)", assignedAgent: "Sam Wilson", location: "North Highway 4", status: "In Treatment" },
    { caseId: "RSC-903", petName: "Charlie (Indie)", assignedAgent: "David Miller", location: "Sector 7 Market", status: "Completed" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Rescue Centre Management Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Facility management: animal intake, field agent dispatch, medical records, and supply inventory.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaAmbulance />} title="Dispatch Rescue Agent" subtitle="Assign field case" color="#2563EB" onClick={() => alert("Dispatch modal")} />
        <QuickActionCard icon={<FaStethoscope />} title="Log Medical Intake" subtitle="Register patient" color="#10B981" onClick={() => alert("Intake modal")} />
        <QuickActionCard icon={<FaBoxes />} title="Check Inventory" subtitle="Review supplies" color="#F59E0B" onClick={() => alert("Inventory modal")} />
        <QuickActionCard icon={<FaClipboardList />} title="Generate Reports" subtitle="Operational metrics" color="#6366F1" onClick={() => alert("Reports modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Active Rescue Operations & Intake Queue
          </h3>
          {loading && <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>Syncing metrics...</span>}
        </div>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default RescueCentreAdminDashboard;
