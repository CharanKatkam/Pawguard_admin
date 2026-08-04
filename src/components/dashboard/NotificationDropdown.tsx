import { useState, useRef, useEffect } from "react";
import { FaBell, FaCheckDouble, FaExclamationTriangle, FaStethoscope, FaHeart, FaUserCheck, FaSpinner, FaTimesCircle } from "react-icons/fa";
import useNotifications from "../../hooks/useNotifications";
import type { NotificationItem } from "../../types/auth";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use the notifications hook with auto-refresh every 30 seconds
  const {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotifications({ autoRefresh: true, refreshInterval: 30000 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "emergency":
        return <FaExclamationTriangle style={{ color: "#EF4444" }} />;
      case "medical":
      case "medical_updated":
        return <FaStethoscope style={{ color: "#2563EB" }} />;
      case "adoption":
      case "adoption_submitted":
      case "adoption_approved":
      case "adoption_rejected":
        return <FaHeart style={{ color: "#F59E0B" }} />;
      case "volunteer":
        return <FaUserCheck style={{ color: "#10B981" }} />;
      case "system":
      case "user_created":
      case "user_updated":
      case "user_deleted":
      case "shelter_added":
      case "animal_registered":
      case "animal_updated":
      case "inventory_changed":
      case "certificate_generated":
      case "finance_action":
      case "role_permission_changed":
        return <FaBell style={{ color: "#6366F1" }} />;
      default:
        return <FaBell style={{ color: "#6366F1" }} />;
    }
  };

  const formatTime = (notification: NotificationItem): string => {
    if (notification.time) return notification.time;
    
    if (notification.created_at) {
      const now = new Date();
      const created = new Date(notification.created_at);
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return created.toLocaleDateString();
    }

    return "Recently";
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "relative",
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "10px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          transition: "all 0.2s ease",
          cursor: "pointer",
          padding: 0,
        }}
        title="Notifications"
      >
        {loading ? (
          <FaSpinner size={18} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <>
            <FaBell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  borderRadius: "999px",
                  padding: "2px 6px",
                  lineHeight: 1,
                  boxShadow: "0 0 0 2px #FFFFFF",
                  minWidth: "20px",
                  textAlign: "center",
                }}
              >
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            width: "400px",
            maxWidth: "calc(100vw - 32px)",
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #E2E8F0",
            zIndex: 1000,
            overflow: "hidden",
            animation: "slideDown 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #F1F5F9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#F8FAFC",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span style={{ background: "#EFF6FF", color: "#2563EB", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && !loading && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  color: "#2563EB",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.color = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.color = "#2563EB";
                }}
              >
                <FaCheckDouble size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {loading && !notifications.length ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#94A3B8" }}>
                <FaSpinner size={20} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
                <p style={{ margin: 0 }}>Loading notifications...</p>
              </div>
            ) : error ? (
              <div style={{ padding: "20px", textAlign: "center" }}>
                <FaTimesCircle size={24} style={{ color: "#EF4444", marginBottom: "12px" }} />
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                  Failed to load
                </p>
                <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#94A3B8" }}>
                  {error}
                </p>
                <button
                  onClick={refresh}
                  style={{
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = "#1d4ed8";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "#2563EB";
                  }}
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#94A3B8" }}>
                <FaBell size={20} style={{ opacity: 0.5, marginBottom: "8px" }} />
                <p style={{ margin: 0 }}>No notifications</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px" }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.read && handleMarkAsRead(item.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #F1F5F9",
                    background: item.read ? "#FFFFFF" : "#F0F4FF",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    transition: "background 0.15s ease",
                    cursor: !item.read ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => {
                    if (!item.read) {
                      (e.currentTarget as HTMLDivElement).style.background = "#E8EEFF";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.read) {
                      (e.currentTarget as HTMLDivElement).style.background = "#F0F4FF";
                    }
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: "#F1F5F9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {getIcon(item.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "8px", flexShrink: 0 }}>
                        {formatTime(item)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>
                      {item.message}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNotification(e, item.id)}
                    style={{
                      background: "transparent",
                      color: "#94A3B8",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "4px",
                      transition: "color 0.2s ease",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#EF4444";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#94A3B8";
                    }}
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {!loading && notifications.length > 0 && (
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid #F1F5F9",
                background: "#F8FAFC",
                textAlign: "center",
              }}
            >
              <button
                onClick={refresh}
                style={{
                  background: "transparent",
                  color: "#2563EB",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = "#EFF6FF";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = "transparent";
                }}
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default NotificationDropdown;
