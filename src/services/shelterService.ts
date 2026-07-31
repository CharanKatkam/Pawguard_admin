import api from "../api/axios";

export const shelterService = {
  getShelters: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/shelter/facilities", { params });
      return response.data;
    } catch {
      return {
        data: [
          { code: "HUB-01", name: "Central Rescue Hub", manager: "Sarah Jenkins", capacity: 100, occupancy: 85, status: "Active" },
          { code: "HUB-02", name: "North Haven Sanctuary", manager: "Rahul Sharma", capacity: 50, occupancy: 38, status: "Active" },
          { code: "HUB-03", name: "East Wing Veterinary Facility", manager: "Dr. John Smith", capacity: 40, occupancy: 29, status: "Active" },
        ],
      };
    }
  },

  getShelterById: async (facilityId: string) => {
    const response = await api.get(`/shelter/facilities/${facilityId}`);
    return response.data;
  },

  createShelter: async (data: Record<string, unknown>) => {
    const response = await api.post("/shelter/facilities", data);
    return response.data;
  },

  updateShelterStatus: async (facilityId: string, status: string) => {
    const response = await api.put(`/shelter/facilities/${facilityId}/status`, { status });
    return response.data;
  },
};

export default shelterService;
