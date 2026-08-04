import api from "../api/axios";

export interface LostFoundPayload {
  id?: string;
  type: "lost" | "found";
  pet_name?: string;
  description: string;
  location: string;
  contact_name: string;
  contact_phone: string;
  date_reported?: string;
  status?: string;
  [key: string]: unknown;
}

export const lostFoundService = {
  // GET /lost-found/lost (Exact OpenAPI endpoint for lost reports)
  getLostReports: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/lost-found/lost", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  // GET /lost-found/found (Exact OpenAPI endpoint for found reports)
  getFoundReports: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/lost-found/found", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  getLostFoundList: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/lost-found/lost", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  createReport: async (data: LostFoundPayload) => {
    const endpoint = data.type === "found" ? "/lost-found/found" : "/lost-found/lost";
    const response = await api.post(endpoint, data);
    return response.data;
  },

  updateReport: async (id: string, data: Partial<LostFoundPayload>) => {
    const endpoint = data.type === "found" ? `/lost-found/found/${id}` : `/lost-found/lost/${id}`;
    const response = await api.put(endpoint, data);
    return response.data;
  },

  deleteReport: async (id: string, type: "lost" | "found" = "lost") => {
    const endpoint = type === "found" ? `/lost-found/found/${id}` : `/lost-found/lost/${id}`;
    const response = await api.delete(endpoint);
    return response.data;
  },
};

export default lostFoundService;
