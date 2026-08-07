import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaHandHoldingHeart, FaHome, FaDog, FaPlus } from "react-icons/fa";
import fosterService from "../../services/fosterService";
import { notifyDataChanged } from "../../utils/dataSync";

const FosterManagement = () => {
  const [fosters, setFosters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    dog_id: "",
    foster_family_id: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchFosters();
  }, []);

  const fetchFosters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fosterService.getFosterPlacements();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => ({
        id: item.id || item.placement_id || "",
        dog_name: item.dog_name || item.dog?.name || item.dog_id || "",
        foster_family: item.foster_family_name || item.foster_family?.name || item.foster_family_id || "",
        contact_phone: item.contact_phone || item.foster_family?.phone || "",
        start_date: item.start_date || "",
        end_date: item.end_date || "",
        status: item.status || "",
      }));

      setFosters(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load foster placements.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await fosterService.createPlacement(formData);
      addToast("Foster placement created!", "success");
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
    { key: "id", header: "Placement #" },
    { key: "dog_name", header: "Dog" },
    { key: "foster_family", header: "Foster Family" },
    { key: "contact_phone", header: "Contact Phone" },
    { key: "start_date", header: "Start Date" },
    { key: "end_date", header: "Expected End Date" },
    {
      key: "status",
      header: "Status",
      render: (val: string) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600,
            background: val === "Active Placement" ? "#ECFDF5" : "#EFF6FF",
            color: val === "Active Placement" ? "#10B981" : "#2563EB",
          }}
        >
          {val}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Foster Management
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Track temporary foster homes, active placements, and foster care applications.
          </p>
        </div>

        <Can permission="create_foster_placements">
          <button
            onClick={() => setIsAddModalOpen(true)}
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
            <span>New Foster Placement</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Active Foster Homes" value={fosters.length} icon={<FaHome />} color="#2563EB" />
        <StatCard title="Dogs in Foster Care" value={fosters.filter((f) => f.status === "Active Placement").length} icon={<FaDog />} color="#10B981" />
        <StatCard title="Approved Families" value={14} icon={<FaHandHoldingHeart />} color="#8B5CF6" />
      </div>

      <DataTable
        data={fosters}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchFosters}
        emptyMessage="No active foster placements found."
        module="foster_placements"
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="New Foster Placement">
        <form onSubmit={handleCreatePlacement} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Dog ID / Name *</label>
            <input type="text" required value={formData.dog_id} onChange={(e) => setFormData({ ...formData, dog_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Foster Family / Host *</label>
            <input type="text" required value={formData.foster_family_id} onChange={(e) => setFormData({ ...formData, foster_family_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Start Date</label>
              <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Expected End Date</label>
              <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
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
