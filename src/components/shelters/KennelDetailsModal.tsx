import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import DataTable, { type Column } from "../common/DataTable";
import shelterService from "../../services/shelterService";
import petService from "../../services/petService";
import { useToast } from "../../context/ToastContext";
import {
  FaPaw,
  FaBroom,
  FaClipboardList,
} from "react-icons/fa";

interface KennelDetailsModalProps {
  kennel: any | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  onOpenAssign?: (kennel: any) => void;
}

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export const KennelDetailsModal: React.FC<KennelDetailsModalProps> = ({
  kennel,
  isOpen,
  onClose,
  onRefresh,
  onOpenAssign,
}) => {
  const { addToast } = useToast();
  const [cleaningLogs, setCleaningLogs] = useState<any[]>([]);
  const [occupantDog, setOccupantDog] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // New cleaning log form
  const [showLogForm, setShowLogForm] = useState(false);
  const [sanitationStateAfter, setSanitationStateAfter] = useState<string>("clean");
  const [cleaningMethod, setCleaningMethod] = useState<string>("Deep Steam & Disinfectant Wipe");
  const [cleaningNotes, setCleaningNotes] = useState<string>("");

  useEffect(() => {
    if (!kennel?.id || !isOpen) return;

    let isMounted = true;
    const fetchKennelDetails = async () => {
      setLoading(true);
      try {
        const [logsRes, dogRes] = await Promise.all([
          shelterService.getKennelCleaningLogs(kennel.id).catch(() => ({ data: [] })),
          kennel.occupied_by_dog_id
            ? petService.getPetById(kennel.occupied_by_dog_id).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setCleaningLogs(unwrapList(logsRes));
        setOccupantDog(dogRes?.data || dogRes);
      } catch {
        // quiet fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchKennelDetails();
    return () => {
      isMounted = false;
    };
  }, [kennel, isOpen]);

  if (!isOpen || !kennel) return null;

  const handleQuickSanitize = async () => {
    try {
      setLoading(true);
      await shelterService.updateKennelSanitation(kennel.id);
      addToast(`Kennel "${kennel.identifier}" marked as CLEAN.`, "success");
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update sanitation state.";
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCleaningLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingLog(true);
      await shelterService.createKennelCleaningLog(kennel.id, {
        sanitation_state_after: sanitationStateAfter as any,
        cleaning_method: cleaningMethod,
        notes: cleaningNotes,
      });
      addToast("Cleaning log recorded successfully!", "success");
      setShowLogForm(false);
      setCleaningNotes("");
      const logsRes = await shelterService.getKennelCleaningLogs(kennel.id).catch(() => ({ data: [] }));
      setCleaningLogs(unwrapList(logsRes));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to record cleaning log.";
      addToast(msg, "error");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const cleaningColumns: Column<any>[] = [
    { key: "cleaned_at", header: "Logged At", render: (_v, row) => new Date(row.cleaned_at || row.created_at).toLocaleString() },
    { key: "cleaned_by", header: "Cleaned By", render: (_v, row) => row.cleaned_by || "Staff" },
    {
      key: "sanitation_state_after",
      header: "State After",
      render: (_v, row) => (
        <span style={{ textTransform: "uppercase", fontWeight: 700, fontSize: "11px" }}>
          {row.sanitation_state_after}
        </span>
      ),
    },
    { key: "cleaning_method", header: "Method", render: (_v, row) => row.cleaning_method || "General Cleaning" },
    { key: "notes", header: "Notes", render: (_v, row) => row.notes || "—" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Kennel Unit Details — ${kennel.identifier}`} size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Unit Summary Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
            background: "#F8FAFC",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Unit Identifier</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>{kennel.identifier}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Capacity</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#2563EB" }}>{kennel.capacity ?? 1} animal(s)</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Sanitation</div>
            <div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background:
                    kennel.sanitation_state === "clean"
                      ? "#DCFCE7"
                      : kennel.sanitation_state === "needs_cleaning"
                      ? "#FEF3C7"
                      : "#FEE2E2",
                  color:
                    kennel.sanitation_state === "clean"
                      ? "#166534"
                      : kennel.sanitation_state === "needs_cleaning"
                      ? "#92400E"
                      : "#991B1B",
                }}
              >
                {(kennel.sanitation_state || "clean").toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Occupancy State</div>
            <div>
              {kennel.is_occupied ? (
                <span style={{ color: "#DC2626", fontWeight: 700 }}>Occupied</span>
              ) : (
                <span style={{ color: "#16A34A", fontWeight: 700 }}>Available</span>
              )}
            </div>
          </div>
        </div>

        {/* Current Occupant Section */}
        <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaPaw style={{ color: "#2563EB" }} /> Current Occupant
          </h4>
          {kennel.is_occupied && occupantDog ? (
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "8px",
                  background: "#E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {occupantDog.photo_url || occupantDog.image_urls?.[0] ? (
                  <img
                    src={occupantDog.photo_url || occupantDog.image_urls[0]}
                    alt={occupantDog.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <FaPaw style={{ fontSize: "24px", color: "#94A3B8" }} />
                )}
              </div>
              <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div>
                  <strong style={{ fontSize: "15px", color: "#0F172A" }}>{occupantDog.name}</strong>{" "}
                  <code>({occupantDog.registration_number || occupantDog.id})</code>
                </div>
                <div>Breed: {occupantDog.breed} • Gender: {occupantDog.gender} • Age: {occupantDog.estimated_age || "N/A"}</div>
                <div>
                  Quarantine:{" "}
                  {occupantDog.is_quarantine_passed ? (
                    <span style={{ color: "#16A34A", fontWeight: 600 }}>Cleared</span>
                  ) : (
                    <span style={{ color: "#DC2626", fontWeight: 600 }}>In Quarantine</span>
                  )}
                </div>
              </div>
            </div>
          ) : kennel.is_occupied ? (
            <div style={{ fontSize: "13px", color: "#DC2626" }}>
              Kennel is flagged as occupied by Dog ID: <code>{kennel.occupied_by_dog_id}</code>.
            </div>
          ) : (
            <div style={{ fontSize: "13px", color: "#64748B", fontStyle: "italic" }}>
              No animal is currently assigned to this kennel unit.
            </div>
          )}
        </div>

        {/* Cleaning & Sanitation Log Section */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
              <FaClipboardList style={{ color: "#0D9488" }} /> Cleaning & Sanitation Logs
            </h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleQuickSanitize}
                disabled={loading}
                style={{
                  padding: "6px 12px",
                  background: "#16A34A",
                  color: "#FFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FaBroom /> Mark Sanitized (Clean)
              </button>
              <button
                onClick={() => setShowLogForm(!showLogForm)}
                style={{
                  padding: "6px 12px",
                  background: "#2563EB",
                  color: "#FFF",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showLogForm ? "Cancel Log" : "+ Log Cleaning Event"}
              </button>
            </div>
          </div>

          {showLogForm && (
            <form
              onSubmit={handleAddCleaningLog}
              style={{
                background: "#EFF6FF",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #BFDBFE",
                marginBottom: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontWeight: 600, color: "#1E3A8A", display: "block", marginBottom: "4px" }}>Sanitation State After *</label>
                  <select
                    value={sanitationStateAfter}
                    onChange={(e) => setSanitationStateAfter(e.target.value)}
                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #93C5FD" }}
                  >
                    <option value="clean">Clean</option>
                    <option value="needs_cleaning">Needs Cleaning</option>
                    <option value="disinfecting">Disinfecting</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: "#1E3A8A", display: "block", marginBottom: "4px" }}>Cleaning Method</label>
                  <input
                    type="text"
                    value={cleaningMethod}
                    onChange={(e) => setCleaningMethod(e.target.value)}
                    placeholder="e.g. Steam Sanitation, Chemical Wipe"
                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #93C5FD" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 600, color: "#1E3A8A", display: "block", marginBottom: "4px" }}>Log Notes</label>
                <textarea
                  value={cleaningNotes}
                  onChange={(e) => setCleaningNotes(e.target.value)}
                  placeholder="Additional observations, bedding replaced, etc."
                  rows={2}
                  style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #93C5FD" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  style={{
                    padding: "6px 16px",
                    background: "#1D4ED8",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isSubmittingLog ? "Saving Log..." : "Submit Cleaning Log"}
                </button>
              </div>
            </form>
          )}

          <DataTable
            columns={cleaningColumns}
            data={cleaningLogs}
            loading={loading}
            emptyMessage="No cleaning logs recorded for this kennel unit."
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
          {!kennel.is_occupied && onOpenAssign && (
            <button
              onClick={() => {
                onClose();
                onOpenAssign(kennel);
              }}
              style={{
                padding: "8px 16px",
                background: "#2563EB",
                color: "#FFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Assign Animal to Kennel
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#F1F5F9",
              color: "#334155",
              border: "1px solid #CBD5E1",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default KennelDetailsModal;
