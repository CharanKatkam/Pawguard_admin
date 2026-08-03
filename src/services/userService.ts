import api from "../api/axios";

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
    const response = await api.get("/admin/users", { params });
    return response.data;
  },

  createUser: async (data: UserPayload) => {
    const response = await api.post("/admin/users", data);
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: Partial<UserPayload>) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Super Admin - Roles
  getRoles: async (params?: Record<string, unknown>) => {
    const response = await api.get("/admin/roles", { params });
    return response.data;
  },

  createRole: async (data: RolePayload) => {
    const response = await api.post("/admin/roles", data);
    return response.data;
  },

  getRoleById: async (roleId: string) => {
    const response = await api.get(`/admin/roles/${roleId}`);
    return response.data;
  },

  updateRole: async (roleId: string, data: Partial<RolePayload>) => {
    const response = await api.put(`/admin/roles/${roleId}`, data);
    return response.data;
  },

  deleteRole: async (roleId: string) => {
    const response = await api.delete(`/admin/roles/${roleId}`);
    return response.data;
  },

  // Super Admin - Permissions
  getPermissions: async () => {
    const response = await api.get("/admin/permissions");
    return response.data;
  },
};

export default userService;

