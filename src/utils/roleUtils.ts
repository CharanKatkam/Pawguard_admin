import type { UserRole, User } from "../types/auth";
import { getStoredUser } from "./authStorage";

export const ALLOWED_INTERNAL_ROLES: UserRole[] = [
  "super_admin",
  "rescue_centre_admin",
  "rescue_coordinator",
  "rescue_agent",
  "veterinarian",
  "shelter_manager",
  "adoption_coordinator",
  "foster_coordinator",
  "volunteer_coordinator",
  "inventory_manager",
  "finance_user",
];

/**
  Extract role string safely from any raw input (string, object, array).
 */
export const extractRoleString = (input: unknown): string => {
  if (!input) return "";

  if (typeof input === "string") return input;

  if (Array.isArray(input) && input.length > 0) {
    for (const item of input) {
      const extracted = extractRoleString(item);
      if (extracted) return extracted;
    }
    return "";
  }

  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;

    // Priority candidate fields for role
    const candidateFields = [
      "role",
      "roles",
      "role_name",
      "user_type",
      "type",
      "slug",
      "title",
    ];

    for (const field of candidateFields) {
      if (obj[field] !== undefined && obj[field] !== null) {
        const extracted = extractRoleString(obj[field]);
        if (extracted) return extracted;
      }
    }
  }

  return "";
};

/**
  Normalizes any role input into an internal operational UserRole.
  Returns null for public-facing/unauthorized roles (Donor, General Public, Volunteer, Foster Family).
*/
export const normalizeRole = (rawInput?: unknown): UserRole | null => {
  const str = extractRoleString(rawInput);
  if (!str) return null;

  const lower = String(str).toLowerCase().trim();

  // 1. Super Admin (Checked first to cover all variations)
  if (
    lower === "super_admin" ||
    lower === "super-admin" ||
    lower === "superadmin" ||
    lower === "super admin" ||
    lower.includes("super_admin") ||
    lower.includes("super-admin") ||
    lower.includes("superadmin") ||
    lower.includes("super_administrator") ||
    lower.includes("super.admin") ||
    lower.split(/[^a-z0-9]+/).includes("super") ||
    lower === "admin" ||
    lower.includes("administrator") ||
    lower === "sysadmin" ||
    lower === "system_admin"
  ) {
    return "super_admin";
  }

  // Explicitly reject public-facing roles
  if (
    lower.includes("public") ||
    lower.includes("donor") ||
    lower === "volunteer" ||
    lower.includes("foster_family") ||
    lower.includes("foster.family") ||
    lower.includes("fosterfamily")
  ) {
    return null;
  }

  // 2. Rescue Centre Admin
  if (
    lower.includes("rescue.admin") ||
    lower.includes("rescue_centre_admin") ||
    lower.includes("rescue_center_admin") ||
    lower.includes("rescuecentreadmin") ||
    lower.includes("rescuecenteradmin") ||
    lower.includes("rescue_admin")
  ) {
    return "rescue_centre_admin";
  }

  // 3. Rescue Coordinator
  if (
    lower.includes("rescue.coordinator") ||
    lower.includes("rescue_coordinator") ||
    lower.includes("rescuecoordinator")
  ) {
    return "rescue_coordinator";
  }

  // 4. Rescue Agent
  if (
    lower.includes("rescue.agent") ||
    lower.includes("rescue_agent") ||
    lower.includes("rescueagent")
  ) {
    return "rescue_agent";
  }

  // 5. Veterinarian
  if (
    lower.includes("vet") ||
    lower.includes("veterinarian") ||
    lower.includes("veterinary")
  ) {
    return "veterinarian";
  }

  // 6. Shelter Manager
  if (
    lower.includes("shelter.manager") ||
    lower.includes("shelter_manager") ||
    lower.includes("sheltermanager")
  ) {
    return "shelter_manager";
  }

  // 7. Adoption Coordinator
  if (
    lower.includes("adoption.coordinator") ||
    lower.includes("adoption_coordinator") ||
    lower.includes("adoptioncoordinator")
  ) {
    return "adoption_coordinator";
  }

  // 8. Foster Coordinator
  if (
    lower.includes("foster.coordinator") ||
    lower.includes("foster_coordinator") ||
    lower.includes("fostercoordinator")
  ) {
    return "foster_coordinator";
  }

  // 9. Volunteer Coordinator
  if (
    lower.includes("volunteer.coordinator") ||
    lower.includes("volunteer_coordinator") ||
    lower.includes("volunteercoordinator")
  ) {
    return "volunteer_coordinator";
  }

  // 10. Inventory Manager
  if (
    lower.includes("inventory.manager") ||
    lower.includes("inventory_manager") ||
    lower.includes("inventorymanager") ||
    lower.includes("inventory")
  ) {
    return "inventory_manager";
  }

  // 11. Finance User
  if (
    lower.includes("finance.user") ||
    lower.includes("finance_user") ||
    lower.includes("finance_officer") ||
    lower.includes("financeuser") ||
    lower.includes("finance")
  ) {
    return "finance_user";
  }

  return null;
};

export const isInternalRole = (rawInput?: unknown): boolean => {
  const role = normalizeRole(rawInput);
  return role !== null && ALLOWED_INTERNAL_ROLES.includes(role);
};

export const getCurrentUser = (): User | null => {
  return getStoredUser<User>();
};

export const getCurrentUserRole = (): UserRole | null => {
  const user = getCurrentUser();
  if (!user) return null;

  return normalizeRole(user);
};


export const getDashboardPathForRole = (role?: string | UserRole | null): string => {
  const normalized = normalizeRole(role) || "super_admin";
  switch (normalized) {
    case "super_admin":
      return "/dashboard/super-admin";
    case "rescue_centre_admin":
      return "/dashboard/rescue-centre-admin";
    case "rescue_coordinator":
      return "/dashboard/rescue-coordinator";
    case "rescue_agent":
      return "/dashboard/rescue-agent";
    case "veterinarian":
      return "/dashboard/veterinarian";
    case "shelter_manager":
      return "/dashboard/shelter-manager";
    case "adoption_coordinator":
      return "/dashboard/adoption-coordinator";
    case "foster_coordinator":
      return "/dashboard/foster-coordinator";
    case "volunteer_coordinator":
      return "/dashboard/volunteer-coordinator";
    case "inventory_manager":
      return "/dashboard/inventory-manager";
    case "finance_user":
      return "/dashboard/finance";
    default:
      return "/dashboard/super-admin";
  }
};

export const ROLE_DASHBOARD_PATHS: Array<{ path: string; role: UserRole }> = [
  { path: "/dashboard/super-admin", role: "super_admin" },
  { path: "/dashboard/rescue-centre-admin", role: "rescue_centre_admin" },
  { path: "/dashboard/rescue-coordinator", role: "rescue_coordinator" },
  { path: "/dashboard/rescue-agent", role: "rescue_agent" },
  { path: "/dashboard/veterinarian", role: "veterinarian" },
  { path: "/dashboard/shelter-manager", role: "shelter_manager" },
  { path: "/dashboard/adoption-coordinator", role: "adoption_coordinator" },
  { path: "/dashboard/foster-coordinator", role: "foster_coordinator" },
  { path: "/dashboard/volunteer-coordinator", role: "volunteer_coordinator" },
  { path: "/dashboard/inventory-manager", role: "inventory_manager" },
  { path: "/dashboard/finance", role: "finance_user" },
];

/**
 * Resolve which role's dashboard the given route path belongs to.
 * Returns null when the path is not a role dashboard route.
 */
export const getDashboardRoleFromPath = (pathname: string): UserRole | null => {
  const normalized = pathname.split("?")[0].replace(/\/+$/, "");
  const entry = ROLE_DASHBOARD_PATHS.find(
    (item) => normalized === item.path || normalized.startsWith(`${item.path}/`)
  );
  return entry ? entry.role : null;
};

/**
 * Determine which role's menus should render in the sidebar for a given
 * authenticated role + current path.
 *
 * AUTHENTICATED ROLE ≠ ACTIVE DASHBOARD: when a Super Admin is viewing another
 * role's dashboard, the sidebar switches to that role's menus so the dashboard
 * "completely uses that role's existing layout" — but the authenticated role
 * (and session) is never changed. Non-admin roles always keep their own menus.
 */
export const getSidebarRole = (
  currentRole: UserRole | null,
  pathname: string
): UserRole | null => {
  if (!currentRole || currentRole !== "super_admin") return currentRole;
  const dashRole = getDashboardRoleFromPath(pathname);
  return dashRole && dashRole !== "super_admin" ? dashRole : currentRole;
};

/**
 * Session key tracking which master module the Super Admin is currently viewing.
 * Kept in sessionStorage so it survives a browser refresh and is cleared when
 * the tab/session closes.
 */
export const ACTIVE_MODULE_STORAGE_KEY = "pawguard:active-module";

export const getActiveModuleKey = (): string | null => {
  try {
    return sessionStorage.getItem(ACTIVE_MODULE_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setActiveModuleKey = (key: string | null): void => {
  try {
    if (key) {
      sessionStorage.setItem(ACTIVE_MODULE_STORAGE_KEY, key);
    } else {
      sessionStorage.removeItem(ACTIVE_MODULE_STORAGE_KEY);
    }
  } catch {
    // sessionStorage may be unavailable; highlighting is best-effort.
  }
};

export const getRoleTitle = (role?: string | UserRole | null): string => {
  if (!role) {
    return "Unknown Role";
  }

  const normalized = normalizeRole(role);
  if (!normalized) {
    return "Unknown Role";
  }

  switch (normalized) {
    case "super_admin":
      return "Super Administrator";
    case "rescue_centre_admin":
      return "Rescue Centre Admin";
    case "rescue_coordinator":
      return "Rescue Coordinator";
    case "rescue_agent":
      return "Rescue Agent";
    case "veterinarian":
      return "Veterinarian";
    case "shelter_manager":
      return "Shelter Manager";
    case "adoption_coordinator":
      return "Adoption Coordinator";
    case "foster_coordinator":
      return "Foster Coordinator";
    case "volunteer_coordinator":
      return "Volunteer Coordinator";
    case "inventory_manager":
      return "Inventory Manager";
    case "finance_user":
      return "Finance User";
  }
};

export interface RoleMenuItem {
  name: string;
  path: string;
  iconType:
    | "dashboard"
    | "users"
    | "pets"
    | "shelters"
    | "adoptions"
    | "reports"
    | "settings"
    | "ambulance"
    | "medical"
    | "inventory"
    | "finance"
    | "heart"
    | "tasks"
    | "audit"
    | "certificates"
    | "rescues"
    | "fosters"
    | "volunteers"
    | "lostfound"
    | "vehicles"
    | "notifications";
}

/**
 * Maps a route path to the granular view permission required to access it.
 * Used by the sidebar and route guards so revoking a permission immediately
 * hides the corresponding menu and blocks the page.
 */
export const MODULE_VIEW_PERMISSIONS: Record<string, string> = {
  "/users": "view_users",
  "/rescues": "view_rescues",
  "/rescue-requests": "view_rescue_requests",
  "/rescue-dispatch": "view_rescue_dispatch",
  "/pets": "view_animals",
  "/medical-records": "view_medical",
  "/shelters": "view_shelters",
  "/adoptions": "view_adoptions",
  "/fosters": "view_foster_placements",
  "/volunteers": "view_volunteers",
  "/lost-and-found": "view_lost_found",
  "/inventory": "view_inventory",
  "/finance": "view_finance",
  "/vehicles": "view_vehicles",
  "/reports": "view_reports",
  "/roles-permissions": "view_roles",
  "/audit-logs": "view_audit_logs",
  "/certificates": "view_certificates",
  "/notifications": "view_notifications",
  "/settings": "view_settings",
};

export const getMenuViewPermission = (path: string): string | undefined =>
  MODULE_VIEW_PERMISSIONS[path];

export const getMenusForRole = (role?: string | UserRole | null): RoleMenuItem[] => {
  const normalized = normalizeRole(role) || "super_admin";
  const dashboardPath = getDashboardPathForRole(normalized);

  switch (normalized) {
    case "super_admin":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "User Management", path: "/users", iconType: "users" },
        { name: "Roles & Permissions", path: "/roles-permissions", iconType: "users" },
        { name: "Rescue Management", path: "/rescues", iconType: "rescues" },
        { name: "Rescue Requests", path: "/rescue-requests", iconType: "ambulance" },
        { name: "Rescue Dispatch", path: "/rescue-dispatch", iconType: "vehicles" },
        { name: "Animal Management", path: "/pets", iconType: "pets" },
        { name: "Shelter Management", path: "/shelters", iconType: "shelters" },
        { name: "Adoptions", path: "/adoptions", iconType: "adoptions" },
        { name: "Foster Care", path: "/fosters", iconType: "fosters" },
        { name: "Volunteers", path: "/volunteers", iconType: "volunteers" },
        { name: "Medical Records", path: "/medical-records", iconType: "medical" },
        { name: "Inventory", path: "/inventory", iconType: "inventory" },
        { name: "Finance", path: "/finance", iconType: "finance" },
        { name: "Vehicle Fleet", path: "/vehicles", iconType: "vehicles" },
        { name: "Lost & Found", path: "/lost-and-found", iconType: "lostfound" },
        { name: "Reports & Analytics", path: "/reports", iconType: "reports" },
        { name: "Audit Logs", path: "/audit-logs", iconType: "audit" },
        { name: "Certificates", path: "/certificates", iconType: "certificates" },
        { name: "Notifications", path: "/notifications", iconType: "notifications" },
        { name: "System Settings", path: "/settings", iconType: "settings" },
      ];

    case "rescue_centre_admin":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Rescue Management", path: "/rescues", iconType: "rescues" },
        { name: "Rescue Requests", path: "/rescue-requests", iconType: "ambulance" },
        { name: "Rescue Dispatch", path: "/rescue-dispatch", iconType: "vehicles" },
        { name: "Dog Management", path: "/pets", iconType: "pets" },
        { name: "Shelter Management", path: "/shelters", iconType: "shelters" },
        { name: "Staff & Users", path: "/users", iconType: "users" },
        { name: "Medical Records", path: "/medical-records", iconType: "medical" },
        { name: "Inventory", path: "/inventory", iconType: "inventory" },
        { name: "Reports & Analytics", path: "/reports", iconType: "reports" },
      ];

    case "rescue_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Rescue Management", path: "/rescues", iconType: "rescues" },
        { name: "Rescue Requests", path: "/rescue-requests", iconType: "ambulance" },
        { name: "Rescue Dispatch", path: "/rescue-dispatch", iconType: "vehicles" },
        { name: "Vehicle Fleet", path: "/vehicles", iconType: "vehicles" },
        { name: "Assign Agents", path: "/users", iconType: "users" },
        { name: "Reports", path: "/reports", iconType: "reports" },
      ];

    case "rescue_agent":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Assigned Rescues", path: "/rescues", iconType: "rescues" },
        { name: "Rescue Requests", path: "/rescue-requests", iconType: "ambulance" },
        { name: "Dog Records", path: "/pets", iconType: "pets" },
        { name: "Reports & Logs", path: "/reports", iconType: "reports" },
      ];

    case "veterinarian":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Medical Suite", path: "/medical-records", iconType: "medical" },
        { name: "Dog Profiles", path: "/pets", iconType: "pets" },
        { name: "Vaccines & Certs", path: "/certificates", iconType: "certificates" },
        { name: "Medical Reports", path: "/reports", iconType: "reports" },
      ];

    case "shelter_manager":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Shelter Facilities", path: "/shelters", iconType: "shelters" },
        { name: "Dog Profiles", path: "/pets", iconType: "pets" },
        { name: "Shelter Staff", path: "/users", iconType: "users" },
        { name: "Medical Records", path: "/medical-records", iconType: "medical" },
        { name: "Adoptions", path: "/adoptions", iconType: "adoptions" },
        { name: "Inventory", path: "/inventory", iconType: "inventory" },
        { name: "Reports & Analytics", path: "/reports", iconType: "reports" },
        { name: "Notifications", path: "/notifications", iconType: "notifications" },
      ];

    case "adoption_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Adoptions", path: "/adoptions", iconType: "adoptions" },
        { name: "Adoptable Dogs", path: "/pets", iconType: "pets" },
        { name: "Adoption Reports", path: "/reports", iconType: "reports" },
      ];

    case "foster_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Foster Management", path: "/fosters", iconType: "fosters" },
        { name: "Foster Dogs", path: "/pets", iconType: "pets" },
        { name: "Reports", path: "/reports", iconType: "reports" },
      ];

    case "volunteer_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Volunteers Directory", path: "/volunteers", iconType: "volunteers" },
        { name: "User Directory", path: "/users", iconType: "users" },
        { name: "Schedules & Reports", path: "/reports", iconType: "tasks" },
      ];

    case "inventory_manager":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Inventory & Stock", path: "/inventory", iconType: "inventory" },
        { name: "Shelters & Storage", path: "/shelters", iconType: "shelters" },
      ];

    case "finance_user":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Donations & Finance", path: "/finance", iconType: "finance" },
        { name: "Financial Reports", path: "/reports", iconType: "reports" },
      ];

    default:
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
      ];
  }
};
