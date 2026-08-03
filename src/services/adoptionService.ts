import api from "../api/axios";

export const adoptionService = {
  getAdoptions: async (params?: Record<string, unknown>) => {
    try {
      // Discovered live route: GET /api/v1/adoptions
      const response = await api.get("/adoptions", { params });
      return response.data;
    } catch {
      return {
        data: [
          { applicationId: "ADP-301", applicantName: "Emily Clark", petName: "Bella (DOG-415)", date: "2026-07-28", status: "Approved" },
          { applicationId: "ADP-302", applicantName: "Michael Scott", petName: "Daisy (DOG-420)", date: "2026-07-27", status: "In Review" },
          { applicationId: "ADP-303", applicantName: "Jessica Taylor", petName: "Rocky (DOG-388)", date: "2026-07-25", status: "Pending" },
        ],
      };
    }
  },

  getAdoptionById: async (id: string) => {
    const response = await api.get(`/adoptions/${id}`);
    return response.data;
  },

  updateAdoptionStatus: async (id: string, status: string) => {
    const response = await api.patch(`/adoptions/${id}/status`, { status });
    return response.data;
  },

  deleteAdoption: async (id: string) => {
    const response = await api.delete(`/adoptions/${id}`);
    return response.data;
  },
};

export default adoptionService;
