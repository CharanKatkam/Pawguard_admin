import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

const pick = (data: Record<string, unknown>, ...keys: string[]): any => {
  for (const k of keys) {
    const v = data[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const normalizeMedicalRow = (r: Record<string, any>, type: string): Record<string, unknown> => {
  const clinical = [];
  if (r.body_condition_score !== undefined && r.body_condition_score !== null) clinical.push(`BCS ${r.body_condition_score}/9`);
  if (r.visible_injuries) clinical.push(String(r.visible_injuries));
  if (r.dental_health) clinical.push(String(r.dental_health));
  if (r.post_op_notes) clinical.push(String(r.post_op_notes));
  return {
    recordId: r.id,
    id: r.id,
    entityType: type,
    petName: r.dog?.name || r.dog_id || "",
    petId: r.dog_id,
    vetName: r.administered_by || r.vet_id || "",
    diagnosis: r.triage_diagnosis || r.vaccine_name || r.treatment_type || "",
    treatment: r.description || clinical.join("; "),
    vaccineName: r.vaccine_name,
    nextDueAt: r.next_due_at,
    status: r.status || "",
    type,
    date: r.exam_date || r.administered_at || r.treatment_date || r.created_at,
  };
};

export const medicalService = {
  getMedicalRecords: async () => {
    const [exams, vaccinations, treatments] = await Promise.all([
      api.get("/medical/exams").catch((e) => {
        throw e;
      }),
      api.get("/medical/vaccinations"),
      api.get("/medical/treatments"),
    ]);
    const unwrap = (res: any) => (Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : []);
    const rows = [
      ...unwrap(exams).map((r: any) => normalizeMedicalRow(r, "exams")),
      ...unwrap(vaccinations).map((r: any) => normalizeMedicalRow(r, "vaccinations")),
      ...unwrap(treatments).map((r: any) => normalizeMedicalRow(r, "treatments")),
    ].sort((a: any, b: any) => String(b.date || "").localeCompare(String(a.date || "")));
    return { data: rows, total: rows.length };
  },

  getMedicalHistory: async (dogId: string) => {
    const response = await api.get(`/medical/dogs/${dogId}/history`);
    const rows = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response?.data) ? response.data : [];
    return { data: rows };
  },

  // GET /medical/clearances/dogs/{dog_id} - list medical clearance certificates for a dog
  getDogClearances: async (dogId: string) => {
    const response = await api.get(`/medical/clearances/dogs/${dogId}`);
    const list = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response?.data) ? response.data : [];
    return list;
  },

  createMedicalExam: async (data: Record<string, unknown>) => {
    const dogId = pick(data, "dog_id", "dogId", "petName");
    if (!dogId) throw new Error("Dog selection is required to record a clinical exam.");
    const payload: Record<string, unknown> = {
      dog_id: dogId,
      triage_diagnosis: pick(data, "triage_diagnosis", "diagnosis"),
      body_condition_score: Number(pick(data, "body_condition_score", "bodyConditionScore")) || 5,
    };
    if (data.treatment) payload.visible_injuries = data.treatment;
    const response = await api.post("/medical/exams", payload);
    await publishActionEvent({
      module: "medical",
      action: "create",
      title: "Clinical Medical Exam Created",
      message: `Clinical examination recorded for patient ${dogId}.`,
      targetRoles: ["super_admin", "veterinarian", "rescue_centre_admin", "shelter_manager"],
    });
    return response.data;
  },

  createVaccination: async (data: Record<string, unknown>) => {
    const dogId = pick(data, "dog_id", "dogId", "petName");
    if (!dogId) throw new Error("Dog selection is required to log a vaccination.");
    const vaccineName = pick(data, "vaccine_name", "vaccineName");
    if (!vaccineName) throw new Error("Vaccine name is required.");
    const payload: Record<string, unknown> = { dog_id: dogId, vaccine_name: vaccineName };
    if (data.nextDueAt || data.next_due_at) payload.next_due_at = pick(data, "next_due_at", "nextDueAt");
    if (data.lotNumber || data.lot_number) payload.lot_number = pick(data, "lot_number", "lotNumber");
    const response = await api.post("/medical/vaccinations", payload);
    return response.data;
  },

  scheduleSurgery: async (data: Record<string, unknown>) => {
    const dogId = pick(data, "dog_id", "dogId", "petName");
    if (!dogId) throw new Error("Dog selection is required to schedule a treatment.");
    const treatmentType = pick(data, "treatment_type", "treatmentType", "procedure");
    if (!treatmentType) throw new Error("Procedure/treatment type is required.");
    const payload: Record<string, unknown> = {
      dog_id: dogId,
      treatment_type: treatmentType,
      description: pick(data, "description", "treatment") || "",
    };
    const response = await api.post("/medical/treatments", payload);
    return response.data;
  },

  issueCertificate: async (data: Record<string, unknown>) => {
    const dogId = pick(data, "dog_id", "dogId", "petName");
    if (!dogId) throw new Error("Dog selection is required to issue a clearance certificate.");
    const payload: Record<string, unknown> = {
      clearance_type: pick(data, "clearance_type", "clearanceType", "certType") || "health_clearance",
      status: pick(data, "status", "certStatus") || "pending",
      decision_notes: pick(data, "decision_notes", "notes"),
    };
    const response = await api.post(`/medical/clearance/${dogId}`, payload);
    return response.data;
  },

  deleteMedicalRecord: async (id: string, entityType: string = "exams") => {
    const response = await api.delete(`/medical/${entityType}/${id}`);
    return response.data;
  },
};

export default medicalService;
