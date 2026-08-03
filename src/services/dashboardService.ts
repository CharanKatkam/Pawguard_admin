import api from "../api/axios";

export const dashboardService = {
  // GET /dashboards/super-admin
  getSuperAdminDashboard: async () => {
    const response = await api.get("/dashboards/super-admin");
    return response.data;
  },

  // Backwards compatibility alias for Super Admin Dashboard
  getDashboardStats: async (_role?: string) => {
    const response = await api.get("/dashboards/super-admin");
    return response.data;
  },

  // GET /dashboards/recent-activity
  getRecentActivities: async () => {
    const response = await api.get("/dashboards/recent-activity");
    return response.data;
  },

  // GET /dashboards/audit-logs
  getAuditLogs: async () => {
    const response = await api.get("/dashboards/audit-logs");
    return response.data;
  },


  // GET /dashboards/rescue-centre
  getRescueCentreDashboard: async () => {
    const response = await api.get("/dashboards/rescue-centre");
    return response.data;
  },

  // GET /dashboards/rescue
  getRescueDashboard: async () => {
    const response = await api.get("/dashboards/rescue");
    return response.data;
  },

  // GET /dashboards/veterinarian
  getVeterinarianDashboard: async () => {
    const response = await api.get("/dashboards/veterinarian");
    return response.data;
  },

  // Backwards compatibility alias for medical dashboard
  getMedicalDashboard: async () => {
    const response = await api.get("/dashboards/veterinarian");
    return response.data;
  },

  // GET /dashboards/shelter
  getShelterDashboard: async () => {
    const response = await api.get("/dashboards/shelter");
    return response.data;
  },

  // GET /dashboards/adoption
  getAdoptionDashboard: async () => {
    const response = await api.get("/dashboards/adoption");
    return response.data;
  },

  // GET /dashboards/foster
  getFosterDashboard: async () => {
    const response = await api.get("/dashboards/foster");
    return response.data;
  },

  // GET /dashboards/volunteer
  getVolunteerDashboard: async () => {
    const response = await api.get("/dashboards/volunteer");
    return response.data;
  },

  // GET /dashboards/inventory
  getInventoryDashboard: async () => {
    const response = await api.get("/dashboards/inventory");
    return response.data;
  },

  // GET /dashboards/finance
  getFinanceDashboard: async () => {
    const response = await api.get("/dashboards/finance");
    return response.data;
  },

  // GET /dashboards/staff
  getStaffDashboard: async () => {
    const response = await api.get("/dashboards/staff");
    return response.data;
  },
};

export default dashboardService;