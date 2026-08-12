import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface PetPayload {
  id?: string;
  name: string;
  breed?: string;
  breed_classification?: string;
  gender?: string;
  estimated_age?: string;
  age_months?: number;
  weight?: number;
  color?: string;
  temperament?: string;
  is_spayed_neutered?: boolean;
  is_adoptable?: boolean;
  is_quarantine_passed?: boolean;
  status?: string;
  [key: string]: unknown;
}

export const petService = {
  // GET /dogs (Exact OpenAPI endpoint)
  getPets: async (params?: Record<string, unknown>) => {
    const response = await api.get("/dogs", { params });
    return response.data;
  },

  getPetById: async (dogId: string) => {
    const response = await api.get(`/dogs/${dogId}`);
    return response.data;
  },

  createPet: async (data: Record<string, unknown>) => {
    const response = await api.post("/dogs", data);
    await publishActionEvent({
      module: "shelter",
      action: "create",
      title: "New Dog Intake Registered",
      message: `Dog ${data.name || ""} (${data.breed || "Dog"}) registered in facility database.`,
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

  updatePet: async (dogId: string, data: Record<string, unknown>) => {
    const response = await api.put(`/dogs/${dogId}`, data);
    await publishActionEvent({
      module: "shelter",
      action: "update",
      title: "Dog Record Updated",
      message: `Profile details for dog ${data.name || dogId} updated.`,
      targetRoles: ["super_admin", "shelter_manager", "veterinarian"],
    });
    return response.data;
  },

  updatePetStatus: async (dogId: string, status: string) => {
    const response = await api.patch(`/dogs/${dogId}/status`, { status });
    await publishActionEvent({
      module: "shelter",
      action: "update",
      title: "Dog Status Changed",
      message: `Status for dog ${dogId} changed to ${status}.`,
      targetRoles: [
        "super_admin",
        "shelter_manager",
        "veterinarian",
        "adoption_coordinator",
      ],
    });
    return response.data;
  },

  markDogAdoptable: async (dogId: string) => {
    const response = await api.put(`/dogs/${dogId}`, { is_adoptable: true });
    await publishActionEvent({
      module: "shelter",
      action: "update",
      title: "Dog Marked Ready for Adoption",
      message: `Dog ${dogId} cleared for adoption listing.`,
      targetRoles: [
        "super_admin",
        "shelter_manager",
        "adoption_coordinator",
        "rescue_centre_admin",
      ],
    });
    return response.data;
  },

  deletePet: async (dogId: string) => {
    const response = await api.delete(`/dogs/${dogId}`);
    await publishActionEvent({
      module: "shelter",
      action: "delete",
      title: "Dog Record Archived",
      message: `Dog record ${dogId} archived from active shelter count.`,
      targetRoles: ["super_admin", "shelter_manager"],
    });
    return response.data;
  },

  // GET /dogs/{dog_id}/qr-image - staff-only dog profile QR image (image blob).
  // Dynamically passes the production-safe frontend origin to ensure the QR code
  // builds valid public scan URLs without relying on server-side environment overrides.
  getDogQrImage: async (dogId: string): Promise<Blob> => {
    const frontendBaseUrl =
      (import.meta.env.VITE_FRONTEND_BASE_URL as string) ||
      (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://pawguard-admin.vercel.app");

    const response = await api.get(`/dogs/${dogId}/qr-image`, {
      params: {
        frontend_url: frontendBaseUrl,
        frontend_base_url: frontendBaseUrl,
      },
      headers: {
        "X-Frontend-Base-Url": frontendBaseUrl,
        "X-Frontend-Url": frontendBaseUrl,
      },
      responseType: "blob",
    });
    if (!(response.data instanceof Blob)) {
      throw new Error("QR endpoint did not return a valid image.");
    }
    return response.data;
  },

  // GET /dogs/{dog_id}/public-scan - privacy-safe public dog QR scan
  getPublicDogScan: async (dogId: string) => {
    const response = await api.get(`/dogs/${dogId}/public-scan`);
    return response.data;
  },

  /**
   * Returns the exact, unaltered backend-authoritative safety token for a dog record.
   * Priority: dog.raw_token -> dog.registration_number -> dog.id
   */
  formatSafetyToken: (dog?: { id?: string; registration_number?: string; raw_token?: string } | null): string => {
    if (!dog) return "-";
    if (dog.raw_token && typeof dog.raw_token === "string" && dog.raw_token.trim()) {
      return dog.raw_token.trim().toUpperCase();
    }
    if (dog.registration_number && typeof dog.registration_number === "string" && dog.registration_number.trim() && dog.registration_number !== "-") {
      return dog.registration_number.trim().toUpperCase();
    }
    if (dog.id && typeof dog.id === "string" && dog.id.trim()) {
      return dog.id.trim();
    }
    return "-";
  },
};

export default petService;
