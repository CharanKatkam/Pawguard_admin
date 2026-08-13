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
} from "react-icons/fa";
import adoptionService, { toAdoptionStatus } from "../../services/adoptionService";
import dogService from "../../services/dogService";
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
    bg = "#ECFEFF";
    color = "#0891B2";
    label = "Interview";
  } else if (s === "home_check") {
    bg = "#FFFBEB";
    color = "#D97706";
    label = "Home Inspection";
  } else if (s === "approved") {
    bg = "#ECFDF5";
    color = "#059669";
    label = "Approved";
  } else if (s === "completed") {
    bg = "#D1FAE5";
    color = "#047857";
    label = "Completed";
  } else if (s === "rejected") {
    bg = "#FEF2F2";
    color = "#DC2626";
    label = "Rejected";
  } else if (s === "vetting") {
    bg = "#E0E7FF";
    color = "#4338CA";
    label = "Vetting";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        background: bg,
        color,
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
  const e = err as {
    response?: {
      data?: {
        detail?: string | { msg?: string }[];
        message?: string;
        error?: { message?: string };
      };
    };
    message?: string;
  };
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length > 0 && typeof d[0]?.msg === "string") return d[0].msg;
  return e?.response?.data?.message || e?.response?.data?.error?.message || e?.message || fallback;
};

const Adoptions = () => {
  const [adoptions, setAdoptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
  
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);

  // Form states
  const [newForm, setNewForm] = useState({ applicantName: "", petName: "", dogId: "", residentialStatus: "owned" });
  const [scheduleForm, setScheduleForm] = useState({ appId: "", date: "", notes: "" });
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

  const openDetailsModal = async (appRow: Record<string, unknown>) => {
    try {
      setSelectedApp(appRow);
      setIsDetailsModalOpen(true);
      const appId = String(appRow.id || appRow.applicationId || "");
      if (appId) {
        const fullDetails = await adoptionService.getAdoptionById(appId);
        if (fullDetails) setSelectedApp(fullDetails);
      }
    } catch {
      // Keep basic row if detail fetch fails
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
      addToast(`Application #${id} moved to Screening.`, "success");
      fetchAdoptions();
      notifyDataChanged();
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
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(extractErrorMessage(err, "Failed to schedule home verification."), "error");
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

      {/* Application Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedApp(null);
        }}
        title={`Adoption Application Details — #${String(selectedApp?.ticketNumber || selectedApp?.id || "")}`}
        maxWidth="720px"
      >
        {selectedApp && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Header info */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                  Applicant: {String(selectedApp.applicantName || "-")}
                </h3>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                  Interested Dog: <strong>{String(selectedApp.petName || "-")}</strong> &bull; Applied: {String(selectedApp.date || selectedApp.created_at || "-")}
                </div>
              </div>
              <StatusBadge status={String(selectedApp.status || "submitted")} />
            </div>

            {/* Grid breakdown */}
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

            {/* Questionnaire & Notes */}
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

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedApp(null);
                }}
                style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
              >
                Close Details
              </button>
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
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule Home Inspection Visit">
        <form onSubmit={handleScheduleVerification} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
    </div>
  );
};

export default Adoptions;