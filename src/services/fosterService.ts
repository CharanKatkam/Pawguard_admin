import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface FosterPlacementPayload {
  dog_id: string;
  notes?: string;
}

export const fosterService = {
  // GET /fosters - list foster profiles (paginated FosterProfileResponse)
  getFosterProfiles: async (params?: Record<string, unknown>) => {
    const response = await api.get("/fosters", { params });
    return response.data;
  },

  // Backwards-compatible alias used by the executive dashboard
  getFosterPlacements: async (params?: Record<string, unknown>) => {
    const response = await api.get("/fosters", { params });
    return response.data;
  },

  // POST /fosters/apply - FosterProfileCreate { preferences, max_capacity, notes }
  apply: async (data: Record<string, unknown>) => {
    const response = await api.post("/fosters/apply", data);
    return response.data;
  },

  // POST /fosters/{profile_id}/placements - FosterPlacementCreate { dog_id, notes }
  placeDog: async (profileId: string, data: FosterPlacementPayload) => {
    const response = await api.post(`/fosters/${profileId}/placements`, data);
    await publishActionEvent({
      module: "foster",
      action: "create",
      title: "Dog Placed in Foster Care",
      message: `Dog ${data.dog_id} placed with foster profile ${profileId}.`,
      targetRoles: ["super_admin", "foster_coordinator", "shelter_manager", "rescue_centre_admin"],
    });
    return response.data;
  },

  // POST /fosters/placements/{placement_id}/return - FosterReturnRequest { notes }
  returnDog: async (placementId: string, notes?: string) => {
    const response = await api.post(`/fosters/placements/${placementId}/return`, {
      notes: notes || "",
    });
    return response.data;
  },

  // POST /fosters/placements/{placement_id}/progress - FosterProgressLogCreate
  logProgress: async (placementId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/fosters/placements/${placementId}/progress`, data);
    return response.data;
  },

  // PUT /fosters/{profile_id} - FosterProfileUpdate
  updateProfile: async (profileId: string, data: Record<string, unknown>) => {
    const response = await api.put(`/fosters/${profileId}`, data);
    return response.data;
  },

  // DELETE /fosters/{profile_id}
  deleteProfile: async (profileId: string) => {
    const response = await api.delete(`/fosters/${profileId}`);
    return response.data;
  },
};

export default fosterService;
