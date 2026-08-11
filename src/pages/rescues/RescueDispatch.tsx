import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaTruck, FaAmbulance, FaUserCheck, FaClock, FaPlus } from "react-icons/fa";
import rescueService from "../../services/rescueService";
import userService from "../../services/userService";
import vehicleService from "../../services/vehicleService";
import { rescueStatusBadge, dispatchStage } from "../../utils/rescueStatus.tsx";
import { notifyDataChanged } from "../../utils/dataSync";

const unwrapList = (body: any): any[] => {
  if (!body) return [];
  const data = Array.isArray(body) ? body : body.data;
  return Array.isArray(data) ? data : [];
};

interface EnrichedDispatch {
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
  driver_name: string;
  agent_names: string;
  vehicle_label: string;
  reported_at: string;
  dispatched_at: string;
  raw: any;
  [key: string]: unknown;
}

const RescueDispatch = () => {
  const [dispatches, setDispatches] = useState<EnrichedDispatch[]>([]);
  const [rescueCases, setRescueCases] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      case_id: params.get("case_id") || "",
      driver_id: "",
      agent_ids: [] as string[],
      vehicle_id: "",
      notes: "",
    };
  });

  const userIdLabel = (id?: string) => {
    if (!id) return "";
    const u = users.find((x) => x.id === id);
    return u ? u.full_name || u.email || id : id;
  };

  const fetchAll = async () => {
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

      const caseById = new Map(caseList.map((c: any) => [c.id, c]));

      const formatted: EnrichedDispatch[] = dispatchList.map((d: any) => {
        const req = d.rescue_request_id ? caseById.get(d.rescue_request_id) : undefined;
        const stage = dispatchStage({ status: req?.status, dispatch: req?.dispatch });
        const agents = Array.isArray(d.agents) ? d.agents : [];
        const vehicle = d.assigned_vehicle_id
          ? vehicleList.find((v: any) => v.id === d.assigned_vehicle_id)
          : undefined;
        return {
          id: d.id,
          dispatch_id: d.id,
          ticket: req?.ticket_number || d.rescue_request_id || "-",
          animal_count: req?.animal_count != null ? String(req.animal_count) : "-",
          location: req?.location_address || "-",
          severity: req?.severity || "-",
          rescue_status: req?.status || "-",
          stage_label: stage.label,
          stage_bg: stage.bg,
          stage_color: stage.color,
          driver_name: userIdLabel(d.assigned_driver_id) || "-",
          agent_names:
            agents.length > 0 ? agents.map((a: any) => userIdLabel(a.agent_id)).join(", ") : "-",
          vehicle_label:
            vehicle?.vehicle_number || vehicle?.registration_number || vehicle?.id || d.vehicle_id || "-",
          reported_at: req?.created_at ? new Date(req.created_at).toLocaleString() : "-",
          dispatched_at: d.dispatched_at ? new Date(d.dispatched_at).toLocaleString() : "-",
          raw: d,
        };
      });

      setDispatches(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load dispatch operations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.case_id) {
      addToast("Select a rescue case to dispatch", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await rescueService.createDispatch({
        case_id: formData.case_id,
        driver_id: formData.driver_id || undefined,
        agent_ids: formData.agent_ids,
        vehicle_id: formData.vehicle_id || undefined,
        notes: formData.notes || undefined,
      });
      addToast("Rescue team dispatched!", "success");
      setIsAddModalOpen(false);
      setFormData({ case_id: "", driver_id: "", agent_ids: [], vehicle_id: "", notes: "" });
      fetchAll();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to dispatch rescue team", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const agentCandidates = users.filter((u) => Array.isArray(u.roles) && u.roles.includes("rescue_agent"));
  const driverCandidates = users.filter(
    (u) =>
      Array.isArray(u.roles) &&
      (u.roles.includes("rescue_agent") || u.roles.includes("rescue_coordinator"))
  );
  const dispatchableCases = rescueCases.filter(
    (c: any) => c.status === "verified" || c.status === "dispatched" || c.status === "located"
  );

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
    { key: "driver_name", header: "Driver" },
    { key: "agent_names", header: "Agents" },
    { key: "vehicle_label", header: "Vehicle" },
    {
      key: "stage_label",
      header: "Dispatch Status",
      render: (val: string, row: any) => (
        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: row.stage_bg, color: row.stage_color }}>
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

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Rescue Dispatch Center
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Field rescue dispatch control. Dispatches are linked to rescue cases and their lifecycle status.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Dispatches" value={dispatches.length} icon={<FaTruck />} color="#2563EB" />
        <StatCard
          title="Awaiting Dispatch"
          value={dispatchableCases.filter((c: any) => c.status === "verified").length}
          icon={<FaClock />}
          color="#F59E0B"
        />
        <StatCard
          title="En Route / Located"
          value={dispatches.filter((d) => d.rescue_status === "dispatched" || d.rescue_status === "located").length}
          icon={<FaAmbulance />}
          color="#7C3AED"
        />
        <StatCard
          title="Completed / Admitted"
          value={dispatches.filter((d) => d.rescue_status === "admitted" || d.rescue_status === "rescued").length}
          icon={<FaUserCheck />}
          color="#10B981"
        />
      </div>

      <DataTable
        data={dispatches}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchAll}
        emptyMessage="No dispatches found. Create a dispatch to assign a field team."
        module="rescue_dispatch"
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Dispatch Rescue Team">
        <form onSubmit={handleCreateDispatch} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Rescue Case *</label>
            <select required value={formData.case_id} onChange={(e) => setFormData({ ...formData, case_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>
              <option value="">Select verified rescue case...</option>
              {dispatchableCases.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.ticket_number || c.id} — {c.location_address || "no location"}
                </option>
              ))}
            </select>
            {dispatchableCases.length === 0 && (
              <div style={{ marginTop: "6px", fontSize: "12px", color: "#F59E0B" }}>
                No verified rescue cases available to dispatch.
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Driver</label>
              <select value={formData.driver_id} onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>
                <option value="">Not assigned</option>
                {driverCandidates.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Vehicle</label>
              <select value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>
                <option value="">Not assigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.vehicle_number || v.registration_number || v.id}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Field Agents</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
              {agentCandidates.length === 0 && (
                <span style={{ fontSize: "12px", color: "#F59E0B" }}>No rescue agents found in user directory.</span>
              )}
              {agentCandidates.map((u) => {
                const checked = formData.agent_ids.includes(u.id);
                return (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          agent_ids: checked
                            ? formData.agent_ids.filter((x) => x !== u.id)
                            : [...formData.agent_ids, u.id],
                        })
                      }
                    />
                    {u.full_name || u.email}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Equipment / Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
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
