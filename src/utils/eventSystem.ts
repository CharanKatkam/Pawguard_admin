import { notifyDataChanged } from "./dataSync";
import { getCurrentUser } from "./roleUtils";
import type { UserRole } from "../types/auth";
import notificationService from "../services/notificationService";

export interface ActionEventPayload {
  module:
    | "user"
    | "rescue"
    | "shelter"
    | "medical"
    | "adoption"
    | "foster"
    | "volunteer"
    | "inventory"
    | "finance"
    | "vehicle"
    | "lost_found"
    | "settings"
    | "role";
  action: "create" | "update" | "approve" | "reject" | "assign" | "delete";
  title: string;
  message: string;
  user?: string;
  targetRoles?: UserRole[];
  metadata?: Record<string, unknown>;
}

// In-memory activity and audit log streams populated from real user actions
const activityLogStream: Array<{
  id: string;
  title: string;
  desc: string;
  time: string;
  type: string;
}> = [];

const auditLogStream: Array<{
  id: string;
  action: string;
  user: string;
  time: string;
  status: string;
}> = [];

export const getActivityStream = () => [...activityLogStream];
export const getAuditStream = () => [...auditLogStream];

/**
 * Centralized Event Publisher:
 * Call after any important operational action (create, update, approve, reject, assign, delete).
 * - Creates a role-targeted notification
 * - Appends an entry to the recent activity feed
 * - Writes an audit log record
 * - Triggers live refresh across all mounted dashboards and lists
 */
export async function publishActionEvent(payload: ActionEventPayload): Promise<void> {
  const currentUser = getCurrentUser();
  const actor = payload.user || currentUser?.email || "System";
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // 1. Create & Broadcast Notification
  try {
    await notificationService.sendBroadcastNotification({
      title: payload.title,
      message: payload.message,
      type: (payload.module as any) || "system",
      targetRoles: payload.targetRoles,
    });
  } catch {
    // Fallback handled gracefully
  }

  // 2. Add Activity Log Entry
  activityLogStream.unshift({
    id: `ACT-${Date.now()}`,
    title: payload.title,
    desc: `${payload.message} (By ${actor})`,
    time: "Just now",
    type: payload.module,
  });

  // 3. Add Audit Log Entry (for security, user, finance, shelter, role changes)
  if (
    payload.action === "create" ||
    payload.action === "delete" ||
    payload.action === "approve" ||
    payload.action === "reject" ||
    payload.module === "user" ||
    payload.module === "role" ||
    payload.module === "finance" ||
    payload.module === "settings"
  ) {
    auditLogStream.unshift({
      id: `AUD-${Date.now()}`,
      action: `${payload.action.toUpperCase()}: ${payload.title}`,
      user: actor,
      time: timestamp,
      status: "Success",
    });
  }

  // 4. Trigger Live Counter and List Refresh for all dashboards
  notifyDataChanged();
}

// Workflow Helper Functions

// 1. User Management Workflow
export function triggerUserWorkflow(action: string, userEmail: string, roleName: string, details?: string) {
  return publishActionEvent({
    module: "user",
    action: action.includes("delete") ? "delete" : "update",
    title: `User ${action}: ${userEmail}`,
    message: `Account ${userEmail} assigned role ${roleName}. ${details || ""}`,
    targetRoles: ["super_admin"],
  });
}

// 2. Rescue Request Workflow
export function triggerRescueRequestWorkflow(requestId: string, location: string, urgency: string) {
  return publishActionEvent({
    module: "rescue",
    action: "create",
    title: `New Rescue Request #${requestId}`,
    message: `Emergency rescue logged at ${location} (${urgency} urgency). Pending assignment.`,
    targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator", "rescue_agent"],
  });
}

// 3. Rescue Assignment Workflow
export function triggerRescueAssignmentWorkflow(requestId: string, agentName: string) {
  return publishActionEvent({
    module: "rescue",
    action: "assign",
    title: `Rescue Case Assigned: #${requestId}`,
    message: `Case #${requestId} assigned to Rescue Agent ${agentName}.`,
    targetRoles: ["super_admin", "rescue_centre_admin", "rescue_coordinator", "rescue_agent"],
  });
}

// 4. Rescue Completion Workflow
export function triggerRescueCompletionWorkflow(requestId: string, petName: string, facilityName: string) {
  return publishActionEvent({
    module: "rescue",
    action: "approve",
    title: `Rescue Completed: #${requestId}`,
    message: `Animal ${petName} successfully admitted to ${facilityName}.`,
    targetRoles: ["super_admin", "rescue_centre_admin", "shelter_manager", "veterinarian"],
  });
}

// 5. Medical Workflow
export function triggerMedicalWorkflow(action: string, petName: string, vetName: string, status: string) {
  return publishActionEvent({
    module: "medical",
    action: "update",
    title: `Medical Care ${action}: ${petName}`,
    message: `Treatment status for ${petName} updated to ${status} by Dr. ${vetName}.`,
    targetRoles: ["super_admin", "veterinarian", "shelter_manager", "adoption_coordinator"],
  });
}

// 6. Shelter Workflow
export function triggerShelterWorkflow(action: string, facilityName: string, petName: string, capacity: number) {
  return publishActionEvent({
    module: "shelter",
    action: "update",
    title: `Shelter ${action}: ${petName}`,
    message: `Intake/transfer of ${petName} at ${facilityName}. Available capacity: ${capacity}.`,
    targetRoles: ["super_admin", "shelter_manager", "rescue_centre_admin"],
  });
}

// 7. Adoption Workflow
export function triggerAdoptionWorkflow(action: string, applicantName: string, petName: string, isApproved: boolean) {
  return publishActionEvent({
    module: "adoption",
    action: isApproved ? "approve" : "update",
    title: `Adoption Application ${action}`,
    message: `Application for ${petName} by ${applicantName} is ${isApproved ? "Approved" : "Under Review"}.`,
    targetRoles: ["super_admin", "adoption_coordinator", "volunteer_coordinator", "finance_user"],
  });
}

// 8. Volunteer Workflow
export function triggerVolunteerWorkflow(action: string, volunteerName: string, taskName: string) {
  return publishActionEvent({
    module: "volunteer",
    action: "assign",
    title: `Volunteer Shift ${action}`,
    message: `Shift task '${taskName}' assigned to volunteer ${volunteerName}.`,
    targetRoles: ["super_admin", "volunteer_coordinator"] as UserRole[],
  });
}

// 9. Inventory Workflow
export function triggerInventoryWorkflow(action: string, itemName: string, stock: number | string, isLowStock = false) {
  return publishActionEvent({
    module: "inventory",
    action: "update",
    title: `Inventory ${action} (${isLowStock ? "ALERT" : "Stock Update"}): ${itemName}`,
    message: `Item '${itemName}' current stock level: ${stock}.${isLowStock ? " LOW STOCK WARNING!" : ""}`,
    targetRoles: ["super_admin", "inventory_manager", "shelter_manager", "veterinarian"],
  });
}

// 10. Finance Workflow
export function triggerFinanceWorkflow(action: string, amount: number | string, category: string, entity: string) {
  return publishActionEvent({
    module: "finance",
    action: "create",
    title: `Finance Ledger Event: ${action}`,
    message: `Transaction of $${amount} (${category}) logged for ${entity}.`,
    targetRoles: ["super_admin", "finance_user"],
  });
}

export default {
  publishActionEvent,
  getActivityStream,
  getAuditStream,
  triggerUserWorkflow,
  triggerRescueRequestWorkflow,
  triggerRescueAssignmentWorkflow,
  triggerRescueCompletionWorkflow,
  triggerMedicalWorkflow,
  triggerShelterWorkflow,
  triggerAdoptionWorkflow,
  triggerVolunteerWorkflow,
  triggerInventoryWorkflow,
  triggerFinanceWorkflow,
};
