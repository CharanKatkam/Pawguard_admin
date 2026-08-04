import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface ShelterFacilityPayload {
  id?: string;
  name: string;
  location?: string;
  capacity?: number;
  manager_id?: string;
  [key: string]: unknown;
}

export interface SectionPayload {
  id?: string;
  name: string;
  description?: string;
  capacity?: number;
  [key: string]: unknown;
}

export interface KennelPayload {
  id?: string;
  kennel_number: string;
  size?: string;
  is_occupied?: boolean;
  sanitation_status?: string;
  [key: string]: unknown;
}

export const shelterService = {
  // GET /shelter/facilities
  getShelters: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/shelter/facilities", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  // POST /shelter/facilities
  createShelter: async (data: ShelterFacilityPayload) => {
    const response = await api.post("/shelter/facilities", data);
    await publishActionEvent({
      module: "shelter",
      action: "create",
      title: "New Shelter Facility Added",
      message: `Facility ${data.name} created with capacity ${data.capacity || 50}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "shelter_manager"],
    });
    return response.data;
  },

  // GET /shelter/facilities/{facility_id}
  getShelterById: async (facilityId: string) => {
    const response = await api.get(`/shelter/facilities/${facilityId}`);
    return response.data;
  },

  // POST /shelter/facilities/{facility_id}/sections
  createFacilitySection: async (facilityId: string, data: SectionPayload) => {
    const response = await api.post(`/shelter/facilities/${facilityId}/sections`, data);
    return response.data;
  },

  // GET /shelter/facilities/{facility_id}/sections
  getFacilitySections: async (facilityId: string) => {
    try {
      const response = await api.get(`/shelter/facilities/${facilityId}/sections`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  // POST /shelter/sections/{section_id}/kennels
  createSectionKennel: async (sectionId: string, data: KennelPayload) => {
    const response = await api.post(`/shelter/sections/${sectionId}/kennels`, data);
    return response.data;
  },

  // GET /shelter/sections/{section_id}/kennels
  getSectionKennels: async (sectionId: string) => {
    try {
      const response = await api.get(`/shelter/sections/${sectionId}/kennels`);
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },

  // POST /shelter/kennels/{kennel_id}/assign/{dog_id}
  assignDogToKennel: async (kennelId: string, dogId: string, data?: Record<string, unknown>) => {
    const response = await api.post(`/shelter/kennels/${kennelId}/assign/${dogId}`, data);
    return response.data;
  },

  // PUT /shelter/kennels/{kennel_id}/sanitation
  updateKennelSanitation: async (kennelId: string, data: { sanitation_status?: string; status?: string; [key: string]: unknown }) => {
    const response = await api.put(`/shelter/kennels/${kennelId}/sanitation`, data);
    return response.data;
  },
};

export default shelterService;