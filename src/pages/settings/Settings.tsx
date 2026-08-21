import { useState, useEffect } from "react";
import { FaSlidersH, FaShieldAlt, FaSave, FaExclamationTriangle, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { Navigate } from "react-router-dom";
import { getCurrentUserRole } from "../../utils/roleUtils";
import settingsService from "../../services/settingsService";
import type { SystemSettings } from "../../services/settingsService";
import { notifyDataChanged } from "../../utils/dataSync";

interface Toast {
  text: string;
  type: "success" | "error" | "info";
  id: string;
}

const Settings = () => {
  const currentRole = getCurrentUserRole();

  const [siteName, setSiteName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [smtpServer, setSmtpServer] = useState("");
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize with default values
  const defaultSettings: SystemSettings = {
    siteName: "PawGuard Admin Portal",
    adminEmail: "",
    smtpServer: "",
    sessionTimeout: 60,
  };

  const [initialSettings, setInitialSettings] = useState<SystemSettings>(defaultSettings);

  /**
   * Add a toast notification
   */
  const addToast = (text: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { text, type, id }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  /**
   * Fetch settings from backend
   */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const settings = await settingsService.getSettings();

        setInitialSettings(settings);
        setSiteName(settings.siteName || "");
        setAdminEmail(settings.adminEmail || "");
        setSmtpServer(settings.smtpServer || "");
        setSessionTimeout(String(settings.sessionTimeout || 60));
        setHasChanges(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load settings";
        console.error("Error fetching settings:", err);
        setError(errorMessage);
        addToast(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  /**
   * Track if settings have been modified
   */
  useEffect(() => {
    const changed =
      siteName !== initialSettings.siteName ||
      adminEmail !== initialSettings.adminEmail ||
      smtpServer !== initialSettings.smtpServer ||
      sessionTimeout !== String(initialSettings.sessionTimeout);

    setHasChanges(changed);
  }, [siteName, adminEmail, smtpServer, sessionTimeout, initialSettings]);

  /**
   * Validate form inputs
   */
  const validateForm = (): string | null => {
    if (!siteName.trim()) {
      return "Organization Name is required.";
    }

    if (!adminEmail.trim()) {
      return "System Admin Contact Email is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return "Please enter a valid email address.";
    }

    const timeout = Number(sessionTimeout);
    if (timeout < 5 || timeout > 480) {
      return "Session timeout must be between 5 and 480 minutes.";
    }

    return null;
  };

  /**
   * Handle save settings
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      addToast(validationError, "error");
      return;
    }

    if (!hasChanges) {
      addToast("No changes to save.", "info");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result = await settingsService.updateSettings({
        siteName: siteName.trim(),
        adminEmail: adminEmail.trim(),
        smtpServer: smtpServer.trim(),
        sessionTimeout: Number(sessionTimeout) || 60,
      });

      // Update initial settings to reflect current state
      setInitialSettings({
        siteName: siteName.trim(),
        adminEmail: adminEmail.trim(),
        smtpServer: smtpServer.trim(),
        sessionTimeout: Number(sessionTimeout) || 60,
      });

      setHasChanges(false);
      addToast(
        `✓ Settings saved successfully! (${result.updated.length} field(s) updated)`,
        "success"
      );
      notifyDataChanged();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save settings";
      console.error("Error saving settings:", err);
      setError(errorMessage);
      addToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle reset to initial state
   */
  const handleReset = () => {
    setSiteName(initialSettings.siteName || "");
    setAdminEmail(initialSettings.adminEmail || "");
    setSmtpServer(initialSettings.smtpServer || "");
    setSessionTimeout(String(initialSettings.sessionTimeout || 60));
    setHasChanges(false);
    addToast("Settings reset to last saved values.", "info");
  };

  // Check role-based access - only Super Admin can access settings
  if (currentRole !== "super_admin") {
    return <Navigate to="/403" replace />;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <FaSpinner size={40} style={{ animation: "spin 1s linear infinite", color: "#2563EB", marginBottom: "16px" }} />
        <p style={{ color: "#64748B", fontWeight: 600 }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>
          System Configuration & Global Settings
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Super Administrator global control panel: Platform identity, email SMTP integration, session security
          parameters, and database backups.
        </p>
      </div>

      {/* Error Alert */}
      {error && !toasts.some((t) => t.type === "error") && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaExclamationTriangle /> {error}
        </div>
      )}

      {/* Toast Notifications */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "400px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === "success" ? "#ECFDF5" : toast.type === "error" ? "#FEF2F2" : "#EFF6FF",
              border: `1px solid ${
                toast.type === "success" ? "#6EE7B7" : toast.type === "error" ? "#FCA5A5" : "#BFDBFE"
              }`,
              color: toast.type === "success" ? "#065F46" : toast.type === "error" ? "#991B1B" : "#1E40AF",
              padding: "12px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: 600,
              animation: "slideIn 0.2s ease-out",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            {toast.type === "success" && <FaCheckCircle />}
            {toast.type === "error" && <FaExclamationTriangle />}
            {toast.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* General Settings */}
        <div className="soft-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FaSlidersH size={20} style={{ color: "#2563EB" }} />
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                General Platform Identity
              </h3>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                Organization Name <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="PawGuard Admin Portal"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#2563EB";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#CBD5E1";
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                System Admin Contact Email <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@pawguard.com"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#2563EB";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#CBD5E1";
                }}
              />
            </div>
          </div>
        </div>

        {/* Security & Infrastructure */}
        <div className="soft-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <FaShieldAlt size={20} style={{ color: "#10B981" }} />
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Security & Session Controls
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                Session Idle Timeout (Minutes) <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                required
                min={5}
                max={480}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#2563EB";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#CBD5E1";
                }}
              />
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748B" }}>
                Between 5 and 480 minutes (8 hours)
              </p>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                SMTP Mail Server
              </label>
              <input
                type="text"
                value={smtpServer}
                onChange={(e) => setSmtpServer(e.target.value)}
                placeholder="smtp.pawguard.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#2563EB";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#CBD5E1";
                }}
              />
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748B" }}>
                Email server hostname for notifications
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={saving || !hasChanges}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: saving || !hasChanges ? "#94A3B8" : "#2563EB",
                color: "#FFFFFF",
                padding: "12px 24px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: saving || !hasChanges ? "not-allowed" : "pointer",
                border: "none",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!saving && hasChanges) {
                  (e.target as HTMLButtonElement).style.background = "#1d4ed8";
                }
              }}
              onMouseLeave={(e) => {
                if (!saving && hasChanges) {
                  (e.target as HTMLButtonElement).style.background = "#2563EB";
                }
              }}
            >
              {saving ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaSave />}
              {saving ? "Saving Changes..." : "Save Configuration Changes"}
            </button>

            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#F1F5F9",
                  color: "#0F172A",
                  border: "1px solid #CBD5E1",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    (e.target as HTMLButtonElement).style.background = "#E2E8F0";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    (e.target as HTMLButtonElement).style.background = "#F1F5F9";
                  }
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </form>

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(100px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Settings;