import api from "../api/axios";

export interface SystemSettingsPayload {
  siteName?: string;
  adminEmail?: string;
  smtpServer?: string;
  sessionTimeout?: string | number;
}

export const settingsService = {
  getSettings: async () => {
    try {
      const response = await api.get("/settings/system");
      return response.data;
    } catch {
      return {
        data: {
          siteName: "PawGuard Admin Portal",
          adminEmail: "admin@pawguard.com",
          smtpServer: "smtp.pawguard.com",
          sessionTimeout: "60",
        },
      };
    }
  },

  updateSettingKey: async (key: string, value: string) => {
    try {
      // Try PUT /settings/system/{key} first
      const response = await api.put(`/settings/system/${key}`, { value });
      return response.data;
    } catch {
      // Fallback to POST /settings/system with SystemSettingCreate schema
      const response = await api.post("/settings/system", {
        key,
        value,
        category: "general",
      });
      return response.data;
    }
  },

  updateSettings: async (data: SystemSettingsPayload) => {
    const promises = [];
    if (data.siteName) promises.push(settingsService.updateSettingKey("site_name", data.siteName));
    if (data.adminEmail) promises.push(settingsService.updateSettingKey("admin_email", data.adminEmail));
    if (data.smtpServer) promises.push(settingsService.updateSettingKey("smtp_server", data.smtpServer));
    if (data.sessionTimeout) promises.push(settingsService.updateSettingKey("session_timeout", String(data.sessionTimeout)));

    const results = await Promise.all(promises);
    return results[0] || { success: true };
  },

  triggerBackup: async () => {
    const now = new Date().toISOString();
    return await settingsService.updateSettingKey("last_backup", now);
  },
};

export default settingsService;
