import api from "../api/axios";

export interface VolunteerApplicationPayload {
  full_name: string;
  email: string;
  phone?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface VolunteerProfilePayload {
  full_name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  status?: string;
  [key: string]: unknown;
}

export interface ShiftPayload {
  title?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
  [key: string]: unknown;
}

export const volunteerService = {
  // POST /volunteers/apply
  applyVolunteer: async (data: VolunteerApplicationPayload) => {
    const response = await api.post("/volunteers/apply", data);
    return response.data;
  },

  // PUT /volunteers/{profile_id}
  updateVolunteerProfile: async (profileId: string, data: VolunteerProfilePayload) => {
    const response = await api.put(`/volunteers/${profileId}`, data);
    return response.data;
  },

  // DELETE /volunteers/{profile_id}
  deleteVolunteerProfile: async (profileId: string) => {
    const response = await api.delete(`/volunteers/${profileId}`);
    return response.data;
  },

  getVolunteers: async (params?: Record<string, unknown>) => {
    const response = await api.get("/volunteers", { params });
    return response.data;
  },

  // POST /volunteers/shifts
  createShift: async (data: ShiftPayload) => {
    const response = await api.post("/volunteers/shifts", data);
    return response.data;
  },

  // GET /volunteers/shifts
  getShifts: async (params?: Record<string, unknown>) => {
    const response = await api.get("/volunteers/shifts", { params });
    return response.data;
  },

  // POST /volunteers/shifts/{shift_id}/join
  joinShift: async (shiftId: string, data?: Record<string, unknown>) => {
    const response = await api.post(`/volunteers/shifts/${shiftId}/join`, data);
    return response.data;
  },

  // POST /volunteers/attendance/{attendance_id}/check-in
  checkInAttendance: async (attendanceId: string, data?: Record<string, unknown>) => {
    const response = await api.post(`/volunteers/attendance/${attendanceId}/check-in`, data);
    return response.data;
  },

  // POST /volunteers/attendance/{attendance_id}/check-out
  checkOutAttendance: async (attendanceId: string, data?: Record<string, unknown>) => {
    const response = await api.post(`/volunteers/attendance/${attendanceId}/check-out`, data);
    return response.data;
  },

  // GET /volunteers/shifts/{shift_id}/attendance
  getShiftAttendance: async (shiftId: string) => {
    const response = await api.get(`/volunteers/shifts/${shiftId}/attendance`);
    return response.data;
  },
};

export default volunteerService;
