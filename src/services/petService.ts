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
  ear_shape?: string;
  tail_type?: string;
  is_spayed_neutered?: boolean;
  is_adoptable?: boolean;
  is_public_visible?: boolean;
  photo_url?: string;
  image_urls?: string[];
  photo_gallery_urls?: string[];
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

  // GET /dogs — fetch complete dataset across all pages for global KPI calculations
  getAllDogs: async (params?: Record<string, unknown>) => {
    const pageSize = 50;
    const collected: any[] = [];
    try {
      const firstRes = await api.get("/dogs", { params: { ...params, page: 1, page_size: pageSize } });
      const firstBody = firstRes.data;
      const firstList = Array.isArray(firstBody?.data) ? firstBody.data : Array.isArray(firstBody) ? firstBody : [];
      collected.push(...firstList);

      const totalRecords = firstBody?.meta?.total ?? firstBody?.data?.meta?.total ?? collected.length;
      const actualPageSize = firstBody?.meta?.page_size ?? (firstList.length > 0 ? firstList.length : pageSize);
      const totalPages = firstBody?.meta?.total_pages ?? Math.ceil(totalRecords / Math.max(1, actualPageSize));

      for (let p = 2; p <= totalPages; p++) {
        try {
          const pageRes = await api.get("/dogs", { params: { ...params, page: p, page_size: pageSize } });
          const pageBody = pageRes.data;
          const pageList = Array.isArray(pageBody?.data) ? pageBody.data : Array.isArray(pageBody) ? pageBody : [];
          collected.push(...pageList);
        } catch (pErr) {
          console.warn(`Failed to fetch page ${p} of dogs:`, pErr);
        }
      }

      return {
        success: true,
        data: collected,
        meta: { total: Math.max(totalRecords, collected.length) },
      };
    } catch (err) {
      console.warn("Failed to fetch all dogs in getAllDogs:", err);
      try {
        const fallbackRes = await api.get("/dogs", { params });
        return fallbackRes.data;
      } catch {
        return { success: false, data: [], meta: { total: 0 } };
      }
    }
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
    let responseData: any;
    try {
      const res = await api.put(`/dogs/${dogId}`, { is_adoptable: true });
      responseData = res.data;
    } catch {
      try {
        const res = await api.patch(`/dogs/${dogId}/status`, { is_adoptable: true, status: "shelter" });
        responseData = res.data;
      } catch {
        const res = await api.put(`/dogs/${dogId}`, { is_adoptable: true, status: "shelter" });
        responseData = res.data;
      }
    }

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
    return responseData;
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

  // POST /dogs/safety-tag/resolve - resolve a Dog Master Safety Tag token to canonical dog record
  resolveDogSafetyTag: async (token: string) => {
    const clean = String(token || "").trim();
    if (!clean) {
      throw new Error("Safety Tag token is required.");
    }
    const response = await api.post(`/dogs/safety-tag/resolve`, { raw_token: clean });
    return response.data;
  },

  // GET /dogs/{dog_id}/public-scan or POST /dogs/safety-tag/resolve - authoritative token & dog public scan
  getPublicDogScan: async (identifier: string) => {
    const clean = String(identifier || "").trim();
    if (!clean) {
      throw new Error("Safety Tag token or Dog identifier is required.");
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    // 1. If identifier is a valid UUID, query direct public-scan
    if (uuidRegex.test(clean)) {
      try {
        const response = await api.get(`/dogs/${clean}/public-scan`);
        return response.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const compRes = await api.get(`/companion-pets/${clean}/public-scan`);
          return compRes.data;
        }
        throw err;
      }
    }

    const upperToken = clean.toUpperCase();
    const isDogToken = upperToken.startsWith("DGD");
    const isCompanionToken = upperToken.startsWith("CMP") || upperToken.startsWith("PET");

    // 2. If token is explicitly a Dog Safety Tag token ("DGD...")
    if (isDogToken) {
      try {
        const resolveRes = await api.post(`/dogs/safety-tag/resolve`, { raw_token: clean });
        const resObj = resolveRes?.data || resolveRes;
        const dogObj = resObj?.dog || resObj;
        return {
          ...dogObj,
          id: resObj?.dog_id || dogObj?.id || resObj?.tag_id,
          dog_id: resObj?.dog_id || dogObj?.id || resObj?.tag_id,
          is_active: resObj?.is_active,
          token_prefix: resObj?.token_prefix,
          scan_count: resObj?.scan_count,
          last_scanned_at: resObj?.last_scanned_at,
        };
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message;
        if (status === 404) {
          throw new Error(`Dog Safety Tag token "${clean}" was not found in the PawGuard database.`);
        }
        throw new Error(apiMsg || `Failed to resolve Dog Safety Tag token "${clean}".`);
      }
    }

    // 3. If token is explicitly a Companion Pet Safety Tag token ("CMP..." / "PET...")
    if (isCompanionToken) {
      try {
        const scanRes = await api.post(`/companion-pets/safety-tag/scan`, { token: clean });
        return scanRes.data;
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMsg =
          err?.response?.data?.error?.message ||
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message;
        if (status === 404) {
          throw new Error(`Companion Pet Safety Tag token "${clean}" was not found in the PawGuard database.`);
        }
        throw new Error(apiMsg || `Failed to scan Companion Pet Safety Tag token "${clean}".`);
      }
    }

    // 4. For generic/unprefixed tokens: try Dog resolver first, fall through to Companion scanner ONLY on 404
    try {
      const resolveRes = await api.post(`/dogs/safety-tag/resolve`, { raw_token: clean });
      const resObj = resolveRes?.data || resolveRes;
      const dogObj = resObj?.dog || resObj;
      if (resObj && (resObj.dog_id || dogObj.id || dogObj.name)) {
        return {
          ...dogObj,
          id: resObj?.dog_id || dogObj?.id || resObj?.tag_id,
          dog_id: resObj?.dog_id || dogObj?.id || resObj?.tag_id,
          is_active: resObj?.is_active,
          token_prefix: resObj?.token_prefix,
          scan_count: resObj?.scan_count,
          last_scanned_at: resObj?.last_scanned_at,
        };
      }
    } catch (dogErr: any) {
      const status = dogErr?.response?.status;
      if (status !== 404) {
        const apiMsg =
          dogErr?.response?.data?.error?.message ||
          dogErr?.response?.data?.detail ||
          dogErr?.response?.data?.message ||
          dogErr?.message;
        throw new Error(apiMsg || `Failed to resolve Safety Tag token "${clean}".`);
      }
    }

    // Attempt Companion Pet scan on 404 fallback for generic token
    try {
      const scanRes = await api.post(`/companion-pets/safety-tag/scan`, { token: clean });
      if (scanRes.data) {
        return scanRes.data;
      }
    } catch (compErr: any) {
      const apiMsg =
        compErr?.response?.data?.error?.message ||
        compErr?.response?.data?.detail ||
        compErr?.response?.data?.message ||
        compErr?.message;
      throw new Error(apiMsg || `Safety Tag token "${clean}" could not be verified or is invalid.`);
    }

    throw new Error(`Safety Tag token "${clean}" could not be verified or is invalid.`);
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

  // =========================================================================
  // COMPANION PET SAFETY TAG ENDPOINTS
  // =========================================================================

  // POST /companion-pets/{pet_id}/safety-tag - provision/generate Safety Tag for a Companion Pet
  provisionCompanionPetSafetyTag: async (petId: string, forceReissue = false) => {
    const cleanId = String(petId || "").trim();
    if (!cleanId) throw new Error("Companion Pet ID is required for Safety Tag provisioning.");
    const url = forceReissue
      ? `/companion-pets/${cleanId}/safety-tag?force_reissue=true`
      : `/companion-pets/${cleanId}/safety-tag`;
    const response = await api.post(url);
    return response.data;
  },

  // GET /companion-pets/{pet_id}/safety-tag - get Safety Tag metadata for a Companion Pet
  getCompanionPetSafetyTagMetadata: async (petId: string) => {
    const cleanId = String(petId || "").trim();
    if (!cleanId) throw new Error("Companion Pet ID is required.");
    const response = await api.get(`/companion-pets/${cleanId}/safety-tag`);
    return response.data;
  },

  // DELETE /companion-pets/{pet_id}/safety-tag - revoke Safety Tag for a Companion Pet
  revokeCompanionPetSafetyTag: async (petId: string) => {
    const cleanId = String(petId || "").trim();
    if (!cleanId) throw new Error("Companion Pet ID is required.");
    const response = await api.delete(`/companion-pets/${cleanId}/safety-tag`);
    return response.data;
  },

  // GET /companion-pets/{pet_id}/public-scan - public scan by Companion Pet ID
  getCompanionPetPublicScan: async (petId: string) => {
    const cleanId = String(petId || "").trim();
    if (!cleanId) throw new Error("Companion Pet ID is required.");
    const response = await api.get(`/companion-pets/${cleanId}/public-scan`);
    return response.data;
  },

  // POST /companion-pets/safety-tag/scan - public scan by Companion Pet Safety Tag Token
  scanCompanionPetSafetyTag: async (token: string) => {
    const clean = String(token || "").trim();
    if (!clean) throw new Error("Safety Tag token is required.");
    const response = await api.post(`/companion-pets/safety-tag/scan`, { token: clean });
    return response.data;
  },
};

export default petService;

