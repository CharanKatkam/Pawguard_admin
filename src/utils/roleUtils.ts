import type { UserRole, User } from "../types/auth";

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
    return extractRoleString(input[0]);
  }

  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    if (typeof obj.role === "string") return obj.role;
    if (typeof obj.role_name === "string") return obj.role_name;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.slug === "string") return obj.slug;
    if (typeof obj.title === "string") return obj.title;
    if (typeof obj.type === "string") return obj.type;
    if (typeof obj.user_type === "string") return obj.user_type;
  }

  return String(input);
};

/**
  Normalizes any role input into an internal operational UserRole.
  Returns null for public-facing/unauthorized roles (Donor, General Public, Volunteer, Foster Family).
 */
export const normalizeRole = (rawInput?: unknown): UserRole | null => {
  const str = extractRoleString(rawInput);
  if (!str) return "super_admin";

  const lower = str.toLowerCase().trim();

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

  // 1. Super Admin
  if (
    lower.includes("super.admin") ||
    lower.includes("super_admin") ||
    lower.includes("superadmin") ||
    lower.includes("super_administrator") ||
    lower === "super"
  ) {
    return "super_admin";
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

  // Fallback for general admin keyword
  if (lower === "admin" || lower.includes("administrator")) {
    return "super_admin";
  }

  return "super_admin";
};

export const isInternalRole = (rawInput?: unknown): boolean => {
  const role = normalizeRole(rawInput);
  return role !== null && ALLOWED_INTERNAL_ROLES.includes(role);
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem("user");
    if (!userJson) return null;
    return JSON.parse(userJson) as User;
  } catch {
    return null;
  }
};

export const getCurrentUserRole = (): UserRole => {
  const user = getCurrentUser();
  if (!user) return "super_admin";

  const role = normalizeRole(
    user.role ||
    user.role_name ||
    user.user_type ||
    user.type ||
    user.email
  );

  return role || "super_admin";
};

export const getDashboardPathForRole = (role?: string | UserRole): string => {
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

export const getRoleTitle = (role?: string | UserRole): string => {
  const normalized = normalizeRole(role) || "super_admin";
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
    | "certificates";
}

export const getMenusForRole = (role?: string | UserRole): RoleMenuItem[] => {
  const normalized = normalizeRole(role) || "super_admin";
  const dashboardPath = getDashboardPathForRole(normalized);

  switch (normalized) {
    case "super_admin":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "User Management", path: "/users", iconType: "users" },
        { name: "Animals & Pets", path: "/pets", iconType: "pets" },
        { name: "Rescue Centres", path: "/shelters", iconType: "shelters" },
        { name: "Medical Records", path: "/medical-records", iconType: "medical" },
        { name: "Adoptions", path: "/adoptions", iconType: "adoptions" },
        { name: "Inventory", path: "/inventory", iconType: "inventory" },
        { name: "Finance", path: "/finance", iconType: "finance" },
        { name: "Reports & Analytics", path: "/reports", iconType: "reports" },
        { name: "Roles & Permissions", path: "/roles-permissions", iconType: "users" },
        { name: "Audit Logs", path: "/audit-logs", iconType: "audit" },
        { name: "Certificates", path: "/certificates", iconType: "certificates" },
        { name: "System Settings", path: "/settings", iconType: "settings" },
      ];

    case "rescue_centre_admin":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Rescue Centre Mgmt", path: "/shelters", iconType: "shelters" },
        { name: "Animals", path: "/pets", iconType: "pets" },
        { name: "Rescue Agents", path: "/users", iconType: "users" },
        { name: "Medical Records", path: "/medical-records", iconType: "medical" },
        { name: "Inventory", path: "/inventory", iconType: "inventory" },
        { name: "Operational Reports", path: "/reports", iconType: "reports" },
      ];

    case "rescue_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Rescue Cases", path: "/pets", iconType: "ambulance" },
        { name: "Assign Agents", path: "/users", iconType: "users" },
        { name: "Animal Tracking", path: "/shelters", iconType: "shelters" },
        { name: "Rescue Reports", path: "/reports", iconType: "reports" },
      ];

    case "rescue_agent":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Assigned Cases", path: "/pets", iconType: "ambulance" },
        { name: "Rescue Status & Logs", path: "/reports", iconType: "reports" },
      ];

    case "veterinarian":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Dog Profiles", path: "/pets", iconType: "pets" },
        { name: "Medical & Veterinary Suite", path: "/medical-records", iconType: "medical" },
        { name: "Vaccinations & Certs", path: "/certificates", iconType: "certificates" },
        { name: "Health Reports", path: "/reports", iconType: "reports" },
      ];

    case "shelter_manager":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Shelter Animals", path: "/pets", iconType: "pets" },
        { name: "Facility & Cages", path: "/shelters", iconType: "shelters" },
        { name: "Staff & Volunteers", path: "/users", iconType: "users" },
        { name: "Inventory", path: "/inventory", iconType: "inventory" },
      ];

    case "adoption_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Adoption Requests", path: "/adoptions", iconType: "adoptions" },
        { name: "Adoptable Animals", path: "/pets", iconType: "pets" },
        { name: "Adoption Reports", path: "/reports", iconType: "reports" },
      ];

    case "foster_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Foster Families", path: "/users", iconType: "users" },
        { name: "Foster Animals", path: "/pets", iconType: "pets" },
        { name: "Foster Reports", path: "/reports", iconType: "reports" },
      ];

    case "volunteer_coordinator":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Volunteers Directory", path: "/users", iconType: "users" },
        { name: "Schedules & Tasks", path: "/reports", iconType: "tasks" },
      ];

    case "inventory_manager":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Inventory & Medicines", path: "/inventory", iconType: "inventory" },
        { name: "Suppliers & Stock", path: "/shelters", iconType: "shelters" },
      ];

    case "finance_user":
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
        { name: "Finance & Donations", path: "/finance", iconType: "finance" },
        { name: "Financial Reports", path: "/reports", iconType: "reports" },
      ];

    default:
      return [
        { name: "Dashboard", path: dashboardPath, iconType: "dashboard" },
      ];
  }
};
