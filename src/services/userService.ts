import api from "../api/axios";

export interface UserPayload {
  id?: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  status?: string;
  password?: string;
}

export const userService = {
  getUsers: async (params?: Record<string, unknown>) => {
    try {
      // Discovered live route: GET /api/v1/admin/users
      const response = await api.get("/admin/users", { params });
      return response.data;
    } catch {
      return {
        data: [
          { id: "USR-001", name: "Dr. John Smith", email: "vet@pawguard.com", role: "veterinarian", department: "Clinical Operations", status: "Active" },
          { id: "USR-002", name: "Rahul Sharma", email: "shelter.manager@pawguard.com", role: "shelter_manager", department: "Shelter Care", status: "Active" },
          { id: "USR-003", name: "Sarah Jenkins", email: "rescue.coordinator@pawguard.com", role: "rescue_coordinator", department: "Emergency Rescue", status: "Active" },
          { id: "USR-004", name: "Alex Rivera", email: "rescue.agent@pawguard.com", role: "rescue_agent", department: "Field Dispatch", status: "Active" },
          { id: "USR-005", name: "Priya Nair", email: "finance.user@pawguard.com", role: "finance_user", department: "Financial Governance", status: "Active" },
        ],
      };
    }
  },

  getUserById: async (id: string) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  createUser: async (data: UserPayload) => {
    const response = await api.post("/admin/users", data);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<UserPayload>) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },
};

export default userService;
