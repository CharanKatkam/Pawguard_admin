import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaTruck, FaAmbulance, FaUserCheck, FaClock, FaPlus } from "react-icons/fa";
import rescueService from "../../services/rescueService";
import { notifyDataChanged } from "../../utils/dataSync";

const RescueDispatch = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    case_id: "",
    vehicle_id: "",
    driver_id: "",
    agent_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchDispatches();
  }, []);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rescueService.getDispatches();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => ({
        id: item.id || item.dispatch_id || "",
        case_id: item.case_id || "",
        vehicle_id: item.vehicle_id || item.vehicle || "",
        driver: item.driver_id || item.driver || "",
        agent: item.agent_id || item.agent || "",
        dispatch_time: item.dispatch_time || item.created_at || "",
        status: item.status || "",
      }));

      setDispatches(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load dispatch operations.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await rescueService.createDispatch(formData);
      addToast("Rescue team dispatched!", "success");
      setIsAddModalOpen(false);
      fetchDispatches();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to dispatch rescue team", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "id", header: "Dispatch #" },
    { key: "case_id", header: "Target Case" },
    { key: "vehicle_id", header: "Vehicle Unit" },
    { key: "driver", header: "Assigned Driver" },
    { key: "agent", header: "Lead Rescue Agent" },
    { key: "dispatch_time", header: "Dispatch Time" },
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
            background: val === "Arrived" ? "#ECFDF5" : val === "En Route" ? "#EFF6FF" : "#FFFBEB",
            color: val === "Arrived" ? "#10B981" : val === "En Route" ? "#2563EB" : "#F59E0B",
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
            Rescue Dispatch Center
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Real-time ambulance and rescue squad dispatch control.
          </p>
        </div>

        <Can permission="create_rescue_dispatch">
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
            <span>New Dispatch</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Active Dispatches" value={dispatches.length} icon={<FaTruck />} color="#2563EB" />
        <StatCard title="En Route" value={dispatches.filter((d) => d.status === "En Route").length} icon={<FaAmbulance />} color="#F59E0B" />
        <StatCard title="Arrived On Scene" value={dispatches.filter((d) => d.status === "Arrived").length} icon={<FaUserCheck />} color="#10B981" />
        <StatCard title="Standby Units" value="—" icon={<FaClock />} color="#8B5CF6" />
      </div>

      <DataTable
        data={dispatches}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchDispatches}
        emptyMessage="No dispatches currently active."
        module="rescue_dispatch"
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Dispatch Rescue Team">
        <form onSubmit={handleCreateDispatch} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Target Case ID *</label>
            <input type="text" required placeholder="e.g. RSC-102" value={formData.case_id} onChange={(e) => setFormData({ ...formData, case_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Vehicle Unit</label>
              <input type="text" value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Driver</label>
              <input type="text" value={formData.driver_id} onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Rescue Agent Lead</label>
            <input type="text" value={formData.agent_id} onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Dispatching..." : "Confirm Dispatch"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RescueDispatch;
