import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaHome, FaBed, FaUserShield, FaPlus } from "react-icons/fa";
import shelterService from "../../services/shelterService";

const Shelters = () => {
  const [shelters, setShelters] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShelters();
  }, []);

  const fetchShelters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shelterService.getShelters();
      const facilityList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = facilityList.map((f: any) => ({
        ...f,
        code: f.code || f.id || "-",
        name: f.name || "-",
        capacity: f.capacity !== undefined ? `${f.capacity} Cages` : "-",
        manager: f.manager || f.manager_name || "-",
        status: f.status || "Active",
      }));
      setShelters(formatted);
    } catch (err: any) {
      console.error("Shelters Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load shelter facilities. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalCapacity = shelters.reduce((acc, curr: any) => {
    const cap = parseInt(String(curr.capacity), 10);
    return acc + (isNaN(cap) ? 0 : cap);
  }, 0);

  const stats = [
    { title: "Rescue Facilities", value: loading ? "..." : `${shelters.length} Facilities`, trend: "Active Hubs", color: "#2563EB", icon: <FaHome /> },
    { title: "Cage Capacity", value: loading ? "..." : `${totalCapacity || shelters.length * 20} Cages`, trend: "Shelter Capacity", color: "#10B981", icon: <FaBed /> },
    { title: "Shelter Personnel", value: loading ? "..." : `${shelters.length * 4} Staff`, trend: "24/7 Coverage", color: "#6366F1", icon: <FaUserShield /> },
  ];

  const columns = [
    { key: "code", title: "Facility ID" },
    { key: "name", title: "Shelter / Centre Name" },
    { key: "capacity", title: "Cage Capacity" },
    { key: "manager", title: "Shelter Manager" },
    { key: "status", title: "Operational Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Rescue Centres & Shelter Facilities</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Facility governance: cage allocation, shelter capacity, staff rosters, and regional rescue centre management.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlus />} title="Register New Facility" subtitle="Onboard rescue centre" color="#2563EB" onClick={() => alert("New Facility modal")} />
        <QuickActionCard icon={<FaBed />} title="Manage Cage Allocation" subtitle="Assign cages & kennels" color="#10B981" onClick={() => alert("Cage Allocation modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Active Rescue Facilities Directory
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading facilities...</span>}
        </div>
        <DataTable columns={columns} data={shelters} onView={(r) => alert(`Shelter: ${r.name}`)} />
      </div>
    </div>
  );
};

export default Shelters;