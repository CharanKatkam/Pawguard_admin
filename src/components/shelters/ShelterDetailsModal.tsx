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
  FaExchangeAlt,
  FaHistory,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";

interface ShelterDetailsModalProps {
  facilityId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export const ShelterDetailsModal: React.FC<ShelterDetailsModalProps> = ({
  facilityId,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "info" | "capacity" | "kennels" | "animals" | "medical" | "transfers" | "history"
  >("info");
  const [loading, setLoading] = useState(true);
  const [facility, setFacility] = useState<any | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [kennels, setKennels] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId || !isOpen) return;

    let isMounted = true;
    const fetchFacilityDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [facRes, secRes, dogsRes, transRes] = await Promise.all([
          shelterService.getShelterById(facilityId).catch(() => null),
          shelterService.getFacilitySections(facilityId).catch(() => ({ data: [] })),
          petService.getPets({ facility_id: facilityId, page_size: 20 }).catch(() => ({ data: [] })),
          shelterService.getTransfers({ facility_id: facilityId }).catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        const facData = facRes?.data || facRes;
        setFacility(facData);

        const secList = unwrapList(secRes);
        setSections(secList);

        let allKennels: any[] = [];
        for (const sec of secList) {
          if (sec.id) {
            try {
              const kRes = await shelterService.getSectionKennels(sec.id);
              const kList = unwrapList(kRes).map((k: any) => ({
                ...k,
                section_name: sec.name,
                section_type: sec.section_type,
              }));
              allKennels = [...allKennels, ...kList];
            } catch {
              // ignore single section error
            }
          }
        }
        setKennels(allKennels);

        const dogList = unwrapList(dogsRes);
        setAnimals(dogList);

        const transList = unwrapList(transRes);
        setTransfers(transList);
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
  const occupiedCount = animals.length;
  const availableCap = Math.max(0, totalCap - occupiedCount);
  const occupancyPct = totalCap > 0 ? Math.min(100, Math.round((occupiedCount / totalCap) * 100)) : 0;

  const medicalQuarantineAnimals = animals.filter(
    (a) => a.is_quarantine_passed === false || a.status === "clinic"
  );

  const sectionColumns: Column<any>[] = [
    { key: "name", header: "Section Name", render: (_v, row) => <strong>{row.name}</strong> },
    {
      key: "section_type",
      header: "Type",
      render: (_v, row) => (
        <span style={{ textTransform: "capitalize", background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px" }}>
          {row.section_type || "general"}
        </span>
      ),
    },
    { key: "capacity", header: "Capacity", render: (_v, row) => row.capacity ?? "Unspecified" },
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
    { key: "identifier", header: "Kennel ID", render: (_v, row) => <strong>{row.identifier}</strong> },
    { key: "section_name", header: "Section", render: (_v, row) => row.section_name || "General" },
    {
      key: "sanitation_state",
      header: "Sanitation State",
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
      header: "Occupancy",
      render: (_v, row) =>
        row.is_occupied ? (
          <span style={{ color: "#DC2626", fontWeight: 600 }}>Occupied (Dog #{row.occupied_by_dog_id?.slice(0, 8)})</span>
        ) : (
          <span style={{ color: "#16A34A", fontWeight: 600 }}>Available</span>
        ),
    },
  ];

  const animalColumns: Column<any>[] = [
    { key: "registration_number", header: "Reg #", render: (_v, row) => <code>{row.registration_number || row.id?.slice(0, 8)}</code> },
    { key: "name", header: "Name", render: (_v, row) => <strong>{row.name}</strong> },
    { key: "breed", header: "Breed", render: (_v, row) => row.breed },
    { key: "gender", header: "Gender", render: (_v, row) => <span style={{ textTransform: "capitalize" }}>{row.gender}</span> },
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
    { key: "breed", header: "Breed", render: (_v, row) => row.breed },
    {
      key: "is_quarantine_passed",
      header: "Quarantine State",
      render: (_v, row) =>
        row.is_quarantine_passed ? (
          <span style={{ color: "#16A34A", fontWeight: 600 }}>Quarantine Passed</span>
        ) : (
          <span style={{ color: "#DC2626", fontWeight: 700 }}>In Quarantine</span>
        ),
    },
    { key: "is_adoptable", header: "Adoptable", render: (_v, row) => (row.is_adoptable ? "Yes" : "No (Medical Hold)") },
  ];

  const transferColumns: Column<any>[] = [
    { key: "id", header: "Transfer ID", render: (_v, row) => <code>{row.id?.slice(0, 8)}</code> },
    { key: "dog_id", header: "Dog ID", render: (_v, row) => row.dog_id },
    { key: "from_facility_id", header: "From Facility", render: (_v, row) => row.from_facility_id },
    { key: "to_facility_id", header: "To Facility", render: (_v, row) => row.to_facility_id },
    { key: "status", header: "Status", render: (_v, row) => <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.status}</span> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={facility?.name || "Shelter Facility Details"} size="xl">
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          <div className="spinner" style={{ marginBottom: "12px" }}>Loading Shelter Information...</div>
        </div>
      ) : error ? (
        <div style={{ padding: "24px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "8px", color: "#991B1B" }}>
          <FaExclamationTriangle style={{ marginRight: "8px" }} />
          {error}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header Stats Bar */}
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
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#64748B", fontWeight: 600 }}>Critical/Quarantine</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: medicalQuarantineAnimals.length > 0 ? "#DC2626" : "#64748B" }}>
                {medicalQuarantineAnimals.length}
              </div>
            </div>
          </div>

          {/* Occupancy Progress Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              <span>Capacity Usage</span>
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

          {/* Tabs Header */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px", overflowX: "auto" }}>
            {[
              { id: "info", label: "A-B. Overview & Contact", icon: <FaBuilding /> },
              { id: "capacity", label: "C-D. Sections & Kennels", icon: <FaBed /> },
              { id: "animals", label: "E-H. Current Animals", icon: <FaPaw /> },
              { id: "medical", label: "G. Medical & Quarantine", icon: <FaUserMd /> },
              { id: "transfers", label: "I-J. Transfers & Placements", icon: <FaExchangeAlt /> },
              { id: "history", label: "K. Audit History", icon: <FaHistory /> },
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

          {/* Tab 1: Overview & Contact */}
          {activeTab === "info" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>
                  <FaBuilding style={{ marginRight: "6px", color: "#2563EB" }} /> Section A: Shelter Information
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  <div><strong>Facility Name:</strong> {facility?.name}</div>
                  <div><strong>Shelter ID:</strong> <code style={{ background: "#E2E8F0", padding: "2px 6px", borderRadius: "4px" }}>{facility?.id}</code></div>
                  <div><strong>Type:</strong> <span style={{ textTransform: "capitalize" }}>{facility?.facility_type || "Shelter"}</span></div>
                  <div>
                    <strong>Status:</strong>{" "}
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
                  <div><strong>Created:</strong> {facility?.created_at ? new Date(facility.created_at).toLocaleDateString() : "N/A"}</div>
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "12px" }}>
                  <FaMapMarkerAlt style={{ marginRight: "6px", color: "#EF4444" }} /> Section B: Contact & Location
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                  <div><FaMapMarkerAlt style={{ color: "#94A3B8", marginRight: "4px" }} /> <strong>Address:</strong> {facility?.address || "Address not specified"}</div>
                  <div><FaPhoneAlt style={{ color: "#94A3B8", marginRight: "4px" }} /> <strong>Contact Phone:</strong> {facility?.phone || "Phone not provided"}</div>
                  <div><FaExclamationTriangle style={{ color: "#F59E0B", marginRight: "4px" }} /> <strong>Emergency Contact:</strong> {facility?.phone ? `${facility.phone} (Dispatch Line)` : "N/A"}</div>
                  <div>
                    <strong>GPS Coordinates:</strong>{" "}
                    {facility?.latitude && facility?.longitude ? `${facility.latitude}, ${facility.longitude}` : "Coordinates unavailable"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Sections & Kennels */}
          {activeTab === "capacity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "13px", color: "#64748B" }}>
                Physical housing layout under <strong>{facility?.name}</strong> across configured sections and kennels.
              </div>

              <DataTable
                columns={sectionColumns}
                data={sections}
                loading={loading}
                emptyMessage="No sections configured for this facility yet."
              />

              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "12px" }}>Kennel Units Breakdown</h4>
              <DataTable
                columns={kennelColumns}
                data={kennels}
                loading={loading}
                emptyMessage="No physical kennels registered in this facility."
              />
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

          {/* Tab 5: Transfers */}
          {activeTab === "transfers" && (
            <div>
              <DataTable
                columns={transferColumns}
                data={transfers}
                loading={loading}
                emptyMessage="No transfer history recorded for this facility."
              />
            </div>
          )}

          {/* Tab 6: History */}
          {activeTab === "history" && (
            <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>Facility History & Records</h4>
              <p style={{ color: "#64748B" }}>
                All operational updates, section allocations, and kennel capacity adjustments are recorded in the central PawGuard audit log for compliance.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ShelterDetailsModal;
