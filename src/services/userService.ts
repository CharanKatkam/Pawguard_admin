import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface UserPayload {
  id?: string;
  email: string;
  full_name?: string;
  name?: string;
  phone?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
  mfa_enabled?: boolean;
  roles?: string[];
  role_names?: string[];
  created_at?: string;
  updated_at?: string;
  role?: string;
  department?: string;
  status?: string;
  password?: string;
}

export interface RolePayload {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  permissions?: string[];
  permission_codes?: string[];
}

/** Unwrap a backend response body into its `data` payload when wrapped. */
const unwrap = <T,>(body: unknown): T => {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (obj.data !== undefined) return obj.data as T;
  }
  return body as T;
};

/** Extract permission codes from any role/permission payload shape. */
export const extractPermissionCodes = (raw: unknown): string[] => {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const source =
    obj.permission_codes ??
    obj.permissionCodes ??
    obj.permissions ??
    obj.permissionList;
  if (source === undefined || source === null) return [];
  if (!Array.isArray(source)) return [];
  const codes: string[] = [];
  for (const item of source) {
    if (typeof item === "string") {
      codes.push(item);
    } else if (item && typeof item === "object") {
      const perm = item as Record<string, unknown>;
      const code = perm.permission_code ?? perm.code ?? perm.key ?? perm.name ?? perm.slug;
      if (typeof code === "string") codes.push(code);
    }
  }
  return Array.from(new Set(codes));
};

export const userService = {
  // Super Admin - Users
  getUsers: async (params?: Record<string, unknown>) => {
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  createUser: async (data: UserPayload) => {
    const payload: Record<string, unknown> = {
      email: data.email,
      password: data.password,
      full_name: data.full_name || data.name,
      role_names: Array.isArray(data.role_names)
        ? data.role_names
        : data.role
          ? [data.role]
          : [],
    };
    if (data.phone !== undefined) payload.phone = data.phone;
    const response = await api.post("/admin/users", payload);
    await publishActionEvent({
      module: "user",
      action: "create",
      title: "New User Provisioned",
      message: `Account created for ${data.email} with role ${data.role || "staff"}.`,
      targetRoles: ["super_admin"],
    });
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: Partial<UserPayload>) => {
    const payload: Record<string, unknown> = {};
    const fullName = data.full_name ?? data.name;
    if (fullName !== undefined) payload.full_name = fullName;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.is_active !== undefined) payload.is_active = data.is_active;
    const roleNames =
      data.role_names !== undefined
        ? data.role_names
        : Array.isArray(data.roles)
          ? data.roles
          : data.role
            ? [data.role]
            : undefined;
    if (roleNames !== undefined) payload.role_names = roleNames;
    const response = await api.put(`/admin/users/${userId}`, payload);
    await publishActionEvent({
      module: "user",
      action: "update",
      title: "User Profile Updated",
      message: `User record ${userId} (${data.email || "staff"}) updated.`,
      targetRoles: ["super_admin"],
    });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    await publishActionEvent({
      module: "user",
      action: "delete",
      title: "User Account Deprovisioned",
      message: `User account ${userId} removed from platform.`,
      targetRoles: ["super_admin"],
    });
    return response.data;
  },

  // Super Admin - Roles
  getRoles: async (params?: Record<string, unknown>) => {
    const response = await api.get("/admin/roles", { params });
    return unwrap<unknown>(response.data);
  },

  createRole: async (data: RolePayload) => {
    const response = await api.post("/admin/roles", data);
    await publishActionEvent({
      module: "role",
      action: "create",
      title: "New RBAC Role Defined",
      message: `Role ${data.name} created with permission set.`,
      targetRoles: ["super_admin"],
    });
    return response.data;
  },

  getRoleById: async (roleId: string) => {
    const response = await api.get(`/admin/roles/${roleId}`);
    return unwrap<Record<string, unknown>>(response.data);
  },

  updateRole: async (roleId: string, data: Partial<RolePayload>) => {
    const response = await api.put(`/admin/roles/${roleId}`, data);
    await publishActionEvent({
      module: "role",
      action: "update",
      title: "RBAC Role Policy Modified",
      message: `Role ${data.name || roleId} permissions updated.`,
      targetRoles: ["super_admin"],
    });
    return unwrap<Record<string, unknown>>(response.data);
  },

  /** Update only the permission codes of a role (PUT with permission_codes). */
  updateRolePermissions: async (roleId: string, permissionCodes: string[]) => {
    const response = await api.put(`/admin/roles/${roleId}`, { permission_codes: permissionCodes });
    await publishActionEvent({
      module: "role",
      action: "update",
      title: "RBAC Role Policy Modified",
      message: `Role ${roleId} permission set updated (${permissionCodes.length} grants).`,
      targetRoles: ["super_admin"],
    });
    return unwrap<Record<string, unknown>>(response.data);
  },

  deleteRole: async (roleId: string) => {
    const response = await api.delete(`/admin/roles/${roleId}`);
    await publishActionEvent({
      module: "role",
      action: "delete",
      title: "RBAC Role Deleted",
      message: `Role definition ${roleId} removed.`,
      targetRoles: ["super_admin"],
    });
    return response.data;
  },

  // Super Admin - Permissions
  getPermissions: async () => {
    const response = await api.get("/admin/permissions");
    return unwrap<unknown>(response.data);
  },
};

export default userService;

