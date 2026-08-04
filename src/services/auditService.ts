import api from "../api/axios";

export const auditService = {
  // GET /admin/audit-logs (Exact OpenAPI endpoint)
  getAuditLogs: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get("/admin/audit-logs", { params });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) return { data: [], total: 0 };
      throw err;
    }
  },
};

export default auditService;
