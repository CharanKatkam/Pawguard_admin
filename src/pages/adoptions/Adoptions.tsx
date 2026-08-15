import { useState, useEffect, useCallback } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaHeart,
  FaUserCheck,
  FaClipboardCheck,
  FaPlus,
  FaTrash,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaHome,
  FaCalendarAlt,
  FaSearch,
  FaDog,
  FaUser,
  FaStethoscope,
  FaMedkit,
  FaExternalLinkAlt,
  FaQrcode,
  FaDownload,
} from "react-icons/fa";
import adoptionService, { toAdoptionStatus } from "../../services/adoptionService";
import dogService from "../../services/dogService";
import petService from "../../services/petService";
import medicalService from "../../services/medicalService";
import { generateQrDataUrl } from "../../utils/qrGenerator";
import { notifyDataChanged } from "../../utils/dataSync";

const StatusBadge = ({ status }: { status: string }) => {
  const s = String(status || "").toLowerCase();
  let bg = "#EFF6FF";
  let color = "#2563EB";
  let label = s.toUpperCase();

  if (s === "submitted") {
    bg = "#EFF6FF";
    color = "#2563EB";
    label = "Submitted";
  } else if (s === "screening") {
    bg = "#F3E8FF";
    color = "#7E22CE";
    label = "Screening";
  } else if (s === "interview") {
    bg = "#FEF3C7";
    color = "#D97706";
    label = "Interview";
  } else if (s === "home_check") {
    bg = "#E0E7FF";
    color = "#4338CA";
    label = "Home Visit";
  } else if (s === "approved") {
    bg = "#D1FAE5";
    color = "#047857";
    label = "Approved";
  } else if (s === "completed") {
    bg = "#DCFCE7";
    color = "#15803D";
    label = "Completed";
  } else if (s === "rejected") {
    bg = "#FEE2E2";
    color = "#B91C1C";
    label = "Rejected";
  } else if (s === "vetting") {
    bg = "#E0F2FE";
    color = "#0369A1";
    label = "Vetting";
  }

  return (
    <span
      style={{
        backgroundColor: bg,
        color,
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  boxSizing: "border-box",
};

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const res = (err as { response?: { data?: { detail?: string; message?: string } } }).response;
    if (res?.data?.detail) return res.data.detail;
    if (res?.data?.message) return res.data.message;
  }
  return fallback;
};

const Adoptions = () => {
  const [adoptions, setAdoptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Unique Dog QR Code Modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDog, setQrDog] = useState<Record<string, unknown> | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [tagStatus, setTagStatus] = useState<string>("INACTIVE");
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const [isReProvisionConfirmOpen, setIsReProvisionConfirmOpen] = useState(false);

  const openQrModal = async (dog: Record<string, unknown> | null) => {
    if (!dog) return;
    const id = String(dog.dog_id || dog.original_dog_id || (dog.companion_pet as any)?.original_dog_id || dog.id || (dog.companion_pet as any)?.id || dog.companion_pet_id || "");
    if (!id) {
      addToast("Could not determine the Dog Master ID for Safety Tag provisioning.", "error");
      return;
    }

    setQrDog(dog);
    setQrImageUrl(null);
    setQrError(null);
    setRawToken(null);
    setTagStatus("INACTIVE");
    setIsQrModalOpen(true);

    try {
      setQrLoading(true);

      // Check session or local storage strictly for authoritative raw_token
      const savedToken =
        localStorage.getItem(`pawguard_safety_tag_token_${id}`) ||
        sessionStorage.getItem(`pawguard_safety_tag_token_${id}`);
      const savedQrDataUrl = localStorage.getItem(`pawguard_safety_tag_qr_${id}`);

      if (savedToken || savedQrDataUrl) {
        if (savedToken) setRawToken(savedToken);
        const qrUrl = savedQrDataUrl || (savedToken ? await generateQrDataUrl(savedToken) : null);
        if (qrUrl) {
          setQrImageUrl(qrUrl);
          setTagStatus("ACTIVE");
        }
      }

      // Check backend metadata for Safety Tag status
      try {
        const metaRes = await petService.getSafetyTagMetadata(id);
        const metaData = metaRes?.data || metaRes;
        if (metaData?.status) {
          setTagStatus(String(metaData.status).toUpperCase());
        }
      } catch (metaErr: unknown) {
        const e = metaErr as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } } };
        const status = e?.response?.status;
        const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.message;

        if (status === 404 || (apiMsg && apiMsg.toLowerCase().includes("not found"))) {
          setQrError("Dog Master record not found. A valid Dog Master record must exist on the backend before a Safety Tag can be provisioned.");
        } else if (apiMsg) {
          setQrError(String(apiMsg));
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } } };
      const status = e?.response?.status;
      const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.message;
      if (status === 404 || (apiMsg && apiMsg.toLowerCase().includes("not found"))) {
        setQrError("Dog Master record not found. A valid Dog Master record must exist on the backend before a Safety Tag can be provisioned.");
      } else {
        setQrError(apiMsg || "Failed to load Safety Tag metadata.");
      }
    } finally {
      setQrLoading(false);
    }
  };

  const handleProvisionTag = async (forceReissue = false) => {
    if (!qrDog) return;
    const id = String(qrDog.dog_id || qrDog.original_dog_id || (qrDog.companion_pet as any)?.original_dog_id || qrDog.id || (qrDog.companion_pet as any)?.id || qrDog.companion_pet_id || "");
    if (!id) return;

    setIsProvisioning(true);
    setQrError(null);

    try {
      // POST /api/v1/dogs/{dog_id}/safety-tag (or ?force_reissue=true)
      const res = await petService.provisionSafetyTag(id, forceReissue);
      const data = res?.data || res || {};
      const token = data.raw_token || data.token || data.rawToken;

      if (!token) {
        throw new Error("Backend provisioning response did not include data.raw_token.");
      }

      setRawToken(token);
      sessionStorage.setItem(`pawguard_safety_tag_token_${id}`, token);
      localStorage.setItem(`pawguard_safety_tag_token_${id}`, token);

      const qrDataUrl = await generateQrDataUrl(token);
      localStorage.setItem(`pawguard_safety_tag_qr_${id}`, qrDataUrl);

      setQrImageUrl(qrDataUrl);
      setTagStatus("ACTIVE");
      setIsReProvisionConfirmOpen(false);

      addToast("Safety Tag Provisioned! QR generated directly from raw_token.", "success");
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { error?: { message?: string }; message?: string } } };
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || "Failed to provision Safety Tag.";
      addToast(msg, "error");
      setQrError(msg);
    } finally {
      setIsProvisioning(false);
    }
  };

  const closeQrModal = () => {
    if (qrImageUrl && qrImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(qrImageUrl);
    }
    setQrImageUrl(null);
    setQrDog(null);
    setQrError(null);
    setRawToken(null);
    setTagStatus("INACTIVE");
    setIsQrModalOpen(false);
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl || !qrDog) return;
    const name = String(qrDog.name || "dog").replace(/[^a-zA-Z0-9-_]/g, "_");
    const link = document.createElement("a");
    link.href = qrImageUrl;
    link.download = `PawGuard_SafetyTag_${name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);
  const [selectedDogDetail, setSelectedDogDetail] = useState<Record<string, unknown> | null>(null);
  const [selectedDogMedical, setSelectedDogMedical] = useState<Record<string, unknown>[]>([]);
  const [selectedDogLoading, setSelectedDogLoading] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"applicant" | "dog" | "medical">("applicant");

  // Form states
  const [newForm, setNewForm] = useState({ applicantName: "", petName: "", dogId: "", residentialStatus: "owned" });
  const [scheduleForm, setScheduleForm] = useState({ appId: "", date: "", notes: "" });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [screeningForm, setScreeningForm] = useState({ appId: "", nextStage: "interview", notes: "" });
  const [approveForm, setApproveForm] = useState({ appId: "" });
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dogs, setDogs] = useState<Record<string, unknown>[]>([]);

  const fetchAdoptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adoptionService.getAdoptions();
      if (response && Array.isArray(response.data)) {
        setAdoptions(response.data);
      }
    } catch {
      addToast("Failed to load adoption queue.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchAdoptions();
      dogService
        .getDogs({ is_adoptable: true })
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data;
          if (Array.isArray(list)) setDogs(list as Record<string, unknown>[]);
        })
        .catch(() => setDogs([]));
    });
  }, [fetchAdoptions]);

  const openDetailsModal = async (
    appRow: Record<string, unknown>,
    initialTab: "applicant" | "dog" | "medical" = "applicant"
  ) => {
    try {
      setSelectedApp(appRow);
      setActiveDetailTab(initialTab);
      setIsDetailsModalOpen(true);
      setSelectedDogDetail(null);
      setSelectedDogMedical([]);
      setSelectedDogLoading(true);

      const appId = String(appRow.id || appRow.applicationId || "");
      let currentApp = appRow;
      if (appId) {
        const fullDetails = await adoptionService.getAdoptionById(appId);
        if (fullDetails) {
          currentApp = fullDetails;
          setSelectedApp(fullDetails);
        }
      }

      const dogId = String(
        currentApp.dog_id ||
        currentApp.petId ||
        (currentApp.dog as Record<string, unknown> | undefined)?.id ||
        ""
      );

      if (dogId) {
        const [dogRes, medRes] = await Promise.allSettled([
          petService.getPetById(dogId),
          medicalService.getMedicalHistory(dogId),
        ]);

        if (dogRes.status === "fulfilled" && dogRes.value) {
          const valObj = dogRes.value as Record<string, unknown>;
          const dogData = valObj.data || valObj;
          if (dogData && typeof dogData === "object") {
            setSelectedDogDetail(dogData as Record<string, unknown>);
          }
        }

        if (medRes.status === "fulfilled" && medRes.value) {
          const valObj = medRes.value as Record<string, unknown>;
          const medData = valObj.data || valObj || [];
          if (Array.isArray(medData)) {
            setSelectedDogMedical(medData as Record<string, unknown>[]);
          }
        }
      }
    } catch {
      // Keep basic row if detail fetch fails
    } finally {
      setSelectedDogLoading(false);
    }
  };

  const handleCreateNewAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.applicantName) {
      addToast("Applicant Name is required", "error");
      return;
    }
    if (!newForm.dogId) {
      addToast("Please select the dog for this application.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await adoptionService.createAdoption({
        applicant_name: newForm.applicantName,
        pet_name: newForm.petName,
        dog_id: newForm.dogId,
        residential_status: newForm.residentialStatus,
      });
      addToast(`New adoption application logged for ${newForm.applicantName}!`, "success");
      setIsNewModalOpen(false);
      setNewForm({ applicantName: "", petName: "", dogId: "", residentialStatus: "owned" });
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to log application."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartScreeningDirect = async (appRow: Record<string, unknown>) => {
    const id = String(appRow.id || appRow.applicationId || "");
    try {
      setIsSubmitting(true);
      const adopterId = String(appRow.adopter_id || appRow.adopterId || "");
      const petName = String(appRow.petName || "selected dog");

      await adoptionService.updateAdoptionStatus(id, "screening", adopterId, petName);
      addToast(`Application #${id} moved to Screening. Review applicant & dog details below.`, "success");
      fetchAdoptions();
      notifyDataChanged();

      const updatedRow = { ...appRow, status: "screening" };
      await openDetailsModal(updatedRow, "dog");
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to move application to screening."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = screeningForm.appId || String(selectedApp?.id || selectedApp?.applicationId || "");
    if (!id) {
      addToast("Please select an application to complete screening.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const targetApp = adoptions.find((a) => String(a.id || a.applicationId) === id) || selectedApp;
      const adopterId = String(targetApp?.adopter_id || targetApp?.adopterId || "");
      const petName = String(targetApp?.petName || "selected dog");

      if (screeningForm.notes.trim()) {
        await adoptionService.updateAdoptionDetails(id, {
          vetting_officer_notes: screeningForm.notes.trim(),
        });
      }

      const nextStatus = toAdoptionStatus(screeningForm.nextStage || "interview");
      await adoptionService.updateAdoptionStatus(id, nextStatus, adopterId, petName);

      addToast(`Screening completed for application #${id}. Status updated to ${nextStatus}!`, "success");
      setIsScreeningModalOpen(false);
      setIsDetailsModalOpen(false);
      setScreeningForm({ appId: "", nextStage: "interview", notes: "" });
      setSelectedApp(null);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to complete screening."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    const appId = scheduleForm.appId || String(selectedApp?.id || selectedApp?.applicationId || "");
    if (!appId) {
      addToast("Please select an application to schedule a visit for.", "error");
      return;
    }
    if (!scheduleForm.date) {
      addToast("Please pick an inspection date.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const targetApp = adoptions.find((a) => String(a.id || a.applicationId) === appId) || selectedApp;
      const adopterId = String(targetApp?.adopter_id || targetApp?.adopterId || "");
      const petName = String(targetApp?.petName || "your pet");

      await adoptionService.scheduleHomeInspection(appId, scheduleForm.date, scheduleForm.notes, adopterId, petName);
      addToast("Home verification visit scheduled and applicant notified.", "success");
      setIsScheduleModalOpen(false);
      setIsDetailsModalOpen(false);
      setScheduleForm({ appId: "", date: "", notes: "" });
      setScheduleError(null);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      const errMsg = extractErrorMessage(err, "Failed to schedule home verification.");
      setScheduleError(errMsg);
      addToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = approveForm.appId || String(selectedApp?.id || selectedApp?.applicationId || "");
    if (!id) {
      addToast("Please select an application to approve.", "error");
      return;
    }

    const targetApp = adoptions.find((a) => String(a.id || a.applicationId) === id) || selectedApp;
    const currentStatus = String(targetApp?.status || "").toLowerCase();
    
    // Enforce screening completion rule
    if (currentStatus === "submitted" || currentStatus === "screening") {
      addToast("Cannot approve application directly from screening. Please complete screening & verification first.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const adopterId = String(targetApp?.adopter_id || targetApp?.adopterId || "");
      const petName = String(targetApp?.petName || "selected dog");

      await adoptionService.updateAdoptionStatus(id, "approved", adopterId, petName);
      addToast(`Adoption application #${id} Approved! Applicant notified.`, "success");
      setIsApproveModalOpen(false);
      setIsDetailsModalOpen(false);
      setApproveForm({ appId: "" });
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to approve application."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    const id = String(selectedApp.id || selectedApp.applicationId || "");
    try {
      setIsSubmitting(true);
      const adopterId = String(selectedApp.adopter_id || selectedApp.adopterId || "");
      const petName = String(selectedApp.petName || "selected dog");

      if (rejectionReason.trim()) {
        await adoptionService.updateAdoptionDetails(id, {
          status: "rejected",
          vetting_officer_notes: rejectionReason.trim(),
        });
      }
      await adoptionService.updateAdoptionStatus(id, "rejected", adopterId, petName);

      addToast(`Application #${id} rejected and applicant notified.`, "success");
      setIsRejectModalOpen(false);
      setIsDetailsModalOpen(false);
      setRejectionReason("");
      setSelectedApp(null);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to reject application."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    const id = String(selectedApp.id || selectedApp.applicationId || "");
    try {
      setIsSubmitting(true);
      const adopterId = String(selectedApp.adopter_id || selectedApp.adopterId || "");
      const petName = String(selectedApp.petName || "selected dog");

      await adoptionService.updateAdoptionStatus(id, "completed", adopterId, petName);
      addToast(`Adoption #${id} finalized and completed!`, "success");
      setIsCompleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedApp(null);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to complete adoption."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;
    const id = String(selectedApp.id || selectedApp.applicationId || "");
    try {
      setIsSubmitting(true);
      await adoptionService.deleteAdoption(id);
      addToast(`Deleted application #${id}`, "success");
      setIsDeleteModalOpen(false);
      setIsDetailsModalOpen(false);
      setSelectedApp(null);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to delete application."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedAdoptions = adoptions.filter(
    (a) => String(a.status).toLowerCase() === "approved" || String(a.status).toLowerCase() === "completed"
  ).length;

  const pendingApplications = adoptions.filter((a) =>
    ["submitted", "screening", "interview", "vetting"].includes(String(a.status).toLowerCase())
  ).length;

  const scheduledVerifications = adoptions.filter(
    (a) => String(a.status).toLowerCase() === "home_check" || Boolean(a.home_inspection_scheduled_at)
  ).length;

  const approvableApps = adoptions.filter((a) =>
    ["interview", "home_check", "vetting"].includes(String(a.status).toLowerCase())
  );

  const stats = [
    {
      title: "Adoptions Completed",
      value: `${completedAdoptions} Pets`,
      trend: "Approved / Completed",
      color: "#10B981",
      icon: <FaHeart />,
      onClick: () => {
        document.getElementById("adoptions-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Pending Applications",
      value: `${pendingApplications} Reviews`,
      trend: "Under Screening",
      color: "#F59E0B",
      icon: <FaClipboardCheck />,
      onClick: () => {
        document.getElementById("adoptions-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Home Verifications",
      value: `${scheduledVerifications} Visits`,
      trend: "Scheduled Inspections",
      color: "#2563EB",
      icon: <FaUserCheck />,
      onClick: () => {
        setIsScheduleModalOpen(true);
      },
    },
  ];

  const columns = [
    { key: "applicationId", title: "App ID" },
    { key: "applicantName", title: "Applicant Name" },
    { key: "petName", title: "Pet Interested" },
    { key: "date", title: "Applied Date" },
    {
      key: "status",
      title: "Decision Status",
      render: (val: unknown) => <StatusBadge status={String(val || "submitted")} />,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Adoption Requests &amp; Approvals</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          End-to-end adoption management: review questionnaires, perform screening, schedule home inspections, approve applications, and deliver real-time applicant updates.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_adoptions">
          <QuickActionCard icon={<FaPlus />} title="New Adoption Request" subtitle="Log walk-in applicant" color="#2563EB" onClick={() => setIsNewModalOpen(true)} />
        </Can>
        <Can permission="create_adoptions">
          <QuickActionCard icon={<FaUserCheck />} title="Schedule Home Verification" subtitle="Assign field coordinator" color="#10B981" onClick={() => setIsScheduleModalOpen(true)} />
        </Can>
        <Can permission="approve_adoptions">
          <QuickActionCard icon={<FaHeart />} title="Approve Adoption" subtitle="Issue certificate &amp; finalize" color="#6366F1" onClick={() => setIsApproveModalOpen(true)} />
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div id="adoptions-table-card" className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Adoption Applications Queue
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading applications...</span>}
        </div>
        <DataTable
          columns={columns}
          data={adoptions}
          module="adoptions"
          onDelete={(row) => {
            setSelectedApp(row);
            setIsDeleteModalOpen(true);
          }}
          renderRowActions={(row: Record<string, unknown>) => {
            const st = String(row.status || "").toLowerCase();
            return (
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void openDetailsModal(row)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1px solid #93C5FD",
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <FaEye /> View
                </button>

                {st === "submitted" && (
                  <button
                    type="button"
                    onClick={() => void handleStartScreeningDirect(row)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #C084FC",
                      background: "#F3E8FF",
                      color: "#7E22CE",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Start Screening
                  </button>
                )}

                {st === "screening" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(row);
                      setScreeningForm({ appId: String(row.id || row.applicationId), nextStage: "interview", notes: String(row.vetting_officer_notes || "") });
                      setIsScreeningModalOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #C084FC",
                      background: "#F3E8FF",
                      color: "#7E22CE",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FaSearch /> Complete Screening
                  </button>
                )}

                {(st === "submitted" || st === "screening" || st === "interview" || st === "vetting") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(row);
                      setScheduleForm({ appId: String(row.id || row.applicationId), date: "", notes: "" });
                      setIsScheduleModalOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #FDE68A",
                      background: "#FFFBEB",
                      color: "#D97706",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FaHome /> Schedule Visit
                  </button>
                )}

                {/* APPROVE ACTION IS GATED: Only available after screening (interview, home_check, vetting) */}
                {(st === "interview" || st === "home_check" || st === "vetting") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(row);
                      setApproveForm({ appId: String(row.id || row.applicationId) });
                      setIsApproveModalOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #6EE7B7",
                      background: "#ECFDF5",
                      color: "#059669",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FaCheckCircle /> Approve
                  </button>
                )}

                {(st === "submitted" || st === "screening" || st === "interview" || st === "home_check" || st === "vetting") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApp(row);
                      setRejectionReason("");
                      setIsRejectModalOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #FCA5A5",
                      background: "#FEF2F2",
                      color: "#DC2626",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <FaTimesCircle /> Reject
                  </button>
                )}

                {st === "approved" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApp(row);
                        setIsCompleteModalOpen(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #A7F3D0",
                        background: "#D1FAE5",
                        color: "#047857",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <FaHeart /> Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApp(row);
                        setRejectionReason("");
                        setIsRejectModalOpen(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #FCA5A5",
                        background: "#FEF2F2",
                        color: "#DC2626",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <FaTimesCircle /> Reject
                    </button>
                  </>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Application Details & Comprehensive Screening Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedApp(null);
          setSelectedDogDetail(null);
          setSelectedDogMedical([]);
        }}
        title={`Adoption Application #${String(selectedApp?.ticketNumber || selectedApp?.id || "")} — Screening Review`}
        maxWidth="780px"
      >
        {selectedApp && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Header Summary Banner */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                  Applicant: {String(selectedApp.applicantName || "-")}
                </h3>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                  Requested Pet: <strong style={{ color: "#2563EB" }}>{String(selectedApp.petName || "-")}</strong> &bull; Submitted: {String(selectedApp.date || selectedApp.created_at || "-")}
                </div>
              </div>
              <StatusBadge status={String(selectedApp.status || "submitted")} />
            </div>

            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "2px solid #E2E8F0",
                gap: "8px",
                overflowX: "auto",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveDetailTab("applicant")}
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: "13px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: activeDetailTab === "applicant" ? "#2563EB" : "#64748B",
                  borderBottom: activeDetailTab === "applicant" ? "3px solid #2563EB" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaUser /> Applicant Questionnaire
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("dog")}
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: "13px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: activeDetailTab === "dog" ? "#2563EB" : "#64748B",
                  borderBottom: activeDetailTab === "dog" ? "3px solid #2563EB" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaDog /> Requested Dog Profile
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("medical")}
                style={{
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: "13px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: activeDetailTab === "medical" ? "#2563EB" : "#64748B",
                  borderBottom: activeDetailTab === "medical" ? "3px solid #2563EB" : "3px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaStethoscope /> Dog Health &amp; Medical ({selectedDogMedical.length})
              </button>
            </div>

            {/* TAB 1: APPLICANT QUESTIONNAIRE */}
            {activeDetailTab === "applicant" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Applicant Email</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>
                      {String(selectedApp.applicantEmail || "-")}
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Applicant Phone</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>
                      {String(selectedApp.applicantPhone || "-")}
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Residential Status</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "4px", textTransform: "capitalize" }}>
                      {String(selectedApp.residential_status || "-")}
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Household Members</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>
                      {String(selectedApp.household_members_count ?? "-")}
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Yard Fenced</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: selectedApp.has_yard_fence ? "#059669" : "#DC2626", marginTop: "4px" }}>
                      {selectedApp.has_yard_fence ? "Yes — Fenced Yard" : "No / Unfenced"}
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Landlord Approval</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: selectedApp.has_landlord_approval ? "#059669" : "#DC2626", marginTop: "4px" }}>
                      {selectedApp.has_landlord_approval ? "Yes — Approved" : "N/A or Pending"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#F1F5F9", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Pet Care Experience</div>
                    <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                      {String(selectedApp.pet_care_experience || "No prior notes recorded.")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Existing Pets Medical Details</div>
                    <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                      {String(selectedApp.existing_pets_medical_details || "None reported.")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Vetting / Officer Notes</div>
                    <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                      {String(selectedApp.vetting_officer_notes || "No officer notes.")}
                    </div>
                  </div>
                  {Boolean(selectedApp.home_inspection_scheduled_at) && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#D97706", textTransform: "uppercase" }}>Scheduled Home Verification</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaCalendarAlt color="#D97706" /> {new Date(String(selectedApp.home_inspection_scheduled_at)).toLocaleString()}
                      </div>
                      {Boolean(selectedApp.home_inspection_notes) && (
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                          Notes: {String(selectedApp.home_inspection_notes)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: REQUESTED DOG PROFILE */}
            {activeDetailTab === "dog" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {selectedDogLoading ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#2563EB", fontWeight: 600 }}>
                    Loading dog profile details...
                  </div>
                ) : selectedDogDetail ? (
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                      <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                        {(selectedDogDetail.photo_url || selectedDogDetail.photo) ? (
                          <img
                            src={String(selectedDogDetail.photo_url || selectedDogDetail.photo)}
                            alt={String(selectedDogDetail.name || "Dog")}
                            style={{ width: "72px", height: "72px", borderRadius: "12px", objectFit: "cover", border: "1px solid #CBD5E1" }}
                          />
                        ) : (
                          <div style={{ width: "72px", height: "72px", borderRadius: "12px", background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                            <FaDog />
                          </div>
                        )}
                        <div>
                          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>
                            {String(selectedDogDetail.name || selectedApp.petName || "Unnamed Dog")}
                          </h3>
                          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                            Reg / Tag ID: <strong style={{ fontFamily: "monospace", color: "#2563EB" }}>{String(selectedDogDetail.registration_number || selectedDogDetail.id || "-")}</strong>
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                            Breed: <strong>{String(selectedDogDetail.breed || "Canine")}</strong> {selectedDogDetail.breed_classification ? `(${selectedDogDetail.breed_classification})` : ""}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openQrModal(selectedDogDetail)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#6D28D9",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <FaQrcode /> View QR Code
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Gender</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px", textTransform: "capitalize" }}>
                          {String(selectedDogDetail.gender || "-")}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Estimated Age</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                          {String(selectedDogDetail.estimated_age || (selectedDogDetail.age_months ? `${selectedDogDetail.age_months} months` : "-"))}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Weight</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                          {selectedDogDetail.weight_kg || selectedDogDetail.weight ? `${selectedDogDetail.weight_kg || selectedDogDetail.weight} kg` : "-"}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Coat Color / Markings</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                          {String(selectedDogDetail.color || selectedDogDetail.distinguishing_marks || "-")}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Temperament</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px", textTransform: "capitalize" }}>
                          {String(selectedDogDetail.temperament || "-")}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Spayed / Neutered</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: selectedDogDetail.is_spayed_neutered ? "#059669" : "#D97706", marginTop: "2px" }}>
                          {selectedDogDetail.is_spayed_neutered ? "Yes — Neutered/Spayed" : "Not Neutered"}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Microchip ID</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px", fontFamily: "monospace" }}>
                          {String(selectedDogDetail.microchip_id || "Not Microchipped")}
                        </div>
                      </div>

                      <div style={{ background: "#FFFFFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Facility Status</div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", marginTop: "2px", textTransform: "uppercase" }}>
                          {String(selectedDogDetail.status || selectedDogDetail.current_status || "Shelter Care")}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "20px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                    Dog profile information loaded from application details ({String(selectedApp.petName || "Selected Dog")}).
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DOG HEALTH & MEDICAL RECORDS */}
            {activeDetailTab === "medical" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {selectedDogLoading ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#2563EB", fontWeight: 600 }}>
                    Loading clinical health &amp; medical records...
                  </div>
                ) : selectedDogMedical.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Clinical Health &amp; Veterinary Records ({selectedDogMedical.length} entries)
                    </div>
                    {selectedDogMedical.map((rec, idx) => (
                      <div key={idx} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: "#EFF6FF", color: "#2563EB", textTransform: "uppercase" }}>
                              {String(rec.categoryName || rec.type || "Medical")}
                            </span>
                            <strong style={{ fontSize: "13px", color: "#0F172A" }}>{String(rec.treatment || rec.vaccineName || rec.diagnosis || "-")}</strong>
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                            Recorded: {String(rec.date || "-")} &bull; {String(rec.vetName || "Staff Vet")}
                          </div>
                        </div>
                        {Boolean(rec.nextDueAt) && (
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#D97706", background: "#FFFBEB", padding: "4px 8px", borderRadius: "6px", border: "1px solid #FDE68A" }}>
                            Next Due: {String(rec.nextDueAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "24px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                    <FaMedkit style={{ fontSize: "24px", color: "#94A3B8", marginBottom: "6px" }} />
                    <br />
                    No clinical medical history or vaccination records logged yet for this dog in the database.
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: "14px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedApp(null);
                  setSelectedDogDetail(null);
                  setSelectedDogMedical([]);
                }}
                style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
              >
                Close Details
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                {String(selectedApp.status).toLowerCase() === "submitted" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      void handleStartScreeningDirect(selectedApp);
                    }}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#7E22CE", color: "#FFFFFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                  >
                    Start Screening
                  </button>
                )}

                {String(selectedApp.status).toLowerCase() === "screening" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setScreeningForm({ appId: String(selectedApp.id || selectedApp.applicationId), nextStage: "interview", notes: String(selectedApp.vetting_officer_notes || "") });
                      setIsScreeningModalOpen(true);
                    }}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#7E22CE", color: "#FFFFFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                  >
                    Complete Screening
                  </button>
                )}

                {["screening", "interview", "vetting", "submitted"].includes(String(selectedApp.status).toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setScheduleForm({ appId: String(selectedApp.id || selectedApp.applicationId), date: "", notes: "" });
                      setIsScheduleModalOpen(true);
                    }}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #D97706", background: "#FFFBEB", color: "#D97706", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                  >
                    Schedule Visit
                  </button>
                )}

                {["interview", "home_check", "vetting"].includes(String(selectedApp.status).toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setApproveForm({ appId: String(selectedApp.id || selectedApp.applicationId) });
                      setIsApproveModalOpen(true);
                    }}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#059669", color: "#FFFFFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                  >
                    Approve Adoption
                  </button>
                )}

                {["submitted", "screening", "interview", "home_check", "vetting"].includes(String(selectedApp.status).toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setRejectionReason("");
                      setIsRejectModalOpen(true);
                    }}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* New Adoption Request Modal */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Log New Adoption Application">
        <form onSubmit={handleCreateNewAdoption} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Applicant Full Name *</label>
            <input type="text" required placeholder="e.g. Emily Clark" value={newForm.applicantName} onChange={(e) => setNewForm({ ...newForm, applicantName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={newForm.dogId} onChange={(e) => setNewForm({ ...newForm, dogId: e.target.value, petName: (e.target.selectedOptions[0]?.textContent || "").split(" (")[0] })} style={inputStyle}>
              <option value="">Select a dog...</option>
              {dogs.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>{String(d.name || d.registration_number || d.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Residential Status *</label>
            <select value={newForm.residentialStatus} onChange={(e) => setNewForm({ ...newForm, residentialStatus: e.target.value })} style={inputStyle}>
              <option value="owned">Owned</option>
              <option value="renting">Renting</option>
              <option value="family">Living with family</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsNewModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Log Application"}</button>
          </div>
        </form>
      </Modal>

      {/* Screen Application Modal */}
      <Modal isOpen={isScreeningModalOpen} onClose={() => setIsScreeningModalOpen(false)} title="Complete Application Screening">
        <form onSubmit={handleCompleteScreening} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Application *</label>
            <select value={screeningForm.appId} onChange={(e) => setScreeningForm({ ...screeningForm, appId: e.target.value })} style={inputStyle}>
              <option value="">Select application...</option>
              {adoptions
                .filter((a) => ["submitted", "screening"].includes(String(a.status).toLowerCase()))
                .map((a) => (
                  <option key={String(a.id || a.applicationId)} value={String(a.id || a.applicationId)}>
                    #{String(a.ticketNumber || a.id)} — {String(a.applicantName)} ({String(a.petName)})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Next Workflow Stage *</label>
            <select value={screeningForm.nextStage} onChange={(e) => setScreeningForm({ ...screeningForm, nextStage: e.target.value })} style={inputStyle}>
              <option value="interview">Proceed to Applicant Interview (interview)</option>
              <option value="home_check">Proceed to Home Inspection (home_check)</option>
              <option value="vetting">Proceed to Medical Vetting Check (vetting)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Officer Screening Notes / Assessment</label>
            <input
              type="text"
              placeholder="e.g. Preliminary questionnaire verified. Applicant is eligible for home visit."
              value={screeningForm.notes}
              onChange={(e) => setScreeningForm({ ...screeningForm, notes: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsScreeningModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#7E22CE", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Processing..." : "Complete Screening"}</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Home Verification Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => { setIsScheduleModalOpen(false); setScheduleError(null); }} title="Schedule Home Inspection Visit">
        <form onSubmit={handleScheduleVerification} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {scheduleError && (
            <div style={{ padding: "12px 14px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", color: "#991B1B", fontSize: "13px", lineHeight: 1.4 }}>
              ⚠️ <strong>Backend Error:</strong> {scheduleError}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Application *</label>
            <select value={scheduleForm.appId} onChange={(e) => setScheduleForm({ ...scheduleForm, appId: e.target.value })} style={inputStyle}>
              <option value="">Select application...</option>
              {adoptions.map((a) => (
                <option key={String(a.id || a.applicationId)} value={String(a.id || a.applicationId)}>{String(a.applicantName)} — ({String(a.petName)})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Inspection Date &amp; Time *</label>
            <input type="datetime-local" required value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Inspection Notes / Instructions</label>
            <input type="text" placeholder="e.g. Verify fence height and landlord permission" value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsScheduleModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Booking..." : "Book Inspection Visit"}</button>
          </div>
        </form>
      </Modal>

      {/* Approve Adoption Modal */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Finalize &amp; Approve Adoption Application">
        <form onSubmit={handleApproveAdoption} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Application to Approve *</label>
            {approvableApps.length === 0 ? (
              <div style={{ padding: "12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "8px", color: "#D97706", fontSize: "13px" }}>
                No applications are currently in interview/inspection/vetting stage ready for approval. Please complete screening first.
              </div>
            ) : (
              <select value={approveForm.appId} onChange={(e) => setApproveForm({ ...approveForm, appId: e.target.value })} style={inputStyle}>
                <option value="">Select application...</option>
                {approvableApps.map((a) => (
                  <option key={String(a.id || a.applicationId)} value={String(a.id || a.applicationId)}>
                    #{String(a.ticketNumber || a.id)} — {String(a.applicantName)} ({String(a.petName)}) [{String(a.status).toUpperCase()}]
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsApproveModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting || approvableApps.length === 0} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Approving..." : "Approve Adoption"}</button>
          </div>
        </form>
      </Modal>

      {/* Reject Application Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Adoption Application">
        <form onSubmit={handleRejectAdoption} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0, fontSize: "14px" }}>
            Are you sure you want to reject application <strong>#{String(selectedApp?.ticketNumber || selectedApp?.id || "")}</strong> for {String(selectedApp?.applicantName || "applicant")}?
          </p>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Rejection / Officer Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Unsuitable housing environment for high-energy canine"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsRejectModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Rejecting..." : "Confirm Rejection"}</button>
          </div>
        </form>
      </Modal>

      {/* Complete Final Adoption Modal */}
      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Finalize Complete Adoption">
        <form onSubmit={handleCompleteAdoption} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0, fontSize: "14px" }}>
            Finalize and mark adoption application <strong>#{String(selectedApp?.ticketNumber || selectedApp?.id || "")}</strong> as <strong>COMPLETED</strong> for {String(selectedApp?.applicantName || "applicant")}?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsCompleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#047857", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Finalizing..." : "Complete Adoption"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Application Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Application Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove application <strong>#{String(selectedApp?.ticketNumber || selectedApp?.id || "")}</strong> for {String(selectedApp?.applicantName || "")}?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDeleteApplication} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><FaTrash /> Delete</button>
          </div>
        </div>
      </Modal>

      {/* Unique Dog Safety Tag QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={closeQrModal}
        title={`Official Safety Tag & QR Code — ${String(qrDog?.name || selectedApp?.petName || "Dog")}`}
        maxWidth="520px"
      >
        {qrDog && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center", padding: "10px 0" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                {String(qrDog.name || selectedApp?.petName || "Unnamed Dog")}
              </h3>
              <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                Dog ID: <strong style={{ fontFamily: "monospace", color: "#2563EB" }}>{String(qrDog.registration_number || qrDog.id || "-")}</strong>
              </div>
            </div>

            {/* Tag Status & Token Display Banner */}
            <div style={{ width: "100%", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Safety Tag Status:</span>
                <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: tagStatus === "ACTIVE" ? "#DCFCE7" : "#FEE2E2", color: tagStatus === "ACTIVE" ? "#166534" : "#991B1B", border: tagStatus === "ACTIVE" ? "1px solid #86EFAC" : "1px solid #FCA5A5" }}>
                  {tagStatus}
                </span>
              </div>
              {rawToken && (
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#6D28D9", marginTop: "6px", fontWeight: 700 }}>
                  Safety Token: {rawToken}
                </div>
              )}
            </div>

            {/* QR Loading or Render or Error or Warning */}
            {qrLoading ? (
              <div style={{ color: "#2563EB", fontWeight: 600, fontSize: "14px", padding: "40px 0" }}>Loading Safety Tag metadata...</div>
            ) : qrError ? (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "14px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, width: "100%", boxSizing: "border-box" }}>
                ⚠️ {qrError}
              </div>
            ) : qrImageUrl ? (
              <div style={{ padding: "16px", border: "2px solid #E2E8F0", borderRadius: "16px", background: "#FFFFFF" }}>
                <img src={qrImageUrl} alt="Dog Safety Tag QR Code" style={{ width: "200px", height: "200px", objectFit: "contain" }} />
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Scan QR to resolve public safety profile.</div>
              </div>
            ) : (
              <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#334155", padding: "24px 20px", borderRadius: "12px", fontSize: "13px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" }}>
                {tagStatus === "ACTIVE" ? (
                  <>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#1E293B" }}>
                      ℹ️ QR CODE NOT AVAILABLE ON THIS BROWSER
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "420px", lineHeight: 1.5 }}>
                      Safety Tag is <strong>ACTIVE</strong> on backend, but the original QR token was issued previously and cannot be recovered after provisioning. To generate a new QR code for this pet, re-provision the Safety Tag below.
                    </div>
                    <button type="button" onClick={() => setIsReProvisionConfirmOpen(true)} disabled={isProvisioning} style={{ width: "100%", padding: "11px 16px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: isProvisioning ? "not-allowed" : "pointer" }}>
                      {isProvisioning ? "Provisioning..." : "Re-Provision Safety Tag"}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ color: "#991B1B", fontWeight: 700, fontSize: "14px" }}>This pet does not have an active Safety Tag yet.</div>
                    <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "400px", lineHeight: 1.5 }}>Please provision a Safety Tag to generate an authoritative QR code and safety token for this pet.</div>
                    <button type="button" onClick={() => handleProvisionTag()} disabled={isProvisioning} style={{ width: "100%", padding: "11px 16px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: isProvisioning ? "not-allowed" : "pointer" }}>
                      {isProvisioning ? "Provisioning..." : "Provision Safety Tag"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "8px" }}>
              {qrImageUrl && (
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <FaDownload /> Download QR
                </button>
              )}
              {rawToken && (
                <button
                  type="button"
                  onClick={() => window.open(`/scan-pet?token=${rawToken}`, "_blank")}
                  style={{ flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1px solid #2563EB", background: "#EFF6FF", color: "#2563EB", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <FaExternalLinkAlt /> Open Public Scan
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Re-Provision Confirmation Modal */}
      <Modal
        isOpen={isReProvisionConfirmOpen}
        onClose={() => setIsReProvisionConfirmOpen(false)}
        title="Re-Provision Safety Tag?"
        maxWidth="450px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 0" }}>
          <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            This will generate a <strong>NEW Safety Tag token</strong> and invalidate the existing QR code for <strong>{String(qrDog?.name || "this pet")}</strong>. Any previously printed QR code will stop working. Continue?
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setIsReProvisionConfirmOpen(false)}
              style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", color: "#475569", fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleProvisionTag(true)}
              disabled={isProvisioning}
              style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700 }}
            >
              {isProvisioning ? "Re-Provisioning..." : "Confirm Re-Provision"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Adoptions;