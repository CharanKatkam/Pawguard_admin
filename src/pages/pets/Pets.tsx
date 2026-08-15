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
  FaEye,
  FaStethoscope,
  FaSearch,
  FaCheckCircle,
  FaSync,
} from "react-icons/fa";
import petService from "../../services/petService";
import rescueService from "../../services/rescueService";
import { notifyDataChanged } from "../../utils/dataSync";
import { generateQrDataUrl, generateQrBlob } from "../../utils/qrGenerator";

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
  raw_token?: string;
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

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [adoptableOnly, setAdoptableOnly] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(() => searchParams.get("action") === "register");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAdoptableModalOpen, setIsAdoptableModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState<any | null>(null);
  const [selectedViewDog, setSelectedViewDog] = useState<any | null>(null);

  // QR modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDog, setQrDog] = useState<QrDogInfo | null>(null);
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  // Safety Tag lifecycle state
  const [tagStatus, setTagStatus] = useState<string>("ACTIVE");
  const [tagMetadata, setTagMetadata] = useState<Record<string, unknown> | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isReProvisionConfirmOpen, setIsReProvisionConfirmOpen] = useState(false);
  const [isRefreshingScanData, setIsRefreshingScanData] = useState(false);

  // Manual Token Lookup modal state
  const [isTokenLookupModalOpen, setIsTokenLookupModalOpen] = useState(false);
  const [inputToken, setInputToken] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedDog, setVerifiedDog] = useState<any | null>(null);

  // Form states
  const [petForm, setPetForm] = useState({ ...emptyPetForm });
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    dogId: "",
    status: "shelter",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const dogId = (dog: any) => dog?.dog_id || dog?.id || dog?.original_dog_id || dog?.companion_pet?.original_dog_id || dog?.companion_pet_id || dog?.companion_pet?.id || "";

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
        status: statusFilter || undefined,
        is_adoptable: adoptableOnly ? true : undefined,
        page,
        page_size: 5,
      });
      let dogList = unwrapList(response).map(formatDog);
      if (statusFilter) {
        dogList = dogList.filter((d: any) => String(d.status).toLowerCase() === statusFilter.toLowerCase());
      }
      if (adoptableOnly) {
        dogList = dogList.filter((d: any) => d.is_adoptable);
      }
      const total = response?.meta?.total ?? response?.data?.meta?.total ?? dogList.length;
      setTotalCount(total);

      setDogs(dogList);
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
  }, [search, page, statusFilter, adoptableOnly]);

  useEffect(() => {
    const t = setTimeout(() => fetchAllDogs(), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchRescueCases();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "register") {
      setIsRegisterModalOpen(true);
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
    // Enforce business rule: A dog cannot become adoptable without veterinary clearance
    if (
      dog.vet_clearance === false ||
      dog.vet_clearance_status === "pending" ||
      dog.vet_clearance_status === "rejected" ||
      dog.medical_status === "quarantine"
    ) {
      addToast(
        `Cannot clear ${dog.name} for adoption: Veterinary clearance is required before listing a dog as adoptable.`,
        "error"
      );
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

  const openViewMasterFile = (dog: any) => {
    setSelectedViewDog(dog);
    setIsViewModalOpen(true);
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
    setTagMetadata(null);
    setRawToken(null);
    setTagStatus("INACTIVE");
    setIsQrModalOpen(true);

    try {
      setQrLoading(true);

      // Check session or local storage for raw_token / QR image generated during provisioning
      const savedToken = localStorage.getItem(`pawguard_safety_tag_token_${id}`) || sessionStorage.getItem(`pawguard_safety_tag_token_${id}`);
      const savedQrDataUrl = localStorage.getItem(`pawguard_safety_tag_qr_${id}`);

      if (savedToken || savedQrDataUrl) {
        if (savedToken) setRawToken(savedToken);
        const qrUrl = savedQrDataUrl || (savedToken ? await generateQrDataUrl(savedToken) : null);
        if (qrUrl) {
          setQrImageUrl(qrUrl);
          if (savedToken) {
            const blob = await generateQrBlob(savedToken);
            setQrBlob(blob);
          }
          setTagStatus("ACTIVE");
        }
      }

      // Fetch metadata from GET /api/v1/dogs/{dog_id}/safety-tag
      try {
        console.log("[SAFETY TAG FINAL DEBUG]", {
          dogId: dog?.id,
          dog_id: (dog as any)?.dog_id,
          original_dog_id: (dog as any)?.original_dog_id,
          registration_number: dog?.registration_number,
          resolvedId: id,
          resolvedIdLength: String(id).length
        });
        const metaRes = await petService.getSafetyTagMetadata(id);
        const metaData = metaRes?.data || metaRes;
        if (metaData) {
          setTagMetadata(metaData);
          if (metaData.status) {
            setTagStatus(String(metaData.status).toUpperCase());
          }
        }
      } catch (metaErr: unknown) {
        const e = metaErr as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } } };
        const status = e?.response?.status;
        const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.message;

        if (status === 404 || (apiMsg && apiMsg.toLowerCase().includes("not found"))) {
          setTagStatus("INACTIVE");
          setQrError(null);
        } else if (status === 403) {
          setQrError("Unauthorized: Your role does not have permission to access Safety Tags for shelter animals.");
        } else if (apiMsg) {
          setQrError(String(apiMsg));
        }
      }
    } catch (err: unknown) {
      let msg = "Failed to load Safety Tag metadata from backend service.";
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string }; status?: number } };
      const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.message;
      if (apiMsg) msg = String(apiMsg);
      if (e?.response?.status === 404 || (apiMsg && apiMsg.toLowerCase().includes("not found"))) {
        msg = "Dog Master record not found. A valid Dog Master record must exist on the backend before a Safety Tag can be provisioned.";
      } else if (e?.response?.status === 403) {
        msg = "Unauthorized: Your role does not have permission to access Safety Tags for shelter animals.";
      }
      setQrError(msg);
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    if (qrImageUrl && qrImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(qrImageUrl);
    }
    setQrImageUrl(null);
    setQrBlob(null);
    setQrDog(null);
    setQrError(null);
    setTagMetadata(null);
    setRawToken(null);
    setTagStatus("INACTIVE");
    setIsQrModalOpen(false);
  };

  const handleRefreshScanData = async () => {
    if (!qrDog) return;
    const id = dogId(qrDog);
    if (!id) return;
    setIsRefreshingScanData(true);
    try {
      const metaRes = await petService.getSafetyTagMetadata(id);
      const metaData = metaRes?.data || metaRes;
      if (metaData) {
        setTagMetadata(metaData);
        if (metaData.status) {
          setTagStatus(String(metaData.status).toUpperCase());
        }
      }
      addToast("Scan activity data refreshed from backend.", "success");
    } catch {
      addToast("Could not refresh scan activity data from backend.", "error");
    } finally {
      setIsRefreshingScanData(false);
    }
  };

  const handleCopyToken = () => {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken);
    addToast("Safety Tag token copied to clipboard!", "success");
  };

  const handleProvisionTag = async (forceReissue = false) => {
    if (!qrDog) return;
    const id = dogId(qrDog);
    if (!id) return;
    setIsProvisioning(true);
    setQrError(null);

    try {
      // POST /api/v1/dogs/{dog_id}/safety-tag (or ?force_reissue=true)
      const res = await petService.provisionSafetyTag(id, forceReissue);
      const data = res?.data || res || {};
      const token = data.raw_token || data.token || data.rawToken;

      if (!token) {
        throw new Error("Backend provisioning response did not include data.raw_token.");
      }

      // Store raw_token and rendered QR image in persistent storage
      setRawToken(token);
      sessionStorage.setItem(`pawguard_safety_tag_token_${id}`, token);
      localStorage.setItem(`pawguard_safety_tag_token_${id}`, token);

      // Generate client-side QR image directly encoding raw_token
      const qrDataUrl = await generateQrDataUrl(token);
      const blob = await generateQrBlob(token);

      localStorage.setItem(`pawguard_safety_tag_qr_${id}`, qrDataUrl);
      setQrImageUrl(qrDataUrl);
      setQrBlob(blob);
      setTagStatus("ACTIVE");
      setTagMetadata({
        token_prefix: data.token_prefix || String(token).slice(0, 8),
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        scans_count: 0,
      });

      setIsReProvisionConfirmOpen(false);
      addToast(res?.message || `Safety Tag Provisioned! QR generated directly from raw_token.`, "success");
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { error?: { message?: string }; message?: string } } };
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || "Failed to provision Safety Tag.";
      addToast(msg, "error");
      setQrError(msg);
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleDeactivateTag = async () => {
    if (!qrDog) return;
    const id = dogId(qrDog);
    if (!id) return;
    setIsDeactivating(true);
    try {
      const res = await petService.revokeSafetyTag(id);
      addToast(res?.message || `Safety Tag deactivated for pet ${qrDog.name || id}.`, "success");
      setTagStatus("INACTIVE");
      setRawToken(null);
      setQrImageUrl(null);
      setQrBlob(null);
      sessionStorage.removeItem(`pawguard_safety_tag_token_${id}`);
      localStorage.removeItem(`pawguard_safety_tag_token_${id}`);
      localStorage.removeItem(`pawguard_safety_tag_qr_${id}`);
      setIsDeactivateConfirmOpen(false);
      notifyDataChanged();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || "Failed to deactivate Safety Tag.";
      addToast(msg, "error");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl || !qrDog) return;
    const dogName = qrDog.name ? String(qrDog.name).replace(/[^a-zA-Z0-9-_]/g, "_") : "Pet";
    triggerDownload(qrImageUrl, `PawGuard_SafetyTag_${dogName}.png`);
  };

  const handleVerifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputToken.trim();
    if (!query) {
      setLookupError("Please enter a safety token or code to verify.");
      setVerifiedDog(null);
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setVerifiedDog(null);
    try {
      // Normalize query (supports "PG-DOG-2026-0001", "DOG-2026-0001", or UUID)
      const rawUpper = query.toUpperCase().trim();
      const strippedUpper = rawUpper.replace(/^PG-/, "").trim();

      // Check loaded dogs list first
      const matched = allDogs.find((d) => {
        const token = petService.formatSafetyToken(d).toUpperCase();
        const reg = String(d.registration_number || "").toUpperCase();
        const idStr = String(d.id || "").toUpperCase();
        const chip = String(d.microchip_id || "").toUpperCase();
        return (
          token === rawUpper ||
          token === `PG-${strippedUpper}` ||
          reg === strippedUpper ||
          reg === rawUpper ||
          idStr === strippedUpper ||
          idStr === rawUpper ||
          (chip && (chip === strippedUpper || chip === rawUpper))
        );
      });

      if (matched) {
        setVerifiedDog(matched);
        return;
      }

      // Try API lookup by ID / registration
      try {
        const response = await petService.getPetById(strippedUpper);
        const data = response?.data || response;
        if (data && (data.id || data.registration_number)) {
          const formatted = formatDog(data);
          setVerifiedDog(formatted);
          return;
        }
      } catch {
        // Fallback to public scan endpoint
        try {
          const scanResponse = await petService.getPublicDogScan(strippedUpper);
          const scanData = scanResponse?.data || scanResponse;
          if (scanData && (scanData.name || scanData.registration_number)) {
            const formatted = formatDog({
              ...scanData,
              id: strippedUpper,
              status: scanData.current_status || scanData.status || "shelter",
            });
            setVerifiedDog(formatted);
            return;
          }
        } catch {
          /* fail to lookupError */
        }
      }

      setLookupError("No dog found for this safety token. Please check the code and try again.");
    } catch {
      setLookupError("Failed to verify safety token. Please check connection and try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePrintQr = async () => {
    if ((!qrImageUrl && !qrBlob) || !qrDog) return;
    try {
      const dataUrl = qrImageUrl || (qrBlob ? await blobToDataUrl(qrBlob) : "");
      const name = String(qrDog.name || "Dog");
      const registration = String(qrDog.registration_number || qrDog.id || "-");
      const breed = String(qrDog.breed || "-");
      const status = String(qrDog.status || "-");
      const tokenDisplay = rawToken || (tagMetadata?.token_prefix ? `${String(tagMetadata.token_prefix)}...` : petService.formatSafetyToken(qrDog));
      const win = window.open("", "_blank", "width=440,height=680");
      if (!win) {
        addToast("Popup blocked. Allow popups to print the QR code.", "error");
        return;
      }
      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>PawGuard Safety Tag - ${escapeHtml(name)}</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; text-align: center; color: #0F172A; }
              .card { border: 2px solid #6D28D9; border-radius: 16px; padding: 24px; background: #FFFFFF; }
              h1 { font-size: 24px; margin: 0 0 4px; color: #6D28D9; letter-spacing: -0.02em; }
              .sub { font-size: 11px; color: #64748B; margin: 2px 0 16px; text-transform: uppercase; font-weight: bold; }
              .meta { color: #334155; font-size: 13px; margin: 4px 0; }
              .token-box { background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; font-family: monospace; font-size: 16px; font-weight: bold; color: #6D28D9; margin: 14px 0; display: inline-block; }
              img.qr { width: 240px; height: 240px; image-rendering: pixelated; margin: 14px auto; display: block; }
              .footer { margin-top: 20px; font-size: 11px; color: #94A3B8; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>PawGuard</h1>
              <div class="sub">Official Pet Safety Tag</div>
              <p class="meta"><strong>Dog Name:</strong> ${escapeHtml(name)} &bull; <strong>Breed:</strong> ${escapeHtml(breed)}</p>
              <p class="meta"><strong>Dog ID:</strong> ${escapeHtml(registration)} &bull; <strong>Status:</strong> ${escapeHtml(status)}</p>
              <img class="qr" src="${dataUrl}" alt="Safety Tag QR Code"
                   onload="setTimeout(function(){ window.print(); }, 250);" />
              <div class="token-box">TOKEN: ${escapeHtml(String(tokenDisplay))}</div>
              <p class="meta">Scan QR to view pet safety information</p>
              <div class="footer">PawGuard Rescue &amp; Shelter Network &bull; Authoritative Safety Tag</div>
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
      selected: !statusFilter && !adoptableOnly,
      onClick: () => {
        setStatusFilter("");
        setAdoptableOnly(false);
        setPage(1);
        document.getElementById("dogs-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Dogs in Shelter",
      value: loading ? "..." : inShelterCount,
      trend: "Currently Sheltered",
      color: "#EF4444",
      icon: <FaAmbulance />,
      selected: statusFilter === "shelter",
      onClick: () => {
        setStatusFilter("shelter");
        setAdoptableOnly(false);
        setPage(1);
        document.getElementById("dogs-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Adoptable Dogs",
      value: loading ? "..." : adoptableCount,
      trend: "Ready for Adoption",
      color: "#10B981",
      icon: <FaHeart />,
      selected: adoptableOnly,
      onClick: () => {
        setAdoptableOnly(true);
        setStatusFilter("");
        setPage(1);
        document.getElementById("dogs-table-card")?.scrollIntoView({ behavior: "smooth" });
      },
    },
  ];

  const columns = [
    { key: "registration_number", title: "Dog ID" },
    {
      key: "name",
      title: "Dog Name",
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: "#0F172A", wordBreak: "break-word", maxWidth: "240px", display: "inline-block" }}>
          {v || "-"}
        </span>
      ),
    },
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
      <Can permission="view_animals">
        <button
          onClick={() => openViewMasterFile(row)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #93C5FD",
            background: "#EFF6FF",
            color: "#1D4ED8",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <FaEye /> Master File
        </button>
      </Can>
      <Can permission="edit_animals">
        <button
          onClick={() => openQrModal(row)}
          disabled={!dogId(row)}
          title="Generate / view this dog's unique QR code tag"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: dogId(row) ? "1px solid #C4B5FD" : "1px solid #E2E8F0",
            background: dogId(row) ? "#FFFFFF" : "#F1F5F9",
            color: dogId(row) ? "#6D28D9" : "#94A3B8",
            fontSize: "12px",
            fontWeight: 600,
            cursor: dogId(row) ? "pointer" : "not-allowed",
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
          Dog & Rescue Case Directory
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

        <Can permission="view_animals">
          <QuickActionCard
            icon={<FaSearch />}
            title="Find Dog by Safety Token"
            subtitle="Verify token or QR tag"
            color="#6366F1"
            onClick={() => {
              setInputToken("");
              setLookupError(null);
              setVerifiedDog(null);
              setIsTokenLookupModalOpen(true);
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

      <div id="dogs-table-card" className="soft-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Registered Dogs
            </h3>
            {(statusFilter || adoptableOnly) && (
              <div style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600, marginTop: "2px" }}>
                Active Filter: {adoptableOnly ? "Adoptable Dogs Only" : `Status: ${statusFilter.toUpperCase()}`}{" "}
                <button
                  onClick={() => {
                    setStatusFilter("");
                    setAdoptableOnly(false);
                    setPage(1);
                  }}
                  style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: "12px", textDecoration: "underline", marginLeft: "6px" }}
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setAdoptableOnly(false);
                setPage(1);
              }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF", outline: "none" }}
            >
              <option value="">All Statuses</option>
              <option value="shelter">In Shelter</option>
              <option value="clinic">In Clinic</option>
              <option value="rescued">Rescued</option>
              <option value="fostered">Fostered</option>
              <option value="adopted">Adopted</option>
            </select>

            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#334155", cursor: "pointer", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={adoptableOnly}
                onChange={(e) => {
                  setAdoptableOnly(e.target.checked);
                  if (e.target.checked) setStatusFilter("");
                  setPage(1);
                }}
              />
              Adoptable Only
            </label>

            {loading && (
              <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>
                Loading dogs...
              </span>
            )}
          </div>
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
                  {c.ticket_number || c.id} — {c.animal_count ?? ""} {c.animal_count ? "dog(s)" : ""}{c.location_address ? ` @ ${c.location_address}` : ""}
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
        title="Update Rescue Dog Status"
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
        title="Mark Dog Ready for Adoption"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Select a dog to clear for adoption listing:
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
        title="Edit Dog Record"
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
        title="Confirm Dog Record Deletion"
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

      {/* Find Dog by Safety Token Modal */}
      <Modal
        isOpen={isTokenLookupModalOpen}
        onClose={() => {
          setIsTokenLookupModalOpen(false);
          setInputToken("");
          setLookupError(null);
          setVerifiedDog(null);
        }}
        title="Find Dog by Safety Token"
        maxWidth="500px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <form onSubmit={handleVerifyToken} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
              Enter Safety Token or Code
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                required
                placeholder="e.g. PG-DOG-2026-0001 or DOG-2026-0001"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                disabled={lookupLoading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#6366F1",
                  color: "#FFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {lookupLoading ? "Verifying..." : "Verify Token"}
              </button>
            </div>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Enter the unique safety token (e.g. PG-DOG-XXXX) printed on the dog's safety tag or encoded in the QR.
            </span>
          </form>

          {lookupError && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                padding: "14px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              ⚠️ {lookupError}
            </div>
          )}

          {verifiedDog && (
            <div
              style={{
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#047857", fontWeight: 700, fontSize: "13px" }}>
                  <FaCheckCircle color="#10B981" /> Token Verified &bull; Exact Match
                </div>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "#FFFFFF",
                    color: "#065F46",
                    textTransform: "capitalize",
                  }}
                >
                  Status: {verifiedDog.status || "Shelter"}
                </span>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #D1FAE5" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
                  {verifiedDog.name}
                </div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                  <strong>Dog ID:</strong> <span style={{ fontFamily: "monospace" }}>{verifiedDog.registration_number || verifiedDog.id}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "2px" }}>
                  <strong>Breed:</strong> {verifiedDog.breed || "-"} &nbsp;|&nbsp; <strong>Gender:</strong> {verifiedDog.gender ? verifiedDog.gender.charAt(0).toUpperCase() + verifiedDog.gender.slice(1) : "-"}
                </div>
                <div style={{ fontSize: "13px", color: "#6D28D9", fontWeight: 700, marginTop: "6px", fontFamily: "monospace" }}>
                  Token: {petService.formatSafetyToken(verifiedDog)}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const d = verifiedDog;
                    setIsTokenLookupModalOpen(false);
                    openViewMasterFile(d);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <FaEye /> View Dog Information
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* QR Code & Safety Tag Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={closeQrModal}
        title={qrDog?.name ? `Safety Tag & QR Code — ${qrDog.name}` : "Dog Safety Tag & QR Code"}
        maxWidth="520px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {qrDog && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: "#0F172A", fontSize: "16px" }}>
                  Dog Name: {qrDog.name || "-"}
                </span>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.03em",
                    background: tagStatus === "ACTIVE" ? "#DCFCE7" : "#FEE2E2",
                    color: tagStatus === "ACTIVE" ? "#166534" : "#991B1B",
                    border: tagStatus === "ACTIVE" ? "1px solid #86EFAC" : "1px solid #FCA5A5",
                    textTransform: "uppercase",
                  }}
                >
                  Tag Status: {tagStatus}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Dog ID:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{qrDog.registration_number || qrDog.id || "-"}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Breed:</strong> {qrDog.breed || "-"} &nbsp;|&nbsp;{" "}
                <strong>Gender:</strong> {qrDog.gender ? qrDog.gender.charAt(0).toUpperCase() + qrDog.gender.slice(1) : "-"}
              </div>

              {tagMetadata && typeof tagMetadata === "object" && (
                <div style={{ marginTop: "4px", paddingTop: "8px", borderTop: "1px dashed #CBD5E1", fontSize: "12px", color: "#64748B", display: "flex", justifyContent: "space-between" }}>
                  <span>Created: {String(tagMetadata.created_at || tagMetadata.created_date || "Active").slice(0, 10)}</span>
                  {Boolean(tagMetadata.token_prefix) && <span>Prefix: {String(tagMetadata.token_prefix)}</span>}
                </div>
              )}

              {rawToken && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "8px 12px", marginTop: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#1E40AF" }}>
                    <span style={{ fontWeight: 600 }}>Raw Token: </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{rawToken}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #93C5FD",
                      background: "#FFFFFF",
                      color: "#1D4ED8",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy Token
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCAN ACTIVITY WATCH SECTION */}
          {qrDog && (
            <div
              style={{
                width: "100%",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "12px 16px",
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                  Scan Activity
                </div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                  <strong>Total Scans:</strong> {String(tagMetadata?.scans_count ?? tagMetadata?.scan_count ?? 0)} &bull;{" "}
                  <strong>Last Scanned:</strong> {tagMetadata?.last_scanned_at ? String(tagMetadata.last_scanned_at).slice(0, 16).replace("T", " ") : "Never"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefreshScanData}
                disabled={isRefreshingScanData}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isRefreshingScanData ? "not-allowed" : "pointer",
                }}
              >
                <FaSync style={{ animation: isRefreshingScanData ? "spin 1s linear infinite" : "none" }} />
                {isRefreshingScanData ? "Refreshing..." : "Refresh Scan Data"}
              </button>
            </div>
          )}

          {qrLoading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div
                style={{
                  display: "inline-block",
                  width: "32px",
                  height: "32px",
                  border: "3px solid #F3E8FF",
                  borderTopColor: "#6D28D9",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
                Fetching unique Safety Tag metadata from backend...
              </div>
            </div>
          )}

          {!qrLoading && qrError && (
            <div style={{ textAlign: "center", padding: "16px" }}>
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "12px",
                }}
              >
                ⚠️ {qrError}
              </div>
              <button
                type="button"
                onClick={() => qrDog && openQrModal(qrDog)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Retry Request
              </button>
            </div>
          )}

          {!qrLoading && !qrError && !qrImageUrl && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #CBD5E1",
                color: "#334155",
                padding: "24px 20px",
                borderRadius: "12px",
                fontSize: "13px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              {tagStatus === "ACTIVE" ? (
                <>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#1E293B" }}>
                    ℹ️ QR CODE NOT AVAILABLE ON THIS BROWSER
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "420px", lineHeight: 1.5 }}>
                    Safety Tag is <strong>ACTIVE</strong> on backend, but the original QR token was issued previously and cannot be recovered after provisioning. To generate a new QR code for this pet, re-provision the Safety Tag below.
                  </div>
                  <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setIsReProvisionConfirmOpen(true)}
                      disabled={isProvisioning}
                      style={{
                        flex: 1,
                        padding: "11px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#6D28D9",
                        color: "#FFFFFF",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: isProvisioning ? "not-allowed" : "pointer",
                      }}
                    >
                      {isProvisioning ? "Provisioning..." : "Re-Provision Safety Tag"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDeactivateConfirmOpen(true)}
                      style={{
                        flex: 1,
                        padding: "11px 16px",
                        borderRadius: "8px",
                        border: "1px solid #FCA5A5",
                        background: "#FEF2F2",
                        color: "#991B1B",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Deactivate Tag
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: "#991B1B", fontWeight: 700, fontSize: "14px" }}>
                    This pet does not have an active Safety Tag yet.
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "400px", lineHeight: 1.5 }}>
                    Please provision a Safety Tag to generate an authoritative QR code and safety token for this pet.
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProvisionTag()}
                    disabled={isProvisioning}
                    style={{
                      padding: "11px 24px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#6D28D9",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: isProvisioning ? "not-allowed" : "pointer",
                    }}
                  >
                    {isProvisioning ? "Provisioning..." : "Provision Safety Tag"}
                  </button>
                </>
              )}
            </div>
          )}

          {!qrLoading && !qrError && qrImageUrl && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              {tagStatus === "INACTIVE" && (
                <div
                  style={{
                    width: "100%",
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    color: "#991B1B",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    textAlign: "center",
                    boxSizing: "border-box",
                  }}
                >
                  ⚠️ Safety Tag is INACTIVE. Scans will no longer resolve until re-provisioned.
                </div>
              )}

              {/* PROMINENT CENTERED QR CODE */}
              <div
                style={{
                  padding: "18px",
                  border: "2px solid #E2E8F0",
                  borderRadius: "16px",
                  background: "#FFFFFF",
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  opacity: tagStatus === "INACTIVE" ? 0.4 : 1,
                }}
              >
                <img
                  src={qrImageUrl}
                  alt={`Safety Tag QR Code for ${qrDog?.name || "Dog"}`}
                  style={{ width: "240px", height: "240px", imageRendering: "pixelated", display: "block" }}
                />
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                  Scan this QR code to view pet safety information.
                </div>
              </div>

              {/* ACTION BUTTONS */}
              {tagStatus === "ACTIVE" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "11px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#6D28D9",
                      color: "#FFF",
                      fontWeight: 700,
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
                      justifyContent: "center",
                      gap: "6px",
                      padding: "11px 14px",
                      borderRadius: "8px",
                      border: "1px solid #C4B5FD",
                      background: "#FFFFFF",
                      color: "#6D28D9",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    <FaPrint /> Print Safety Tag
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReProvisionConfirmOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "11px 14px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      background: "#FFFFFF",
                      color: "#334155",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Re-Provision Tag
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeactivateConfirmOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "11px 14px",
                      borderRadius: "8px",
                      border: "1px solid #FCA5A5",
                      background: "#FEF2F2",
                      color: "#991B1B",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Deactivate Tag
                  </button>
                </div>
              ) : (
                <div style={{ width: "100%" }}>
                  <button
                    type="button"
                    onClick={() => handleProvisionTag(true)}
                    disabled={isProvisioning}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#6D28D9",
                      color: "#FFF",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: isProvisioning ? "not-allowed" : "pointer",
                    }}
                  >
                    {isProvisioning ? "Re-Provisioning..." : "Re-Provision Safety Tag"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Re-Provision Confirmation Modal */}
      <Modal
        isOpen={isReProvisionConfirmOpen}
        onClose={() => setIsReProvisionConfirmOpen(false)}
        title="Re-Provision Safety Tag?"
        maxWidth="450px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 0" }}>
          <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            Re-provisioning this Safety Tag will generate a <strong>NEW raw token</strong> and invalidate the existing QR code tag for <strong>{qrDog?.name || "this pet"}</strong>.
            <br />
            <br />
            The current QR code will no longer resolve for public scans. Continue?
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setIsReProvisionConfirmOpen(false)}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleProvisionTag(true)}
              disabled={isProvisioning}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#6D28D9",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "13px",
                cursor: isProvisioning ? "not-allowed" : "pointer",
              }}
            >
              {isProvisioning ? "Re-Provisioning..." : "Confirm Re-Provision"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Safety Tag Confirmation Modal */}
      <Modal
        isOpen={isDeactivateConfirmOpen}
        onClose={() => setIsDeactivateConfirmOpen(false)}
        title="Deactivate Safety Tag?"
        maxWidth="440px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 0" }}>
          <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            Are you sure you want to deactivate the Safety Tag for <strong>{qrDog?.name || "this pet"}</strong>?
            <br />
            <br />
            Once deactivated, public QR scans will no longer resolve to this pet's profile until a new tag is provisioned.
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setIsDeactivateConfirmOpen(false)}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#475569",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeactivateTag}
              disabled={isDeactivating}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#DC2626",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "13px",
                cursor: isDeactivating ? "not-allowed" : "pointer",
              }}
            >
              {isDeactivating ? "Deactivating..." : "Confirm Deactivation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Dog Master File View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedViewDog(null);
        }}
        title={`Dog Master Profile — ${selectedViewDog?.name || "Record"}`}
        maxWidth="680px"
      >
        {selectedViewDog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                  {selectedViewDog.name || "Unnamed Dog"}
                </h2>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                  Registration ID: <strong style={{ fontFamily: "monospace" }}>{selectedViewDog.registration_number || selectedViewDog.id}</strong>
                </div>
              </div>
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: selectedViewDog.is_adoptable ? "#ECFDF5" : "#EFF6FF",
                  color: selectedViewDog.is_adoptable ? "#059669" : "#2563EB",
                }}
              >
                {selectedViewDog.is_adoptable ? "Ready for Adoption" : String(selectedViewDog.status || "Admitted").toUpperCase()}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Breed</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedViewDog.breed || "-"}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Gender</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px", textTransform: "capitalize" }}>{selectedViewDog.gender || "-"}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Estimated Age</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedViewDog.estimated_age || (selectedViewDog.age_months ? `${selectedViewDog.age_months} months` : "-")}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Weight</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedViewDog.weight ? `${selectedViewDog.weight} kg` : "-"}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Color / Markings</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedViewDog.color || selectedViewDog.distinguishing_marks || "-"}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Microchip ID</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px", fontFamily: "monospace" }}>{selectedViewDog.microchip_id || "Not Microchipped"}</div>
              </div>
            </div>

            {/* Safety Identification Box in Master File */}
            <div style={{ background: "#F3E8FF", border: "1px solid #DDD6FE", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#6D28D9" }}>
                  <FaQrcode color="#6D28D9" /> Safety Identification (Unified 1:1)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const dog = selectedViewDog;
                    setIsViewModalOpen(false);
                    openQrModal(dog);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#6D28D9",
                    color: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <FaQrcode /> Generate / View QR
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748B" }}>Unique Safety Token:</span>{" "}
                  <strong style={{ fontFamily: "monospace", color: "#6D28D9" }}>
                    {petService.formatSafetyToken(selectedViewDog)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>QR Tag Status:</span>{" "}
                  <strong style={{ color: "#059669" }}>Active &amp; Linked</strong>
                </div>
              </div>
            </div>

            <div style={{ background: "#F1F5F9", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                <FaStethoscope color="#2563EB" /> Veterinary &amp; Operational Clearance
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748B" }}>Vet Clearance Status:</span>{" "}
                  <strong style={{ color: selectedViewDog.vet_clearance === false ? "#DC2626" : "#059669" }}>
                    {selectedViewDog.vet_clearance_status || (selectedViewDog.vet_clearance === false ? "Pending Clearance" : "Cleared")}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Linked Rescue Ticket:</span>{" "}
                  <strong>{selectedViewDog.rescue_case_id ? `Case #${selectedViewDog.rescue_case_id.slice(0, 8)}` : "None Linked"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748B" }}>Current Facility / Shelter:</span>{" "}
                  <strong>{selectedViewDog.shelter_name || selectedViewDog.current_facility || "Central Shelter"}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  const dog = selectedViewDog;
                  setIsViewModalOpen(false);
                  openQrModal(dog);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#6D28D9",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <FaQrcode /> View QR Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedViewDog(null);
                }}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  background: "#FFFFFF",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Pets;
