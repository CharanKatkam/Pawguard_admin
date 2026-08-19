import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaEnvelopeOpen,
  FaTrash,
  FaPaperPlane,
  FaExclamationTriangle,
  FaStethoscope,
  FaHeart,
  FaUsers,
  FaUserPlus,
  FaBuilding,
  FaPaw,
  FaBoxOpen,
  FaCertificate,
  FaDollarSign,
  FaLock,
  FaAmbulance,
  FaCheckCircle,
  FaBan,
  FaPauseCircle,
  FaPlayCircle,
  FaShieldAlt,
  FaSync,
  FaFilter,
  FaClock,
} from "react-icons/fa";
import { useNotifications } from "../../hooks/useNotifications";
import { useToast } from "../../context/ToastContext";
import SendNotificationModal from "../../components/notifications/SendNotificationModal";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import notificationService, {
  type NotificationGovernanceOverview,
  type GlobalNotificationEngineStatus,
  type NotificationApprovalItem,
  type NotificationDispatchLog,
  type NotificationAuditLog,
} from "../../services/notificationService";
import { getCurrentUserRole } from "../../utils/roleUtils";
import { canManageNotificationGovernance } from "../../utils/rbac";
import { formatDateTime } from "../../utils/dateUtils";

type MainTab = "inbox" | "governance";
type GovernanceTab = "overview" | "approvals" | "dispatch" | "audit" | "rules";

const typeIcon: Record<string, React.ReactNode> = {
  emergency: <FaExclamationTriangle />,
  rescue: <FaAmbulance />,
  shelter: <FaBuilding />,
  shelter_transfer: <FaBuilding />,
  transfer_requested: <FaBuilding />,
  placement_requested: <FaBuilding />,
  lost_found: <FaPaw />,
  lost_pet_alert: <FaPaw />,
  medical: <FaStethoscope />,
  adoption: <FaHeart />,
  volunteer: <FaUsers />,
  user_created: <FaUserPlus />,
  user_updated: <FaUserPlus />,
  user_deleted: <FaUserPlus />,
  shelter_added: <FaBuilding />,
  animal_registered: <FaPaw />,
  animal_updated: <FaPaw />,
  inventory_changed: <FaBoxOpen />,
  certificate_generated: <FaCertificate />,
  finance_action: <FaDollarSign />,
  role_permission_changed: <FaLock />,
};

const typeColor = (type: string): string => {
  if (/emergency|rejected|deleted/.test(type)) return "#EF4444";
  if (/rescue|located|dispatched|secured|admitted/.test(type)) return "#7C3AED";
  if (/medical|animal/.test(type)) return "#06B6D4";
  if (/adoption|approved|certificate/.test(type)) return "#EC4899";
  if (/volunteer/.test(type)) return "#F59E0B";
  if (/finance/.test(type)) return "#10B981";
  if (/shelter|inventory|user|role|transfer|placement/.test(type)) return "#2563EB";
  if (/lost/.test(type)) return "#F59E0B";
  return "#64748B";
};

const Notifications = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userRole = getCurrentUserRole();
  const isGovernanceAuthorized = canManageNotificationGovernance(userRole || undefined);

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("inbox");
  const [governanceTab, setGovernanceTab] = useState<GovernanceTab>("overview");

  const [isSendModalOpen, setIsSendModalOpen] = useState(() => searchParams.get("action") === "send");
  const { addToast } = useToast();

  // Inbox Notifications state
  const {
    notifications,
    loading: inboxLoading,
    error: inboxError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ autoRefresh: true, refreshInterval: 30000 });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Governance State
  const [govOverview, setGovOverview] = useState<NotificationGovernanceOverview | null>(null);
  const [globalStatus, setGlobalStatus] = useState<GlobalNotificationEngineStatus | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<NotificationApprovalItem[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<NotificationDispatchLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<NotificationAuditLog[]>([]);
  const [modulesConfig, setModulesConfig] = useState<any[]>([]);

  const [govLoading, setGovLoading] = useState(false);
  const [govError, setGovError] = useState<string | null>(null);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>("");

  // Governance Modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [selectedApprovalItem, setSelectedApprovalItem] = useState<NotificationApprovalItem | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "send") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Fetch Governance Data
  const fetchGovernanceData = useCallback(async () => {
    if (!isGovernanceAuthorized) return;
    try {
      setGovLoading(true);
      setGovError(null);

      // Concurrent fetch using real APIs
      const [overviewRes, globalRes, approvalsRes, dispatchRes, auditRes, modulesRes] = await Promise.allSettled([
        notificationService.getGovernanceOverview(),
        notificationService.getGlobalEngineStatus(),
        notificationService.getApprovalQueue(approvalStatusFilter ? { status: approvalStatusFilter } : undefined),
        notificationService.getDispatchLogs(),
        notificationService.getGovernanceAuditLogs(),
        notificationService.getModulesConfig(),
      ]);

      if (overviewRes.status === "fulfilled") setGovOverview(overviewRes.value);
      if (globalRes.status === "fulfilled") setGlobalStatus(globalRes.value);
      if (approvalsRes.status === "fulfilled") setApprovalQueue(approvalsRes.value);
      if (dispatchRes.status === "fulfilled") setDispatchLogs(dispatchRes.value);
      if (auditRes.status === "fulfilled") setAuditLogs(auditRes.value);
      if (modulesRes.status === "fulfilled") setModulesConfig(modulesRes.value);
    } catch (err: any) {
      setGovError(err?.response?.data?.detail || err?.message || "Failed to load notification governance metrics.");
    } finally {
      setGovLoading(false);
    }
  }, [isGovernanceAuthorized, approvalStatusFilter]);

  useEffect(() => {
    if (activeMainTab === "governance" && isGovernanceAuthorized) {
      void fetchGovernanceData();
    }
  }, [activeMainTab, isGovernanceAuthorized, fetchGovernanceData]);

  // Handle Inbox Notification Actions
  const handleOpenInboxItem = async (n: any) => {
    try {
      if (!n.read) {
        await markAsRead(n.id);
      }
      const targetUrl = n.data?.action_url || n.action_url;
      if (targetUrl) {
        navigate(targetUrl);
      } else if (n.type === "medical") {
        navigate("/veterinarian-dashboard?tab=shelter_requests");
      } else if (n.type === "adoption") {
        navigate("/adoptions");
      } else if (n.type === "shelter") {
        navigate("/shelter-dogs");
      }
    } catch {
      /* ignore */
    }
  };

  const handleDeleteInboxItem = async (id: string) => {
    try {
      await deleteNotification(id);
      addToast("Notification removed", "success");
    } catch {
      addToast("Failed to remove notification", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      addToast("All notifications marked as read", "success");
    } catch {
      addToast("Failed to update notifications", "error");
    }
  };

  // Governance Actions
  const handleToggleGlobalEngine = async () => {
    if (!globalStatus && !govOverview) return;
    const currentPaused = Boolean(globalStatus?.is_paused || govOverview?.is_paused);
    const newPaused = !currentPaused;

    try {
      setIsSubmitting(true);
      await notificationService.updateGlobalEngineStatus({
        is_paused: newPaused,
        paused_reason: newPaused ? "Global pause triggered by Super Admin" : "Engine resumed by Super Admin",
      });
      addToast(`Global Notification Engine ${newPaused ? "PAUSED" : "RESUMED"} successfully!`, newPaused ? "info" : "success");
      fetchGovernanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to update global engine status.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveItem = async (item: NotificationApprovalItem) => {
    try {
      setIsSubmitting(true);
      await notificationService.approveNotification(item.id);
      addToast(`Notification approval #${String(item.id).slice(0, 8)} APPROVED!`, "success");
      fetchGovernanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to approve notification.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRejectModal = (item: NotificationApprovalItem) => {
    setSelectedApprovalItem(item);
    setActionReason("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovalItem) return;
    if (!actionReason.trim()) {
      addToast("Rejection reason is required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await notificationService.rejectNotification(selectedApprovalItem.id, actionReason.trim());
      addToast(`Notification approval #${String(selectedApprovalItem.id).slice(0, 8)} REJECTED.`, "info");
      setIsRejectModalOpen(false);
      setSelectedApprovalItem(null);
      setActionReason("");
      fetchGovernanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to reject notification.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPauseModal = (item: NotificationApprovalItem) => {
    setSelectedApprovalItem(item);
    setActionReason("");
    setIsPauseModalOpen(true);
  };

  const handleConfirmPauseItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovalItem) return;
    if (!actionReason.trim()) {
      addToast("Pause reason is required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await notificationService.pauseNotification(selectedApprovalItem.id, actionReason.trim());
      addToast(`Notification approval #${String(selectedApprovalItem.id).slice(0, 8)} PAUSED.`, "info");
      setIsPauseModalOpen(false);
      setSelectedApprovalItem(null);
      setActionReason("");
      fetchGovernanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to pause notification.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResumeItem = async (item: NotificationApprovalItem) => {
    try {
      setIsSubmitting(true);
      await notificationService.resumeNotification(item.id);
      addToast(`Notification approval #${String(item.id).slice(0, 8)} RESUMED.`, "success");
      fetchGovernanceData();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to resume notification.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approval Table Columns
  const approvalColumns = [
    {
      key: "title",
      title: "Notification & Message",
      render: (v: string, row: NotificationApprovalItem) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "14px" }}>{v || row.title || "Notification"}</div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{row.body || row.message || "No body content"}</div>
          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "3px" }}>ID: <code>{String(row.id).slice(0, 8)}</code></div>
        </div>
      ),
    },
    {
      key: "module",
      title: "Module & Trigger",
      render: (v: string, row: NotificationApprovalItem) => (
        <div>
          <div style={{ fontWeight: 700, color: "#2563EB", textTransform: "capitalize" }}>{v || row.module || "System"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Trigger: {row.trigger || "manual_broadcast"}</div>
        </div>
      ),
    },
    {
      key: "recipient_count",
      title: "Recipients & Priority",
      render: (v: number, row: NotificationApprovalItem) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v ?? row.recipients ?? 0} Recipients</div>
          <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: "#EFF6FF", color: "#1D4ED8", textTransform: "uppercase" }}>
            {row.priority || "normal"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Approval Status",
      render: (v: string, row: NotificationApprovalItem) => {
        const st = String(v || row.status || "pending").toLowerCase();
        let bg = "#FEF3C7";
        let color = "#B45309";
        if (st === "approved") { bg = "#D1FAE5"; color = "#047857"; }
        else if (st === "rejected") { bg = "#FEE2E2"; color = "#B91C1C"; }
        else if (st === "paused") { bg = "#EDE9FE"; color = "#6D28D9"; }

        return (
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
              {st}
            </span>
            {(row.rejection_reason || row.paused_reason || row.reason) && (
              <div style={{ fontSize: "11px", color: "#991B1B", marginTop: "3px", fontStyle: "italic" }}>
                Reason: {row.rejection_reason || row.paused_reason || row.reason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "created_at",
      title: "Submitted Date",
      render: (v: string, row: NotificationApprovalItem) => formatDateTime(v || row.submitted_at),
    },
    {
      key: "actions",
      title: "Governance Decision",
      render: (_: string, row: NotificationApprovalItem) => {
        const st = String(row.status || "pending").toLowerCase();

        return (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {st === "pending" && (
              <>
                <button
                  onClick={() => void handleApproveItem(row)}
                  disabled={isSubmitting}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaCheckCircle /> Approve
                </button>

                <button
                  onClick={() => handleOpenRejectModal(row)}
                  disabled={isSubmitting}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#EF4444", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaBan /> Reject
                </button>

                <button
                  onClick={() => handleOpenPauseModal(row)}
                  disabled={isSubmitting}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#6D28D9", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaPauseCircle /> Pause
                </button>
              </>
            )}

            {st === "paused" && (
              <button
                onClick={() => void handleResumeItem(row)}
                disabled={isSubmitting}
                style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaPlayCircle /> Resume
              </button>
            )}

            {(st === "approved" || st === "rejected") && (
              <span style={{ fontSize: "11px", color: "#94A3B8", fontStyle: "italic" }}>Decision Finalized</span>
            )}
          </div>
        );
      },
    },
  ];

  // Dispatch Log Columns
  const dispatchColumns = [
    {
      key: "notification_title",
      title: "Notification Title",
      render: (v: string, row: NotificationDispatchLog) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>{v || row.title || "Push Dispatch"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>ID: {String(row.id).slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: "module",
      title: "Module & Trigger",
      render: (v: string, row: NotificationDispatchLog) => (
        <div>
          <div style={{ fontWeight: 700, color: "#2563EB" }}>{v || row.module || "General"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>{row.trigger || "system_event"}</div>
        </div>
      ),
    },
    {
      key: "recipient_count",
      title: "Recipients",
      render: (v: number) => <strong>{v ?? 1} Delivered</strong>,
    },
    {
      key: "status",
      title: "Dispatch Status",
      render: (v: string, row: NotificationDispatchLog) => {
        const st = String(v || row.status || "delivered").toLowerCase();
        const color = st === "delivered" || st === "sent" ? "#047857" : st === "failed" ? "#B91C1C" : "#D97706";
        const bg = st === "delivered" || st === "sent" ? "#D1FAE5" : st === "failed" ? "#FEE2E2" : "#FEF3C7";
        return (
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
              {st}
            </span>
            {(row.failure_reason || row.error) && (
              <div style={{ fontSize: "11px", color: "#991B1B", marginTop: "3px" }}>Error: {row.failure_reason || row.error}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "sent_at",
      title: "Sent Date / Time",
      render: (v: string, row: NotificationDispatchLog) => formatDateTime(v || row.created_at),
    },
  ];

  // Audit Log Columns
  const auditColumns = [
    {
      key: "actor",
      title: "Actor / Admin",
      render: (v: string, row: NotificationAuditLog) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v || row.actor_email || row.user || "Super Admin"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>ID: {String(row.id).slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: "action",
      title: "Governance Action",
      render: (v: string) => (
        <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "6px", background: "#EFF6FF", color: "#1D4ED8", textTransform: "uppercase" }}>
          {v}
        </span>
      ),
    },
    {
      key: "approval_id",
      title: "Target / Approval ID",
      render: (v: string, row: NotificationAuditLog) => (
        <code>{String(v || row.notification_id || "-").slice(0, 12)}</code>
      ),
    },
    {
      key: "timestamp",
      title: "Timestamp",
      render: (v: string, row: NotificationAuditLog) => formatDateTime(v || row.created_at),
    },
    {
      key: "result",
      title: "Result & Reason",
      render: (v: string, row: NotificationAuditLog) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{v || "SUCCESS"}</div>
          {row.reason && <div style={{ fontSize: "11px", color: "#64748B", fontStyle: "italic" }}>{row.reason}</div>}
        </div>
      ),
    },
  ];

  const govPendingCount = govOverview?.pending_approvals ?? govOverview?.pending ?? approvalQueue.filter((a) => a.status === "pending").length;
  const isEnginePaused = Boolean(globalStatus?.is_paused || govOverview?.is_paused);

  return (
    <div>
      {/* Banner Header */}
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>System Notifications &amp; Governance</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          {isGovernanceAuthorized
            ? "Operational notification inbox and Super Admin push governance controls."
            : unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
            : "You're all caught up."}
        </p>
      </div>

      {/* Main Top-Level Tab Switcher (Governance available only for Authorized Roles) */}
      {isGovernanceAuthorized && (
        <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #E2E8F0", marginBottom: "20px" }}>
          <button
            onClick={() => setActiveMainTab("inbox")}
            style={{
              padding: "10px 22px",
              borderRadius: "10px 10px 0 0",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              background: activeMainTab === "inbox" ? "#0F172A" : "transparent",
              color: activeMainTab === "inbox" ? "#FFFFFF" : "#64748B",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaBell /> Notification Inbox {unreadCount > 0 && <span style={{ background: "#2563EB", color: "#FFF", fontSize: "11px", borderRadius: "999px", padding: "1px 6px" }}>{unreadCount}</span>}
          </button>

          <button
            onClick={() => setActiveMainTab("governance")}
            style={{
              padding: "10px 22px",
              borderRadius: "10px 10px 0 0",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              background: activeMainTab === "governance" ? "#0F172A" : "transparent",
              color: activeMainTab === "governance" ? "#FFFFFF" : "#64748B",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaShieldAlt color="#F59E0B" /> Notification Governance &amp; Approvals {govPendingCount > 0 && <span style={{ background: "#EF4444", color: "#FFF", fontSize: "11px", borderRadius: "999px", padding: "1px 6px" }}>{govPendingCount}</span>}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OPERATIONAL NOTIFICATION INBOX (Used by all roles) */}
      {/* ========================================================================= */}
      {activeMainTab === "inbox" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "9px",
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                color: unreadCount === 0 ? "#CBD5E1" : "#2563EB",
                fontWeight: 600,
                fontSize: "13px",
                cursor: unreadCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              <FaEnvelopeOpen /> Mark all read
            </button>
            <button
              onClick={() => setIsSendModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                borderRadius: "9px",
                border: "none",
                background: "#2563EB",
                color: "#FFF",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <FaPaperPlane /> Send Notification
            </button>
          </div>

          {inboxError && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: "13px" }}>
              {inboxError}
            </div>
          )}

          <div className="soft-card" style={{ padding: "20px" }}>
            {inboxLoading ? (
              <p style={{ color: "#64748B", textAlign: "center", padding: "30px 0" }}>Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                <FaBell size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: "15px" }}>No notifications yet</p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {notifications.map((n) => {
                  const color = typeColor(n.type);
                  return (
                    <li
                      key={n.id}
                      onClick={() => handleOpenInboxItem(n)}
                      style={{
                        display: "flex",
                        gap: "14px",
                        alignItems: "flex-start",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: n.read ? "#F8FAFC" : "#EFF6FF",
                        border: `1px solid ${n.read ? "#E2E8F0" : "#BFDBFE"}`,
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "11px",
                          background: `${color}15`,
                          color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        {typeIcon[n.type] ?? <FaBell />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>{n.title}</span>
                          {!n.read && (
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#2563EB", color: "#FFF", flexShrink: 0 }}>
                              New
                            </span>
                          )}
                        </div>
                        {(n.created_at || n.time) && (
                          <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>
                            {formatDateTime(n.created_at || n.time)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenInboxItem(n); }}
                            title="Mark as read & open"
                            style={{ border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#2563EB", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: 13 }}
                          >
                            <FaEnvelopeOpen />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteInboxItem(n.id); }}
                          title="Delete"
                          style={{ border: "1px solid #FECACA", background: "#FEF2F2", color: "#EF4444", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: 13 }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUPER ADMIN GOVERNANCE CONTROLS */}
      {/* ========================================================================= */}
      {activeMainTab === "governance" && isGovernanceAuthorized && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Global Pause Warning Banner */}
          {isEnginePaused && (
            <div style={{ padding: "16px", borderRadius: "12px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FaExclamationTriangle size={22} color="#DC2626" />
                <div>
                  <strong style={{ fontSize: "15px" }}>GLOBAL NOTIFICATION ENGINE IS PAUSED</strong>
                  <div style={{ fontSize: "13px", marginTop: "2px" }}>
                    Reason: {globalStatus?.paused_reason || "Global push engine paused by Super Admin policy."}
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleGlobalEngine}
                disabled={isSubmitting}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaPlayCircle /> Resume Engine
              </button>
            </div>
          )}

          {/* Overview Live Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <StatCard
              title="Pending Approvals"
              value={String(govPendingCount)}
              trend={govPendingCount > 0 ? "Action Required" : "Queue Empty"}
              color={govPendingCount > 0 ? "#DC2626" : "#10B981"}
              icon={<FaClock />}
            />
            <StatCard
              title="Sent Today"
              value={String(govOverview?.sent_today ?? govOverview?.sent ?? 0)}
              trend="Dispatched"
              color="#2563EB"
              icon={<FaPaperPlane />}
            />
            <StatCard
              title="Blocked / Failed"
              value={String((govOverview?.blocked || 0) + (govOverview?.failed || 0))}
              trend="Audit Flagged"
              color="#F59E0B"
              icon={<FaBan />}
            />
            <StatCard
              title="Global Engine Status"
              value={isEnginePaused ? "PAUSED" : "ACTIVE"}
              trend={isEnginePaused ? "Dispatches Blocked" : "Operational"}
              color={isEnginePaused ? "#DC2626" : "#10B981"}
              icon={<FaShieldAlt />}
            />
          </div>

          {/* Governance Sub-Tab Switcher */}
          <div style={{ display: "flex", gap: "8px", background: "#F1F5F9", padding: "6px", borderRadius: "10px", width: "fit-content", flexWrap: "wrap" }}>
            <button
              onClick={() => setGovernanceTab("overview")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                background: governanceTab === "overview" ? "#FFF" : "transparent",
                color: governanceTab === "overview" ? "#0F172A" : "#64748B",
                boxShadow: governanceTab === "overview" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Overview &amp; Engine Control
            </button>

            <button
              onClick={() => setGovernanceTab("approvals")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                background: governanceTab === "approvals" ? "#FFF" : "transparent",
                color: governanceTab === "approvals" ? "#0F172A" : "#64748B",
                boxShadow: governanceTab === "approvals" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Approval Queue ({approvalQueue.length})
            </button>

            <button
              onClick={() => setGovernanceTab("dispatch")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                background: governanceTab === "dispatch" ? "#FFF" : "transparent",
                color: governanceTab === "dispatch" ? "#0F172A" : "#64748B",
                boxShadow: governanceTab === "dispatch" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Dispatch Logs
            </button>

            <button
              onClick={() => setGovernanceTab("audit")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                background: governanceTab === "audit" ? "#FFF" : "transparent",
                color: governanceTab === "audit" ? "#0F172A" : "#64748B",
                boxShadow: governanceTab === "audit" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Audit Logs
            </button>

            <button
              onClick={() => setGovernanceTab("rules")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                background: governanceTab === "rules" ? "#FFF" : "transparent",
                color: governanceTab === "rules" ? "#0F172A" : "#64748B",
                boxShadow: governanceTab === "rules" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
              }}
            >
              Module &amp; Trigger Rules
            </button>
          </div>

          {govError && (
            <div style={{ padding: "12px 16px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {govError}
            </div>
          )}

          {/* SUB-VIEW 1: OVERVIEW & ENGINE CONTROL */}
          {governanceTab === "overview" && (
            <div className="soft-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Global Notification Governance Engine
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                    Super Admin master control for dispatch channels, emergency pause overrides, and engine health.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleToggleGlobalEngine}
                    disabled={isSubmitting}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: isEnginePaused ? "#10B981" : "#EF4444",
                      color: "#FFF",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {isEnginePaused ? <FaPlayCircle /> : <FaPauseCircle />}
                    {isEnginePaused ? "Resume Global Engine" : "Pause Global Engine"}
                  </button>

                  <button
                    onClick={() => void fetchGovernanceData()}
                    disabled={govLoading}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaSync style={{ animation: govLoading ? "spin 1s linear infinite" : "none" }} /> Refresh
                  </button>
                </div>
              </div>

              {/* Delivery Channels Health */}
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#334155" }}>Active Delivery Channels &amp; Health</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>IN-APP INBOX</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>OPERATIONAL</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>EMAIL DISPATCH</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>OPERATIONAL</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>SMS GATEWAY</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>OPERATIONAL</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B" }}>MOBILE PUSH (FCM/APNS)</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>OPERATIONAL</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: APPROVAL QUEUE */}
          {governanceTab === "approvals" && (
            <div className="soft-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Notification Approval Queue
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                    Review pending broadcast push notifications requiring Super Admin decision prior to dispatch.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaFilter size={12} color="#64748B" />
                    <select
                      value={approvalStatusFilter}
                      onChange={(e) => setApprovalStatusFilter(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>

                  <button
                    onClick={() => void fetchGovernanceData()}
                    disabled={govLoading}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaSync style={{ animation: govLoading ? "spin 1s linear infinite" : "none" }} /> Refresh
                  </button>
                </div>
              </div>

              {govLoading ? (
                <p style={{ color: "#64748B", padding: "20px 0" }}>Loading approval queue from backend...</p>
              ) : (
                <DataTable columns={approvalColumns} data={approvalQueue} module="notifications" />
              )}
            </div>
          )}

          {/* SUB-VIEW 3: DISPATCH LOGS */}
          {governanceTab === "dispatch" && (
            <div className="soft-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Notification Dispatch &amp; Delivery History
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                    Real backend execution logs across mobile push, email, SMS, and in-app channels.
                  </p>
                </div>

                <button
                  onClick={() => void fetchGovernanceData()}
                  disabled={govLoading}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaSync style={{ animation: govLoading ? "spin 1s linear infinite" : "none" }} /> Refresh Logs
                </button>
              </div>

              {govLoading ? (
                <p style={{ color: "#64748B", padding: "20px 0" }}>Loading dispatch logs from backend...</p>
              ) : (
                <DataTable columns={dispatchColumns} data={dispatchLogs} module="notifications" />
              )}
            </div>
          )}

          {/* SUB-VIEW 4: AUDIT LOGS */}
          {governanceTab === "audit" && (
            <div className="soft-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Governance Audit Trail
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                    Immutable audit log of notification policy edits, approval decisions, and manual overrides.
                  </p>
                </div>

                <button
                  onClick={() => void fetchGovernanceData()}
                  disabled={govLoading}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaSync style={{ animation: govLoading ? "spin 1s linear infinite" : "none" }} /> Refresh Audit Trail
                </button>
              </div>

              {govLoading ? (
                <p style={{ color: "#64748B", padding: "20px 0" }}>Loading governance audit logs from backend...</p>
              ) : (
                <DataTable columns={auditColumns} data={auditLogs} module="notifications" />
              )}
            </div>
          )}

          {/* SUB-VIEW 5: MODULE & TRIGGER RULES */}
          {governanceTab === "rules" && (
            <div className="soft-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Module &amp; Event Trigger Rules
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                    Backend trigger bindings across domain modules (Inventory, Medical, Rescue, Adoptions, Volunteers).
                  </p>
                </div>

                <button
                  onClick={() => void fetchGovernanceData()}
                  disabled={govLoading}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaSync style={{ animation: govLoading ? "spin 1s linear infinite" : "none" }} /> Refresh Rules
                </button>
              </div>

              {modulesConfig.length === 0 ? (
                <div style={{ padding: "20px", background: "#F8FAFC", borderRadius: "8px", color: "#64748B", textAlign: "center" }}>
                  Active Module Triggers: Inventory Low-Stock, Medical EMR Requests, Rescue Dispatches, Adoption Status Changes, Volunteer Shift Updates.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                  {modulesConfig.map((mod: any, idx: number) => (
                    <div key={mod.name || idx} style={{ padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#FFF" }}>
                      <div style={{ fontWeight: 700, color: "#0F172A", textTransform: "capitalize" }}>{mod.name || mod.module || "Module"}</div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>Status: <strong style={{ color: "#10B981" }}>{mod.status || "ACTIVE"}</strong></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Notification Approval">
        <form onSubmit={handleConfirmRejectItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#FEF2F2", padding: "14px", borderRadius: "10px", border: "1px solid #FCA5A5" }}>
            <h4 style={{ margin: 0, fontSize: "15px", color: "#991B1B", fontWeight: 700 }}>
              Reject Push Broadcast #{selectedApprovalItem ? String(selectedApprovalItem.id).slice(0, 8) : ""}
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#7F1D1D" }}>
              Please state the reason for rejecting this broadcast notification dispatch.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Rejection Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Unverified broadcast content / Duplicate emergency alert..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsRejectModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 700 }}>Confirm Rejection</button>
          </div>
        </form>
      </Modal>

      {/* Pause Modal */}
      <Modal isOpen={isPauseModalOpen} onClose={() => setIsPauseModalOpen(false)} title="Pause Notification Dispatch">
        <form onSubmit={handleConfirmPauseItem} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#EDE9FE", padding: "14px", borderRadius: "10px", border: "1px solid #C4B5FD" }}>
            <h4 style={{ margin: 0, fontSize: "15px", color: "#5B21B6", fontWeight: 700 }}>
              Pause Notification Dispatch #{selectedApprovalItem ? String(selectedApprovalItem.id).slice(0, 8) : ""}
            </h4>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#4C1D95" }}>
              Specify why this push notification dispatch should be temporarily held.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pause Reason *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Pending operational verification / Scheduled for later maintenance window..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsPauseModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700 }}>Confirm Pause</button>
          </div>
        </form>
      </Modal>

      {/* Send Notification Modal */}
      <SendNotificationModal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} />
    </div>
  );
};

export default Notifications;
