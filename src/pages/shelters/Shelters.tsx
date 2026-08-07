import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaHome, FaBed, FaUserShield, FaPlus } from "react-icons/fa";
import shelterService from "../../services/shelterService";
import { notifyDataChanged } from "../../utils/dataSync";

const Shelters = () => {
  const [shelters, setShelters] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isCageModalOpen, setIsCageModalOpen] = useState(false);


  // Form states
  const [registerForm, setRegisterForm] = useState({
    name: "",
    location: "Main District Hub",
    capacity: 25,
  });

  const [cageForm, setCageForm] = useState({
    kennelId: "KENNEL-101",
    dogId: "DOG-101",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchShelters();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

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
        code: f.code || f.id || "",
        name: f.name || "",
        capacity: f.capacity !== undefined ? `${f.capacity} Cages` : "",
        manager: f.manager || f.manager_name || "",
        status: f.status || "",
      }));
      setShelters(formatted);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load shelter facilities. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.name) {
      addToast("Facility name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.createShelter({
        name: registerForm.name,
        location: registerForm.location,
        capacity: Number(registerForm.capacity),
      });
      addToast(`Facility "${registerForm.name}" registered successfully!`, "success");
      setIsRegisterModalOpen(false);
      setRegisterForm({ name: "", location: "Main District Hub", capacity: 25 });
      fetchShelters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to register facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await shelterService.assignDogToKennel(cageForm.kennelId, cageForm.dogId);
      addToast(`Assigned dog ${cageForm.dogId} to Kennel ${cageForm.kennelId}!`, "success");
      setIsCageModalOpen(false);
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Cage allocation failed.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
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
        <Can permission="create_shelters">
          <QuickActionCard
            icon={<FaPlus />}
            title="Register New Facility"
            subtitle="Onboard rescue centre"
            color="#2563EB"
            onClick={() => setIsRegisterModalOpen(true)}
          />
        </Can>
        <QuickActionCard
          icon={<FaBed />}
          title="Manage Cage Allocation"
          subtitle="Assign cages & kennels"
          color="#10B981"
          onClick={() => setIsCageModalOpen(true)}
        />
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
        <DataTable
          columns={columns}
          data={shelters}
          module="shelters"
          onEdit={async (r) => {
            await shelterService.createShelter(r);
            fetchShelters();
          }}
          onDelete={async (r) => {
            await shelterService.createShelter({ ...r, status: "Inactive" });
            fetchShelters();
          }}
        />
      </div>

      {/* Register New Facility Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Rescue Facility"
      >
        <form onSubmit={handleRegisterFacility} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Facility Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. North Haven Rescue Centre"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Location / Address</label>
            <input
              type="text"
              placeholder="e.g. Sector 4, North Campus"
              value={registerForm.location}
              onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Total Cage Capacity</label>
            <input
              type="number"
              min="1"
              value={registerForm.capacity}
              onChange={(e) => setRegisterForm({ ...registerForm, capacity: Number(e.target.value) })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Registering..." : "Register Facility"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cage Allocation Modal */}
      <Modal
        isOpen={isCageModalOpen}
        onClose={() => setIsCageModalOpen(false)}
        title="Manage Cage & Kennel Allocation"
      >
        <form onSubmit={handleAssignCage} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Kennel ID *</label>
            <input
              type="text"
              required
              placeholder="e.g. KENNEL-104"
              value={cageForm.kennelId}
              onChange={(e) => setCageForm({ ...cageForm, kennelId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Animal ID to Assign *</label>
            <input
              type="text"
              required
              placeholder="e.g. DOG-402"
              value={cageForm.dogId}
              onChange={(e) => setCageForm({ ...cageForm, dogId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsCageModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Assigning..." : "Assign Cage"}
            </button>
          </div>
        </form>
      </Modal>


    </div>
  );
};

export default Shelters;