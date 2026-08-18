import React, { useState, useEffect, useCallback } from "react";
import Modal from "../common/Modal";
import {
  FaAmbulance,
  FaHome,
  FaStethoscope,
  FaBed,
  FaHeart,
  FaUserCheck,
  FaQrcode,
  FaHistory,
  FaClock,
  FaFileContract,
  FaSync,
  FaExclamationTriangle,
  FaPaw,
  FaSortAmountDown,
  FaSortAmountUp,
} from "react-icons/fa";
import petService from "../../services/petService";
import medicalService from "../../services/medicalService";
import { rescueService } from "../../services/rescueService";
import { adoptionService } from "../../services/adoptionService";
import { formatDateTime } from "../../utils/dateUtils";

export interface LifecycleEvent {
  id: string;
  stage: "rescue" | "intake" | "medical" | "kennel" | "foster" | "adoption" | "post_adoption" | "tag";
  title: string;
  timestamp: string; // ISO string used for sorting
  actor?: string;
  status?: string;
  badgeColor: string;
  iconType: string;
  details: Record<string, unknown>;
}

interface DogLifecycleTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  dog: Record<string, unknown> | null;
}

const getStageColor = (stage: LifecycleEvent["stage"]): string => {
  switch (stage) {
    case "rescue":
      return "#EF4444"; // Red
    case "intake":
      return "#F59E0B"; // Amber
    case "medical":
      return "#2563EB"; // Blue
    case "kennel":
      return "#10B981"; // Emerald
    case "foster":
      return "#8B5CF6"; // Purple
    case "adoption":
      return "#EC4899"; // Pink
    case "post_adoption":
      return "#059669"; // Dark Emerald
    case "tag":
      return "#6366F1"; // Indigo
    default:
      return "#64748B";
  }
};

const getStageIcon = (stage: LifecycleEvent["stage"]) => {
  switch (stage) {
    case "rescue":
      return <FaAmbulance color="#FFFFFF" size={14} />;
    case "intake":
      return <FaHome color="#FFFFFF" size={14} />;
    case "medical":
      return <FaStethoscope color="#FFFFFF" size={14} />;
    case "kennel":
      return <FaBed color="#FFFFFF" size={14} />;
    case "foster":
      return <FaHeart color="#FFFFFF" size={14} />;
    case "adoption":
      return <FaUserCheck color="#FFFFFF" size={14} />;
    case "post_adoption":
      return <FaFileContract color="#FFFFFF" size={14} />;
    case "tag":
      return <FaQrcode color="#FFFFFF" size={14} />;
    default:
      return <FaHistory color="#FFFFFF" size={14} />;
  }
};

const DogLifecycleTimelineModal: React.FC<DogLifecycleTimelineModalProps> = ({
  isOpen,
  onClose,
  dog,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const dogIdStr = String(
    dog?.id || dog?.dog_id || dog?.original_dog_id || dog?.registration_number || ""
  );

  const fetchLifecycleEvents = useCallback(async () => {
    if (!dogIdStr) return;
    setLoading(true);
    setError(null);

    const compiledEvents: LifecycleEvent[] = [];

    try {
      // Execute parallel calls to backend endpoints for dog lifecycle data
      const [
        dogRes,
        tagRes,
        rescueRes,
        medHistoryRes,
        medClearanceRes,
        adoptionRes,
      ] = await Promise.allSettled([
        petService.getPetById(dogIdStr),
        petService.getSafetyTagMetadata(dogIdStr),
        rescueService.getRescueCases(),
        medicalService.getMedicalHistory(dogIdStr),
        medicalService.getDogClearances(dogIdStr),
        adoptionService.getAdoptions(),
      ]);

      // 1. Intake / Registration Event
      const dogData = dogRes.status === "fulfilled" ? dogRes.value?.data || dogRes.value : dog;
      if (dogData) {
        compiledEvents.push({
          id: `intake-${dogIdStr}`,
          stage: "intake",
          title: "Shelter Intake & Registration",
          timestamp: String(dogData.created_at || new Date().toISOString()),
          actor: String(dogData.created_by || dogData.staff_name || "Shelter Staff"),
          status: String(dogData.status || "In Shelter").toUpperCase(),
          badgeColor: getStageColor("intake"),
          iconType: "intake",
          details: {
            "Dog Name": dogData.name || "Unnamed Dog",
            "Registration #": dogData.registration_number || dogIdStr,
            "Breed": dogData.breed || "Mixed Breed",
            "Gender": dogData.gender || "Unknown",
            "Estimated Age": dogData.estimated_age || `${dogData.age_months || "-"} months`,
            "Initial Status": dogData.status || "shelter",
            "Adoptable Ready": dogData.is_adoptable ? "Yes" : "No",
          },
        });
      }

      // 2. Safety Tag Provisioning & Scan Activity
      if (tagRes.status === "fulfilled" && tagRes.value) {
        const tagMeta = tagRes.value.data || tagRes.value;
        if (tagMeta && tagMeta.created_at) {
          compiledEvents.push({
            id: `tag-${dogIdStr}`,
            stage: "tag",
            title: "Safety Tag Issued",
            timestamp: String(tagMeta.created_at),
            actor: "System Administrator",
            status: tagMeta.is_active ? "ACTIVE" : "INACTIVE",
            badgeColor: getStageColor("tag"),
            iconType: "tag",
            details: {
              "Token Prefix": tagMeta.token_prefix || "PG-TAG",
              "Tag Status": tagMeta.is_active ? "Active" : "Inactive",
              "Total Public Scans": tagMeta.scan_count || tagMeta.scans_count || 0,
              "Last Scanned": tagMeta.last_scanned_at ? formatDateTime(tagMeta.last_scanned_at) : "Never",
            },
          });
        }
      }

      // 3. Rescue & Field Dispatch Events
      if (rescueRes.status === "fulfilled" && rescueRes.value) {
        const rescueList = Array.isArray(rescueRes.value.data)
          ? rescueRes.value.data
          : Array.isArray(rescueRes.value)
          ? rescueRes.value
          : [];

        const matchedRescue = rescueList.find((r: any) => {
          const rId = String(r.dog_id || r.id || r.case_id || "").toLowerCase();
          const dId = dogIdStr.toLowerCase();
          const dReg = String(dogData?.registration_number || "").toLowerCase();
          const dName = String(dogData?.name || "").toLowerCase();
          return (
            rId === dId ||
            (dReg && rId.includes(dReg)) ||
            (dName && String(r.dog_name || "").toLowerCase().includes(dName))
          );
        });

        if (matchedRescue) {
          compiledEvents.push({
            id: `rescue-${matchedRescue.id || dogIdStr}`,
            stage: "rescue",
            title: `Rescue Incident: ${matchedRescue.location || "Field Location"}`,
            timestamp: String(matchedRescue.created_at || matchedRescue.dispatch_time || dogData?.created_at || new Date().toISOString()),
            actor: String(matchedRescue.assigned_agent || matchedRescue.driver_id || "Rescue Dispatch Team"),
            status: String(matchedRescue.status || "RESCUED").toUpperCase(),
            badgeColor: getStageColor("rescue"),
            iconType: "rescue",
            details: {
              "Location": matchedRescue.location || "Field location",
              "Urgency Level": matchedRescue.urgency_level || matchedRescue.severity || "Standard",
              "Assigned Rescue Agent": matchedRescue.assigned_agent || "Assigned Team",
              "Reporter": matchedRescue.reporter_name || "Public Sighting",
              "Incident Notes": matchedRescue.notes || "Field rescue completed and animal transported to shelter facility.",
            },
          });
        }
      }

      // 4. Medical History Events (Exams, Vaccinations, Surgeries, Clearances)
      if (medHistoryRes.status === "fulfilled" && medHistoryRes.value) {
        const historyRows = Array.isArray(medHistoryRes.value.data)
          ? medHistoryRes.value.data
          : Array.isArray(medHistoryRes.value)
          ? medHistoryRes.value
          : [];

        historyRows.forEach((row: any, idx: number) => {
          const category = String(row.category || row.type || "exam").toLowerCase();
          let title = "Medical Clinical Exam";
          if (category.includes("vaccin")) title = `Vaccination Administered: ${row.title || row.vaccine_name || "Routine Vaccine"}`;
          else if (category.includes("treat") || category.includes("surg")) title = `Medical Treatment: ${row.title || row.procedure_name || "Clinical Care"}`;
          else if (category.includes("prescr")) title = `Medication Prescribed: ${row.title || row.medication_name || "Rx Item"}`;

          compiledEvents.push({
            id: `med-${row.id || idx}`,
            stage: "medical",
            title,
            timestamp: String(row.date || row.created_at || row.administered_at || new Date().toISOString()),
            actor: String(row.doctor_name || row.veterinarian || row.performed_by || "Veterinary Suite"),
            status: String(row.status || "COMPLETED").toUpperCase(),
            badgeColor: getStageColor("medical"),
            iconType: "medical",
            details: {
              "Record Category": category.toUpperCase(),
              "Clinical Notes": row.notes || row.findings || row.description || "Medical evaluation completed.",
              "Veterinarian": row.doctor_name || row.veterinarian || "Staff Vet",
            },
          });
        });
      }

      // Medical Adoption Clearance Certificates
      if (medClearanceRes.status === "fulfilled" && medClearanceRes.value) {
        const clearances = Array.isArray(medClearanceRes.value) ? medClearanceRes.value : [];
        clearances.forEach((c: any, idx: number) => {
          compiledEvents.push({
            id: `clearance-${c.id || idx}`,
            stage: "medical",
            title: `Veterinary Adoption Clearance: ${c.clearance_type || "Adoption Fitness"}`,
            timestamp: String(c.authorized_at || c.created_at || new Date().toISOString()),
            actor: String(c.authorized_by_id || "Authorized Veterinarian"),
            status: String(c.status || "APPROVED").toUpperCase(),
            badgeColor: getStageColor("medical"),
            iconType: "medical",
            details: {
              "Clearance Type": c.clearance_type || "adoption_fitness",
              "Clearance Status": c.status || "approved",
              "Decision Notes": c.decision_notes || "Animal evaluated and cleared fit for adoption.",
              "Expires At": c.expires_at ? formatDateTime(c.expires_at) : "Indefinite",
            },
          });
        });
      }

      // 5. Adoption & Post-Adoption Events
      if (adoptionRes.status === "fulfilled" && adoptionRes.value) {
        const adoptionsList = Array.isArray(adoptionRes.value.data)
          ? adoptionRes.value.data
          : Array.isArray(adoptionRes.value)
          ? adoptionRes.value
          : [];

        const matchedAdoption = adoptionsList.find((a: any) => {
          const aDogId = String(a.dog_id || a.pet_id || "").toLowerCase();
          const dId = dogIdStr.toLowerCase();
          const dReg = String(dogData?.registration_number || "").toLowerCase();
          return aDogId === dId || (dReg && aDogId.includes(dReg));
        });

        if (matchedAdoption) {
          compiledEvents.push({
            id: `adoption-${matchedAdoption.id || dogIdStr}`,
            stage: "adoption",
            title: `Adoption Application (${matchedAdoption.applicant_name || matchedAdoption.adopter_name || "Applicant"})`,
            timestamp: String(matchedAdoption.created_at || matchedAdoption.submitted_at || new Date().toISOString()),
            actor: String(matchedAdoption.adoption_coordinator || "Adoption Desk"),
            status: String(matchedAdoption.status || "SUBMITTED").toUpperCase(),
            badgeColor: getStageColor("adoption"),
            iconType: "adoption",
            details: {
              "Adopter Name": matchedAdoption.applicant_name || matchedAdoption.adopter_name || "Applicant",
              "Adoption Status": matchedAdoption.status || "submitted",
              "Screening Score": matchedAdoption.score !== undefined ? `${matchedAdoption.score} / 100` : "Verified",
              "Adoption Fee": matchedAdoption.fee ? `$${matchedAdoption.fee}` : "Waived / Standard",
            },
          });

          if (matchedAdoption.status === "completed" || matchedAdoption.status === "approved") {
            compiledEvents.push({
              id: `adoption-handover-${matchedAdoption.id}`,
              stage: "post_adoption",
              title: "Final Adoption Handover & Agreement Signed",
              timestamp: String(matchedAdoption.updated_at || new Date().toISOString()),
              actor: "Adoption Coordinator",
              status: "COMPLETED",
              badgeColor: getStageColor("post_adoption"),
              iconType: "post_adoption",
              details: {
                "Agreement Status": "Signed & Executed",
                "New Pet Owner": matchedAdoption.applicant_name || matchedAdopter(matchedAdoption),
                "Handover Date": formatDateTime(matchedAdoption.updated_at || new Date().toISOString()),
              },
            });
          }
        }
      }

      setEvents(compiledEvents);
    } catch {
      setError("Failed to fetch full dog lifecycle timeline from backend.");
    } finally {
      setLoading(false);
    }
  }, [dogIdStr, dog]);

  useEffect(() => {
    if (isOpen) {
      void fetchLifecycleEvents();
    }
  }, [isOpen, fetchLifecycleEvents]);

  const matchedAdopter = (item: any) => item.applicant_name || item.adopter_name || "Adopter";

  // Filter events by stage
  const filteredEvents = events.filter((ev) => {
    if (stageFilter === "all") return true;
    return ev.stage === stageFilter;
  });

  // Sort events chronologically
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dog Master Unified Lifecycle Timeline"
      size="xl"
      footer={
        <button
          onClick={onClose}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: "#F1F5F9",
            color: "#334155",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Close Timeline
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Top Pet Identity Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
            borderRadius: "12px",
            padding: "16px",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "#334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #3B82F6",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {dog?.photo_url || dog?.avatar ? (
                <img
                  src={String(dog.photo_url || dog.avatar)}
                  alt="Dog"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <FaPaw size={24} color="#94A3B8" />
              )}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#FFFFFF" }}>
                {String(dog?.name || "Dog Record Master")}
              </h3>
              <div style={{ fontSize: "12px", color: "#94A3B8", marginTop: "2px" }}>
                ID: <strong style={{ color: "#F3F4F6" }}>{String(dog?.registration_number || dogIdStr)}</strong> &bull;{" "}
                Breed: <strong>{String(dog?.breed || "Mixed")}</strong> &bull; Status:{" "}
                <span
                  style={{
                    background: "#2563EB",
                    color: "#FFFFFF",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {String(dog?.status || "shelter")}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => void fetchLifecycleEvents()}
            disabled={loading}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #475569",
              background: "#334155",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaSync style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Refreshing..." : "Refresh Timeline"}
          </button>
        </div>

        {/* Filter Controls & Sort Order */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          {/* Stage Filter Buttons */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            {[
              { id: "all", label: "All Stages" },
              { id: "rescue", label: "Rescue" },
              { id: "intake", label: "Intake" },
              { id: "medical", label: "Medical" },
              { id: "tag", label: "Safety Tag" },
              { id: "kennel", label: "Kennel" },
              { id: "foster", label: "Foster" },
              { id: "adoption", label: "Adoption" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStageFilter(st.id)}
                style={{
                  padding: "5px 11px",
                  borderRadius: "6px",
                  border: stageFilter === st.id ? "1px solid #2563EB" : "1px solid #CBD5E1",
                  background: stageFilter === st.id ? "#EFF6FF" : "#FFFFFF",
                  color: stageFilter === st.id ? "#1D4ED8" : "#475569",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              background: "#F8FAFC",
              color: "#334155",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {sortOrder === "desc" ? <FaSortAmountDown /> : <FaSortAmountUp />}
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </button>
        </div>

        {/* Timeline Content List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div
              style={{
                display: "inline-block",
                width: "32px",
                height: "32px",
                border: "3px solid #BFDBFE",
                borderTopColor: "#2563EB",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B", fontWeight: 600 }}>
              Compiling unified lifecycle history across PawGuard database...
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: "14px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", fontSize: "13px" }}>
            <FaExclamationTriangle style={{ marginRight: "6px" }} /> {error}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", background: "#F8FAFC", borderRadius: "10px", border: "1px dashed #CBD5E1" }}>
            <FaClock size={28} color="#94A3B8" style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>No events found for this filter stage</div>
            <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
              Events are populated automatically as the dog progresses through Rescue, Medical, Kennel, Foster, and Adoption.
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Vertical Connecting Line */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                bottom: "12px",
                left: "11px",
                width: "2px",
                background: "#E2E8F0",
              }}
            />

            {sortedEvents.map((ev) => (
              <div key={ev.id} style={{ position: "relative" }}>
                {/* Node Icon Circle */}
                <div
                  style={{
                    position: "absolute",
                    left: "-24px",
                    top: "2px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: ev.badgeColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 3px #FFFFFF",
                    zIndex: 2,
                  }}
                >
                  {getStageIcon(ev.stage)}
                </div>

                {/* Event Details Card */}
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: ev.badgeColor,
                            color: "#FFFFFF",
                            textTransform: "uppercase",
                          }}
                        >
                          {ev.stage.replace("_", " ")}
                        </span>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                          {ev.title}
                        </h4>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <span>
                          <FaClock size={10} style={{ marginRight: "4px" }} />
                          {formatDateTime(ev.timestamp)}
                        </span>
                        {ev.actor && (
                          <span>
                            Actor: <strong>{ev.actor}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {ev.status && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "#F1F5F9",
                          color: "#334155",
                          border: "1px solid #CBD5E1",
                        }}
                      >
                        {ev.status}
                      </span>
                    )}
                  </div>

                  {/* Details Breakdown */}
                  {Object.keys(ev.details).length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px",
                        background: "#F8FAFC",
                        borderRadius: "6px",
                        border: "1px solid #F1F5F9",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                      }}
                    >
                      {Object.entries(ev.details).map(([k, v]) => (
                        <div key={k} style={{ fontSize: "12px" }}>
                          <span style={{ color: "#64748B", fontWeight: 600 }}>{k}: </span>
                          <span style={{ color: "#0F172A", fontWeight: 700 }}>{String(v ?? "-")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DogLifecycleTimelineModal;
