import React, { useState, useEffect } from "react";
import Modal from "../common/Modal";
import DataTable, { type Column } from "../common/DataTable";
import shelterService from "../../services/shelterService";
import petService from "../../services/petService";
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaBed,
  FaPaw,
  FaUserMd,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEdit,
  FaLayerGroup,
} from "react-icons/fa";

interface ShelterDetailsModalProps {
  facilityId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEditFacility?: (facility: any) => void;
  onAddSection?: (facility: any) => void;
  onAddKennel?: (facility: any) => void;
  onAssignAnimal?: (facility: any) => void;
}

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export const ShelterDetailsModal: React.FC<ShelterDetailsModalProps> = ({
  facilityId,
  isOpen,
  onClose,
  onEditFacility,
  onAddSection,
  onAddKennel,
  onAssignAnimal,
}) => {
  const [activeTab, setActiveTab] = useState<"kennels" | "info" | "animals" | "medical">("kennels");
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<any | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [kennels, setKennels] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId || !isOpen) return;

    let isMounted = true;
    const fetchFacilityDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [facRes, secRes, dogsRes] = await Promise.all([
          shelterService.getShelterById(facilityId).catch(() => null),
          shelterService.getFacilitySections(facilityId).catch(() => ({ data: [] })),
          petService.getPets({ facility_id: facilityId, page_size: 50 }).catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        const facData = facRes?.data || facRes;
        setFacility(facData);

        const secList = unwrapList(secRes);
        setSections(secList);

        const dogList = unwrapList(dogsRes);
        setAnimals(dogList);

        let allKennels: any[] = [];
        for (const sec of secList) {
          if (sec.id) {
            try {
              const kRes = await shelterService.getSectionKennels(sec.id);
              const kList = unwrapList(kRes).map((k: any) => {
                const assignedDog = dogList.find(
                  (d: any) => d.kennel_id === k.id || d.id === k.occupied_by_dog_id
                );
                return {
                  ...k,
                  section_name: sec.name,
                  section_type: sec.section_type,
                  assigned_dog_name: assignedDog?.name || (k.occupied_by_dog_id ? `Dog #${k.occupied_by_dog_id.slice(0, 8)}` : null),
                };
              });
              allKennels = [...allKennels, ...kList];
            } catch {
              /* ignore single section error */
            }
          }
        }
        setKennels(allKennels);
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.response?.data?.detail ||
              err?.response?.data?.message ||
              "Failed to load complete shelter details from backend."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFacilityDetails();
    return () => {
      isMounted = false;
    };
  }, [facilityId, isOpen]);

  if (!isOpen) return null;

  const totalCap = Number(facility?.total_capacity || 0);
  const occupiedKennelsCount = kennels.filter((k) => k.is_occupied).length;
  const occupiedCount = Math.max(animals.length, occupiedKennelsCount);
  const availableCap = Math.max(0, totalCap - occupiedCount);
  const occupancyPct = totalCap > 0 ? Math.min(100, Math.round((occupiedCount / totalCap) * 100)) : 0;

  const medicalQuarantineAnimals = animals.filter(
    (a) => a.is_quarantine_passed === false || String(a.status).toLowerCase() === "clinic"
  );

  const sectionColumns: Column<any>[] = [
    { key: "name", header: "Section Name", render: (_v, row) => <strong>{row.name}</strong> },
    {
      key: "section_type",
      header: "Ward Type",
      render: (_v, row) => (
        <span style={{ textTransform: "capitalize", background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
          {row.section_type || "general"}
        </span>
      ),
    },
    { key: "capacity", header: "Total Capacity", render: (_v, row) => <span style={{ fontWeight: 600 }}>{row.capacity ?? "Unspecified"}</span> },
    {
      key: "configured_kennels",
      header: "Configured Kennels",
      render: (_v, row) => {
        const count = kennels.filter((k) => k.section_name === row.name || k.section_id === row.id).length;
        return <span>{count} unit(s)</span>;
      },
    },
  ];

  const kennelColumns: Column<any>[] = [
    { key: "identifier", header: "Kennel ID", render: (_v, row) => <strong>Unit {row.identifier}</strong> },
    { key: "section_name", header: "Section / Ward", render: (_v, row) => row.section_name || "General" },
    { key: "capacity", header: "Capacity", render: (_v, row) => row.capacity ?? 1 },
    {
      key: "sanitation_state",
      header: "Sanitation Status",
      render: (_v, row) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: 700,
            background:
              row.sanitation_state === "clean"
                ? "#DCFCE7"
                : row.sanitation_state === "needs_cleaning"
                ? "#FEF3C7"
                : "#FEE2E2",
            color:
              row.sanitation_state === "clean"
                ? "#166534"
                : row.sanitation_state === "needs_cleaning"
                ? "#92400E"
                : "#991B1B",
          }}
        >
          {(row.sanitation_state || "clean").toUpperCase()}
        </span>
      ),
    },
    {
      key: "is_occupied",
      header: "Occupancy & Assigned Dog",
      render: (_v, row) =>
        row.is_occupied ? (
          <span style={{ color: "#DC2626", fontWeight: 600 }}>
            Occupied {row.assigned_dog_name ? `(${row.assigned_dog_name})` : ""}
          </span>
        ) : (
          <span style={{ color: "#16A34A", fontWeight: 600 }}>Available</span>
        ),
    },
  ];

  const animalColumns: Column<any>[] = [
    { key: "registration_number", header: "Reg #", render: (_v, row) => <code>{row.registration_number || row.id?.slice(0, 8)}</code> },
    { key: "name", header: "Dog Name", render: (_v, row) => <strong>{row.name}</strong> },
    { key: "breed", header: "Breed", render: (_v, row) => row.breed || "-" },
    { key: "gender", header: "Gender", render: (_v, row) => <span style={{ textTransform: "capitalize" }}>{row.gender || "-"}</span> },
    {
      key: "is_quarantine_passed",
      header: "Quarantine Clear",
      render: (_v, row) =>
        row.is_quarantine_passed ? (
          <span style={{ color: "#16A34A", fontWeight: 600 }}><FaCheckCircle /> Cleared</span>
        ) : (
          <span style={{ color: "#DC2626", fontWeight: 600 }}><FaExclamationTriangle /> Quarantine</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (_v, row) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: 700,
            background: "#F1F5F9",
            color: "#334155",
          }}
        >
          {(row.status || "shelter").toUpperCase()}
        </span>
      ),
    },
  ];

  const medicalColumns: Column<any>[] = [
    { key: "name", header: "Dog Name", render: (_v, row) => <strong>{row.name}</strong> },
    { key: "breed", header: "Breed", render: (_v, row) => row.breed || "-" },
    {
      key: "is_quarantine_passed",
      header: "Quarantine State",
      render: (_v, row) =>
        row.is_quarantine_passed ? (
          <span style={{ color: "#16A34A", fontWeight: 600 }}>Quarantine Passed</span>
        ) : (
          <span style={{ color: "#DC2626", fontWeight: 700 }}>In Quarantine / Isolation</span>
        ),
    },
    { key: "is_adoptable", header: "Adoptable Status", render: (_v, row) => (row.is_adoptable ? "Yes (Cleared)" : "No (Medical Hold)") },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={facility?.name ? `Facility Details — ${facility.name}` : "Shelter Facility Details"} size="xl">
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          <div className="spinner" style={{ marginBottom: "12px" }}>Loading Facility Details...</div>
        </div>
      ) : error ? (
        <div style={{ padding: "24px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", color: "#991B1B" }}>
          <FaExclamationTriangle style={{ marginRight: "8px" }} />
          {error}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header Actions & Capacity Summary */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "13px", color: "#64748B" }}>
              Facility ID: <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>{facility?.id}</code> &bull; Type: <strong style={{ textTransform: "capitalize" }}>{facility?.facility_type || "shelter"}</strong>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {onEditFacility && (
                <button
                  onClick={() => onEditFacility(facility)}
                  style={{
                    padding: "6px 12px",
                    background: "#FFFFFF",
                    color: "#334155",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaEdit style={{ color: "#2563EB" }} /> Edit Facility
                </button>
              )}
              {onAddSection && (
                <button
                  onClick={() => onAddSection(facility)}
                  style={{
                    padding: "6px 12px",
                    background: "#FFFFFF",
                    color: "#334155",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaLayerGroup style={{ color: "#0D9488" }} /> Add Section
                </button>
              )}
              {onAddKennel && (
                <button
                  onClick={() => onAddKennel(facility)}
                  style={{
                    padding: "6px 12px",
                    background: "#FFFFFF",
                    color: "#334155",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaBed style={{ color: "#7C3AED" }} /> Add Kennel Unit
                </button>
              )}
              {onAssignAnimal && (
                <button
                  onClick={() => onAssignAnimal(facility)}
                  style={{
                    padding: "6px 12px",
                    background: "#FFFFFF",
                    color: "#334155",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaPaw style={{ color: "#EA580C" }} /> Assign Animal
                </button>
              )}
            </div>
          </div>

          {/* Header KPI Aggregates */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
              background: "#F8FAFC",
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Total Capacity</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A" }}>{totalCap || "Unspecified"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Occupied</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#2563EB" }}>{occupiedCount}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Available</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#16A34A" }}>{availableCap}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Occupancy %</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: occupancyPct > 90 ? "#DC2626" : "#0D9488" }}>
                {occupancyPct}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Quarantine / Clinic</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: medicalQuarantineAnimals.length > 0 ? "#DC2626" : "#64748B" }}>
                {medicalQuarantineAnimals.length}
              </div>
            </div>
          </div>

          {/* Occupancy Progress Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              <span>Facility Capacity Usage</span>
              <span>{occupiedCount} / {totalCap || "∞"} occupied ({occupancyPct}%)</span>
            </div>
            <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${occupancyPct}%`,
                  background: occupancyPct > 90 ? "#DC2626" : occupancyPct > 70 ? "#F59E0B" : "#2563EB",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Tabs Navigation Header */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px", overflowX: "auto" }}>
            {[
              { id: "kennels", label: "Sections & Kennels", icon: <FaBed /> },
              { id: "info", label: "Overview & Contact", icon: <FaBuilding /> },
              { id: "animals", label: "Current Animals", icon: <FaPaw /> },
              { id: "medical", label: "Medical & Quarantine", icon: <FaUserMd /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === tab.id ? "#2563EB" : "#F1F5F9",
                  color: activeTab === tab.id ? "#FFFFFF" : "#475569",
                  transition: "all 0.2s",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Sections & Kennels (Main Operational Area) */}
          {activeTab === "kennels" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "13px", color: "#64748B" }}>
                Physical housing hierarchy under <strong>{facility?.name}</strong>: <code>Shelter Facility &rarr; Section/Ward &rarr; Kennel &rarr; Dog</code>.
              </div>

              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: 0 }}>Facility Sections & Wards</h4>
              <DataTable
                columns={sectionColumns}
                data={sections}
                loading={loading}
                emptyMessage="No sections configured for this facility yet."
              />

              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "8px", margin: 0 }}>Registered Kennel Units</h4>
              <DataTable
                columns={kennelColumns}
                data={kennels}
                loading={loading}
                emptyMessage="No physical kennels registered in this facility."
              />
            </div>
          )}

          {/* Tab 2: Overview & Contact */}
          {activeTab === "info" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>
                  <FaBuilding style={{ marginRight: "6px", color: "#2563EB" }} /> Facility Overview
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  <div><strong>Facility Name:</strong> {facility?.name}</div>
                  <div><strong>Shelter ID:</strong> <code style={{ background: "#E2E8F0", padding: "2px 6px", borderRadius: "4px" }}>{facility?.id}</code></div>
                  <div><strong>Type:</strong> <span style={{ textTransform: "capitalize" }}>{facility?.facility_type || "Shelter"}</span></div>
                  <div>
                    <strong>Operational Status:</strong>{" "}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: facility?.status === "active" ? "#DCFCE7" : "#FEE2E2",
                        color: facility?.status === "active" ? "#166534" : "#991B1B",
                      }}
                    >
                      {(facility?.status || "active").toUpperCase()}
                    </span>
                  </div>
                  <div><strong>Operating Hours:</strong> 08:00 AM - 06:00 PM (Daily)</div>
                  <div><strong>Created Date:</strong> {facility?.created_at ? new Date(facility.created_at).toLocaleDateString() : "N/A"}</div>
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>
                  <FaMapMarkerAlt style={{ marginRight: "6px", color: "#EF4444" }} /> Contact & Location Details
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  <div><FaMapMarkerAlt style={{ color: "#94A3B8", marginRight: "4px" }} /> <strong>Address:</strong> {facility?.address || "Address not specified"}</div>
                  <div><FaPhoneAlt style={{ color: "#94A3B8", marginRight: "4px" }} /> <strong>Contact Phone:</strong> {facility?.phone || "Phone not provided"}</div>
                  <div><FaExclamationTriangle style={{ color: "#F59E0B", marginRight: "4px" }} /> <strong>Emergency Dispatch:</strong> {facility?.phone ? `${facility.phone} (Emergency Line)` : "N/A"}</div>
                  <div>
                    <strong>GPS Coordinates:</strong>{" "}
                    {facility?.latitude && facility?.longitude ? `${facility.latitude}, ${facility.longitude}` : "Coordinates unconfigured"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Current Animals */}
          {activeTab === "animals" && (
            <div>
              <DataTable
                columns={animalColumns}
                data={animals}
                loading={loading}
                emptyMessage="No animals currently housed in this facility."
              />
            </div>
          )}

          {/* Tab 4: Medical & Quarantine */}
          {activeTab === "medical" && (
            <div>
              <div style={{ marginBottom: "12px", fontSize: "13px", color: "#64748B" }}>
                Animals undergoing medical assessment, quarantine, or isolation housing in this shelter.
              </div>
              <DataTable
                columns={medicalColumns}
                data={medicalQuarantineAnimals}
                loading={loading}
                emptyMessage="No critical, medical, or quarantine cases in this facility."
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ShelterDetailsModal;
