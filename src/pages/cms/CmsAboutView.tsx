import { useState, useEffect, useCallback } from "react";
import cmsService from "../../services/cmsService";
import { useToast } from "../../context/ToastContext";
import { FaSave, FaSpinner, FaInfoCircle, FaBullseye } from "react-icons/fa";

const getErrorMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const r = err as { response?: { data?: { detail?: unknown; message?: unknown } } };
    const detail = r?.response?.data?.detail ?? r?.response?.data?.message;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
};

const CmsAboutView = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    about_us: "",
    mission: "",
    updated_at: "",
  });

  const fetchPublicContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cmsService.getPublicContent();
      setForm({
        about_us: res.about_us || "",
        mission: res.mission || "",
        updated_at: res.updated_at || "",
      });
    } catch (err: unknown) {
      setError(getErrorMsg(err, "Failed to load public About & Mission content."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicContent();
  }, [fetchPublicContent]);

  const handleSave = async () => {
    if (!form.about_us.trim() || !form.mission.trim()) {
      addToast("Both About Us text and Mission Statement are required.", "error");
      return;
    }

    try {
      setSaving(true);
      await cmsService.updatePublicContent({
        about_us: form.about_us.trim(),
        mission: form.mission.trim(),
      });
      addToast("Public About Us and Mission content updated successfully!", "success");
      await fetchPublicContent();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to update public content."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        maxWidth: "900px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>
            About Us & Organization Mission
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Update the primary public background information and core mission statement displayed across the PawGuard web platform.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#2563EB",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {saving ? <FaSpinner className="spin" /> : <FaSave />} Save Changes
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            marginBottom: "16px",
            fontSize: "13.5px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#2563EB", fontSize: "14px" }}>
          <FaSpinner className="spin" size={24} style={{ marginBottom: 8 }} />
          <div>Loading content from backend API...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* About Us Field */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FaInfoCircle size={16} style={{ color: "#2563EB" }} />
              <label style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                About Us Story & Organization Overview
              </label>
            </div>
            <textarea
              rows={8}
              value={form.about_us}
              onChange={(e) => setForm({ ...form, about_us: e.target.value })}
              placeholder="Enter comprehensive information about PawGuard, our rescue initiatives, shelters, and history..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 13.5,
                lineHeight: 1.6,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <span style={{ fontSize: "11.5px", color: "#64748B", marginTop: 4, display: "block" }}>
              Max 20,000 characters. Supports line breaks and formatted text.
            </span>
          </div>

          {/* Mission Statement Field */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FaBullseye size={16} style={{ color: "#10B981" }} />
              <label style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                Official Mission Statement
              </label>
            </div>
            <textarea
              rows={6}
              value={form.mission}
              onChange={(e) => setForm({ ...form, mission: e.target.value })}
              placeholder="State the core mission, ethical standards, and commitment of PawGuard to stray animal welfare..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 13.5,
                lineHeight: 1.6,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {form.updated_at && (
            <div style={{ fontSize: "12px", color: "#94A3B8", textAlign: "right" }}>
              Last synchronized with backend: {new Date(form.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CmsAboutView;
