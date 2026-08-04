import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import { FaStethoscope, FaSyringe, FaNotesMedical, FaFileMedical, FaUserMd, FaTrash } from "react-icons/fa";
import medicalService from "../../services/medicalService";
import { notifyDataChanged } from "../../utils/dataSync";

const MedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  // Modals state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [isSurgeryModalOpen, setIsSurgeryModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRecord, _setSelectedRecord] = useState<any | null>(null);

  // Form states
  const [examForm, setExamForm] = useState({ petName: "", vetName: "Dr. Sarah Connor", diagnosis: "", treatment: "" });
  const [vaccineForm, setVaccineForm] = useState({ petName: "", vaccineName: "Rabies Core Booster", dose: "1 ml", vetName: "Dr. Sarah Connor" });
  const [surgeryForm, setSurgeryForm] = useState({ petName: "", procedure: "Spay & Neutering", vetName: "Dr. John Smith", date: "2026-08-10" });
  const [certForm, setCertForm] = useState({ petName: "", certType: "Health Clearance Certificate", issuedBy: "Dr. Sarah Connor" });
  const [editForm, setEditForm] = useState({ diagnosis: "", treatment: "", status: "In Treatment" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await medicalService.getMedicalRecords();
      if (response && Array.isArray(response.data)) {
        setMedicalRecords(response.data);
      }
    } catch {
      // Handled by service fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.petName || !examForm.diagnosis) {
      addToast("Pet name and diagnosis are required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.createMedicalExam(examForm);
      addToast(`Clinical examination recorded for ${examForm.petName}!`, "success");
      setIsExamModalOpen(false);
      setExamForm({ petName: "", vetName: "Dr. Sarah Connor", diagnosis: "", treatment: "" });
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to log examination.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineForm.petName) {
      addToast("Pet name required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.createVaccination(vaccineForm);
      addToast(`Vaccination logged for ${vaccineForm.petName}!`, "success");
      setIsVaccineModalOpen(false);
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to log vaccination.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSurgery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surgeryForm.petName) {
      addToast("Pet name required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.scheduleSurgery(surgeryForm);
      addToast(`Surgery "${surgeryForm.procedure}" scheduled for ${surgeryForm.petName}!`, "success");
      setIsSurgeryModalOpen(false);
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to schedule surgery.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.petName) {
      addToast("Pet name required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await medicalService.issueCertificate(certForm);
      addToast(`Certificate issued for ${certForm.petName}!`, "success");
      setIsCertModalOpen(false);
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to issue certificate.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      setIsSubmitting(true);
      await medicalService.updateMedicalExam(selectedRecord.recordId, editForm);
      addToast(`Medical record ${selectedRecord.recordId} updated!`, "success");
      setIsEditModalOpen(false);
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update record.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    try {
      setIsSubmitting(true);
      await medicalService.deleteMedicalExam(selectedRecord.recordId);
      addToast(`Deleted record ${selectedRecord.recordId}`, "success");
      setIsDeleteModalOpen(false);
      fetchRecords();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete record.";
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

  const surgeriesCompleted = countRecordsWith("surgery", "spay", "neuter", "operation");
  const vaccinationsAdministered = countRecordsWith("vaccin", "rabies", "booster");
  const certificatesIssued = countRecordsWith("certif", "clearance");

  const stats = [
    { title: "Active Patients", value: `${medicalRecords.length} Pets`, trend: "Under Care", color: "#2563EB", icon: <FaStethoscope /> },
    { title: "Surgeries Completed", value: `${surgeriesCompleted} Cases`, trend: "Completed", color: "#10B981", icon: <FaNotesMedical /> },
    { title: "Vaccinations Administered", value: `${vaccinationsAdministered} Records`, trend: "Administered", color: "#F59E0B", icon: <FaSyringe /> },
    { title: "Certificates Issued", value: `${certificatesIssued} Issued`, trend: "Verified", color: "#6366F1", icon: <FaFileMedical /> },
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
        <QuickActionCard icon={<FaStethoscope />} title="Record Examination" subtitle="Log new clinical diagnosis" color="#2563EB" onClick={() => setIsExamModalOpen(true)} />
        <QuickActionCard icon={<FaSyringe />} title="Log Vaccination" subtitle="Administer vaccine booster" color="#10B981" onClick={() => setIsVaccineModalOpen(true)} />
        <QuickActionCard icon={<FaUserMd />} title="Schedule Surgery" subtitle="Book operating theater" color="#F59E0B" onClick={() => setIsSurgeryModalOpen(true)} />
        <QuickActionCard icon={<FaFileMedical />} title="Issue Certificate" subtitle="Generate health clearance" color="#6366F1" onClick={() => setIsCertModalOpen(true)} />
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
          onEdit={async (row) => {
            await medicalService.updateMedicalExam(row.recordId || row.id || "1", row);
            fetchRecords();
          }}
          onDelete={async (row) => {
            await medicalService.updateMedicalExam(row.recordId || row.id || "1", { ...row, status: "Archived" });
            fetchRecords();
          }}
        />
      </div>

      {/* Record Examination Modal */}
      <Modal isOpen={isExamModalOpen} onClose={() => setIsExamModalOpen(false)} title="Log Clinical Examination">
        <form onSubmit={handleCreateExam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Name & ID *</label>
            <input type="text" required placeholder="e.g. Max (DOG-402)" value={examForm.petName} onChange={(e) => setExamForm({ ...examForm, petName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Diagnosis *</label>
            <input type="text" required placeholder="e.g. Malnutrition & Dehydration" value={examForm.diagnosis} onChange={(e) => setExamForm({ ...examForm, diagnosis: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Treatment Plan</label>
            <input type="text" placeholder="e.g. IV Fluids & Antibiotics" value={examForm.treatment} onChange={(e) => setExamForm({ ...examForm, treatment: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
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
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Name & ID *</label>
            <input type="text" required placeholder="e.g. Bella (DOG-415)" value={vaccineForm.petName} onChange={(e) => setVaccineForm({ ...vaccineForm, petName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Vaccine Name</label>
            <input type="text" value={vaccineForm.vaccineName} onChange={(e) => setVaccineForm({ ...vaccineForm, vaccineName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsVaccineModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Log Vaccine"}</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Surgery Modal */}
      <Modal isOpen={isSurgeryModalOpen} onClose={() => setIsSurgeryModalOpen(false)} title="Schedule Surgical Operation">
        <form onSubmit={handleScheduleSurgery} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Name & ID *</label>
            <input type="text" required placeholder="e.g. Charlie (DOG-399)" value={surgeryForm.petName} onChange={(e) => setSurgeryForm({ ...surgeryForm, petName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Procedure Name</label>
            <input type="text" value={surgeryForm.procedure} onChange={(e) => setSurgeryForm({ ...surgeryForm, procedure: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsSurgeryModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Booking..." : "Schedule Surgery"}</button>
          </div>
        </form>
      </Modal>

      {/* Issue Certificate Modal */}
      <Modal isOpen={isCertModalOpen} onClose={() => setIsCertModalOpen(false)} title="Issue Medical Clearance Certificate">
        <form onSubmit={handleIssueCert} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Name & ID *</label>
            <input type="text" required placeholder="e.g. Daisy (DOG-420)" value={certForm.petName} onChange={(e) => setCertForm({ ...certForm, petName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsCertModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Generating..." : "Generate Certificate"}</button>
          </div>
        </form>
      </Modal>



      {/* Edit Medical Record Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Medical Exam Record">
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Diagnosis</label>
            <input type="text" value={editForm.diagnosis} onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Treatment</label>
            <input type="text" value={editForm.treatment} onChange={(e) => setEditForm({ ...editForm, treatment: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Medical Record Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Medical Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to delete medical record <strong>{selectedRecord?.recordId}</strong> for {selectedRecord?.petName}?
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
