import { useState, useEffect, useCallback } from "react";
import cmsService from "../../services/cmsService";
import type { ContactLocationRecord } from "../../types/cms";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaPhoneAlt,
  FaClock,
  FaMapMarkerAlt,
  FaExclamationCircle,
} from "react-icons/fa";

const getErrorMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const r = err as { response?: { data?: { detail?: unknown; message?: unknown } } };
    const detail = r?.response?.data?.detail ?? r?.response?.data?.message;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
};

const CmsContactView = () => {
  const { addToast } = useToast();

  const [locations, setLocations] = useState<ContactLocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingLocation, setEditingLocation] = useState<ContactLocationRecord | null>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    operating_hours: "",
    is_emergency_hotline: false,
    sort_order: 0,
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cmsService.getContactLocations();
      setLocations(Array.isArray(res) ? res : []);
    } catch (err: unknown) {
      setError(getErrorMsg(err, "Failed to load contact locations from backend API."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingLocation(null);
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      operating_hours: "24/7 Emergency",
      is_emergency_hotline: false,
      sort_order: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (loc: ContactLocationRecord) => {
    setModalMode("edit");
    setEditingLocation(loc);
    setForm({
      name: loc.name || "",
      address: loc.address || "",
      phone: loc.phone || "",
      email: loc.email || "",
      operating_hours: loc.operating_hours || "",
      is_emergency_hotline: loc.is_emergency_hotline ?? false,
      sort_order: loc.sort_order ?? 0,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.phone.trim()) {
      addToast("Name, Address, and Phone are required.", "error");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await cmsService.createContactLocation({
          name: form.name.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          operating_hours: form.operating_hours.trim() || null,
          is_emergency_hotline: form.is_emergency_hotline,
          sort_order: form.sort_order,
        });
        addToast(`Location "${form.name}" added.`, "success");
      } else if (editingLocation) {
        await cmsService.updateContactLocation(editingLocation.id, {
          name: form.name.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          operating_hours: form.operating_hours.trim() || null,
          is_emergency_hotline: form.is_emergency_hotline,
          sort_order: form.sort_order,
        });
        addToast(`Updated location "${form.name}".`, "success");
      }
      setModalOpen(false);
      await fetchLocations();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to save location."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (loc: ContactLocationRecord) => {
    if (!window.confirm(`Delete location "${loc.name}"?`)) return;
    try {
      await cmsService.deleteContactLocation(loc.id);
      addToast(`Deleted location "${loc.name}".`, "success");
      await fetchLocations();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to delete location."), "error");
    }
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
            Contact Locations & Emergency Hotlines
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
            Manage public rescue contact centers, shelter addresses, and 24/7 emergency dispatch phone hotlines.
          </p>
        </div>

        <button
          onClick={openCreateModal}
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
          <FaPlus /> Add Contact Location
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
          <FaSpinner className="spin" size={20} /> Loading contact locations...
        </div>
      ) : locations.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
          No contact locations or hotlines configured yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          {locations.map((loc) => (
            <div
              key={loc.id}
              style={{
                border: loc.is_emergency_hotline ? "2px solid #EF4444" : "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
                background: "#FFFFFF",
                position: "relative",
              }}
            >
              {loc.is_emergency_hotline && (
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "#FEF2F2",
                    color: "#DC2626",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <FaExclamationCircle /> EMERGENCY HOTLINE
                </span>
              )}

              <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 800, color: "#0F172A", paddingRight: 120 }}>
                {loc.name}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#475569", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FaPhoneAlt style={{ color: "#2563EB" }} /> <strong>{loc.phone}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FaMapMarkerAlt style={{ color: "#64748B" }} /> {loc.address}
                </div>
                {loc.operating_hours && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FaClock style={{ color: "#D97706" }} /> {loc.operating_hours}
                  </div>
                )}
                {loc.email && (
                  <div style={{ fontSize: "12px", color: "#64748B" }}>
                    Email: <code>{loc.email}</code>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
                <button
                  onClick={() => openEditModal(loc)}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <FaEdit /> Edit
                </button>
                <button
                  onClick={() => handleDelete(loc)}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "create" ? "Add Contact Location" : `Edit Location — ${editingLocation?.name}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Location / Hotline Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Kurnool Central Rescue Base Hotline"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
              Physical Address *
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Plot 14, Central Base Area, Kurnool, AP"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Phone Number *
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91-98765-43210"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contact@pawguard.example.com"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Operating Hours
              </label>
              <input
                type="text"
                value={form.operating_hours}
                onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
                placeholder="e.g. 24/7 Emergency or Mon-Sat 9am-6pm"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                Display Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.is_emergency_hotline}
                onChange={(e) => setForm({ ...form, is_emergency_hotline: e.target.checked })}
              />
              Highlight as Primary Emergency Rescue Hotline
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
              style={{ padding: "9px 18px", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {submitting ? "Saving..." : "Save Location"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CmsContactView;
