import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHome, FaBed, FaUtensils, FaBoxes, FaUsers, FaClipboardList } from "react-icons/fa";

const ShelterManagerDashboard = () => {
  const stats = [
    { title: "Shelter Animals", value: "38 Dogs", trend: "76% Capacity", color: "#2563EB", icon: <FaHome /> },
    { title: "Cage Occupancy", value: "38 / 50", trend: "12 Available", color: "#10B981", icon: <FaBed /> },
    { title: "Daily Food Kibble", value: "45 kg", trend: "Stocked 14 Days", color: "#F59E0B", icon: <FaUtensils /> },
    { title: "Shelter Staff", value: "8 Active", trend: "On Shift", color: "#6366F1", icon: <FaUsers /> },
  ];

  const columns = [
    { key: "cageNo", title: "Cage / Ward" },
    { key: "petName", title: "Pet Name & ID" },
    { key: "feeding", title: "Diet & Feeding Plan" },
    { key: "careLog", title: "Special Care Requirements" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { cageNo: "Cage A-01", petName: "Bella (DOG-415)", feeding: "Adult Kibble - 400g (Twice)", careLog: "Daily Grooming & Medicated Bath", status: "Healthy" },
    { cageNo: "Cage A-02", petName: "Rocky (DOG-388)", feeding: "High-Calorie Recovery Diet", careLog: "Post-Op Wound Dressing (10 AM)", status: "In Recovery" },
    { cageNo: "Cage B-05", petName: "Bruno (DOG-430)", feeding: "Puppy Formula - 200g", careLog: "Deworming scheduled for Friday", status: "Healthy" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Shelter Operations Dashboard</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Facility care suite: cage allocation, animal feeding schedules, shelter staff rosters, and inventory management.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaBed />} title="Allocate Cage" subtitle="Assign dog to kennel" color="#2563EB" onClick={() => alert("Allocate Cage modal")} />
        <QuickActionCard icon={<FaUtensils />} title="Log Feeding Schedule" subtitle="Update nutrition plan" color="#10B981" onClick={() => alert("Log Feeding modal")} />
        <QuickActionCard icon={<FaBoxes />} title="Request Supplies" subtitle="Order food & medicine" color="#F59E0B" onClick={() => alert("Request Supplies modal")} />
        <QuickActionCard icon={<FaClipboardList />} title="Shift Roster" subtitle="Manage shelter staff" color="#6366F1" onClick={() => alert("Shift Roster modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          Shelter Kennel Allocation & Feeding Registry
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default ShelterManagerDashboard;
