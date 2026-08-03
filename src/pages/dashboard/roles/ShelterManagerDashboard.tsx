import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import {
  FaHome,
  FaBed,
  FaUtensils,
  FaBoxes,
  FaUsers,
  FaClipboardList,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";

const ShelterManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState({
    total_facilities: 0,
    total_dogs: 0,
    adoptable_dogs: 0,
    total_kennels: 0,
    occupancy_rate: 0,
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getShelterDashboard();
      console.log("Shelter Dashboard:", response);

      const data = response?.data || response || {};
      setDashboardData({
        total_facilities: data.total_facilities ?? data.totalFacilities ?? 0,
        total_dogs: data.total_dogs ?? data.totalDogs ?? data.totalPets ?? 0,
        adoptable_dogs: data.adoptable_dogs ?? data.adoptableDogs ?? 0,
        total_kennels: data.total_kennels ?? data.totalKennels ?? 0,
        occupancy_rate: data.occupancy_rate ?? data.occupancyRate ?? 0,
      });
    } catch (err: any) {
      console.error("Shelter Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load shelter manager metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };


  const stats = [
    {
      title: "Shelter Animals",
      value: loading ? "..." : dashboardData.total_dogs,
      trend: `${dashboardData.adoptable_dogs} Adoptable`,
      color: "#2563EB",
      icon: <FaHome />,
    },
    {
      title: "Kennels",
      value: loading ? "..." : dashboardData.total_kennels,
      trend: "Available Kennels",
      color: "#10B981",
      icon: <FaBed />,
    },
    {
      title: "Occupancy",
      value: loading ? "..." : `${dashboardData.occupancy_rate}%`,
      trend: "Current Capacity",
      color: "#F59E0B",
      icon: <FaUtensils />,
    },
    {
      title: "Facilities",
      value: loading ? "..." : dashboardData.total_facilities,
      trend: "Shelter Centers",
      color: "#6366F1",
      icon: <FaUsers />,
    },
  ];

  const columns = [
    { key: "cageNo", title: "Cage / Ward" },
    { key: "petName", title: "Pet Name & ID" },
    { key: "feeding", title: "Diet & Feeding Plan" },
    { key: "careLog", title: "Special Care Requirements" },
    { key: "status", title: "Status" },
  ];

  const data = [
    {
      cageNo: "Cage A-01",
      petName: "Bella (DOG-415)",
      feeding: "Adult Kibble - 400g (Twice)",
      careLog: "Daily Grooming & Medicated Bath",
      status: "Healthy",
    },
    {
      cageNo: "Cage A-02",
      petName: "Rocky (DOG-388)",
      feeding: "High-Calorie Recovery Diet",
      careLog: "Post-Op Wound Dressing (10 AM)",
      status: "In Recovery",
    },
    {
      cageNo: "Cage B-05",
      petName: "Bruno (DOG-430)",
      feeding: "Puppy Formula - 200g",
      careLog: "Deworming scheduled for Friday",
      status: "Healthy",
    },
  ];

  return (
    <div>
      {/* Hero */}
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
          Shelter Operations Dashboard
        </h1>

        <p
          style={{
            margin: "6px 0 0",
            color: "#94A3B8",
            fontSize: "13px",
          }}
        >
          Facility care suite: cage allocation, animal feeding schedules,
          shelter staff rosters and inventory management.
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
          icon={<FaBed />}
          title="Allocate Cage"
          subtitle="Assign dog to kennel"
          color="#2563EB"
          onClick={() => alert("Allocate Cage")}
        />

        <QuickActionCard
          icon={<FaUtensils />}
          title="Log Feeding"
          subtitle="Update nutrition plan"
          color="#10B981"
          onClick={() => alert("Log Feeding")}
        />

        <QuickActionCard
          icon={<FaBoxes />}
          title="Request Supplies"
          subtitle="Food & Medicine"
          color="#F59E0B"
          onClick={() => alert("Request Supplies")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Shift Roster"
          subtitle="Manage Staff"
          color="#6366F1"
          onClick={() => alert("Shift Roster")}
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

      {/* Table */}

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
            Shelter Kennel Allocation & Feeding Registry
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

        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default ShelterManagerDashboard;