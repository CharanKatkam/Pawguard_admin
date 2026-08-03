import api from "../api/axios";

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
    const response = await api.get("/shelter/facilities", { params });
    return response.data;
  },

  // POST /shelter/facilities
  createShelter: async (data: ShelterFacilityPayload) => {
    const response = await api.post("/shelter/facilities", data);
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
    const response = await api.get(`/shelter/facilities/${facilityId}/sections`);
    return response.data;
  },

  // POST /shelter/sections/{section_id}/kennels
  createSectionKennel: async (sectionId: string, data: KennelPayload) => {
    const response = await api.post(`/shelter/sections/${sectionId}/kennels`, data);
    return response.data;
  },

  // GET /shelter/sections/{section_id}/kennels
  getSectionKennels: async (sectionId: string) => {
    const response = await api.get(`/shelter/sections/${sectionId}/kennels`);
    return response.data;
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