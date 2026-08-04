import api from "../api/axios";
import { getCurrentUserRole } from "../utils/roleUtils";

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
   * Fetch all system settings (Super Admin only)
   */
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const role = getCurrentUserRole();

      // Check if user has permission to view settings
      if (role !== "super_admin") {
        throw new Error("Insufficient permissions to access settings");
      }

      const response = await api.get<{ data: SystemSettings } | SystemSettings>("/settings/system");

      let data: SystemSettings;
      if (response.data && typeof response.data === "object" && "data" in response.data) {
        data = (response.data as { data: SystemSettings }).data;
      } else {
        data = response.data as SystemSettings;
      }

      return {
        siteName: data.siteName || "PawGuard Admin Portal",
        adminEmail: data.adminEmail || "",
        smtpServer: data.smtpServer || "",
        sessionTimeout: data.sessionTimeout || 60,
        ...data,
      };
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
   * Update a single setting key-value pair
   */
  updateSettingKey: async (key: string, value: string | number | boolean): Promise<SystemSetting> => {
    try {
      const role = getCurrentUserRole();

      // Check if user has permission
      if (role !== "super_admin") {
        throw new Error("Insufficient permissions to update settings");
      }

      // Try PUT endpoint first
      try {
        const response = await api.put<SystemSetting>(`/settings/system/${key}`, { value });
        return response.data;
      } catch {
        // Fallback to POST endpoint
        const response = await api.post<SystemSetting>("/settings/system", {
          key,
          value,
          category: "general",
        });
        return response.data;
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
      const role = getCurrentUserRole();

      // Check if user has permission
      if (role !== "super_admin") {
        throw new Error("Insufficient permissions to update settings");
      }

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

  /**
   * Trigger database backup
   */
  triggerBackup: async (): Promise<{ success: boolean; timestamp: string }> => {
    try {
      const role = getCurrentUserRole();

      // Check if user has permission
      if (role !== "super_admin") {
        throw new Error("Insufficient permissions to trigger backup");
      }

      const now = new Date().toISOString();

      const response = await api.post<{ success: boolean; timestamp: string }>(
        "/settings/backup",
        { timestamp: now }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to trigger backup:", error);
      throw error;
    }
  },

  /**
   * Get all available settings categories
   */
  getCategories: async (): Promise<string[]> => {
    try {
      const response = await api.get<{ data: string[] }>("/settings/categories");
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      return [];
    }
  },

  /**
   * Get settings by category
   */
  getSettingsByCategory: async (category: string): Promise<SystemSetting[]> => {
    try {
      const response = await api.get<{ data: SystemSetting[] }>(
        `/settings/system/category/${category}`
      );

      if (Array.isArray(response.data)) {
        return response.data;
      }

      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch settings for category ${category}:`, error);
      return [];
    }
  },

  /**
   * Reset settings to defaults
   */
  resetToDefaults: async (): Promise<{ success: boolean }> => {
    try {
      const role = getCurrentUserRole();

      // Check if user has permission
      if (role !== "super_admin") {
        throw new Error("Insufficient permissions to reset settings");
      }

      const response = await api.post<{ success: boolean }>("/settings/system/reset");
      return response.data;
    } catch (error) {
      console.error("Failed to reset settings:", error);
      throw error;
    }
  },
};

export default settingsService;
