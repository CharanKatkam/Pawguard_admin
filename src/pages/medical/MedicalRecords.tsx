import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaStethoscope, FaSyringe, FaNotesMedical, FaFileMedical, FaTrash, FaUserMd } from "react-icons/fa";
import medicalService from "../../services/medicalService";
import dogService from "../../services/dogService";
import { notifyDataChanged } from "../../utils/dataSync";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  boxSizing: "border-box",
};

const MedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState<Record<string, unknown>[]>([]);
  const [dogs, setDogs] = useState<any[]>([]);
  const [certificatesIssued, setCertificatesIssued] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  // Modals state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [isSurgeryModalOpen, setIsSurgeryModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Form states
  const [examForm, setExamForm] = useState({ dogId: "", diagnosis: "", treatment: "" });
  const [vaccineForm, setVaccineForm] = useState({ dogId: "", vaccineName: "", nextDueAt: "" });
  const [surgeryForm, setSurgeryForm] = useState({ dogId: "", procedure: "", description: "" });
  const [certForm, setCertForm] = useState({ dogId: "", clearanceType: "health_clearance", notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchDogs();
  }, []);

  const fetchDogs = async () => {
    try {
      const response = await dogService.getAllDogs();
      const list = Array.isArray(response?.data) ? response.data : [];
      setDogs(list);
      fetchCertificates(list);
    } catch {
      setDogs([]);
      setCertificatesIssued(0);
    }
  };

  const fetchCertificates = async (dogList: any[] = dogs) => {
    if (dogList.length === 0) {
      setCertificatesIssued(0);
      return;
    }
    const results = await Promise.allSettled(
      dogList.map((d) => medicalService.getDogClearances(d.id || d.dog_id))
    );
    const approved = results.reduce((acc, r) => {
      if (r.status !== "fulfilled") return acc;
      const list = Array.isArray(r.value) ? r.value : Array.isArray(r.value?.data) ? r.value.data : [];
      return (
        acc +
        list.filter((c: any) => String(c.status).toLowerCase() === "approved").length
      );
    }, 0);
    setCertificatesIssued(approved);
  };

  const dogLabel = (d: any) =>
    d?.name ? `${d.name}${d.breed ? ` (${d.breed})` : ""}` : d?.id ? d.id : "";

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await medicalService.getMedicalRecords();
      if (response && Array.isArray(response.data)) {
        const rows = response.data.map((r: any) => {
          const dog = dogs.find((d) => d.id === r.petId || d.id === r.pet_id);
          return dog && !r.petName?.includes(" ") ? { ...r, petName: dog.name } : r;
        });
        setMedicalRecords(rows);
      }
    } catch {
      addToast("Failed to load medical records.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.dogId || !examForm.diagnosis) {
      addToast("Dog and diagnosis are required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.createMedicalExam(examForm);
      addToast("Clinical examination recorded!", "success");
      setIsExamModalOpen(false);
      setExamForm({ dogId: "", diagnosis: "", treatment: "" });
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to log examination.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineForm.dogId || !vaccineForm.vaccineName) {
      addToast("Dog and vaccine name are required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.createVaccination(vaccineForm);
      addToast(`Vaccination logged for ${dogLabel(dogs.find((d) => d.id === vaccineForm.dogId))}!`, "success");
      setIsVaccineModalOpen(false);
      setVaccineForm({ dogId: "", vaccineName: "", nextDueAt: "" });
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to log vaccination.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryForm.dogId || !surgeryForm.procedure) {
      addToast("Dog and procedure are required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.scheduleSurgery(surgeryForm);
      addToast(`Treatment "${surgeryForm.procedure}" scheduled!`, "success");
      setIsSurgeryModalOpen(false);
      setSurgeryForm({ dogId: "", procedure: "", description: "" });
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to schedule treatment.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.dogId) {
      addToast("Dog selection is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.issueCertificate(certForm);
      addToast("Clearance certificate issued!", "success");
      setIsCertModalOpen(false);
      setCertForm({ dogId: "", clearanceType: "health_clearance", notes: "" });
      fetchRecords();
      fetchCertificates();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to issue certificate.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    try {
      setIsSubmitting(true);
      await medicalService.deleteMedicalRecord(selectedRecord.recordId, selectedRecord.entityType);
      addToast(`Deleted ${selectedRecord.entityType === "exams" ? "record" : selectedRecord.entityType.slice(0, -1)} ${selectedRecord.recordId}`, "success");
      setIsDeleteModalOpen(false);
      setSelectedRecord(null);
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to delete record.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const countRecordsWith = (...needles: string[]): number =>
    medicalRecords.filter((r) => {
      const hay = [
        String(r.type || ""),
        String(r.record_type || ""),
        String(r.category || ""),
        String(r.diagnosis || ""),
        String(r.procedure || ""),
        String(r.status || ""),
      ]
        .join(" ")
        .toLowerCase();
      return needles.some((n) => hay.includes(n));
    }).length;

  const surgeriesCompleted = countRecordsWith("surgery", "spay", "neuter", "operation", "treatment");
  const vaccinationsAdministered = countRecordsWith("vaccin", "rabies", "booster");

  const stats = [
    { title: "Active Patients", value: `${medicalRecords.length} Records`, trend: "Under Care", color: "#2563EB", icon: <FaStethoscope /> },
    { title: "Surgeries Completed", value: `${surgeriesCompleted} Cases`, trend: "Completed", color: "#10B981", icon: <FaNotesMedical /> },
    { title: "Vaccinations Administered", value: `${vaccinationsAdministered} Records`, trend: "Administered", color: "#F59E0B", icon: <FaSyringe /> },
    { title: "Certificates Issued", value: `${certificatesIssued} Issued`, trend: "Approved", color: "#6366F1", icon: <FaFileMedical /> },
  ];

  const columns = [
    { key: "recordId", title: "Record ID" },
    { key: "petName", title: "Pet Name & ID" },
    { key: "vetName", title: "Attending Vet" },
    { key: "diagnosis", title: "Diagnosis" },
    { key: "treatment", title: "Treatment Plan" },
    { key: "status", title: "Health Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Medical Records & Clinical Care</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Centralized veterinary management system: patient histories, surgical logs, treatment schedules, and medical clearance certificates.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_medical">
          <QuickActionCard icon={<FaStethoscope />} title="Record Examination" subtitle="Log new clinical diagnosis" color="#2563EB" onClick={() => setIsExamModalOpen(true)} />
        </Can>
        <Can permission="create_medical">
          <QuickActionCard icon={<FaSyringe />} title="Log Vaccination" subtitle="Administer vaccine booster" color="#10B981" onClick={() => setIsVaccineModalOpen(true)} />
        </Can>
        <Can permission="create_medical">
          <QuickActionCard icon={<FaUserMd />} title="Schedule Treatment" subtitle="Book surgical operation" color="#F59E0B" onClick={() => setIsSurgeryModalOpen(true)} />
        </Can>
        <Can permission="create_medical">
          <QuickActionCard icon={<FaFileMedical />} title="Issue Certificate" subtitle="Generate health clearance" color="#6366F1" onClick={() => setIsCertModalOpen(true)} />
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Patient Clinical Directory
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading medical records...</span>}
        </div>
        <DataTable
          columns={columns}
          data={medicalRecords}
          module="medical"
          onDelete={(row) => {
            setSelectedRecord(row);
            setIsDeleteModalOpen(true);
          }}
        />
      </div>

      {/* Record Examination Modal */}
      <Modal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Log Clinical Examination">
        <form onSubmit={handleCreateExam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={examForm.dogId} onChange={(e) => setExamForm({ ...examForm, dogId: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{dogLabel(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Diagnosis *</label>
            <input type="text" required placeholder="e.g. Malnutrition & Dehydration" value={examForm.diagnosis} onChange={(e) => setExamForm({ ...examForm, diagnosis: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Visible Injuries / Treatment Plan</label>
            <input type="text" placeholder="e.g. IV Fluids & Antibiotics" value={examForm.treatment} onChange={(e) => setExamForm({ ...examForm, treatment: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsExamModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Saving..." : "Save Record"}</button>
          </div>
        </form>
      </Modal>

      {/* Log Vaccination Modal */}
      <Modal isOpen={isVaccineModalOpen} onClose={() => setIsVaccineModalOpen(false)} title="Log Vaccination Booster">
        <form onSubmit={handleLogVaccine} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={vaccineForm.dogId} onChange={(e) => setVaccineForm({ ...vaccineForm, dogId: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{dogLabel(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Vaccine Name *</label>
            <input type="text" required placeholder="e.g. Rabies Core Booster" value={vaccineForm.vaccineName} onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Next Due Date</label>
            <input type="date" value={vaccineForm.nextDueAt} onChange={(e) => setVaccineForm({ ...vaccineForm, nextDueAt: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsVaccineModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Log Vaccine"}</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Treatment Modal */}
      <Modal isOpen={isSurgeryModalOpen} onClose={() => setIsSurgeryModalOpen(false)} title="Schedule Surgical Treatment">
        <form onSubmit={handleScheduleSurgery} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={surgeryForm.dogId} onChange={(e) => setSurgeryForm({ ...surgeryForm, dogId: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{dogLabel(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Procedure *</label>
            <input type="text" required placeholder="e.g. Spay & Neutering" value={surgeryForm.procedure} onChange={(e) => setSurgeryForm({ ...surgeryForm, procedure: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Description</label>
            <input type="text" placeholder="e.g. Ovariohysterectomy, general anesthesia" value={surgeryForm.description} onChange={(e) => setSurgeryForm({ ...surgeryForm, description: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsSurgeryModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Booking..." : "Schedule Treatment"}</button>
          </div>
        </form>
      </Modal>

      {/* Issue Certificate Modal */}
      <Modal isOpen={isCertModalOpen} onClose={() => setIsCertModalOpen(false)} title="Issue Medical Clearance Certificate">
        <form onSubmit={handleIssueCert} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={certForm.dogId} onChange={(e) => setCertForm({ ...certForm, dogId: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{dogLabel(d)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Clearance Type</label>
            <select value={certForm.clearanceType} onChange={(e) => setCertForm({ ...certForm, clearanceType: e.target.value })} style={inputStyle}>
              <option value="health_clearance">Health Clearance</option>
              <option value="adoption_clearance">Adoption Clearance</option>
              <option value="travel_clearance">Travel / Export Clearance</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsCertModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Generating..." : "Generate Certificate"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Medical Record Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Medical Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to delete this record for <strong>{selectedRecord?.petName}</strong>?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDelete} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><FaTrash /> Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MedicalRecords;
