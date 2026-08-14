import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import Modal from "../../../components/common/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaStethoscope,
  FaSyringe,
  FaFileMedical,
  FaExclamationCircle,
  FaCalendarAlt,
  FaCheck,
  FaBan,
  FaSearch,
  FaUserMd,
  FaHistory,
  FaSync,
  FaHeartbeat,
} from "react-icons/fa";
import vetService from "../../../services/vetService";
import medicalService from "../../../services/medicalService";
import dogService from "../../../services/dogService";
import { useDataSync, notifyDataChanged } from "../../../utils/dataSync";

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

const pick = (row: Row, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const formatDate = (v: unknown): string => {
  if (!v) return "-";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
};

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  display: "inline-block",
  textTransform: "uppercase",
});

const emptyConsultationForm = {
  chiefComplaint: "",
  diagnosis: "",
  bcs: 5,
  visibleInjuries: "",
  treatmentType: "",
  treatmentDesc: "",
  vaccineName: "",
  lotNumber: "",
  nextDueAt: "",
  vetNotes: "",
};

const VeterinarianDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<Row[]>([]);
  const [dogs, setDogs] = useState<Row[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cancel Appointment Modal State
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Consultation Modal State
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState<Row | null>(null);
  const [consultationTab, setConsultationTab] = useState<"exam" | "history" | "treatment" | "vaccine">("exam");
  const [petHistory, setPetHistory] = useState<Row[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Consultation Form State
  const [consultationForm, setConsultationForm] = useState({ ...emptyConsultationForm });
  const [isSubmittingConsultation, setIsSubmittingConsultation] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [apptsRes, recordsRes, dogsRes] = await Promise.all([
        vetService.getAppointments({ page: 1, page_size: 100 }).catch(() => ({ data: [] })),
        medicalService.getMedicalRecords().catch(() => ({ data: [] })),
        dogService.getAllDogs().catch(() => ({ data: [] })),
      ]);

      const apptList = Array.isArray(apptsRes?.data) ? apptsRes.data : [];
      const recordList = Array.isArray(recordsRes?.data) ? recordsRes.data : [];
      const dogList = Array.isArray(dogsRes?.data) ? dogsRes.data : [];

      setAppointments(apptList);
      setMedicalRecords(recordList);
      setDogs(dogList);
    } catch (err: any) {
      console.error("Veterinarian Dashboard Fetch Error:", err);
      setError("Failed to load veterinary station data. Access may be restricted.");
    } finally {
      setLoading(false);
    }
  }, []);

  useDataSync(fetchDashboardData);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const dogName = (petId: unknown): string => {
    const match = dogs.find((d) => str(d.id) === str(petId) || str(d.dog_id) === str(petId));
    return match ? str(match.name) || str(petId) : petId ? str(petId) : "-";
  };

  const getPetRecord = (petId: unknown): Row | null => {
    return dogs.find((d) => str(d.id) === str(petId) || str(d.dog_id) === str(petId)) || null;
  };

  const ownerName = (r: Row): string => {
    const val = pick(r, "owner_name", "user_name", "reporter_name", "owner_id", "user_id");
    return str(val) || "App User";
  };

  const clinicName = (r: Row): string => {
    const val = pick(r, "clinic_name", "clinic", "clinic_id");
    return str(val) || "Central Veterinary Clinic";
  };

  // Appointment Actions
  const handleConfirm = async (row: Row) => {
    const id = str(pick(row, "id", "appointment_id"));
    if (!id) return;
    try {
      setConfirmingId(id);
      await vetService.confirmAppointment(id);
      addToast("Appointment confirmed.", "success");
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to confirm appointment.", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const id = str(pick(cancelTarget, "id", "appointment_id"));
    if (!id) return;
    try {
      setIsCancelling(true);
      await vetService.cancelAppointment(id, cancelReason.trim() || undefined);
      addToast("Appointment cancelled.", "success");
      setCancelTarget(null);
      setCancelReason("");
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to cancel appointment.", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  // Consultation Modal Actions
  const handleOpenConsultation = async (appt: Row) => {
    setActiveAppt(appt);
    setConsultationForm({
      ...emptyConsultationForm,
      chiefComplaint: str(pick(appt, "reason", "notes")),
    });
    setConsultationTab("exam");
    setIsConsultationOpen(true);

    const petId = str(pick(appt, "pet_id", "dog_id", "animal_id"));
    if (petId) {
      try {
        setHistoryLoading(true);
        const historyRes = await medicalService.getMedicalHistory(petId);
        setPetHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
      } catch {
        setPetHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    } else {
      setPetHistory([]);
    }
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppt) return;
    const apptId = str(pick(activeAppt, "id", "appointment_id"));
    const petId = str(pick(activeAppt, "pet_id", "dog_id", "animal_id"));

    if (!petId) {
      addToast("Patient Pet ID is missing from appointment record.", "error");
      return;
    }

    try {
      setIsSubmittingConsultation(true);

      // 1. Create Clinical Exam if diagnosis or complaint provided
      if (consultationForm.diagnosis || consultationForm.chiefComplaint) {
        await medicalService.createMedicalExam({
          dog_id: petId,
          triage_diagnosis: consultationForm.diagnosis || consultationForm.chiefComplaint || "Routine Checkup",
          body_condition_score: consultationForm.bcs,
          treatment: [consultationForm.visibleInjuries, consultationForm.vetNotes].filter(Boolean).join("; "),
        });
      }

      // 2. Log Surgery / Procedure if entered
      if (consultationForm.treatmentType) {
        await medicalService.scheduleSurgery({
          dog_id: petId,
          treatment_type: consultationForm.treatmentType,
          description: consultationForm.treatmentDesc || consultationForm.vetNotes || "",
        });
      }

      // 3. Log Vaccination if entered
      if (consultationForm.vaccineName) {
        await medicalService.createVaccination({
          dog_id: petId,
          vaccine_name: consultationForm.vaccineName,
          lot_number: consultationForm.lotNumber || undefined,
          next_due_at: consultationForm.nextDueAt || undefined,
        });
      }

      // 4. Update Appointment Status to Completed on Backend
      await vetService.completeAppointment(apptId, consultationForm.vetNotes || undefined);

      addToast("Veterinary consultation completed & medical records updated!", "success");
      setIsConsultationOpen(false);
      setActiveAppt(null);
      setConsultationForm({ ...emptyConsultationForm });
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to submit consultation.", "error");
    } finally {
      setIsSubmittingConsultation(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a) => {
    const status = str(pick(a, "status")).toLowerCase();
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    const petName = dogName(pick(a, "pet_id"));
    const id = str(pick(a, "id", "appointment_id"));
    const reason = str(pick(a, "reason"));
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || petName.toLowerCase().includes(q) || id.toLowerCase().includes(q) || reason.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const confirmedCount = appointments.filter((a) => str(pick(a, "status")).toLowerCase() === "confirmed").length;
  const pendingCount = appointments.filter((a) => {
    const s = str(pick(a, "status")).toLowerCase();
    return s === "requested" || s === "pending";
  }).length;
  const icuCount = medicalRecords.filter((r) => {
    const st = str(r.status || r.diagnosis || r.treatment).toLowerCase();
    return st.includes("critical") || st.includes("post-op") || st.includes("surgery");
  }).length;
  const vaccineCount = medicalRecords.filter((r) => str(r.entityType || r.categoryName || r.type).toLowerCase().includes("vaccin")).length;

  const stats = [
    {
      title: "Appointments Today",
      value: loading ? "..." : String(appointments.length),
      trend: `${pendingCount} Pending / ${confirmedCount} Confirmed`,
      color: "#2563EB",
      icon: <FaCalendarAlt />,
      onClick: () => {
        setStatusFilter("all");
        const el = document.getElementById("appointments-queue");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Active ICU Patients",
      value: loading ? "..." : String(icuCount),
      trend: "High Priority Watch",
      color: "#EF4444",
      icon: <FaExclamationCircle />,
      onClick: () => {
        const el = document.getElementById("icu-queue");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Vaccinations Logged",
      value: loading ? "..." : String(vaccineCount),
      trend: "Immunization Suite",
      color: "#F59E0B",
      icon: <FaSyringe />,
      onClick: () => navigate("/medical-reminders"),
    },
    {
      title: "Cleared & Healthy",
      value: loading ? "..." : String(medicalRecords.length),
      trend: "Medical History Files",
      color: "#10B981",
      icon: <FaFileMedical />,
      onClick: () => navigate("/medical-records"),
    },
  ];

  const renderStatusBadge = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s === "confirmed" || s === "completed") return <span style={badgeStyle("#DCFCE7", "#166534")}>{statusStr}</span>;
    if (s === "requested" || s === "pending") return <span style={badgeStyle("#FEF3C7", "#92400E")}>{statusStr}</span>;
    if (s === "cancelled") return <span style={badgeStyle("#FEE2E2", "#991B1B")}>{statusStr}</span>;
    return <span style={badgeStyle("#F1F5F9", "#475569")}>{statusStr}</span>;
  };

  const apptColumns = [
    { key: "id", title: "Appt ID", render: (v: unknown, r: Row) => <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{str(v || pick(r, "appointment_id") || "-")}</span> },
    {
      key: "pet",
      title: "Pet Name & ID",
      render: (_: unknown, r: Row) => {
        const id = pick(r, "pet_id", "dog_id");
        return (
          <div>
            <div style={{ fontWeight: 700, color: "#0F172A" }}>{dogName(id)}</div>
            <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>ID: {str(id)}</div>
          </div>
        );
      },
    },
    { key: "owner", title: "Owner / Submitter", render: (_: unknown, r: Row) => ownerName(r) },
    { key: "clinic", title: "Veterinary Clinic", render: (_: unknown, r: Row) => clinicName(r) },
    { key: "date", title: "Date & Time", render: (_: unknown, r: Row) => formatDate(pick(r, "starts_at", "date", "created_at")) },
    { key: "reason", title: "Reason for Visit", render: (v: unknown) => str(v) || "-" },
    {
      key: "source",
      title: "Source / Channel",
      render: (_: unknown, r: Row) => {
        const src = pick(r, "source", "channel", "platform", "booking_source");
        return src ? (
          <span style={badgeStyle("#EFF6FF", "#1D4ED8")}>{String(src).toUpperCase()}</span>
        ) : null;
      },
    },
    { key: "status", title: "Status", render: (_: unknown, r: Row) => renderStatusBadge(str(pick(r, "status"))) },
  ];

  return (
    <div>
      {/* Hero Header */}
      <div
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800 }}>
          Veterinary Medical Station & Consultation Workspace
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Authorized clinical station: receive appointments, perform medical check-ups, review pet medical history, log diagnoses & prescriptions, and update health status.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaStethoscope />} title="Medical Records" subtitle="Exams & Diagnoses" color="#2563EB" onClick={() => navigate("/medical-records")} />
        <QuickActionCard icon={<FaSyringe />} title="Vaccination Suite" subtitle="Booster Reminders" color="#10B981" onClick={() => navigate("/medical-reminders")} />
        <QuickActionCard icon={<FaFileMedical />} title="Issue Certificate" subtitle="Medical clearance" color="#6366F1" onClick={() => navigate("/certificates")} />
        <QuickActionCard icon={<FaUserMd />} title="Vet Directory" subtitle="Browse Partner Clinics" color="#8B5CF6" onClick={() => navigate("/vet-directory")} />
      </div>

      {/* Headline Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* APPOINTMENTS & CONSULTATION QUEUE */}
      <div id="appointments-queue" className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              🩺 Appointments & Consultation Queue
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Appointments submitted by PawGuard users through supported web and mobile channels
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <FaSearch size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
              <input
                type="text"
                placeholder="Search pet, ID, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "200px" }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
            >
              <option value="all">All Statuses</option>
              <option value="requested">Requested / Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              type="button"
              onClick={fetchDashboardData}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
            >
              <FaSync /> Sync Queue
            </button>
          </div>
        </div>

        <DataTable
          columns={apptColumns}
          data={filteredAppointments}
          loading={loading}
          emptyMessage="No veterinary appointments found matching current filters."
          renderRowActions={(row: Row) => {
            const status = str(pick(row, "status")).toLowerCase();
            const id = str(pick(row, "id", "appointment_id"));
            const isFinished = status === "completed" || status === "cancelled";

            return (
              <div style={{ display: "flex", gap: "6px" }}>
                {(status === "requested" || status === "pending") && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(row)}
                    disabled={confirmingId === id}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #10B981", background: "#ECFDF5", color: "#047857", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FaCheck /> Confirm
                  </button>
                )}

                {!isFinished && (
                  <button
                    type="button"
                    onClick={() => handleOpenConsultation(row)}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaStethoscope /> Start Consultation
                  </button>
                )}

                {!isFinished && (
                  <button
                    type="button"
                    onClick={() => setCancelTarget(row)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #FCA5A5", background: "#FFF", color: "#DC2626", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FaBan /> Cancel
                  </button>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* ACTIVE CLINICAL PATIENTS / ICU QUEUE */}
      <div id="icu-queue" className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
              🏥 Recent Medical Exams & Intensive Care Records
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Attending veterinary exam history and active treatment logs
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/medical-records")}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#2563EB", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            Full Medical Archive &rarr;
          </button>
        </div>

        <DataTable
          columns={[
            { key: "recordId", title: "Record ID", render: (v: unknown) => <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{str(v)}</span> },
            { key: "petName", title: "Pet Name & ID" },
            { key: "categoryName", title: "Category" },
            { key: "diagnosis", title: "Primary Diagnosis / Exam" },
            { key: "treatment", title: "Treatment / Notes" },
            { key: "date", title: "Date Recorded", render: (v: unknown) => formatDate(v) },
          ]}
          data={medicalRecords.slice(0, 10)}
          loading={loading}
          emptyMessage="No medical exam records found."
        />
      </div>

      {/* CANCEL APPOINTMENT MODAL */}
      {cancelTarget && (
        <Modal
          isOpen={true}
          onClose={() => { setCancelTarget(null); setCancelReason(""); }}
          title="Cancel Veterinary Appointment"
          maxWidth="440px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#334155" }}>
              Are you sure you want to cancel the appointment for <strong>{dogName(pick(cancelTarget, "pet_id"))}</strong>?
            </p>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Cancellation Reason (optional)</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={() => setCancelTarget(null)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>Back</button>
              <button type="button" onClick={handleCancel} disabled={isCancelling} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 700 }}>
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* VETERINARY CHECK-UP & CONSULTATION MODAL */}
      {isConsultationOpen && activeAppt && (
        <Modal
          isOpen={true}
          onClose={() => { setIsConsultationOpen(false); setActiveAppt(null); }}
          title={`Veterinary Consultation — ${dogName(pick(activeAppt, "pet_id"))}`}
          maxWidth="720px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Patient Info Banner */}
            {(() => {
              const pId = pick(activeAppt, "pet_id", "dog_id");
              const petRec = getPetRecord(pId);
              return (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{dogName(pId)}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Dog ID: {str(pId)}</div>
                    <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
                      <strong>Breed:</strong> {petRec?.breed ? str(petRec.breed) : "-"} &bull; <strong>Gender:</strong> {petRec?.gender ? str(petRec.gender) : "-"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      <strong>Appt Date:</strong> {formatDate(pick(activeAppt, "starts_at", "date"))}
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                      <strong>Owner / Submitter:</strong> {ownerName(activeAppt)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                      <strong>Reason for Visit:</strong> {str(pick(activeAppt, "reason")) || "General Checkup"}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Navigation Tabs */}
            <div style={{ display: "flex", borderBottom: "2px solid #E2E8F0", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setConsultationTab("exam")}
                style={{ padding: "8px 16px", border: "none", borderBottom: consultationTab === "exam" ? "3px solid #2563EB" : "3px solid transparent", background: "none", fontWeight: 700, fontSize: "13px", color: consultationTab === "exam" ? "#2563EB" : "#64748B", cursor: "pointer" }}
              >
                <FaStethoscope /> Clinical Examination & Diagnosis
              </button>

              <button
                type="button"
                onClick={() => setConsultationTab("history")}
                style={{ padding: "8px 16px", border: "none", borderBottom: consultationTab === "history" ? "3px solid #2563EB" : "3px solid transparent", background: "none", fontWeight: 700, fontSize: "13px", color: consultationTab === "history" ? "#2563EB" : "#64748B", cursor: "pointer" }}
              >
                <FaHistory /> Medical History ({petHistory.length})
              </button>

              <button
                type="button"
                onClick={() => setConsultationTab("treatment")}
                style={{ padding: "8px 16px", border: "none", borderBottom: consultationTab === "treatment" ? "3px solid #2563EB" : "3px solid transparent", background: "none", fontWeight: 700, fontSize: "13px", color: consultationTab === "treatment" ? "#2563EB" : "#64748B", cursor: "pointer" }}
              >
                <FaHeartbeat /> Treatment / Surgery
              </button>

              <button
                type="button"
                onClick={() => setConsultationTab("vaccine")}
                style={{ padding: "8px 16px", border: "none", borderBottom: consultationTab === "vaccine" ? "3px solid #2563EB" : "3px solid transparent", background: "none", fontWeight: 700, fontSize: "13px", color: consultationTab === "vaccine" ? "#2563EB" : "#64748B", cursor: "pointer" }}
              >
                <FaSyringe /> Vaccination
              </button>
            </div>

            {/* TAB CONTENTS */}
            <form onSubmit={handleCompleteConsultation} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {consultationTab === "exam" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Chief Complaint / Symptoms *</label>
                    <input
                      type="text"
                      required
                      value={consultationForm.chiefComplaint}
                      onChange={(e) => setConsultationForm({ ...consultationForm, chiefComplaint: e.target.value })}
                      placeholder="e.g. Lethargy, loss of appetite, fever"
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Clinical Triage Diagnosis *</label>
                      <input
                        type="text"
                        required
                        value={consultationForm.diagnosis}
                        onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                        placeholder="e.g. Acute Gastroenteritis"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Body Condition (1-9)</label>
                      <select
                        value={consultationForm.bcs}
                        onChange={(e) => setConsultationForm({ ...consultationForm, bcs: Number(e.target.value) })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <option key={n} value={n}>BCS {n}/9 {n === 5 ? "(Ideal)" : n < 5 ? "(Underweight)" : "(Overweight)"}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Physical Exam Observations & Notes</label>
                    <textarea
                      rows={2}
                      value={consultationForm.visibleInjuries}
                      onChange={(e) => setConsultationForm({ ...consultationForm, visibleInjuries: e.target.value })}
                      placeholder="Visible injuries, dental health, coat condition..."
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              )}

              {consultationTab === "history" && (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {historyLoading ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "#2563EB", fontSize: "13px" }}>Loading patient medical history...</div>
                  ) : petHistory.length === 0 ? (
                    <div style={{ padding: "24px", background: "#F8FAFC", borderRadius: "8px", border: "1px dashed #CBD5E1", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                      No prior medical records logged for this pet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {petHistory.map((h, idx) => (
                        <div key={idx} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>{str(h.categoryName || h.type)}</span>
                            <span style={{ fontSize: "11px", color: "#64748B" }}>{formatDate(h.date)}</span>
                          </div>
                          <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>
                            <strong>Diagnosis:</strong> {str(h.diagnosis)} &bull; <strong>Treatment:</strong> {str(h.treatment)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {consultationTab === "treatment" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Procedure / Treatment Type</label>
                    <input
                      type="text"
                      value={consultationForm.treatmentType}
                      onChange={(e) => setConsultationForm({ ...consultationForm, treatmentType: e.target.value })}
                      placeholder="e.g. Wound Debridement or Spay Surgery"
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Treatment Description & Medication Instructions</label>
                    <textarea
                      rows={3}
                      value={consultationForm.treatmentDesc}
                      onChange={(e) => setConsultationForm({ ...consultationForm, treatmentDesc: e.target.value })}
                      placeholder="Specify medications given, dosage, frequency, and care instructions..."
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              )}

              {consultationTab === "vaccine" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Vaccine Name</label>
                    <input
                      type="text"
                      value={consultationForm.vaccineName}
                      onChange={(e) => setConsultationForm({ ...consultationForm, vaccineName: e.target.value })}
                      placeholder="e.g. Rabies Vaccine or DHPP 7-in-1"
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Lot / Serial Number</label>
                      <input
                        type="text"
                        value={consultationForm.lotNumber}
                        onChange={(e) => setConsultationForm({ ...consultationForm, lotNumber: e.target.value })}
                        placeholder="e.g. LOT-99824"
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Next Booster Due Date</label>
                      <input
                        type="date"
                        value={consultationForm.nextDueAt}
                        onChange={(e) => setConsultationForm({ ...consultationForm, nextDueAt: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Attending Veterinarian Summary Notes</label>
                <textarea
                  rows={2}
                  value={consultationForm.vetNotes}
                  onChange={(e) => setConsultationForm({ ...consultationForm, vetNotes: e.target.value })}
                  placeholder="Final clinical summary, follow-up recommendations..."
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsConsultationOpen(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingConsultation}
                  style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: isSubmittingConsultation ? "not-allowed" : "pointer" }}
                >
                  {isSubmittingConsultation ? "Saving..." : "✓ Complete Consultation & Update Records"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VeterinarianDashboard;
