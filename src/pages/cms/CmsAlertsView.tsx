import { useState, useEffect, useCallback } from "react";
import cmsService from "../../services/cmsService";
import type { UrgentAlertRecord, AlertSeverity } from "../../types/cms";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
} from "react-icons/fa";

const getErrorMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const r = err as { response?: { data?: { detail?: unknown; message?: unknown } } };
    const detail = r?.response?.data?.detail ?? r?.response?.data?.message;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
};

const CmsAlertsView = () => {
  const { addToast } = useToast();

  const [alerts, setAlerts] = useState<UrgentAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingAlert, setEditingAlert] = useState<UrgentAlertRecord | null>(null);

  const [form, setForm] = useState({
    title: "",
    message: "",
    severity: "info" as AlertSeverity,
    is_active: true,
    starts_at: "",
    ends_at: "",
    sort_order: 0,
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cmsService.getUrgentAlerts();
      setAlerts(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      setError(getErrorMsg(err, "Failed to load urgent alerts from backend API."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingAlert(null);
    setForm({
      title: "",
      message: "",
      severity: "info",
      is_active: true,
      starts_at: "",
      ends_at: "",
      sort_order: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (alert: UrgentAlertRecord) => {
    setModalMode("edit");
    setEditingAlert(alert);
    setForm({
      title: alert.title || "",
      message: alert.message || "",
      severity: alert.severity || "info",
      is_active: alert.is_active ?? true,
      starts_at: alert.starts_at ? new Date(alert.starts_at).toISOString().slice(0, 16) : "",
      ends_at: alert.ends_at ? new Date(alert.ends_at).toISOString().slice(0, 16) : "",
      sort_order: alert.sort_order ?? 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      addToast("Title and Message are required.", "error");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await cmsService.createUrgentAlert({
          title: form.title.trim(),
          message: form.message.trim(),
          severity: form.severity,
          is_active: form.is_active,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          sort_order: form.sort_order,
        });
        addToast(`Urgent alert "${form.title}" broadcasted.`, "success");
      } else if (editingAlert) {
        await cmsService.updateUrgentAlert(editingAlert.id, {
          title: form.title.trim(),
          message: form.message.trim(),
          severity: form.severity,
          is_active: form.is_active,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          sort_order: form.sort_order,
        });
        addToast(`Updated urgent alert "${form.title}".`, "success");
      }
      setModalOpen(false);
      await fetchAlerts();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to save alert."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alert: UrgentAlertRecord) => {
    if (!window.confirm(`Delete urgent alert "${alert.title}"?`)) return;
    try {
      await cmsService.deleteUrgentAlert(alert.id);
      addToast(`Deleted urgent alert "${alert.title}".`, "success");
      await fetchAlerts();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to delete alert."), "error");
    }
  };

  const severityBadge = (sev: AlertSeverity) => {
    const bg = sev === "critical" ? "#FEF2F2" : sev === "warning" ? "#FEF3C7" : "#EFF6FF";
    const color = sev === "critical" ? "#DC2626" : sev === "warning" ? "#D97706" : "#2563EB";
    return (
      <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: bg, color }}>
        {sev.toUpperCase()}
      </span>
    );
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>
            Urgent Public Emergency Alerts
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Broadcast emergency banners, severe weather alerts, and urgent shelter notifications across the public website.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#DC2626",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <FaPlus /> Broadcast Alert
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
        <div style={{ padding: "40px", textAlign: "center", color: "#2563EB" }}>
          <FaSpinner className="spin" size={20} /> Loading urgent alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
          No active or historical emergency alerts.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                border: alert.severity === "critical" ? "2px solid #EF4444" : "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
                background: "#FFFFFF",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  {severityBadge(alert.severity)}
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                    {alert.title}
                  </h4>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700,
                      background: alert.is_active ? "#ECFDF5" : "#F1F5F9",
                      color: alert.is_active ? "#059669" : "#64748B",
                    }}
                  >
                    {alert.is_active ? "BROADCASTING LIVE" : "INACTIVE"}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#334155" }}>
                  {alert.message}
                </p>
                {(alert.starts_at || alert.ends_at) && (
                  <div style={{ fontSize: "11.5px", color: "#64748B", marginTop: 6 }}>
                    Schedule Window: {alert.starts_at ? new Date(alert.starts_at).toLocaleString() : "Immediate"} —{" "}
                    {alert.ends_at ? new Date(alert.ends_at).toLocaleString() : "Indefinite"}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => openEditModal(alert)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  onClick={() => handleDelete(alert)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "create" ? "Broadcast Urgent Emergency Alert" : `Edit Alert — ${editingAlert?.title}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Alert Headline *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Flash Flooding in Sector 4: Rescue Teams Standing By"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Alert Details Message *
            </label>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Urgent instructions, safe locations, or hotline phone numbers..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Severity Level
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as AlertSeverity })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }}
              >
                <option value="info">Info (Blue Banner)</option>
                <option value="warning">Warning (Amber Banner)</option>
                <option value="critical">Critical Emergency (Red Banner)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Starts At (Optional)
              </label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Ends At (Optional)
              </label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Activate & Broadcast Live Immediately
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#334155", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              style={{ padding: "9px 18px", borderRadius: 6, border: "none", background: "#DC2626", color: "#FFF", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {submitting ? "Broadcasting..." : "Save Alert"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CmsAlertsView;
