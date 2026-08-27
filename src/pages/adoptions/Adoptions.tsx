import { useState, useEffect, useCallback, useMemo } from "react";
import DataTable, { type Column } from "../../components/common/DataTable";
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
  FaEye,
  FaHome,
  FaDog,
  FaStar,
  FaCheckDouble,
} from "react-icons/fa";
import adoptionService, {
  type AdoptionScoreCreatePayload,
} from "../../services/adoptionService";
import petService from "../../services/petService";
import { generateQrDataUrl } from "../../utils/qrGenerator";
import { notifyDataChanged } from "../../utils/dataSync";
import { formatDateTime } from "../../utils/dateUtils";

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
  fontSize: "14px",
};

const Adoptions = () => {
  const [activeTab, setActiveTab] = useState<"queue" | "scoring" | "completed">("queue");
  const [adoptions, setAdoptions] = useState<Record<string, unknown>[]>([]);
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Search & Pagination & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Safety Tag QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);

  // Selection state
  const [selectedAdoption, setSelectedAdoption] = useState<Record<string, unknown> | null>(null);
  const [candidateScores, setCandidateScores] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [newAppForm, setNewAppForm] = useState({
    dog_id: "",
    residential_status: "owned",
    has_landlord_approval: true,
    has_yard_fence: true,
    household_members_count: 2,
    existing_pets_medical_details: "1 neutered dog, vaccinated",
    pet_care_experience: "5+ years of dog ownership",
  });

  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    notes: "",
  });

  const [scoreForm, setScoreForm] = useState<AdoptionScoreCreatePayload>({
    home_environment_score: 5,
    pet_care_knowledge_score: 5,
    financial_readiness_score: 4,
    lifestyle_compatibility_score: 5,
    recommendation: "Highly Recommended for Adoption",
    notes: "Applicant has a secure fenced yard and extensive experience.",
  });

  const fetchAdoptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adoptionService.getAdoptions();
      const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setAdoptions(list);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || "Failed to load adoption applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDogs = useCallback(async () => {
    try {
      const dogsRes = await petService.getPets();
      const list = Array.isArray(dogsRes.data) ? dogsRes.data : Array.isArray(dogsRes) ? dogsRes : [];
      setDogs(
        list.map((d: any) => ({
          id: d.id || d.dog_id || "",
          name: d.name || "Dog",
          label: `${d.name || "Dog"} (${d.registration_number || String(d.id || "").slice(0, 8)})`,
        }))
      );
    } catch {
      setDogs([]);
    }
  }, []);

  useEffect(() => {
    fetchAdoptions();
    fetchDogs();
  }, [fetchAdoptions, fetchDogs]);

  // Derived filtered adoptions
  const filteredAdoptions = useMemo(() => {
    return adoptions.filter((app) => {
      const status = String(app.status || "").toLowerCase();
      const matchesStatus = statusFilter === "all" || status === statusFilter.toLowerCase();
      if (!matchesStatus) return false;

      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      const searchable = [
        app.id,
        app.applicantName,
        app.applicantEmail,
        app.petName,
        app.status,
      ].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [adoptions, statusFilter, debouncedSearch]);

  const paginatedAdoptions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAdoptions.slice(start, start + pageSize);
  }, [filteredAdoptions, page]);

  // Stats KPI
  const completedCount = adoptions.filter((a) => String(a.status).toLowerCase() === "completed").length;
  const approvedCount = adoptions.filter((a) => String(a.status).toLowerCase() === "approved").length;
  const pendingCount = adoptions.filter((a) => ["submitted", "vetting", "screening", "interview", "home_check"].includes(String(a.status).toLowerCase())).length;

  const stats = [
    { title: "Total Applications", value: `${adoptions.length}`, trend: "Records", color: "#2563EB", icon: <FaClipboardCheck /> },
    { title: "Pending In-Review", value: `${pendingCount}`, trend: "Requires Action", color: "#F59E0B", icon: <FaUserCheck /> },
    { title: "Approved Candidates", value: `${approvedCount}`, trend: "Approved", color: "#10B981", icon: <FaHeart /> },
    { title: "Completed Adoptions", value: `${completedCount}`, trend: "Finalized", color: "#6366F1", icon: <FaCheckDouble /> },
  ];

  // Actions
  const handleNewAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppForm.dog_id) {
      addToast("Please select a dog for the adoption application.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await adoptionService.createAdoption(newAppForm);
      addToast("Adoption application registered successfully!", "success");
      setIsNewModalOpen(false);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to submit application.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdoption?.id) return;
    try {
      setIsSubmitting(true);
      await adoptionService.updateAdoptionDetails(String(selectedAdoption.id), {
        status: "home_check",
        home_inspection_scheduled_at: scheduleForm.date ? new Date(scheduleForm.date).toISOString() : null,
        home_inspection_notes: scheduleForm.notes,
      });
      addToast("Home inspection visit scheduled successfully!", "success");
      setIsScheduleModalOpen(false);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to schedule home inspection.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdoption?.id) return;
    try {
      setIsSubmitting(true);
      await adoptionService.addCandidateScore(String(selectedAdoption.id), scoreForm);
      addToast("Candidate evaluation score logged successfully!", "success");
      setIsScoreModalOpen(false);
      fetchAdoptions();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to log candidate score.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      setIsSubmitting(true);
      await adoptionService.updateAdoptionStatus(appId, newStatus);
      addToast(`Updated status to ${newStatus.toUpperCase()}!`, "success");
      fetchAdoptions();
      notifyDataChanged();
      setSelectedAdoption((prev) => {
        if (prev && String(prev.id) === appId) {
          return { ...prev, status: newStatus };
        }
        return prev;
      });
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to update status.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteAdoption = async () => {
    if (!selectedAdoption?.id) return;
    try {
      setIsSubmitting(true);
      // 1. Update status to completed
      await adoptionService.updateAdoptionStatus(String(selectedAdoption.id), "completed");
      // 2. Create Companion Pet
      await adoptionService.createCompanionPetFromAdoption(String(selectedAdoption.id));
      addToast("Adoption completed and registered as Companion Pet!", "success");
      setIsCompleteModalOpen(false);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to finalize companion pet adoption.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAdoption?.id) return;
    try {
      setIsSubmitting(true);
      await adoptionService.deleteAdoption(String(selectedAdoption.id));
      addToast("Adoption record soft deleted.", "success");
      setIsDeleteModalOpen(false);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to delete record.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInspectModal = async (row: Record<string, unknown>) => {
    setSelectedAdoption(row);
    setIsDetailsModalOpen(true);
    try {
      const scoresRes = await adoptionService.getCandidateScores(String(row.id));
      setCandidateScores(scoresRes?.data || scoresRes || []);
    } catch {
      setCandidateScores([]);
    }
  };

  const openQrModal = async (dog: Record<string, unknown> | null) => {
    if (!dog) return;
    const id = String(dog.dog_id || dog.id || "");
    if (!id) return;

    setQrImageUrl(null);
    setRawToken(null);
    setIsQrModalOpen(true);

    try {
      setQrLoading(true);
      const token = `PAWGUARD-TAG-${id.slice(0, 8).toUpperCase()}`;
      setRawToken(token);
      const qrUrl = await generateQrDataUrl(token);
      setQrImageUrl(qrUrl);
    } catch {
      // Quiet fail for QR generation
    } finally {
      setQrLoading(false);
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "id",
      title: "App ID",
      render: (_v, row) => <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{String(row.id || "").slice(0, 8)}</span>,
    },
    {
      key: "applicantName",
      title: "Applicant",
      render: (_v, row) => (
        <div>
          <strong>{String(row.applicantName || "—")}</strong>
          <div style={{ fontSize: "11px", color: "#64748B" }}>{String(row.applicantEmail || "")}</div>
        </div>
      ),
    },
    {
      key: "petName",
      title: "Rescue Dog",
      render: (_v, row) => (
        <div>
          <strong>{String(row.petName || "—")}</strong>
          <div style={{ fontSize: "11px", color: "#64748B" }}>{String(row.petBreed || "Canine")}</div>
        </div>
      ),
    },
    {
      key: "status",
      title: "Stage & Status",
      render: (_v, row) => <StatusBadge status={String(row.status || "")} />,
    },
    {
      key: "date",
      title: "Applied Date",
      render: (_v, row) => <span>{row.date ? formatDateTime(String(row.date)) : "—"}</span>,
    },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Adoption Operations Suite</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Process adoption questionnaires, score candidates, verify home environments, execute legal contracts, and convert adopted dogs to companion pets.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_adoptions">
          <QuickActionCard icon={<FaPlus />} title="New Application" subtitle="Register applicant" color="#2563EB" onClick={() => setIsNewModalOpen(true)} />
        </Can>
        <Can permission="edit_adoptions">
          <QuickActionCard icon={<FaHome />} title="Schedule Home Inspection" subtitle="Assign field visit" color="#10B981" onClick={() => setActiveTab("queue")} />
        </Can>
        <Can permission="edit_adoptions">
          <QuickActionCard icon={<FaStar />} title="Score Candidates" subtitle="Evaluate match" color="#F59E0B" onClick={() => setActiveTab("scoring")} />
        </Can>
        <Can permission="approve_adoptions">
          <QuickActionCard icon={<FaCheckDouble />} title="Finalize Companion Pet" subtitle="Complete legal process" color="#6366F1" onClick={() => setActiveTab("completed")} />
        </Can>
      </div>

      {/* KPI Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "2px solid #E2E8F0" }}>
        <button
          onClick={() => setActiveTab("queue")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "queue" ? "3px solid #2563EB" : "3px solid transparent",
            background: "none",
            color: activeTab === "queue" ? "#2563EB" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Applications Queue &amp; Review ({adoptions.length})
        </button>
        <button
          onClick={() => setActiveTab("scoring")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "scoring" ? "3px solid #2563EB" : "3px solid transparent",
            background: "none",
            color: activeTab === "scoring" ? "#2563EB" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Candidate Evaluation &amp; Scoring
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          style={{
            padding: "10px 18px",
            border: "none",
            borderBottom: activeTab === "completed" ? "3px solid #2563EB" : "3px solid transparent",
            background: "none",
            color: activeTab === "completed" ? "#2563EB" : "#64748B",
            fontWeight: 700,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Completed Adoptions &amp; Companion Pets ({completedCount})
        </button>
      </div>

      {activeTab === "queue" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Adoption Applications Directory
            </h3>
            {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading...</span>}
          </div>

          <DataTable
            columns={columns}
            data={paginatedAdoptions}
            module="adoptions"
            serverMode={true}
            totalCount={filteredAdoptions.length}
            page={page}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setPage(1);
            }}
            leftHeaderControls={
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                style={{ ...inputStyle, width: "auto" }}
              >
                <option value="all">All Stages</option>
                <option value="submitted">Submitted</option>
                <option value="vetting">Vetting</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="home_check">Home Visit</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            }
            onRowClick={(row) => void openInspectModal(row)}
            onDelete={(row) => {
              setSelectedAdoption(row);
              setIsDeleteModalOpen(true);
            }}
            renderRowActions={(row: Record<string, unknown>) => (
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => void openInspectModal(row)}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #93C5FD", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  <FaEye /> Inspect
                </button>
                <button
                  onClick={() => {
                    setSelectedAdoption(row);
                    setIsScheduleModalOpen(true);
                  }}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  <FaHome /> Visit
                </button>
                <button
                  onClick={() => {
                    setSelectedAdoption(row);
                    setIsScoreModalOpen(true);
                  }}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #FDE68A", background: "#FEF3C7", color: "#B45309", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  <FaStar /> Score
                </button>
                {String(row.status).toLowerCase() !== "approved" && String(row.status).toLowerCase() !== "completed" && String(row.status).toLowerCase() !== "rejected" && (
                  <>
                    <button
                      onClick={() => void handleStatusChange(String(row.id), "approved")}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#047857", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void handleStatusChange(String(row.id), "rejected")}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Reject
                    </button>
                  </>
                )}
                {String(row.status).toLowerCase() === "approved" && (
                  <button
                    onClick={() => {
                      setSelectedAdoption(row);
                      setIsCompleteModalOpen(true);
                    }}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #818CF8", background: "#EEF2FF", color: "#4338CA", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                  >
                    Finalize
                  </button>
                )}
              </div>
            )}
          />
        </div>
      )}

      {activeTab === "scoring" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Candidate Readiness &amp; Scoring Station
          </h3>
          <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "20px" }}>
            Score applicants on home environment safety, pet care knowledge, financial readiness, and lifestyle compatibility.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {adoptions.map((app) => (
              <div key={String(app.id)} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>
                    {String(app.applicantName)} &bull; Pet: {String(app.petName)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                    Housing: {String(app.residential_status)} &bull; Yard Fence: {app.has_yard_fence ? "Yes" : "No"} &bull; Landlord Approval: {app.has_landlord_approval ? "Yes" : "No"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedAdoption(app);
                    setIsScoreModalOpen(true);
                  }}
                  style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#FFF", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FaStar /> Score Candidate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "completed" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Completed Adoptions &amp; Companion Pets Roster
          </h3>

          {adoptions.filter((a) => String(a.status).toLowerCase() === "completed").length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
              <FaDog size={36} color="#CBD5E1" style={{ marginBottom: "12px" }} />
              <div>No finalized companion pet adoptions logged.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {adoptions.filter((a) => String(a.status).toLowerCase() === "completed").map((app) => (
                <div key={String(app.id)} style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#065F46" }}>
                      {String(app.petName)} &bull; Adopted by {String(app.applicantName)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#047857", marginTop: "4px" }}>
                      Completed Date: {app.completed_at ? formatDateTime(String(app.completed_at)) : "Finalized"} &bull; Fee Amount: ${String(app.fee_amount || 150)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => void openQrModal(app.dog as any)}
                      style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #059669", background: "#FFF", color: "#059669", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                    >
                      Safety Tag QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Application Modal */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Register Adoption Application">
        <form onSubmit={handleNewAppSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Rescue Dog *</label>
            <select required value={newAppForm.dog_id} onChange={(e) => setNewAppForm({ ...newAppForm, dog_id: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Residential Status</label>
              <select value={newAppForm.residential_status} onChange={(e) => setNewAppForm({ ...newAppForm, residential_status: e.target.value })} style={inputStyle}>
                <option value="owned">Owned Home</option>
                <option value="rented">Rented Apartment / House</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Household Members</label>
              <input type="number" min="1" max="15" value={newAppForm.household_members_count} onChange={(e) => setNewAppForm({ ...newAppForm, household_members_count: Number(e.target.value) })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Landlord Approval</label>
              <select value={newAppForm.has_landlord_approval ? "true" : "false"} onChange={(e) => setNewAppForm({ ...newAppForm, has_landlord_approval: e.target.value === "true" })} style={inputStyle}>
                <option value="true">Yes (Approved)</option>
                <option value="false">No / N/A</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Fenced Yard</label>
              <select value={newAppForm.has_yard_fence ? "true" : "false"} onChange={(e) => setNewAppForm({ ...newAppForm, has_yard_fence: e.target.value === "true" })} style={inputStyle}>
                <option value="true">Yes (Secure Fence)</option>
                <option value="false">No Fence</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Care Experience</label>
            <textarea value={newAppForm.pet_care_experience} onChange={(e) => setNewAppForm({ ...newAppForm, pet_care_experience: e.target.value })} style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsNewModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Registering..." : "Submit Application"}</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Home Inspection Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule Home Verification Visit">
        <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Scheduled Date &amp; Time</label>
            <input type="datetime-local" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Inspector Notes</label>
            <textarea placeholder="e.g. Verify fence height and landlord permission." value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsScheduleModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Scheduling..." : "Confirm Schedule"}</button>
          </div>
        </form>
      </Modal>

      {/* Score Candidate Modal */}
      <Modal isOpen={isScoreModalOpen} onClose={() => setIsScoreModalOpen(false)} title="Score Candidate Evaluation">
        <form onSubmit={handleScoreSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Home Environment (1-5)</label>
              <input type="number" min="1" max="5" value={scoreForm.home_environment_score} onChange={(e) => setScoreForm({ ...scoreForm, home_environment_score: Number(e.target.value) })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Care Knowledge (1-5)</label>
              <input type="number" min="1" max="5" value={scoreForm.pet_care_knowledge_score} onChange={(e) => setScoreForm({ ...scoreForm, pet_care_knowledge_score: Number(e.target.value) })} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Financial Readiness (1-5)</label>
              <input type="number" min="1" max="5" value={scoreForm.financial_readiness_score} onChange={(e) => setScoreForm({ ...scoreForm, financial_readiness_score: Number(e.target.value) })} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Lifestyle Match (1-5)</label>
              <input type="number" min="1" max="5" value={scoreForm.lifestyle_compatibility_score} onChange={(e) => setScoreForm({ ...scoreForm, lifestyle_compatibility_score: Number(e.target.value) })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Recommendation</label>
            <input type="text" value={scoreForm.recommendation} onChange={(e) => setScoreForm({ ...scoreForm, recommendation: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Evaluation Notes</label>
            <textarea value={scoreForm.notes || ""} onChange={(e) => setScoreForm({ ...scoreForm, notes: e.target.value })} style={{ ...inputStyle, minHeight: "60px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsScoreModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Save Scores"}</button>
          </div>
        </form>
      </Modal>

      {/* Complete Adoption Modal */}
      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title="Finalize Companion Pet Adoption">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Finalize adoption application <strong>{selectedAdoption?.id ? String(selectedAdoption.id).slice(0, 8) : ""}</strong>? This will create a permanent Companion Pet profile for <strong>{String(selectedAdoption?.applicantName || "Adopter")}</strong> and update the dog's status to <strong>ADOPTED</strong>.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsCompleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleCompleteAdoption} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Finalizing..." : "Confirm & Create Companion Pet"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Application Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to soft delete adoption application <strong>{selectedAdoption?.id ? String(selectedAdoption.id).slice(0, 8) : ""}</strong>?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDelete} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600 }}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* Details Inspect Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={`Adoption Record — ${selectedAdoption?.applicantName || "Applicant"}`} maxWidth="720px">
        {selectedAdoption && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                  {String(selectedAdoption.applicantName)} &bull; {String(selectedAdoption.petName)}
                </h2>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                  App ID: <span style={{ fontFamily: "monospace" }}>{String(selectedAdoption.id)}</span>
                </div>
              </div>
              <StatusBadge status={String(selectedAdoption.status || "")} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Housing &amp; Yard</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>
                  Status: {String(selectedAdoption.residential_status)} &bull; Fence: {selectedAdoption.has_yard_fence ? "Yes" : "No"}
                </div>
              </div>
              <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Home Visit Inspection</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "4px" }}>
                  Scheduled: {selectedAdoption.home_inspection_scheduled_at ? formatDateTime(String(selectedAdoption.home_inspection_scheduled_at)) : "Not scheduled"}
                </div>
              </div>
            </div>

            <div style={{ background: "#F1F5F9", borderRadius: "10px", padding: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>Logged Candidate Scores</div>
              {candidateScores.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748B" }}>No candidate scores registered yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {candidateScores.map((sc, idx) => (
                    <div key={idx} style={{ background: "#FFF", padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}>
                      Score: Env({sc.home_environment_score}/5), Knowledge({sc.pet_care_knowledge_score}/5), Finance({sc.financial_readiness_score}/5) &bull; Rec: <strong>{sc.recommendation}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

             <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {String(selectedAdoption.status).toLowerCase() !== "approved" && String(selectedAdoption.status).toLowerCase() !== "completed" && String(selectedAdoption.status).toLowerCase() !== "rejected" && (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleStatusChange(String(selectedAdoption.id), "approved")}
                    style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
                  >
                    Accept/Approve
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleStatusChange(String(selectedAdoption.id), "rejected")}
                    style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
                  >
                    Reject
                  </button>
                </>
              )}
              <button type="button" onClick={() => setIsDetailsModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Safety Tag QR Modal */}
      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Safety Tag QR Code">
        <div style={{ textAlign: "center", padding: "16px" }}>
          {qrLoading ? (
            <div>Generating Safety Tag QR Code...</div>
          ) : qrImageUrl ? (
            <div>
              <img src={qrImageUrl} alt="Safety Tag QR" style={{ width: "200px", height: "200px", borderRadius: "8px", margin: "0 auto 16px" }} />
              <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#64748B" }}>Token: {rawToken}</div>
            </div>
          ) : (
            <div>Could not generate QR code.</div>
          )}
          <div style={{ marginTop: "16px" }}>
            <button type="button" onClick={() => setIsQrModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>Close</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Adoptions;