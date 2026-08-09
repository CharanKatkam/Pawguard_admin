import api from "../api/axios";

export interface SystemSettingsPayload {
  siteName?: string;
  adminEmail?: string;
  smtpServer?: string;
  sessionTimeout?: string | number;
  [key: string]: unknown;
}

export interface SystemSetting {
  key: string;
  value: string | number | boolean;
  category?: string;
  description?: string;
  type?: string;
  editable?: boolean;
}

export interface SystemSettings {
  siteName?: string;
  adminEmail?: string;
  smtpServer?: string;
  sessionTimeout?: number;
  [key: string]: unknown;
}

/**
 * Settings service - handles all system settings and configuration
 */
export const settingsService = {
  /**
   * Fetch all system settings
   */
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const response = await api.get<{ data: SystemSettings } | SystemSettings>("/settings/system");

      let data: SystemSettings;
      if (response.data && typeof response.data === "object" && "data" in response.data) {
        data = (response.data as { data: SystemSettings }).data;
      } else {
        data = response.data as SystemSettings;
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
      throw error;
    }
  },

  /**
   * Get a specific setting by key
   */
  getSetting: async (key: string): Promise<SystemSetting> => {
    try {
      const response = await api.get<SystemSetting>(`/settings/system/${key}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch setting ${key}:`, error);
      throw error;
    }
  },

  /**
   * Update a single setting key-value pair (PUT /settings/system/{key}, falls back to POST /settings/system to create)
   */
  updateSettingKey: async (key: string, value: string | number | boolean): Promise<SystemSetting> => {
    try {
      try {
        const response = await api.put<SystemSetting>(`/settings/system/${key}`, { value });
        return response.data;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const response = await api.post<SystemSetting>("/settings/system", {
            key,
            value,
            category: "general",
          });
          return response.data;
        }
        throw err;
      }
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  },

  /**
   * Update multiple settings at once
   */
  updateSettings: async (data: SystemSettingsPayload): Promise<{ success: boolean; updated: string[] }> => {
    try {
      const updates: string[] = [];

      // Map frontend field names to backend keys
      const fieldMap: Record<string, string> = {
        siteName: "site_name",
        adminEmail: "admin_email",
        smtpServer: "smtp_server",
        sessionTimeout: "session_timeout",
      };

      const promises = Object.entries(data).map(async ([field, value]) => {
        if (value !== null && value !== undefined && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
          const key = fieldMap[field] || field;
          try {
            await settingsService.updateSettingKey(key, value as string | number | boolean);
            updates.push(key);
          } catch (error) {
            console.error(`Failed to update ${key}:`, error);
            throw error;
          }
        }
      });

      await Promise.all(promises);

      return { success: true, updated: updates };
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw error;
    }
  },
};

export default settingsService;
