import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaAmbulance,
  FaCheck,
  FaTimes,
  FaClock,
  FaPlus,
  FaTruck,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaPhoneAlt,
  FaUser,
  FaInfoCircle,
} from "react-icons/fa";
import rescueService from "../../services/rescueService";
import vehicleService from "../../services/vehicleService";
import { rescueStatusBadge, dispatchStage } from "../../utils/rescueStatus.tsx";
import { notifyDataChanged } from "../../utils/dataSync";
import { getCurrentUserRole, getCurrentUser } from "../../utils/roleUtils";
import { formatDateTime } from "../../utils/dateUtils";

export interface RescueRequestTableRow {
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
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_number?: string;
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

const RescueRequests = () => {
  const currentUser = getCurrentUser();
  const currentUserRole = getCurrentUserRole();
  const isRescueCentreAdmin = currentUserRole === "rescue_centre_admin";
  const isSuperAdmin = currentUserRole === "super_admin";
  const isAdmin = isSuperAdmin || isRescueCentreAdmin;

  const currentRescueCentreId =
    (currentUser as any)?.rescue_centre_id ||
    (currentUser as any)?.rescue_center_id ||
    (currentUser as any)?.rescue_facility_id ||
    (currentUser as any)?.facility_id ||
    (currentUser as any)?.organization_id ||
    (currentUser as any)?.id;

  const [requests, setRequests] = useState<RescueRequestTableRow[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // 3 Dropdown Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [targetDispatchRequest, setTargetDispatchRequest] = useState<RescueRequestTableRow | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RescueRequestTableRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Rescue Request Form State
  const [formData, setFormData] = useState({
    reporter_name: "",
    reporter_phone: "",
    location_address: "",
    physical_condition: "visible_healthy",
    severity: "medium",
    is_urgent: false,
    reporter_notes: "",
  });

  // Fetch Requests Function with Rescue Centre Scoping
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams: Record<string, unknown> = {};
      if (isRescueCentreAdmin && currentRescueCentreId) {
        queryParams.rescue_centre_id = currentRescueCentreId;
      }

      const response = await rescueService.getRescueRequests(queryParams);
      const list: Record<string, unknown>[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      let formatted: RescueRequestTableRow[] = list.map((item: Record<string, unknown>) => {
        const stage = dispatchStage({ status: item.status as string, dispatch: item.dispatch as Record<string, unknown> });
        const dispatchObj = (item.dispatch as Record<string, unknown>) || null;
        const assignedAgentId = String(item.assigned_agent_id || item.agent_id || dispatchObj?.assigned_driver_id || dispatchObj?.agent_id || item.assigned_agent || "");
        const assignedAgentName = String(item.assigned_agent_name || item.assigned_agent || dispatchObj?.assigned_driver_name || dispatchObj?.agent_name || (assignedAgentId ? `Agent (${assignedAgentId})` : ""));
        const assignedVehicleId = String(item.assigned_vehicle_id || dispatchObj?.assigned_vehicle_id || dispatchObj?.vehicle_id || "");
        const assignedVehicleNumber = String(item.assigned_vehicle_number || item.assigned_vehicle || dispatchObj?.assigned_vehicle_number || dispatchObj?.vehicle_number || (assignedVehicleId ? `Vehicle (${assignedVehicleId})` : ""));

        return {
          id: String(item.id || item.request_id || ""),
          ticket_number: String(item.ticket_number || ""),
          reporter: String(item.reporter_name || item.reporter || "Anonymous Reporter"),
          phone: String(item.reporter_phone || item.phone || "Not provided"),
          location: String(item.location_address || item.location || "Location not recorded"),
          condition: String(item.physical_condition || "-"),
          severity: String(item.severity || item.urgency_level || "medium").toLowerCase(),
          is_urgent: !!item.is_urgent,
          status: String(item.status || "reported").toLowerCase(),
          rejection_rationale: String(item.rejection_rationale || item.rejection_reason || ""),
          assigned_agent_id: assignedAgentId,
          assigned_agent_name: assignedAgentName,
          assigned_vehicle_id: assignedVehicleId,
          assigned_vehicle_number: assignedVehicleNumber,
          dispatch: dispatchObj,
          dispatch_status: stage.label,
          dispatch_bg: stage.bg,
          dispatch_color: stage.color,
          reports: (item.reports as Record<string, unknown>[]) || [],
          media_urls: (item.media_urls as string[]) || [],
          date: String(item.created_at || item.date || item.timestamp || ""),
          raw: item,
        };
      });

      // Filter by Rescue Centre Scope if applicable
      if (isRescueCentreAdmin && currentRescueCentreId) {
        formatted = formatted.filter((req) => {
          const reqCentreId = req.raw?.rescue_centre_id || req.raw?.rescue_center_id || req.raw?.facility_id || req.raw?.organization_id;
          if (reqCentreId && String(reqCentreId) !== String(currentRescueCentreId)) {
            return false;
          }
          return true;
        });
      }

      const sortedFormatted = formatted.sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setRequests(sortedFormatted);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load incoming rescue requests.");
    } finally {
      setLoading(false);
    }
  }, [isRescueCentreAdmin, currentRescueCentreId]);

  // Fetch available vehicles
  useEffect(() => {
    vehicleService.getVehicles().then((res: any) => {
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setVehicles(list);
    }).catch(() => setVehicles([]));
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
  }, [fetchRequests]);

  // Accept Rescue Request Action with Concurrency Protection
  const handleAccept = async (req: RescueRequestTableRow) => {
    const currentUserId = String(currentUser?.id ?? "");
    if (req.assigned_agent_id && req.assigned_agent_id !== currentUserId) {
      addToast(`This rescue request has already been accepted by agent ${req.assigned_agent_name || req.assigned_agent_id}.`, "error");
      return;
    }
    if (["accepted", "dispatched", "in_progress", "completed", "admitted"].includes(req.status)) {
      addToast("This rescue request has already been accepted or dispatched.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const agentName = (currentUser as any)?.name || (currentUser as any)?.email || "Rescue Agent";
      await rescueService.acceptRescueRequest(req.id, currentUserId || "agent", agentName);
      addToast(`Rescue Request Accepted! Assigned to ${agentName}.`, "success");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to accept rescue request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Dispatch Modal
  const handleOpenDispatchModal = (req: RescueRequestTableRow) => {
    setTargetDispatchRequest(req);
    setSelectedVehicleId(req.assigned_vehicle_id || "");
    setIsDispatchModalOpen(true);
  };

  // Submit Dispatch Action
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDispatchRequest || !selectedVehicleId) {
      addToast("Please select an available rescue vehicle.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const currentUserId = String(currentUser?.id ?? "");
      const selVeh = vehicles.find((v: any) => String(v.id || v.vehicle_id) === String(selectedVehicleId));
      const vehicleNum = selVeh ? String((selVeh as any).registration_number || (selVeh as any).vehicle_number || (selVeh as any).model || selectedVehicleId) : selectedVehicleId;
      const agentName = (currentUser as any)?.name || (currentUser as any)?.email || "Rescue Agent";

      await rescueService.createDispatch({
        case_id: targetDispatchRequest.id,
        assigned_vehicle_id: selectedVehicleId,
        agent_id: currentUserId || "agent",
        driver_id: currentUserId || "agent",
      });

      await rescueService.updateRescueCase(targetDispatchRequest.id, {
        status: "dispatched",
        assigned_vehicle_id: selectedVehicleId,
        assigned_vehicle_number: vehicleNum,
        assigned_agent_id: currentUserId || "agent",
        assigned_agent_name: agentName,
      });

      addToast("Rescue team and vehicle dispatched successfully!", "success");
      setIsDispatchModalOpen(false);
      setIsViewModalOpen(false);
      setTargetDispatchRequest(null);
      setSelectedVehicleId("");
      fetchRequests();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to dispatch rescue.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create Request Action
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_address || !formData.reporter_name || !formData.reporter_phone) {
      addToast("Please fill in required fields (Location, Reporter Name & Phone).", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = { ...formData };
      if (isRescueCentreAdmin && currentRescueCentreId) {
        payload.rescue_centre_id = currentRescueCentreId;
      }
      await rescueService.createRescueRequest(payload);
      addToast("Emergency rescue call logged successfully!", "success");
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
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to log rescue report", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Action
  const handleVerify = async (id: string, reqObj?: RescueRequestTableRow) => {
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

  // Open Reject Modal
  const openRejectModal = (req: RescueRequestTableRow) => {
    setTargetRejectId(req.id);
    setSelectedRequest(req);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  // Reject Submit Action
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRejectId) return;
    try {
      setIsSubmitting(true);
      await rescueService.rejectRescueRequest(targetRejectId, rejectionReason || undefined);
      addToast("Rescue request rejected and marked invalid.", "info");
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

  // Summary Metrics (6 Cards ONLY)
  const stats = useMemo(() => {
    const total = requests.length;
    const awaitingTriage = requests.filter((r) => ["reported", "pending", "new", "awaiting_triage"].includes(r.status)).length;
    const verified = requests.filter((r) => r.status === "verified").length;
    const dispatched = requests.filter((r) => r.status === "dispatched" || String(r.dispatch_status).toLowerCase().includes("dispatched")).length;
    const rescued = requests.filter((r) => ["rescued", "located", "secured", "admitted", "completed"].includes(r.status)).length;
    const rejected = requests.filter((r) => ["rejected", "invalid", "failed", "declined"].includes(r.status)).length;

    return { total, awaitingTriage, verified, dispatched, rescued, rejected };
  }, [requests]);

  // Combined 3-Dropdown Filter Logic
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        const st = String(r.status || "").toLowerCase().trim();
        if (statusFilter === "reported" || statusFilter === "awaiting_triage") {
          if (!["reported", "pending", "new", "awaiting_triage"].includes(st)) return false;
        } else if (statusFilter === "verified") {
          if (st !== "verified") return false;
        } else if (statusFilter === "dispatched") {
          if (st !== "dispatched" && !String(r.dispatch_status || "").toLowerCase().includes("dispatched")) return false;
        } else if (statusFilter === "rescued") {
          if (!["rescued", "located", "secured", "admitted", "completed"].includes(st)) return false;
        } else if (statusFilter === "rejected") {
          if (!["rejected", "invalid", "failed", "declined"].includes(st)) return false;
        } else {
          if (st !== statusFilter) return false;
        }
      }

      // 2. Severity Filter
      if (severityFilter !== "all") {
        const sev = String(r.severity || "").toLowerCase().trim();
        if (sev !== severityFilter) return false;
      }

      // 3. Urgency Filter
      if (urgencyFilter !== "all") {
        const isUrgent = Boolean(r.is_urgent);
        if (urgencyFilter === "urgent" && !isUrgent) return false;
        if (urgencyFilter === "normal" && isUrgent) return false;
      }

      return true;
    });
  }, [requests, statusFilter, severityFilter, urgencyFilter]);

  // Table Column Definitions
  const columns = [
    { key: "ticket_number", title: "Ticket No." },
    { key: "reporter", title: "Reporter" },
    { key: "phone", title: "Phone" },
    { key: "location", title: "Location" },
    {
      key: "severity",
      title: "Severity",
      render: (val: string) => {
        const norm = String(val || "").toLowerCase();
        const color = norm === "critical" ? "#DC2626" : norm === "high" ? "#EA580C" : norm === "medium" ? "#D97706" : "#16A34A";
        return (
          <span style={{ textTransform: "uppercase", fontWeight: 700, fontSize: "12px", color }}>
            {val || "-"}
          </span>
        );
      },
    },
    {
      key: "is_urgent",
      title: "Urgent",
      render: (val: boolean) => (val ? <span style={{ color: "#DC2626", fontWeight: 800, fontSize: "12px" }}>URGENT</span> : <span style={{ color: "#94A3B8" }}>Normal</span>),
    },
    {
      key: "status",
      title: "Status",
      render: rescueStatusBadge,
    },
    {
      key: "dispatch_status",
      title: "Dispatch Status",
      render: (val: string, row: Record<string, unknown>) => (
        <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, background: String(row.dispatch_bg || "#F1F5F9"), color: String(row.dispatch_color || "#475569") }}>
          {val}
        </span>
      ),
    },
    {
      key: "assigned_agent_name",
      title: "Assigned Agent",
      render: (val: string, row: RescueRequestTableRow) => (
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>
          {val || row.assigned_agent_id || "Unassigned"}
        </span>
      ),
    },
    {
      key: "assigned_vehicle_number",
      title: "Assigned Vehicle",
      render: (val: string, row: RescueRequestTableRow) => (
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B" }}>
          {val || row.assigned_vehicle_id || "Unassigned"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_val: unknown, row: RescueRequestTableRow) => {
        const canAccept = row.status === "verified" && (!row.assigned_agent_id || row.assigned_agent_id === String(currentUser?.id ?? ""));

        return (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setSelectedRequest(row);
                setIsViewModalOpen(true);
              }}
              style={{ padding: "5px 11px", borderRadius: "6px", border: "1px solid #93C5FD", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              View Details
            </button>
            {["reported", "pending", "new", "awaiting_triage"].includes(row.status) && isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleVerify(row.id, row)}
                  style={{ padding: "5px 11px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => openRejectModal(row)}
                  style={{ padding: "5px 11px", borderRadius: "6px", border: "none", background: "#EF4444", color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  Reject
                </button>
              </>
            )}
            {canAccept && (
              <button
                type="button"
                onClick={() => handleAccept(row)}
                style={{ padding: "5px 11px", borderRadius: "6px", border: "none", background: "#D97706", color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Accept
              </button>
            )}
            {row.status === "accepted" && (
              <button
                type="button"
                onClick={() => handleOpenDispatchModal(row)}
                style={{ padding: "5px 11px", borderRadius: "6px", border: "none", background: "#7C3AED", color: "#FFFFFF", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                Dispatch
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#FFF" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
            Incoming Rescue Requests
          </h1>
          <p style={{ color: "#94A3B8", margin: "6px 0 0 0", fontSize: "14px" }}>
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
              fontWeight: 700,
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

      {/* Summary Cards (6 Cards ONLY) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <StatCard
          title="Total Incoming"
          value={stats.total}
          icon={<FaAmbulance />}
          color="#2563EB"
          onClick={() => setStatusFilter("all")}
          selected={statusFilter === "all"}
        />
        <StatCard
          title="Awaiting Triage"
          value={stats.awaitingTriage}
          icon={<FaClock />}
          color="#D97706"
          onClick={() => setStatusFilter("reported")}
          selected={statusFilter === "reported"}
        />
        <StatCard
          title="Verified"
          value={stats.verified}
          icon={<FaCheck />}
          color="#10B981"
          onClick={() => setStatusFilter("verified")}
          selected={statusFilter === "verified"}
        />
        <StatCard
          title="Dispatched"
          value={stats.dispatched}
          icon={<FaTruck />}
          color="#7C3AED"
          onClick={() => setStatusFilter("dispatched")}
          selected={statusFilter === "dispatched"}
        />
        <StatCard
          title="Rescued"
          value={stats.rescued}
          icon={<FaCheck />}
          color="#059669"
          onClick={() => setStatusFilter("rescued")}
          selected={statusFilter === "rescued"}
        />
        <StatCard
          title="Rejected / Invalid"
          value={stats.rejected}
          icon={<FaTimes />}
          color="#EF4444"
          onClick={() => setStatusFilter("rejected")}
          selected={statusFilter === "rejected"}
        />
      </div>

      {/* Search & Filters Section */}
      <div style={{ background: "#FFFFFF", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0", marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px", background: "#FFF", fontWeight: 500 }}
          >
            <option value="all">All Statuses</option>
            <option value="reported">Awaiting Triage (Reported)</option>
            <option value="verified">Verified</option>
            <option value="dispatched">Dispatched</option>
            <option value="rescued">Rescued</option>
            <option value="rejected">Rejected / Invalid</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px", background: "#FFF", fontWeight: 500 }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Urgency</label>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px", background: "#FFF", fontWeight: 500 }}
          >
            <option value="all">All Urgency</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        {(statusFilter !== "all" || severityFilter !== "all" || urgencyFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setSeverityFilter("all");
              setUrgencyFilter("all");
            }}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: "#F1F5F9",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              height: "38px",
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Requests Table */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <DataTable
          data={filteredRequests}
          columns={columns}
          loading={loading}
          error={error}
          onRetry={fetchRequests}
          emptyMessage="No matching rescue requests found."
          module="rescue_requests"
          searchMaxWidth="480px"
          onRowClick={(item: RescueRequestTableRow) => {
            setSelectedRequest(item);
            setIsViewModalOpen(true);
          }}
        />
      </div>

      {/* Log Emergency Rescue Call Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Emergency Rescue Call">
        <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Location Address *</label>
            <input
              type="text"
              required
              placeholder="Full location details / landmark..."
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "4px" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Reporter Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "4px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Reporter Phone *</label>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={formData.reporter_phone}
                onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "4px" }}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Physical Condition *</label>
              <select
                value={formData.physical_condition}
                onChange={(e) => setFormData({ ...formData, physical_condition: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "4px", background: "#FFF" }}
              >
                <option value="visible_healthy">Visible / Healthy</option>
                <option value="injured_visible">Injured (visible)</option>
                <option value="fractured_injured">Fractured / Injured</option>
                <option value="critical_condition">Critical Condition</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "4px", background: "#FFF" }}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={formData.is_urgent}
              onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
            />
            Mark as Urgent Rescue Case
          </label>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Reporter Notes / Details</label>
            <textarea
              rows={3}
              placeholder="Describe animal situation, symptoms, or landmark notes..."
              value={formData.reporter_notes}
              onChange={(e) => setFormData({ ...formData, reporter_notes: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "4px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", color: "#475569", fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "9px 16px", borderRadius: "8px", background: "#2563EB", color: "#FFF", border: "none", fontWeight: 700, cursor: "pointer" }}>
              {isSubmitting ? "Logging..." : "Submit Report"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Request Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Rescue Request Details${selectedRequest?.ticket_number ? ` — ${selectedRequest.ticket_number}` : ""}`}
        size="lg"
        footer={
          selectedRequest ? (
            <>
              {["reported", "pending", "new", "awaiting_triage"].includes(selectedRequest.status) && isAdmin && (
                <>
                  <button
                    onClick={() => {
                      handleVerify(selectedRequest.id, selectedRequest);
                      setIsViewModalOpen(false);
                    }}
                    style={{ padding: "8px 16px", background: "#10B981", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => {
                      openRejectModal(selectedRequest);
                      setIsViewModalOpen(false);
                    }}
                    style={{ padding: "8px 16px", background: "#EF4444", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Reject
                  </button>
                </>
              )}
              {selectedRequest.status === "verified" && (!selectedRequest.assigned_agent_id || selectedRequest.assigned_agent_id === String(currentUser?.id ?? "")) && (
                <button
                  onClick={() => {
                    handleAccept(selectedRequest);
                    setIsViewModalOpen(false);
                  }}
                  style={{ padding: "8px 16px", background: "#D97706", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                >
                  Accept Request
                </button>
              )}
              {selectedRequest.status === "accepted" && (
                <button
                  onClick={() => {
                    handleOpenDispatchModal(selectedRequest);
                    setIsViewModalOpen(false);
                  }}
                  style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                >
                  Select Vehicle & Dispatch
                </button>
              )}
              <button
                onClick={() => setIsViewModalOpen(false)}
                style={{ padding: "8px 16px", background: "#64748B", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
              >
                Close
              </button>
            </>
          ) : null
        }
      >
        {selectedRequest && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Information Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Ticket Information</span>
                <strong>{selectedRequest.ticket_number || selectedRequest.id}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}><FaUser size={10} style={{ marginRight: "4px" }} /> Reporter Information</span>
                <strong>{selectedRequest.reporter}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}><FaPhoneAlt size={10} style={{ marginRight: "4px" }} /> Contact Phone</span>
                <strong>{selectedRequest.phone}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}><FaMapMarkerAlt size={10} style={{ marginRight: "4px" }} /> Rescue Location</span>
                <strong style={{ wordBreak: "break-word" }}>{selectedRequest.location}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Animal / Physical Condition</span>
                <strong style={{ textTransform: "capitalize" }}>{String(selectedRequest.condition || "-").replace(/_/g, " ")}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Severity & Urgency</span>
                <strong style={{ textTransform: "uppercase", color: selectedRequest.severity === "critical" ? "#DC2626" : selectedRequest.severity === "high" ? "#EA580C" : selectedRequest.severity === "medium" ? "#D97706" : "#16A34A" }}>
                  {selectedRequest.severity || "-"}
                </strong>
                {selectedRequest.is_urgent && (
                  <span style={{ marginLeft: "8px", background: "#FEF2F2", color: "#DC2626", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 800 }}>
                    URGENT
                  </span>
                )}
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Current Status</span>
                {rescueStatusBadge(selectedRequest.status)}
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Dispatch Status</span>
                <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, background: selectedRequest.dispatch_bg, color: selectedRequest.dispatch_color }}>
                  {selectedRequest.dispatch_status}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Assigned Rescue Agent</span>
                <strong>{selectedRequest.assigned_agent_name || selectedRequest.assigned_agent_id || "Unassigned"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Assigned Vehicle</span>
                <strong>{selectedRequest.assigned_vehicle_number || selectedRequest.assigned_vehicle_id || "Unassigned"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}><FaClock size={10} style={{ marginRight: "4px" }} /> Created / Reported Time</span>
                <strong>{selectedRequest.date ? formatDateTime(selectedRequest.date) : "-"}</strong>
              </div>
            </div>

            {/* Reporter Notes / Description */}
            {Boolean(selectedRequest.raw?.reporter_notes) && (
              <div style={{ background: "#F1F5F9", padding: "12px 14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                <strong style={{ color: "#334155", display: "block", marginBottom: "4px", fontSize: "13px" }}>
                  <FaInfoCircle size={12} style={{ marginRight: "6px" }} /> Reporter Description / Notes:
                </strong>
                <span style={{ fontSize: "13px", color: "#475569" }}>{String(selectedRequest.raw.reporter_notes)}</span>
              </div>
            )}

            {/* Rejection Rationale if present */}
            {Boolean(selectedRequest.rejection_rationale) && (
              <div style={{ background: "#FEF2F2", padding: "12px 14px", borderRadius: "10px", border: "1px solid #FCA5A5" }}>
                <strong style={{ color: "#DC2626", display: "block", marginBottom: "4px", fontSize: "13px" }}>
                  <FaExclamationTriangle size={12} style={{ marginRight: "6px" }} /> Rejection Rationale:
                </strong>
                <span style={{ fontSize: "13px", color: "#991B1B" }}>{selectedRequest.rejection_rationale}</span>
              </div>
            )}

            {/* Dispatch & Team Information if available */}
            {Boolean(selectedRequest.dispatch || selectedRequest.assigned_vehicle_number || selectedRequest.assigned_agent_name) && (
              <div style={{ background: "#F5F3FF", padding: "14px 16px", borderRadius: "10px", border: "1px solid #DDD6FE" }}>
                <strong style={{ color: "#7C3AED", fontSize: "14px", display: "block", marginBottom: "8px" }}>
                  <FaTruck size={14} style={{ marginRight: "6px" }} /> Dispatch & Field Team Info
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "13px" }}>
                  <div><span style={{ color: "#6B21A8", fontWeight: 600 }}>Assigned Agent:</span> <strong>{selectedRequest.assigned_agent_name || selectedRequest.assigned_agent_id || "Unassigned"}</strong></div>
                  <div><span style={{ color: "#6B21A8", fontWeight: 600 }}>Assigned Vehicle:</span> <strong>{selectedRequest.assigned_vehicle_number || selectedRequest.assigned_vehicle_id || "Unassigned"}</strong></div>
                  {Boolean(selectedRequest.dispatch?.dispatched_at) && (
                    <div><span style={{ color: "#6B21A8", fontWeight: 600 }}>Dispatched At:</span> <strong>{formatDateTime(String(selectedRequest.dispatch?.dispatched_at))}</strong></div>
                  )}
                </div>
              </div>
            )}

            {/* Photos / Evidence */}
            {Boolean(selectedRequest.media_urls && selectedRequest.media_urls.length > 0) && (
              <div>
                <strong style={{ display: "block", marginBottom: "6px", fontSize: "13px" }}>Photos / Media Evidence:</strong>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {selectedRequest.media_urls.map((u: string, i: number) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", background: "#EFF6FF", color: "#2563EB", borderRadius: "6px", border: "1px solid #BFDBFE", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
                      Photo Evidence {i + 1} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Select Vehicle & Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title={`Dispatch Rescue Vehicle${targetDispatchRequest?.ticket_number ? ` — ${targetDispatchRequest.ticket_number}` : ""}`}
      >
        <form onSubmit={handleDispatchSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Select Available Rescue Vehicle *</label>
            <select
              required
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", marginTop: "6px", background: "#FFF" }}
            >
              <option value="">-- Choose a Vehicle --</option>
              {vehicles.map((v: any) => {
                const vId = String(v.id || v.vehicle_id || "");
                const vNum = String(v.registration_number || v.vehicle_number || v.model || vId);
                const vType = String(v.type || v.vehicle_type || "Ambulance");
                return (
                  <option key={vId} value={vId}>
                    {vNum} ({vType}) — {v.status || "available"}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsDispatchModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", color: "#475569", fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !selectedVehicleId} style={{ padding: "9px 16px", borderRadius: "8px", background: "#7C3AED", color: "#FFF", border: "none", fontWeight: 700, cursor: "pointer" }}>
              {isSubmitting ? "Dispatching..." : "Confirm Dispatch"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Request Confirmation Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={`Reject Rescue Request${selectedRequest?.ticket_number ? ` — ${selectedRequest.ticket_number}` : ""}`}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setIsRejectModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" form="reject-request-form" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700 }}>
              {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </>
        }
      >
        <form id="reject-request-form" onSubmit={handleRejectSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        </form>
      </Modal>
    </div>
  );
};

export default RescueRequests;
