import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface PetPayload {
  id?: string;
  name: string;
  breed: string;
  age: string;
  gender?: string;
  location?: string;
  status?: string;
  medical_history?: string;
  [key: string]: unknown;
}

export const petService = {
  // GET /dogs (Exact OpenAPI endpoint)
  getPets: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/dogs", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  getPetById: async (dogId: string) => {
    const response = await api.get(`/dogs/${dogId}`);
    return response.data;
  },

  createPet: async (data: PetPayload) => {
    const response = await api.post("/dogs", data);
    await publishActionEvent({
      module: "shelter",
      action: "create",
      title: "New Animal Intake Registered",
      message: `Animal ${data.name} (${data.breed || "Dog"}) registered in facility database.`,
      targetRoles: [
        "super_admin",
        "rescue_centre_admin",
        "shelter_manager",
        "veterinarian",
        "adoption_coordinator",
      ],
    });
    return response.data;
  },

  updatePet: async (dogId: string, data: Partial<PetPayload>) => {
    const response = await api.put(`/dogs/${dogId}`, data);
    await publishActionEvent({
      module: "shelter",
      action: "update",
      title: "Animal Record Updated",
      message: `Profile details for animal ${data.name || dogId} updated.`,
      targetRoles: ["super_admin", "shelter_manager", "veterinarian"],
    });
    return response.data;
  },

  updatePetStatus: async (dogId: string, status: string) => {
    const response = await api.patch(`/dogs/${dogId}/status`, { status });
    await publishActionEvent({
      module: "shelter",
      action: "update",
      title: "Animal Status Changed",
      message: `Status for animal ${dogId} changed to ${status}.`,
      targetRoles: [
        "super_admin",
        "shelter_manager",
        "veterinarian",
        "adoption_coordinator",
      ],
    });
    return response.data;
  },

  deletePet: async (dogId: string) => {
    const response = await api.delete(`/dogs/${dogId}`);
    await publishActionEvent({
      module: "shelter",
      action: "delete",
      title: "Animal Record Archived",
      message: `Animal record ${dogId} archived from active shelter count.`,
      targetRoles: ["super_admin", "shelter_manager"],
    });
    return response.data;
  },
};

export default petService;
