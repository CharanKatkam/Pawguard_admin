import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaHandHoldingHeart, FaHome, FaDog, FaPlus } from "react-icons/fa";
import fosterService from "../../services/fosterService";
import petService from "../../services/petService";
import { notifyDataChanged } from "../../utils/dataSync";

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

const FosterManagement = () => {
  const [fosters, setFosters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dogs, setDogs] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    profileId: "",
    dog_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchFosters();
  }, []);

  const fetchFosters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fosterService.getFosterProfiles();
      const list = unwrapList(response);

      const formatted = list.map((item: any) => {
        const user = item.user || {};
        return {
          id: item.id || "",
          foster_family:
            user.full_name || user.name || user.email || item.id || "",
          status: item.status || "",
          active_count: item.active_count ?? 0,
          max_capacity: item.max_capacity ?? "",
          is_available: !!item.is_available,
        };
      });

      setFosters(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load foster profiles.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setFormData({ profileId: "", dog_id: "", notes: "" });
    setIsAddModalOpen(true);
    try {
      const dogsRes = await petService.getPets();
      const list = unwrapList(dogsRes);
      setDogs(
        list.map((d: any) => ({
          id: d.id || d.dog_id || "",
          label: `${d.name || "Dog"} (${d.registration_number || d.id})`,
        }))
      );
    } catch {
      setDogs([]);
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.profileId || !formData.dog_id) {
      addToast("Please select both a foster profile and a dog.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await fosterService.placeDog(formData.profileId, {
        dog_id: formData.dog_id,
        notes: formData.notes || undefined,
      });
      addToast("Dog placed in foster care!", "success");
      setIsAddModalOpen(false);
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create placement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "id", header: "Profile #" },
    { key: "foster_family", header: "Foster Family" },
    { key: "status", header: "Status" },
    { key: "active_count", header: "Active Placements" },
    { key: "max_capacity", header: "Capacity" },
  ];

  const availableHomes = fosters.filter((f) => f.is_available).length;
  const dogsInFoster = fosters.reduce((acc, f) => acc + Number(f.active_count || 0), 0);

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Foster Management
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Track foster families, active placements, and foster care applications.
          </p>
        </div>

        <Can permission="create_foster_placements">
          <button
            onClick={openAddModal}
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <FaPlus size={14} />
            <span>Place Dog in Foster Care</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Foster Profiles" value={fosters.length} icon={<FaHome />} color="#2563EB" />
        <StatCard title="Available Homes" value={availableHomes} icon={<FaHandHoldingHeart />} color="#8B5CF6" />
        <StatCard title="Dogs in Foster Care" value={dogsInFoster} icon={<FaDog />} color="#10B981" />
      </div>

      <DataTable
        data={fosters}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchFosters}
        emptyMessage="No foster profiles found."
        module="foster_placements"
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Place Dog in Foster Care">
        <form onSubmit={handleCreatePlacement} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Foster Family / Profile *</label>
            <select
              required
              value={formData.profileId}
              onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <option value="">Choose a foster profile...</option>
              {fosters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.foster_family}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Dog to Place *</label>
            <select
              required
              value={formData.dog_id}
              onChange={(e) => setFormData({ ...formData, dog_id: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <option value="">Choose a dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Placing..." : "Confirm Placement"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FosterManagement;
