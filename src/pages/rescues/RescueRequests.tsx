import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaAmbulance, FaCheck, FaTimes, FaClock, FaPlus, FaMapMarkerAlt } from "react-icons/fa";
import rescueService from "../../services/rescueService";
import { rescueStatusBadge, dispatchStage } from "../../utils/rescueStatus.tsx";
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
    reporter_name: "",
    reporter_phone: "",
    location_address: "",
    physical_condition: "visible_healthy",
    severity: "medium",
    is_urgent: false,
    reporter_notes: "",
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

      const formatted = list.map((item: any) => {
        const stage = dispatchStage({ status: item.status, dispatch: item.dispatch });
        return {
          id: item.id || item.request_id || "",
          ticket_number: item.ticket_number || "",
          reporter: item.reporter_name || item.reporter || "",
          phone: item.reporter_phone || item.phone || "",
          location: item.location_address || item.location || "",
          condition: item.physical_condition || "",
          severity: item.severity || "",
          is_urgent: !!item.is_urgent,
          status: String(item.status || "").toLowerCase(),
          rejection_rationale: item.rejection_rationale || "",
          dispatch: item.dispatch || null,
          dispatch_status: stage.label,
          dispatch_bg: stage.bg,
          dispatch_color: stage.color,
          reports: item.reports || [],
          media_urls: item.media_urls || [],
          date: item.created_at || item.date || item.timestamp || "",
          raw: item,
        };
      });

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
      setFormData({
        reporter_name: "",
        reporter_phone: "",
        location_address: "",
        physical_condition: "visible_healthy",
        severity: "medium",
        is_urgent: false,
        reporter_notes: "",
      });
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to submit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await rescueService.approveRescueRequest(id);
      addToast("Request verified and moved to active triage!", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to verify request", "error");
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Rejection reason (optional):") || undefined;
    try {
      await rescueService.rejectRescueRequest(id, reason);
      addToast("Request rejected.", "info");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to reject request", "error");
    }
  };

  const handleEscalate = async (id: string) => {
    try {
      await rescueService.escalateRescue(id, "backup_personnel");
      addToast("Case escalated to backup personnel.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to escalate case", "error");
    }
  };

  const handleLocated = async (id: string) => {
    try {
      await rescueService.markRescueLocated(id);
      addToast("Animal marked as located.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to update case", "error");
    }
  };

  const handleSecured = async (id: string) => {
    try {
      await rescueService.markRescueSecured(id);
      addToast("Animal secured by field team.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to update case", "error");
    }
  };

  const handleAdmitted = async (id: string) => {
    try {
      await rescueService.markRescueAdmitted(id);
      addToast("Animal admitted to the rescue centre.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to admit animal", "error");
    }
  };

  const columns = [
    { key: "ticket_number", header: "Ticket No." },
    { key: "reporter", header: "Reporter Name" },
    { key: "phone", header: "Phone" },
    { key: "location", header: "Location" },
    {
      key: "severity",
      header: "Severity",
      render: (val: string) => (
        <span style={{ textTransform: "uppercase", fontWeight: 600, fontSize: "12px", color: val === "critical" ? "#DC2626" : val === "high" ? "#EA580C" : val === "medium" ? "#F59E0B" : "#16A34A" }}>
          {val || "-"}
        </span>
      ),
    },
    {
      key: "is_urgent",
      header: "Urgent",
      render: (val: boolean) => (val ? <span style={{ color: "#DC2626", fontWeight: 700 }}>YES</span> : <span style={{ color: "#94A3B8" }}>-</span>),
    },
    {
      key: "status",
      header: "Status",
      render: rescueStatusBadge,
    },
    {
      key: "dispatch_status",
      header: "Dispatch Status",
      render: (val: string, row: any) => (
        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: row.dispatch_bg, color: row.dispatch_color }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Incoming" value={requests.length} icon={<FaAmbulance />} color="#2563EB" />
        <StatCard title="Reported (Triage)" value={requests.filter((r) => r.status === "reported").length} icon={<FaClock />} color="#F59E0B" />
        <StatCard title="Verified" value={requests.filter((r) => r.status === "verified").length} icon={<FaCheck />} color="#2563EB" />
        <StatCard title="Dispatched" value={requests.filter((r) => r.status === "dispatched").length} icon={<FaMapMarkerAlt />} color="#7C3AED" />
        <StatCard title="Rescued" value={requests.filter((r) => r.status === "rescued").length} icon={<FaCheck />} color="#10B981" />
        <StatCard title="Rejected / Invalid" value={requests.filter((r) => r.status === "rejected").length} icon={<FaTimes />} color="#EF4444" />
      </div>

      <DataTable
        data={requests}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchRequests}
        emptyMessage="No public rescue requests."
        module="rescue_requests"
        onView={(item: any) => {
          setSelectedRequest(item);
          setIsViewModalOpen(true);
        }}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Emergency Rescue Call">
        <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Location Address *</label>
            <input type="text" required value={formData.location_address} onChange={(e) => setFormData({ ...formData, location_address: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Reporter Name *</label>
              <input type="text" required value={formData.reporter_name} onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Reporter Phone *</label>
              <input type="text" required value={formData.reporter_phone} onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Physical Condition *</label>
              <select value={formData.physical_condition} onChange={(e) => setFormData({ ...formData, physical_condition: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>
                <option value="visible_healthy">Visible / Healthy</option>
                <option value="injured_visible">Injured (visible)</option>
                <option value="fractured_injured">Fractured / Injured</option>
                <option value="critical_condition">Critical Condition</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Severity</label>
              <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}>
            <input type="checkbox" checked={formData.is_urgent} onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })} />
            Urgent case
          </label>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Reporter Notes</label>
            <textarea value={formData.reporter_notes} onChange={(e) => setFormData({ ...formData, reporter_notes: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Logging..." : "Submit Report"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Rescue Request Details${selectedRequest?.ticket_number ? ` — ${selectedRequest.ticket_number}` : ""}`}>
        {selectedRequest && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div><strong>Reporter:</strong> {selectedRequest.reporter} ({selectedRequest.phone})</div>
            <div><strong>Location:</strong> {selectedRequest.location}</div>
            <div><strong>Physical Condition:</strong> <span style={{ textTransform: "capitalize" }}>{String(selectedRequest.condition || "").replace(/_/g, " ")}</span></div>
            <div>
              <strong>Severity:</strong>{" "}
              <span style={{ textTransform: "uppercase", fontWeight: 600, color: selectedRequest.severity === "critical" ? "#DC2626" : selectedRequest.severity === "high" ? "#EA580C" : selectedRequest.severity === "medium" ? "#F59E0B" : "#16A34A" }}>
                {selectedRequest.severity || "-"}
              </span>
              {selectedRequest.is_urgent && <span style={{ marginLeft: "8px", background: "#FEF2F2", color: "#DC2626", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>URGENT</span>}
            </div>
            <div><strong>Status:</strong> {rescueStatusBadge(selectedRequest.status)}</div>
            <div><strong>Reported:</strong> {selectedRequest.date ? new Date(selectedRequest.date).toLocaleString() : "-"}</div>
            {selectedRequest.rejection_rationale && (
              <div style={{ background: "#FEF2F2", padding: "10px", borderRadius: "8px" }}>
                <strong style={{ color: "#DC2626" }}>Rejection rationale:</strong> {selectedRequest.rejection_rationale}
              </div>
            )}
            {selectedRequest.dispatch && (
              <div style={{ background: "#F5F3FF", padding: "10px", borderRadius: "8px" }}>
                <strong style={{ color: "#7C3AED" }}>Dispatch Info</strong>
                <div style={{ marginTop: "6px", fontSize: "14px" }}>
                  {selectedRequest.dispatch.assigned_vehicle_id || selectedRequest.dispatch.vehicle_id ? (
                    <div>Vehicle: {selectedRequest.dispatch.assigned_vehicle_id || selectedRequest.dispatch.vehicle_id}</div>
                  ) : null}
                  {selectedRequest.dispatch.assigned_driver_id ? <div>Driver: {selectedRequest.dispatch.assigned_driver_id}</div> : null}
                  {selectedRequest.dispatch.agents && selectedRequest.dispatch.agents.length > 0 ? (
                    <div>Agents: {selectedRequest.dispatch.agents.map((a: any) => a.agent_id).join(", ")}</div>
                  ) : null}
                  {selectedRequest.dispatch.dispatched_at ? <div>Dispatched: {new Date(selectedRequest.dispatch.dispatched_at).toLocaleString()}</div> : null}
                </div>
              </div>
            )}
            {selectedRequest.media_urls && selectedRequest.media_urls.length > 0 && (
              <div>
                <strong>Evidence:</strong>{" "}
                {selectedRequest.media_urls.map((u: string, i: number) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" style={{ marginRight: "8px", color: "#2563EB" }}>Media {i + 1}</a>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
              {selectedRequest.status === "reported" && (
                <>
                  <Can permission="approve_rescue_requests">
                    <button onClick={() => { handleVerify(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#10B981", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Verify</button>
                  </Can>
                  <Can permission="edit_rescue_requests">
                    <button onClick={() => { handleReject(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#EF4444", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Reject</button>
                  </Can>
                </>
              )}
              {["verified", "dispatched", "located"].includes(selectedRequest.status) && (
                <Can permission="edit_rescue_requests">
                  <button onClick={() => { handleEscalate(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Escalate</button>
                </Can>
              )}
              {selectedRequest.status === "dispatched" && (
                <Can permission="edit_rescues">
                  <button onClick={() => { handleLocated(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#0891B2", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Mark Located</button>
                </Can>
              )}
              {selectedRequest.status === "located" && (
                <Can permission="edit_rescues">
                  <button onClick={() => { handleSecured(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#F59E0B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Mark Secured</button>
                </Can>
              )}
              {selectedRequest.status === "rescued" && (
                <Can permission="edit_rescues">
                  <button onClick={() => { handleAdmitted(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#059669", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer" }}>Admit to Centre</button>
                </Can>
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
