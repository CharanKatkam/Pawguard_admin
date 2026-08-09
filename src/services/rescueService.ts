import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface RescueCasePayload {
  id?: string;
  case_number?: string;
  dog_name?: string;
  location?: string;
  urgency_level?: string;
  status?: string;
  assigned_agent?: string;
  reporter_name?: string;
  reporter_phone?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface DispatchPayload {
  id?: string;
  case_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  agent_id?: string;
  dispatch_time?: string;
  status?: string;
  notes?: string;
  [key: string]: unknown;
}

/** Extract the list from a paginated GET /rescue response. */
const unwrapList = (body: unknown): any[] => {
  if (!body || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;
  const data = Array.isArray(body) ? body : obj.data;
  return Array.isArray(data) ? data : [];
};

export const rescueService = {
  // GET /rescue - list rescue requests/cases
  getRescueCases: async (params?: Record<string, unknown>) => {
    const response = await api.get("/rescue", { params });
    return response.data;
  },

  getRescueCaseById: async (requestId: string) => {
    const response = await api.get(`/rescue/${requestId}`);
    return response.data;
  },

  // POST /rescue/report - RescueRequestCreate
  createRescueCase: async (data: RescueCasePayload) => {
    const response = await api.post("/rescue/report", data);
    await publishActionEvent({
      module: "rescue",
      action: "create",
      title: "New Rescue Incident Reported",
      message: `Rescue incident reported for ${data.dog_name || "animal"} at ${data.location || "field location"}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },

  // POST /rescue/{request_id}/verify - RescueRequestUpdate
  // The backend only supports {status, rejection_rationale, severity, is_urgent, media_evidence}.
  updateRescueCase: async (requestId: string, data: Partial<RescueCasePayload>) => {
    const payload: Record<string, unknown> = {};
    if (data.status) payload.status = data.status;
    if (data.severity !== undefined && data.severity !== null && data.severity !== "") {
      payload.severity = String(data.severity).toLowerCase();
    }
    if (typeof data.is_urgent === "boolean") payload.is_urgent = data.is_urgent;
    const response = await api.post(`/rescue/${requestId}/verify`, payload);
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Rescue Incident Updated",
      message: `Rescue case ${requestId} updated (${payload.severity || "no change"} severity${typeof payload.is_urgent === "boolean" ? `, urgent: ${payload.is_urgent}` : ""}).`,
      targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator"],
    });
    return response.data;
  },

  updateRescueStatus: async (requestId: string, status: string) => {
    const response = await api.post(`/rescue/${requestId}/verify`, { status });
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Rescue Status Verified",
      message: `Rescue incident ${requestId} verified with status: ${status}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator"],
    });
    return response.data;
  },

  deleteRescueCase: async (id: string) => {
    const response = await api.delete(`/rescue/${id}`);
    await publishActionEvent({
      module: "rescue",
      action: "delete",
      title: "Rescue Record Archived",
      message: `Rescue case record ${id} removed from active system.`,
      targetRoles: ["super_admin", "rescue_centre_admin"],
    });
    return response.data;
  },

  // Rescue Requests (same GET /rescue source)
  getRescueRequests: async (params?: Record<string, unknown>) => {
    const response = await api.get("/rescue", { params });
    return response.data;
  },

  createRescueRequest: async (data: Record<string, unknown>) => {
    const response = await api.post("/rescue/report", data);
    await publishActionEvent({
      module: "rescue",
      action: "create",
      title: "Public Rescue Request Submitted",
      message: `Emergency rescue request logged from field reporter.`,
      targetRoles: ["super_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },

  approveRescueRequest: async (requestId: string) => {
    const response = await api.post(`/rescue/${requestId}/verify`);
    await publishActionEvent({
      module: "rescue",
      action: "approve",
      title: "Rescue Request Approved",
      message: `Rescue request ${requestId} approved and dispatched for field response.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },

  rejectRescueRequest: async (requestId: string, reason?: string) => {
    const payload = reason ? { rejection_rationale: reason } : {};
    const response = await api.post(`/rescue/${requestId}/fail`, payload);
    await publishActionEvent({
      module: "rescue",
      action: "reject",
      title: "Rescue Request Closed",
      message: `Rescue request ${requestId} reviewed and closed.`,
      targetRoles: ["super_admin", "rescue_coordinator"],
    });
    return response.data;
  },

  // Rescue Dispatch
  // There is no GET dispatch-list endpoint, so dispatches are derived from
  // the nested `dispatch` object on each rescue request returned by GET /rescue.
  getDispatches: async (params?: Record<string, unknown>) => {
    const response = await api.get("/rescue", { params });
    const list = unwrapList(response.data);
    const dispatches: any[] = [];
    for (const req of list) {
      if (req.dispatch) {
        const d = req.dispatch;
        dispatches.push({
          id: d.id,
          dispatch_id: d.id,
          case_id: d.rescue_request_id || req.id,
          vehicle_id: d.vehicle_id || d.assigned_vehicle_id,
          driver_id: d.assigned_driver_id,
          agent_id: Array.isArray(d.agents) && d.agents[0] ? d.agents[0].agent_id : undefined,
          dispatch_time: d.dispatched_at,
          status: req.status || "dispatched",
          notes: d.notes,
        });
      }
    }
    return { data: dispatches, total: dispatches.length };
  },

  // POST /rescue/{request_id}/dispatch - RescueDispatchCreate
  createDispatch: async (data: DispatchPayload) => {
    const requestId = data.case_id;
    if (!requestId) {
      throw new Error("A target rescue case (case_id) is required to dispatch a team.");
    }
    const payload: Record<string, unknown> = {};
    if (data.vehicle_id) payload.vehicle_id = data.vehicle_id;
    if (data.driver_id) payload.assigned_driver_id = data.driver_id;
    if (data.agent_id) payload.assigned_agent_ids = [data.agent_id];
    if (data.notes) payload.equipment_details = data.notes;

    const response = await api.post(`/rescue/${requestId}/dispatch`, payload);
    await publishActionEvent({
      module: "rescue",
      action: "assign",
      title: "Rescue Vehicle Dispatched",
      message: `Dispatch team assigned for rescue request ${requestId}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },

  // PATCH /rescue/dispatch/{dispatch_id} - RescueDispatchUpdate
  updateDispatchStatus: async (dispatchId: string, status: string) => {
    const response = await api.patch(`/rescue/dispatch/${dispatchId}`, {
      status: String(status || "").toLowerCase(),
    });
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Dispatch Progress Updated",
      message: `Field agent confirmed status update for dispatch ${dispatchId}.`,
      targetRoles: ["super_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },
};

export default rescueService;
