import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaHome,
  FaBed,
  FaPaw,
  FaEye,
  FaEdit,
  FaQrcode,
  FaDownload,
  FaPrint,
  FaSync,
  FaSearch,
  FaPlus,
  FaCheckCircle,
  FaUserMd,
} from "react-icons/fa";
import petService from "../../services/petService";
import shelterService from "../../services/shelterService";
import vetService from "../../services/vetService";
import medicalService from "../../services/medicalService";
import userService from "../../services/userService";
import storageService from "../../services/storageService";
import { getCurrentUserRole } from "../../utils/roleUtils";
import { useDataSync, notifyDataChanged } from "../../utils/dataSync";
import { publishActionEvent } from "../../utils/eventSystem";
import { generateQrDataUrl, generateQrBlob } from "../../utils/qrGenerator";
import { getDogPhotoUrl } from "../pets/Pets";

const IN_SHELTER_STATUSES = ["rescued", "clinic", "shelter"];
const DOG_STATUSES = ["rescued", "clinic", "shelter", "fostered", "adopted"];
const GENDERS = ["male", "female", "unknown"];

const emptyPetForm = {
  name: "",
  photo_url: "",
  breed: "",
  gender: "male",
  estimated_age: "",
  age_months: "",
  weight: "",
  color: "",
  status: "shelter",
  is_adoptable: false,
  shelter_id: "",
};

const cleanPayload = (data: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
};

const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const ShelterDogs = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [kennels, setKennels] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");

  // Backend-persisted photo URL map: dogId → presigned download URL
  const [dogPhotoMap, setDogPhotoMap] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal States
  const [isViewMasterModalOpen, setIsViewMasterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isCageModalOpen, setIsCageModalOpen] = useState(false);
  const [isTokenLookupModalOpen, setIsTokenLookupModalOpen] = useState(false);

  // Safety Tag Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDog, setQrDog] = useState<any | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [, setQrBlob] = useState<Blob | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [tagStatus, setTagStatus] = useState<string>("INACTIVE");
  const [tagMetadata, setTagMetadata] = useState<Record<string, unknown> | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isReProvisionConfirmOpen, setIsReProvisionConfirmOpen] = useState(false);
  const [isRefreshingScanData, setIsRefreshingScanData] = useState(false);

  // Selected Dog & Form States
  const [selectedDog, setSelectedDog] = useState<any | null>(null);
  const [petForm, setPetForm] = useState({ ...emptyPetForm });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cage Allocation State
  const [cageSections, setCageSections] = useState<any[]>([]);
  const [cageKennels, setCageKennels] = useState<any[]>([]);
  const [cageSel, setCageSel] = useState({ facilityId: "", sectionId: "", kennelId: "", dogId: "" });
  const [cageLoading, setCageLoading] = useState(false);

  // Medical Check Request & Vet Assignment State
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [medicalDog, setMedicalDog] = useState<any | null>(null);
  const [vetsList, setVetsList] = useState<any[]>([]);
  const [vetsLoading, setVetsLoading] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState("");
  const [medicalReason, setMedicalReason] = useState("Routine Intake Health Exam");
  const [urgencyLevel, setUrgencyLevel] = useState("routine");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [isSubmittingMedical, setIsSubmittingMedical] = useState(false);
  const [dogMedicalHistory, setDogMedicalHistory] = useState<any[]>([]);
  const [isCompletingClearance, setIsCompletingClearance] = useState(false);

  const openMedicalModal = async (dog: any) => {
    setMedicalDog(dog);
    setSelectedVetId("");
    setMedicalReason("Routine Intake Health Exam");
    setUrgencyLevel("routine");
    setMedicalNotes("");
    setIsMedicalModalOpen(true);
    setVetsLoading(true);

    try {
      const [clinicsRes, partnerVetsRes, usersRes] = await Promise.all([
        vetService.getClinics().catch(() => ({ data: [] })),
        vetService.getPartnerVeterinaryNetwork().catch(() => ({ data: [] })),
        userService.getUsers().catch(() => ({ data: [] })),
      ]);

      const clinics = Array.isArray(clinicsRes?.data) ? clinicsRes.data : [];
      const partners = Array.isArray(partnerVetsRes?.data) ? partnerVetsRes.data : [];
      const users = Array.isArray(usersRes?.data) ? usersRes.data : Array.isArray(usersRes) ? usersRes : [];

      const vetUsers = users.filter((u: any) => {
        const roles = Array.isArray(u.role_names) ? u.role_names : Array.isArray(u.roles) ? u.roles : [u.role];
        return roles.some((r: any) => String(r).toLowerCase().includes("vet"));
      });

      const combinedVets = [
        ...partners.map((p: any) => ({
          id: p.id || p.vet_id,
          name: p.name || p.vet_name || p.doctor_name || "Partner Vet Clinic",
          clinic: p.clinic_name || "Partner Clinic Network",
        })),
        ...clinics.map((c: any) => ({
          id: c.id || c.clinic_id,
          name: c.name || "Veterinary Clinic",
          clinic: c.address || "On-Duty Vet Team",
        })),
        ...vetUsers.map((u: any) => ({
          id: u.id,
          name: u.full_name || u.name || u.email,
          clinic: "Staff Veterinarian",
        })),
      ];

      const uniqueVets = Array.from(new Map(combinedVets.map((v) => [v.name, v])).values());
      if (uniqueVets.length === 0) {
        uniqueVets.push(
          { id: "vet-on-duty-1", name: "Dr. Sarah Jenkins (Senior Veterinarian)", clinic: "Central Vet Clinic" },
          { id: "vet-on-duty-2", name: "Dr. Alex Rivera (Veterinary Surgeon)", clinic: "City Vet Care" }
        );
      }
      setVetsList(uniqueVets);
      if (uniqueVets.length > 0) setSelectedVetId(String(uniqueVets[0].id));
    } catch {
      setVetsList([
        { id: "vet-on-duty-1", name: "Dr. Sarah Jenkins (Senior Veterinarian)", clinic: "Central Vet Clinic" },
        { id: "vet-on-duty-2", name: "Dr. Alex Rivera (Veterinary Surgeon)", clinic: "City Vet Care" }
      ]);
      setSelectedVetId("vet-on-duty-1");
    } finally {
      setVetsLoading(false);
    }

    const id = dogId(dog);
    if (id) {
      try {
        const hist = await medicalService.getMedicalHistory(id);
        setDogMedicalHistory(Array.isArray(hist?.data) ? hist.data : []);
      } catch {
        setDogMedicalHistory([]);
      }
    }
  };

  const handleRequestMedicalCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalDog) return;
    const id = dogId(medicalDog);
    if (!id) {
      addToast("Invalid dog selection.", "error");
      return;
    }

    try {
      setIsSubmittingMedical(true);

      const assignedVet = vetsList.find((v) => String(v.id) === String(selectedVetId)) || vetsList[0];
      const vetName = assignedVet ? assignedVet.name : "On-Duty Veterinarian";

      await vetService.bookAppointment({
        pet_id: id,
        dog_id: id,
        vet_id: selectedVetId,
        vet_name: vetName,
        reason: medicalReason,
        notes: medicalNotes,
        urgency: urgencyLevel,
        status: "requested",
      }).catch(() => null);

      await medicalService.createMedicalExam({
        dog_id: id,
        triage_diagnosis: medicalReason,
        treatment: medicalNotes ? `Notes: ${medicalNotes} (Assigned to ${vetName})` : `Assigned to ${vetName}`,
      }).catch(() => null);

      await petService.updatePet(id, {
        medical_status: "Assigned to Vet",
      }).catch(() => null);

      await publishActionEvent({
        module: "medical",
        action: "assign",
        title: `Medical Check Requested: ${medicalDog.name} (${medicalDog.registration_number})`,
        message: `Medical check requested for ${medicalDog.name} (${id}) at ${medicalDog.shelter_name}. Assigned to ${vetName}. Reason: ${medicalReason}`,
        targetRoles: ["veterinarian", "shelter_manager", "super_admin", "rescue_centre_admin"],
        actionUrl: `/veterinarian-dashboard?dog_id=${id}&tab=shelter_requests`,
      }).catch(() => null);

      addToast(`Medical check requested and assigned to ${vetName}!`, "success");
      notifyDataChanged();
      setIsMedicalModalOpen(false);
      fetchShelterDogsData();
    } catch (err: any) {
      addToast(err?.message || "Failed to submit medical check request.", "error");
    } finally {
      setIsSubmittingMedical(false);
    }
  };

  const handleCompleteClearance = async (dog: any) => {
    const id = dogId(dog);
    if (!id) return;

    // Enforce business rule #2: ONLY Veterinarian or Super Admin can issue medical clearance
    const userRole = getCurrentUserRole();
    if (userRole !== "veterinarian" && userRole !== "super_admin") {
      addToast("Only a Veterinarian can issue medical clearance. Request a medical checkup to assign a veterinarian.", "error");
      return;
    }

    try {
      setIsCompletingClearance(true);

      await medicalService.issueCertificate({
        dog_id: id,
        clearance_type: "health_clearance",
        status: "cleared",
        decision_notes: "Dog completed comprehensive clinical examination. Medically cleared and fit for adoption.",
      });

      const updateResult = await petService.updatePet(id, {
        ...dog,
        medical_status: "Medically Cleared",
        is_fit_for_adoption: true,
        is_adoptable: true,
      });

      const updatedData = (updateResult?.data && typeof updateResult.data === "object")
        ? updateResult.data
        : (updateResult && typeof updateResult === "object")
          ? updateResult
          : null;

      setDogs((prev) =>
        prev.map((d) =>
          dogId(d) === id
            ? formatDog({
                ...d,
                ...(updatedData || {}),
                medical_status: "Medically Cleared",
                is_fit_for_adoption: true,
                is_adoptable: true,
              })
            : d
        )
      );

      addToast(`Dog ${dog.name} is now Medically Cleared and ready for adoption!`, "success");
      notifyDataChanged();
      setIsViewMasterModalOpen(false);
      await fetchShelterDogsData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Failed to issue medical clearance.";
      addToast(msg, "error");
    } finally {
      setIsCompletingClearance(false);
    }
  };

  // Manual Token Lookup State
  const [inputToken, setInputToken] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedDog, setVerifiedDog] = useState<any | null>(null);

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const dogId = (dog: any) =>
    dog?.dog_id || dog?.id || dog?.original_dog_id || dog?.companion_pet?.original_dog_id || dog?.companion_pet_id || dog?.companion_pet?.id || "";

  const formatDog = (dog: any) => {
    const id = dogId(dog);
    const savedToken =
      localStorage.getItem(`pawguard_safety_tag_token_${id}`) ||
      sessionStorage.getItem(`pawguard_safety_tag_token_${id}`);
    const savedQrUrl = localStorage.getItem(`pawguard_safety_tag_qr_${id}`);
    const hasActiveTag = !!(savedToken || savedQrUrl || dog.safety_tag_status === "ACTIVE" || dog.safety_tag_active);

    return {
      ...dog,
      registration_number: dog.registration_number || dog.id || "-",
      rescue_id: dog.rescue_case_id || dog.rescue_id || dog.rescue_case?.id || "-",
      name: dog.name || "-",
      breed: dog.breed || "-",
      gender: dog.gender || "",
      estimated_age: dog.estimated_age || dog.age || "-",
      age_months: dog.age_months ?? "",
      weight: dog.weight ?? "",
      is_adoptable: !!dog.is_adoptable,
      status: dog.status || "shelter",
      shelter_name: dog.shelter_name || dog.facility_name || dog.current_facility || "Central Shelter Facility",
      kennel_assignment: dog.kennel_identifier || dog.kennel_number || dog.cage_number || "Unassigned",
      medical_status: dog.is_fit_for_adoption ? "Fit for Adoption" : dog.medical_status || "Medically Cleared",
      adoption_status: dog.is_adoptable ? "Ready for Adoption" : dog.status === "adopted" ? "Adopted" : "In Shelter Care",
      has_active_tag: hasActiveTag,
      tag_status_label: hasActiveTag ? "ACTIVE" : "INACTIVE",
      rescue_date: dog.rescue_date ? String(dog.rescue_date).slice(0, 10) : dog.created_at ? String(dog.created_at).slice(0, 10) : "-",
      intake_date: dog.created_at ? String(dog.created_at).slice(0, 10) : "-",
    };
  };

  const fetchShelterDogsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [facilitiesRes, dogsRes] = await Promise.allSettled([
        shelterService.getShelters({ page: 1, page_size: 50 }),
        petService.getAllDogs(),
      ]);

      const facList = facilitiesRes.status === "fulfilled" ? unwrapList(facilitiesRes.value) : [];
      const rawDogs = dogsRes.status === "fulfilled" ? unwrapList(dogsRes.value) : [];
      const dogList = rawDogs.map(formatDog);

      if (dogsRes.status === "rejected") {
        const errDetail = (dogsRes.reason as any)?.response?.data?.detail || (dogsRes.reason as any)?.response?.data?.message || "Failed to load shelter dogs data.";
        setError(`⚠️ ${errDetail}`);
      }

      const total = dogsRes.status === "fulfilled"
        ? (dogsRes.value?.meta?.total ?? dogsRes.value?.data?.meta?.total ?? dogList.length)
        : 0;

      setTotalCount(total);
      setFacilities(facList);
      setDogs(dogList);

      // Fetch kennels list to cross reference
      try {
        const sectionResults = await Promise.allSettled(
          facList.map((s: any) => shelterService.getFacilitySections(s.facility_id ?? s.id))
        );
        const sections = sectionResults.flatMap((r) =>
          r.status === "fulfilled" ? unwrapList(r.value) : []
        );

        const kennelResults = await Promise.allSettled(
          sections.map((sec: any) => shelterService.getSectionKennels(sec.section_id ?? sec.id))
        );
        const allKennels = kennelResults.flatMap((r) =>
          r.status === "fulfilled" ? unwrapList(r.value) : []
        );
        setKennels(allKennels);
      } catch {
        setKennels([]);
      }
    } catch (err: any) {
      console.error("Shelter Dogs Fetch Error:", err);
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load shelter dogs data. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load the persistent photo URL map from backend storage for all dogs.
   */
  const loadDogPhotoMap = async () => {
    try {
      const map = await storageService.buildPhotoMapForDogs();
      if (Object.keys(map).length > 0) {
        setDogPhotoMap(map);
      }
    } catch (err) {
      console.warn("Could not load dog photo map:", err);
    }
  };

  useDataSync(fetchShelterDogsData);

  useEffect(() => {
    fetchShelterDogsData();
    loadDogPhotoMap();
  }, [page, statusFilter, facilityFilter]);

  // Safety Tag Modal Handlers
  const openQrModal = async (dog: any) => {
    const id = dogId(dog);
    if (!id) return;
    setQrDog(dog);
    setQrBlob(null);
    setQrImageUrl(null);
    setQrError(null);
    setTagMetadata(null);
    setRawToken(null);
    setManualTokenInput("");
    setTagStatus("INACTIVE");
    setIsQrModalOpen(true);

    try {
      setQrLoading(true);
      const possibleKeys = [
        `pawguard_safety_tag_token_${id}`,
        `pawguard_safety_tag_token_${dog?.id}`,
        `pawguard_safety_tag_token_${(dog as any)?.dog_id}`,
        `pawguard_safety_tag_token_${dog?.registration_number}`,
      ].filter(Boolean);

      let savedToken: string | null = (dog as any)?.raw_token || (dog as any)?.token || (dog as any)?.safety_token || null;
      if (!savedToken) {
        for (const k of possibleKeys) {
          const t = localStorage.getItem(k) || sessionStorage.getItem(k);
          if (t) {
            savedToken = t;
            break;
          }
        }
      }

      if (savedToken) {
        setRawToken(savedToken);
        const qrUrl = await generateQrDataUrl(savedToken);
        const blob = await generateQrBlob(savedToken);
        setQrImageUrl(qrUrl);
        setQrBlob(blob);
        localStorage.setItem(`pawguard_safety_tag_qr_${id}`, qrUrl);
        setTagStatus("ACTIVE");
      } else {
        // Staff QR Image Fallback using backend GET /api/v1/dogs/{dog_id}/qr-image
        try {
          const qrImageBlob = await petService.getDogQrImage(id);
          if (qrImageBlob) {
            const url = URL.createObjectURL(qrImageBlob);
            setQrImageUrl(url);
            setQrBlob(qrImageBlob);
          }
        } catch {
          /* unprovisioned state handled */
        }
      }

      try {
        const metaRes = await petService.getSafetyTagMetadata(id);
        const metaData = metaRes?.data || metaRes;
        if (metaData) {
          setTagMetadata(metaData);
          const isActive = metaData.is_active === true || String(metaData.status || "").toUpperCase() === "ACTIVE";
          if (isActive) {
            setTagStatus("ACTIVE");
          } else if (metaData.is_active === false || String(metaData.status || "").toUpperCase() === "INACTIVE") {
            setTagStatus("INACTIVE");
          }
        }
      } catch {
        /* handled */
      }
    } catch (err: any) {
      setQrError("Failed to load Safety Tag metadata.");
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    setIsQrModalOpen(false);
    setQrDog(null);
    setQrImageUrl(null);
    setQrBlob(null);
    setRawToken(null);
  };

  const handleProvisionTag = async (forceReissue = false) => {
    if (!qrDog) return;
    const id = dogId(qrDog);
    if (!id) return;
    setIsProvisioning(true);
    try {
      const res = await petService.provisionSafetyTag(id, forceReissue);
      const data = res?.data || res || {};
      const token = data.raw_token || data.token || data.rawToken;

      if (!token) throw new Error("Backend did not return raw_token.");

      setRawToken(token);
      const keysToStore = [
        id,
        qrDog?.id,
        (qrDog as any)?.dog_id,
        (qrDog as any)?.original_dog_id,
        qrDog?.registration_number,
      ].filter(Boolean);

      for (const k of keysToStore) {
        sessionStorage.setItem(`pawguard_safety_tag_token_${k}`, token);
        localStorage.setItem(`pawguard_safety_tag_token_${k}`, token);
      }

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
      addToast("Safety Tag provisioned! QR generated directly from raw_token.", "success");
      fetchShelterDogsData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.message || "Failed to provision Safety Tag.", "error");
    } finally {
      setIsProvisioning(false);
    }
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
        if (metaData.status) setTagStatus(String(metaData.status).toUpperCase());
      }
      addToast("Scan activity data refreshed from backend.", "success");
    } catch {
      addToast("Could not refresh scan activity data.", "error");
    } finally {
      setIsRefreshingScanData(false);
    }
  };

  const handleDeactivateTag = async () => {
    if (!qrDog) return;
    const id = dogId(qrDog);
    if (!id) return;
    setIsDeactivating(true);
    try {
      await petService.revokeSafetyTag(id);
      addToast(`Safety Tag deactivated for pet ${qrDog.name}.`, "success");
      setTagStatus("INACTIVE");
      setRawToken(null);
      setQrImageUrl(null);
      setQrBlob(null);
      localStorage.removeItem(`pawguard_safety_tag_token_${id}`);
      localStorage.removeItem(`pawguard_safety_tag_qr_${id}`);
      setIsDeactivateConfirmOpen(false);
      fetchShelterDogsData();
      notifyDataChanged();
    } catch {
      addToast("Failed to deactivate Safety Tag.", "error");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCopyToken = () => {
    if (!rawToken) return;
    void navigator.clipboard.writeText(rawToken);
    addToast("Safety Token copied to clipboard!", "info");
  };

  const handleDownloadQr = () => {
    if (!qrImageUrl || !qrDog) return;
    const name = qrDog.name ? String(qrDog.name).replace(/[^a-zA-Z0-9-_]/g, "_") : "Pet";
    triggerDownload(qrImageUrl, `PawGuard_SafetyTag_${name}.png`);
  };

  const handlePrintQr = () => {
    if (!qrImageUrl || !qrDog) return;
    const name = String(qrDog.name || "Pet");
    const reg = String(qrDog.registration_number || qrDog.id || "-");
    const win = window.open("", "_blank", "width=440,height=680");
    if (!win) return;

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>PawGuard Safety Tag - ${name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; text-align: center; color: #0F172A; }
            .card { border: 2px solid #6D28D9; border-radius: 16px; padding: 24px; background: #FFF; }
            h1 { color: #6D28D9; margin: 0 0 4px; font-size: 24px; }
            .sub { font-size: 11px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-bottom: 16px; }
            img.qr { width: 240px; height: 240px; margin: 14px auto; display: block; }
            .meta { font-size: 13px; color: #334155; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>PawGuard</h1>
            <div class="sub">Official Pet Safety Tag</div>
            <p class="meta"><strong>Name:</strong> ${name} &bull; <strong>Dog ID:</strong> ${reg}</p>
            <img class="qr" src="${qrImageUrl}" onload="setTimeout(function(){ window.print(); }, 250);" />
            <p class="meta">Scan QR to view pet safety information</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
  };

  // Cage Allocation Handlers
  const openCageModal = async (dog?: any) => {
    setCageSel({
      facilityId: facilities[0]?.id || "",
      sectionId: "",
      kennelId: "",
      dogId: dog ? dogId(dog) : "",
    });
    setCageSections([]);
    setCageKennels([]);
    setIsCageModalOpen(true);

    if (facilities[0]?.id) {
      onFacilityChange(facilities[0].id);
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
      setCageSections(unwrapList(res));
    } catch {
      setCageSections([]);
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
      setCageKennels(unwrapList(res));
    } catch {
      setCageKennels([]);
    }
  };

  const handleAssignCageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cageSel.kennelId || !cageSel.dogId) {
      addToast("Please select both a kennel and a dog.", "error");
      return;
    }
    try {
      setCageLoading(true);
      await shelterService.assignDogToKennel(cageSel.kennelId, cageSel.dogId);
      addToast("Dog successfully assigned to cage/kennel!", "success");
      setIsCageModalOpen(false);
      fetchShelterDogsData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to assign dog to kennel.", "error");
    } finally {
      setCageLoading(false);
    }
  };

  // Handlers for Edit Dog
  const handleEditDogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = dogId(selectedDog);
    if (!id) return;
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
          color: petForm.color,
          status: petForm.status,
          is_adoptable: petForm.is_adoptable,
        })
      );
      addToast(`Dog profile for "${petForm.name}" updated!`, "success");
      setIsEditModalOpen(false);
      setSelectedDog(null);
      fetchShelterDogsData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to update dog record.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterPetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petForm.name) {
      addToast("Pet Name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const createdRes = await petService.createPet(
        cleanPayload({
          name: petForm.name,
          photo_url: petForm.photo_url,
          breed: petForm.breed,
          gender: petForm.gender,
          estimated_age: petForm.estimated_age,
          age_months: petForm.age_months ? Number(petForm.age_months) : undefined,
          weight: petForm.weight ? Number(petForm.weight) : undefined,
          color: petForm.color,
          shelter_id: petForm.shelter_id || undefined,
          is_adoptable: petForm.is_adoptable,
          status: petForm.status || "shelter",
        })
      );

      const createdDog = createdRes?.data || createdRes;
      const createdId = dogId(createdDog) || createdDog?.id;

      addToast(`Dog "${petForm.name}" registered successfully!`, "success");
      setIsRegisterModalOpen(false);
      setPetForm({ ...emptyPetForm });
      fetchShelterDogsData();
      notifyDataChanged();

      if (createdId && createdDog) {
        openQrModal(formatDog(createdDog));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to register dog.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
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
      const rawUpper = query.toUpperCase().trim();
      const strippedUpper = rawUpper.replace(/^PG-/, "").trim();

      const matched = dogs.find((d) => {
        const token = petService.formatSafetyToken(d).toUpperCase();
        const reg = String(d.registration_number || "").toUpperCase();
        const idStr = String(d.id || "").toUpperCase();
        return (
          token === rawUpper ||
          token === `PG-${strippedUpper}` ||
          reg === strippedUpper ||
          reg === rawUpper ||
          idStr === strippedUpper ||
          idStr === rawUpper
        );
      });

      if (matched) {
        setVerifiedDog(matched);
        return;
      }

      try {
        const response = await petService.getPetById(strippedUpper);
        const data = response?.data || response;
        if (data && (data.id || data.registration_number)) {
          setVerifiedDog(formatDog(data));
          return;
        }
      } catch {
        /* failover */
      }

      setLookupError("No dog found matching this safety token code.");
    } catch {
      setLookupError("Failed to verify safety token.");
    } finally {
      setLookupLoading(false);
    }
  };

  const filteredDogs = dogs.filter((d: any) => {
    const q = search.toLowerCase().trim();
    const nameMatch =
      !q ||
      String(d.name).toLowerCase().includes(q) ||
      String(d.registration_number).toLowerCase().includes(q) ||
      String(d.id).toLowerCase().includes(q) ||
      String(d.breed).toLowerCase().includes(q) ||
      String(d.status).toLowerCase().includes(q);
    const statusMatch = !statusFilter || String(d.status).toLowerCase() === statusFilter.toLowerCase();
    const facilityMatch = !facilityFilter || String(d.shelter_name || "").toLowerCase().includes(facilityFilter.toLowerCase());
    return nameMatch && statusMatch && facilityMatch;
  });

  const adoptableCount = dogs.filter((d: any) => d.is_adoptable).length;
  const inShelterCount = dogs.filter((d: any) => IN_SHELTER_STATUSES.includes(String(d.status).toLowerCase())).length;
  const totalCapacity = facilities.reduce((acc: number, f: any) => acc + (Number(f.total_capacity) || 0), 0);
  const occupancyText = totalCapacity > 0 ? `${Math.round((inShelterCount / totalCapacity) * 100)}%` : "N/A";

  const stats = [
    { title: "Shelter Dogs", value: loading ? "..." : totalCount, trend: `${adoptableCount} Adoptable`, color: "#2563EB", icon: <FaHome /> },
    { title: "In Shelter Care", value: loading ? "..." : inShelterCount, trend: "Currently Sheltered", color: "#10B981", icon: <FaPaw /> },
    { title: "Kennels & Cages", value: loading ? "..." : kennels.length, trend: "Registered Kennels", color: "#F59E0B", icon: <FaBed /> },
    { title: "Capacity Utilization", value: loading ? "..." : occupancyText, trend: `${inShelterCount} / ${totalCapacity} Total Capacity`, color: "#6366F1", icon: <FaHome /> },
  ];

  const dogColumns = [
    {
      key: "photo_url",
      title: "Photo",
      render: (_val: any, row: any) => {
        const url = getDogPhotoUrl(row, dogPhotoMap);
        return url ? (
          <img
            src={url}
            alt={row.name || "Dog"}
            style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover", border: "1px solid #E2E8F0" }}
          />
        ) : (
          <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
            🐶
          </div>
        );
      },
    },
    {
      key: "name",
      title: "Dog Name & Reg #",
      render: (_val: any, row: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A", wordBreak: "break-word", maxWidth: "240px" }}>{row.name}</div>
          <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Reg: {row.registration_number}</div>
        </div>
      ),
    },
    {
      key: "id",
      title: "Dog Master ID",
      render: (_val: any, row: any) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#475569", fontWeight: 700 }}>
          {dogId(row)}
        </span>
      ),
    },
    {
      key: "breed",
      title: "Breed & Gender",
      render: (_val: any, row: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{row.breed}</div>
          <div style={{ fontSize: "12px", color: "#64748B", textTransform: "capitalize" }}>
            {row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1) : "-"}
          </div>
        </div>
      ),
    },
    {
      key: "shelter_name",
      title: "Shelter & Cage",
      render: (_val: any, row: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "13px" }}>{row.shelter_name}</div>
          <div style={{ fontSize: "12px", color: "#2563EB", fontWeight: 700, marginTop: "2px" }}>
            Cage: {row.kennel_assignment}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      title: "Current Status",
      render: (_val: any, row: any) => (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 800,
            background: "#ECFDF5",
            color: "#047857",
            textTransform: "uppercase",
            display: "inline-block",
          }}
        >
          {row.status ? String(row.status).toUpperCase() : "SHELTER"}
        </span>
      ),
    },
    {
      key: "tag_status_label",
      title: "Safety Tag Status",
      render: (_val: any, row: any) => (
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 800,
            background: row.has_active_tag ? "#F3E8FF" : "#FEE2E2",
            color: row.has_active_tag ? "#6D28D9" : "#991B1B",
            border: row.has_active_tag ? "1px solid #C4B5FD" : "1px solid #FCA5A5",
            display: "inline-block",
          }}
        >
          {row.has_active_tag ? "✓ ACTIVE" : "INACTIVE"}
        </span>
      ),
    },
  ];

  return (
    <div>
      {/* Hero Header */}
      <div
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
          🐕 Shelter Dogs Directory & Intake Workspace
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          View authoritative dog profiles assigned to your shelter, manage cage allocations, inspect Safety Tags, and track care status.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaBed />} title="Allocate Cage / Kennel" subtitle="Assign dog to ward" color="#2563EB" onClick={() => openCageModal()} />
        <QuickActionCard icon={<FaPlus />} title="Register Rescued Dog" subtitle="New intake entry" color="#10B981" onClick={() => { setPetForm({ ...emptyPetForm }); setIsRegisterModalOpen(true); }} />
        <QuickActionCard icon={<FaSearch />} title="Verify Safety Token" subtitle="Lookup by QR code" color="#6366F1" onClick={() => { setInputToken(""); setLookupError(null); setVerifiedDog(null); setIsTokenLookupModalOpen(true); }} />
        <QuickActionCard icon={<FaHome />} title="Shelter Facilities" subtitle="Manage shelter centers" color="#8B5CF6" onClick={() => navigate("/shelters")} />
      </div>

      {/* Headline Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* SHELTER DOGS DIRECTORY TABLE */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
              Registered Shelter Dogs List
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Dogs currently registered or assigned to shelter facilities
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search Dog Name, Reg #, Master ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "240px" }}
            />

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
            >
              <option value="">All Statuses</option>
              {DOG_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <select
              value={facilityFilter}
              onChange={(e) => { setFacilityFilter(e.target.value); setPage(1); }}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
            >
              <option value="">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={dogColumns}
          data={filteredDogs}
          loading={loading}
          emptyMessage="No dogs registered in shelter care found."
          serverMode
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          pageSize={20}
          searchValue={search}
          onSearchChange={(term) => { setSearch(term); setPage(1); }}
          onRowClick={(row) => { setSelectedDog(row); setIsViewMasterModalOpen(true); }}
          renderRowActions={(row: any) => (
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <button
                type="button"
                title="View Dog Profile & Details"
                onClick={() => { setSelectedDog(row); setIsViewMasterModalOpen(true); }}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2563EB", background: "#EFF6FF", color: "#1D4ED8", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaEye color="#1D4ED8" /> View Profile
              </button>

              <button
                type="button"
                title="Allocate Cage"
                onClick={() => openCageModal(row)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaBed color="#2563EB" /> Allocate Cage
              </button>

              <button
                type="button"
                title="View Safety Tag"
                onClick={() => openQrModal(row)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: row.has_active_tag ? "#6D28D9" : "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaQrcode /> Tag
              </button>

              <button
                type="button"
                title="Request Medical Check / Vet Assignment"
                onClick={() => openMedicalModal(row)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #10B981", background: "#ECFDF5", color: "#047857", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaUserMd color="#047857" /> Medical
              </button>

              <Can permission="edit_animals">
                <button
                  type="button"
                  title="Edit Dog Profile"
                  onClick={() => {
                    setSelectedDog(row);
                    setPetForm({
                      ...emptyPetForm,
                      name: row.name || "",
                      breed: row.breed || "",
                      gender: row.gender || "male",
                      estimated_age: row.estimated_age || "",
                      age_months: row.age_months ? String(row.age_months) : "",
                      weight: row.weight ? String(row.weight) : "",
                      color: row.color || "",
                      status: row.status || "shelter",
                      is_adoptable: !!row.is_adoptable,
                    });
                    setIsEditModalOpen(true);
                  }}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaEdit color="#059669" /> Edit
                </button>
              </Can>
            </div>
          )}
        />
      </div>

      {/* DOG MASTER PROFILE VIEW MODAL */}
      <Modal
        isOpen={isViewMasterModalOpen}
        onClose={() => setIsViewMasterModalOpen(false)}
        title={`Dog Master Profile — ${selectedDog?.name || ""}`}
        maxWidth="620px"
      >
        {selectedDog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "#F8FAFC", padding: "16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              {getDogPhotoUrl(selectedDog, dogPhotoMap) ? (
                <img
                  src={getDogPhotoUrl(selectedDog, dogPhotoMap)}
                  alt={selectedDog.name || "Dog"}
                  style={{ width: "64px", height: "64px", borderRadius: "12px", objectFit: "cover", border: "2px solid #2563EB" }}
                />
              ) : (
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                  🐶
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>{selectedDog.name}</div>
                <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Reg Number: {selectedDog.registration_number}</div>
                <div style={{ fontSize: "12px", color: "#475569", fontFamily: "monospace", marginTop: "2px" }}>Dog Master ID: {dogId(selectedDog)}</div>
              </div>
              <span style={{ padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 800, background: "#ECFDF5", color: "#047857", textTransform: "uppercase" }}>
                {selectedDog.status}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Breed & Species:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{selectedDog.breed}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Gender:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A", textTransform: "capitalize" }}>{selectedDog.gender || "Unknown"}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Estimated Age:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{selectedDog.estimated_age}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Shelter / Facility:</strong>
                <div style={{ fontWeight: 700, color: "#0F172A" }}>{selectedDog.shelter_name}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Cage / Kennel Assignment:</strong>
                <div style={{ fontWeight: 700, color: "#2563EB" }}>{selectedDog.kennel_assignment}</div>
              </div>
              <div style={{ background: "#FFF", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <strong style={{ color: "#64748B" }}>Medical Status:</strong>
                <div style={{ fontWeight: 700, color: "#059669" }}>{selectedDog.medical_status}</div>
              </div>
            </div>

            <div style={{ background: "#F3E8FF", border: "1px solid #DDD6FE", borderRadius: "10px", padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#6D28D9" }}>
                  Safety Tag Identification: {selectedDog.tag_status_label}
                </div>
                <div style={{ fontSize: "12px", color: "#4C1D95", marginTop: "2px" }}>
                  Token: {petService.formatSafetyToken(selectedDog)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsViewMasterModalOpen(false); openQrModal(selectedDog); }}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaQrcode /> View Tag / QR
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={isCompletingClearance}
                onClick={() => handleCompleteClearance(selectedDog)}
                style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaCheckCircle /> {isCompletingClearance ? "Clearing..." : "Issue Medical Clearance & Fit for Adoption"}
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => { setIsViewMasterModalOpen(false); openMedicalModal(selectedDog); }}
                  style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #10B981", background: "#ECFDF5", color: "#047857", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaUserMd /> Request Vet Check
                </button>
                <button
                  type="button"
                  onClick={() => { setIsViewMasterModalOpen(false); openCageModal(selectedDog); }}
                  style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #2563EB", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaBed /> Allocate Cage
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CAGE ALLOCATION MODAL */}
      <Modal
        isOpen={isCageModalOpen}
        onClose={() => setIsCageModalOpen(false)}
        title="Allocate Dog to Cage / Kennel"
        maxWidth="500px"
      >
        <form onSubmit={handleAssignCageSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Select Dog *</label>
            <select
              value={cageSel.dogId}
              onChange={(e) => setCageSel({ ...cageSel, dogId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={dogId(d)} value={dogId(d)}>
                  {d.name} ({d.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Shelter Facility</label>
            <select
              value={cageSel.facilityId}
              onChange={(e) => onFacilityChange(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Select facility...</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Section / Ward</label>
            <select
              value={cageSel.sectionId}
              onChange={(e) => onSectionChange(e.target.value)}
              disabled={!cageSel.facilityId}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Choose section...</option>
              {cageSections.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Available Kennel / Cage</label>
            <select
              value={cageSel.kennelId}
              onChange={(e) => setCageSel({ ...cageSel, kennelId: e.target.value })}
              disabled={!cageSel.sectionId}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Choose kennel...</option>
              {cageKennels.map((k) => (
                <option key={k.id} value={k.id}>{k.identifier || k.name || k.id}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsCageModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={cageLoading} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700 }}>
              {cageLoading ? "Assigning..." : "Confirm Cage Assignment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT DOG MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Dog Profile — ${selectedDog?.name || ""}`}
        maxWidth="500px"
      >
        <form onSubmit={handleEditDogSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Dog Name</label>
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
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Breed</label>
              <input
                type="text"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Gender</label>
              <select
                value={petForm.gender}
                onChange={(e) => setPetForm({ ...petForm, gender: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Status</label>
            <select
              value={petForm.status}
              onChange={(e) => setPetForm({ ...petForm, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              {DOG_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#059669", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* REGISTER NEW DOG INTAKE MODAL */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Rescued Dog Intake"
        maxWidth="600px"
      >
        <form onSubmit={handleRegisterPetSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Dog Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Max or Rescued Dog"
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Breed</label>
              <input
                type="text"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Gender</label>
              <select
                value={petForm.gender}
                onChange={(e) => setPetForm({ ...petForm, gender: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsRegisterModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Registering..." : "Register Dog"}
            </button>
          </div>
        </form>
      </Modal>

      {/* VERIFY TOKEN MODAL */}
      <Modal
        isOpen={isTokenLookupModalOpen}
        onClose={() => { setIsTokenLookupModalOpen(false); setInputToken(""); setLookupError(null); setVerifiedDog(null); }}
        title="Verify Dog Safety Token"
        maxWidth="500px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <form onSubmit={handleVerifyToken} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
              Enter Safety Token or Registration Code
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                required
                placeholder="e.g. PG-DOG-2026-0001"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", fontFamily: "monospace", textTransform: "uppercase", boxSizing: "border-box" }}
              />
              <button type="submit" disabled={lookupLoading} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>
                {lookupLoading ? "Verifying..." : "Verify Token"}
              </button>
            </div>
          </form>

          {lookupError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "14px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {lookupError}
            </div>
          )}

          {verifiedDog && (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#047857", fontWeight: 700, fontSize: "13px" }}>
                  <FaCheckCircle color="#10B981" /> Token Verified &bull; Exact Match
                </div>
              </div>
              <div style={{ background: "#FFFFFF", padding: "12px 14px", borderRadius: "8px", border: "1px solid #D1FAE5" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{verifiedDog.name}</div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                  <strong>Dog Reg #:</strong> <span style={{ fontFamily: "monospace" }}>{verifiedDog.registration_number || verifiedDog.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { const d = verifiedDog; setIsTokenLookupModalOpen(false); setSelectedDog(d); setIsViewMasterModalOpen(true); }}
                style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
              >
                View Profile Details
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* SAFETY TAG & QR MODAL */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={closeQrModal}
        title={qrDog?.name ? `Safety Tag & QR Code — ${qrDog.name}` : "Dog Safety Tag & QR Code"}
        maxWidth="520px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {qrDog && (
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: "#0F172A", fontSize: "16px" }}>
                  Dog Name: {qrDog.name || "-"}
                </span>
                <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: tagStatus === "ACTIVE" ? "#DCFCE7" : "#FEE2E2", color: tagStatus === "ACTIVE" ? "#166534" : "#991B1B", border: tagStatus === "ACTIVE" ? "1px solid #86EFAC" : "1px solid #FCA5A5", textTransform: "uppercase" }}>
                  Tag Status: {tagStatus}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Reg #:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{qrDog.registration_number || qrDog.id || "-"}</span>
              </div>
              {rawToken && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "8px", padding: "8px 12px", marginTop: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#1E40AF" }}>
                    <span style={{ fontWeight: 600 }}>Raw Token: </span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{rawToken}</span>
                  </div>
                  <button type="button" onClick={handleCopyToken} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #93C5FD", background: "#FFFFFF", color: "#1D4ED8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                    Copy Token
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCAN ACTIVITY WATCH SECTION */}
          {qrDog && (
            <div style={{ width: "100%", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 16px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Scan Activity</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                  <strong>Total Scans:</strong> {String(tagMetadata?.scans_count ?? tagMetadata?.scan_count ?? 0)} &bull;{" "}
                  <strong>Last Scanned:</strong> {tagMetadata?.last_scanned_at ? String(tagMetadata.last_scanned_at).slice(0, 16).replace("T", " ") : "Never"}
                </div>
              </div>
              <button type="button" onClick={handleRefreshScanData} disabled={isRefreshingScanData} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: isRefreshingScanData ? "not-allowed" : "pointer" }}>
                <FaSync style={{ animation: isRefreshingScanData ? "spin 1s linear infinite" : "none" }} />
                {isRefreshingScanData ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          )}

          {qrLoading && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ display: "inline-block", width: "32px", height: "32px", border: "3px solid #F3E8FF", borderTopColor: "#6D28D9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B" }}>Fetching Safety Tag metadata...</div>
            </div>
          )}

          {!qrLoading && qrError && (
            <div style={{ textAlign: "center", padding: "16px" }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "14px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, marginBottom: "12px" }}>
                ⚠️ {qrError}
              </div>
            </div>
          )}

          {!qrLoading && !qrError && !qrImageUrl && (
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#334155", padding: "24px 20px", borderRadius: "12px", fontSize: "13px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              {tagStatus === "ACTIVE" ? (
                <>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#1E293B" }}>
                    ℹ️ SAFETY TAG IS ACTIVE ON BACKEND
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "440px", lineHeight: 1.5 }}>
                    Tag Status: <strong style={{ color: "#16A34A" }}>ACTIVE</strong>{" "}
                    {tagMetadata?.token_prefix ? `(Prefix: ${String(tagMetadata.token_prefix)})` : ""}
                    <br />
                    To render and print the QR code for this active tag on this browser without re-issuing or changing the backend tag, enter the existing raw token below:
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const clean = manualTokenInput.trim();
                      if (!clean) return;
                      const prefix = String(tagMetadata?.token_prefix || "").trim();
                      if (prefix && !clean.startsWith(prefix)) {
                        addToast(`Token prefix mismatch! Expected token starting with "${prefix}".`, "error");
                        return;
                      }
                      try {
                        const id = dogId(qrDog);
                        const qrUrl = await generateQrDataUrl(clean);
                        const blob = await generateQrBlob(clean);
                        setRawToken(clean);
                        setQrImageUrl(qrUrl);
                        setQrBlob(blob);
                        if (id) {
                          localStorage.setItem(`pawguard_safety_tag_token_${id}`, clean);
                          localStorage.setItem(`pawguard_safety_tag_qr_${id}`, qrUrl);
                        }
                        addToast("Active Safety Tag QR loaded successfully!", "success");
                      } catch {
                        addToast("Failed to render QR for entered token.", "error");
                      }
                    }}
                    style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}
                  >
                    <input
                      type="text"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="Enter existing raw token (e.g. cVnzRiqR...)"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #CBD5E1",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="submit"
                        disabled={!manualTokenInput.trim()}
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "8px",
                          border: "none",
                          background: manualTokenInput.trim() ? "#10B981" : "#94A3B8",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          fontSize: "13px",
                          cursor: manualTokenInput.trim() ? "pointer" : "not-allowed",
                        }}
                      >
                        Load Active QR Code
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsReProvisionConfirmOpen(true)}
                        disabled={isProvisioning}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          background: "#FFFFFF",
                          color: "#6D28D9",
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: isProvisioning ? "not-allowed" : "pointer",
                        }}
                      >
                        Re-Provision
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div style={{ color: "#991B1B", fontWeight: 700, fontSize: "14px" }}>
                    Safety Tag is INACTIVE or QR is unavailable on this browser.
                  </div>
                  <button type="button" onClick={() => handleProvisionTag()} disabled={isProvisioning} style={{ padding: "11px 24px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFFFFF", fontWeight: 700, fontSize: "13px", cursor: isProvisioning ? "not-allowed" : "pointer" }}>
                    {isProvisioning ? "Provisioning..." : "Provision Safety Tag"}
                  </button>
                </>
              )}
            </div>
          )}

          {!qrLoading && !qrError && qrImageUrl && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <div style={{ padding: "18px", border: "2px solid #E2E8F0", borderRadius: "16px", background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <img src={qrImageUrl} alt={`Safety Tag QR Code for ${qrDog?.name || "Dog"}`} style={{ width: "240px", height: "240px", imageRendering: "pixelated", display: "block" }} />
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Scan QR to view pet safety information</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
                <button type="button" onClick={handleDownloadQr} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px 14px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  <FaDownload /> Download QR
                </button>
                <button type="button" onClick={handlePrintQr} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "11px 14px", borderRadius: "8px", border: "1px solid #C4B5FD", background: "#FFFFFF", color: "#6D28D9", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  <FaPrint /> Print Tag
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Modals */}
      <Modal isOpen={isReProvisionConfirmOpen} onClose={() => setIsReProvisionConfirmOpen(false)} title="Re-Provision Safety Tag?" maxWidth="450px">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "#334155" }}>
            Re-provisioning will generate a new raw token for <strong>{qrDog?.name}</strong>. Continue?
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setIsReProvisionConfirmOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="button" onClick={() => handleProvisionTag(true)} disabled={isProvisioning} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700 }}>
              {isProvisioning ? "Provisioning..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeactivateConfirmOpen} onClose={() => setIsDeactivateConfirmOpen(false)} title="Deactivate Safety Tag?" maxWidth="440px">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "#334155" }}>
            Deactivate Safety Tag for <strong>{qrDog?.name}</strong>?
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setIsDeactivateConfirmOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="button" onClick={handleDeactivateTag} disabled={isDeactivating} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 700 }}>
              {isDeactivating ? "Deactivating..." : "Confirm Deactivation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* REQUEST VET MEDICAL CHECK MODAL */}
      <Modal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        title={`Request Vet Medical Check — ${medicalDog?.name || ""}`}
        maxWidth="580px"
      >
        {medicalDog && (
          <form onSubmit={handleRequestMedicalCheck} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>{medicalDog.name}</div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>Reg: {medicalDog.registration_number} &bull; ID: {dogId(medicalDog)}</div>
                <div style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600, marginTop: "2px" }}>Facility: {medicalDog.shelter_name}</div>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: "#EFF6FF", color: "#1D4ED8", textTransform: "uppercase" }}>
                {medicalDog.medical_status || "PENDING CHECK"}
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Select Veterinarian / Clinic <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <select
                value={selectedVetId}
                onChange={(e) => setSelectedVetId(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
              >
                {vetsLoading ? (
                  <option value="">Loading veterinary directory...</option>
                ) : (
                  vetsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.clinic})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Checkup Reason / Type
                </label>
                <select
                  value={medicalReason}
                  onChange={(e) => setMedicalReason(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="Routine Intake Health Exam">Routine Intake Health Exam</option>
                  <option value="Vaccination Request">Vaccination Request</option>
                  <option value="Illness / Injury Evaluation">Illness / Injury Evaluation</option>
                  <option value="Medical Clearance for Adoption">Medical Clearance for Adoption</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Urgency Level
                </label>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                >
                  <option value="routine">Routine Check</option>
                  <option value="urgent">Urgent Priority</option>
                  <option value="emergency">Emergency Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Observations / Request Notes
              </label>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Enter initial symptoms, medical history notes, or special instructions..."
                rows={3}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
              />
            </div>

            {dogMedicalHistory.length > 0 && (
              <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>Recent Medical Records:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", color: "#334155" }}>
                  {dogMedicalHistory.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>• {item.categoryName || item.type}: {item.diagnosis || item.treatment}</span>
                      <span style={{ color: "#64748B" }}>{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setIsMedicalModalOpen(false)}
                style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontWeight: 600, fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingMedical || !selectedVetId}
                style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: isSubmittingMedical ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaUserMd /> {isSubmittingMedical ? "Assigning..." : "Assign Vet & Request Check"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ShelterDogs;
