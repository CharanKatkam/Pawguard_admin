import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaAmbulance, FaCheck, FaTimes, FaClock, FaPlus } from "react-icons/fa";
import rescueService from "../../services/rescueService";
import { notifyDataChanged } from "../../utils/dataSync";

const RescueRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    animal_type: "Dog",
    location: "",
    description: "",
    reporter_name: "",
    reporter_phone: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rescueService.getRescueRequests();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => ({
        id: item.id || item.request_id || "",
        animal_type: item.animal_type || item.animal || "",
        location: item.location || "",
        description: item.description || item.incident_description || "",
        reporter: item.reporter_name || item.reporter || "",
        phone: item.reporter_phone || item.phone || "",
        status: item.status || "",
        date: item.created_at || item.date || item.timestamp || "",
      }));

      setRequests(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load incoming rescue requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await rescueService.createRescueRequest(formData);
      addToast("Public rescue report recorded!", "success");
      setIsAddModalOpen(false);
      setFormData({ animal_type: "Dog", location: "", description: "", reporter_name: "", reporter_phone: "" });
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to submit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await rescueService.approveRescueRequest(id);
      addToast("Request approved and escalated to active dispatch!", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to approve request", "error");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rescueService.rejectRescueRequest(id, "Rejected by coordinator");
      addToast("Request rejected.", "info");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to reject request", "error");
    }
  };

  const columns = [
    { key: "id", header: "Request ID" },
    { key: "animal_type", header: "Animal Type" },
    { key: "location", header: "Location" },
    { key: "description", header: "Incident Description" },
    { key: "reporter", header: "Reporter Name" },
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
            background: val === "Approved" ? "#ECFDF5" : val === "Rejected" ? "#FEF2F2" : "#FFFBEB",
            color: val === "Approved" ? "#10B981" : val === "Rejected" ? "#EF4444" : "#F59E0B",
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
            Incoming Rescue Requests
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Triage and process emergency rescue calls submitted by citizens.
          </p>
        </div>

        <Can permission="create_rescue_requests">
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
            <span>Log Report</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Incoming" value={requests.length} icon={<FaAmbulance />} color="#2563EB" />
        <StatCard title="Pending Triage" value={requests.filter((r) => r.status === "Pending").length} icon={<FaClock />} color="#F59E0B" />
        <StatCard title="Approved & Escalated" value={requests.filter((r) => r.status === "Approved").length} icon={<FaCheck />} color="#10B981" />
        <StatCard title="Rejected / Invalid" value={requests.filter((r) => r.status === "Rejected").length} icon={<FaTimes />} color="#EF4444" />
      </div>

      <DataTable
        data={requests}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchRequests}
        emptyMessage="No pending public rescue requests."
        module="rescue_requests"
        onView={(item: any) => {
          setSelectedRequest(item);
          setIsViewModalOpen(true);
        }}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Emergency Rescue Call">
        <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Location *</label>
            <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Incident Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Reporter Name</label>
              <input type="text" value={formData.reporter_name} onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Reporter Phone</label>
              <input type="text" value={formData.reporter_phone} onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Logging..." : "Submit Report"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Rescue Request Details">
        {selectedRequest && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div><strong>Request ID:</strong> {selectedRequest.id}</div>
            <div><strong>Animal Type:</strong> {selectedRequest.animal_type}</div>
            <div><strong>Location:</strong> {selectedRequest.location}</div>
            <div><strong>Description:</strong> {selectedRequest.description}</div>
            <div><strong>Reporter:</strong> {selectedRequest.reporter} ({selectedRequest.phone})</div>
            <div><strong>Status:</strong> {selectedRequest.status}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              {selectedRequest.status === "Pending" && (
                <>
                  <button
                    onClick={() => { handleApprove(selectedRequest.id); setIsViewModalOpen(false); }}
                    style={{ padding: "8px 16px", background: "#10B981", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { handleReject(selectedRequest.id); setIsViewModalOpen(false); }}
                    style={{ padding: "8px 16px", background: "#EF4444", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}
                  >
                    Reject
                  </button>
                </>
              )}
              <button onClick={() => setIsViewModalOpen(false)} style={{ padding: "8px 16px", background: "#64748B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RescueRequests;
