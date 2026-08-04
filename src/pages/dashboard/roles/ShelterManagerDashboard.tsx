import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import shelterService from "../../../services/shelterService";
import { useDataSync } from "../../../utils/dataSync";

const ShelterManagerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kennelRows, setKennelRows] = useState<any[]>([]);

  const [dashboardData, setDashboardData] = useState({
    total_facilities: 0,
    total_dogs: 0,
    adoptable_dogs: 0,
    total_kennels: 0,
    occupancy_rate: 0,
  });

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getShelterDashboard();

      const data = response?.data || response || {};
      setDashboardData({
        total_facilities: data.total_facilities ?? data.totalFacilities ?? 0,
        total_dogs: data.total_dogs ?? data.totalDogs ?? data.totalPets ?? 0,
        adoptable_dogs: data.adoptable_dogs ?? data.adoptableDogs ?? 0,
        total_kennels: data.total_kennels ?? data.totalKennels ?? 0,
        occupancy_rate: data.occupancy_rate ?? data.occupancyRate ?? 0,
      });

      // Prefer kennel data included in the dashboard payload, otherwise load
      // it live from the shelter facility hierarchy.
      const payloadKennels =
        Array.isArray(data.kennels) ? data.kennels : Array.isArray(data.kennel_list) ? data.kennel_list : null;

      if (payloadKennels) {
        setKennelRows(payloadKennels.map((k: any) => mapKennel(k)));
      } else {
        const shelterRes = await shelterService.getShelters();
        const shelters = unwrapList(shelterRes);

        const sectionResults = await Promise.allSettled(
          shelters.map((s: any) =>
            shelterService.getFacilitySections(s.facility_id ?? s.id)
          )
        );
        const sections = sectionResults.flatMap((r) =>
          r.status === "fulfilled" ? unwrapList(r.value) : []
        );

        const kennelResults = await Promise.allSettled(
          sections.map((sec: any) =>
            shelterService.getSectionKennels(sec.section_id ?? sec.id)
          )
        );
        const kennels = kennelResults.flatMap((r) =>
          r.status === "fulfilled" ? unwrapList(r.value) : []
        );
        setKennelRows(kennels.map((k: any) => mapKennel(k)));
      }
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

  const mapKennel = (k: any) => ({
    cageNo: k.kennel_id ?? k.id ?? k.kennel_name ?? k.name ?? "",
    petName:
      k.dog_name ?? k.pet_name ?? (k.dog ? `${k.dog.name ?? ""} (${k.dog.dog_id ?? k.dog.id ?? ""})` : ""),
    feeding: k.feeding_plan ?? k.diet ?? k.feeding ?? "",
    careLog: k.care_notes ?? k.care_requirements ?? k.care_log ?? k.notes ?? "",
    status: k.status ?? (k.is_occupied ? "Occupied" : "Available"),
  });

  useDataSync(fetchDashboard);

  useEffect(() => {
    fetchDashboard();
  }, []);


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
          onClick={() => navigate("/shelters")}
        />

        <QuickActionCard
          icon={<FaUtensils />}
          title="Log Feeding"
          subtitle="Update nutrition plan"
          color="#10B981"
          onClick={() => navigate("/pets")}
        />

        <QuickActionCard
          icon={<FaBoxes />}
          title="Request Supplies"
          subtitle="Food & Medicine"
          color="#F59E0B"
          onClick={() => navigate("/inventory")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Shift Roster"
          subtitle="Manage Staff"
          color="#6366F1"
          onClick={() => navigate("/users")}
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

        <DataTable
          columns={columns}
          data={kennelRows}
          loading={loading}
          emptyMessage="No kennel allocations found. Allocate a cage from the Shelters module."
        />
      </div>
    </div>
  );
};

export default ShelterManagerDashboard;