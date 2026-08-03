import api from "../api/axios";

export const notificationService = {
  getNotifications: async () => {
    try {
      const response = await api.get("/notifications");
      return response.data;
    } catch {
      return {
        data: [
          { id: "1", title: "Emergency Dispatch Alert", message: "Stray dog rescue request reported in Sector 4", time: "5m ago", type: "emergency", read: false },
          { id: "2", title: "Medical Surgery Scheduled", message: "Dr. John Smith scheduled post-op checkup for Max", time: "1h ago", type: "medical", read: false },
          { id: "3", title: "Low Supply Alert", message: "High-Protein Kibble inventory below 15% threshold", time: "3h ago", type: "system", read: true },
        ],
      };
    }
  },

  markAsRead: async (id: string) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      return response.data;
    } catch {
      return { success: true };
    }
  },
};

export default notificationService;
