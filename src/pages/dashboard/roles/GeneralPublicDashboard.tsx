import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaPaw, FaAmbulance, FaHeart, FaHome } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";

const GeneralPublicDashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getStaffDashboard();
      console.log("Public/Staff Dashboard:", res);
      const data = res?.data || res || {};
      setDashboardData(data);
    } catch (err: any) {
      console.error("Public Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load community portal data. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const dogsList = Array.isArray(dashboardData?.dogs)
    ? dashboardData.dogs
    : Array.isArray(dashboardData?.pets)
    ? dashboardData.pets
    : Array.isArray(dashboardData)
    ? dashboardData
    : [];

  const stats = [
    { title: "Adoptable Dogs", value: loading ? "..." : String(dashboardData?.adoptable_dogs ?? dashboardData?.adoptableDogs ?? dogsList.length), trend: "Browsing Open", color: "#2563EB", icon: <FaPaw /> },
    { title: "Rescue Facilities", value: loading ? "..." : String(dashboardData?.rescue_facilities ?? dashboardData?.rescueFacilities ?? "0"), trend: "Open Visitors", color: "#10B981", icon: <FaHome /> },
    { title: "Total Rescued", value: loading ? "..." : String(dashboardData?.total_rescued ?? dashboardData?.totalRescued ?? "0"), trend: "Saved", color: "#F59E0B", icon: <FaHeart /> },
  ];

  const columns = [
    { key: "petId", title: "Pet ID" },
    { key: "name", title: "Pet Name" },
    { key: "breed", title: "Breed" },
    { key: "age", title: "Age" },
    { key: "shelter", title: "Shelter Location" },
    { key: "status", title: "Status" },
  ];

  const formattedDogs = dogsList.map((dog: any, idx: number) => ({
    petId: dog.petId || dog.registration_number || dog.id || `DOG-${415 + idx}`,
    name: dog.name || "-",
    breed: dog.breed || "-",
    age: dog.age || dog.estimated_age || "-",
    shelter: dog.shelter || dog.location || "-",
    status: dog.status || "Adoptable",
  }));

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Public Community Portal</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Community portal: report stray animals in distress, browse adoptable dogs, and locate rescue shelters.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaAmbulance />} title="Report Stray in Distress" subtitle="Submit emergency location" color="#EF4444" onClick={() => alert("Report Distress modal")} />
        <QuickActionCard icon={<FaHeart />} title="Submit Adoption Application" subtitle="Apply to adopt a pet" color="#2563EB" onClick={() => alert("Apply to Adopt modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Featured Adoptable Dogs Looking for a Home
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading featured dogs...</span>}
        </div>
        <DataTable columns={columns} data={formattedDogs} />
      </div>
    </div>
  );
};

export default GeneralPublicDashboard;

