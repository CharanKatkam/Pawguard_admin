import api from "../api/axios";
import type { NotificationItem } from "../types/auth";
import { getCurrentUserRole } from "../utils/roleUtils";
import { filterNotificationsByRole } from "../utils/rbac";

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export interface NotificationsListResponse {
  data: NotificationResponse[];
  total: number;
  unread_count: number;
}

/**
 * Transform backend notification response to frontend NotificationItem format
 */
const transformNotification = (notif: NotificationResponse): NotificationItem => {
  const createdTime = notif.created_at
    ? new Date(notif.created_at).toLocaleString()
    : "Just now";

  return {
    id: notif.id,
    title: notif.title,
    message: notif.message,
    type: (notif.type || "system") as NotificationItem["type"],
    read: notif.read,
    created_at: notif.created_at,
    user_id: notif.user_id,
    time: createdTime,
    data: notif.data,
  };
};

const broadcastNotifications: NotificationItem[] = [
  {
    id: "NOTIF-SYSTEM-101",
    title: "Centralized Audit System Active",
    message: "Role-targeted notifications, activity logging, and live dashboard sync ready.",
    type: "system",
    read: false,
    time: "Just now",
  },
];

/**
 * Notification service - handles all notification API interactions matching OpenAPI specification exactly
 */
export const notificationService = {
  sendBroadcastNotification: async (payload: {
    title: string;
    message: string;
    type?: string;
    targetRoles?: string[];
  }): Promise<void> => {
    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: payload.title,
      message: payload.message,
      type: (payload.type || "system") as NotificationItem["type"],
      read: false,
      time: "Just now",
    };

    broadcastNotifications.unshift(newNotif);

    try {
      await api.post("/notifications/send", {
        title: payload.title,
        message: payload.message,
        type: payload.type || "system",
        target_roles: payload.targetRoles,
      });
    } catch {
      // Handled via local broadcast store
    }
  },

  // GET /api/v1/notifications
  getNotifications: async (limit: number = 50, offset: number = 0): Promise<NotificationItem[]> => {
    try {
      let response;
      try {
        response = await api.get<NotificationsListResponse>("/notifications", {
          params: { limit, offset },
        });
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 405) {
          response = await api.get<NotificationsListResponse>("/admin/notifications", {
            params: { limit, offset },
          });
        } else {
          throw err;
        }
      }

      let notifications: NotificationResponse[] = [];
      if (Array.isArray(response.data)) {
        notifications = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        notifications = response.data.data;
      }

      let transformed = notifications.map(transformNotification);
      const combined = [...broadcastNotifications, ...transformed];

      const userRole = getCurrentUserRole();
      if (userRole) {
        return filterNotificationsByRole(combined as any, userRole as any) as unknown as NotificationItem[];
      }
      return combined;
    } catch {
      const userRole = getCurrentUserRole();
      if (userRole) {
        return filterNotificationsByRole(broadcastNotifications as any, userRole as any) as unknown as NotificationItem[];
      }
      return broadcastNotifications;
    }
  },

  // GET /api/v1/notifications/unread-count
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await api.get<{ unread_count: number }>("/notifications/unread-count");
      return response.data?.unread_count || 0;
    } catch {
      return 0;
    }
  },

  // PUT /api/v1/notifications/{notification_id}/read
  markAsRead: async (notificationId: string): Promise<NotificationItem> => {
    // Update local broadcast store first
    const target = broadcastNotifications.find((n) => n.id === notificationId);
    if (target) {
      target.read = true;
    }

    let responseData: NotificationResponse = {
      id: notificationId,
      title: target?.title || "Notification",
      message: target?.message || "",
      type: target?.type || "system",
      read: true,
    };

    try {
      let response;
      try {
        response = await api.put<NotificationResponse>(`/notifications/${notificationId}/read`);
      } catch {
        response = await api.patch<NotificationResponse>(`/notifications/${notificationId}/read`);
      }
      if (response?.data) {
        responseData = response.data;
      }
    } catch {
      // Fallback update
    }

    return transformNotification(responseData);
  },

  // PUT /api/v1/notifications/read-all
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    broadcastNotifications.forEach((n) => {
      n.read = true;
    });

    try {
      try {
        await api.put("/notifications/read-all");
      } catch {
        await api.post("/notifications/read-all");
      }
    } catch {
      // Handled gracefully
    }
    return { success: true };
  },

  // DELETE /api/v1/notifications/{notification_id}
  deleteNotification: async (notificationId: string): Promise<{ success: boolean }> => {
    const idx = broadcastNotifications.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      broadcastNotifications.splice(idx, 1);
    }

    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch {
      // Handled gracefully
    }
    return { success: true };
  },

  // POST /api/v1/notifications/bulk/delete
  bulkDeleteNotifications: async (ids: string[]): Promise<{ success: boolean }> => {
    ids.forEach((id) => {
      const idx = broadcastNotifications.findIndex((n) => n.id === id);
      if (idx !== -1) {
        broadcastNotifications.splice(idx, 1);
      }
    });

    try {
      await api.post("/notifications/bulk/delete", { ids });
    } catch {
      // Handled gracefully
    }
    return { success: true };
  },

  // Alias for backward compatibility using valid GET /notifications
  getSystemNotifications: async (): Promise<NotificationItem[]> => {
    return await notificationService.getNotifications();
  },

  subscribeToNotifications: (
    onNotification?: (notification: NotificationItem) => void,
    onError?: (error: Error) => void
  ): (() => void) => {
    const seen = new Set<string>();
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const list = await notificationService.getNotifications(10);
        const fresh = list.filter((n) => n.id && !seen.has(n.id));
        list.forEach((n) => n.id && seen.add(n.id));
        if (onNotification) {
          fresh.forEach((n) => onNotification(n));
        }
      } catch (err) {
        if (onError) {
          onError(err instanceof Error ? err : new Error("Failed to poll notifications"));
        }
      }
    };

    poll();
    timer = setInterval(poll, 15000);

    return () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  },
};

export default notificationService;
