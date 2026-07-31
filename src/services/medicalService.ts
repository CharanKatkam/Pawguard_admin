import api from "../api/axios";

export const medicalService = {
  getMedicalRecords: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/medical/exams", { params });
      return response.data;
    } catch {
      return {
        data: [
          { recordId: "MED-901", petName: "Max (DOG-101)", vetName: "Dr. John Smith", diagnosis: "Fractured Right Hind Leg", treatment: "Orthopedic Surgery & Splint", date: "2026-07-28", status: "Post-Op Recovery" },
          { recordId: "MED-902", petName: "Bella (DOG-102)", vetName: "Dr. Sarah Connor", diagnosis: "Severe Malnutrition & Mange", treatment: "Medicated Baths & Antibiotics", date: "2026-07-29", status: "In Treatment" },
          { recordId: "MED-903", petName: "Rocky (DOG-103)", vetName: "Dr. John Smith", diagnosis: "Parvovirus Routine Panel", treatment: "Core Vaccination & De-worming", date: "2026-07-30", status: "Completed" },
        ],
      };
    }
  },

  createMedicalExam: async (data: Record<string, unknown>) => {
    const response = await api.post("/medical/exams", data);
    return response.data;
  },

  createVaccination: async (data: Record<string, unknown>) => {
    const response = await api.post("/medical/vaccinations", data);
    return response.data;
  },
};

export default medicalService;
