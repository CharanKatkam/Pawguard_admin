import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaHandHoldingHeart,
  FaHome,
  FaDog,
  FaEdit,
  FaTrash,
  FaUndo,
  FaClipboardList,
  FaUserPlus,
} from "react-icons/fa";
import fosterService from "../../services/fosterService";
import petService from "../../services/petService";
import { notifyDataChanged } from "../../utils/dataSync";
import { formatDateTime } from "../../utils/dateUtils";

export interface FosterProfileRow {
  id: string;
  foster_family: string;
  status: string;
  active_count: number;
  max_capacity: number | string;
  is_available: boolean;
  preferences?: string;
  notes?: string;
  created_at?: string;
  user?: any;
  raw: any;
  [key: string]: unknown;
}

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : [];

const FosterManagement = () => {
  const [fosters, setFosters] = useState<FosterProfileRow[]>([]);
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(() => searchParams.get("action") === "apply");
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(() => searchParams.get("action") === "place");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedFoster, setSelectedFoster] = useState<FosterProfileRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [applyForm, setApplyForm] = useState({
    preferences: "Dogs only, Medium size",
    max_capacity: 2,
    notes: "",
  });

  const [placeForm, setPlaceForm] = useState({
    profileId: "",
    dog_id: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    is_available: true,
    max_capacity: 2,
    preferences: "",
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    placementId: "",
    notes: "",
  });

  const [progressForm, setProgressForm] = useState({
    placementId: "",
    notes: "",
    weight: "",
    health_status: "Healthy",
  });

  const fetchFosters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fosterService.getFosterProfiles();
      const list = unwrapList(response);

      const formatted: FosterProfileRow[] = list.map((item: any) => {
        const user = item.user || {};
        const name = user.full_name || user.name || user.email || item.foster_name || item.id || "Foster Parent";
        return {
          id: String(item.id || item.profile_id || ""),
          foster_family: String(name),
          status: String(item.status || (item.is_available ? "Active" : "Busy")),
          active_count: Number(item.active_count ?? item.placements_count ?? 0),
          max_capacity: item.max_capacity ?? 1,
          is_available: item.is_available !== undefined ? Boolean(item.is_available) : true,
          preferences: item.preferences || "",
          notes: item.notes || "",
          created_at: item.created_at || item.date || item.updated_at || "",
          user,
          raw: item,
        };
      });

      // Default sorting: NEWEST -> OLDEST
      formatted.sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setFosters(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || "Failed to load foster profiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDogs = useCallback(async () => {
    try {
      const dogsRes = await petService.getPets();
      const list = unwrapList(dogsRes);
      setDogs(
        list.map((d: any) => ({
          id: d.id || d.dog_id || "",
          label: `${d.name || "Dog"} (${d.registration_number || d.id || "Canine"})`,
        }))
      );
    } catch {
      setDogs([]);
    }
  }, []);

  useEffect(() => {
    fetchFosters();
    fetchDogs();
  }, [fetchFosters, fetchDogs]);

  useEffect(() => {
    if (searchParams.get("action")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Handlers
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await fosterService.apply(applyForm);
      addToast("Registered new foster profile!", "success");
      setIsApplyModalOpen(false);
      setApplyForm({ preferences: "Dogs only, Medium size", max_capacity: 2, notes: "" });
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to register foster profile.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;
    try {
      setIsSubmitting(true);
      await fosterService.updateProfile(editForm.id, {
        is_available: editForm.is_available,
        max_capacity: Number(editForm.max_capacity),
        preferences: editForm.preferences,
        notes: editForm.notes,
      });
      addToast("Updated foster profile details!", "success");
      setIsEditModalOpen(false);
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update profile.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeForm.profileId || !placeForm.dog_id) {
      addToast("Please select both a foster profile and a dog.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await fosterService.placeDog(placeForm.profileId, {
        dog_id: placeForm.dog_id,
        notes: placeForm.notes || undefined,
      });
      addToast("Dog placed in foster care!", "success");
      setIsPlaceModalOpen(false);
      setPlaceForm({ profileId: "", dog_id: "", notes: "" });
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create placement.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.placementId) return;
    try {
      setIsSubmitting(true);
      await fosterService.returnDog(returnForm.placementId, returnForm.notes);
      addToast("Dog returned from foster care!", "success");
      setIsReturnModalOpen(false);
      setReturnForm({ placementId: "", notes: "" });
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to return dog.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressForm.placementId) return;
    try {
      setIsSubmitting(true);
      await fosterService.logProgress(progressForm.placementId, {
        notes: progressForm.notes,
        weight: progressForm.weight ? Number(progressForm.weight) : undefined,
        health_status: progressForm.health_status,
      });
      addToast("Logged foster care progress update!", "success");
      setIsProgressModalOpen(false);
      setProgressForm({ placementId: "", notes: "", weight: "", health_status: "Healthy" });
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to log progress.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedFoster) return;
    try {
      setIsSubmitting(true);
      await fosterService.deleteProfile(selectedFoster.id);
      addToast(`Deleted foster profile ${selectedFoster.foster_family}`, "success");
      setIsDeleteModalOpen(false);
      setSelectedFoster(null);
      fetchFosters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete profile.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableHomes = fosters.filter((f) => f.is_available).length;
  const dogsInFoster = fosters.reduce((acc, f) => acc + Number(f.active_count || 0), 0);

  const columns = [
    {
      key: "id",
      title: "Profile ID",
      render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748B" }}>{v ? String(v).slice(0, 10) : "-"}</span>,
    },
    {
      key: "foster_family",
      title: "Foster Family / Parent",
      render: (v: string) => <div style={{ fontWeight: 700, color: "#0F172A" }}>{v}</div>,
    },
    {
      key: "active_count",
      title: "Active Placements",
      render: (v: number) => <span style={{ fontWeight: 700, color: "#2563EB" }}>{v ?? 0} Pets</span>,
    },
    {
      key: "max_capacity",
      title: "Capacity",
      render: (v: number) => <span>{v ?? 1} Max</span>,
    },
    {
      key: "created_at",
      title: "Registered Date",
      render: (v: string) => <span style={{ fontSize: "12px", color: "#64748B" }}>{v ? formatDateTime(v) : "Recent"}</span>,
    },
    {
      key: "status",
      title: "Status",
      render: (_: string, row: FosterProfileRow) => (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 800,
            background: row.is_available ? "#D1FAE5" : "#EFF6FF",
            color: row.is_available ? "#065F46" : "#1E40AF",
          }}
        >
          {row.is_available ? "AVAILABLE" : "BUSY"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: unknown, row: FosterProfileRow) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Can permission={["edit_foster_placements", "foster_placements:update", "foster:update"]}>
            <button
              onClick={() => {
                setSelectedFoster(row);
                setEditForm({
                  id: row.id,
                  is_available: row.is_available,
                  max_capacity: Number(row.max_capacity) || 2,
                  preferences: row.preferences || "",
                  notes: row.notes || "",
                });
                setIsEditModalOpen(true);
              }}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <FaEdit /> Edit
            </button>
          </Can>

          <Can permission={["create_foster_placements", "foster_placements:create", "foster:create"]}>
            <button
              onClick={() => {
                setPlaceForm({ profileId: row.id, dog_id: "", notes: "" });
                setIsPlaceModalOpen(true);
              }}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #A7F3D0", background: "#ECFDF5", color: "#047857", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              Place Dog
            </button>
          </Can>

          <Can permission={["delete_foster_placements", "foster_placements:delete", "foster:delete"]}>
            <button
              onClick={() => {
                setSelectedFoster(row);
                setIsDeleteModalOpen(true);
              }}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              <FaTrash />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Foster Management &amp; Caregiver Roster</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Onboard foster parents, assign animals to home placements, monitor care duration, and log progress updates.
        </p>
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission={["create_foster_placements", "foster_placements:create", "foster:create"]}>
          <QuickActionCard icon={<FaUserPlus />} title="Register Foster Parent" subtitle="Onboard new home" color="#2563EB" onClick={() => setIsApplyModalOpen(true)} />
        </Can>
        <Can permission={["create_foster_placements", "foster_placements:create", "foster:create"]}>
          <QuickActionCard icon={<FaDog />} title="Place Dog in Foster" subtitle="Assign dog to family" color="#10B981" onClick={() => setIsPlaceModalOpen(true)} />
        </Can>
        <Can permission={["edit_foster_placements", "foster_placements:update", "foster:update"]}>
          <QuickActionCard icon={<FaUndo />} title="Return Dog to Shelter" subtitle="Log foster care return" color="#D97706" onClick={() => setIsReturnModalOpen(true)} />
        </Can>
        <Can permission={["edit_foster_placements", "foster_placements:update", "foster:update"]}>
          <QuickActionCard icon={<FaClipboardList />} title="Log Care Progress" subtitle="Record health &amp; weight" color="#8B5CF6" onClick={() => setIsProgressModalOpen(true)} />
        </Can>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Foster Profiles" value={fosters.length} icon={<FaHome />} color="#2563EB" />
        <StatCard title="Available Homes" value={availableHomes} icon={<FaHandHoldingHeart />} color="#8B5CF6" />
        <StatCard title="Dogs in Foster Care" value={dogsInFoster} icon={<FaDog />} color="#10B981" />
      </div>

      {/* Main Catalog Card */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Registered Foster Parents &amp; Placement Status (Newest First)
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Showing {fosters.length} total foster profiles
            </span>
          </div>
        </div>

        <DataTable columns={columns} data={fosters} loading={loading} error={error} onRetry={fetchFosters} emptyMessage="No foster profiles registered." />
      </div>

      {/* Register Foster Parent Modal (POST /api/v1/fosters/apply) */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Onboard New Foster Parent">
        <form onSubmit={handleApplySubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Home Preferences</label>
            <input type="text" required placeholder="e.g. Dogs under 20kg, No cats" value={applyForm.preferences} onChange={(e) => setApplyForm({ ...applyForm, preferences: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Max Animal Capacity *</label>
            <input type="number" min="1" max="10" required value={applyForm.max_capacity} onChange={(e) => setApplyForm({ ...applyForm, max_capacity: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Care Notes / Experience</label>
            <textarea rows={3} placeholder="e.g. Has fenced yard, experienced with medical recovery" value={applyForm.notes} onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsApplyModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Registering..." : "Register Foster Profile"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Place Dog Modal (POST /api/v1/fosters/{profile_id}/placements) */}
      <Modal isOpen={isPlaceModalOpen} onClose={() => setIsPlaceModalOpen(false)} title="Place Dog in Foster Care">
        <form onSubmit={handlePlaceSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Foster Parent / Family *</label>
            <select required value={placeForm.profileId} onChange={(e) => setPlaceForm({ ...placeForm, profileId: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="">-- Choose Foster Profile --</option>
              {fosters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.foster_family} (Active: {f.active_count} / Max: {f.max_capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Dog *</label>
            <select required value={placeForm.dog_id} onChange={(e) => setPlaceForm({ ...placeForm, dog_id: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="">-- Choose Dog --</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Placement Notes / Instructions</label>
            <textarea rows={3} placeholder="e.g. Requires daily medication at 8am" value={placeForm.notes} onChange={(e) => setPlaceForm({ ...placeForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsPlaceModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Placing..." : "Confirm Placement"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Profile Modal (PUT /api/v1/fosters/{profile_id}) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Foster Profile">
        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Availability Status</label>
            <select value={editForm.is_available ? "true" : "false"} onChange={(e) => setEditForm({ ...editForm, is_available: e.target.value === "true" })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="true">Available for Placements</option>
              <option value="false">Busy / Temporarily Paused</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Max Capacity</label>
            <input type="number" min="1" max="10" required value={editForm.max_capacity} onChange={(e) => setEditForm({ ...editForm, max_capacity: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Home Preferences</label>
            <input type="text" value={editForm.preferences} onChange={(e) => setEditForm({ ...editForm, preferences: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Notes</label>
            <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Dog Modal (POST /api/v1/fosters/placements/{placement_id}/return) */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Log Dog Return to Shelter">
        <form onSubmit={handleReturnSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Placement ID / Reference *</label>
            <input type="text" required placeholder="Enter placement ID" value={returnForm.placementId} onChange={(e) => setReturnForm({ ...returnForm, placementId: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Return Reason / Notes</label>
            <textarea rows={3} placeholder="e.g. Adoption completed, or foster period ended" value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsReturnModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#D97706", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Logging..." : "Confirm Return"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Progress Modal (POST /api/v1/fosters/placements/{placement_id}/progress) */}
      <Modal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} title="Log Care Progress &amp; Health">
        <form onSubmit={handleProgressSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Placement ID *</label>
            <input type="text" required placeholder="Enter placement ID" value={progressForm.placementId} onChange={(e) => setProgressForm({ ...progressForm, placementId: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Weight (kg)</label>
              <input type="number" step="0.1" placeholder="e.g. 14.5" value={progressForm.weight} onChange={(e) => setProgressForm({ ...progressForm, weight: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Health Status</label>
              <select value={progressForm.health_status} onChange={(e) => setProgressForm({ ...progressForm, health_status: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                <option value="Healthy">Healthy</option>
                <option value="Recovering">Recovering</option>
                <option value="Requires Vet Care">Requires Vet Care</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Progress Notes / Behavioral Observations</label>
            <textarea rows={3} placeholder="e.g. Dog is adjusting well, eating normally" value={progressForm.notes} onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsProgressModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#8B5CF6", color: "#FFF", fontWeight: 600 }}>
              {isSubmitting ? "Saving..." : "Log Progress"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Profile Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Foster Profile">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to delete foster profile <strong>{selectedFoster?.foster_family}</strong> ({selectedFoster?.id})?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>
              Cancel
            </button>
            <button type="button" disabled={isSubmitting} onClick={handleDeleteProfile} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
              <FaTrash /> Delete Profile
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FosterManagement;
