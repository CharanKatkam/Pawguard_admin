import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

export interface MedicalExamPayload {
  recordId?: string;
  petName: string;
  vetName: string;
  diagnosis: string;
  treatment: string;
  date?: string;
  status?: string;
}

export const medicalService = {
  getMedicalRecords: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/medical/exams", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        try {
          const res2 = await api.get("/medical/records", { params });
          return res2.data;
        } catch {
          return { data: [], total: 0 };
        }
      }
      throw err;
    }
  },

  createMedicalExam: async (data: Record<string, unknown>) => {
    const response = await api.post("/medical/exams", data);
    await publishActionEvent({
      module: "medical",
      action: "create",
      title: "Clinical Medical Exam Created",
      message: `Medical exam logged for ${data.petName || "patient"} by ${data.vetName || "Attending Vet"}.`,
      targetRoles: ["super_admin", "veterinarian", "rescue_centre_admin", "shelter_manager"],
    });
    return response.data;
  },

  updateMedicalExam: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/medical/exams/${id}`, data);
    await publishActionEvent({
      module: "medical",
      action: "update",
      title: "Medical Examination Record Updated",
      message: `Updated diagnosis/treatment for examination ${id}.`,
      targetRoles: ["super_admin", "veterinarian", "shelter_manager"],
    });
    return response.data;
  },

  deleteMedicalExam: async (id: string) => {
    const response = await api.delete(`/medical/exams/${id}`);
    return response.data;
  },

  createVaccination: async (data: Record<string, unknown>) => {
    const response = await api.post("/medical/vaccinations", data);
    return response.data;
  },

  scheduleSurgery: async (data: Record<string, unknown>) => {
    const response = await api.post("/medical/surgeries", data);
    return response.data;
  },

  issueCertificate: async (data: Record<string, unknown>) => {
    const response = await api.post("/medical/certificates", data);
    return response.data;
  },
};

export default medicalService;
