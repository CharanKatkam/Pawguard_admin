import api from "../api/axios";
import type { NotificationItem } from "../types/auth";
import { getCurrentUser } from "../utils/roleUtils";

export interface NotificationResponse {
  id: string;
  title: string;
  body: string;
  notification_type?: string | null;
  is_read?: boolean;
  is_broadcast?: boolean;
  created_at?: string;
  sent_at?: string;
  action_url?: string | null;
  user_id?: string;
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
    message: notif.body,
    type: (notif.notification_type || "system") as NotificationItem["type"],
    read: Boolean(notif.is_read),
    created_at: notif.created_at,
    user_id: notif.user_id,
    time: createdTime,
    data: notif.action_url ? { action_url: notif.action_url } : undefined,
  };
};

/**
 * Notification service - handles all notification API interactions matching OpenAPI specification exactly
 */
export const notificationService = {
  // POST /api/v1/notifications/send
  // The backend `NotificationSend` schema supports role-targeted delivery via
  // `target_roles` (send to all active users holding any of those roles).
  // When target roles are provided we omit `user_id` (it is only required
  // "unless target_roles is provided"); otherwise we keep the previous
  // actor-scoped behaviour.
  sendBroadcastNotification: async (payload: {
    title: string;
    message: string;
    type?: string;
    targetRoles?: string[];
  }): Promise<void> => {
    const user = getCurrentUser();
    const userId = (user as any)?.id;
    if (payload.targetRoles && payload.targetRoles.length > 0) {
      await api.post("/notifications/send", {
        title: payload.title,
        body: payload.message,
        notification_type: payload.type || "general",
        action_url: null,
        send_email: false,
        target_roles: payload.targetRoles,
      });
      return;
    }
    if (!userId) {
      throw new Error("No active user session to deliver notification to.");
    }
    await api.post("/notifications/send", {
      user_id: userId,
      title: payload.title,
      body: payload.message,
      notification_type: payload.type || "general",
      action_url: null,
      send_email: false,
    });
  },

  // GET /api/v1/notifications (paginated: page + page_size)
  getNotifications: async (page: number = 1, pageSize: number = 50): Promise<NotificationItem[]> => {
    const response = await api.get<NotificationsListResponse>("/notifications", {
      params: { page, page_size: pageSize },
    });

    let notifications: NotificationResponse[] = [];
    if (Array.isArray(response.data)) {
      notifications = response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      notifications = response.data.data;
    }

    return notifications.map(transformNotification);
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
    const response = await api.put<NotificationResponse>(`/notifications/${notificationId}/read`);
    if (response?.data) {
      return transformNotification(response.data);
    }
    return {
      id: notificationId,
      title: "Notification",
      message: "",
      type: "system",
      read: true,
      time: "Just now",
    };
  },

  // PUT /api/v1/notifications/read-all
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    await api.put("/notifications/read-all");
    return { success: true };
  },

  // DELETE /api/v1/notifications/{notification_id}
  deleteNotification: async (notificationId: string): Promise<{ success: boolean }> => {
    await api.delete(`/notifications/${notificationId}`);
    return { success: true };
  },

  // POST /api/v1/notifications/bulk/delete
  bulkDeleteNotifications: async (ids: string[]): Promise<{ success: boolean }> => {
    await api.post("/notifications/bulk/delete", { ids });
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
        const list = await notificationService.getNotifications(1, 10);
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
