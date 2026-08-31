import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface GrievanceTicketPayload {
  title: string;
  description: string;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  rescue_centre_id?: string;
  rescue_case_id?: string;
  [key: string]: unknown;
}

export interface GrievanceCommentPayload {
  comment: string;
  is_internal?: boolean;
}

export const grievanceService = {
  // GET /grievance (Paginated complaints list with filtering)
  getGrievances: async (params?: Record<string, unknown>) => {
    const response = await api.get("/grievance", { params });
    return response.data;
  },

  // POST /grievance - Create new complaint / grievance ticket
  createGrievance: async (data: GrievanceTicketPayload) => {
    const response = await api.post("/grievance", data);
    await publishActionEvent({
      module: "rescue",
      action: "create",
      title: "New Escalation / Complaint Filed",
      message: `Ticket "${data.title}" submitted.`,
      targetRoles: ["super_admin", "rescue_centre_admin"],
    });
    return response.data;
  },

  // GET /grievance/{ticket_id}
  getGrievanceById: async (ticketId: string) => {
    const response = await api.get(`/grievance/${ticketId}`);
    return response.data;
  },

  // PUT /grievance/{ticket_id}/status
  updateGrievanceStatus: async (ticketId: string, status: string, resolutionNotes?: string) => {
    const response = await api.put(`/grievance/${ticketId}/status`, {
      status,
      notes: resolutionNotes,
    });
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Complaint Ticket Status Updated",
      message: `Ticket ${ticketId} status changed to ${status}.`,
      targetRoles: ["super_admin", "rescue_centre_admin"],
    });
    return response.data;
  },

  // POST /grievance/{ticket_id}/assign
  assignGrievance: async (ticketId: string, assignedToId: string, assignedToName?: string) => {
    const response = await api.post(`/grievance/${ticketId}/assign`, {
      assigned_to_id: assignedToId,
      assigned_to_name: assignedToName,
    });
    return response.data;
  },

  // POST /grievance/{ticket_id}/escalate
  escalateGrievance: async (ticketId: string, reason: string) => {
    const response = await api.post(`/grievance/${ticketId}/escalate`, {
      reason,
    });
    await publishActionEvent({
      module: "rescue",
      action: "update",
      title: "Complaint Escalated to Super Admin",
      message: `Ticket ${ticketId} escalated. Reason: ${reason}`,
      targetRoles: ["super_admin"],
    });
    return response.data;
  },

  // POST /grievance/{ticket_id}/comments
  addGrievanceComment: async (ticketId: string, payload: GrievanceCommentPayload) => {
    const response = await api.post(`/grievance/${ticketId}/comments`, payload);
    return response.data;
  },
};

export default grievanceService;
