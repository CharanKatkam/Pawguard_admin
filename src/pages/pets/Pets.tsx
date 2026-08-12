import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaPaw,
  FaAmbulance,
  FaHeart,
  FaPlus,
  FaEdit,
  FaTrash,
  FaQrcode,
  FaDownload,
  FaPrint,
} from "react-icons/fa";
import petService from "../../services/petService";
import rescueService from "../../services/rescueService";
import { notifyDataChanged } from "../../utils/dataSync";

const DOG_STATUSES = ["rescued", "clinic", "shelter", "fostered", "adopted"];
const GENDERS = ["male", "female", "unknown"];
const IN_SHELTER_STATUSES = ["rescued", "clinic", "shelter"];

interface QrDogInfo {
  id?: string;
  name?: string;
  breed?: string;
  gender?: string;
  status?: string;
  estimated_age?: string;
  registration_number?: string;
  rescue_case_id?: string;
}

const emptyPetForm = {
  name: "",
  breed: "",
  gender: "unknown",
  estimated_age: "",
  age_months: "",
  weight: "",
  is_adoptable: false,
  status: "shelter",
  rescue_case_id: "",
};

const cleanPayload = (data: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const Pets = () => {
  const [dogs, setDogs] = useState<any[]>([]);
  const [allDogs, setAllDogs] = useState<any[]>([]);
  const [rescueCases, setRescueCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(() => searchParams.get("action") === "register");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAdoptableModalOpen, setIsAdoptableModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState<any | null>(null);

  // QR modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDog, setQrDog] = useState<QrDogInfo | null>(null);
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Form states
  const [petForm, setPetForm] = useState({ ...emptyPetForm });
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    dogId: "",
    status: "shelter",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const dogId = (dog: any) => dog?.id || dog?.dog_id || "";

  const formatDog = (dog: any) => ({
    ...dog,
    registration_number: dog.registration_number || dog.id || "-",
    name: dog.name || "-",
    breed: dog.breed || "-",
    gender: dog.gender || "",
    estimated_age: dog.estimated_age || dog.age || "-",
    age_months: dog.age_months ?? "",
    weight: dog.weight ?? "",
    is_adoptable: !!dog.is_adoptable,
    status: dog.status || "-",
  });

  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await petService.getPets({
        search: search.trim() || undefined,
        page,
        page_size: 5,
      });
      const dogList = unwrapList(response);
      const total = response?.meta?.total ?? response?.data?.meta?.total ?? dogList.length;
      setTotalCount(total);

      setDogs(dogList.map(formatDog));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load dogs list. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDogs = async () => {
    try {
      const response = await petService.getPets({ page: 1, page_size: 100 });
      setAllDogs(unwrapList(response).map(formatDog));
    } catch {
      setAllDogs([]);
    }
  };

  // Rescue cases that produced a rescued/admitted animal, available to link
  // to this dog's profile (backend DogProfile accepts nullable rescue_case_id).
  const fetchRescueCases = async () => {
    try {
      const cases: any[] = [];
      for (const status of ["rescued", "admitted"]) {
        const response = await rescueService.getRescueCases({ status });
        cases.push(...unwrapList(response));
      }
      setRescueCases(cases);
    } catch {
      setRescueCases([]);
    }
  };

  useEffect(() => {
    fetchDogs();
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(() => fetchAllDogs(), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchRescueCases();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "register") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const handleRegisterPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petForm.name) {
      addToast("Pet Name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await petService.createPet(
        cleanPayload({
          name: petForm.name,
          breed: petForm.breed,
          gender: petForm.gender,
          estimated_age: petForm.estimated_age,
          age_months: petForm.age_months ? Number(petForm.age_months) : undefined,
          weight: petForm.weight ? Number(petForm.weight) : undefined,
          is_adoptable: petForm.is_adoptable,
          rescue_case_id: petForm.rescue_case_id || undefined,
        })
      );
      addToast(`Rescued pet "${petForm.name}" registered successfully!`, "success");
      setIsRegisterModalOpen(false);
      setPetForm({ ...emptyPetForm });
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to register pet.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = statusUpdateForm.dogId;
    if (!id) {
      addToast("Please select a dog to update.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await petService.updatePetStatus(id, statusUpdateForm.status);
      addToast(`Status updated for pet ${id} to ${statusUpdateForm.status}`, "success");
      setIsStatusModalOpen(false);
      setStatusUpdateForm({ dogId: "", status: "shelter" });
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update status.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAdoptable = async (dog: any) => {
    const id = dogId(dog);
    if (!id) {
      addToast("Could not determine the dog record to update.", "error");
      return;
    }
    try {
      await petService.markDogAdoptable(id);
      addToast(`${dog.name} is now marked Ready for Adoption!`, "success");
      setIsAdoptableModalOpen(false);
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update status.";
      addToast(msg, "error");
    }
  };

  const openEdit = (dog: any) => {
    setSelectedDog(dog);
    setPetForm({
      name: dog.name && dog.name !== "-" ? dog.name : "",
      breed: dog.breed && dog.breed !== "-" ? dog.breed : "",
      gender: GENDERS.includes(dog.gender) ? dog.gender : "unknown",
      estimated_age: dog.estimated_age && dog.estimated_age !== "-" ? dog.estimated_age : "",
      age_months: dog.age_months !== undefined && dog.age_months !== "" ? String(dog.age_months) : "",
      weight: dog.weight !== undefined && dog.weight !== "" ? String(dog.weight) : "",
      is_adoptable: !!dog.is_adoptable,
      status: DOG_STATUSES.includes(dog.status) ? dog.status : "shelter",
      rescue_case_id: dog.rescue_case_id || "",
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (dog: any) => {
    setSelectedDog(dog);
    setIsDeleteModalOpen(true);
  };

  const openQrModal = async (dog: QrDogInfo) => {
    const id = dogId(dog);
    if (!id) {
      addToast("Could not determine the dog record to generate a QR for.", "error");
      return;
    }
    setQrDog(dog);
    setQrBlob(null);
    setQrImageUrl(null);
    setQrError(null);
    setIsQrModalOpen(true);
    try {
      setQrLoading(true);
      const blob = await petService.getDogQrImage(id);
      if (blob.size === 0) {
        setQrError("The QR service returned an empty image. No QR could be generated for this dog.");
        return;
      }
      setQrBlob(blob);
      setQrImageUrl(URL.createObjectURL(blob));
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Failed to generate QR. The backend QR service may be unavailable.";
      setQrError(msg);
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    if (qrImageUrl) URL.revokeObjectURL(qrImageUrl);
    setQrImageUrl(null);
    setQrBlob(null);
    setQrDog(null);
    setQrError(null);
    setIsQrModalOpen(false);
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl || !qrDog) return;
    const reg = qrDog.registration_number || qrDog.id || "dog";
    const safeReg = String(reg).replace(/[^a-zA-Z0-9-_]/g, "_");
    triggerDownload(qrImageUrl, `PawGuard_QR_${safeReg}.png`);
  };

  const handlePrintQr = async () => {
    if (!qrBlob || !qrDog) return;
    try {
      const dataUrl = await blobToDataUrl(qrBlob);
      const name = String(qrDog.name || "Dog");
      const registration = String(qrDog.registration_number || qrDog.id || "-");
      const breed = String(qrDog.breed || "-");
      const status = String(qrDog.status || "-");
      const win = window.open("", "_blank", "width=420,height=640");
      if (!win) {
        addToast("Popup blocked. Allow popups to print the QR code.", "error");
        return;
      }
      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>PawGuard QR - ${escapeHtml(name)}</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; text-align: center; color: #0F172A; }
              .card { border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; }
              h1 { font-size: 24px; margin: 0 0 4px; color: #0F172A; }
              .meta { color: #64748B; font-size: 13px; margin: 3px 0; }
              .sub { font-size: 11px; color: #94A3B8; margin: 2px 0; }
              img.qr { width: 260px; height: 260px; image-rendering: pixelated; margin: 20px auto; display: block; }
              .footer { margin-top: 24px; font-size: 11px; color: #94A3B8; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>PawGuard</h1>
              <p class="sub">Rescued Dog Profile</p>
              <p class="meta">${escapeHtml(name)} &bull; ${escapeHtml(breed)}</p>
              <p class="meta">ID: ${escapeHtml(registration)} &bull; Status: ${escapeHtml(status)}</p>
              <img class="qr" src="${dataUrl}" alt="QR Code"
                   onload="setTimeout(function(){ window.print(); }, 250);" />
              <p class="meta">Scan to view this rescued dog's live profile</p>
              <div class="footer">Generated via PawGuard Admin &bull; Dog Management</div>
            </div>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
    } catch {
      addToast("Failed to prepare the QR code for printing.", "error");
    }
  };

  const handleEditDogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = dogId(selectedDog);
    if (!id) {
      addToast("Could not determine the dog record to update.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await petService.updatePet(
        id,
        cleanPayload({
          name: petForm.name,
          breed: petForm.breed,
          gender: petForm.gender,
          estimated_age: petForm.estimated_age,
          age_months: petForm.age_months ? Number(petForm.age_months) : undefined,
          weight: petForm.weight ? Number(petForm.weight) : undefined,
          is_adoptable: petForm.is_adoptable,
          status: DOG_STATUSES.includes(petForm.status) ? petForm.status : undefined,
        })
      );
      addToast(`Updated record for ${petForm.name}!`, "success");
      setIsEditModalOpen(false);
      setSelectedDog(null);
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update record.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDog = async () => {
    const id = dogId(selectedDog);
    if (!id) {
      addToast("Could not determine the dog record to delete.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await petService.deletePet(id);
      addToast(`Deleted pet ${selectedDog?.name}`, "success");
      setIsDeleteModalOpen(false);
      setSelectedDog(null);
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete pet.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inShelterCount = allDogs.filter((dog) =>
    IN_SHELTER_STATUSES.includes(String(dog.status).toLowerCase())
  ).length;
  const adoptableCount = allDogs.filter((dog) => dog.is_adoptable).length;

  const stats = [
    {
      title: "Total Registered Dogs",
      value: loading ? "..." : totalCount,
      trend: "Registered Dogs",
      color: "#2563EB",
      icon: <FaPaw />,
    },
    {
      title: "Dogs in Shelter",
      value: loading ? "..." : inShelterCount,
      trend: "Currently Sheltered",
      color: "#EF4444",
      icon: <FaAmbulance />,
    },
    {
      title: "Adoptable Dogs",
      value: loading ? "..." : adoptableCount,
      trend: "Ready for Adoption",
      color: "#10B981",
      icon: <FaHeart />,
    },
  ];

  const columns = [
    { key: "registration_number", title: "Dog ID" },
    { key: "name", title: "Dog Name" },
    { key: "breed", title: "Breed" },
    {
      key: "gender",
      title: "Gender",
      render: (v: string) =>
        v ? v.charAt(0).toUpperCase() + v.slice(1) : "-",
    },
    { key: "estimated_age", title: "Age" },
    { key: "status", title: "Status" },
  ];

  const rowActions = (row: any) => (
    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
      <Can permission="edit_animals">
        <button
          onClick={() => openQrModal(row)}
          disabled={!row.rescue_case_id}
          title={
            row.rescue_case_id
              ? "Generate / view this rescued dog's QR code"
              : "QR is available only for rescued dogs. Link a rescue case to this dog first."
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: row.rescue_case_id ? "1px solid #C4B5FD" : "1px solid #E2E8F0",
            background: row.rescue_case_id ? "#FFFFFF" : "#F1F5F9",
            color: row.rescue_case_id ? "#6D28D9" : "#94A3B8",
            fontSize: "12px",
            fontWeight: 600,
            cursor: row.rescue_case_id ? "pointer" : "not-allowed",
          }}
        >
          <FaQrcode /> Generate QR
        </button>
      </Can>
      <Can permission="edit_animals">
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
      <Can permission="delete_animals">
        <button
          onClick={() => openDelete(row)}
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
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>
          Animal & Rescue Case Directory
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Comprehensive dog tracking, intake records, shelter management and adoption monitoring.
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <Can permission="create_animals">
          <QuickActionCard
            icon={<FaPlus />}
            title="Register New Dog"
            subtitle="Register rescued dog"
            color="#2563EB"
            onClick={() => {
              setPetForm({ ...emptyPetForm });
              setIsRegisterModalOpen(true);
            }}
          />
        </Can>

        <Can permission="edit_animals">
          <QuickActionCard
            icon={<FaAmbulance />}
            title="Update Status"
            subtitle="Update dog status"
            color="#EF4444"
            onClick={() => setIsStatusModalOpen(true)}
          />
        </Can>

        <Can permission="edit_animals">
          <QuickActionCard
            icon={<FaHeart />}
            title="Ready For Adoption"
            subtitle="Mark adoptable"
            color="#10B981"
            onClick={() => setIsAdoptableModalOpen(true)}
          />
        </Can>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Registered Dogs
          </h3>
          {loading && (
            <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>
              Loading dogs...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={dogs}
          module="animals"
          loading={loading}
          error={error}
          onRetry={fetchDogs}
          emptyMessage="No dogs registered yet. Register a rescued dog to get started."
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

      {/* Register New Dog Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Rescued Pet"
      >
        <form onSubmit={handleRegisterPet} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog Name / Code Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Max"
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Breed</label>
              <input
                type="text"
                placeholder="e.g. Indie Mix"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Gender</label>
              <select
                value={petForm.gender}
                onChange={(e) => setPetForm({ ...petForm, gender: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Estimated Age</label>
              <input
                type="text"
                placeholder="e.g. 2 years"
                value={petForm.estimated_age}
                onChange={(e) => setPetForm({ ...petForm, estimated_age: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Age (months)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 24"
                value={petForm.age_months}
                onChange={(e) => setPetForm({ ...petForm, age_months: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 16.4"
                value={petForm.weight}
                onChange={(e) => setPetForm({ ...petForm, weight: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                <input
                  type="checkbox"
                  checked={petForm.is_adoptable}
                  onChange={(e) => setPetForm({ ...petForm, is_adoptable: e.target.checked })}
                />
                Ready for adoption
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Linked Rescue Case</label>
            <select
              value={petForm.rescue_case_id}
              onChange={(e) => setPetForm({ ...petForm, rescue_case_id: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">No linked rescue case</option>
              {rescueCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ticket_number || c.id} — {c.animal_count ?? ""} {c.animal_count ? "animal(s)" : ""}{c.location_address ? ` @ ${c.location_address}` : ""}
                </option>
              ))}
            </select>
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
              {isSubmitting ? "Registering..." : "Register Dog"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Rescue Animal Status"
      >
        <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Dog</label>
            <select
              value={statusUpdateForm.dogId}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, dogId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Choose a dog...</option>
              {allDogs.map((d) => (
                <option key={d.registration_number} value={dogId(d) || d.registration_number}>
                  {d.name} ({d.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>New Operational Status</label>
            <select
              value={statusUpdateForm.status}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              {DOG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark Adoptable Modal */}
      <Modal
        isOpen={isAdoptableModalOpen}
        onClose={() => setIsAdoptableModalOpen(false)}
        title="Mark Animal Ready for Adoption"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Select an animal to clear for adoption listing:
          </p>
          <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {allDogs.map((d) => (
              <div
                key={d.registration_number}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#F8FAFC",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{d.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>ID: {d.registration_number} | {d.breed}</div>
                </div>
                <button
                  disabled={d.is_adoptable}
                  onClick={() => handleMarkAdoptable(d)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: d.is_adoptable ? "#CBD5E1" : "#10B981",
                    color: "#FFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: d.is_adoptable ? "not-allowed" : "pointer",
                  }}
                >
                  {d.is_adoptable ? "Adoptable" : "Clear for Adoption"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Edit Dog Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedDog(null);
        }}
        title="Edit Animal Record"
      >
        <form onSubmit={handleEditDogSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Name</label>
            <input
              type="text"
              required
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Breed</label>
              <input
                type="text"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Gender</label>
              <select
                value={petForm.gender}
                onChange={(e) => setPetForm({ ...petForm, gender: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Estimated Age</label>
              <input
                type="text"
                value={petForm.estimated_age}
                onChange={(e) => setPetForm({ ...petForm, estimated_age: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Age (months)</label>
              <input
                type="number"
                min="0"
                value={petForm.age_months}
                onChange={(e) => setPetForm({ ...petForm, age_months: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Status</label>
            <select
              value={petForm.status}
              onChange={(e) => setPetForm({ ...petForm, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              {DOG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: "#334155" }}>
            <input
              type="checkbox"
              checked={petForm.is_adoptable}
              onChange={(e) => setPetForm({ ...petForm, is_adoptable: e.target.checked })}
            />
            Ready for adoption
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedDog(null);
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

      {/* Delete Dog Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedDog(null);
        }}
        title="Confirm Animal Record Deletion"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove record for <strong>{selectedDog?.name}</strong> ({selectedDog?.registration_number})?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedDog(null);
              }}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteDog}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaTrash /> {isSubmitting ? "Deleting..." : "Delete Record"}
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Code Modal (rescued dogs only) */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={closeQrModal}
        title={qrDog?.name ? `QR Code - ${qrDog.name}` : "Dog QR Code"}
        maxWidth="480px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {qrDog && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "6px",
              }}
            >
              <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "15px" }}>
                {qrDog.name || "-"}
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Dog ID:</strong> {qrDog.registration_number || qrDog.id || "-"}
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Breed:</strong> {qrDog.breed || "-"} &nbsp;|&nbsp;{" "}
                <strong>Gender:</strong> {qrDog.gender ? qrDog.gender.charAt(0).toUpperCase() + qrDog.gender.slice(1) : "-"}
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Age:</strong> {qrDog.estimated_age || "-"} &nbsp;|&nbsp;{" "}
                <strong>Status:</strong> {String(qrDog.status || "-").charAt(0).toUpperCase() + String(qrDog.status || "-").slice(1)}
              </div>
              <div style={{ fontSize: "12px", color: "#6D28D9", fontWeight: 600 }}>
                Rescue-linked dog &bull; QR via rescue case
              </div>
            </div>
          )}

          {qrLoading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  display: "inline-block",
                  width: "28px",
                  height: "28px",
                  border: "3px solid #F3E8FF",
                  borderTopColor: "#6D28D9",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
                Generating QR code...
              </div>
            </div>
          )}

          {!qrLoading && qrError && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                padding: "16px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {qrError}
            </div>
          )}

          {!qrLoading && !qrError && !qrImageUrl && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px dashed #CBD5E1",
                color: "#64748B",
                padding: "40px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              No QR code available for this dog yet.
            </div>
          )}

          {!qrLoading && !qrError && qrImageUrl && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "12px",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  background: "#FFFFFF",
                }}
              >
                <img
                  src={qrImageUrl}
                  alt={`QR code for ${qrDog?.name || "dog"}`}
                  style={{ width: "220px", height: "220px", imageRendering: "pixelated" }}
                />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#64748B" }}>
                Scan to view this rescued dog's live profile
              </p>
            </div>
          )}

          {!qrLoading && !qrError && qrImageUrl && (
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={handleDownloadQr}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#6D28D9",
                  color: "#FFF",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <FaDownload /> Download QR
              </button>
              <button
                type="button"
                onClick={handlePrintQr}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #C4B5FD",
                  background: "#FFFFFF",
                  color: "#6D28D9",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <FaPrint /> Print QR
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Pets;
