import api from "../api/axios";
import type { NotificationItem, UserRole } from "../types/auth";
import { getCurrentUser, getCurrentUserRole } from "../utils/roleUtils";
import { formatDateTime } from "../utils/dateUtils";

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
 * Check if a notification is an Inventory / Low Stock alert
 */
export const isInventoryNotification = (notif: NotificationItem): boolean => {
  const type = String(notif.type || "").toLowerCase();
  const title = String(notif.title || "").toLowerCase();
  const message = String(notif.message || "").toLowerCase();

  return (
    type === "inventory" ||
    type === "inventory_changed" ||
    type === "inventory_low_stock" ||
    title.includes("inventory") ||
    title.includes("stock") ||
    title.includes("reorder") ||
    title.includes("requisition") ||
    message.includes("inventory") ||
    message.includes("stock level") ||
    message.includes("below reorder threshold")
  );
};

/**
 * Filter notifications based on role and shelter operational assignment.
 * Enforces strict recipient rules:
 * - Inventory Low Stock alerts MUST NOT be sent/displayed to Vets, Rescue Team, or Adopter/Public users.
 * - Primary recipients: Shelter Manager for the specific shelter, Inventory Manager, Admin.
 * - One shelter's inventory alerts MUST NOT be exposed to another shelter's manager.
 */
export const shouldUserReceiveNotification = (
  notif: NotificationItem,
  user: any,
  role: UserRole | null
): boolean => {
  if (!role) return false;

  if (isInventoryNotification(notif)) {
    // 1. Role-based gating:
    // Authorized: super_admin, rescue_centre_admin, inventory_manager, shelter_manager
    // Prohibited: veterinarian, rescue_coordinator, rescue_agent, adoption_coordinator, foster_coordinator, volunteer_coordinator, finance_user, public/adopter
    const allowedRoles: UserRole[] = [
      "super_admin",
      "rescue_centre_admin",
      "inventory_manager",
      "shelter_manager",
    ];

    if (!allowedRoles.includes(role)) {
      return false;
    }

    // 2. Shelter isolation gating for Shelter Managers / Shelter Staff:
    if (role === "shelter_manager") {
      const userShelterId = String(user?.shelter_id || user?.shelterId || user?.facility_id || user?.facilityId || "").trim().toLowerCase();
      const userShelterName = String(user?.shelter || user?.shelter_name || user?.department || "").trim().toLowerCase();

      const notifData = notif.data || {};
      const notifShelterId = String(notifData.shelter_id || notifData.shelterId || (notif as any).shelter_id || "").trim().toLowerCase();
      const notifShelterName = String(notifData.shelter_name || notifData.shelterName || (notif as any).shelter_name || "").trim().toLowerCase();

      if (userShelterId && notifShelterId && userShelterId !== notifShelterId) {
        return false;
      }
      if (userShelterName && notifShelterName && !notifShelterName.includes(userShelterName) && !userShelterName.includes(notifShelterName)) {
        return false;
      }

      // Check text in title/message for explicit shelter mentions (e.g. "Shelter A", "Shelter B")
      const text = `${notif.title} ${notif.message}`.toLowerCase();
      const shelterMatch = text.match(/shelter\s+([a-z0-9_-]+)/i);
      if (userShelterName && shelterMatch) {
        const mentioned = shelterMatch[0].toLowerCase();
        if (!mentioned.includes(userShelterName) && !userShelterName.includes(mentioned)) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Deduplicate notifications to prevent duplicate low-stock alerts
 */
export const deduplicateNotifications = (list: NotificationItem[]): NotificationItem[] => {
  const seen = new Set<string>();
  const result: NotificationItem[] = [];

  for (const item of list) {
    const key = `${String(item.title).trim().toLowerCase()}|${String(item.message).trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
};

/**
 * Transform backend notification response to frontend NotificationItem format
 */
const transformNotification = (notif: NotificationResponse): NotificationItem => {
  const createdTime = notif.created_at
    ? formatDateTime(notif.created_at)
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
  sendBroadcastNotification: async (payload: {
    title: string;
    message: string;
    type?: string;
    targetRoles?: string[];
    actionUrl?: string;
  }): Promise<void> => {
    const user = getCurrentUser();
    const userId = (user as any)?.id;
    if (payload.targetRoles && payload.targetRoles.length > 0) {
      await api.post("/notifications/send", {
        title: payload.title,
        body: payload.message,
        notification_type: payload.type || "general",
        action_url: payload.actionUrl || null,
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
      action_url: payload.actionUrl || null,
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

    const transformed = notifications.map(transformNotification);
    const currentUser = getCurrentUser();
    const currentRole = getCurrentUserRole();

    const filtered = transformed.filter((item) => shouldUserReceiveNotification(item, currentUser, currentRole));
    return deduplicateNotifications(filtered);
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
