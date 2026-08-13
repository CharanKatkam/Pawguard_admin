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

/** Send applicant notification via live backend API if adopter_id exists */
export const notifyApplicant = async (
  adopterId?: string | null,
  title?: string,
  body?: string
): Promise<void> => {
  if (!title || !body) return;
  try {
    if (adopterId && UUID_RE.test(adopterId)) {
      await api.post("/notifications/send", {
        user_id: adopterId,
        title,
        body,
        notification_type: "adoption_update",
        action_url: "/adoptions",
        send_email: false,
      });
    } else {
      await api.post("/notifications/send", {
        title,
        body,
        notification_type: "adoption_update",
        action_url: "/adoptions",
        send_email: false,
        target_roles: ["super_admin", "adoption_coordinator"],
      });
    }
  } catch {
    // Notification failure should not break workflow action
  }
};

/** Normalize a raw AdoptionApplicationResponse into the page row shape. */
export const normalizeAdoptionRow = (record: Record<string, unknown>): Record<string, unknown> => {
  const dog = (record.dog as Record<string, unknown> | undefined) || (record.animal as Record<string, unknown> | undefined) || {};
  const adopter = (record.adopter as Record<string, unknown> | undefined) || {};
  return {
    id: record.id,
    applicationId: record.id,
    ticketNumber: record.ticket_number || record.id,
    dog_id: record.dog_id,
    adopter_id: record.adopter_id || adopter.id,
    applicantName:
      adopter.full_name ||
      adopter.name ||
      record.adopter_name ||
      record.applicant_name ||
      record.reporter_name ||
      "—",
    applicantEmail: adopter.email || record.adopter_email || "—",
    applicantPhone: adopter.phone || record.adopter_phone || "—",
    petName: dog.name || record.dog_name || "—",
    petBreed: dog.breed || "Canine",
    petId: record.dog_id,
    date: record.created_at || record.submitted_at || "-",
    status: record.status || "submitted",
    residential_status: record.residential_status || "—",
    household_members_count: record.household_members_count ?? 1,
    has_yard_fence: record.has_yard_fence ?? false,
    has_landlord_approval: record.has_landlord_approval ?? false,
    pet_care_experience: record.pet_care_experience || "—",
    existing_pets_medical_details: record.existing_pets_medical_details || "—",
    vetting_officer_notes: record.vetting_officer_notes || "—",
    home_inspection_scheduled_at: record.home_inspection_scheduled_at || null,
    home_inspection_notes: record.home_inspection_notes || "—",
    adoption_agreement_url: record.adoption_agreement_url || null,
    fee_amount: record.fee_amount || null,
    completed_at: record.completed_at || null,
    created_at: record.created_at || "-",
    updated_at: record.updated_at || "-",
    dog,
    adopter,
  };
};

/** Unwrap a paginated/wrapped list response into a plain array. */
export const unwrapAdoptions = (body: unknown): Record<string, unknown>[] => {
  if (!body || typeof body !== "object") return [];
  const obj = body as Record<string, unknown>;
  const data = Array.isArray(body) ? body : obj.data;
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map(normalizeAdoptionRow);
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
    const raw = (response.data as { data?: Record<string, unknown> })?.data ?? response.data;
    return normalizeAdoptionRow(raw as Record<string, unknown>);
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
      (data.petName as string) || "Rescue Dog",
      false
    );
    return response.data;
  },

  // PATCH /adoptions/{app_id}/status - update application status
  updateAdoptionStatus: async (
    id: string,
    status: string,
    adopterId?: string | null,
    petName?: string
  ) => {
    const backendStatus = toAdoptionStatus(status);
    const response = await api.patch(`/adoptions/${id}/status`, {
      status: backendStatus,
    });
    
    // Applicant notification
    const petLabel = petName || "your selected pet";
    let notifTitle = "Adoption Application Update";
    let notifBody = `Your adoption application status has been updated to: ${backendStatus}.`;

    if (backendStatus === "approved") {
      notifTitle = "Adoption Application Approved!";
      notifBody = `Great news! Your adoption application for ${petLabel} has been approved!`;
    } else if (backendStatus === "rejected") {
      notifTitle = "Adoption Application Update";
      notifBody = `Your adoption application for ${petLabel} has been reviewed and rejected.`;
    } else if (backendStatus === "completed") {
      notifTitle = "Adoption Process Completed!";
      notifBody = `Congratulations! Your adoption of ${petLabel} has been finalized and completed.`;
    } else if (backendStatus === "home_check") {
      notifTitle = "Home Verification Requested";
      notifBody = `Your adoption application for ${petLabel} has moved to the home inspection stage.`;
    } else if (backendStatus === "screening" || backendStatus === "interview") {
      notifTitle = "Application In Review";
      notifBody = `Your adoption application for ${petLabel} is currently under ${backendStatus} review.`;
    }

    await notifyApplicant(adopterId, notifTitle, notifBody);

    await triggerAdoptionWorkflow(
      "Decision",
      "Applicant",
      `Dog #${id}`,
      backendStatus === "approved" || backendStatus === "completed"
    );
    return response.data;
  },

  // PUT /adoptions/{app_id} - update full application (notes, inspection date, status)
  updateAdoptionDetails: async (id: string, payload: Record<string, unknown>) => {
    const response = await api.put(`/adoptions/${id}`, payload);
    return response.data;
  },

  // PUT /adoptions/{app_id} - schedule home inspection / record vetting notes
  scheduleHomeInspection: async (
    id: string,
    scheduledAt: string,
    notes?: string,
    adopterId?: string | null,
    petName?: string
  ) => {
    const payload: Record<string, unknown> = {
      status: "home_check",
    };
    if (scheduledAt) {
      const iso = new Date(scheduledAt).toISOString();
      payload.home_inspection_scheduled_at = iso;
    }
    if (notes) {
      payload.home_inspection_notes = notes;
      payload.vetting_officer_notes = notes;
    }
    const response = await api.put(`/adoptions/${id}`, payload);
    
    const formattedDate = scheduledAt
      ? new Date(scheduledAt).toLocaleString()
      : "the scheduled date";
    await notifyApplicant(
      adopterId,
      "Home Inspection Visit Scheduled",
      `A home verification visit has been scheduled for your adoption application for ${petName || "your selected pet"} on ${formattedDate}.`
    );

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

