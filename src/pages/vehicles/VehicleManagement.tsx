import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaTruck, FaAmbulance, FaWrench, FaPlus } from "react-icons/fa";
import vehicleService from "../../services/vehicleService";
import { notifyDataChanged } from "../../utils/dataSync";

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_number: "",
    model: "",
    type: "Ambulance",
    assigned_driver: "",
    fuel_level: "",
  });

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vehicleService.getVehicles();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => ({
        id: item.id || item.vehicle_id || "",
        vehicle_number: item.vehicle_number || item.plate || "",
        model: item.model || "",
        type: item.type || item.vehicle_type || "",
        assigned_driver: item.assigned_driver || item.driver || "",
        fuel_level: item.fuel_level || "",
        status: item.status || "",
      }));

      const sortedFormatted = formatted.sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.date || a.updated_at || 0).getTime();
        const timeB = new Date(b.created_at || b.date || b.updated_at || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setVehicles(sortedFormatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load vehicle fleet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await vehicleService.createVehicle(formData);
      addToast("Vehicle unit added to fleet!", "success");
      setIsAddModalOpen(false);
fetchVehicles();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to add vehicle", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "vehicle_number", header: "Plate / ID" },
    { key: "model", header: "Vehicle Specification" },
    { key: "type", header: "Class" },
    { key: "assigned_driver", header: "Primary Driver" },
    { key: "fuel_level", header: "Fuel Level" },
    {
      key: "status",
      header: "Operational Status",
      render: (val: string) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600,
            background: val.includes("Ready") ? "#ECFDF5" : val.includes("Dispatched") ? "#EFF6FF" : "#FEF2F2",
            color: val.includes("Ready") ? "#10B981" : val.includes("Dispatched") ? "#2563EB" : "#EF4444",
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
            Vehicle & Ambulance Management
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Fleet monitoring, driver assignments, and rescue ambulance maintenance.
          </p>
        </div>

        <Can permission="create_vehicles">
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
            <span>Add Vehicle Unit</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Fleet Vehicles" value={vehicles.length} icon={<FaTruck />} color="#2563EB" />
        <StatCard title="Ready Ambulances" value={vehicles.filter((v) => v.status.includes("Ready")).length} icon={<FaAmbulance />} color="#10B981" />
        <StatCard title="Under Maintenance" value={vehicles.filter((v) => v.status.includes("Service") || v.status.includes("Maintenance")).length} icon={<FaWrench />} color="#EF4444" />
      </div>

      <DataTable
        data={vehicles}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchVehicles}
        emptyMessage="No vehicles registered in fleet."
        module="vehicles"
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Fleet Vehicle">
        <form onSubmit={handleCreateVehicle} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Vehicle Plate / Code *</label>
            <input type="text" required value={formData.vehicle_number} onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Model Specification</label>
            <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Assigned Driver</label>
              <input type="text" value={formData.assigned_driver} onChange={(e) => setFormData({ ...formData, assigned_driver: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Fuel Level</label>
              <input type="text" value={formData.fuel_level} onChange={(e) => setFormData({ ...formData, fuel_level: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Adding..." : "Add Vehicle"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VehicleManagement;
