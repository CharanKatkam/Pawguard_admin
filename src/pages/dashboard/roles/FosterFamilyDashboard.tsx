import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaPaw, FaStethoscope, FaCalendarCheck, FaCamera } from "react-icons/fa";

const FosterFamilyDashboard = () => {
  const stats = [
    { title: "Fostered Pets", value: "1 Dog", trend: "Active Care", color: "#2563EB", icon: <FaPaw /> },
    { title: "Care Duration", value: "45 Days", trend: "Healthy", color: "#10B981", icon: <FaCalendarCheck /> },
    { title: "Next Vet Check", value: "Aug 5th", trend: "Scheduled", color: "#6366F1", icon: <FaStethoscope /> },
  ];

  const columns = [
    { key: "petId", title: "Pet ID" },
    { key: "name", title: "Pet Name" },
    { key: "breed", title: "Breed" },
    { key: "diet", title: "Dietary Guidance" },
    { key: "status", title: "Care Status" },
  ];

  const data = [
    { petId: "DOG-420", name: "Daisy", breed: "Indie Rescue (6 mos)", diet: "Puppy Formula Kibble (300g/day)", status: "Active Foster Care" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Foster Family Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Foster parent portal: view fostered pet details, medical checkup schedules, dietary guidelines, and upload updates.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaCamera />} title="Upload Pet Photo" subtitle="Share health update photo" color="#2563EB" onClick={() => alert("Upload Photo modal")} />
        <QuickActionCard icon={<FaStethoscope />} title="Request Vet Appointment" subtitle="Book routine checkup" color="#10B981" onClick={() => alert("Request Vet modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
          My Fostered Pet Profile & Medical Plan
        </h3>
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default FosterFamilyDashboard;
