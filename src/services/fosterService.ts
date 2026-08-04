import api from "../api/axios";

export interface FosterPlacementPayload {
  id?: string;
  dog_id?: string;
  foster_family_id?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  notes?: string;
  [key: string]: unknown;
}

export const fosterService = {
  getFosterPlacements: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/fosters", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  getFosterById: async (id: string) => {
    const response = await api.get(`/fosters/${id}`);
    return response.data;
  },

  createPlacement: async (data: FosterPlacementPayload) => {
    const response = await api.post("/fosters", data);
    return response.data;
  },

  updatePlacement: async (id: string, data: Partial<FosterPlacementPayload>) => {
    const response = await api.put(`/fosters/${id}`, data);
    return response.data;
  },

  deletePlacement: async (id: string) => {
    const response = await api.delete(`/fosters/${id}`);
    return response.data;
  },
};

export default fosterService;
