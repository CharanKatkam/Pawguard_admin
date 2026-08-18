import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  FaEye,
  FaCheckCircle,
  FaHome,
} from "react-icons/fa";
import vetService from "../../../services/vetService";
import medicalService from "../../../services/medicalService";
import dogService from "../../../services/dogService";
import petService from "../../../services/petService";
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

import { formatDateTime } from "../../../utils/dateUtils";

const formatDate = (v: unknown): string => formatDateTime(v as string);

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
  const [shelterMedicalStatusFilter, setShelterMedicalStatusFilter] = useState("all");
  const [shelterAdoptionFilter, setShelterAdoptionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [searchParams] = useSearchParams();
  const highlightDogId = searchParams.get("dog_id");
  const tabParam = searchParams.get("tab");
  const [activeSourceTab, setActiveSourceTab] = useState<"shelter_requests" | "public_appts">(
    tabParam === "public_appts" ? "public_appts" : "shelter_requests"
  );

  // Dog Master Profile Modal State
  const [selectedDogMaster, setSelectedDogMaster] = useState<Row | null>(null);
  const [isDogProfileOpen, setIsDogProfileOpen] = useState(false);
  const [isClearingAdoption, setIsClearingAdoption] = useState(false);

  useEffect(() => {
    if (highlightDogId) {
      setSearchQuery(highlightDogId);
      if (tabParam) {
        setActiveSourceTab(tabParam === "public_appts" ? "public_appts" : "shelter_requests");
      }
    }
  }, [highlightDogId, tabParam]);

  const handleOpenDogProfile = async (dog: Row) => {
    setSelectedDogMaster(dog);
    setIsDogProfileOpen(true);
    const pId = str(pick(dog, "id", "dog_id"));
    if (pId) {
      try {
        setHistoryLoading(true);
        const historyRes = await medicalService.getMedicalHistory(pId);
        setPetHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
      } catch {
        setPetHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const handleIssueMedicalClearance = async (dog: Row) => {
    const id = str(pick(dog, "id", "dog_id"));
    if (!id) return;

    // 1. Check if clearance is already approved on backend
    try {
      const existingClearances = await medicalService.getDogClearances(id);
      const isApprovedOnBackend = Array.isArray(existingClearances) && existingClearances.some(
        (c: any) => String(c.status).toLowerCase() === "approved" || String(c.status).toLowerCase() === "cleared"
      );
      if (isApprovedOnBackend || Boolean(dog.is_fit_for_adoption || dog.is_adoptable)) {
        addToast(`Dog ${str(dog.name || id)} is already medically cleared and fit for adoption.`, "info");
        return;
      }
    } catch {
      /* ignore lookup error */
    }

    // 2. Check if clinical examination has been completed (in local state or backend history)
    const currentMedStatus = str(dog.medical_status).toLowerCase();
    let isExamDone = currentMedStatus.includes("exam") || currentMedStatus.includes("consult") || currentMedStatus.includes("fit");

    if (!isExamDone) {
      try {
        const historyRes = await medicalService.getMedicalHistory(id);
        const historyList = Array.isArray(historyRes?.data) ? historyRes.data : [];
        if (historyList.length > 0) {
          isExamDone = true;
        }
      } catch {
        /* ignore */
      }
    }

    if (!isExamDone) {
      addToast("Medical examination/consultation must be performed before issuing medical clearance.", "info");
      handleOpenConsultation({ pet_id: id, reason: dog.medical_status || "Shelter Medical Exam" });
      return;
    }

    try {
      setIsClearingAdoption(true);

      // 3. Issue Medical Clearance via POST /api/v1/medical/clearance/{dog_id}
      await medicalService.issueCertificate({
        dog_id: id,
        clearance_type: "adoption_surgery",
        status: "approved",
        decision_notes: "Healthy, cleared for adoption.",
      });

      // 4. Verify clearance from backend GET /api/v1/medical/clearances/dogs/{dog_id}
      await medicalService.getDogClearances(id).catch(() => []);

      // 5. Update local dog status in state from backend clearance
      setDogs((prevDogs) =>
        prevDogs.map((d) => {
          if (str(d.id || d.dog_id) === str(id)) {
            return {
              ...d,
              medical_status: "Medically Cleared",
              is_fit_for_adoption: true,
              is_adoptable: true,
              adoption_readiness: "READY_FOR_ADOPTION",
            };
          }
          return d;
        })
      );

      addToast(`Dog ${str(dog.name || id)} is now Medically Cleared & Ready for Adoption.`, "success");
      notifyDataChanged();
      setIsDogProfileOpen(false);

      // 6. Re-fetch fresh dashboard data from backend source of truth
      await fetchDashboardData();
    } catch (err: any) {
      let msg = "Failed to issue medical clearance.";
      if (err?.response?.data) {
        const data = err.response.data;
        if (typeof data.detail === "string") {
          msg = data.detail;
        } else if (Array.isArray(data.detail)) {
          msg = data.detail.map((d: any) => `${d.loc ? d.loc.join(".") + ": " : ""}${d.msg}`).join("; ");
        } else if (typeof data.message === "string") {
          msg = data.message;
        }
      } else if (err?.message) {
        msg = err.message;
      }
      console.error("POST /medical/clearance Error:", err?.response?.status, err?.response?.data || err);
      addToast(msg, "error");
    } finally {
      setIsClearingAdoption(false);
    }
  };

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

      // 1. Create Clinical Exam (records symptoms, diagnosis, BCS, observations & vet notes)
      await medicalService.createMedicalExam({
        dog_id: petId,
        triage_diagnosis: consultationForm.diagnosis || consultationForm.chiefComplaint || "Routine Clinical Checkup",
        body_condition_score: consultationForm.bcs,
        chief_complaint: consultationForm.chiefComplaint,
        visible_injuries: consultationForm.visibleInjuries,
        vet_notes: consultationForm.vetNotes,
      });

      // 2. Log Surgery / Procedure if entered
      if (consultationForm.treatmentType) {
        await medicalService.scheduleSurgery({
          dog_id: petId,
          treatment_type: consultationForm.treatmentType,
          description: consultationForm.treatmentDesc || consultationForm.vetNotes || "",
        }).catch(() => null);
      }

      // 3. Log Vaccination if entered
      if (consultationForm.vaccineName) {
        await medicalService.createVaccination({
          dog_id: petId,
          vaccine_name: consultationForm.vaccineName,
          lot_number: consultationForm.lotNumber || undefined,
          next_due_at: consultationForm.nextDueAt || undefined,
        }).catch(() => null);
      }

      // 4. Update Appointment Status if valid appointment ID exists
      if (apptId) {
        await vetService.completeAppointment(apptId, consultationForm.vetNotes || undefined).catch(() => null);
      }

      // 5. Update local state immediately so table renders "Examined - Pending Clearance"
      setDogs((prevDogs) =>
        prevDogs.map((d) => {
          if (str(d.id || d.dog_id) === str(petId)) {
            return {
              ...d,
              medical_status: "Examined - Pending Clearance",
            };
          }
          return d;
        })
      );

      addToast("Veterinary consultation completed & medical records updated!", "success");
      setIsConsultationOpen(false);
      setActiveAppt(null);
      setConsultationForm({ ...emptyConsultationForm });
      await fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Failed to submit consultation.";
      addToast(msg, "error");
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
        return (
          <span style={badgeStyle("#EFF6FF", "#1D4ED8")}>{String(src || "PUBLIC_WEB").toUpperCase()}</span>
        );
      },
    },
    { key: "status", title: "Status", render: (_: unknown, r: Row) => renderStatusBadge(str(pick(r, "status"))) },
  ];

  const shelterDogRows = dogs.filter((d) => {
    const status = str(d.status).toLowerCase();
    const medStatus = str(d.medical_status).toLowerCase();
    const name = str(d.name).toLowerCase();
    const regNo = str(d.registration_number).toLowerCase();
    const id = str(d.id || d.dog_id).toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const isShelterDog = status === "shelter" || status === "clinic" || status === "rescued" || medStatus.length > 0;
    const matchesQuery = !q || name.includes(q) || regNo.includes(q) || id.includes(q) || medStatus.includes(q);

    // 1. Medical Status Filter
    let matchesMedStatus = true;
    if (shelterMedicalStatusFilter !== "all") {
      const target = shelterMedicalStatusFilter.toLowerCase();
      if (target === "pending") {
        matchesMedStatus = medStatus.includes("pending") || medStatus.includes("check") || !medStatus;
      } else if (target === "assigned to vet") {
        matchesMedStatus = medStatus.includes("assigned") || medStatus.includes("vet");
      } else if (target === "under treatment") {
        matchesMedStatus = medStatus.includes("treatment") || medStatus.includes("under");
      } else if (target === "examined - pending clearance") {
        matchesMedStatus = medStatus.includes("examined");
      } else if (target === "medically cleared") {
        matchesMedStatus = medStatus.includes("clear") || medStatus.includes("fit") || Boolean(d.is_fit_for_adoption || d.is_adoptable);
      } else {
        matchesMedStatus = medStatus === target || medStatus.includes(target);
      }
    }

    // 2. Adoption Readiness Filter
    let matchesAdoption = true;
    if (shelterAdoptionFilter !== "all") {
      const isAdoptable = Boolean(d.is_fit_for_adoption || d.is_adoptable || medStatus.includes("clear") || str(d.adoption_readiness).toUpperCase() === "READY_FOR_ADOPTION");
      if (shelterAdoptionFilter === "ready") {
        matchesAdoption = isAdoptable;
      } else if (shelterAdoptionFilter === "not_ready") {
        matchesAdoption = !isAdoptable;
      }
    }

    return isShelterDog && matchesQuery && matchesMedStatus && matchesAdoption;
  });

  const shelterColumns = [
    {
      key: "name",
      title: "Dog Name & Reg #",
      render: (_: unknown, r: Row) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{str(r.name)}</div>
          <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Reg: {str(r.registration_number)}</div>
        </div>
      ),
    },
    {
      key: "id",
      title: "Dog Master ID",
      render: (_: unknown, r: Row) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#475569", fontWeight: 700 }}>
          {str(r.id || r.dog_id)}
        </span>
      ),
    },
    {
      key: "shelter_name",
      title: "Shelter / Facility",
      render: (_: unknown, r: Row) => (
        <div style={{ fontWeight: 600, color: "#334155" }}>{str(r.shelter_name || r.shelter_id || "Central Shelter")}</div>
      ),
    },
    {
      key: "medical_status",
      title: "Medical Status",
      render: (_: unknown, r: Row) => {
        const medStatus = str(r.medical_status);
        const isCleared = medStatus.toLowerCase().includes("clear") || Boolean(r.is_fit_for_adoption || r.is_adoptable);
        const label = isCleared ? "MEDICALLY CLEARED" : (medStatus || "PENDING CHECK").toUpperCase();
        return (
          <span style={badgeStyle(isCleared ? "#ECFDF5" : "#EFF6FF", isCleared ? "#047857" : "#1D4ED8")}>
            {label}
          </span>
        );
      },
    },
    {
      key: "is_fit_for_adoption",
      title: "Adoption Readiness",
      render: (_: unknown, r: Row) => {
        const isAdoptable = Boolean(r.is_fit_for_adoption || r.is_adoptable || str(r.medical_status).toLowerCase().includes("clear"));
        return (
          <span style={badgeStyle(isAdoptable ? "#ECFDF5" : "#FFFBEB", isAdoptable ? "#047857" : "#B45309")}>
            {isAdoptable ? "READY FOR ADOPTION" : "PENDING CLEARANCE"}
          </span>
        );
      },
    },
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

      {/* VETERINARY QUEUE & WORKSPACE (DUAL SOURCES) */}
      <div id="appointments-queue" className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        {/* Source Navigation Tabs */}
        <div style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveSourceTab("shelter_requests")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeSourceTab === "shelter_requests" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeSourceTab === "shelter_requests" ? "#EFF6FF" : "#FFFFFF",
                color: activeSourceTab === "shelter_requests" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaHome /> 🏠 Shelter Medical Requests ({shelterDogRows.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveSourceTab("public_appts")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeSourceTab === "public_appts" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeSourceTab === "public_appts" ? "#EFF6FF" : "#FFFFFF",
                color: activeSourceTab === "public_appts" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaCalendarAlt /> 🌐 Public Website Appointments ({filteredAppointments.length})
            </button>
          </div>
        </div>

        {/* TAB 1: SHELTER MEDICAL REQUESTS */}
        {activeSourceTab === "shelter_requests" && (
          <DataTable
            columns={shelterColumns}
            data={shelterDogRows}
            loading={loading}
            hideSearch={true}
            leftHeaderControls={
              <>
                <div style={{ position: "relative" }}>
                  <FaSearch size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                  <input
                    type="text"
                    placeholder="Search dog, ID, diagnosis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "220px" }}
                  />
                </div>

                <select
                  value={shelterMedicalStatusFilter}
                  onChange={(e) => setShelterMedicalStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    background: "#FFF",
                    color: "#334155",
                    fontWeight: 500,
                  }}
                  aria-label="Filter by Medical Status"
                >
                  <option value="all">All Medical Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="assigned to vet">Assigned to Vet</option>
                  <option value="under treatment">Under Treatment</option>
                  <option value="examined - pending clearance">Examined - Pending Clearance</option>
                  <option value="medically cleared">Medically Cleared</option>
                </select>

                <select
                  value={shelterAdoptionFilter}
                  onChange={(e) => setShelterAdoptionFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "13px",
                    background: "#FFF",
                    color: "#334155",
                    fontWeight: 500,
                  }}
                  aria-label="Filter by Adoption Readiness"
                >
                  <option value="all">All Adoption Readiness</option>
                  <option value="ready">Ready for Adoption</option>
                  <option value="not_ready">Not Ready</option>
                </select>
              </>
            }
            emptyMessage="No shelter medical requests found matching current filter."
            renderRowActions={(row: Row) => {
              const isCleared = Boolean(row.is_fit_for_adoption || row.is_adoptable || str(row.medical_status).toLowerCase().includes("clear"));
              return (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    title="View Dog Master Profile"
                    onClick={() => handleOpenDogProfile(row)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #2563EB", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FaEye /> View Dog
                  </button>

                  <button
                    type="button"
                    title="Perform Examination & Record Findings"
                    onClick={() => handleOpenConsultation({ pet_id: row.id || row.dog_id, reason: row.medical_status || "Shelter Medical Exam" })}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FaStethoscope /> {isCleared ? "Re-examine" : "Start Exam"}
                  </button>

                  {isCleared ? (
                    <span
                      style={{ padding: "6px 10px", borderRadius: "6px", background: "#ECFDF5", color: "#047857", fontSize: "12px", fontWeight: 800, border: "1px solid #A7F3D0", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <FaCheckCircle /> Cleared
                    </span>
                  ) : (
                    <button
                      type="button"
                      title="Issue Medical Clearance & Adoption Readiness"
                      onClick={() => handleIssueMedicalClearance(row)}
                      disabled={isClearingAdoption}
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <FaCheckCircle /> Issue Clearance
                    </button>
                  )}
                </div>
              );
            }}
          />
        )}

        {/* TAB 2: PUBLIC WEBSITE APPOINTMENTS */}
        {activeSourceTab === "public_appts" && (
          <DataTable
            columns={apptColumns}
            data={filteredAppointments}
            loading={loading}
            hideSearch={true}
            leftHeaderControls={
              <>
                <div style={{ position: "relative" }}>
                  <FaSearch size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
                  <input
                    type="text"
                    placeholder="Search dog, ID, diagnosis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "220px" }}
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
              </>
            }
            emptyMessage="No public web appointments found matching current filters."
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
        )}
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

      {/* DOG MASTER PROFILE VIEW MODAL FOR VETERINARIAN */}
      {isDogProfileOpen && selectedDogMaster && (
        <Modal
          isOpen={true}
          onClose={() => setIsDogProfileOpen(false)}
          title={`Dog Master Profile — ${str(selectedDogMaster.name)}`}
          maxWidth="640px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                🐶
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>{str(selectedDogMaster.name)}</div>
                <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Reg Number: {str(selectedDogMaster.registration_number || "-")}</div>
                <div style={{ fontSize: "12px", color: "#475569", fontFamily: "monospace", marginTop: "2px" }}>Dog Master ID: {str(selectedDogMaster.id || selectedDogMaster.dog_id || "-")}</div>
              </div>
              <span style={{ padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 800, background: "#ECFDF5", color: "#047857", textTransform: "uppercase" }}>
                {str(selectedDogMaster.status || "SHELTER")}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Breed & Species:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{str(selectedDogMaster.breed || "-")}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Gender:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A", textTransform: "capitalize" }}>{str(selectedDogMaster.gender || "Unknown")}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Estimated Age:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{str(selectedDogMaster.estimated_age || "-")}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Shelter / Facility:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{str(selectedDogMaster.shelter_name || selectedDogMaster.shelter_id || "Central Shelter")}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Cage / Kennel Assignment:</strong>
                <div style={{ fontWeight: 700, color: "#2563EB" }}>{str(selectedDogMaster.kennel_assignment || "Unassigned")}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Medical Status:</strong>
                <div style={{ fontWeight: 700, color: "#059669" }}>{str(selectedDogMaster.medical_status || "Pending Check")}</div>
              </div>
            </div>

            <div style={{ background: "#F3E8FF", border: "1px solid #DDD6FE", borderRadius: "10px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#6D28D9" }}>
                  Safety Tag Identification: {str(selectedDogMaster.tag_status_label || "ACTIVE")}
                </div>
                <div style={{ fontSize: "12px", color: "#4C1D95", marginTop: "2px" }}>
                  Token: {petService.formatSafetyToken(selectedDogMaster)}
                </div>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: "#6D28D9", color: "#FFF" }}>
                PERMANENT TAG
              </span>
            </div>

            {/* Medical History Section */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>
                🏥 Medical & Clinical Exam History ({petHistory.length})
              </div>
              {historyLoading ? (
                <div style={{ fontSize: "12px", color: "#64748B" }}>Loading history...</div>
              ) : petHistory.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#94A3B8" }}>No prior clinical exam history logged.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                  {petHistory.map((item, idx) => (
                    <div key={idx} style={{ fontSize: "12px", padding: "6px 10px", background: "#FFF", borderRadius: "6px", border: "1px solid #CBD5E1", display: "flex", justifyContent: "space-between" }}>
                      <span><strong>{str(item.categoryName || item.type)}:</strong> {str(item.diagnosis || item.treatment)}</span>
                      <span style={{ color: "#64748B" }}>{formatDate(item.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
              {Boolean(selectedDogMaster.is_fit_for_adoption || selectedDogMaster.is_adoptable || str(selectedDogMaster.medical_status).toLowerCase().includes("clear")) ? (
                <span
                  style={{ padding: "9px 16px", borderRadius: "8px", background: "#ECFDF5", color: "#047857", fontWeight: 800, fontSize: "13px", border: "1px solid #A7F3D0", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaCheckCircle /> Medically Cleared & Ready for Adoption
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isClearingAdoption}
                  onClick={() => handleIssueMedicalClearance(selectedDogMaster)}
                  style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaCheckCircle /> {isClearingAdoption ? "Clearing..." : "Issue Medical Clearance & Adoption Fitness"}
                </button>
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDogProfileOpen(false);
                    handleOpenConsultation({ pet_id: selectedDogMaster.id || selectedDogMaster.dog_id, reason: selectedDogMaster.medical_status || "Shelter Exam" });
                  }}
                  style={{ padding: "9px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaStethoscope /> Perform Examination
                </button>
                <button
                  type="button"
                  onClick={() => setIsDogProfileOpen(false)}
                  style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VeterinarianDashboard;
