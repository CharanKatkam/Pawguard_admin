import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

type Row = Record<string, unknown>;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const unwrapList = (res: unknown): Row[] => {
  const body = asRecord(res).data;
  if (Array.isArray(body)) return body as Row[];
  const inner = asRecord(body).data;
  return Array.isArray(inner) ? (inner as Row[]) : [];
};

const unwrapData = (res: unknown): Row => asRecord(asRecord(res).data);

const REMINDER_TARGET_ROLES = [
  "super_admin",
  "rescue_centre_admin",
  "veterinarian",
  "shelter_manager",
] as const;

export const reminderService = {
  // GET /medical/vaccinations?dog_id=... - vaccination records including next_due_at
  getVaccinations: async (params?: Record<string, unknown>) => {
    const response: unknown = await api.get("/medical/vaccinations", { params });
    return { data: unwrapList(response), meta: asRecord(response).meta };
  },

  // GET /medical/prescriptions?dog_id=... - medication prescriptions (start_at/end_at/is_active)
  getPrescriptions: async (params?: Record<string, unknown>) => {
    const response: unknown = await api.get("/medical/prescriptions", { params });
    return { data: unwrapList(response), meta: asRecord(response).meta };
  },

  // GET /medical/vaccine-protocols - vaccination protocol reference
  getVaccineProtocols: async () => {
    const response: unknown = await api.get("/medical/vaccine-protocols");
    return { data: unwrapList(response) };
  },

  // GET /medical/dogs/{dog_id}/administrations - medication administrations log
  getDogAdministrations: async (dogId: string) => {
    const response: unknown = await api.get(`/medical/dogs/${dogId}/administrations`);
    return { data: unwrapList(response) };
  },

  // GET /companion-pets/{pet_id}/reminders - pet vaccination/medication reminders
  getPetReminders: async (petId: string) => {
    const response: unknown = await api.get(`/companion-pets/${petId}/reminders`);
    return { data: unwrapList(response) };
  },

  // POST /companion-pets/{pet_id}/reminders - create a vaccination or medication reminder
  createPetReminder: async (
    petId: string,
    data: {
      kind: "vaccination" | "medication";
      title: string;
      due_at: string;
      details?: string;
      source_key: string;
    }
  ) => {
    const response: unknown = await api.post(`/companion-pets/${petId}/reminders`, {
      kind: data.kind,
      title: data.title,
      details: data.details || null,
      due_at: data.due_at,
      source_key: data.source_key,
    });
    await publishActionEvent({
      module: "medical",
      action: "create",
      title: "Vaccination / Medication Reminder Created",
      message: `Reminder "${data.title}" created for pet ${petId}, due ${data.due_at}.`,
      targetRoles: [...REMINDER_TARGET_ROLES],
    });
    return unwrapData(response);
  },

  // DELETE /companion-pets/{pet_id}/reminders/{reminder_id} - soft-delete a reminder
  deletePetReminder: async (petId: string, reminderId: string) => {
    const response: unknown = await api.delete(`/companion-pets/${petId}/reminders/${reminderId}`);
    await publishActionEvent({
      module: "medical",
      action: "delete",
      title: "Vaccination / Medication Reminder Removed",
      message: `Reminder ${reminderId} removed for pet ${petId}.`,
      targetRoles: [...REMINDER_TARGET_ROLES],
    });
    return asRecord(response);
  },

  // PATCH /medical/prescriptions/{prescription_id}/status - toggle prescription active state
  updatePrescriptionStatus: async (prescriptionId: string, isActive: boolean) => {
    const response: unknown = await api.patch(
      `/medical/prescriptions/${prescriptionId}/status`,
      { is_active: isActive }
    );
    await publishActionEvent({
      module: "medical",
      action: "update",
      title: "Medication Prescription Status Updated",
      message: `Prescription ${prescriptionId} marked ${isActive ? "active" : "inactive"}.`,
      targetRoles: [...REMINDER_TARGET_ROLES],
    });
    return unwrapData(response);
  },
};

export default reminderService;
