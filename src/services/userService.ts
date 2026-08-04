import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface UserPayload {
  id?: string;
  full_name?: string;
  name?: string;
  email: string;
  role?: string;
  roles?: string[];
  department?: string;
  status?: string;
  password?: string;
  is_active?: boolean;
}

export interface RolePayload {
  id?: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export const userService = {
  // Super Admin - Users
  getUsers: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/admin/users", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        try {
          const res2 = await api.get("/users", { params });
          return res2.data;
        } catch {
          return { data: [], total: 0 };
        }
      }
      throw err;
    }
  },

  createUser: async (data: UserPayload) => {
    const response = await api.post("/admin/users", data);
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
    const response = await api.put(`/admin/users/${userId}`, data);
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
    try {
      const response = await api.get("/admin/roles", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
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
    return response.data;
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
    return response.data;
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
    return response.data;
  },
};

export default userService;

