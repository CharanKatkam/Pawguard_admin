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

  /**
   * @deprecated Legacy backend QR image endpoint. PawGuard now uses client-side QR generation
   * encoding the authoritative raw_token returned from POST /dogs/{dog_id}/safety-tag.
   */
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

  // GET /dogs/{dog_id}/safety-tag - authenticated Safety Tag metadata for Dog Master record
  getSafetyTagMetadata: async (dogId: string) => {
    const response = await api.get(`/dogs/${dogId}/safety-tag`);
    return response.data;
  },

  // POST /dogs/{dog_id}/safety-tag - provision/generate a new permanent Safety Tag for a Dog Master record
  // Pass forceReissue=true to force re-issuance (POST /dogs/{dog_id}/safety-tag?force_reissue=true)
  provisionSafetyTag: async (dogId: string, forceReissue = false) => {
    const url = forceReissue ? `/dogs/${dogId}/safety-tag?force_reissue=true` : `/dogs/${dogId}/safety-tag`;
    const response = await api.post(url);
    return response.data;
  },

  // DELETE /dogs/{dog_id}/safety-tag - revoke/deactivate a Dog Master record's Safety Tag
  revokeSafetyTag: async (dogId: string) => {
    const response = await api.delete(`/dogs/${dogId}/safety-tag`);
    return response.data;
  },

  // POST /companion-pets/safety-tag/scan - public scan endpoint
  scanSafetyTag: async (token: string) => {
    const response = await api.post(`/companion-pets/safety-tag/scan`, { token });
    return response.data;
  },

  // GET /dogs/{dog_id}/public-scan - privacy-safe public dog QR scan
  getPublicDogScan: async (identifier: string) => {
    let clean = String(identifier || "").trim();
    if (!clean) {
      throw new Error("Dog identifier is required");
    }
    if (clean.toUpperCase().startsWith("PG-")) {
      clean = clean.slice(3).trim();
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    let targetDogId = clean;

    if (!uuidRegex.test(clean)) {
      try {
        const listRes = await api.get("/dogs", { params: { registration_number: clean } });
        const items = listRes.data?.data || listRes.data?.items || (Array.isArray(listRes.data) ? listRes.data : []);
        if (items.length > 0 && items[0]?.id) {
          targetDogId = items[0].id;
        }
      } catch {
        /* fall back to direct call */
      }
    }

    const response = await api.get(`/dogs/${targetDogId}/public-scan`);
    return response.data;
  },

  /**
   * Returns the exact, unaltered backend-authoritative safety token for a dog record.
   * Strictly returns raw_token if available, otherwise "-". Never substitutes registration_number or dog.id as a token.
   */
  formatSafetyToken: (dog?: { id?: string; registration_number?: string; raw_token?: string } | null): string => {
    if (!dog) return "-";
    if (dog.raw_token && typeof dog.raw_token === "string" && dog.raw_token.trim()) {
      return dog.raw_token.trim().toUpperCase();
    }
    return "-";
  },
};

export default petService;

