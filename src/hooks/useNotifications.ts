import { useState, useEffect, useCallback, useRef } from "react";
import notificationService from "../services/notificationService";
import type { NotificationItem } from "../types/auth";

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
}

/**
 * Custom hook for managing notifications with auto-refresh and role-based access
 */
export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Fetch notifications from backend
   */
  const fetchNotifications = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      // Fetch notifications using valid backend endpoint: GET /notifications
      const notificationList = await notificationService.getNotifications();
      setNotifications(notificationList);

      // Calculate unread count
      const unread = notificationList.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch notifications"
      );
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const updated = await notificationService.markAsRead(notificationId);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );

        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));

        return updated;
      } catch (err) {
        console.error(`Failed to mark notification ${notificationId} as read:`, err);
        throw err;
      }
    },
    []
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, []);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.deleteNotification(notificationId);

        // Update local state
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // Update unread count if the deleted notification was unread
        const wasUnread = notifications.some(
          (n) => n.id === notificationId && !n.read
        );
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error(`Failed to delete notification ${notificationId}:`, err);
        throw err;
      }
    },
    [notifications]
  );

  /**
   * Manually refresh notifications
   */
  const refresh = useCallback(async () => {
    await fetchNotifications(false);
  }, [fetchNotifications]);

  // Initial load and setup auto-refresh
  useEffect(() => {
    fetchNotifications(true);

    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        refresh();
      }, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchNotifications, refresh, autoRefresh, refreshInterval]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
};

export default useNotifications;
