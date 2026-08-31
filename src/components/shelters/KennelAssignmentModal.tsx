import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import shelterService from "../../services/shelterService";
import petService from "../../services/petService";
import { useToast } from "../../context/ToastContext";
import {
  FaShieldAlt,
} from "react-icons/fa";

interface KennelAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedFacilityId?: string;
  preselectedKennelId?: string;
  preselectedDogId?: string;
  onSuccess: () => void;
}

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export const KennelAssignmentModal: React.FC<KennelAssignmentModalProps> = ({
  isOpen,
  onClose,
  preselectedFacilityId = "",
  preselectedKennelId = "",
  preselectedDogId = "",
  onSuccess,
}) => {
  const { addToast } = useToast();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [kennels, setKennels] = useState<any[]>([]);
  const [dogs, setDogs] = useState<any[]>([]);

  const [selectedFacilityId, setSelectedFacilityId] = useState(preselectedFacilityId);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedKennelId, setSelectedKennelId] = useState(preselectedKennelId);
  const [selectedDogId, setSelectedDogId] = useState(preselectedDogId);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [facRes, dogRes] = await Promise.all([
          shelterService.getShelters({ page: 1, page_size: 20 }),
          petService.getPets({ page: 1, page_size: 20 }),
        ]);

        const facList = unwrapList(facRes);
        setFacilities(facList);

        const dogList = unwrapList(dogRes);
        setDogs(dogList);

        if (preselectedFacilityId) {
          const secRes = await shelterService.getFacilitySections(preselectedFacilityId);
          setSections(unwrapList(secRes));
        }
      } catch {
        addToast("Failed to load facilities or animals for assignment.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isOpen, preselectedFacilityId]);

  const handleFacilityChange = async (facId: string) => {
    setSelectedFacilityId(facId);
    setSelectedSectionId("");
    setSelectedKennelId("");
    setSections([]);
    setKennels([]);
    if (!facId) return;

    try {
      const secRes = await shelterService.getFacilitySections(facId);
      setSections(unwrapList(secRes));
    } catch {
      setSections([]);
    }
  };

  const handleSectionChange = async (secId: string) => {
    setSelectedSectionId(secId);
    setSelectedKennelId("");
    setKennels([]);
    if (!secId) return;

    try {
      const kRes = await shelterService.getSectionKennels(secId);
      setKennels(unwrapList(kRes));
    } catch {
      setKennels([]);
    }
  };

  const selectedDog = dogs.find((d) => (d.id || d.dog_id) === selectedDogId);
  const selectedKennel = kennels.find((k) => k.id === selectedKennelId);

  // Quarantine & Eligibility Info
  const isDogInQuarantine = selectedDog && selectedDog.is_quarantine_passed === false;
  const isKennelFull = selectedKennel?.is_occupied;

  // Conditional validation: require animal and kennel selection, ensuring kennel is available
  const isFormValid = Boolean(selectedKennelId && selectedDogId && !isKennelFull);

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKennelId || !selectedDogId) {
      addToast("Please select both an animal and an available kennel.", "error");
      return;
    }
    if (isKennelFull) {
      addToast("Selected kennel is currently occupied. Please choose an available unit.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      await shelterService.assignDogToKennel(selectedKennelId, selectedDogId);
      addToast(
        `Animal ${selectedDog?.name || selectedDogId} assigned to Kennel ${selectedKennel?.identifier || selectedKennelId}!`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to assign animal to kennel.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kennel Unit Assignment Workflow" size="lg">
      {loading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
          Loading facilities and animal records...
        </div>
      ) : (
        <form onSubmit={handleSubmitAssignment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Step 1: Select Animal */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "6px" }}>
              1. Select Animal / Dog *
            </label>
            <select
              value={selectedDogId}
              onChange={(e) => setSelectedDogId(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
            >
              <option value="">-- Choose Animal --</option>
              {dogs.map((d) => (
                <option key={d.id || d.dog_id} value={d.id || d.dog_id}>
                  {d.name} ({d.registration_number || d.id?.slice(0, 8)}) - {d.breed || "Dog"} [
                  {d.is_quarantine_passed ? "Cleared" : "Quarantine Required"}]
                </option>
              ))}
            </select>
          </div>

          {/* Quarantine Advisory */}
          {selectedDog && isDogInQuarantine && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "10px 12px", borderRadius: "6px", fontSize: "12px", color: "#92400E", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaShieldAlt style={{ fontSize: "15px", color: "#D97706" }} />
              <div>
                <strong>Quarantine Advisory:</strong> This animal has not completed medical quarantine. Placement in a <strong>Quarantine</strong> or <strong>Isolation</strong> section is recommended.
              </div>
            </div>
          )}

          {/* Step 2: Select Shelter Facility */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "6px" }}>
                2. Shelter Facility *
              </label>
              <select
                value={selectedFacilityId}
                onChange={(e) => handleFacilityChange(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
              >
                <option value="">-- Choose Facility --</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.facility_type || "shelter"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "6px" }}>
                3. Facility Section *
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!selectedFacilityId || sections.length === 0}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
              >
                <option value="">-- Choose Section --</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.section_type || "general"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Select Kennel Unit */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#1E293B", marginBottom: "6px" }}>
              4. Target Kennel Unit *
            </label>
            <select
              value={selectedKennelId}
              onChange={(e) => setSelectedKennelId(e.target.value)}
              disabled={!selectedSectionId || kennels.length === 0}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
            >
              <option value="">-- Choose Kennel Unit --</option>
              {kennels.map((k) => (
                <option key={k.id} value={k.id} disabled={k.is_occupied}>
                  Unit {k.identifier} (Cap: {k.capacity ?? 1}) - [{k.sanitation_state || "clean"}]{" "}
                  {k.is_occupied ? "— OCCUPIED (FULL)" : "— AVAILABLE"}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Kennel Details Card */}
          {selectedKennel && (
            <div style={{ background: selectedKennel.is_occupied ? "#FEF2F2" : "#F0FDF4", padding: "12px", borderRadius: "6px", border: `1px solid ${selectedKennel.is_occupied ? "#FCA5A5" : "#86EFAC"}`, fontSize: "12px" }}>
              <div style={{ fontWeight: 700, color: selectedKennel.is_occupied ? "#991B1B" : "#166534" }}>
                Kennel Unit {selectedKennel.identifier} Status:
              </div>
              <div>Sanitation State: <strong>{(selectedKennel.sanitation_state || "clean").toUpperCase()}</strong></div>
              <div>Availability: <strong>{selectedKennel.is_occupied ? "Occupied / Full" : "Available for immediate placement"}</strong></div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                padding: "8px 16px",
                background: isFormValid ? "#2563EB" : "#94A3B8",
                color: "#FFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: isFormValid ? "pointer" : "not-allowed",
              }}
            >
              {isSubmitting ? "Confirming Assignment..." : "Confirm Kennel Assignment"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default KennelAssignmentModal;
