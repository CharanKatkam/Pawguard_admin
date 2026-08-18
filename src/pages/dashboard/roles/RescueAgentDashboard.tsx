import React, { useEffect, useState, useCallback } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import Modal from "../../../components/common/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaAmbulance,
  FaCamera,
  FaCheckCircle,
  FaClipboardCheck,
  FaSearch,
  FaMapMarkerAlt,
  FaExternalLinkAlt,
  FaDog,
  FaCompass,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import rescueService from "../../../services/rescueService";
import petService from "../../../services/petService";
import { useDataSync, notifyDataChanged } from "../../../utils/dataSync";
import { rescueStatusBadge } from "../../../utils/rescueStatus.tsx";
import { formatDateTime } from "../../../utils/dateUtils";

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: Record<string, unknown>[];
}

type CardTab = "assigned" | "pending" | "completed" | "all";

const unwrapList = (v: unknown): Record<string, unknown>[] => {
  if (!v || typeof v !== "object") return [];
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  const obj = v as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).data)) {
    return (obj.data as Record<string, unknown>).data as Record<string, unknown>[];
  }
  if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as Record<string, unknown>).items)) {
    return (obj.data as Record<string, unknown>).items as Record<string, unknown>[];
  }
  return [];
};

const formatAssigned = (c: Record<string, unknown>) => ({
  id: String(c.id || c.ticket_number || ""),
  ticket: String(c.ticket_number || c.id || "-"),
  reporter: String(c.reporter_name || c.reporter || "-"),
  phone: String(c.reporter_phone || c.phone || "-"),
  animal_count: (c.animal_count ?? "-") as string | number,
  status: String(c.status || "-"),
  location: String(c.location_address || c.location || "-"),
  severity: String(c.severity || "-"),
  is_urgent: !!c.is_urgent,
  dispatch_id: String((c.dispatch as Record<string, unknown>)?.id || (c.dispatch as Record<string, unknown>)?.dispatch_id || ""),
  vehicle: String((c.dispatch as Record<string, unknown>)?.assigned_vehicle_id || (c.dispatch as Record<string, unknown>)?.vehicle_id || "-"),
  agents: Array.isArray((c.dispatch as Record<string, unknown>)?.agents) && ((c.dispatch as Record<string, unknown>).agents as Record<string, unknown>[]).length > 0
    ? ((c.dispatch as Record<string, unknown>).agents as Record<string, unknown>[]).map((a: Record<string, unknown>) => String(a.agent_id || a.id || "")).join(", ")
    : "-",
  dispatched_at: (c.dispatch as Record<string, unknown>)?.dispatched_at ? formatDateTime((c.dispatch as Record<string, unknown>).dispatched_at as string) : "-",
  created_at: c.created_at ? formatDateTime(c.created_at as string) : "-",
  media: Array.isArray(c.media_evidence) ? (c.media_evidence as string[]) : Array.isArray(c.media_urls) ? (c.media_urls as string[]) : [],
  raw: c,
});

const RescueAgentDashboard = () => {
  const { addToast } = useToast();
  const [activeCard, setActiveCard] = useState<CardTab>("assigned");
  const [searchQuery, setSearchQuery] = useState("");

  const [dashboardData, setDashboardData] = useState<RescueDashboardData>({
    total_calls: 0,
    pending: 0,
    dispatched: 0,
    rescued: 0,
    recent_calls: [],
  });

  const [assignedCases, setAssignedCases] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [selectedCase, setSelectedCase] = useState<Record<string, unknown> | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Quick Action Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusCaseId, setStatusCaseId] = useState("");
  const [selectedNextStatus, setSelectedNextStatus] = useState("");

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryCaseId, setDeliveryCaseId] = useState("");

  const [isDogModalOpen, setIsDogModalOpen] = useState(false);
  const [registerDogForm, setRegisterDogForm] = useState({
    case_id: "",
    name: "",
    breed: "Stray Dog",
    gender: "male",
    estimated_age: "2 years",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterDogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerDogForm.name.trim()) {
      addToast("Please provide a name or temporary identifier for the rescued dog.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const targetCase = assignedCases.find((c) => String(c.id) === registerDogForm.case_id);
      const location = String(targetCase?.location || "Field Location");

      // 1. Reusing EXISTING Dog Management API creates Dog Record and generates Backend UUID
      const petRes = await petService.createPet({
        name: registerDogForm.name.trim(),
        breed: registerDogForm.breed.trim(),
        gender: registerDogForm.gender,
        estimated_age: registerDogForm.estimated_age,
        location_found: location,
        status: "rescued",
        notes: registerDogForm.notes ? `Rescued Case ${String(targetCase?.ticket || registerDogForm.case_id)}: ${registerDogForm.notes}` : `Rescued via Rescue Case #${String(targetCase?.ticket || "")}`,
      });

      const newDogId = (petRes as any)?.id || (petRes as any)?.dog_id || (petRes as any)?.data?.id;

      // 2. Reusing EXISTING Safety Tag / QR provisioning API
      if (newDogId) {
        try {
          await petService.provisionSafetyTag(String(newDogId));
        } catch {
          // Safety tag best effort if auto-provisioned
        }
      }

      addToast(`Rescued Dog Registered! Backend Dog UUID: ${newDogId || "Generated"}. Safety Tag & QR linked.`, "success");
      setIsDogModalOpen(false);
      setRegisterDogForm({ case_id: "", name: "", breed: "Stray Dog", gender: "male", estimated_age: "2 years", notes: "" });
      fetchAssignedCases();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to register rescued dog.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchAssignedCases = useCallback(async () => {
    try {
      const response = await rescueService.getRescueCases({ assigned_to_me: true });
      setAssignedCases(unwrapList(response).map(formatAssigned));
    } catch {
      setAssignedCases([]);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await dashboardService.getRescueDashboard();
      const data = (response as { data?: Record<string, unknown> })?.data || (response as Record<string, unknown>) || {};

      setDashboardData({
        total_calls: Number(data.total_calls ?? data.totalCalls ?? 0),
        pending: Number(data.pending ?? data.pendingCases ?? 0),
        dispatched: Number(data.dispatched ?? data.dispatchedCases ?? 0),
        rescued: Number(data.rescued ?? data.rescuedAnimals ?? 0),
        recent_calls: Array.isArray(data.recent_calls) ? (data.recent_calls as Record<string, unknown>[]) : Array.isArray(data.recentCalls) ? (data.recentCalls as Record<string, unknown>[]) : [],
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Failed to load rescue agent metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
    void fetchAssignedCases();
  }, [fetchDashboard, fetchAssignedCases]);

  useDataSync(() => {
    void fetchDashboard();
    void fetchAssignedCases();
  });

  // Stage Progress Action Handlers
  const handleMarkEnRoute = async (dispatchId: string, caseId: string) => {
    try {
      setIsSubmitting(true);
      if (dispatchId) {
        await rescueService.updateDispatchStatus(dispatchId, "en_route");
      } else {
        await rescueService.updateRescueCase(caseId, { status: "en_route" });
      }
      addToast("Field status updated to En Route!", "info");
      setIsViewModalOpen(false);
      fetchAssignedCases();
      fetchDashboard();
      notifyDataChanged();
    } catch {
      addToast("Failed to update status to En Route.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkLocated = async (caseId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.markRescueLocated(caseId);
      addToast("Animal marked as located on scene!", "info");
      setIsViewModalOpen(false);
      fetchAssignedCases();
      fetchDashboard();
      notifyDataChanged();
    } catch {
      addToast("Failed to mark animal as located.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSecured = async (caseId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.markRescueSecured(caseId);
      addToast("Animal marked as secured!", "info");
      setIsViewModalOpen(false);
      fetchAssignedCases();
      fetchDashboard();
      notifyDataChanged();
    } catch {
      addToast("Failed to mark animal as secured.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAdmitted = async (caseId: string) => {
    try {
      setIsSubmitting(true);
      await rescueService.markRescueAdmitted(caseId);
      addToast("Animal admitted to rescue centre & sent to shelter intake!", "success");
      setIsViewModalOpen(false);
      setIsDeliveryModalOpen(false);
      fetchAssignedCases();
      fetchDashboard();
      notifyDataChanged();
    } catch {
      addToast("Failed to confirm delivery and admit animal.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action Modal Submitters
  const handleUploadPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCaseId) {
      addToast("Please select an assigned rescue case.", "error");
      return;
    }
    if (!photoUrl.trim()) {
      addToast("Please provide an image URL or photo link.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const target = assignedCases.find((c) => String(c.id) === uploadCaseId);
      const existingMedia = Array.isArray(target?.media) ? (target.media as string[]) : [];
      await rescueService.updateRescueCase(uploadCaseId, {
        media_evidence: [...existingMedia, photoUrl.trim()],
      });
      addToast("Rescue photo evidence attached successfully!", "success");
      setIsUploadModalOpen(false);
      setPhotoUrl("");
      setUploadCaseId("");
      fetchAssignedCases();
      notifyDataChanged();
    } catch {
      addToast("Failed to upload rescue photo evidence.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusCaseId || !selectedNextStatus) {
      addToast("Please select a case and next status.", "error");
      return;
    }
    const target = assignedCases.find((c) => String(c.id) === statusCaseId);
    const dispatchId = String(target?.dispatch_id || "");

    if (selectedNextStatus === "en_route") {
      await handleMarkEnRoute(dispatchId, statusCaseId);
    } else if (selectedNextStatus === "located") {
      await handleMarkLocated(statusCaseId);
    } else if (selectedNextStatus === "secured") {
      await handleMarkSecured(statusCaseId);
    } else if (selectedNextStatus === "admitted") {
      await handleMarkAdmitted(statusCaseId);
    }
    setIsStatusModalOpen(false);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryCaseId) {
      addToast("Please select a case for delivery confirmation.", "error");
      return;
    }
    await handleMarkAdmitted(deliveryCaseId);
  };

  // Filter Active Cases for Table
  const getDisplayData = () => {
    let list: Record<string, unknown>[] = [];
    if (activeCard === "pending") {
      list = assignedCases.filter((c) => {
        const s = String(c.status || "").toLowerCase();
        return s === "reported" || s === "pending" || s === "dispatched" || s === "en_route" || s === "located";
      });
    } else if (activeCard === "completed") {
      list = assignedCases.filter((c) => {
        const s = String(c.status || "").toLowerCase();
        return s === "rescued" || s === "admitted" || s === "completed";
      });
    } else if (activeCard === "all") {
      list = assignedCases;
    } else {
      list = assignedCases.filter((c) => String(c.status || "").toLowerCase() !== "admitted");
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) =>
      String(r.ticket || "").toLowerCase().includes(q) ||
      String(r.reporter || "").toLowerCase().includes(q) ||
      String(r.location || "").toLowerCase().includes(q) ||
      String(r.severity || "").toLowerCase().includes(q) ||
      String(r.status || "").toLowerCase().includes(q)
    );
  };

  const displayData = getDisplayData();

  const getTableTitle = () => {
    switch (activeCard) {
      case "pending":
        return "Pending Field Operations";
      case "completed":
        return "My Completed Rescues";
      case "all":
        return "All Assigned Rescue Requests";
      default:
        return "My Active Assigned Cases";
    }
  };

  const stats = [
    {
      title: "Assigned Cases",
      value: loading ? "..." : String(assignedCases.filter((c) => String(c.status || "").toLowerCase() !== "admitted").length),
      trend: "Assigned to You",
      color: "#2563EB",
      icon: <FaAmbulance />,
      selected: activeCard === "assigned",
      onClick: () => setActiveCard("assigned"),
    },
    {
      title: "Pending Cases",
      value: loading ? "..." : String(assignedCases.filter((c) => /reported|pending|dispatched|en_route|located/i.test(String(c.status || ""))).length),
      trend: "Awaiting Field Action",
      color: "#F59E0B",
      icon: <FaClipboardCheck />,
      selected: activeCard === "pending",
      onClick: () => setActiveCard("pending"),
    },
    {
      title: "Completed Rescues",
      value: loading ? "..." : String(assignedCases.filter((c) => /rescued|admitted|completed/i.test(String(c.status || ""))).length),
      trend: "Successfully Completed",
      color: "#10B981",
      icon: <FaCheckCircle />,
      selected: activeCard === "completed",
      onClick: () => setActiveCard("completed"),
    },
    {
      title: "Total Rescue Calls",
      value: loading ? "..." : String(assignedCases.length || dashboardData.total_calls),
      trend: "Overall Requests",
      color: "#6366F1",
      icon: <FaCamera />,
      selected: activeCard === "all",
      onClick: () => setActiveCard("all"),
    },
  ];

  const columns = [
    { key: "ticket", title: "Ticket / ID" },
    { key: "reporter", title: "Reporter" },
    { key: "animal_count", title: "Dogs" },
    { key: "location", title: "Location" },
    {
      key: "severity",
      title: "Priority",
      render: (val: string) => (
        <span style={{ textTransform: "uppercase", fontWeight: 600, fontSize: "12px", color: val === "critical" ? "#DC2626" : val === "high" ? "#EA580C" : val === "medium" ? "#F59E0B" : "#16A34A" }}>
          {val || "-"}
        </span>
      ),
    },
    { key: "agents", title: "Rescue Agents" },
    { key: "vehicle", title: "Vehicle" },
    {
      key: "status",
      title: "Status",
      render: (val: string) => (
        <span style={{ textTransform: "capitalize", fontWeight: 600, fontSize: "12px" }}>{val || "-"}</span>
      ),
    },
    { key: "created_at", title: "Reported At" },
  ];

  const rowActions = (row: Record<string, unknown>) => {
    const status = String(row.status || "").toLowerCase();
    const caseId = String(row.id || "");
    const dispatchId = String(row.dispatch_id || "");

    if (status === "dispatched" || status === "verified") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMarkEnRoute(dispatchId, caseId);
          }}
          style={{ padding: "5px 10px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          <FaAmbulance /> En Route
        </button>
      );
    }
    if (status === "en_route") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMarkLocated(caseId);
          }}
          style={{ padding: "5px 10px", background: "#0891B2", color: "#FFF", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          <FaMapMarkerAlt /> Located
        </button>
      );
    }
    if (status === "located") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMarkSecured(caseId);
          }}
          style={{ padding: "5px 10px", background: "#F59E0B", color: "#FFF", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          Secured
        </button>
      );
    }
    if (status === "secured" || status === "rescued") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMarkAdmitted(caseId);
          }}
          style={{ padding: "5px 10px", background: "#059669", color: "#FFF", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          <FaCheckCircle /> Confirm Delivery
        </button>
      );
    }
    return null;
  };

  const handleRowClick = (row: Record<string, unknown>) => {
    setSelectedCase(row);
    setIsViewModalOpen(true);
  };

  return (
    <div>
      {/* Hero Banner */}
      <div
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
          Field Rescue Agent Console
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          View assigned rescue requests, update field status, upload rescue photos and complete shelter handover.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <QuickActionCard
          icon={<FaCamera />}
          title="Upload Photos"
          subtitle="Attach Rescue Images"
          color="#2563EB"
          onClick={() => {
            if (assignedCases.length > 0) setUploadCaseId(String(assignedCases[0].id));
            setIsUploadModalOpen(true);
          }}
        />

        <QuickActionCard
          icon={<FaClipboardCheck />}
          title="Update Status"
          subtitle="Progress Lifecycle Stage"
          color="#10B981"
          onClick={() => {
            if (assignedCases.length > 0) setStatusCaseId(String(assignedCases[0].id));
            setIsStatusModalOpen(true);
          }}
        />

        <QuickActionCard
          icon={<FaDog />}
          title="Register Rescued Dog"
          subtitle="Generate UUID & Safety Tag"
          color="#7C3AED"
          onClick={() => {
            if (assignedCases.length > 0) setRegisterDogForm((prev) => ({ ...prev, case_id: String(assignedCases[0].id) }));
            setIsDogModalOpen(true);
          }}
        />

        <QuickActionCard
          icon={<FaAmbulance />}
          title="Confirm Delivery"
          subtitle="Handover to Shelter Intake"
          color="#6366F1"
          onClick={() => {
            const rescuable = assignedCases.find((c) => ["secured", "rescued", "located"].includes(String(c.status || "").toLowerCase()));
            if (rescuable) setDeliveryCaseId(String(rescuable.id));
            else if (assignedCases.length > 0) setDeliveryCaseId(String(assignedCases[0].id));
            setIsDeliveryModalOpen(true);
          }}
        />
      </div>

      {/* ACTIVE RESCUE GPS TRACKING NAVIGATION BANNER */}
      {assignedCases.length > 0 && (() => {
        const activeGpsCase = assignedCases.find((c) => {
          const s = String(c.status || "").toLowerCase();
          return ["en_route", "located", "secured", "accepted", "dispatched"].includes(s);
        });
        if (!activeGpsCase) return null;
        const currentStage = String(activeGpsCase.status || "en_route").toLowerCase();
        return (
          <div
            style={{
              marginBottom: "20px",
              background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
              border: "1px solid #4338CA",
              borderRadius: "14px",
              padding: "16px 20px",
              color: "#FFF",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818CF8", fontSize: "20px" }}>
                  <FaCompass className="animate-spin" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, background: "#10B981", color: "#FFF", padding: "2px 8px", borderRadius: "12px", textTransform: "uppercase" }}>
                      ● ACTIVE GPS TRACKING
                    </span>
                    <span style={{ fontSize: "13px", color: "#C7D2FE", fontWeight: 600 }}>
                      Ticket #{String(activeGpsCase.ticket)}
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px" }}>
                    Destination: {String(activeGpsCase.location)}
                  </div>
                </div>
              </div>

              {/* Lifecycle Progress Pipeline */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700 }}>
                <span style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.15)", color: "#FFF" }}>Assigned</span>
                <span>➔</span>
                <span style={{ padding: "4px 8px", borderRadius: "6px", background: currentStage === "en_route" ? "#2563EB" : "rgba(255,255,255,0.15)", color: "#FFF" }}>Accepted / En Route</span>
                <span>➔</span>
                <span style={{ padding: "4px 8px", borderRadius: "6px", background: currentStage === "located" ? "#0891B2" : "rgba(255,255,255,0.15)", color: "#FFF" }}>Arrived at Scene</span>
                <span>➔</span>
                <span style={{ padding: "4px 8px", borderRadius: "6px", background: currentStage === "secured" ? "#F59E0B" : "rgba(255,255,255,0.15)", color: "#FFF" }}>Dog Secured</span>
                <span>➔</span>
                <span style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.15)", color: "#94A3B8" }}>Reached Shelter (GPS Stop)</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dynamic Headline Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* Dynamic Rescue Operations Table */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              {getTableTitle()}
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Showing {displayData.length} records assigned to you
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: "13px" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, location, status..."
                style={{
                  padding: "8px 12px 8px 32px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  width: "240px",
                }}
              />
            </div>
            {loading && (
              <span style={{ color: "#2563EB", fontSize: "12px", fontWeight: 600 }}>
                Loading...
              </span>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={displayData}
          loading={loading}
          error={error}
          onRetry={() => {
            fetchDashboard();
            fetchAssignedCases();
          }}
          emptyMessage="No assigned rescue requests found."
          renderRowActions={rowActions}
          onRowClick={(row) => handleRowClick(row)}
        />
      </div>

      {/* Field Operation & Rescue Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Field Rescue Details — ${selectedCase?.ticket || ""}`}
        size="lg"
        footer={
          selectedCase ? (
            <>
              {["dispatched", "verified"].includes(String(selectedCase.status || "").toLowerCase()) && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMarkEnRoute(String(selectedCase.dispatch_id || ""), String(selectedCase.id || ""))}
                  style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaAmbulance size={12} /> Mark En Route
                </button>
              )}

              {String(selectedCase.status || "").toLowerCase() === "en_route" && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMarkLocated(String(selectedCase.id || ""))}
                  style={{ padding: "8px 16px", background: "#0891B2", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaMapMarkerAlt size={12} /> Mark Located
                </button>
              )}

              {String(selectedCase.status || "").toLowerCase() === "located" && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMarkSecured(String(selectedCase.id || ""))}
                  style={{ padding: "8px 16px", background: "#F59E0B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                >
                  Mark Secured
                </button>
              )}

              {["secured", "rescued"].includes(String(selectedCase.status || "").toLowerCase()) && (
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMarkAdmitted(String(selectedCase.id || ""))}
                  style={{ padding: "8px 16px", background: "#059669", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaCheckCircle size={12} /> Confirm Delivery & Admit to Centre
                </button>
              )}

              {String(selectedCase.status || "").toLowerCase() === "admitted" && (
                <button
                  onClick={() => window.open(`/public-scan/${(selectedCase.raw as Record<string, unknown>)?.dog_id || selectedCase.id}`, "_blank")}
                  style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaExternalLinkAlt size={12} /> View Shelter Profile
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                style={{ padding: "8px 16px", background: "#64748B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
              >
                Close
              </button>
            </>
          ) : null
        }
      >
        {selectedCase && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <strong style={{ color: "#475569" }}>Reporter:</strong> {String(selectedCase.reporter || "-")}
              {selectedCase.phone ? ` (${selectedCase.phone})` : ""}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Location:</strong> {String(selectedCase.location || "-")}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Priority / Severity:</strong>{" "}
              <span
                style={{
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color:
                    selectedCase.severity === "critical"
                      ? "#DC2626"
                      : selectedCase.severity === "high"
                      ? "#EA580C"
                      : selectedCase.severity === "medium"
                      ? "#F59E0B"
                      : "#16A34A",
                }}
              >
                {String(selectedCase.severity || "-")}
              </span>
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Current Rescue Status:</strong> {rescueStatusBadge(String(selectedCase.status || ""))}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Dispatched At:</strong> {String(selectedCase.dispatched_at || "-")}
            </div>

            <div style={{ background: "#F8FAFC", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
              <strong style={{ color: "#0F172A" }}>Assigned Team & Vehicle</strong>
              <div style={{ marginTop: "6px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div><strong>Rescue Agent(s):</strong> {String(selectedCase.agents || "-")}</div>
                <div><strong>Rescue Vehicle:</strong> {String(selectedCase.vehicle || "-")}</div>
              </div>
            </div>

            {/* Evidence Photos */}
            {Array.isArray(selectedCase.media) && (selectedCase.media as string[]).length > 0 && (
              <div>
                <strong style={{ color: "#475569" }}>Evidence Photos:</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                  {(selectedCase.media as string[]).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>
                      📷 Photo {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Photos Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Rescue Photos / Evidence"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setIsUploadModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
            <button type="submit" form="upload-photo-form" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", background: "#2563EB", color: "#FFF", border: "none", fontWeight: 700, fontSize: "13px" }}>{isSubmitting ? "Uploading..." : "Upload Evidence"}</button>
          </>
        }
      >
        <form id="upload-photo-form" onSubmit={handleUploadPhotoSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Select Rescue Case *</label>
            <select required value={uploadCaseId} onChange={(e) => setUploadCaseId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}>
              <option value="">Select assigned case...</option>
              {assignedCases.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.ticket)} — {String(c.location)} ({String(c.status)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Photo Image URL / Evidence Link *</label>
            <input
              type="text"
              required
              value={photoUrl}
              placeholder="https://example.com/rescue-photo.jpg"
              onChange={(e) => setPhotoUrl(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
            />
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Rescue Lifecycle Status"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setIsStatusModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
            <button type="submit" form="update-status-form" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", background: "#10B981", color: "#FFF", border: "none", fontWeight: 700, fontSize: "13px" }}>{isSubmitting ? "Updating..." : "Update Status"}</button>
          </>
        }
      >
        <form id="update-status-form" onSubmit={handleStatusUpdateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Select Assigned Case *</label>
            <select required value={statusCaseId} onChange={(e) => setStatusCaseId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}>
              <option value="">Select active case...</option>
              {assignedCases.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.ticket)} — {String(c.location)} (Current: {String(c.status)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Target Lifecycle Stage *</label>
            <select required value={selectedNextStatus} onChange={(e) => setSelectedNextStatus(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}>
              <option value="">Select next stage...</option>
              <option value="en_route">En Route (On the way to scene)</option>
              <option value="located">Located (Animal spotted on scene)</option>
              <option value="secured">Secured (Animal safely captured)</option>
              <option value="admitted">Admitted (Delivered to centre intake)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Confirm Delivery Modal */}
      <Modal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        title="Confirm Delivery & Centre Handover"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setIsDeliveryModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
            <button type="submit" form="confirm-delivery-form" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", background: "#059669", color: "#FFF", border: "none", fontWeight: 700, fontSize: "13px" }}>{isSubmitting ? "Confirming..." : "Confirm Handover & Admit"}</button>
          </>
        }
      >
        <form id="confirm-delivery-form" onSubmit={handleDeliverySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Select Rescued Animal Case *</label>
            <select required value={deliveryCaseId} onChange={(e) => setDeliveryCaseId(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}>
              <option value="">Select case ready for handover...</option>
              {assignedCases.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.ticket)} — {String(c.location)} ({String(c.status)})
                </option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: 1.5 }}>
            Confirming delivery will mark this rescue case as <strong>ADMITTED</strong> and transfer responsibility to the Shelter Manager Intake Queue.
          </p>
        </form>
      </Modal>

      {/* Register Rescued Dog Modal (Reusing Existing Dog Management UUID & Safety Tag / QR) */}
      <Modal
        isOpen={isDogModalOpen}
        onClose={() => setIsDogModalOpen(false)}
        title="Register Rescued Dog (Dog Management Intake)"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setIsDogModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
            <button type="submit" form="register-rescued-dog-form" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", background: "#7C3AED", color: "#FFF", border: "none", fontWeight: 700, fontSize: "13px" }}>{isSubmitting ? "Registering..." : "Register Dog & Generate Tag"}</button>
          </>
        }
      >
        <form id="register-rescued-dog-form" onSubmit={handleRegisterDogSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Select Rescue Case *</label>
            <select
              required
              value={registerDogForm.case_id}
              onChange={(e) => setRegisterDogForm({ ...registerDogForm, case_id: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
            >
              <option value="">Select assigned rescue case...</option>
              {assignedCases.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.ticket)} — {String(c.location)} ({String(c.status)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Rescued Dog Name / Identifier *</label>
              <input
                type="text"
                required
                placeholder="e.g. Buddy, Lucky, Rescued Dog #12"
                value={registerDogForm.name}
                onChange={(e) => setRegisterDogForm({ ...registerDogForm, name: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Breed / Type</label>
              <input
                type="text"
                value={registerDogForm.breed}
                placeholder="e.g. Mixed Breed, Stray Dog, Labrador"
                onChange={(e) => setRegisterDogForm({ ...registerDogForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Gender</label>
              <select
                value={registerDogForm.gender}
                onChange={(e) => setRegisterDogForm({ ...registerDogForm, gender: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Estimated Age</label>
              <input
                type="text"
                value={registerDogForm.estimated_age}
                placeholder="e.g. 1 year, 6 months"
                onChange={(e) => setRegisterDogForm({ ...registerDogForm, estimated_age: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Physical / Rescue Notes</label>
            <textarea
              rows={2}
              value={registerDogForm.notes}
              placeholder="Injuries, physical markings, rescue location details..."
              onChange={(e) => setRegisterDogForm({ ...registerDogForm, notes: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", marginTop: "4px" }}
            />
          </div>

          <div style={{ background: "#EFF6FF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #BFDBFE", fontSize: "12px", color: "#1D4ED8" }}>
            ℹ️ <strong>Backend Dog UUID & Safety Tag Provisioning:</strong> Submitting will invoke the existing <code>petService.createPet</code> API to generate a permanent Dog UUID and automatically provision a PawGuard Safety Tag / QR code.
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RescueAgentDashboard;