import { useState, useRef, useEffect } from "react";
import { FaBell, FaCheckDouble, FaExclamationTriangle, FaStethoscope, FaHeart, FaUserCheck } from "react-icons/fa";
import { getCurrentUserRole } from "../../utils/roleUtils";
import type { NotificationItem } from "../../types/auth";
import notificationService from "../../services/notificationService";

const SAMPLE_NOTIFICATIONS: Record<string, NotificationItem[]> = {
  super_admin: [
    { id: "1", title: "Security Alert", message: "Failed login attempt from IP 192.168.1.102", time: "5 mins ago", type: "system", read: false },
    { id: "2", title: "Backup Complete", message: "Database automated backup completed successfully", time: "1 hour ago", type: "system", read: false },
    { id: "3", title: "New Rescue Centre", message: "South Shelter submitted onboarding documents", time: "3 hours ago", type: "adoption", read: true },
  ],
  veterinarian: [
    { id: "1", title: "Emergency Surgery Required", message: "Max (GSD-402) scheduled for leg operation at 2:00 PM", time: "10 mins ago", type: "medical", read: false },
    { id: "2", title: "Vaccination Due", message: "14 pets in Shelter B require annual rabies booster", time: "45 mins ago", type: "medical", read: false },
  ],
  rescue_coordinator: [
    { id: "1", title: "Distress Call #1092", message: "Injured dog reported near Central Station", time: "2 mins ago", type: "emergency", read: false },
    { id: "2", title: "Agent On Scene", message: "Agent Alex arrived at Rescue Location #84", time: "25 mins ago", type: "emergency", read: true },
  ],
  default: [
    { id: "1", title: "System Notification", message: "PawGuard portal updated to version 2.4.0", time: "30 mins ago", type: "system", read: false },
    { id: "2", title: "Schedule Reminder", message: "Upcoming shift review scheduled for tomorrow", time: "2 hours ago", type: "volunteer", read: true },
  ],
};

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const role = getCurrentUserRole() || "super_admin";
  const initialList = SAMPLE_NOTIFICATIONS[role] || SAMPLE_NOTIFICATIONS.default;
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialList);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const fetchLiveNotifications = async () => {
      try {
        const response = await notificationService.getNotifications();
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : [];

        if (list.length > 0) {
          setNotifications(list);
        }
      } catch {
        // Fallback to sample role notifications
      }
    };
    fetchLiveNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "emergency":
        return <FaExclamationTriangle style={{ color: "#EF4444" }} />;
      case "medical":
        return <FaStethoscope style={{ color: "#2563EB" }} />;
      case "adoption":
        return <FaHeart style={{ color: "#F59E0B" }} />;
      case "volunteer":
        return <FaUserCheck style={{ color: "#10B981" }} />;
      default:
        return <FaBell style={{ color: "#6366F1" }} />;
    }
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
        }}
        title="Notifications"
      >
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
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            width: "360px",
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

            {unreadCount > 0 && (
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
                }}
              >
                <FaCheckDouble size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#94A3B8" }}>
                No notifications available.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #F1F5F9",
                    background: item.read ? "#FFFFFF" : "#F8FAFC",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    transition: "background 0.15s ease",
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
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>{item.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}>
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
