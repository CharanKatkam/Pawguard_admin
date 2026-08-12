import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaHome, FaBed, FaHospital, FaPlus, FaEdit, FaTrash, FaExchangeAlt } from "react-icons/fa";
import shelterService from "../../services/shelterService";
import petService from "../../services/petService";
import ShelterTransfers from "../../components/shelters/ShelterTransfers";
import { notifyDataChanged } from "../../utils/dataSync";

const FACILITY_TYPES = ["shelter", "clinic", "foster_home", "partner"];
const FACILITY_STATUSES = ["active", "inactive", "maintenance"];

const emptyRegisterForm = {
  name: "",
  address: "",
  phone: "",
  facility_type: "shelter",
  total_capacity: "",
};

const unwrapList = (v: any) =>
  Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

const Shelters = () => {
  const [activeTab, setActiveTab] = useState<"facilities" | "transfers">("facilities");
  const [shelters, setShelters] = useState<any[]>([]);
  const [allShelters, setAllShelters] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCageModalOpen, setIsCageModalOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);

  // Form states
  const [registerForm, setRegisterForm] = useState({ ...emptyRegisterForm });
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    facility_type: "shelter",
    total_capacity: "",
    status: "active",
  });

  // Cage allocation cascade
  const [cageSections, setCageSections] = useState<any[]>([]);
  const [cageKennels, setCageKennels] = useState<any[]>([]);
  const [cageDogs, setCageDogs] = useState<any[]>([]);
  const [cageSel, setCageSel] = useState({ facilityId: "", sectionId: "", kennelId: "", dogId: "" });
  const [cageLoading, setCageLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatFacility = (f: any) => ({
    ...f,
    name: f.name || "",
    address: f.address || "",
    phone: f.phone || "",
    total_capacity: f.total_capacity ?? "",
    status: f.status || "inactive",
    facility_type: f.facility_type || "shelter",
  });

  const fetchShelters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await shelterService.getShelters({
        search: search.trim() || undefined,
        page,
        page_size: 5,
      });
      const facilityList = unwrapList(response);
      const total = response?.meta?.total ?? response?.data?.meta?.total ?? facilityList.length;
      setTotalCount(total);

      setShelters(facilityList.map(formatFacility));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load shelter facilities. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAllShelters = async () => {
    try {
      const response = await shelterService.getShelters({ page: 1, page_size: 100 });
      setAllShelters(unwrapList(response).map(formatFacility));
    } catch {
      setAllShelters([]);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(() => fetchAllShelters(), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

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
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to register facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (facility: any) => {
    setSelectedFacility(facility);
    setEditForm({
      name: facility.name || "",
      address: facility.address || "",
      phone: facility.phone || "",
      facility_type: FACILITY_TYPES.includes(facility.facility_type) ? facility.facility_type : "shelter",
      total_capacity: facility.total_capacity !== undefined && facility.total_capacity !== "" ? String(facility.total_capacity) : "",
      status: FACILITY_STATUSES.includes(facility.status) ? facility.status : "active",
    });
    setIsEditModalOpen(true);
  };

  const handleEditFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    const facilityId = selectedFacility?.id;
    if (!facilityId) {
      addToast("Could not determine the facility to update.", "error");
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
      setSelectedFacility(null);
      fetchShelters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFacility = async () => {
    const facilityId = selectedFacility?.id;
    if (!facilityId) {
      addToast("Could not determine the facility to delete.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.deleteFacility(facilityId);
      addToast(`Facility "${selectedFacility?.name}" deleted.`, "success");
      setIsDeleteModalOpen(false);
      setSelectedFacility(null);
      fetchShelters();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete facility.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCageModal = async () => {
    setCageSel({ facilityId: "", sectionId: "", kennelId: "", dogId: "" });
    setCageSections([]);
    setCageKennels([]);
    setIsCageModalOpen(true);
    setCageLoading(true);
    try {
      const dogsRes = await petService.getPets();
      const dogs = unwrapList(dogsRes);
      setCageDogs(
        dogs.map((d: any) => ({
          id: d.id || d.dog_id || "",
          label: `${d.name || "Dog"} (${d.registration_number || d.id})`,
        }))
      );
    } catch {
      setCageDogs([]);
    } finally {
      setCageLoading(false);
    }
  };

  const onFacilityChange = async (facilityId: string) => {
    setCageSel((s) => ({ ...s, facilityId, sectionId: "", kennelId: "" }));
    setCageKennels([]);
    if (!facilityId) {
      setCageSections([]);
      return;
    }
    try {
      const res = await shelterService.getFacilitySections(facilityId);
      setCageSections(
        unwrapList(res).map((sec: any) => ({ id: sec.id, label: `${sec.name} (${sec.section_type || "general"})` }))
      );
    } catch {
      setCageSections([]);
      addToast("Failed to load sections for this facility.", "error");
    }
  };

  const onSectionChange = async (sectionId: string) => {
    setCageSel((s) => ({ ...s, sectionId, kennelId: "" }));
    if (!sectionId) {
      setCageKennels([]);
      return;
    }
    try {
      const res = await shelterService.getSectionKennels(sectionId);
      setCageKennels(
        unwrapList(res).map((k: any) => ({ id: k.id, label: `${k.identifier || k.id}` }))
      );
    } catch {
      setCageKennels([]);
      addToast("Failed to load kennels for this section.", "error");
    }
  };

  const handleAssignCage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cageSel.kennelId || !cageSel.dogId) {
      addToast("Please select both a kennel and a dog to assign.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await shelterService.assignDogToKennel(cageSel.kennelId, cageSel.dogId);
      addToast("Dog assigned to kennel successfully!", "success");
      setIsCageModalOpen(false);
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Cage allocation failed.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCapacity = allShelters.reduce((acc, curr: any) => {
    const cap = parseInt(curr.total_capacity, 10);
    return acc + (isNaN(cap) ? 0 : cap);
  }, 0);
  const activeCount = allShelters.filter((s: any) => s.status === "active").length;

  const stats = [
    {
      title: "Rescue Facilities",
      value: loading ? "..." : totalCount,
      trend: "Registered Hubs",
      color: "#2563EB",
      icon: <FaHome />,
      onClick: () => {
        setActiveTab("facilities");
        document.getElementById("shelter-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Total Cage Capacity",
      value: loading ? "..." : totalCapacity,
      trend: "Across Facilities",
      color: "#10B981",
      icon: <FaBed />,
      onClick: () => {
        setActiveTab("transfers");
        document.getElementById("kennel-management-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Active Facilities",
      value: loading ? "..." : activeCount,
      trend: "Operational Hubs",
      color: "#6366F1",
      icon: <FaHospital />,
      onClick: () => {
        setActiveTab("facilities");
        document.getElementById("shelter-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
  ];

  const columns = [
    { key: "id", title: "Facility ID" },
    { key: "name", title: "Shelter / Centre Name" },
    { key: "address", title: "Address" },
    { key: "phone", title: "Phone" },
    { key: "total_capacity", title: "Cage Capacity" },
    { key: "status", title: "Operational Status" },
  ];

  const rowActions = (row: any) => (
    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
      <Can permission="edit_shelters">
        <button
          onClick={() => openEdit(row)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#2563EB",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FaEdit /> Edit
        </button>
      </Can>
      <Can permission="delete_shelters">
        <button
          onClick={() => {
            setSelectedFacility(row);
            setIsDeleteModalOpen(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #FCA5A5",
            background: "#FFFFFF",
            color: "#DC2626",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FaTrash /> Delete
        </button>
      </Can>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Rescue Centres & Shelter Facilities</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Facility governance: cage allocation, shelter capacity and regional rescue centre management.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_shelters">
          <QuickActionCard
            icon={<FaPlus />}
            title="Register New Facility"
            subtitle="Onboard rescue centre"
            color="#2563EB"
            onClick={() => setIsRegisterModalOpen(true)}
          />
        </Can>
        <Can permission="manage_shelters">
          <QuickActionCard
            icon={<FaBed />}
            title="Manage Cage Allocation"
            subtitle="Assign cages & kennels"
            color="#10B981"
            onClick={openCageModal}
          />
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("facilities")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: activeTab === "facilities" ? "#2563EB" : "#FFFFFF",
            color: activeTab === "facilities" ? "#FFFFFF" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <FaHospital /> Rescue Facilities
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            borderRadius: "8px",
            border: "1px solid #CBD5E1",
            background: activeTab === "transfers" ? "#2563EB" : "#FFFFFF",
            color: activeTab === "transfers" ? "#FFFFFF" : "#475569",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          <FaExchangeAlt /> Shelter Transfers &amp; Kennels
        </button>
      </div>

      {activeTab === "facilities" && (
        <div id="shelter-table-card" className="soft-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Active Rescue Facilities Directory
            </h3>
            {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading facilities...</span>}
          </div>
          <DataTable
            columns={columns}
            data={shelters}
            module="shelters"
            loading={loading}
            error={error}
            onRetry={fetchShelters}
            emptyMessage="No shelter facilities registered yet."
            renderRowActions={rowActions}
            serverMode
            totalCount={totalCount}
            page={page}
            onPageChange={setPage}
            searchValue={search}
            onSearchChange={(term) => {
              setSearch(term);
              setPage(1);
            }}
          />
        </div>
      )}

      {activeTab === "transfers" && (
        <div id="kennel-management-section">
          <ShelterTransfers />
        </div>
      )}

      {/* Register New Facility Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register New Rescue Facility"
      >
        <form onSubmit={handleRegisterFacility} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Facility Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. North Haven Rescue Centre"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Address</label>
            <input
              type="text"
              placeholder="e.g. Sector 4, North Campus"
              value={registerForm.address}
              onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Phone</label>
              <input
                type="text"
                placeholder="e.g. +91 98xxxxxx"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Facility Type</label>
              <select
                value={registerForm.facility_type}
                onChange={(e) => setRegisterForm({ ...registerForm, facility_type: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Total Cage Capacity</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 25"
              value={registerForm.total_capacity}
              onChange={(e) => setRegisterForm({ ...registerForm, total_capacity: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Registering..." : "Register Facility"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Facility Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedFacility(null);
        }}
        title="Edit Shelter Facility"
      >
        <form onSubmit={handleEditFacility} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Facility Name *</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Address</label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Facility Type</label>
              <select
                value={editForm.facility_type}
                onChange={(e) => setEditForm({ ...editForm, facility_type: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1).replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Total Cage Capacity</label>
              <input
                type="number"
                min="0"
                value={editForm.total_capacity}
                onChange={(e) => setEditForm({ ...editForm, total_capacity: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Operational Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {FACILITY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedFacility(null);
              }}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Facility Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedFacility(null);
        }}
        title="Confirm Facility Deletion"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove <strong>{selectedFacility?.name}</strong> from the facility directory? This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedFacility(null);
              }}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteFacility}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaTrash /> {isSubmitting ? "Deleting..." : "Delete Facility"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cage Allocation Modal */}
      <Modal
        isOpen={isCageModalOpen}
        onClose={() => setIsCageModalOpen(false)}
        title="Manage Cage & Kennel Allocation"
      >
        <form onSubmit={handleAssignCage} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Facility</label>
            <select
              value={cageSel.facilityId}
              onChange={(e) => onFacilityChange(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Select a facility...</option>
              {allShelters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Section</label>
            <select
              value={cageSel.sectionId}
              onChange={(e) => onSectionChange(e.target.value)}
              disabled={!cageSel.facilityId}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Select a section...</option>
              {cageSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Kennel</label>
            <select
              value={cageSel.kennelId}
              onChange={(e) => setCageSel({ ...cageSel, kennelId: e.target.value })}
              disabled={!cageSel.sectionId}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Select a kennel...</option>
              {cageKennels.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog to Assign *</label>
            <select
              required
              value={cageSel.dogId}
              onChange={(e) => setCageSel({ ...cageSel, dogId: e.target.value })}
              disabled={cageLoading}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">{cageLoading ? "Loading dogs..." : "Select a dog..."}</option>
              {cageDogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsCageModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || cageLoading}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Assigning..." : "Assign Cage"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shelters;
