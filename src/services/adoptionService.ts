import api from "../api/axios";
import { triggerAdoptionWorkflow } from "../utils/eventSystem";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Map a friendly status label into the backend AdoptionStatus enum
 * (submitted | screening | interview | home_check | approved | completed | rejected | vetting).
 */
export const toAdoptionStatus = (status: string): string => {
  const s = String(status || "").toLowerCase().trim();
  const map: Record<string, string> = {
    approved: "approved",
    rejected: "rejected",
    completed: "completed",
    home_check: "home_check",
    screening: "screening",
    interview: "interview",
    submitted: "submitted",
    vetting: "vetting",
    pending: "submitted",
    processing: "screening",
    "in review": "screening",
  };
  return map[s] || s;
};

/** Normalize a raw AdoptionApplicationResponse into the page row shape. */
export const normalizeAdoptionRow = (record: any): any => {
  const dog = record.dog || record.animal || {};
  const adopter = record.adopter || {};
  return {
    id: record.id,
    applicationId: record.id,
    ticketNumber: record.ticket_number,
    applicantName:
      adopter.full_name ||
      adopter.name ||
      record.adopter_name ||
      record.applicant_name ||
      record.reporter_name ||
      "—",
    applicantEmail: adopter.email || record.adopter_email,
    petName: dog.name || record.dog_name || "—",
    petId: record.dog_id,
    date: record.created_at || record.submitted_at,
    status: record.status || "submitted",
    residential_status: record.residential_status,
    household_members_count: record.household_members_count,
    has_yard_fence: record.has_yard_fence,
    has_landlord_approval: record.has_landlord_approval,
    pet_care_experience: record.pet_care_experience,
    existing_pets_medical_details: record.existing_pets_medical_details,
    vetting_officer_notes: record.vetting_officer_notes,
    home_inspection_scheduled_at: record.home_inspection_scheduled_at,
    home_inspection_notes: record.home_inspection_notes,
  };
};

/** Unwrap a paginated/wrapped list response into a plain array. */
export const unwrapAdoptions = (body: unknown): any[] => {
  if (!body || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;
  const data = Array.isArray(body) ? body : obj.data;
  if (!Array.isArray(data)) return [];
  return data.map(normalizeAdoptionRow);
};

export const adoptionService = {
  // GET /dashboards/adoption - executive adoption metric endpoint
  getAdoptionDashboard: async () => {
    const response = await api.get("/dashboards/adoption");
    return response.data;
  },

  // GET /adoptions - list adoption applications (paginated)
  getAdoptions: async (params?: Record<string, unknown>) => {
    const response = await api.get("/adoptions", { params });
    return { ...response.data, data: unwrapAdoptions(response.data) };
  },

  // GET /adoptions/{app_id}
  getAdoptionById: async (id: string) => {
    const response = await api.get(`/adoptions/${id}`);
    return normalizeAdoptionRow(response.data?.data ?? response.data);
  },

  // POST /adoptions - AdoptionApplicationCreate { dog_id (uuid), residential_status, ... }
  createAdoption: async (data: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {};

    if (typeof data.dog_id === "string" && UUID_RE.test(data.dog_id)) {
      payload.dog_id = data.dog_id;
    } else if (typeof data.petId === "string" && UUID_RE.test(data.petId)) {
      payload.dog_id = data.petId;
    }

    const residentialStatus =
      data.residential_status || data.residentialStatus || "owned";
    payload.residential_status = String(residentialStatus);

    for (const key of [
      "has_landlord_approval",
      "has_yard_fence",
      "household_members_count",
      "existing_pets_medical_details",
      "pet_care_experience",
    ]) {
      if (data[key] !== undefined) payload[key] = data[key];
    }

    if (!payload.dog_id) {
      throw new Error(
        "A valid dog (dog_id) is required to submit an adoption application."
      );
    }

    const response = await api.post("/adoptions", payload);
    await triggerAdoptionWorkflow(
      "Submitted",
      (data.applicantName as string) || "Adopter",
      (data.petName as string) || "Rescue Animal",
      false
    );
    return response.data;
  },

  // PATCH /adoptions/{app_id}/status - update application status
  updateAdoptionStatus: async (id: string, status: string) => {
    const response = await api.patch(`/adoptions/${id}/status`, {
      status: toAdoptionStatus(status),
    });
    await triggerAdoptionWorkflow(
      "Decision",
      "Applicant",
      `Animal #${id}`,
      toAdoptionStatus(status) === "approved"
    );
    return response.data;
  },

  // PUT /adoptions/{app_id} - schedule home inspection / record vetting notes
  scheduleHomeInspection: async (
    id: string,
    scheduledAt: string,
    notes?: string
  ) => {
    const payload: Record<string, unknown> = {};
    if (scheduledAt) {
      const iso = new Date(scheduledAt).toISOString();
      payload.home_inspection_scheduled_at = iso;
    }
    if (notes) payload.vetting_officer_notes = notes;
    const response = await api.put(`/adoptions/${id}`, payload);
    await triggerAdoptionWorkflow(
      "Home Inspection Scheduled",
      "Applicant",
      `Application #${id}`,
      false
    );
    return response.data;
  },

  // DELETE /adoptions/{app_id}
  deleteAdoption: async (id: string) => {
    const response = await api.delete(`/adoptions/${id}`);
    return response.data;
  },
};

export default adoptionService;
