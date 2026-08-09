import api from "../api/axios";

export const auditService = {
  // GET /admin/audit-logs (Exact OpenAPI endpoint)
  getAuditLogs: async (params?: Record<string, unknown>) => {
    const response = await api.get("/admin/audit-logs", { params });
    return response.data;
  },
};

export default auditService;
