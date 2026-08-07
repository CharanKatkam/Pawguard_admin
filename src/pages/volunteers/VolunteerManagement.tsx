import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaUserFriends, FaClipboardList, FaCheckCircle, FaPlus } from "react-icons/fa";
import volunteerService from "../../services/volunteerService";
import { notifyDataChanged } from "../../utils/dataSync";

const VolunteerManagement = () => {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "Morning Feeding & Kennels Sanitation",
    location: "North Haven Shelter Facility",
    start_time: "08:00 AM",
    end_time: "12:00 PM",
    capacity: 5,
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await volunteerService.getShifts();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => ({
        id: item.id || item.shift_id || "",
        title: item.title || item.task || item.activity || "",
        location: item.location || "",
        timing:
          item.start_time && item.end_time
            ? `${item.start_time} - ${item.end_time}`
            : item.schedule || "",
        capacity: item.capacity ?? 0,
        enrolled: item.enrolled ?? item.volunteers_count ?? 0,
        status: item.status || "",
      }));

      setShifts(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load volunteer shifts.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await volunteerService.createShift(formData);
      addToast("Volunteer shift created!", "success");
      setIsAddModalOpen(false);
fetchShifts();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create shift", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "id", header: "Shift #" },
    { key: "title", header: "Task / Activity" },
    { key: "location", header: "Location" },
    { key: "timing", header: "Timing" },
    { key: "capacity", header: "Volunteers Needed" },
    { key: "enrolled", header: "Currently Enrolled" },
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
            background: val === "Open" ? "#ECFDF5" : "#EFF6FF",
            color: val === "Open" ? "#10B981" : "#2563EB",
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
            Volunteer Management
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Schedule volunteer shifts, track task assignments, and monitor attendance.
          </p>
        </div>

        <Can permission="create_volunteers">
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
            <span>Create Shift</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Active Volunteer Roster" value={28} icon={<FaUserFriends />} color="#2563EB" />
        <StatCard title="Scheduled Shifts" value={shifts.length} icon={<FaClipboardList />} color="#F59E0B" />
        <StatCard title="Completed Shifts This Week" value={19} icon={<FaCheckCircle />} color="#10B981" />
      </div>

      <DataTable
        data={shifts}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchShifts}
        emptyMessage="No volunteer shifts currently scheduled."
        module="volunteers"
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Volunteer Shift">
        <form onSubmit={handleCreateShift} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Shift Title *</label>
            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Location</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Start Time</label>
              <input type="text" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>End Time</label>
              <input type="text" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Capacity</label>
              <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Creating..." : "Save Shift"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VolunteerManagement;
