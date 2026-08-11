import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export type Species = "dog";
export type ReportStatus = "active" | "resolved" | "expired";
export type MatchStatus = "pending" | "confirmed" | "rejected";
export type ReportKind = "lost" | "found";

export interface ReporterProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  profile_picture_url?: string | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

export interface LostReport {
  id: string;
  user_id: string;
  species: Species;
  pet_name: string;
  breed: string;
  color: string;
  microchip_id?: string | null;
  collar_color?: string | null;
  collar_description?: string | null;
  marker_description?: string | null;
  location_address: string;
  latitude?: number | null;
  longitude?: number | null;
  lost_at: string;
  status: ReportStatus;
  photo_url?: string | null;
  created_at: string;
  user?: ReporterProfile | null;
}

export interface FoundReport {
  id: string;
  user_id: string;
  species: Species;
  breed_observed: string;
  color_observed: string;
  collar_color?: string | null;
  collar_description?: string | null;
  marker_description?: string | null;
  location_address: string;
  latitude?: number | null;
  longitude?: number | null;
  found_at: string;
  status: ReportStatus;
  photo_url?: string | null;
  created_at: string;
  user?: ReporterProfile | null;
}

export interface LostFoundMatch {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  confidence_score: number;
  status: MatchStatus;
  microchip_doc_url?: string | null;
  vet_bill_url?: string | null;
  photo_proof_url?: string | null;
  verification_notes?: string | null;
  claim_submitted_at?: string | null;
  claim_reviewed_at?: string | null;
  claim_reviewed_by?: string | null;
  created_at: string;
  distance_km?: number | null;
  temporal_gap_days?: number | null;
  match_reasons?: string[];
  lost_report?: LostReport | null;
  found_report?: FoundReport | null;
  [key: string]: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ListReportParams {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface LostReportCreateData {
  species?: Species;
  pet_name: string;
  breed: string;
  color: string;
  microchip_id?: string | null;
  collar_color?: string | null;
  collar_description?: string | null;
  marker_description?: string | null;
  location_address: string;
  latitude?: number | null;
  longitude?: number | null;
  lost_at: string;
  photo_url?: string | null;
}

export interface FoundReportCreateData {
  species?: Species;
  breed_observed: string;
  color_observed: string;
  collar_color?: string | null;
  collar_description?: string | null;
  marker_description?: string | null;
  location_address: string;
  latitude?: number | null;
  longitude?: number | null;
  found_at: string;
  photo_url?: string | null;
}

export interface OwnershipClaimSubmitData {
  microchip_doc_url?: string | null;
  vet_bill_url?: string | null;
  photo_proof_url?: string | null;
  verification_notes?: string | null;
}

export interface OwnershipClaimReviewData {
  approve: boolean;
  verification_notes?: string | null;
}

const extractList = <T>(response: unknown): PaginatedResponse<T> => {
  const res = response as { success?: boolean; data?: unknown; meta?: Partial<PaginationMeta> };
  const data = Array.isArray(res?.data) ? (res.data as T[]) : [];
  const meta = res?.meta
    ? {
        total: typeof res.meta.total === "number" ? res.meta.total : data.length,
        page: typeof res.meta.page === "number" ? res.meta.page : 1,
        page_size: typeof res.meta.page_size === "number" ? res.meta.page_size : data.length,
        total_pages: typeof res.meta.total_pages === "number" ? res.meta.total_pages : 1,
      }
    : { total: data.length, page: 1, page_size: data.length, total_pages: 1 };
  return { success: Boolean(res?.success), data, meta };
};

/**
 * Lost & Found API client aligned with the live backend OpenAPI schema.
 * Endpoints:
 *   GET  /lost-found/lost | /lost-found/found
 *   POST /lost-found/lost | /lost-found/found
 *   DELETE /lost-found/lost/{id} | /lost-found/found/{id}
 *   GET  /lost-found/lost/{id}/matches | /lost-found/found/{id}/matches
 *   POST /lost-found/matches/{match_id}/claim
 *   POST /lost-found/matches/{match_id}/claim/review
 *   POST /lost-found/matches/{match_id}/resolve
 *   POST /lost-found/lost/{id}/broadcast
 *
 * NOTE: There is NO PUT endpoint for lost/found reports in the current schema,
 * so updating a report is intentionally not supported. The old updateReport call
 * was removed instead of being replaced with a guessed endpoint.
 */
export const lostFoundService = {
  getLostReports: async (params?: ListReportParams): Promise<PaginatedResponse<LostReport>> => {
    // PawGuard is dog-only: always ask the backend for Dog records so any
    // non-dog reports that exist are never surfaced.
    const response = await api.get("/lost-found/lost", { params: { ...params, species: "dog" } });
    return extractList<LostReport>(response.data);
  },

  getFoundReports: async (params?: ListReportParams): Promise<PaginatedResponse<FoundReport>> => {
    const response = await api.get("/lost-found/found", { params: { ...params, species: "dog" } });
    return extractList<FoundReport>(response.data);
  },

  getReportMatches: async (reportId: string, kind: ReportKind = "lost"): Promise<PaginatedResponse<LostFoundMatch>> => {
    const endpoint = kind === "found" ? `/lost-found/found/${reportId}/matches` : `/lost-found/lost/${reportId}/matches`;
    const response = await api.get(endpoint);
    return extractList<LostFoundMatch>(response.data);
  },

  createLostReport: async (data: LostReportCreateData) => {
    const response = await api.post("/lost-found/lost", data);
    return response.data;
  },

  createFoundReport: async (data: FoundReportCreateData) => {
    const response = await api.post("/lost-found/found", data);
    return response.data;
  },

  deleteReport: async (id: string, kind: ReportKind = "lost") => {
    const endpoint = kind === "found" ? `/lost-found/found/${id}` : `/lost-found/lost/${id}`;
    const response = await api.delete(endpoint);
    return response.data;
  },

  submitClaim: async (matchId: string, data: OwnershipClaimSubmitData) => {
    const response = await api.post(`/lost-found/matches/${matchId}/claim`, data);
    return response.data;
  },

  reviewClaim: async (matchId: string, data: OwnershipClaimReviewData) => {
    const response = await api.post(`/lost-found/matches/${matchId}/claim/review`, data);
    return response.data;
  },

  resolveMatch: async (matchId: string, approve: boolean = true) => {
    // The OpenAPI schema declares `approve` as a REQUIRED query parameter on
    // POST /lost-found/matches/{match_id}/resolve. Omitting it returns 422.
    const response = await api.post(`/lost-found/matches/${matchId}/resolve`, null, {
      params: { approve },
    });
    return response.data;
  },

  broadcastLostPetAlert: async (reportId: string) => {
    const response = await api.post(`/lost-found/lost/${reportId}/broadcast`);
    await publishActionEvent({
      module: "lost_found",
      action: "create",
      title: "Lost Pet Alert Broadcast",
      message: `Lost pet alert ${reportId} broadcast across community channels.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "shelter_manager", "adoption_coordinator"],
    });
    return response.data;
  },
};

export default lostFoundService;