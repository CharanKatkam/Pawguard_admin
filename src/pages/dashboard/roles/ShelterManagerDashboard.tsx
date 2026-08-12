import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import {
  FaHome,
  FaBed,
  FaPaw,
  FaBoxes,
  FaUsers,
} from "react-icons/fa";
import shelterService from "../../../services/shelterService";
import petService from "../../../services/petService";
import { useDataSync } from "../../../utils/dataSync";

const IN_SHELTER_STATUSES = ["rescued", "clinic", "shelter"];

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
    in_shelter_dogs: 0,
    total_capacity: 0,
  });

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const mapKennel = (k: any, sectionName?: string) => ({
    id: k.id || k.kennel_id || "",
    cageNo: k.identifier || k.kennel_number || k.name || "",
    section: sectionName || k.section_name || "",
    capacity: k.capacity ?? "",
    status: k.sanitation_state || k.sanitation || "",
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Derive every headline metric from real record endpoints (facilities,
      // dogs, kennel hierarchy). The free-form /dashboards/shelter payload is
      // intentionally not trusted for counts or occupancy.
      const [facilitiesRes, dogsRes] = await Promise.all([
        shelterService.getShelters({ page: 1, page_size: 100 }),
        petService.getPets({ page: 1, page_size: 100 }),
      ]);

      const facilities = unwrapList(facilitiesRes);
      const dogs = unwrapList(dogsRes);

      const totalCapacity = facilities.reduce(
        (acc: number, f: any) => acc + (Number(f.total_capacity) || 0),
        0
      );
      const inShelterDogs = dogs.filter((d: any) =>
        IN_SHELTER_STATUSES.includes(String(d.status).toLowerCase())
      ).length;
      const adoptableDogs = dogs.filter((d: any) => d.is_adoptable).length;
      const totalDogs =
        dogsRes?.meta?.total ?? dogsRes?.data?.meta?.total ?? dogs.length;

      setDashboardData({
        total_facilities: facilities.length,
        total_dogs: totalDogs,
        adoptable_dogs: adoptableDogs,
        in_shelter_dogs: inShelterDogs,
        total_capacity: totalCapacity,
        total_kennels: 0,
      });

      // Kennel registry loaded live from the shelter facility hierarchy.
      const sectionResults = await Promise.allSettled(
        facilities.map((s: any) =>
          shelterService.getFacilitySections(s.facility_id ?? s.id)
        )
      );
      const sections = sectionResults.flatMap((r) =>
        r.status === "fulfilled" ? unwrapList(r.value) : []
      );

      const sectionNames: Record<string, string> = {};
      for (const sec of sections) {
        if (sec?.id) sectionNames[sec.id] = sec.name || sec.id;
      }

      const kennelResults = await Promise.allSettled(
        sections.map((sec: any) =>
          shelterService.getSectionKennels(sec.section_id ?? sec.id)
        )
      );
      const kennels = kennelResults.flatMap((r) =>
        r.status === "fulfilled" ? unwrapList(r.value) : []
      );
      setKennelRows(kennels.map((k: any) => mapKennel(k, sectionNames[k.section_id])));
      setDashboardData((prev) => ({ ...prev, total_kennels: kennels.length }));
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

  useDataSync(fetchDashboard);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const { total_capacity, in_shelter_dogs } = dashboardData;
  const occupancyText =
    total_capacity > 0
      ? `${Math.round((in_shelter_dogs / total_capacity) * 100)}%`
      : "N/A";

  const stats = [
    {
      title: "Shelter Dogs",
      value: loading ? "..." : dashboardData.total_dogs,
      trend: `${dashboardData.adoptable_dogs} Adoptable`,
      color: "#2563EB",
      icon: <FaHome />,
    },
    {
      title: "Kennels",
      value: loading ? "..." : dashboardData.total_kennels,
      trend: "Registered Kennels",
      color: "#10B981",
      icon: <FaBed />,
    },
    {
      title: "Occupancy",
      value: loading ? "..." : occupancyText,
      trend: `${in_shelter_dogs} In Care / ${total_capacity} Capacity`,
      color: "#F59E0B",
      icon: <FaPaw />,
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
    { key: "section", title: "Section" },
    { key: "capacity", title: "Capacity" },
    { key: "status", title: "Sanitation State" },
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
          Facility care suite: cage allocation, shelter capacity, kennel sanitation
          and inventory management.
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
          icon={<FaPaw />}
          title="Register Dog"
          subtitle="New dog intake"
          color="#10B981"
          onClick={() => navigate("/pets?action=register")}
        />

        <QuickActionCard
          icon={<FaBoxes />}
          title="Request Supplies"
          subtitle="Food & Medicine"
          color="#F59E0B"
          onClick={() => navigate("/inventory")}
        />

        <QuickActionCard
          icon={<FaUsers />}
          title="Staff Roster"
          subtitle="View Shelter Staff"
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
            Kennel Registry & Sanitation Status
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
          emptyMessage="No kennels registered yet. Create kennels from the Shelters module."
        />
      </div>
    </div>
  );
};

export default ShelterManagerDashboard;
