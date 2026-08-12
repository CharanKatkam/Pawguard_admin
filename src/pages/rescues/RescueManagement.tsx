import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaLifeRing,
  FaAmbulance,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
} from "react-icons/fa";
import rescueService from "../../services/rescueService";
import userService from "../../services/userService";
import { rescueStatusBadge, dispatchStage } from "../../utils/rescueStatus";
import { notifyDataChanged } from "../../utils/dataSync";
import { getCurrentUserRole } from "../../utils/roleUtils";

// Backend enum values (RescueSeverity / RescuePhysicalCondition) per OpenAPI.
const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const PHYSICAL_CONDITION_OPTIONS = [
  { value: "critical_life_threatening", label: "Critical / Life Threatening" },
  { value: "fractured_injured", label: "Fractured / Injured" },
  { value: "contagious_sick", label: "Contagious / Sick" },
  { value: "malnourished", label: "Malnourished" },
  { value: "abandoned_stray", label: "Abandoned / Stray" },
  { value: "unknown", label: "Unknown" },
];

const RescueManagement = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  const [assignForm, setAssignForm] = useState({ coordinator_id: "", notes: "" });

  const [formData, setFormData] = useState({
    location_address: "",
    location_landmark: "",
    severity: "high",
    is_urgent: true,
    animal_count: 1,
    physical_condition: "unknown",
    reporter_name: "",
    reporter_phone: "",
    reporter_notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRescueCases();
    fetchCoordinators();
  }, []);

  const fetchCoordinators = async () => {
    try {
      const response = await userService.getUsers();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      setCoordinators(
        list.filter((u: any) => Array.isArray(u.roles) && u.roles.includes("rescue_coordinator"))
      );
    } catch {
      setCoordinators([]);
    }
  };

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const coordinatorLabel = (id?: string | null) => {
    if (!id) return "-";
    const c = coordinators.find((x: any) => x.id === id);
    return c ? c.full_name || c.email || id : id;
  };

  const fetchRescueCases = async () => {
    try {
      setLoading(true);
      setError(null);
      // Rescue agents should only ever see cases assigned to them, not every
      // rescue in the system (backend `assigned_to_me` capability).
      const isAgent = getCurrentUserRole() === "rescue_agent";
      const response = await rescueService.getRescueCases(isAgent ? { assigned_to_me: true } : undefined);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => {
        const stage = dispatchStage({ status: item.status, dispatch: item.dispatch });
        const d = item.dispatch || null;
        return {
          id: item.id || item.ticket_number || "",
          ticket_number: item.ticket_number ?? item.case_number ?? item.id ?? "-",
          reporter_name: item.reporter_name ?? item.reporter ?? "-",
          reporter_phone: item.reporter_phone ?? "-",
          reporter_alternate_phone: item.reporter_alternate_phone ?? "-",
          reporter_email: item.reporter_email ?? "-",
          is_anonymous: item.is_anonymous !== undefined && item.is_anonymous !== null ? (item.is_anonymous ? "Yes" : "No") : "-",
          location_address: item.location_address ?? item.location ?? "-",
          location_landmark: item.location_landmark ?? "-",
          latitude: item.latitude !== undefined && item.latitude !== null ? String(item.latitude) : "-",
          longitude: item.longitude !== undefined && item.longitude !== null ? String(item.longitude) : "-",
          animal_count: item.animal_count !== undefined && item.animal_count !== null ? String(item.animal_count) : "-",
          physical_condition: item.physical_condition ?? "-",
          behavioral_indicators: item.behavioral_indicators ?? "-",
          severity: item.severity ?? item.urgency_level ?? item.urgency ?? "-",
          is_urgent: item.is_urgent !== undefined && item.is_urgent !== null ? (item.is_urgent ? "Yes" : "No") : "-",
          coordinator_id: item.coordinator_id ?? null,
          media_evidence: Array.isArray(item.media_evidence)
            ? item.media_evidence.join(", ")
            : (item.media_evidence ?? item.media_urls ?? "-"),
          environmental_factors: item.environmental_factors ?? "-",
          reporter_notes: item.reporter_notes ?? item.notes ?? "-",
          status: item.status ?? "-",
          ...(item.rejection_rationale ? { rejection_reason: item.rejection_rationale } : {}),
          created_at: item.created_at ? new Date(item.created_at).toLocaleString() : "-",
          updated_at: item.updated_at ? new Date(item.updated_at).toLocaleString() : "-",
          stage_label: stage.label,
          stage_bg: stage.bg,
          stage_color: stage.color,
          dispatch_driver: d?.assigned_driver_id || "-",
          dispatch_agents: d?.agents && d.agents.length > 0 ? d.agents.map((a: any) => a.agent_id).join(", ") : "-",
          dispatch_vehicle: d?.assigned_vehicle_id || d?.vehicle_id || "-",
          dispatch_equipment: d?.equipment_details || "-",
          dispatched_at: d?.dispatched_at ? new Date(d.dispatched_at).toLocaleString() : "-",
          located_at: d?.located_at ? new Date(d.located_at).toLocaleString() : "-",
          rescued_at: d?.rescued_at ? new Date(d.rescued_at).toLocaleString() : "-",
          admitted_at: d?.admitted_at ? new Date(d.admitted_at).toLocaleString() : "-",
          escalation_type: d?.escalation_type || "-",
          escalation_notes: d?.escalation_notes || "-",
          has_dispatch: Boolean(d),
          reports: Array.isArray(item.reports) ? item.reports : [],
          rawItem: item,
        };
      });

      setCases(formatted);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load rescue cases. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_address) {
      addToast("Location address is required for rescue case", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await rescueService.createRescueCase({
        location_address: formData.location_address,
        location_landmark: formData.location_landmark,
        severity: formData.severity,
        is_urgent: formData.is_urgent,
        animal_count: Number(formData.animal_count),
        physical_condition: formData.physical_condition,
        reporter_name: formData.reporter_name,
        reporter_phone: formData.reporter_phone,
        reporter_notes: formData.reporter_notes,
      });
      addToast("Rescue case reported successfully!", "success");
      setIsAddModalOpen(false);
      setFormData({
        location_address: "",
        location_landmark: "",
        severity: "high",
        is_urgent: true,
        animal_count: 1,
        physical_condition: "unknown",
        reporter_name: "",
        reporter_phone: "",
        reporter_notes: "",
      });
      fetchRescueCases();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create rescue case", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setIsSubmitting(true);
      // POST /rescue/{id}/verify only accepts { status, rejection_rationale,
      // severity, is_urgent, media_evidence }. Location/condition/reporter
      // fields are NOT editable via this endpoint, so we only send the fields
      // the backend can actually persist (no silent no-op).
      await rescueService.updateRescueCase(selectedCase.id, {
        severity: formData.severity,
        is_urgent: formData.is_urgent,
      });
      addToast("Rescue case updated successfully!", "success");
      setIsEditModalOpen(false);
      setSelectedCase(null);
      fetchRescueCases();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to update rescue case", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedCase) return;
    try {
      setIsSubmitting(true);
      await rescueService.deleteRescueCase(selectedCase.id);
      addToast("Rescue case deleted.", "success");
      setIsDeleteModalOpen(false);
      setSelectedCase(null);
      fetchRescueCases();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to delete rescue case", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    if (!assignForm.coordinator_id) {
      addToast("Select a rescue coordinator to assign.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await rescueService.assignCoordinator(
        selectedCase.id,
        assignForm.coordinator_id,
        assignForm.notes || undefined
      );
      addToast("Rescue coordinator assigned successfully!", "success");
      setIsAssignModalOpen(false);
      setAssignForm({ coordinator_id: "", notes: "" });
      fetchRescueCases();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to assign coordinator", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBadge = (val: string, type: "severity" | "urgent" | "status") => {
    if (!val || val === "-") return "-";
    const lower = String(val).toLowerCase();
    let bg = "#F1F5F9";
    let color = "#475569";

    if (type === "urgent") {
      if (lower === "yes" || lower === "true") {
        bg = "#FEF2F2";
        color = "#EF4444";
      } else {
        bg = "#ECFDF5";
        color = "#10B981";
      }
    } else if (type === "severity") {
      if (lower.includes("critical") || lower.includes("high") || lower.includes("severe")) {
        bg = "#FEF2F2";
        color = "#EF4444";
      } else if (lower.includes("medium") || lower.includes("moderate")) {
        bg = "#FFFBEB";
        color = "#F59E0B";
      } else {
        bg = "#EFF6FF";
        color = "#2563EB";
      }
    } else if (type === "status") {
      if (lower.includes("completed") || lower.includes("approved") || lower.includes("resolved")) {
        bg = "#ECFDF5";
        color = "#10B981";
      } else if (lower.includes("pending") || lower.includes("assigned") || lower.includes("in progress")) {
        bg = "#FFFBEB";
        color = "#F59E0B";
      } else if (lower.includes("rejected") || lower.includes("cancelled")) {
        bg = "#FEF2F2";
        color = "#EF4444";
      }
    }

    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 700,
          background: bg,
          color: color,
          display: "inline-block",
        }}
      >
        {val}
      </span>
    );
  };

  const columns = [
    { key: "ticket_number", header: "Case #" },
    { key: "location_address", header: "Location" },
    {
      key: "severity",
      header: "Severity",
      render: (val: string) => renderBadge(val, "severity"),
    },
    {
      key: "is_urgent",
      header: "Urgent",
      render: (val: string) => renderBadge(val, "urgent"),
    },
    {
      key: "stage_label",
      header: "Dispatch Status",
      render: (val: string, row: any) => (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 700,
            background: row.stage_bg,
            color: row.stage_color,
            display: "inline-block",
          }}
        >
          {val}
        </span>
      ),
    },
    {
      key: "status",
      header: "Rescue Status",
      render: rescueStatusBadge,
    },
    { key: "dispatch_agents", header: "Agents" },
    {
      key: "coordinator_id",
      header: "Coordinator",
      render: (_: any, row: any) => coordinatorLabel(row.coordinator_id),
    },
    { key: "created_at", header: "Reported" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Rescue Management
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Monitor and coordinate live dog rescue requests from the field.
          </p>
        </div>

        <Can permission="create_rescues">
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
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            }}
          >
            <FaPlus size={14} />
            <span>New Rescue Case</span>
          </button>
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Rescues" value={cases.length} icon={<FaLifeRing />} color="#2563EB" />
        <StatCard title="Urgent Incidents" value={cases.filter((c) => c.is_urgent === "Yes").length} icon={<FaExclamationTriangle />} color="#EF4444" />
        <StatCard title="Critical Severity" value={cases.filter((c) => String(c.severity).toLowerCase().includes("critical") || String(c.severity).toLowerCase().includes("high")).length} icon={<FaAmbulance />} color="#F59E0B" />
        <StatCard title="Completed Cases" value={cases.filter((c) => String(c.status).toLowerCase() === "admitted" || String(c.status).toLowerCase() === "rescued").length} icon={<FaCheckCircle />} color="#10B981" />
      </div>

      <QuickActionCard
        title="Emergency Rescue Operations Triage"
        description="Live incident reports dynamically sync across all rescue centers, dispatch units, and vet clinics."
      />

      <div style={{ marginTop: "24px" }}>
        <DataTable
          data={cases}
          columns={columns}
          loading={loading}
          error={error}
          onRetry={fetchRescueCases}
          module="rescues"
          emptyMessage="No active rescue cases found. Click 'New Rescue Case' to report one."
          onView={(item: any) => {
            setSelectedCase(item);
            setIsViewModalOpen(true);
          }}
          onEdit={(item: any) => {
            setSelectedCase(item);
            const sevRaw = String(item.severity || "").toLowerCase();
            const severity = SEVERITY_OPTIONS.some((s) => s.value === sevRaw) ? sevRaw : "high";
            const condRaw = String(item.physical_condition || "").toLowerCase();
            const physical_condition = PHYSICAL_CONDITION_OPTIONS.some((c) => c.value === condRaw) ? condRaw : "unknown";
            setFormData({
              location_address: item.location_address !== "-" ? String(item.location_address || "") : "",
              location_landmark: item.location_landmark !== "-" ? String(item.location_landmark || "") : "",
              severity,
              is_urgent: item.is_urgent === "Yes",
              animal_count: Number(item.animal_count !== "-" ? item.animal_count : 1),
              physical_condition,
              reporter_name: item.reporter_name !== "-" ? String(item.reporter_name || "") : "",
              reporter_phone: item.reporter_phone !== "-" ? String(item.reporter_phone || "") : "",
              reporter_notes: item.reporter_notes !== "-" ? String(item.reporter_notes || "") : "",
            });
            setIsEditModalOpen(true);
          }}
          onDelete={(item: any) => {
            setSelectedCase(item);
            setIsDeleteModalOpen(true);
          }}
        />
      </div>

      {/* Rescue Coordinators */}
      <div className="soft-card" style={{ padding: "20px", marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Available Rescue Coordinators</h3>
        </div>
        {coordinators.length === 0 ? (
          <p style={{ margin: 0, color: "#94A3B8", fontSize: "13px" }}>
            No rescue coordinators found in the user directory.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
            {coordinators.map((c: any) => (
              <div key={c.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 14px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{c.full_name || c.email || c.id}</div>
                {c.email && <div style={{ fontSize: "12px", color: "#64748B" }}>{c.email}</div>}
                {c.phone && <div style={{ fontSize: "12px", color: "#64748B" }}>{c.phone}</div>}
                <div style={{ marginTop: "8px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: c.is_active ? "#ECFDF5" : "#FEF2F2",
                      color: c.is_active ? "#059669" : "#DC2626",
                    }}
                  >
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Report New Rescue Incident">
        <form onSubmit={handleCreateCase} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Location Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. 5th Main St, Near City Park"
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Landmark</label>
            <input
              type="text"
              placeholder="e.g. Behind Central Metro Station"
              value={formData.location_landmark}
              onChange={(e) => setFormData({ ...formData, location_landmark: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Dog Count</label>
              <input
                type="number"
                min="1"
                value={formData.animal_count}
                onChange={(e) => setFormData({ ...formData, animal_count: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Physical Condition</label>
            <select
              value={formData.physical_condition}
              onChange={(e) => setFormData({ ...formData, physical_condition: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            >
              {PHYSICAL_CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Reporter Name *</label>
              <input
                type="text"
                required
                value={formData.reporter_name}
                onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Reporter Phone *</label>
              <input
                type="text"
                required
                value={formData.reporter_phone}
                onChange={(e) => setFormData({ ...formData, reporter_phone: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Reporter Notes</label>
            <textarea
              rows={3}
              value={formData.reporter_notes}
              onChange={(e) => setFormData({ ...formData, reporter_notes: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", cursor: "pointer" }}>{isSubmitting ? "Reporting..." : "Report Incident"}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Rescue Case">
        <form onSubmit={handleUpdateCase} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", color: "#1E40AF" }}>
            Location, physical condition and reporter fields are fixed at creation time and cannot be edited here.
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", marginTop: "4px" }}
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
            <input
              type="checkbox"
              checked={formData.is_urgent}
              onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
            />
            Urgent case
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", cursor: "pointer" }}>{isSubmitting ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Rescue Case Details">
        {selectedCase && (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Ticket Number</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.ticket_number || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Reporter Name</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.reporter_name || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Reporter Phone</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.reporter_phone || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Alternate Phone</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.reporter_alternate_phone || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Reporter Email</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.reporter_email || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Anonymous</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.is_anonymous || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Location Address</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.location_address || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Landmark</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.location_landmark || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Latitude / Longitude</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                {selectedCase.latitude || "-"} / {selectedCase.longitude || "-"}
              </div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Dog Count</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.animal_count || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Physical Condition</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.physical_condition || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Behavioral Indicators</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.behavioral_indicators || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Severity</div>
              <div style={{ marginTop: "4px" }}>{renderBadge(selectedCase.severity, "severity")}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Urgent</div>
              <div style={{ marginTop: "4px" }}>{renderBadge(selectedCase.is_urgent, "urgent")}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Status</div>
              <div style={{ marginTop: "4px" }}>{renderBadge(selectedCase.status, "status")}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Media Evidence</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", wordBreak: "break-word" }}>{selectedCase.media_evidence || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Environmental Factors</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.environmental_factors || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Reporter Notes</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.reporter_notes || "-"}</div>
            </div>

            {selectedCase.rejection_reason && (
              <div style={{ background: "#FEF2F2", padding: "10px 12px", borderRadius: "8px", border: "1px solid #FCA5A5", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#991B1B", textTransform: "uppercase" }}>Rejection Reason</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#991B1B" }}>{selectedCase.rejection_reason}</div>
              </div>
            )}

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Assigned Coordinator</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                {selectedCase.coordinator_id ? coordinatorLabel(selectedCase.coordinator_id) : "Not assigned"}
              </div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Created At</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.created_at || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Updated At</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.updated_at || "-"}</div>
            </div>

            <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "8px" }}>Dispatch & Lifecycle</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Dispatch Status</div>
                  <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, background: selectedCase.stage_bg, color: selectedCase.stage_color, display: "inline-block", marginTop: "4px" }}>
                    {selectedCase.stage_label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Rescue Status</div>
                  <div style={{ marginTop: "4px" }}>{rescueStatusBadge(selectedCase.status)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Assigned Driver</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.dispatch_driver || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Field Agents</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.dispatch_agents || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Vehicle</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.dispatch_vehicle || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Equipment</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.dispatch_equipment || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Dispatched At</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.dispatched_at || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Located At</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.located_at || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Rescued At</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.rescued_at || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Admitted At</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedCase.admitted_at || "-"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Escalation</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                    {selectedCase.escalation_type !== "-" ? `${selectedCase.escalation_type}${selectedCase.escalation_notes !== "-" ? ` — ${selectedCase.escalation_notes}` : ""}` : "None"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
            <Can permission="edit_rescues">
              <button
                onClick={() => {
                  setAssignForm({
                    coordinator_id: selectedCase.coordinator_id || "",
                    notes: "",
                  });
                  setIsAssignModalOpen(true);
                }}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaPlus size={12} /> Assign Coordinator
              </button>
            </Can>
            <button onClick={() => setIsViewModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", cursor: "pointer" }}>Close</button>
          </div>
          </>
        )}
      </Modal>

      {/* Assign Coordinator Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Coordinator${selectedCase?.ticket_number ? ` — ${selectedCase.ticket_number}` : ""}`}>
        <form onSubmit={handleAssignCoordinator} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              {coordinators.map((c: any) => (
                <option key={c.id} value={c.id}>{c.full_name || c.email || c.id}</option>
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

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Rescue Case">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, color: "#475569" }}>
            Are you sure you want to delete rescue case <strong>{selectedCase?.ticket_number}</strong>?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleDeleteCase} disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", cursor: "pointer" }}>{isSubmitting ? "Deleting..." : "Delete Case"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RescueManagement;
