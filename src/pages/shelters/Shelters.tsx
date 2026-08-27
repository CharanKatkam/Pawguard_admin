import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable, { type Column } from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaHome,
  FaBed,
  FaPlus,
  FaEdit,
  FaTrash,
  FaExchangeAlt,
  FaSearch,
  FaLayerGroup,
  FaPaw,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
} from "react-icons/fa";
import shelterService from "../../services/shelterService";
import ShelterTransfers from "../../components/shelters/ShelterTransfers";
import ShelterDetailsModal from "../../components/shelters/ShelterDetailsModal";
import KennelDetailsModal from "../../components/shelters/KennelDetailsModal";
import KennelAssignmentModal from "../../components/shelters/KennelAssignmentModal";
import { notifyDataChanged } from "../../utils/dataSync";

const FACILITY_TYPES = ["shelter", "clinic", "foster_home", "partner"];
const FACILITY_STATUSES = ["active", "inactive", "maintenance"];
const SECTION_TYPES = ["quarantine", "isolation", "surgical", "puppy", "general", "adoption"];

const emptyRegisterForm = {
  name: "",
  address: "",
  phone: "",
  facility_type: "shelter",
  total_capacity: "",
};

const emptySectionForm = {
  facility_id: "",
  name: "",
  section_type: "general",
  capacity: "",
};

const emptyKennelForm = {
  section_id: "",
  identifier: "",
  capacity: "1",
};

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

export const Shelters = () => {
  const [activeTab, setActiveTab] = useState<"facilities" | "kennels" | "transfers">("facilities");
  const [shelters, setShelters] = useState<any[]>([]);
  const [allShelters, setAllShelters] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination for Facilities
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters for Kennels Tab
  const [kennelSearch, setKennelSearch] = useState("");
  const [kennelFacilityFilter, setKennelFacilityFilter] = useState("");
  const [kennelSanitationFilter, setKennelSanitationFilter] = useState("");
  const [kennelSectionTypeFilter, setKennelSectionTypeFilter] = useState("");
  const [kennelOccupancyFilter, setKennelOccupancyFilter] = useState("");

  // Kennels Data State
  const [allSections, setAllSections] = useState<any[]>([]);
  const [allKennels, setAllKennels] = useState<any[]>([]);
  const [kennelsLoading, setKennelsLoading] = useState(false);

  // Dashboard Aggregates State
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);

  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isKennelCreateModalOpen, setIsKennelCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Details View Modals
  const [viewShelterId, setViewShelterId] = useState<string | null>(null);
  const [isShelterDetailsOpen, setIsShelterDetailsOpen] = useState(false);
  const [selectedKennelForDetails, setSelectedKennelForDetails] = useState<any | null>(null);
  const [isKennelDetailsOpen, setIsKennelDetailsOpen] = useState(false);

  // Form states
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [registerForm, setRegisterForm] = useState({ ...emptyRegisterForm });
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    facility_type: "shelter",
    total_capacity: "",
    status: "active",
  });
  const [sectionForm, setSectionForm] = useState({ ...emptySectionForm });
  const [kennelForm, setKennelForm] = useState({ ...emptyKennelForm });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Debounce handler (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Facilities
  const fetchShelters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shelterService.getShelters({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        facility_type: typeFilter || undefined,
        page,
        page_size: pageSize,
      });

      const facilityList = unwrapList(response);
      const total = response?.meta?.total ?? response?.data?.meta?.total ?? facilityList.length;
      setTotalCount(total);
      setShelters(facilityList);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load shelter facilities from backend API."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch All Facilities for dropdowns & aggregates
  const fetchAllShelters = async () => {
    try {
      const response = await shelterService.getShelters({ page: 1, page_size: 20 });
      const facs = unwrapList(response);
      setAllShelters(facs);
    } catch {
      setAllShelters([]);
    }
  };

  // Fetch Dashboard aggregate stats
  const fetchDashboardStats = async () => {
    try {
      const stats = await shelterService.getShelterDashboard().catch(() => null);
      if (stats) {
        setDashboardStats(stats?.data || stats);
      }
    } catch {
      // quiet fallback
    }
  };

  // Fetch all Kennels across facilities for Kennels Tab
  const fetchAllKennelsWorkspace = async () => {
    setKennelsLoading(true);
    try {
      const facsRes = await shelterService.getShelters({ page: 1, page_size: 20 });
      const facList = unwrapList(facsRes);

      const fetchedSections: any[] = [];
      let fetchedKennels: any[] = [];

      for (const fac of facList) {
        try {
          const secRes = await shelterService.getFacilitySections(fac.id);
          const secList = unwrapList(secRes);

          for (const sec of secList) {
            fetchedSections.push({ ...sec, facility_name: fac.name });
            try {
              const kRes = await shelterService.getSectionKennels(sec.id);
              const kList = unwrapList(kRes).map((k: any) => ({
                ...k,
                facility_id: fac.id,
                facility_name: fac.name,
                section_name: sec.name,
                section_type: sec.section_type,
              }));
              fetchedKennels = [...fetchedKennels, ...kList];
            } catch {
              // ignore single section error
            }
          }
        } catch {
          // ignore single facility error
        }
      }

      setAllSections(fetchedSections);
      setAllKennels(fetchedKennels);
    } catch {
      // quiet catch
    } finally {
      setKennelsLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, [debouncedSearch, statusFilter, typeFilter, page, pageSize]);

  useEffect(() => {
    fetchAllShelters();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === "kennels") {
      fetchAllKennelsWorkspace();
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setIsRegisterModalOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (searchParams.get("action") === "allocate") {
      setIsAssignModalOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Handler for Registering Facility
  const handleRegisterFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.name) {
      addToast("Facility name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.createShelter({
        name: registerForm.name,
        address: registerForm.address,
        phone: registerForm.phone,
        facility_type: registerForm.facility_type as any,
        total_capacity: registerForm.total_capacity ? Number(registerForm.total_capacity) : undefined,
      });
      addToast(`Facility "${registerForm.name}" registered successfully!`, "success");
      setIsRegisterModalOpen(false);
      setRegisterForm({ ...emptyRegisterForm });
      fetchShelters();
      fetchAllShelters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to register facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Editing Facility
  const handleEditFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    const facilityId = selectedFacility?.id;
    if (!facilityId) {
      addToast("Could not determine facility to update.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.updateFacility(facilityId, {
        name: editForm.name,
        address: editForm.address,
        phone: editForm.phone,
        facility_type: editForm.facility_type as any,
        total_capacity: editForm.total_capacity ? Number(editForm.total_capacity) : undefined,
        status: editForm.status as any,
      });
      addToast(`Facility "${editForm.name}" updated successfully!`, "success");
      setIsEditModalOpen(false);
      fetchShelters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Deleting Facility
  const handleDeleteFacility = async () => {
    if (!selectedFacility?.id) return;
    try {
      setIsSubmitting(true);
      await shelterService.deleteFacility(selectedFacility.id);
      addToast(`Facility "${selectedFacility.name}" deleted.`, "success");
      setIsDeleteModalOpen(false);
      fetchShelters();
      fetchAllShelters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Creating Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.facility_id || !sectionForm.name) {
      addToast("Facility and Section Name are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.createFacilitySection(sectionForm.facility_id, {
        name: sectionForm.name,
        section_type: sectionForm.section_type as any,
        capacity: sectionForm.capacity ? Number(sectionForm.capacity) : undefined,
      });
      addToast(`Section "${sectionForm.name}" created successfully!`, "success");
      setIsSectionModalOpen(false);
      setSectionForm({ ...emptySectionForm });
      if (activeTab === "kennels") fetchAllKennelsWorkspace();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create section.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for Creating Kennel
  const handleCreateKennel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kennelForm.section_id || !kennelForm.identifier) {
      addToast("Section and Kennel Identifier are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.createSectionKennel(kennelForm.section_id, {
        identifier: kennelForm.identifier,
        capacity: kennelForm.capacity ? Number(kennelForm.capacity) : 1,
      });
      addToast(`Kennel Unit "${kennelForm.identifier}" created successfully!`, "success");
      setIsKennelCreateModalOpen(false);
      setKennelForm({ ...emptyKennelForm });
      if (activeTab === "kennels") fetchAllKennelsWorkspace();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create kennel unit.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregate Calculation for Dashboard Stat Cards
  const computedStats = useMemo(() => {
    const totalShelters = allShelters.length || totalCount;
    const activeShelters = allShelters.filter((s) => s.status === "active").length;
    const totalCapacity = allShelters.reduce((acc, s) => acc + (Number(s.total_capacity) || 0), 0);

    return {
      totalShelters,
      activeShelters,
      totalCapacity: dashboardStats?.total_capacity ?? totalCapacity,
      occupiedSpaces: dashboardStats?.occupied_spaces ?? 0,
      availableSpaces: dashboardStats?.available_spaces ?? Math.max(0, totalCapacity - (dashboardStats?.occupied_spaces ?? 0)),
      occupancyPct: dashboardStats?.occupancy_percentage ?? (totalCapacity > 0 ? Math.round(((dashboardStats?.occupied_spaces ?? 0) / totalCapacity) * 100) : 0),
      animalsHoused: dashboardStats?.animals_housed ?? 0,
      criticalCases: dashboardStats?.critical_cases ?? 0,
    };
  }, [allShelters, totalCount, dashboardStats]);

  // Filtered Kennels list for Kennels tab
  const filteredKennels = useMemo(() => {
    return allKennels.filter((k) => {
      const matchesSearch =
        !kennelSearch ||
        k.identifier.toLowerCase().includes(kennelSearch.toLowerCase()) ||
        k.section_name?.toLowerCase().includes(kennelSearch.toLowerCase()) ||
        k.facility_name?.toLowerCase().includes(kennelSearch.toLowerCase());
      const matchesFacility = !kennelFacilityFilter || k.facility_id === kennelFacilityFilter;
      const matchesSanitation = !kennelSanitationFilter || k.sanitation_state === kennelSanitationFilter;
      const matchesSectionType = !kennelSectionTypeFilter || k.section_type === kennelSectionTypeFilter;
      const matchesOccupancy =
        !kennelOccupancyFilter ||
        (kennelOccupancyFilter === "occupied" ? k.is_occupied : !k.is_occupied);

      return matchesSearch && matchesFacility && matchesSanitation && matchesSectionType && matchesOccupancy;
    });
  }, [allKennels, kennelSearch, kennelFacilityFilter, kennelSanitationFilter, kennelSectionTypeFilter, kennelOccupancyFilter]);

  const facilityColumns: Column<any>[] = [
    {
      key: "name",
      header: "Facility Name",
      render: (_v, row) => (
        <div>
          <strong style={{ fontSize: "14px", color: "#0F172A" }}>{row.name}</strong>
          <div style={{ fontSize: "11px", color: "#64748B" }}>
            ID: <code>{row.id}</code>
          </div>
        </div>
      ),
    },
    {
      key: "facility_type",
      header: "Type",
      render: (_v, row) => (
        <span style={{ textTransform: "capitalize", background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
          {row.facility_type || "shelter"}
        </span>
      ),
    },
    { key: "address", header: "Address / Location", render: (_v, row) => row.address || "Unspecified" },
    { key: "phone", header: "Phone", render: (_v, row) => row.phone || "—" },
    { key: "total_capacity", header: "Capacity", render: (_v, row) => <span style={{ fontWeight: 700 }}>{row.total_capacity ?? "Unspecified"}</span> },
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
            background: row.status === "active" ? "#DCFCE7" : "#FEE2E2",
            color: row.status === "active" ? "#166534" : "#991B1B",
          }}
        >
          {(row.status || "active").toUpperCase()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_v, row) => (
        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewShelterId(row.id);
              setIsShelterDetailsOpen(true);
            }}
            title="View Shelter Details"
            style={{
              padding: "6px 10px",
              background: "#2563EB",
              color: "#FFF",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaEye /> Details
          </button>
          <Can permission={["edit_shelters", "manage_shelters"]}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFacility(row);
                setEditForm({
                  name: row.name || "",
                  address: row.address || "",
                  phone: row.phone || "",
                  facility_type: row.facility_type || "shelter",
                  total_capacity: row.total_capacity !== undefined ? String(row.total_capacity) : "",
                  status: row.status || "active",
                });
                setIsEditModalOpen(true);
              }}
              title="Edit Facility"
              style={{
                padding: "6px 10px",
                background: "#F1F5F9",
                color: "#334155",
                border: "1px solid #CBD5E1",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <FaEdit /> Edit
            </button>
          </Can>
          <Can permission={["delete_shelters", "manage_shelters"]}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFacility(row);
                setIsDeleteModalOpen(true);
              }}
              title="Delete Facility"
              style={{
                padding: "6px 10px",
                background: "#FEE2E2",
                color: "#991B1B",
                border: "1px solid #FCA5A5",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <FaTrash /> Delete
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const kennelWorkspaceColumns: Column<any>[] = [
    {
      key: "identifier",
      header: "Kennel Identifier",
      render: (_v, row) => (
        <div>
          <strong style={{ fontSize: "14px", color: "#0F172A" }}>{row.identifier}</strong>
          <div style={{ fontSize: "11px", color: "#64748B" }}>ID: <code>{row.id?.slice(0, 8)}</code></div>
        </div>
      ),
    },
    { key: "facility_name", header: "Shelter Facility", render: (_v, row) => row.facility_name || "—" },
    { key: "section_name", header: "Section", render: (_v, row) => row.section_name || "General" },
    {
      key: "section_type",
      header: "Section Type",
      render: (_v, row) => (
        <span style={{ textTransform: "capitalize", background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
          {row.section_type || "general"}
        </span>
      ),
    },
    { key: "capacity", header: "Capacity", render: (_v, row) => row.capacity ?? 1 },
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
          <span style={{ color: "#DC2626", fontWeight: 700 }}>Occupied</span>
        ) : (
          <span style={{ color: "#16A34A", fontWeight: 700 }}>Available</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_v, row) => (
        <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedKennelForDetails(row);
              setIsKennelDetailsOpen(true);
            }}
            style={{
              padding: "6px 10px",
              background: "#2563EB",
              color: "#FFF",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Inspect Details
          </button>
          {!row.is_occupied && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAssignModalOpen(true);
              }}
              style={{
                padding: "6px 10px",
                background: "#EA580C",
                color: "#FFF",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Assign Animal
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="shelters-page">
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0F172A", margin: 0 }}>
            Shelter & Kennel Management Workspace
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", marginTop: "4px" }}>
            Operational shelter facilities, section layout, physical kennel unit allocation, and animal intake housing.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Can permission={["create_shelters", "edit_shelters", "manage_shelters"]}>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              style={{
                padding: "8px 16px",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaPlus /> Register Facility
            </button>
            <button
              onClick={() => {
                setSectionForm({ ...emptySectionForm, facility_id: allShelters[0]?.id || "" });
                setIsSectionModalOpen(true);
              }}
              style={{
                padding: "8px 16px",
                background: "#0D9488",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaLayerGroup /> Add Section
            </button>
            <button
              onClick={() => {
                setIsKennelCreateModalOpen(true);
              }}
              style={{
                padding: "8px 16px",
                background: "#7C3AED",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaBed /> Add Kennel Unit
            </button>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              style={{
                padding: "8px 16px",
                background: "#EA580C",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaPaw /> Assign Animal
            </button>
          </Can>
        </div>
      </div>

      {/* Real-world KPI Stat Cards with Filter Triggers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <StatCard
          title="Total Shelters"
          value={computedStats.totalShelters}
          icon={<FaHome size={20} color="#2563EB" />}
          onClick={() => {
            setActiveTab("facilities");
            setStatusFilter("");
          }}
        />
        <StatCard
          title="Active Facilities"
          value={computedStats.activeShelters}
          icon={<FaCheckCircle size={20} color="#16A34A" />}
          onClick={() => {
            setActiveTab("facilities");
            setStatusFilter("active");
          }}
        />
        <StatCard
          title="Total Capacity"
          value={computedStats.totalCapacity || "∞"}
          icon={<FaBed size={20} color="#0D9488" />}
          onClick={() => setActiveTab("facilities")}
        />
        <StatCard
          title="Occupied Spaces"
          value={computedStats.occupiedSpaces}
          icon={<FaPaw size={20} color="#EA580C" />}
          onClick={() => {
            setActiveTab("kennels");
            setKennelOccupancyFilter("occupied");
          }}
        />
        <StatCard
          title="Available Spaces"
          value={computedStats.availableSpaces}
          icon={<FaBed size={20} color="#16A34A" />}
          onClick={() => {
            setActiveTab("kennels");
            setKennelOccupancyFilter("available");
          }}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${computedStats.occupancyPct}%`}
          icon={<FaLayerGroup size={20} color={computedStats.occupancyPct > 85 ? "#DC2626" : "#2563EB"} />}
          onClick={() => setActiveTab("facilities")}
        />
        <StatCard
          title="Animals Housed"
          value={computedStats.animalsHoused}
          icon={<FaPaw size={20} color="#7C3AED" />}
          onClick={() => setActiveTab("facilities")}
        />
        <StatCard
          title="Critical / Medical"
          value={computedStats.criticalCases}
          icon={<FaExclamationTriangle size={20} color="#DC2626" />}
          onClick={() => {
            setActiveTab("kennels");
            setKennelSectionTypeFilter("quarantine");
          }}
        />
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "2px solid #E2E8F0", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("facilities")}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 700,
            border: "none",
            borderBottom: activeTab === "facilities" ? "3px solid #2563EB" : "3px solid transparent",
            background: "transparent",
            color: activeTab === "facilities" ? "#2563EB" : "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaHome /> Shelter Facilities ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab("kennels")}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 700,
            border: "none",
            borderBottom: activeTab === "kennels" ? "3px solid #2563EB" : "3px solid transparent",
            background: "transparent",
            color: activeTab === "kennels" ? "#2563EB" : "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaBed /> Physical Kennels & Sections ({allKennels.length})
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 700,
            border: "none",
            borderBottom: activeTab === "transfers" ? "3px solid #2563EB" : "3px solid transparent",
            background: "transparent",
            color: activeTab === "transfers" ? "#2563EB" : "#64748B",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaExchangeAlt /> Placements & Transfers
        </button>
      </div>

      {/* TAB 1: Facilities Directory */}
      {activeTab === "facilities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ padding: "14px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "6px", color: "#991B1B", fontSize: "13px" }}>
              {error}
            </div>
          )}

          {/* Facilities Table */}
          <DataTable
            columns={facilityColumns}
            data={shelters}
            loading={loading}
            emptyMessage="No shelter facilities found in the system."
            serverMode={true}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            searchMaxWidth="100%"
            onRowClick={(row) => {
              if (row?.id) {
                setViewShelterId(row.id);
                setIsShelterDetailsOpen(true);
              }
            }}
            leftHeaderControls={
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="">All Facility Types</option>
                  <option value="shelter">Shelter</option>
                  <option value="clinic">Clinic</option>
                  <option value="foster_home">Foster Home</option>
                  <option value="partner">Partner</option>
                </select>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </>
            }
          />
        </div>
      )}

      {/* TAB 2: Physical Kennels Workspace */}
      {activeTab === "kennels" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Kennels Table */}
          <DataTable
            columns={kennelWorkspaceColumns}
            data={filteredKennels}
            loading={kennelsLoading}
            emptyMessage="No kennel units found matching current search and filter criteria."
            searchValue={kennelSearch}
            onSearchChange={(s) => setKennelSearch(s)}
            onRowClick={(row) => {
              setSelectedKennelForDetails(row);
              setIsKennelDetailsOpen(true);
            }}
            leftHeaderControls={
              <>
                <select
                  value={kennelFacilityFilter}
                  onChange={(e) => setKennelFacilityFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="">All Facilities</option>
                  {allShelters.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>

                <select
                  value={kennelSanitationFilter}
                  onChange={(e) => setKennelSanitationFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="">All Sanitation States</option>
                  <option value="clean">Clean</option>
                  <option value="needs_cleaning">Needs Cleaning</option>
                  <option value="disinfecting">Disinfecting</option>
                  <option value="out_of_service">Out of Service</option>
                </select>

                <select
                  value={kennelSectionTypeFilter}
                  onChange={(e) => setKennelSectionTypeFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="">All Section Types</option>
                  {SECTION_TYPES.map((st) => (
                    <option key={st} value={st}>{st.toUpperCase()}</option>
                  ))}
                </select>

                <select
                  value={kennelOccupancyFilter}
                  onChange={(e) => setKennelOccupancyFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="">All Occupancy States</option>
                  <option value="available">Available Units</option>
                  <option value="occupied">Occupied Units</option>
                </select>
              </>
            }
          />
        </div>
      )}

      {/* TAB 3: Placements & Transfers */}
      {activeTab === "transfers" && <ShelterTransfers />}

      {/* MODAL 1: Register Shelter Facility */}
      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Register New Shelter Facility">
        <form onSubmit={handleRegisterFacility} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Facility Name *</label>
            <input
              type="text"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              placeholder="e.g. Central PawGuard Haven"
              required
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Facility Type</label>
            <select
              value={registerForm.facility_type}
              onChange={(e) => setRegisterForm({ ...registerForm, facility_type: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              {FACILITY_TYPES.map((t) => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Address / Location</label>
            <input
              type="text"
              value={registerForm.address}
              onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
              placeholder="Street address, city"
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Phone Contact</label>
              <input
                type="text"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                placeholder="+1-555-0199"
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Total Capacity</label>
              <input
                type="number"
                value={registerForm.total_capacity}
                onChange={(e) => setRegisterForm({ ...registerForm, total_capacity: e.target.value })}
                placeholder="e.g. 100"
                min={1}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: 600 }}
            >
              {isSubmitting ? "Registering..." : "Register Facility"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Edit Shelter Facility */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Facility — ${selectedFacility?.name}`}>
        <form onSubmit={handleEditFacility} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Facility Name *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Facility Type</label>
              <select
                value={editForm.facility_type}
                onChange={(e) => setEditForm({ ...editForm, facility_type: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Operational Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              >
                {FACILITY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Address</label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Total Capacity</label>
              <input
                type="number"
                value={editForm.total_capacity}
                onChange={(e) => setEditForm({ ...editForm, total_capacity: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 16px", background: "#2563EB", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: 600 }}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Delete Facility Confirmation */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete Facility">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", fontSize: "14px" }}>
            Are you sure you want to remove <strong>{selectedFacility?.name}</strong>? This action cannot be undone if physical sections or kennels exist under this facility.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteFacility}
              disabled={isSubmitting}
              style={{ padding: "8px 16px", background: "#DC2626", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: 600 }}
            >
              {isSubmitting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Create Section */}
      <Modal isOpen={isSectionModalOpen} onClose={() => setIsSectionModalOpen(false)} title="Add Section to Shelter Facility">
        <form onSubmit={handleCreateSection} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Target Facility *</label>
            <select
              value={sectionForm.facility_id}
              onChange={(e) => setSectionForm({ ...sectionForm, facility_id: e.target.value })}
              required
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <option value="">-- Choose Facility --</option>
              {allShelters.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Section Name *</label>
            <input
              type="text"
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              placeholder="e.g. North Quarantine Block A"
              required
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Section Type</label>
              <select
                value={sectionForm.section_type}
                onChange={(e) => setSectionForm({ ...sectionForm, section_type: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              >
                {SECTION_TYPES.map((st) => (
                  <option key={st} value={st}>{st.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Section Capacity</label>
              <input
                type="number"
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })}
                placeholder="e.g. 20"
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsSectionModalOpen(false)}
              style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 16px", background: "#0D9488", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: 600 }}
            >
              {isSubmitting ? "Creating..." : "Create Section"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Create Kennel Unit */}
      <Modal isOpen={isKennelCreateModalOpen} onClose={() => setIsKennelCreateModalOpen(false)} title="Add Physical Kennel Unit">
        <form onSubmit={handleCreateKennel} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Target Section *</label>
            <select
              value={kennelForm.section_id}
              onChange={(e) => setKennelForm({ ...kennelForm, section_id: e.target.value })}
              required
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <option value="">-- Choose Section --</option>
              {allSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.facility_name} — {s.name} ({s.section_type || "general"})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Kennel Identifier *</label>
              <input
                type="text"
                value={kennelForm.identifier}
                onChange={(e) => setKennelForm({ ...kennelForm, identifier: e.target.value })}
                placeholder="e.g. K-101"
                required
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Capacity</label>
              <input
                type="number"
                value={kennelForm.capacity}
                onChange={(e) => setKennelForm({ ...kennelForm, capacity: e.target.value })}
                min={1}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsKennelCreateModalOpen(false)}
              style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 16px", background: "#7C3AED", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: 600 }}
            >
              {isSubmitting ? "Adding..." : "Add Kennel Unit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details View Modals */}
      <ShelterDetailsModal
        facilityId={viewShelterId}
        isOpen={isShelterDetailsOpen}
        onClose={() => {
          setIsShelterDetailsOpen(false);
          setViewShelterId(null);
        }}
      />

      <KennelDetailsModal
        kennel={selectedKennelForDetails}
        isOpen={isKennelDetailsOpen}
        onClose={() => {
          setIsKennelDetailsOpen(false);
          setSelectedKennelForDetails(null);
        }}
        onRefresh={() => fetchAllKennelsWorkspace()}
        onOpenAssign={() => setIsAssignModalOpen(true)}
      />

      <KennelAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          fetchShelters();
          fetchAllKennelsWorkspace();
          notifyDataChanged();
        }}
      />
    </div>
  );
};

export default Shelters;
