import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
} from "react-icons/fa";
import { useNotifications } from "../../hooks/useNotifications";
import { useToast } from "../../context/ToastContext";
import SendNotificationModal from "../../components/notifications/SendNotificationModal";

const typeIcon: Record<string, React.ReactNode> = {
  emergency: <FaExclamationTriangle />,
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
  if (/medical|animal/.test(type)) return "#06B6D4";
  if (/adoption|approved|certificate/.test(type)) return "#EC4899";
  if (/volunteer/.test(type)) return "#F59E0B";
  if (/finance/.test(type)) return "#10B981";
  if (/shelter|inventory|user|role/.test(type)) return "#2563EB";
  return "#64748B";
};

const Notifications = () => {
  const [searchParams] = useSearchParams();
  const [isSendModalOpen, setIsSendModalOpen] = useState(() => searchParams.get("action") === "send");
  const { addToast } = useToast();
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ autoRefresh: true, refreshInterval: 30000 });

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (searchParams.get("action") === "send") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const handleOpen = async (id: string) => {
    try {
      await markAsRead(id);
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      addToast("Notification removed", "success");
    } catch {
      addToast("Failed to remove notification", "error");
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      addToast("All notifications marked as read", "success");
    } catch {
      addToast("Failed to update notifications", "error");
    }
  };

  return (
    <div>
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Notifications</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          {unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
            : "You're all caught up."}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button
          onClick={handleMarkAll}
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

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A",
            color: "#92400E",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div className="soft-card" style={{ padding: "20px" }}>
        {loading ? (
          <p style={{ color: "#64748B", textAlign: "center", padding: "30px 0" }}>
            Loading notifications...
          </p>
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
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: n.read ? "#F8FAFC" : "#EFF6FF",
                    border: `1px solid ${n.read ? "#E2E8F0" : "#BFDBFE"}`,
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
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>{n.message}</p>
                    {n.time && <span style={{ fontSize: "11.5px", color: "#94A3B8" }}>{n.time}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {!n.read && (
                      <button
                        onClick={() => handleOpen(n.id)}
                        title="Mark as read"
                        style={{ border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#2563EB", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: 13 }}
                      >
                        <FaEnvelopeOpen />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
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

      <SendNotificationModal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} />
    </div>
  );
};

export default Notifications;
