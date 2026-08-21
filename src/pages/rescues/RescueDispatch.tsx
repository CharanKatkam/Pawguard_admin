import React, { useState, useEffect, useCallback } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaTruck,
  FaAmbulance,
  FaUserCheck,
  FaClock,
  FaPlus,
  FaSearch,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExternalLinkAlt,
} from "react-icons/fa";
import rescueService from "../../services/rescueService";
import userService from "../../services/userService";
import vehicleService from "../../services/vehicleService";
import { rescueStatusBadge, dispatchStage } from "../../utils/rescueStatus.tsx";
import { notifyDataChanged, useDataSync } from "../../utils/dataSync";
import { normalizeRole } from "../../utils/roleUtils";
import { formatDateTime } from "../../utils/dateUtils";

const unwrapList = (body: unknown): Record<string, unknown>[] => {
  if (!body) return [];
  const data = Array.isArray(body) ? body : (body as { data?: unknown }).data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

export interface EnrichedDispatch {
  id: string;
  dispatch_id: string;
  ticket: string;
  animal_count: string;
  location: string;
  severity: string;
  rescue_status: string;
  stage_label: string;
  stage_bg: string;
  stage_color: string;
  agent_names: string;
  vehicle_label: string;
  reported_at: string;
  dispatched_at: string;
  case_id: string;
  raw: Record<string, unknown>;
  [key: string]: unknown;
}

type CardTab = "all" | "awaiting" | "active" | "completed";

const RescueDispatch = () => {
  const [dispatches, setDispatches] = useState<EnrichedDispatch[]>([]);
  const [rescueCases, setRescueCases] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [activeCard, setActiveCard] = useState<CardTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<EnrichedDispatch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    case_id: "",
    agent_ids: [] as string[],
    vehicle_id: "",
    notes: "",
  });

  const userIdLabel = useCallback((id?: string) => {
    if (!id) return "";
    const u = users.find((x) => String(x.id) === id);
    return u ? String(u.full_name || u.name || u.email || id) : id;
  }, [users]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dispatchRes, caseRes, userRes, vehicleRes] = await Promise.all([
        rescueService.getDispatches(),
        rescueService.getRescueCases(),
        userService.getUsers(),
        vehicleService.getVehicles(),
      ]);

      const dispatchList = unwrapList(dispatchRes);
      const caseList = unwrapList(caseRes);
      const userList = unwrapList(userRes);
      const vehicleList = unwrapList(vehicleRes);

      setRescueCases(caseList);
      setUsers(userList);
      setVehicles(vehicleList);

      const caseById = new Map(caseList.map((c: Record<string, unknown>) => [String(c.id), c]));

      const formatted: EnrichedDispatch[] = dispatchList.map((d: Record<string, unknown>) => {
        const req = d.rescue_request_id ? caseById.get(String(d.rescue_request_id)) : undefined;
        const stage = dispatchStage({ status: req?.status as string, dispatch: req?.dispatch as Record<string, unknown> });
        const agents = Array.isArray(d.agents) ? (d.agents as Record<string, unknown>[]) : [];
        const vehicle = d.assigned_vehicle_id
          ? vehicleList.find((v: Record<string, unknown>) => String(v.id) === String(d.assigned_vehicle_id))
          : undefined;
        return {
          id: String(d.id),
          dispatch_id: String(d.id),
          case_id: String(d.rescue_request_id || req?.id || ""),
          ticket: String(req?.ticket_number || d.rescue_request_id || "-"),
          animal_count: req?.animal_count != null ? String(req.animal_count) : "-",
          location: String(req?.location_address || "-"),
          severity: String(req?.severity || "-"),
          rescue_status: String(req?.status || "-"),
          stage_label: stage.label,
          stage_bg: stage.bg,
          stage_color: stage.color,
          agent_names:
            agents.length > 0 ? agents.map((a: Record<string, unknown>) => userIdLabel(String(a.agent_id || a.id || ""))).join(", ") : "-",
          vehicle_label:
            String(vehicle?.vehicle_number || vehicle?.registration_number || vehicle?.id || d.vehicle_id || "-"),
          reported_at: req?.created_at ? formatDateTime(req.created_at as string) : "-",
          dispatched_at: d.dispatched_at ? formatDateTime(d.dispatched_at as string) : "-",
          raw: d,
        };
      });

      setDispatches(formatted);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || "Failed to load dispatch operations.");
    } finally {
      setLoading(false);
    }
  }, [userIdLabel]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseParam = params.get("case_id");
    if (caseParam) {
      setFormData((prev) => ({ ...prev, case_id: caseParam }));
      setIsAddModalOpen(true);
    }
    void fetchAll();
  }, [fetchAll]);

  useDataSync(() => {
    void fetchAll();
  });

  // Calculate Active Field Dispatches for Availability Filtering
  const activeDispatches = dispatches.filter((d) =>
    ["dispatched", "en_route", "on_scene", "located", "secured"].includes(String(d.rescue_status || "").toLowerCase())
  );

  const activeVehicleIds = new Set(
    activeDispatches.map((d) => String(d.raw.assigned_vehicle_id || d.raw.vehicle_id || "")).filter(Boolean)
  );

  const activeAgentIds = new Set(
    activeDispatches.flatMap((d) => {
      const agents = Array.isArray(d.raw.agents) ? (d.raw.agents as Record<string, unknown>[]) : [];
      return agents.map((a) => String(a.agent_id || a.id || "")).filter(Boolean);
    })
  );

  // Available Staff Candidates (Active Rescue Agents & Not Currently Assigned)
  const allStaffUsers = users.filter((u) => u.is_active !== false);

  const agentCandidates = allStaffUsers.filter((u) => {
    const r = normalizeRole(u);
    const matchesRole =
      r === "rescue_agent" ||
      r === "rescue_coordinator" ||
      r === "super_admin" ||
      String(u.role || "").toLowerCase().includes("agent");
    return (matchesRole || allStaffUsers.length <= 5) && !activeAgentIds.has(String(u.id));
  });

  const availableVehicles = vehicles.filter((v) => {
    const status = String(v.status || "").toLowerCase();
    const isAvailableStatus = status !== "maintenance" && status !== "out_of_service";
    return isAvailableStatus && !activeVehicleIds.has(String(v.id));
  });

  const dispatchableCases = rescueCases.filter(
    (c: Record<string, unknown>) => c.status === "verified" || c.status === "dispatched" || c.status === "located"
  );

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.case_id) {
      addToast("Please select a verified rescue case to dispatch.", "error");
      return;
    }
    if (!formData.vehicle_id) {
      addToast("Please select an available rescue vehicle for dispatch.", "error");
      return;
    }
    if (!formData.agent_ids || formData.agent_ids.length === 0) {
      addToast("Please select at least one Rescue Agent for the dispatch team.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      await rescueService.createDispatch({
        case_id: formData.case_id,
        vehicle_id: formData.vehicle_id,
        agent_ids: formData.agent_ids,
        notes: formData.notes || undefined,
      });
      addToast("Rescue team dispatched successfully!", "success");
      setIsAddModalOpen(false);
      setFormData({ case_id: "", agent_ids: [], vehicle_id: "", notes: "" });
      fetchAll();
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      addToast(e?.response?.data?.detail || e?.response?.data?.message || "Failed to dispatch rescue team", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field stage progress actions
  const handleMarkEnRoute = async (dispatchId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.updateDispatchStatus(dispatchId, "en_route");
      addToast("Dispatch status updated to En Route!", "info");
      setIsViewModalOpen(false);
      fetchAll();
      notifyDataChanged();
    } catch {
      addToast("Failed to update dispatch status.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkLocated = async (caseId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.markRescueLocated(caseId);
      addToast("Animal marked as located by field team!", "info");
      setIsViewModalOpen(false);
      fetchAll();
      notifyDataChanged();
    } catch {
      addToast("Failed to mark animal as located.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSecured = async (caseId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.markRescueSecured(caseId);
      addToast("Animal marked as secured!", "info");
      setIsViewModalOpen(false);
      fetchAll();
      notifyDataChanged();
    } catch {
      addToast("Failed to mark animal as secured.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAdmitted = async (caseId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.markRescueAdmitted(caseId);
      addToast("Animal admitted to rescue centre & sent to shelter intake queue!", "success");
      setIsViewModalOpen(false);
      fetchAll();
      notifyDataChanged();
    } catch {
      addToast("Failed to admit animal to rescue centre.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic Card Filtering Dataset
  const awaitingCases = rescueCases.filter((c: Record<string, unknown>) => String(c.status || "").toLowerCase() === "verified");
  const completedDispatches = dispatches.filter((d) =>
    ["rescued", "admitted", "completed"].includes(String(d.rescue_status || "").toLowerCase())
  );

  const getDisplayData = () => {
    let list: EnrichedDispatch[];
    if (activeCard === "awaiting") {
      list = awaitingCases.map((c) => ({
        id: String(c.id),
        dispatch_id: "",
        case_id: String(c.id),
        ticket: String(c.ticket_number || c.id || "-"),
        animal_count: String(c.animal_count ?? "1"),
        location: String(c.location_address || c.location || "-"),
        severity: String(c.severity || "-"),
        rescue_status: String(c.status || "-"),
        stage_label: "Awaiting Dispatch",
        stage_bg: "#FEF3C7",
        stage_color: "#92400E",
        agent_names: "Unassigned",
        vehicle_label: "Unassigned",
        reported_at: c.created_at ? new Date(String(c.created_at)).toLocaleString() : "-",
        dispatched_at: "-",
        raw: c,
      }));
    } else if (activeCard === "active") {
      list = activeDispatches;
    } else if (activeCard === "completed") {
      list = completedDispatches;
    } else {
      list = dispatches;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) =>
      String(r.ticket || "").toLowerCase().includes(q) ||
      String(r.location || "").toLowerCase().includes(q) ||
      String(r.agent_names || "").toLowerCase().includes(q) ||
      String(r.vehicle_label || "").toLowerCase().includes(q) ||
      String(r.rescue_status || "").toLowerCase().includes(q) ||
      String(r.severity || "").toLowerCase().includes(q)
    );
  };

  const displayData = getDisplayData();

  const getTableTitle = () => {
    switch (activeCard) {
      case "awaiting":
        return "Awaiting Dispatch (Verified Cases)";
      case "active":
        return "Active Field Operations";
      case "completed":
        return "Completed / Admitted Rescues";
      default:
        return "All Dispatch Operations";
    }
  };

  const getEmptyMessage = () => {
    switch (activeCard) {
      case "awaiting":
        return "No verified cases awaiting dispatch.";
      case "active":
        return "No active field operations found.";
      case "completed":
        return "No completed or admitted dispatches found.";
      default:
        return "No dispatches found. Create a dispatch to assign a field team.";
    }
  };

  const stats = [
    {
      title: "Total Dispatches",
      value: loading ? "..." : String(dispatches.length),
      icon: <FaTruck />,
      color: "#2563EB",
      selected: activeCard === "all",
      onClick: () => setActiveCard("all"),
    },
    {
      title: "Awaiting Dispatch",
      value: loading ? "..." : String(awaitingCases.length),
      icon: <FaClock />,
      color: "#F59E0B",
      selected: activeCard === "awaiting",
      onClick: () => setActiveCard("awaiting"),
    },
    {
      title: "En Route / Located",
      value: loading ? "..." : String(activeDispatches.length),
      icon: <FaAmbulance />,
      color: "#7C3AED",
      selected: activeCard === "active",
      onClick: () => setActiveCard("active"),
    },
    {
      title: "Completed / Admitted",
      value: loading ? "..." : String(completedDispatches.length),
      icon: <FaUserCheck />,
      color: "#10B981",
      selected: activeCard === "completed",
      onClick: () => setActiveCard("completed"),
    },
  ];

  const columns = [
    { key: "ticket", header: "Ticket" },
    { key: "location", header: "Location" },
    {
      key: "severity",
      header: "Priority",
      render: (val: string) => (
        <span style={{ textTransform: "uppercase", fontWeight: 600, fontSize: "12px", color: val === "critical" ? "#DC2626" : val === "high" ? "#EA580C" : val === "medium" ? "#F59E0B" : "#16A34A" }}>
          {val}
        </span>
      ),
    },
    { key: "agent_names", header: "Rescue Agents" },
    { key: "vehicle_label", header: "Vehicle" },
    {
      key: "stage_label",
      header: "Dispatch Status",
      render: (val: string, row: Record<string, unknown>) => (
        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: String(row.stage_bg || ""), color: String(row.stage_color || "") }}>
          {val}
        </span>
      ),
    },
    {
      key: "rescue_status",
      header: "Rescue Status",
      render: rescueStatusBadge,
    },
    { key: "reported_at", header: "Reported Time" },
  ];

  const handleRowClick = (row: EnrichedDispatch) => {
    setSelectedDispatch(row);
    setIsViewModalOpen(true);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Hero Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Rescue Dispatch Center
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Field rescue dispatch control: assign Rescue Agents and fleet vehicles to verified rescue cases.
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

      {/* Dynamic Headline Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* Dynamic Table Section */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              {getTableTitle()}
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Showing {displayData.length} records matching {activeCard} filter
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: "13px" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, agent, location..."
                style={{
                  padding: "8px 12px 8px 32px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  width: "260px",
                }}
              />
            </div>
            {loading && (
              <span style={{ color: "#2563EB", fontSize: "12px", fontWeight: 600 }}>
                Loading...
              </span>
            )}
          </div>
        </div>

        <DataTable
          data={displayData}
          columns={columns}
          loading={loading}
          error={error}
          onRetry={fetchAll}
          emptyMessage={getEmptyMessage()}
          module="rescue_dispatch"
          onRowClick={(row: EnrichedDispatch) => handleRowClick(row)}
        />
      </div>

      {/* Corrected Rescue Dispatch Creation Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Dispatch Rescue Team">
        <form onSubmit={handleCreateDispatch} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>Rescue Case *</label>
            <select required value={formData.case_id} onChange={(e) => setFormData({ ...formData, case_id: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}>
              <option value="">Select verified rescue case...</option>
              {dispatchableCases.map((c: Record<string, unknown>) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.ticket_number || c.id)} — {String(c.location_address || "no location")}
                </option>
              ))}
            </select>
            {dispatchableCases.length === 0 && (
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#D97706", fontWeight: 600 }}>
                ⚠️ No verified rescue cases available to dispatch.
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>Rescue Vehicle *</label>
            <select
              required
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
            >
              <option value="">Select available vehicle...</option>
              {availableVehicles.map((v) => (
                <option key={String(v.id)} value={String(v.id)}>
                  {String(v.vehicle_number || v.registration_number || v.id)}
                  {v.type || v.model ? ` — ${String(v.type || v.model)}` : ""}
                </option>
              ))}
            </select>
            {availableVehicles.length === 0 && (
              <div style={{ marginTop: "4px", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>
                ⚠️ No available vehicles (all vehicles deployed or in maintenance).
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>Rescue Agent(s) (At least 1 required) *</label>
            {agentCandidates.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "6px",
                  maxHeight: "170px",
                  overflowY: "auto",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  background: "#F8FAFC",
                }}
              >
                {agentCandidates.map((u) => {
                  const checked = formData.agent_ids.includes(String(u.id));
                  return (
                    <label key={String(u.id)} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            agent_ids: checked
                              ? formData.agent_ids.filter((x) => x !== String(u.id))
                              : [...formData.agent_ids, String(u.id)],
                          })
                        }
                      />
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>{String(u.full_name || u.name || u.email)}</span>
                      <span style={{ color: "#64748B", fontSize: "12px" }}>({String(u.email || u.id)})</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginTop: "6px", padding: "10px", borderRadius: "6px", background: "#FEF2F2", color: "#DC2626", fontSize: "12px", fontWeight: 600 }}>
                ⚠️ No available rescue agents (all agents currently deployed on active field dispatches).
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>Equipment / Dispatch Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              placeholder="Rescue stretchers, medical kits, cage details, special instructions..."
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: "9px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "9px 18px", borderRadius: "8px", background: "#2563EB", color: "#FFF", border: "none", fontSize: "13px", fontWeight: 700, cursor: isSubmitting ? "wait" : "pointer" }}
            >
              {isSubmitting ? "Dispatching..." : "Confirm & Dispatch Team"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispatch Details & Tracking Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Dispatch Details — ${selectedDispatch?.ticket || ""}`}
        size="lg"
        footer={
          selectedDispatch ? (
            <>
              {["dispatched", "verified"].includes(String(selectedDispatch.rescue_status).toLowerCase()) && (
                <>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleMarkEnRoute(selectedDispatch.dispatch_id)}
                    style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaAmbulance size={12} /> Mark En Route
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleMarkLocated(selectedDispatch.case_id || selectedDispatch.id)}
                    style={{ padding: "8px 16px", background: "#0891B2", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaMapMarkerAlt size={12} /> Mark Located
                  </button>
                </>
              )}

              {String(selectedDispatch.rescue_status).toLowerCase() === "located" && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMarkSecured(selectedDispatch.case_id || selectedDispatch.id)}
                  style={{ padding: "8px 16px", background: "#F59E0B", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                >
                  Mark Secured
                </button>
              )}

              {["secured", "rescued"].includes(String(selectedDispatch.rescue_status).toLowerCase()) && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMarkAdmitted(selectedDispatch.case_id || selectedDispatch.id)}
                  style={{ padding: "8px 16px", background: "#059669", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaCheckCircle size={12} /> Admit to Centre & Send to Shelter Intake
                </button>
              )}

              {String(selectedDispatch.rescue_status).toLowerCase() === "admitted" && (
                <button
                  onClick={() => window.open(`/public-scan/${selectedDispatch.case_id || selectedDispatch.id}`, "_blank")}
                  style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaExternalLinkAlt size={12} /> View Shelter Profile
                </button>
              )}
              <button onClick={() => setIsViewModalOpen(false)} style={{ padding: "8px 16px", background: "#64748B", color: "#FFF", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>Close</button>
            </>
          ) : null
        }
      >
        {selectedDispatch && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Target Location</span>
                <strong style={{ wordBreak: "break-word" }}>{selectedDispatch.location}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Priority / Severity</span>
                <span
                  style={{
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color:
                      selectedDispatch.severity === "critical"
                        ? "#DC2626"
                        : selectedDispatch.severity === "high"
                        ? "#EA580C"
                        : selectedDispatch.severity === "medium"
                        ? "#F59E0B"
                        : "#16A34A",
                  }}
                >
                  {selectedDispatch.severity}
                </span>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Rescue Lifecycle Status</span>
                {rescueStatusBadge(selectedDispatch.rescue_status)}
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "12px", display: "block", fontWeight: 600 }}>Dispatch Stage</span>
                <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, background: selectedDispatch.stage_bg, color: selectedDispatch.stage_color }}>
                  {selectedDispatch.stage_label}
                </span>
              </div>
            </div>

            <div style={{ background: "#F5F3FF", padding: "14px 16px", borderRadius: "12px", border: "1px solid #DDD6FE" }}>
              <strong style={{ color: "#7C3AED", fontSize: "14px", display: "block", marginBottom: "8px" }}>Assigned Rescue Team & Fleet Vehicle</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", fontSize: "13px" }}>
                <div><span style={{ color: "#6B21A8", fontWeight: 600 }}>Rescue Agent(s):</span> <strong>{selectedDispatch.agent_names}</strong></div>
                <div><span style={{ color: "#6B21A8", fontWeight: 600 }}>Rescue Vehicle:</span> <strong>{selectedDispatch.vehicle_label}</strong></div>
                <div><span style={{ color: "#6B21A8", fontWeight: 600 }}>Dispatched At:</span> <strong>{selectedDispatch.dispatched_at}</strong></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RescueDispatch;
