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

export const rescueService = {
  // GET /rescue (Exact OpenAPI endpoint for rescue requests/cases)
  getRescueCases: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/rescue", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  getRescueCaseById: async (requestId: string) => {
    const response = await api.get(`/rescue/${requestId}`);
    return response.data;
  },

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

  updateRescueCase: async (requestId: string, data: Partial<RescueCasePayload>) => {
    const response = await api.put(`/rescue/${requestId}`, data);
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Rescue Incident Updated",
      message: `Rescue case ${requestId} status updated to ${data.status || "In Progress"}.`,
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

  // Rescue Requests
  getRescueRequests: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/rescue", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
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

  rejectRescueRequest: async (requestId: string, _reason?: string) => {
    const response = await api.post(`/rescue/${requestId}/fail`);
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
  getDispatches: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/rescue", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  createDispatch: async (data: DispatchPayload) => {
    const requestId = data.case_id || data.id || "1";
    const response = await api.post(`/rescue/${requestId}/dispatch`, data);
    await publishActionEvent({
      module: "rescue",
      action: "assign",
      title: "Rescue Vehicle Dispatched",
      message: `Dispatch team assigned for rescue request ${requestId}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },

  updateDispatchStatus: async (requestId: string, _status: string) => {
    const response = await api.post(`/rescue/${requestId}/dispatch`);
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Dispatch Progress Updated",
      message: `Field agent confirmed status update for rescue ${requestId}.`,
      targetRoles: ["super_admin", "rescue_coordinator", "rescue_agent"],
    });
    return response.data;
  },
};

export default rescueService;
