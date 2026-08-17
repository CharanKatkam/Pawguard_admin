import api from "../api/axios";

export interface VolunteerApplicationPayload {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  skills?: string;
  availability?: string;
  notes?: string;
  medical_conditions?: string;
  animal_handling_experience?: string;
  [key: string]: unknown;
}

export interface VolunteerProfileUpdatePayload {
  status?: "applied" | "onboarded" | "active" | "inactive";
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  skills?: string;
  availability?: string;
  notes?: string;
  medical_conditions?: string;
  animal_handling_experience?: string;
  background_check_completed?: boolean;
  background_check_notes?: string;
  [key: string]: unknown;
}

export interface ShiftCreatePayload {
  shelter_facility_id?: string | null;
  role_name: string;
  start_at: string;
  end_at: string;
  capacity?: number;
  [key: string]: unknown;
}

export const volunteerService = {
  // GET /volunteers - List volunteer profiles
  getVolunteers: async (params?: Record<string, unknown>) => {
    const response = await api.get("/volunteers", { params });
    return response.data;
  },

  // GET /volunteers/{profile_id} - Get profile details
  getVolunteerById: async (profileId: string) => {
    const response = await api.get(`/volunteers/${profileId}`);
    return response.data;
  },

  // POST /volunteers/apply - Submit application
  applyVolunteer: async (data: VolunteerApplicationPayload) => {
    const response = await api.post("/volunteers/apply", data);
    return response.data;
  },

  // PUT /volunteers/{profile_id} - Update profile / status
  updateVolunteerProfile: async (profileId: string, data: VolunteerProfileUpdatePayload) => {
    const response = await api.put(`/volunteers/${profileId}`, data);
    return response.data;
  },

  // POST /volunteers/bulk/status - Bulk status update
  bulkUpdateStatus: async (profileIds: string[], status: "applied" | "onboarded" | "active" | "inactive") => {
    const response = await api.post("/volunteers/bulk/status", { profile_ids: profileIds, status });
    return response.data;
  },

  // DELETE /volunteers/{profile_id} - Delete profile
  deleteVolunteerProfile: async (profileId: string) => {
    const response = await api.delete(`/volunteers/${profileId}`);
    return response.data;
  },

  // GET /volunteers/{profile_id}/service-summary
  getServiceSummary: async (profileId: string) => {
    const response = await api.get(`/volunteers/${profileId}/service-summary`);
    return response.data;
  },

  // GET /volunteers/{profile_id}/certificate
  getCertificate: async (profileId: string) => {
    const response = await api.get(`/volunteers/${profileId}/certificate`);
    return response.data;
  },

  // GET /volunteers/shifts - List shifts
  getShifts: async (params?: Record<string, unknown>) => {
    const response = await api.get("/volunteers/shifts", { params });
    return response.data;
  },

  // POST /volunteers/shifts - Create shift
  createShift: async (data: ShiftCreatePayload) => {
    const response = await api.post("/volunteers/shifts", data);
    return response.data;
  },

  // POST /volunteers/shifts/{shift_id}/join - Join shift
  joinShift: async (shiftId: string) => {
    const response = await api.post(`/volunteers/shifts/${shiftId}/join`);
    return response.data;
  },

  // GET /volunteers/shifts/{shift_id}/attendance - List shift attendance
  getShiftAttendance: async (shiftId: string) => {
    const response = await api.get(`/volunteers/shifts/${shiftId}/attendance`);
    return response.data;
  },

  // POST /volunteers/attendance/{attendance_id}/check-in - Check in
  checkInAttendance: async (attendanceId: string, checkInAt?: string) => {
    const payload = checkInAt ? { check_in_at: checkInAt } : {};
    const response = await api.post(`/volunteers/attendance/${attendanceId}/check-in`, payload);
    return response.data;
  },

  // POST /volunteers/attendance/{attendance_id}/check-out - Check out
  checkOutAttendance: async (attendanceId: string, notes?: string, checkOutAt?: string) => {
    const payload: Record<string, unknown> = {};
    if (notes) payload.notes = notes;
    if (checkOutAt) payload.check_out_at = checkOutAt;
    const response = await api.post(`/volunteers/attendance/${attendanceId}/check-out`, payload);
    return response.data;
  },

  // GET /admin/dashboard/volunteer-stats - Admin stats
  getVolunteerStats: async () => {
    const response = await api.get("/admin/dashboard/volunteer-stats");
    return response.data;
  },
};

export default volunteerService;
