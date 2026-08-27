import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import Modal from "../../../components/common/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaAmbulance,
  FaUserPlus,
  FaMapMarkerAlt,
  FaClipboardList,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaTruck,
  FaSearch,
  FaExternalLinkAlt,
  FaTimesCircle,
  FaEye,
  FaBus,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import rescueService from "../../../services/rescueService";
import volunteerService from "../../../services/volunteerService";
import { useDataSync, notifyDataChanged } from "../../../utils/dataSync";
import { rescueStatusBadge } from "../../../utils/rescueStatus.tsx";
import { formatDateTime } from "../../../utils/dateUtils";

// ── Transport volunteer helpers ──
const isTransportVol = (vol: any): boolean =>
  String(vol?.preferred_role || vol?.volunteer_type || vol?.applied_role || "").toLowerCase().includes("transport");

const isVolPending = (st?: string) => { const s = String(st || "").toLowerCase(); return s === "applied" || s === "pending" || s === "submitted"; };
const isVolApproved = (st?: string) => { const s = String(st || "").toLowerCase(); return s === "approved" || s === "active" || s === "onboarded"; };

const VolBadge = ({ status }: { status?: string }) => {
  const s = String(status || "applied").toLowerCase();
  const color = isVolApproved(s) ? "#047857" : isVolPending(s) ? "#D97706" : s === "rejected" ? "#DC2626" : "#64748B";
  const bg   = isVolApproved(s) ? "#ECFDF5" : isVolPending(s) ? "#FEF3C7" : s === "rejected" ? "#FEE2E2" : "#F1F5F9";
  return <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>{s}</span>;
};

interface RescueDashboardData {
  total_calls: number;
  pending: number;
  dispatched: number;
  rescued: number;
  recent_calls: Record<string, unknown>[];
}

type CardTab = "all" | "assigned" | "pending" | "rescued";

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

const formatCase = (c: Record<string, unknown>) => {
  const rawStatus = String(c.status || "-").toLowerCase();
  const dispatchObj = (c.dispatch as Record<string, unknown>) || null;
  const assignedAgentId = String(c.assigned_agent_id || c.agent_id || dispatchObj?.assigned_driver_id || dispatchObj?.agent_id || c.assigned_agent || "");
  const hasAssignment = !!(c.coordinator_id || assignedAgentId || dispatchObj);
  const displayStatus = (rawStatus === "verified" && hasAssignment) ? "accepted" : rawStatus;

  return {
    id: String(c.id || c.ticket_number || ""),
    ticket: String(c.ticket_number || c.id || "-"),
    reporter: String(c.reporter_name || c.reporter || "-"),
    phone: String(c.reporter_phone || c.phone || "-"),
    animal_count: (c.animal_count ?? "-") as string | number,
    status: displayStatus,
    location: String(c.location_address || c.location || "-"),
    severity: String(c.severity || "-"),
    is_urgent: !!c.is_urgent,
    rejection_rationale: String(c.rejection_rationale || ""),
    dispatch: dispatchObj,
    created_at: c.created_at ? formatDateTime(c.created_at as string) : "-",
    raw: c,
  };
};

const RescueCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeCard, setActiveCard] = useState<CardTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<Record<string, unknown> | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState<RescueDashboardData>({
    total_calls: 0,
    pending: 0,
    dispatched: 0,
    rescued: 0,
    recent_calls: [],
  });

  const [allCases, setAllCases] = useState<Record<string, unknown>[]>([]);
  const [assignedCases, setAssignedCases] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Transport Volunteers ──
  const [transportVols, setTransportVols] = useState<any[]>([]);
  const [volLoading, setVolLoading] = useState(true);
  const [isVolSubmitting, setIsVolSubmitting] = useState(false);
  const [selectedVol, setSelectedVol] = useState<any | null>(null);
  const [isVolModalOpen, setIsVolModalOpen] = useState(false);

  const fetchCasesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, allRes, assignedRes] = await Promise.allSettled([
        dashboardService.getRescueDashboard(),
        rescueService.getRescueCases(),
        rescueService.getRescueCases({ assigned_to_me: true }),
      ]);

      if (dashRes.status === "fulfilled") {
        const data = (dashRes.value as { data?: Record<string, unknown> })?.data || (dashRes.value as Record<string, unknown>) || {};
        setDashboardData({
          total_calls: Number(data.total_calls ?? data.totalCalls ?? 0),
          pending: Number(data.pending ?? data.pendingCases ?? 0),
          dispatched: Number(data.dispatched ?? data.dispatchedCases ?? 0),
          rescued: Number(data.rescued ?? data.rescuedAnimals ?? 0),
          recent_calls: Array.isArray(data.recent_calls) ? (data.recent_calls as Record<string, unknown>[]) : Array.isArray(data.recentCalls) ? (data.recentCalls as Record<string, unknown>[]) : [],
        });
      }

      if (allRes.status === "fulfilled") {
        setAllCases(unwrapList(allRes.value).map(formatCase));
      } else {
        setAllCases([]);
      }

      if (assignedRes.status === "fulfilled") {
        setAssignedCases(unwrapList(assignedRes.value).map(formatCase));
      } else {
        setAssignedCases([]);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Failed to load rescue coordinator metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportVols = useCallback(async () => {
    try {
      setVolLoading(true);
      let res: any;
      try { res = await volunteerService.getVolunteers(); } catch { res = []; }
      const list: any[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      const transport = list.filter(isTransportVol);
      transport.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setTransportVols(transport);
    } catch {
      setTransportVols([]);
    } finally {
      setVolLoading(false);
    }
  }, []);

  const handleVolApprove = async (vol: any) => {
    const id = vol?.id || vol?.application_id || vol?.profile_id;
    if (!id) { addToast("Invalid volunteer ID.", "error"); return; }
    try {
      setIsVolSubmitting(true);
      try { await volunteerService.approveApplication(id); }
      catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 405) { await volunteerService.updateVolunteerProfile(id, { status: "active" }); }
        else throw e;
      }
      addToast("Transport volunteer approved!", "success");
      setTransportVols((prev) => prev.map((v) => v.id === id ? { ...v, status: "approved" } : v));
      if (selectedVol?.id === id) setSelectedVol((p: any) => p ? { ...p, status: "approved" } : null);
      fetchTransportVols();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to approve.", "error");
    } finally { setIsVolSubmitting(false); }
  };

  const handleVolReject = async (vol: any) => {
    const id = vol?.id || vol?.application_id || vol?.profile_id;
    if (!id) { addToast("Invalid volunteer ID.", "error"); return; }
    try {
      setIsVolSubmitting(true);
      try { await volunteerService.rejectApplication(id, "Rejected by Rescue Coordinator."); }
      catch (e: any) {
        if (e?.response?.status === 404 || e?.response?.status === 405) { await volunteerService.updateVolunteerProfile(id, { status: "rejected" }); }
        else throw e;
      }
      addToast("Transport volunteer application rejected.", "info");
      setTransportVols((prev) => prev.map((v) => v.id === id ? { ...v, status: "rejected" } : v));
      if (selectedVol?.id === id) setSelectedVol((p: any) => p ? { ...p, status: "rejected" } : null);
      fetchTransportVols();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to reject.", "error");
    } finally { setIsVolSubmitting(false); }
  };

  useEffect(() => {
    void fetchCasesData();
    void fetchTransportVols();
  }, [fetchTransportVols]);

  useDataSync(() => {
    void fetchCasesData();
    void fetchTransportVols();
  });

  // Calculate dynamic card counts
  const totalCount = allCases.length || dashboardData.total_calls;
  const pendingCount = allCases.filter((c) => /reported|pending|new|verified/i.test(String(c.status || ""))).length || dashboardData.pending;
  const rescuedCount = allCases.filter((c) => /rescued|located|secured|admitted|completed/i.test(String(c.status || ""))).length || dashboardData.rescued;

  // Filter current active dataset
  const getDisplayData = () => {
    let list: Record<string, unknown>[];
    if (activeCard === "assigned") {
      list = assignedCases;
    } else if (activeCard === "pending") {
      list = allCases.filter((c) => {
        const s = String(c.status || "").toLowerCase();
        return s === "reported" || s === "pending" || s === "new" || s === "verified";
      });
    } else if (activeCard === "rescued") {
      list = allCases.filter((c) => {
        const s = String(c.status || "").toLowerCase();
        return s === "rescued" || s === "located" || s === "secured" || s === "admitted" || s === "completed";
      });
    } else {
      list = allCases;
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
      case "assigned":
        return "My Assigned Cases";
      case "pending":
        return "Pending Rescue Cases";
      case "rescued":
        return "Rescued Dogs / Completed Cases";
      default:
        return "All Rescue Calls";
    }
  };

  const getEmptyMessage = () => {
    switch (activeCard) {
      case "assigned":
        return "No cases are currently assigned to you.";
      case "pending":
        return "No pending rescue cases found.";
      case "rescued":
        return "No rescued dogs or completed cases found.";
      default:
        return "No rescue calls found.";
    }
  };

  const handleRowClick = (row: Record<string, unknown>) => {
    setSelectedRequest(row);
    setIsViewModalOpen(true);
  };

  // Status Action Handlers for Modal
  const handleVerifyRequest = async (id: string) => {
    try {
      setIsActionLoading(true);
      await rescueService.updateRescueCase(id, { status: "verified" });
      addToast("Rescue incident verified successfully!", "success");
      setIsViewModalOpen(false);
      fetchCasesData();
    } catch {
      addToast("Failed to verify rescue incident.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEscalateRequest = async (id: string) => {
    try {
      setIsActionLoading(true);
      await rescueService.escalateRescue(id, "high_priority", "Urgent escalation from coordinator dashboard.");
      addToast("Rescue case escalated to high priority!", "info");
      setIsViewModalOpen(false);
      fetchCasesData();
    } catch {
      addToast("Failed to escalate rescue case.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLocatedRequest = async (id: string) => {
    try {
      setIsActionLoading(true);
      await rescueService.markRescueLocated(id);
      addToast("Animal marked as located by field team!", "info");
      setIsViewModalOpen(false);
      fetchCasesData();
    } catch {
      addToast("Failed to update status to located.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSecuredRequest = async (id: string) => {
    try {
      setIsActionLoading(true);
      await rescueService.markRescueSecured(id);
      addToast("Animal marked as secured!", "info");
      setIsViewModalOpen(false);
      fetchCasesData();
    } catch {
      addToast("Failed to update status to secured.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdmittedRequest = async (id: string) => {
    try {
      setIsActionLoading(true);
      await rescueService.markRescueAdmitted(id);
      addToast("Animal successfully admitted to rescue centre!", "success");
      setIsViewModalOpen(false);
      fetchCasesData();
    } catch {
      addToast("Failed to admit animal to rescue centre.", "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const approvedTransportVols = transportVols.filter((v) => isVolApproved(v.status));
  const pendingTransportVols = transportVols.filter((v) => isVolPending(v.status));

  const stats = [
    {
      title: "Total Rescue Calls",
      value: loading ? "..." : String(totalCount),
      trend: "All Rescue Requests",
      color: "#EF4444",
      icon: <FaExclamationTriangle />,
      selected: activeCard === "all",
      onClick: () => {
        setActiveCard("all");
        const el = document.getElementById("rescue-table-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "My Assigned Cases",
      value: loading ? "..." : String(assignedCases.length),
      trend: "Assigned to You",
      color: "#2563EB",
      icon: <FaClipboardList />,
      selected: activeCard === "assigned",
      onClick: () => {
        setActiveCard("assigned");
        const el = document.getElementById("rescue-table-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Pending Cases",
      value: loading ? "..." : String(pendingCount),
      trend: "Awaiting Dispatch",
      color: "#F59E0B",
      icon: <FaClock />,
      selected: activeCard === "pending",
      onClick: () => {
        setActiveCard("pending");
        const el = document.getElementById("rescue-table-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Dogs Rescued",
      value: loading ? "..." : String(rescuedCount),
      trend: "Successfully Completed",
      color: "#10B981",
      icon: <FaCheckCircle />,
      selected: activeCard === "rescued",
      onClick: () => {
        setActiveCard("rescued");
        const el = document.getElementById("rescue-table-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Transport Volunteers",
      value: volLoading ? "..." : String(transportVols.length),
      trend: `${approvedTransportVols.length} Available`,
      color: "#7C3AED",
      icon: <FaBus />,
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
    const isVerified = status === "verified";
    const canAssign = ["verified", "dispatched", "located"].includes(status);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/rescue-dispatch?case_id=${encodeURIComponent(String(row.id || ""))}`);
        }}
        disabled={!canAssign}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "none",
          background: isVerified ? "#10B981" : "#2563EB",
          color: "#FFF",
          fontSize: "12px",
          fontWeight: 600,
          cursor: canAssign ? "pointer" : "not-allowed",
          opacity: canAssign ? 1 : 0.45,
        }}
      >
        <FaTruck /> {isVerified ? "Accept & Assign Team" : "Assign Team"}
      </button>
    );
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
          Rescue Coordinator Control Center
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Emergency response management: dispatch field agents, monitor rescue requests and coordinate rescue operations.
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
          icon={<FaAmbulance />}
          title="New Emergency"
          subtitle="Log Distress Call"
          color="#EF4444"
          onClick={() => navigate("/rescue-requests?action=new")}
        />

        <QuickActionCard
          icon={<FaUserPlus />}
          title="Assign Agent"
          subtitle="Dispatch Field Agent"
          color="#2563EB"
          onClick={() => navigate("/rescue-dispatch")}
        />

        <QuickActionCard
          icon={<FaMapMarkerAlt />}
          title="Track Agents"
          subtitle="Live Tracking"
          color="#10B981"
          onClick={() => navigate("/rescue-dispatch")}
        />

        <QuickActionCard
          icon={<FaClipboardList />}
          title="Shelter Directory"
          subtitle="Handover Destination"
          color="#6366F1"
          onClick={() => navigate("/shelters")}
        />
      </div>

      {/* Dynamic Interactive Stat Cards */}
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
      <div id="rescue-table-section" className="soft-card" style={{ padding: "20px" }}>
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
              Showing {displayData.length} records matching {activeCard} filter
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: "13px" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, reporter, location..."
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
            fetchCasesData();
          }}
          emptyMessage={getEmptyMessage()}
          renderRowActions={rowActions}
          onRowClick={(row) => handleRowClick(row)}
        />
      </div>

      {/* Rescue Request Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`Rescue Request Details${selectedRequest?.ticket ? ` — ${selectedRequest.ticket}` : ""}`}
        size="lg"
        footer={
          selectedRequest ? (
            <>
              {["reported", "pending"].includes(String(selectedRequest.status || "").toLowerCase()) && (
                <>
                  <button
                    disabled={isActionLoading}
                    onClick={() => handleVerifyRequest(String(selectedRequest.id || ""))}
                    style={{ padding: "8px 16px", background: "#10B981", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Verify Incident
                  </button>
                  <button
                    disabled={isActionLoading}
                    onClick={() => handleEscalateRequest(String(selectedRequest.id || ""))}
                    style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Escalate
                  </button>
                </>
              )}

              {String(selectedRequest.status || "").toLowerCase() === "verified" && (
                <>
                  <button
                    disabled={isActionLoading}
                    onClick={() => {
                      setIsViewModalOpen(false);
                      navigate(`/rescue-dispatch?case_id=${encodeURIComponent(String(selectedRequest.id || ""))}`);
                    }}
                    style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaTruck size={12} /> Accept Case & Dispatch Team
                  </button>
                  <button
                    disabled={isActionLoading}
                    onClick={() => handleEscalateRequest(String(selectedRequest.id || ""))}
                    style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Escalate
                  </button>
                </>
              )}

              {String(selectedRequest.status || "").toLowerCase() === "dispatched" && (
                <>
                  <button
                    disabled={isActionLoading}
                    onClick={() => handleLocatedRequest(String(selectedRequest.id || ""))}
                    style={{ padding: "8px 16px", background: "#0891B2", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Mark Located
                  </button>
                  <button
                    disabled={isActionLoading}
                    onClick={() => handleEscalateRequest(String(selectedRequest.id || ""))}
                    style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                  >
                    Escalate
                  </button>
                </>
              )}

              {String(selectedRequest.status || "").toLowerCase() === "located" && (
                <button
                  disabled={isActionLoading}
                  onClick={() => handleSecuredRequest(String(selectedRequest.id || ""))}
                  style={{ padding: "8px 16px", background: "#F59E0B", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                >
                  Mark Secured
                </button>
              )}

              {String(selectedRequest.status || "").toLowerCase() === "rescued" && (
                <button
                  disabled={isActionLoading}
                  onClick={() => handleAdmittedRequest(String(selectedRequest.id || ""))}
                  style={{ padding: "8px 16px", background: "#059669", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}
                >
                  Admit to Centre
                </button>
              )}

              {String(selectedRequest.status || "").toLowerCase() === "admitted" && (
                <button
                  onClick={() => window.open(`/public-scan/${(selectedRequest.raw as Record<string, unknown>)?.dog_id || selectedRequest.id}`, "_blank")}
                  style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaExternalLinkAlt size={12} /> View Dog Profile
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
        {selectedRequest && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <strong style={{ color: "#475569" }}>Reporter:</strong> {String(selectedRequest.reporter || "-")}
              {selectedRequest.phone ? ` (${selectedRequest.phone})` : ""}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Location:</strong> {String(selectedRequest.location || "-")}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Priority / Severity:</strong>{" "}
              <span
                style={{
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color:
                    selectedRequest.severity === "critical"
                      ? "#DC2626"
                      : selectedRequest.severity === "high"
                      ? "#EA580C"
                      : selectedRequest.severity === "medium"
                      ? "#F59E0B"
                      : "#16A34A",
                }}
              >
                {String(selectedRequest.severity || "-")}
              </span>
              {Boolean(selectedRequest.is_urgent) && (
                <span style={{ marginLeft: "8px", background: "#FEF2F2", color: "#DC2626", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}>
                  URGENT
                </span>
              )}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Current Status:</strong> {rescueStatusBadge(String(selectedRequest.status || ""))}
            </div>
            <div>
              <strong style={{ color: "#475569" }}>Reported At:</strong> {String(selectedRequest.created_at || "-")}
            </div>

            {selectedRequest.rejection_rationale ? (
              <div style={{ background: "#FEF2F2", padding: "10px 14px", borderRadius: "8px", border: "1px solid #FCA5A5" }}>
                <strong style={{ color: "#DC2626" }}>Rejection Rationale:</strong> {String(selectedRequest.rejection_rationale)}
              </div>
            ) : null}

            {selectedRequest.dispatch ? (
              <div style={{ background: "#F5F3FF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #DDD6FE" }}>
                <strong style={{ color: "#7C3AED" }}>Dispatch & Field Operations</strong>
                <div style={{ marginTop: "6px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {(selectedRequest.dispatch as Record<string, unknown>).assigned_vehicle_id || (selectedRequest.dispatch as Record<string, unknown>).vehicle_id ? (
                    <div><strong>Vehicle:</strong> {String((selectedRequest.dispatch as Record<string, unknown>).assigned_vehicle_id || (selectedRequest.dispatch as Record<string, unknown>).vehicle_id)}</div>
                  ) : null}
                  {(selectedRequest.dispatch as Record<string, unknown>).assigned_driver_id ? (
                    <div><strong>Driver:</strong> {String((selectedRequest.dispatch as Record<string, unknown>).assigned_driver_id)}</div>
                  ) : null}
                  {(selectedRequest.dispatch as Record<string, unknown>).dispatched_at ? (
                    <div><strong>Dispatched:</strong> {formatDateTime((selectedRequest.dispatch as Record<string, unknown>).dispatched_at as string)}</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RescueCoordinatorDashboard;