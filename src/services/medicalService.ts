import api from "../api/axios";
import { publishActionEvent } from "../utils/eventSystem";

const pick = (data: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = data[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const normalizeMedicalRow = (r: Record<string, unknown>, type: string): Record<string, unknown> => {
  const vetIdRaw = r.administered_by || r.vet_id;
  const vetName = vetIdRaw ? `Vet ID: ${String(vetIdRaw).slice(0, 8)}` : "-";

  if (type === "exams") {
    const notes: string[] = [];
    if (r.body_condition_score !== undefined && r.body_condition_score !== null) notes.push(`BCS ${r.body_condition_score}/9`);
    if (r.visible_injuries) notes.push(String(r.visible_injuries));
    if (r.dental_health) notes.push(`Dental: ${r.dental_health}`);
    if (r.coat_condition) notes.push(`Coat: ${r.coat_condition}`);
    return {
      recordId: r.id,
      id: r.id,
      entityType: "exams",
      type: "exams",
      categoryName: "Clinical Exam",
      petName: (r.dog as { name?: string } | undefined)?.name || r.dog_id || "-",
      petId: r.dog_id || "-",
      vetName,
      vetId: vetIdRaw || null,
      diagnosis: r.triage_diagnosis || "-",
      treatment: notes.length > 0 ? notes.join("; ") : "-",
      date: r.exam_date || r.created_at || "-",
      raw: r,
    };
  }

  if (type === "treatments") {
    return {
      recordId: r.id,
      id: r.id,
      entityType: "treatments",
      type: "treatments",
      categoryName: "Treatment / Surgery",
      petName: (r.dog as { name?: string } | undefined)?.name || r.dog_id || "-",
      petId: r.dog_id || "-",
      vetName,
      vetId: vetIdRaw || null,
      diagnosis: "-",
      treatment: r.treatment_type ? `${r.treatment_type}${r.description ? `: ${r.description}` : ""}` : (r.description || "-"),
      treatmentType: r.treatment_type || "-",
      description: r.description || "-",
      date: r.treatment_date || r.created_at || "-",
      raw: r,
    };
  }

  if (type === "vaccinations") {
    return {
      recordId: r.id,
      id: r.id,
      entityType: "vaccinations",
      type: "vaccinations",
      categoryName: "Vaccination",
      petName: (r.dog as { name?: string } | undefined)?.name || r.dog_id || "-",
      petId: r.dog_id || "-",
      vetName,
      vetId: vetIdRaw || null,
      diagnosis: "-",
      treatment: r.vaccine_name ? `Vaccine: ${r.vaccine_name}${r.lot_number ? ` (Lot #${r.lot_number})` : ""}` : "-",
      vaccineName: r.vaccine_name || "-",
      lotNumber: r.lot_number || null,
      nextDueAt: r.next_due_at || null,
      date: r.administered_at || r.created_at || "-",
      raw: r,
    };
  }

  if (type === "prescriptions") {
    return {
      recordId: r.id,
      id: r.id,
      entityType: "prescriptions",
      type: "prescriptions",
      categoryName: "Prescription",
      petName: (r.dog as { name?: string } | undefined)?.name || r.dog_id || "-",
      petId: r.dog_id || "-",
      vetName,
      vetId: vetIdRaw || null,
      diagnosis: "-",
      treatment: r.drug_name ? `Rx: ${r.drug_name} (${r.dosage || "As directed"}, ${r.route || "Oral"})` : "-",
      drugName: r.drug_name || "-",
      dosage: r.dosage || "-",
      route: r.route || "-",
      startAt: r.start_at || "-",
      endAt: r.end_at || "-",
      isActive: r.is_active ?? true,
      date: r.start_at || r.created_at || "-",
      raw: r,
    };
  }

  return {
    recordId: r.id,
    id: r.id,
    entityType: type,
    type,
    categoryName: type,
    petName: (r.dog as { name?: string } | undefined)?.name || r.dog_id || "-",
    petId: r.dog_id || "-",
    vetName,
    diagnosis: "-",
    treatment: "-",
    date: r.created_at || "-",
    raw: r,
  };
};

export const medicalService = {
  getMedicalRecords: async () => {
    const [exams, vaccinations, treatments, prescriptions] = await Promise.all([
      api.get("/medical/exams").catch(() => ({ data: [] })),
      api.get("/medical/vaccinations").catch(() => ({ data: [] })),
      api.get("/medical/treatments").catch(() => ({ data: [] })),
      api.get("/medical/prescriptions").catch(() => ({ data: [] })),
    ]);
    const unwrap = (res: { data?: { data?: Record<string, unknown>[] } | Record<string, unknown>[] }): Record<string, unknown>[] => {
      const data = res?.data;
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;
      return [];
    };
    const rows = [
      ...unwrap(exams).map((r) => normalizeMedicalRow(r, "exams")),
      ...unwrap(vaccinations).map((r) => normalizeMedicalRow(r, "vaccinations")),
      ...unwrap(treatments).map((r) => normalizeMedicalRow(r, "treatments")),
      ...unwrap(prescriptions).map((r) => normalizeMedicalRow(r, "prescriptions")),
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return { data: rows, total: rows.length };
  },

  getMedicalHistory: async (dogId: string) => {
    try {
      const response = await api.get(`/medical/dogs/${dogId}/history`);
      const payload = response?.data?.data || response?.data;
      if (Array.isArray(payload)) {
        return { data: payload };
      }
      if (payload && typeof payload === "object") {
        const unwrap = (val: unknown): Record<string, unknown>[] => (Array.isArray(val) ? (val as Record<string, unknown>[]) : []);
        const rows = [
          ...unwrap(payload.exams).map((r) => normalizeMedicalRow(r, "exams")),
          ...unwrap(payload.treatments).map((r) => normalizeMedicalRow(r, "treatments")),
          ...unwrap(payload.vaccinations).map((r) => normalizeMedicalRow(r, "vaccinations")),
          ...unwrap(payload.prescriptions).map((r) => normalizeMedicalRow(r, "prescriptions")),
        ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
        return { data: rows };
      }
      return { data: [] };
    } catch {
      return { data: [] };
    }
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

    const diagnosis = pick(data, "triage_diagnosis", "diagnosis", "chiefComplaint") || "Routine Clinical Checkup";
    const bcs = Number(pick(data, "body_condition_score", "bodyConditionScore", "bcs")) || 5;

    const notesParts: string[] = [];
    const chiefComplaint = pick(data, "chief_complaint", "chiefComplaint");
    if (chiefComplaint) notesParts.push(`Complaint: ${chiefComplaint}`);
    const visibleInjuries = pick(data, "visible_injuries", "visibleInjuries", "treatment");
    if (visibleInjuries) notesParts.push(`Exam: ${visibleInjuries}`);
    const vetNotes = pick(data, "vet_notes", "vetNotes", "notes");
    if (vetNotes) notesParts.push(`Notes: ${vetNotes}`);

    const payload: Record<string, unknown> = {
      dog_id: dogId,
      triage_diagnosis: String(diagnosis),
      body_condition_score: bcs,
    };
    if (notesParts.length > 0) {
      payload.visible_injuries = notesParts.join("; ");
    } else if (data.treatment) {
      payload.visible_injuries = String(data.treatment);
    }

    const response = await api.post("/medical/exams", payload);
    await publishActionEvent({
      module: "medical",
      action: "create",
      title: "Clinical Medical Exam Created",
      message: `Clinical examination recorded for patient ${dogId}. Diagnosis: ${diagnosis}.`,
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

    const rawStatus = String(pick(data, "status", "certStatus") || "approved").toLowerCase();
    const status = (rawStatus === "denied" || rawStatus === "pending") ? rawStatus : "approved";
    const clearanceType = String(pick(data, "clearance_type", "clearanceType", "certType") || "adoption_surgery");
    const notes = pick(data, "decision_notes", "notes") || "Healthy, cleared for adoption.";

    const payload: Record<string, unknown> = {
      clearance_type: clearanceType,
      status: status,
      decision_notes: String(notes),
    };
    if (data.expires_at) {
      payload.expires_at = String(data.expires_at);
    }

    const response = await api.post(`/medical/clearance/${dogId}`, payload);

    await publishActionEvent({
      module: "medical",
      action: "approve",
      title: "Medical Clearance Issued",
      message: `Medical clearance (${String(payload.status)}) issued for dog ${dogId}.`,
      targetRoles: ["super_admin", "rescue_centre_admin", "veterinarian", "shelter_manager"],
    });
    return response.data;
  },

  deleteMedicalRecord: async (id: string, entityType: string = "exams") => {
    const response = await api.delete(`/medical/${entityType}/${id}`);
    return response.data;
  },
};

export default medicalService;
