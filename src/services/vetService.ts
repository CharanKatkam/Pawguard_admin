import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const unwrapList = (res: unknown): Record<string, unknown>[] => {
  const body = asRecord(res).data;
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  const inner = asRecord(body).data;
  return Array.isArray(inner) ? (inner as Record<string, unknown>[]) : [];
};

const unwrapData = (res: unknown): Record<string, unknown> => {
  const body = asRecord(res).data;
  if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  return asRecord(body);
};

export const vetService = {
  // GET /companion-pets/clinics - list active veterinary clinics (vet directory)
  getClinics: async (params?: Record<string, unknown>) => {
    const response = await api.get("/companion-pets/clinics", { params });
    return {
      data: unwrapList(response),
      meta: asRecord(response).meta,
    };
  },

  // GET /companion-pets/appointments - list authorized veterinary appointments
  getAppointments: async (params?: Record<string, unknown>) => {
    const response = await api.get("/companion-pets/appointments", { params });
    return {
      data: unwrapList(response),
      meta: asRecord(response).meta,
    };
  },

  // POST /companion-pets/appointments - book a veterinary appointment
  bookAppointment: async (data: Record<string, unknown>) => {
    const response = await api.post("/companion-pets/appointments", data);
    await publishActionEvent({
      module: "medical",
      action: "create",
      title: "Veterinary Appointment Booked",
      message: `Appointment booked for pet ${String(data.pet_id ?? "")} at clinic ${String(data.clinic_id ?? "")}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "veterinarian", "shelter_manager"],
    });
    return unwrapData(response);
  },

  // POST /companion-pets/appointments/{appointment_id}/cancel
  cancelAppointment: async (appointmentId: string, reason?: string) => {
    const response = await api.post(`/companion-pets/appointments/${appointmentId}/cancel`, {
      reason: reason || null,
    });
    await publishActionEvent({
      module: "medical",
      action: "update",
      title: "Veterinary Appointment Cancelled",
      message: `Appointment ${appointmentId} cancelled${reason ? ` (${reason})` : ""}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "veterinarian", "shelter_manager"],
    });
    return unwrapData(response);
  },

  // POST /companion-pets/appointments/{appointment_id}/confirm
  confirmAppointment: async (appointmentId: string) => {
    const response = await api.post(`/companion-pets/appointments/${appointmentId}/confirm`);
    await publishActionEvent({
      module: "medical",
      action: "approve",
      title: "Veterinary Appointment Confirmed",
      message: `Appointment ${appointmentId} confirmed by clinic staff.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "veterinarian", "shelter_manager"],
    });
    return unwrapData(response);
  },
  // GET /companion-pets/clinics/{clinic_id}/veterinarians - list veterinarians for a clinic
  getClinicVeterinarians: async (clinicId: string) => {
    const response = await api.get(`/companion-pets/clinics/${clinicId}/veterinarians`);
    return {
      data: unwrapList(response),
      meta: asRecord(response).meta,
    };
  },

  // GET /portal/admin/veterinary-network - list partner veterinary network clinics/doctors
  getPartnerVeterinaryNetwork: async (params?: Record<string, unknown>) => {
    const response = await api.get("/portal/admin/veterinary-network", { params });
    return {
      data: unwrapList(response),
      meta: asRecord(response).meta,
    };
  },
};

export default vetService;