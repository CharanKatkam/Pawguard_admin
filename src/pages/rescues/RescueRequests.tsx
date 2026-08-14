import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaAmbulance, FaCheck, FaTimes, FaClock, FaPlus, FaMapMarkerAlt, FaSearchLocation, FaUserPlus, FaExternalLinkAlt, FaNotesMedical, FaTruck } from "react-icons/fa";
import rescueService from "../../services/rescueService";
import lostFoundService from "../../services/lostFoundService";
import userService from "../../services/userService";
import { rescueStatusBadge, dispatchStage } from "../../utils/rescueStatus.tsx";
import { notifyDataChanged } from "../../utils/dataSync";
import { normalizeRole, getCurrentUserRole } from "../../utils/roleUtils";

interface RescueRequestTableRow {
  id: string;
  ticket_number: string;
  reporter: string;
  phone: string;
  location: string;
  condition: string;
  severity: string;
  is_urgent: boolean;
  status: string;
  rejection_rationale: string;
  dispatch: Record<string, unknown> | null;
  dispatch_status: string;
  dispatch_bg: string;
  dispatch_color: string;
  reports: Record<string, unknown>[];
  media_urls: string[];
  date: string;
  raw: Record<string, unknown>;
  [key: string]: unknown;
}

interface CoordinatorUser {
  id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  roles?: string[];
  [key: string]: unknown;
}

const RescueRequests = () => {
  const navigate = useNavigate();
  const currentUserRole = getCurrentUserRole();
  const isAdmin = currentUserRole === "super_admin" || currentUserRole === "rescue_centre_admin";
  const isCoordinator = currentUserRole === "rescue_coordinator";

  const [requests, setRequests] = useState<RescueRequestTableRow[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const tableSectionRef = useRef<HTMLDivElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<RescueRequestTableRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [assignForm, setAssignForm] = useState({ coordinator_id: "", notes: "" });

  const [formData, setFormData] = useState({
    reporter_name: "",
    reporter_phone: "",
    location_address: "",
    physical_condition: "visible_healthy",
    severity: "medium",
    is_urgent: false,
    reporter_notes: "",
  });

  const fetchCoordinators = useCallback(async () => {
    try {
      const response = await userService.getUsers();
      const list: CoordinatorUser[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      setCoordinators(
        list.filter((u: CoordinatorUser) => normalizeRole(u) === "rescue_coordinator")
      );
    } catch {
      setCoordinators([]);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await rescueService.getRescueRequests();
      const list: Record<string, unknown>[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted: RescueRequestTableRow[] = list.map((item: Record<string, unknown>) => {
        const stage = dispatchStage({ status: item.status as string, dispatch: item.dispatch as Record<string, unknown> });
        return {
          id: String(item.id || item.request_id || ""),
          ticket_number: String(item.ticket_number || ""),
          reporter: String(item.reporter_name || item.reporter || ""),
          phone: String(item.reporter_phone || item.phone || ""),
          location: String(item.location_address || item.location || ""),
          condition: String(item.physical_condition || ""),
          severity: String(item.severity || ""),
          is_urgent: !!item.is_urgent,
          status: String(item.status || "").toLowerCase(),
          rejection_rationale: String(item.rejection_rationale || ""),
          dispatch: (item.dispatch as Record<string, unknown>) || null,
          dispatch_status: stage.label,
          dispatch_bg: stage.bg,
          dispatch_color: stage.color,
          reports: (item.reports as Record<string, unknown>[]) || [],
          media_urls: (item.media_urls as string[]) || [],
          date: String(item.created_at || item.date || item.timestamp || ""),
          raw: item,
        };
      });

      setRequests(formatted);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || "Failed to load incoming rescue requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "new") {
      setIsAddModalOpen(true);
    }
    const statusParam = params.get("status");
    if (statusParam) {
      setStatusFilter(statusParam.toLowerCase());
    }
    void fetchRequests();
    void fetchCoordinators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      addToast(e?.response?.data?.detail || "Failed to submit request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (id: string, reqObj?: Record<string, unknown>) => {
    try {
      await rescueService.approveRescueRequest(id, {
        status: "verified",
        severity: reqObj?.severity ? String(reqObj.severity) : undefined,
        is_urgent: typeof reqObj?.is_urgent === "boolean" ? reqObj.is_urgent : undefined,
      });
      addToast("Request verified and moved to active triage!", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string; error?: { message?: string } } }; message?: string };
      const errMsg = e?.response?.data?.error?.message || e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Failed to verify request";
      addToast(errMsg, "error");
    }
  };

  const openRejectModal = (req: RescueRequestTableRow) => {
    setTargetRejectId(req.id);
    setSelectedRequest(req);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRejectId) return;
    try {
      setIsSubmitting(true);
      await rescueService.rejectRescueRequest(targetRejectId, rejectionReason || undefined);
      addToast("Rescue request rejected and closed.", "info");
      setIsRejectModalOpen(false);
      setIsViewModalOpen(false);
      setRejectionReason("");
      setTargetRejectId(null);
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to reject request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCoordinatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!assignForm.coordinator_id) {
      addToast("Select a rescue coordinator to assign.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await rescueService.assignCoordinator(
        selectedRequest.id,
        assignForm.coordinator_id,
        assignForm.notes || undefined
      );
      addToast("Rescue coordinator assigned successfully!", "success");
      setIsAssignModalOpen(false);
      setIsViewModalOpen(false);
      setAssignForm({ coordinator_id: "", notes: "" });
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to assign coordinator", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async (id: string) => {
    try {
      await rescueService.escalateRescue(id, "backup_personnel");
      addToast("Case escalated to backup personnel.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      addToast(e?.response?.data?.detail || "Failed to escalate case", "error");
    }
  };

  const handleLocated = async (id: string) => {
    try {
      await rescueService.markRescueLocated(id);
      addToast("Dog marked as located.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      addToast(e?.response?.data?.detail || "Failed to update case", "error");
    }
  };

  const handleSecured = async (id: string) => {
    try {
      await rescueService.markRescueSecured(id);
      addToast("Dog secured by field team.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      addToast(e?.response?.data?.detail || "Failed to update case", "error");
    }
  };

  const handleAdmitted = async (id: string) => {
    try {
      await rescueService.markRescueAdmitted(id);
      addToast("Dog admitted to the rescue centre.", "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      addToast(e?.response?.data?.detail || "Failed to admit dog", "error");
    }
  };

  const handleLogFoundPetFromRescue = async (req: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const address = String(req.location || req.location_address || "Rescue Location");
      const lat = req.latitude && req.latitude !== "-" ? Number(req.latitude) : null;
      const lng = req.longitude && req.longitude !== "-" ? Number(req.longitude) : null;
      const notes = [
        req.condition ? `Physical Condition: ${String(req.condition)}` : "",
        req.reporter_notes ? `Reporter Notes: ${String(req.reporter_notes)}` : "",
      ].filter(Boolean).join(" | ");

      const res = await lostFoundService.createFoundReport({
        species: "dog",
        breed_observed: "Rescued Dog",
        color_observed: "Mixed / Unspecified",
        location_address: address,
        latitude: lat,
        longitude: lng,
        found_at: new Date().toISOString(),
        marker_description: notes || `Secured via Rescue Request #${String(req.ticket_number || req.id || "")}`,
      });

      const reportId = (res as { data?: { id?: string }; id?: string })?.data?.id || (res as { id?: string })?.id;
      addToast(`Found pet report created for rescued dog! (${reportId ? `Report #${String(reportId).slice(0, 8)}` : "Saved"})`, "success");
      setIsViewModalOpen(false);
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to log found pet report", "error");
    } finally {
      setIsSubmitting(false);
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
      render: (val: string, row: Record<string, unknown>) => (
        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: String(row.dispatch_bg || ""), color: String(row.dispatch_color || "") }}>
          {val}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_val: unknown, row: RescueRequestTableRow) => (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              setSelectedRequest(row);
              setIsViewModalOpen(true);
            }}
            style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #93C5FD", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            View Details
          </button>
          {["reported", "pending", "new"].includes(row.status) && (isAdmin || isCoordinator) && (
            <>
              <button
                type="button"
                onClick={() => handleVerify(row.id, row)}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Verify
              </button>
              <button
                type="button"
                onClick={() => openRejectModal(row)}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#EF4444", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleStatCardClick = (status: string) => {
    setStatusFilter(status);
    if (tableSectionRef.current) {
      tableSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "pending"
        ? ["reported", "pending", "new"].includes(r.status)
        : statusFilter === "rescued"
        ? ["rescued", "located", "secured", "admitted", "completed"].includes(r.status)
        : statusFilter === "rejected"
        ? ["rejected", "failed", "invalid"].includes(r.status)
        : r.status === statusFilter;

    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      String(r.ticket_number || "").toLowerCase().includes(q) ||
      String(r.reporter || "").toLowerCase().includes(q) ||
      String(r.phone || "").toLowerCase().includes(q) ||
      String(r.location || "").toLowerCase().includes(q) ||
      String(r.severity || "").toLowerCase().includes(q) ||
      String(r.status || "").toLowerCase().includes(q)
    );
  });

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
        <StatCard
          title="Total Incoming"
          value={requests.length}
          icon={<FaAmbulance />}
          color="#2563EB"
          onClick={() => handleStatCardClick("all")}
          selected={statusFilter === "all"}
        />
        <StatCard
          title="Reported (Triage)"
          value={requests.filter((r) => r.status === "reported").length}
          icon={<FaClock />}
          color="#F59E0B"
          onClick={() => handleStatCardClick("reported")}
          selected={statusFilter === "reported"}
        />
        <StatCard
          title="Verified"
          value={requests.filter((r) => r.status === "verified").length}
          icon={<FaCheck />}
          color="#2563EB"
          onClick={() => handleStatCardClick("verified")}
          selected={statusFilter === "verified"}
        />
        <StatCard
          title="Dispatched"
          value={requests.filter((r) => r.status === "dispatched").length}
          icon={<FaMapMarkerAlt />}
          color="#7C3AED"
          onClick={() => handleStatCardClick("dispatched")}
          selected={statusFilter === "dispatched"}
        />
        <StatCard
          title="Rescued"
          value={requests.filter((r) => r.status === "rescued").length}
          icon={<FaCheck />}
          color="#10B981"
          onClick={() => handleStatCardClick("rescued")}
          selected={statusFilter === "rescued"}
        />
        <StatCard
          title="Rejected / Invalid"
          value={requests.filter((r) => r.status === "rejected").length}
          icon={<FaTimes />}
          color="#EF4444"
          onClick={() => handleStatCardClick("rejected")}
          selected={statusFilter === "rejected"}
        />
      </div>

      <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "420px" }}>
          <input
            type="text"
            placeholder="Search ticket, reporter, phone, location, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 36px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>
            🔍
          </span>
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#64748B",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear Search
          </button>
        )}
      </div>

      <div ref={tableSectionRef}>
        {statusFilter !== "all" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "10px",
              padding: "10px 16px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E40AF" }}>
              Filtered by Status: <span style={{ textTransform: "uppercase", fontWeight: 700 }}>{statusFilter}</span> ({filteredRequests.length} of {requests.length} requests)
            </div>
            <button
              onClick={() => setStatusFilter("all")}
              style={{
                background: "#FFFFFF",
                border: "1px solid #93C5FD",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "12px",
                color: "#1D4ED8",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Show All Requests
            </button>
          </div>
        )}

        <DataTable
          data={filteredRequests}
          columns={columns}
          loading={loading}
          error={error}
          onRetry={fetchRequests}
          emptyMessage={statusFilter !== "all" ? `No rescue requests with status "${statusFilter}".` : "No public rescue requests."}
          module="rescue_requests"
          onRowClick={(item: RescueRequestTableRow) => {
            setSelectedRequest(item);
            setIsViewModalOpen(true);
          }}
        />
      </div>

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
                    <div>Vehicle: {String(selectedRequest.dispatch.assigned_vehicle_id || selectedRequest.dispatch.vehicle_id)}</div>
                  ) : null}
                  {selectedRequest.dispatch.assigned_driver_id ? <div>Driver: {String(selectedRequest.dispatch.assigned_driver_id)}</div> : null}
                  {selectedRequest.dispatch.agents && Array.isArray(selectedRequest.dispatch.agents) && selectedRequest.dispatch.agents.length > 0 ? (
                    <div>Agents: {(selectedRequest.dispatch.agents as Record<string, unknown>[]).map((a: Record<string, unknown>) => String(a.agent_id || a.id || "")).join(", ")}</div>
                  ) : null}
                  {selectedRequest.dispatch.dispatched_at ? <div>Dispatched: {new Date(String(selectedRequest.dispatch.dispatched_at)).toLocaleString()}</div> : null}
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
              {["reported", "pending", "new"].includes(selectedRequest.status) && (isAdmin || isCoordinator) && (
                <>
                  <button onClick={() => { handleVerify(selectedRequest.id, selectedRequest); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#10B981", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Verify</button>
                  <button onClick={() => { openRejectModal(selectedRequest); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#EF4444", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Reject</button>
                </>
              )}
              {selectedRequest.status === "verified" && isAdmin && (
                <Can permission="edit_rescues">
                  <button
                    onClick={() => {
                      setAssignForm({ coordinator_id: String(selectedRequest.raw?.coordinator_id || ""), notes: "" });
                      setIsAssignModalOpen(true);
                    }}
                    style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaUserPlus size={12} /> Assign Rescue Coordinator
                  </button>
                </Can>
              )}
              {selectedRequest.status === "verified" && isCoordinator && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    navigate(`/rescue-dispatch?case_id=${encodeURIComponent(selectedRequest.id)}`);
                  }}
                  style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaTruck size={12} /> Accept Case & Dispatch Team
                </button>
              )}
              {["verified", "dispatched", "located"].includes(selectedRequest.status) && (
                <Can permission="edit_rescue_requests">
                  <button onClick={() => { handleEscalate(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Escalate</button>
                </Can>
              )}
              {selectedRequest.status === "dispatched" && (
                <Can permission="edit_rescues">
                  <button onClick={() => { handleLocated(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#0891B2", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Mark Located</button>
                </Can>
              )}
              {selectedRequest.status === "located" && (
                <Can permission="edit_rescues">
                  <button onClick={() => { handleSecured(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#F59E0B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Mark Secured</button>
                </Can>
              )}
              {selectedRequest.status === "rescued" && (
                <Can permission="edit_rescues">
                  <button onClick={() => { handleAdmitted(selectedRequest.id); setIsViewModalOpen(false); }} style={{ padding: "8px 16px", background: "#059669", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Admit to Centre</button>
                </Can>
              )}
              {["rescued", "admitted"].includes(selectedRequest.status) && (
                <button
                  onClick={() => handleLogFoundPetFromRescue(selectedRequest)}
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 16px",
                    background: "#7C3AED",
                    color: "#FFF",
                    borderRadius: "6px",
                    border: "none",
                    cursor: isSubmitting ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                  }}
                >
                  <FaSearchLocation size={12} /> Log as Found Pet for Matching
                </button>
              )}
              {selectedRequest.status === "admitted" && (
                <>
                  <button
                    onClick={() => window.open(`/public/dogs/${selectedRequest.raw?.dog_id || selectedRequest.id}`, "_blank")}
                    style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaExternalLinkAlt size={12} /> View Dog Profile
                  </button>
                  <button
                    onClick={() => window.location.href = "/medical"}
                    style={{ padding: "8px 16px", background: "#0284C7", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaNotesMedical size={12} /> Medical Workflow
                  </button>
                </>
              )}
              <button onClick={() => setIsViewModalOpen(false)} style={{ padding: "8px 16px", background: "#64748B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 600 }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Coordinator${selectedRequest?.ticket_number ? ` — ${selectedRequest.ticket_number}` : ""}`}>
        <form onSubmit={handleAssignCoordinatorSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {coordinators.length === 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", color: "#92400E" }}>
              No rescue coordinators found in the user directory. Add a user with the rescue coordinator role first.
            </div>
          )}
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Rescue Coordinator *</label>
            <select
              required
              value={assignForm.coordinator_id}
              onChange={(e) => setAssignForm({ ...assignForm, coordinator_id: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            >
              <option value="">Select a coordinator...</option>
              {coordinators.map((c: CoordinatorUser) => (
                <option key={c.id} value={c.id}>{String(c.full_name || c.email || c.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Notes (optional)</label>
            <textarea
              rows={3}
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting || coordinators.length === 0} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", cursor: "pointer" }}>{isSubmitting ? "Assigning..." : "Assign Coordinator"}</button>
          </div>
        </form>
      </Modal>

      {/* Reject Request Confirmation Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title={`Reject Rescue Request${selectedRequest?.ticket_number ? ` — ${selectedRequest.ticket_number}` : ""}`}>
        <form onSubmit={handleRejectSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            Are you sure you want to reject this rescue request? Rejecting will close the request and update its status to <strong>REJECTED</strong>.
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Rejection Rationale / Reason (optional)</label>
            <textarea
              rows={3}
              placeholder="Enter reason for rejecting this rescue call..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px", fontSize: "13px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsRejectModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700 }}>
              {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RescueRequests;
