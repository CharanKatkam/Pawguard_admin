import type { UserRole } from "../types/auth";
import { getCurrentUserRole } from "./roleUtils";

/**
 * Role-based access control utility
 * Centralized permission checking for features and actions
 */

// Define permissions for each role
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    "view_dashboard",
    "manage_users",
    "manage_roles",
    "manage_permissions",
    "view_notifications",
    "manage_settings",
    "view_audit_logs",
    "manage_shelters",
    "manage_animals",
    "manage_adoptions",
    "manage_medical",
    "manage_inventory",
    "manage_finance",
    "view_all_notifications",
    "create_backup",
    "manage_certificates",
  ],
  rescue_centre_admin: [
    "view_dashboard",
    "manage_animals",
    "manage_adoptions",
    "view_notifications",
    "manage_inventory",
    "manage_medical",
    "view_shelter_data",
  ],
  rescue_coordinator: [
    "view_dashboard",
    "manage_animals",
    "view_notifications",
    "manage_rescues",
    "view_emergency_alerts",
  ],
  rescue_agent: [
    "view_dashboard",
    "report_rescue",
    "view_notifications",
    "update_animal_status",
  ],
  veterinarian: [
    "view_dashboard",
    "manage_medical",
    "view_animals",
    "view_notifications",
  ],
  shelter_manager: [
    "view_dashboard",
    "manage_animals",
    "manage_adoptions",
    "view_notifications",
    "manage_inventory",
  ],
  adoption_coordinator: [
    "view_dashboard",
    "manage_adoptions",
    "view_animals",
    "view_notifications",
  ],
  foster_coordinator: [
    "view_dashboard",
    "manage_foster_placements",
    "view_animals",
    "view_notifications",
  ],
  volunteer_coordinator: [
    "view_dashboard",
    "manage_volunteers",
    "view_notifications",
  ],
  inventory_manager: [
    "view_dashboard",
    "manage_inventory",
    "view_notifications",
  ],
  finance_user: [
    "view_dashboard",
    "manage_finance",
    "view_notifications",
  ],
};

/**
 * Notification type access control
 * Define which roles can receive specific notification types
 */
const NOTIFICATION_TYPE_ACCESS: Record<string, UserRole[]> = {
  // System-wide notifications (Super Admin only)
  system: ["super_admin"],
  user_created: ["super_admin"],
  user_updated: ["super_admin"],
  user_deleted: ["super_admin"],
  role_permission_changed: ["super_admin"],
  certificate_generated: ["super_admin"],
  finance_action: ["super_admin", "finance_user"],

  // Shelter/Animal notifications
  shelter_added: ["super_admin", "rescue_centre_admin", "shelter_manager"],
  animal_registered: [
    "super_admin",
    "rescue_centre_admin",
    "shelter_manager",
    "rescue_coordinator",
    "veterinarian",
  ],
  animal_updated: [
    "super_admin",
    "rescue_centre_admin",
    "shelter_manager",
    "rescue_coordinator",
    "veterinarian",
  ],

  // Medical notifications
  medical_updated: [
    "super_admin",
    "veterinarian",
    "rescue_centre_admin",
    "shelter_manager",
  ],

  // Adoption notifications
  adoption_submitted: [
    "super_admin",
    "adoption_coordinator",
    "rescue_centre_admin",
    "shelter_manager",
  ],
  adoption_approved: [
    "super_admin",
    "adoption_coordinator",
    "rescue_centre_admin",
    "shelter_manager",
  ],
  adoption_rejected: [
    "super_admin",
    "adoption_coordinator",
    "rescue_centre_admin",
    "shelter_manager",
  ],

  // Inventory notifications
  inventory_changed: [
    "super_admin",
    "inventory_manager",
    "rescue_centre_admin",
    "shelter_manager",
  ],

  // Rescue notifications
  emergency: [
    "super_admin",
    "rescue_coordinator",
    "rescue_agent",
    "rescue_centre_admin",
  ],

  // Volunteer notifications
  volunteer: ["super_admin", "volunteer_coordinator"],

  // Adoption notifications (general)
  adoption: ["super_admin", "adoption_coordinator", "rescue_centre_admin"],

  // Medical notifications (general)
  medical: [
    "super_admin",
    "veterinarian",
    "rescue_centre_admin",
    "shelter_manager",
  ],
};

/**
 * Check if the current user has a specific permission
 */
export const hasPermission = (permission: string, role?: UserRole): boolean => {
  const currentRole = role || getCurrentUserRole();
  if (!currentRole) return false;

  const permissions = ROLE_PERMISSIONS[currentRole];
  return permissions ? permissions.includes(permission) : false;
};

/**
 * Check if the current user can view settings
 */
export const canViewSettings = (role?: UserRole): boolean => {
  return hasPermission("manage_settings", role);
};

/**
 * Check if the current user can view notifications
 */
export const canViewNotifications = (role?: UserRole): boolean => {
  return hasPermission("view_notifications", role);
};

/**
 * Check if the current user can view audit logs
 */
export const canViewAuditLogs = (role?: UserRole): boolean => {
  return hasPermission("view_audit_logs", role);
};

/**
 * Check if the current user can trigger backups
 */
export const canCreateBackup = (role?: UserRole): boolean => {
  return hasPermission("create_backup", role);
};

/**
 * Get all roles that can receive a specific notification type
 */
export const getRolesForNotificationType = (
  notificationType: string
): UserRole[] => {
  return NOTIFICATION_TYPE_ACCESS[notificationType] || [];
};

/**
 * Check if a specific role can receive a specific notification type
 */
export const canReceiveNotification = (
  notificationType: string,
  role?: UserRole
): boolean => {
  const currentRole = role || getCurrentUserRole();
  if (!currentRole) return false;

  const allowedRoles = getRolesForNotificationType(notificationType);
  return allowedRoles.includes(currentRole);
};

/**
 * Filter notifications based on current user's role
 */
export const filterNotificationsByRole = (
  notifications: Array<{ type: string; [key: string]: unknown }>,
  role?: UserRole
): Array<{ type: string; [key: string]: unknown }> => {
  const currentRole = role || getCurrentUserRole();
  if (!currentRole) return [];

  // Super admin sees all notifications
  if (currentRole === "super_admin") {
    return notifications;
  }

  // Other roles only see notifications they're allowed to receive
  return notifications.filter((notif) =>
    canReceiveNotification(notif.type as string, currentRole)
  );
};

/**
 * Check multiple permissions (all must be true)
 */
export const hasAllPermissions = (
  permissions: string[],
  role?: UserRole
): boolean => {
  return permissions.every((permission) => hasPermission(permission, role));
};

/**
 * Check multiple permissions (at least one must be true)
 */
export const hasAnyPermission = (
  permissions: string[],
  role?: UserRole
): boolean => {
  return permissions.some((permission) => hasPermission(permission, role));
};

/**
 * Get all permissions for a specific role
 */
export const getPermissionsForRole = (role: UserRole): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Get notification types accessible by a role
 */
export const getNotificationTypesForRole = (role: UserRole): string[] => {
  return Object.entries(NOTIFICATION_TYPE_ACCESS)
    .filter(([, roles]) => roles.includes(role))
    .map(([type]) => type);
};

export default {
  hasPermission,
  canViewSettings,
  canViewNotifications,
  canViewAuditLogs,
  canCreateBackup,
  getRolesForNotificationType,
  canReceiveNotification,
  filterNotificationsByRole,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  getNotificationTypesForRole,
};
