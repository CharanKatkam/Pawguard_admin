import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export type FacilityType = "shelter" | "clinic" | "foster_home" | "partner";
export type FacilityStatus = "active" | "inactive" | "maintenance";
export type SectionType =
  | "quarantine"
  | "isolation"
  | "surgical"
  | "puppy"
  | "general"
  | "adoption";

export interface ShelterFacilityPayload {
  name: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  total_capacity?: number;
  facility_type?: FacilityType;
}

export interface SectionPayload {
  name: string;
  section_type?: SectionType;
  capacity?: number;
}

export interface KennelPayload {
  identifier: string;
  capacity?: number;
}

export const shelterService = {
  // GET /shelter/facilities (paginated)
  getShelters: async (params?: Record<string, unknown>) => {
    const response = await api.get("/shelter/facilities", { params });
    return response.data;
  },

  // POST /shelter/facilities - ShelterFacilityCreate { name, address, phone, ... }
  createShelter: async (data: ShelterFacilityPayload) => {
    const response = await api.post("/shelter/facilities", data);
    await publishActionEvent({
      module: "shelter",
      action: "create",
      title: "New Shelter Facility Added",
      message: `Facility ${data.name} registered with capacity ${data.total_capacity ?? "unspecified"}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "shelter_manager"],
    });
    return response.data;
  },

  // GET /shelter/facilities/{facility_id}
  getShelterById: async (facilityId: string) => {
    const response = await api.get(`/shelter/facilities/${facilityId}`);
    return response.data;
  },

  // PUT /shelter/facilities/{facility_id} - ShelterFacilityUpdate
  updateFacility: async (facilityId: string, data: Partial<ShelterFacilityPayload> & { status?: FacilityStatus }) => {
    const response = await api.put(`/shelter/facilities/${facilityId}`, data);
    await publishActionEvent({
      module: "shelter",
      action: "update",
      title: "Shelter Facility Updated",
      message: `Facility ${data.name || facilityId} details updated.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "shelter_manager"],
    });
    return response.data;
  },

  // DELETE /shelter/facilities/{facility_id}
  deleteFacility: async (facilityId: string) => {
    const response = await api.delete(`/shelter/facilities/${facilityId}`);
    await publishActionEvent({
      module: "shelter",
      action: "delete",
      title: "Shelter Facility Removed",
      message: `Facility ${facilityId} deleted from the shelter directory.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "shelter_manager"],
    });
    return response.data;
  },

  // PUT /shelter/facilities/{facility_id}/status - FacilityStatusUpdate
  updateFacilityStatus: async (facilityId: string, status: FacilityStatus) => {
    const response = await api.put(`/shelter/facilities/${facilityId}/status`, { status });
    return response.data;
  },

  // POST /shelter/facilities/{facility_id}/sections - ShelterSectionCreate { name, section_type, capacity }
  createFacilitySection: async (facilityId: string, data: SectionPayload) => {
    const response = await api.post(`/shelter/facilities/${facilityId}/sections`, data);
    return response.data;
  },

  // GET /shelter/facilities/{facility_id}/sections
  getFacilitySections: async (facilityId: string) => {
    const response = await api.get(`/shelter/facilities/${facilityId}/sections`);
    return response.data;
  },

  // POST /shelter/sections/{section_id}/kennels - KennelCreate { identifier, capacity }
  createSectionKennel: async (sectionId: string, data: KennelPayload) => {
    const response = await api.post(`/shelter/sections/${sectionId}/kennels`, data);
    return response.data;
  },

  // GET /shelter/sections/{section_id}/kennels
  getSectionKennels: async (sectionId: string) => {
    const response = await api.get(`/shelter/sections/${sectionId}/kennels`);
    return response.data;
  },

  // POST /shelter/kennels/{kennel_id}/assign/{dog_id} (no body required)
  assignDogToKennel: async (kennelId: string, dogId: string) => {
    const response = await api.post(`/shelter/kennels/${kennelId}/assign/${dogId}`);
    return response.data;
  },

  // PUT /shelter/kennels/{kennel_id}/sanitation (no body required)
  updateKennelSanitation: async (kennelId: string) => {
    const response = await api.put(`/shelter/kennels/${kennelId}/sanitation`);
    return response.data;
  },
};

export default shelterService;
