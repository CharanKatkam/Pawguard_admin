import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import Modal from "../../../components/common/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaHome,
  FaBed,
  FaPaw,
  FaBoxes,
  FaUsers,
  FaQrcode,
  FaStethoscope,
  FaEye,
  FaEdit,
  FaDownload,
  FaPrint,
  FaSync,
  FaPlus,
  FaFileAlt,
  FaCopy,
  FaExternalLinkAlt,
} from "react-icons/fa";
import shelterService from "../../../services/shelterService";
import petService from "../../../services/petService";
import rescueService from "../../../services/rescueService";
import inventoryService from "../../../services/inventoryService";
import { useDataSync, notifyDataChanged } from "../../../utils/dataSync";
import { generateQrDataUrl, generateQrBlob } from "../../../utils/qrGenerator";
import { formatDateTime } from "../../../utils/dateUtils";

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
  rescue_case_id: "",
  rescue_date: "",
  rescue_location: "",
  shelter_id: "",
  intake_condition: "",
  medical_notes: "",
  is_adoptable: false,
  status: "shelter",
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

const ShelterManagerDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dogs, setDogs] = useState<any[]>([]);
  const [kennelRows, setKennelRows] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [incomingRescues, setIncomingRescues] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dashboardData, setDashboardData] = useState({
    total_facilities: 0,
    total_dogs: 0,
    adoptable_dogs: 0,
    total_kennels: 0,
    in_shelter_dogs: 0,
    total_capacity: 0,
  });

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewMasterModalOpen, setIsViewMasterModalOpen] = useState(false);
  const [isCageModalOpen, setIsCageModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

  // Supply Request State
  const [supplyForm, setSupplyForm] = useState({
    itemName: "",
    category: "Food & Nutrition",
    stock: "50 kg",
    threshold: "10 kg",
    facilityId: "",
  });

  // Report Form State
  const [reportType, setReportType] = useState("occupancy");
  const [reportGeneratedText, setReportGeneratedText] = useState<string | null>(null);

  const unwrapList = (v: any) =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

  const dogId = (dog: any) => dog?.dog_id || dog?.id || dog?.original_dog_id || dog?.companion_pet?.original_dog_id || dog?.companion_pet_id || dog?.companion_pet?.id || "";

  const formatDog = (dog: any) => {
    const id = dogId(dog);
    const savedToken = localStorage.getItem(`pawguard_safety_tag_token_${id}`) || sessionStorage.getItem(`pawguard_safety_tag_token_${id}`);
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
      medical_status: dog.is_fit_for_adoption ? "Fit for Adoption" : dog.medical_status || "Medically Cleared",
      adoption_status: dog.is_adoptable ? "Ready for Adoption" : dog.status === "adopted" ? "Adopted" : "In Shelter Care",
      has_active_tag: hasActiveTag,
      tag_status_label: hasActiveTag ? "ACTIVE" : "INACTIVE",
      rescue_date: dog.rescue_date ? String(dog.rescue_date).slice(0, 10) : dog.created_at ? String(dog.created_at).slice(0, 10) : "-",
      intake_date: dog.created_at ? String(dog.created_at).slice(0, 10) : "-",
    };
  };

  const mapKennel = (k: any, sectionName?: string) => ({
    id: k.id || k.kennel_id || "",
    cageNo: k.identifier || k.kennel_number || k.name || "",
    section: sectionName || k.section_name || "",
    capacity: k.capacity ?? "",
    status: k.sanitation_state || k.sanitation || "",
  });

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [facilitiesRes, dogsRes, rescueCasesRes] = await Promise.all([
        shelterService.getShelters({ page: 1, page_size: 20 }),
        petService.getPets({ page: 1, page_size: 20 }),
        rescueService.getRescueCases({ page: 1, page_size: 20 }),
      ]);

      const facList = unwrapList(facilitiesRes);
      const dogList = unwrapList(dogsRes).map(formatDog);
      const rescueCases = unwrapList(rescueCasesRes);

      setFacilities(facList);
      setDogs(dogList);

      // Filter incoming rescued dogs ready for intake
      const incoming = rescueCases.filter((c: any) => {
        const st = String(c.status || "").toLowerCase();
        return st === "rescued" || st === "admitted" || st === "completed";
      });
      setIncomingRescues(incoming);

      const totalCapacity = facList.reduce(
        (acc: number, f: any) => acc + (Number(f.total_capacity) || 0),
        0
      );
      const inShelterDogs = dogList.filter((d: any) =>
        IN_SHELTER_STATUSES.includes(String(d.status).toLowerCase())
      ).length;
      const adoptableDogs = dogList.filter((d: any) => d.is_adoptable).length;

      setDashboardData({
        total_facilities: facList.length,
        total_dogs: dogList.length,
        adoptable_dogs: adoptableDogs,
        in_shelter_dogs: inShelterDogs,
        total_capacity: totalCapacity,
        total_kennels: 0,
      });

      // Load kennels
      const sectionResults = await Promise.allSettled(
        facList.map((s: any) =>
          shelterService.getFacilitySections(s.facility_id ?? s.id)
        )
      );
      const sections = sectionResults.flatMap((r) =>
        r.status === "fulfilled" ? unwrapList(r.value) : []
      );

      const sectionNames: Record<string, string> = {};
      for (const sec of sections) {
        if (sec?.id) sectionNames[sec.id] = sec.name || sec.id;
      }

      const kennelResults = await Promise.allSettled(
        sections.map((sec: any) =>
          shelterService.getSectionKennels(sec.section_id ?? sec.id)
        )
      );
      const kennels = kennelResults.flatMap((r) =>
        r.status === "fulfilled" ? unwrapList(r.value) : []
      );
      setKennelRows(kennels.map((k: any) => mapKennel(k, sectionNames[k.section_id])));
      setDashboardData((prev) => ({ ...prev, total_kennels: kennels.length }));
    } catch (err: any) {
      console.error("Shelter Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load shelter manager metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useDataSync(fetchDashboard);

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Handlers for Rescued Dog Registration
  const handleOpenReceiveRescue = (caseItem: any) => {
    setPetForm({
      ...emptyPetForm,
      name: caseItem.animal_type ? `Rescued ${caseItem.animal_type}` : `Rescued Dog (${caseItem.ticket_number || caseItem.id})`,
      photo_url: caseItem.photo_url || "",
      rescue_case_id: caseItem.id || "",
      rescue_location: caseItem.location_address || "",
      rescue_date: caseItem.created_at ? String(caseItem.created_at).slice(0, 10) : "",
      intake_condition: caseItem.description || "Rescued animal handed over to shelter care",
      medical_notes: caseItem.notes || "",
      shelter_id: facilities[0]?.id || "",
      status: "shelter",
    });
    setIsRegisterModalOpen(true);
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
          rescue_case_id: petForm.rescue_case_id || undefined,
          rescue_date: petForm.rescue_date || undefined,
          rescue_location: petForm.rescue_location || undefined,
          shelter_id: petForm.shelter_id || undefined,
          intake_condition: petForm.intake_condition || undefined,
          medical_notes: petForm.medical_notes || undefined,
          is_adoptable: petForm.is_adoptable,
          status: petForm.status || "shelter",
        })
      );

      const createdDog = createdRes?.data || createdRes;
      const createdId = dogId(createdDog) || createdDog?.id;

      addToast(`Dog "${petForm.name}" registered into shelter care successfully!`, "success");
      setIsRegisterModalOpen(false);
      setPetForm({ ...emptyPetForm });
      fetchDashboard();
      notifyDataChanged();

      // Automatically prompt for Safety Tag Provisioning
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

  // Handlers for Edit Dog
  const handleEditDogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = dogId(selectedDog);
    if (!id) return;
    try {
      setIsSubmitting(true);
      await petService.updatePet(id, cleanPayload({
        name: petForm.name,
        breed: petForm.breed,
        gender: petForm.gender,
        estimated_age: petForm.estimated_age,
        age_months: petForm.age_months ? Number(petForm.age_months) : undefined,
        weight: petForm.weight ? Number(petForm.weight) : undefined,
        color: petForm.color,
        status: petForm.status,
        is_adoptable: petForm.is_adoptable,
      }));
      addToast(`Dog profile for "${petForm.name}" updated!`, "success");
      setIsEditModalOpen(false);
      setSelectedDog(null);
      fetchDashboard();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to update dog record.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safety Tag & QR Modal Handlers
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
      fetchDashboard();
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
      fetchDashboard();
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
      fetchDashboard();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.message || "Failed to assign dog to kennel.", "error");
    } finally {
      setCageLoading(false);
    }
  };

  // Supply Request Handler
  const handleSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplyForm.itemName) {
      addToast("Item name is required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await inventoryService.createInventoryItem({
        itemName: supplyForm.itemName,
        category: supplyForm.category,
        stock: supplyForm.stock,
        threshold: supplyForm.threshold,
      });
      addToast(`Supply request for "${supplyForm.itemName}" created!`, "success");
      setIsSupplyModalOpen(false);
      setSupplyForm({ itemName: "", category: "Food & Nutrition", stock: "50 kg", threshold: "10 kg", facilityId: "" });
      notifyDataChanged();
    } catch {
      addToast("Failed to submit supply request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report Generator Handler
  const handleGenerateReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = formatDateTime(new Date());
    let title = "Shelter Occupancy & Capacity Report";
    let body = `Total Shelter Dogs: ${dashboardData.total_dogs}\nAdoptable Dogs: ${dashboardData.adoptable_dogs}\nKennels Registered: ${dashboardData.total_kennels}\nCapacity Utilization: ${dashboardData.total_capacity > 0 ? Math.round((dashboardData.in_shelter_dogs / dashboardData.total_capacity) * 100) : 0}%`;

    if (reportType === "intake") {
      title = "Rescued Dog Intake & Registration Report";
      body = `Incoming Rescued Dogs Handed Over: ${incomingRescues.length}\nRegistered Dogs in Care: ${dogs.length}\nLast Updated: ${now}`;
    } else if (reportType === "tags") {
      title = "Safety Tag & QR Code Audit Report";
      body = `Active Safety Tags Provisioned: ${dogs.length}\nScan Activity Status: Operational\nLast Audit Date: ${now}`;
    }

    setReportGeneratedText(`=======================================\nPAWGUARD SHELTER OPERATIONS REPORT\n${title}\nGenerated Date: ${now}\n=======================================\n\n${body}`);
  };

  const filteredDogs = dogs.filter((d: any) => {
    const q = search.toLowerCase().trim();
    const nameMatch =
      !q ||
      String(d.name).toLowerCase().includes(q) ||
      String(d.registration_number).toLowerCase().includes(q) ||
      String(d.rescue_id).toLowerCase().includes(q) ||
      String(d.breed).toLowerCase().includes(q) ||
      String(d.medical_status).toLowerCase().includes(q) ||
      String(d.adoption_status).toLowerCase().includes(q) ||
      String(d.tag_status_label).toLowerCase().includes(q);
    const statusMatch = !statusFilter || String(d.status).toLowerCase() === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  });

  const { total_capacity, in_shelter_dogs } = dashboardData;
  const occupancyText = total_capacity > 0 ? `${Math.round((in_shelter_dogs / total_capacity) * 100)}%` : "N/A";

  const stats = [
    { title: "Shelter Dogs", value: loading ? "..." : dashboardData.total_dogs, trend: `${dashboardData.adoptable_dogs} Adoptable`, color: "#2563EB", icon: <FaHome />, onClick: () => navigate("/shelter-dogs") },
    { title: "Kennels", value: loading ? "..." : dashboardData.total_kennels, trend: "Registered Kennels", color: "#10B981", icon: <FaBed /> },
    { title: "Occupancy", value: loading ? "..." : occupancyText, trend: `${in_shelter_dogs} In Care / ${total_capacity} Capacity`, color: "#F59E0B", icon: <FaPaw /> },
    { title: "Facilities", value: loading ? "..." : dashboardData.total_facilities, trend: "Shelter Centers", color: "#6366F1", icon: <FaUsers />, onClick: () => navigate("/shelters") },
  ];

  const dogColumns = [
    {
      key: "name",
      title: "Dog Name & ID",
      render: (_val: any, row: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{row.name}</div>
          <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>ID: {row.registration_number}</div>
        </div>
      ),
    },
    {
      key: "rescue_id",
      title: "Rescue ID",
      render: (_val: any, row: any) => (
        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#475569", fontWeight: 600 }}>
          {row.rescue_id}
        </span>
      ),
    },
    {
      key: "breed",
      title: "Breed & Sex",
      render: (_val: any, row: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{row.breed}</div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {row.gender ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1) : "-"} &bull; {row.estimated_age}
          </div>
        </div>
      ),
    },
    { key: "intake_date", title: "Intake Date" },
    {
      key: "medical_status",
      title: "Medical Status",
      render: (_val: any, row: any) => (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 800,
            background: "#ECFDF5",
            color: "#047857",
            textTransform: "capitalize",
          }}
        >
          {row.medical_status}
        </span>
      ),
    },
    {
      key: "adoption_status",
      title: "Adoption Readiness",
      render: (_val: any, row: any) => (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 800,
            background: row.is_adoptable ? "#EFF6FF" : "#F1F5F9",
            color: row.is_adoptable ? "#1D4ED8" : "#475569",
          }}
        >
          {row.adoption_status}
        </span>
      ),
    },
    {
      key: "tag_status_label",
      title: "Safety Tag",
      render: (_val: any, row: any) => (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 800,
            background: row.has_active_tag ? "#F3E8FF" : "#FEE2E2",
            color: row.has_active_tag ? "#6D28D9" : "#991B1B",
            border: row.has_active_tag ? "1px solid #C4B5FD" : "1px solid #FCA5A5",
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
          Shelter Operations & Dog Intake Workspace
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Formally receive rescued animals, register intake details, provision authoritative Safety Tags & QR codes, assign cage allocations, and manage shelter care.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaBed />} title="Allocate Cage" subtitle="Assign dog to kennel" color="#2563EB" onClick={() => openCageModal()} />
        <QuickActionCard icon={<FaPlus />} title="Register Rescued Dog" subtitle="New intake entry" color="#10B981" onClick={() => { setPetForm({ ...emptyPetForm }); setIsRegisterModalOpen(true); }} />
        <QuickActionCard icon={<FaBoxes />} title="Request Supplies" subtitle="Food & Medicines" color="#F59E0B" onClick={() => setIsSupplyModalOpen(true)} />
        <QuickActionCard icon={<FaUsers />} title="Staff Roster" subtitle="View Shelter Staff" color="#6366F1" onClick={() => navigate("/users?role=shelter_staff")} />
        <QuickActionCard icon={<FaFileAlt />} title="Generate Report" subtitle="Operations summary" color="#8B5CF6" onClick={() => { setReportGeneratedText(null); setIsReportModalOpen(true); }} />
      </div>

      {/* Headline Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* INCOMING RESCUED ANIMALS QUEUE */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
              🚨 Incoming Rescued Animals Queue (Intake & Handover)
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              Rescued animals handed over by Rescue Agents awaiting shelter registration & Safety Tag assignment
            </span>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            <FaSync /> Refresh Queue
          </button>
        </div>

        {incomingRescues.length === 0 ? (
          <div style={{ padding: "24px", background: "#F8FAFC", borderRadius: "10px", border: "1px dashed #CBD5E1", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
            ✓ No pending rescued animals awaiting intake handover at this time.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
            {incomingRescues.map((c) => (
              <div key={c.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace", fontSize: "13px" }}>
                      Ticket #{c.ticket_number || c.id}
                    </span>
                    <span style={{ padding: "2px 8px", borderRadius: "999px", background: "#FEF3C7", color: "#92400E", fontSize: "11px", fontWeight: 700 }}>
                      Handed Over
                    </span>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "6px" }}>
                    {c.animal_type ? `Rescued ${c.animal_type}` : "Rescued Dog"} ({c.animal_count ?? 1} animal)
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "4px" }}>
                    <strong>Location:</strong> {c.location_address || "Specified Location"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                    <strong>Date:</strong> {c.created_at ? String(c.created_at).slice(0, 10) : "Today"}
                  </div>
                  {c.description && (
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "6px", background: "#F8FAFC", padding: "8px", borderRadius: "6px", fontStyle: "italic" }}>
                      "{c.description}"
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenReceiveRescue(c)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <FaPaw /> Receive & Register Dog
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REGISTERED RESCUED DOGS & DOG RECORDS DIRECTORY */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
              🐕 Rescued Dogs / Dog Records Directory
            </h3>
            <span style={{ fontSize: "12px", color: "#64748B" }}>
              View rescued dogs in shelter care, provision Safety Tags, download QR codes, and manage medical & adoption status
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Search name, Dog ID, Rescue ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "240px" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }}
            >
              <option value="">All Statuses</option>
              {DOG_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={dogColumns}
          data={filteredDogs}
          loading={loading}
          emptyMessage="No dogs registered in shelter care yet."
          renderRowActions={(row: any) => (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                title="View Dog Master File"
                onClick={() => { setSelectedDog(row); setIsViewMasterModalOpen(true); }}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaEye color="#2563EB" /> View
              </button>

              <button
                type="button"
                title="Edit Dog Record"
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

              {row.has_active_tag ? (
                <button
                  type="button"
                  title="View Active Safety Tag"
                  onClick={() => openQrModal(row)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: "#6D28D9", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaQrcode /> View Safety Tag
                </button>
              ) : (
                <button
                  type="button"
                  title="Generate Safety Tag"
                  onClick={() => openQrModal(row)}
                  style={{ padding: "6px 10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <FaQrcode /> Generate Safety Tag
                </button>
              )}

              <button
                type="button"
                title="Allocate Cage"
                onClick={() => openCageModal(row)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #2563EB", background: "#EFF6FF", color: "#2563EB", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaBed /> Allocate Cage
              </button>

              <button
                type="button"
                title="Medical Records"
                onClick={() => navigate(`/medical?dogId=${dogId(row)}`)}
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#64748B", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaStethoscope color="#DC2626" /> Medical
              </button>
            </div>
          )}
        />
      </div>

      {/* KENNEL REGISTRY TABLE */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700 }}>
          Kennel Registry & Sanitation Status
        </h3>
        <DataTable
          columns={[
            { key: "cageNo", title: "Cage / Ward" },
            { key: "section", title: "Section" },
            { key: "capacity", title: "Capacity" },
            { key: "status", title: "Sanitation State" },
          ]}
          data={kennelRows}
          loading={loading}
          emptyMessage="No kennels registered yet."
        />
      </div>

      {/* REGISTER RESCUED DOG INTAKE MODAL */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Rescued Dog Intake"
        maxWidth="640px"
      >
        <form onSubmit={handleRegisterPetSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Dog Name / Code Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Max or Rescued Dog (RSC-0042)"
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Photo URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={petForm.photo_url}
                onChange={(e) => setPetForm({ ...petForm, photo_url: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Breed / Type</label>
              <input
                type="text"
                placeholder="e.g. Indie Mix"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Estimated Age</label>
              <input
                type="text"
                placeholder="e.g. 2 years"
                value={petForm.estimated_age}
                onChange={(e) => setPetForm({ ...petForm, estimated_age: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Color / Marks</label>
              <input
                type="text"
                placeholder="e.g. Brown with white chest"
                value={petForm.color}
                onChange={(e) => setPetForm({ ...petForm, color: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Rescue Date</label>
              <input
                type="date"
                value={petForm.rescue_date}
                onChange={(e) => setPetForm({ ...petForm, rescue_date: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Rescue Location</label>
              <input
                type="text"
                placeholder="e.g. Sector 14, Main Road"
                value={petForm.rescue_location}
                onChange={(e) => setPetForm({ ...petForm, rescue_location: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Shelter Facility</label>
              <select
                value={petForm.shelter_id}
                onChange={(e) => setPetForm({ ...petForm, shelter_id: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                <option value="">Select facility...</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Intake Condition / Status</label>
              <input
                type="text"
                placeholder="e.g. Mild dehydration, stable"
                value={petForm.intake_condition}
                onChange={(e) => setPetForm({ ...petForm, intake_condition: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Medical / Intake Information</label>
            <textarea
              rows={2}
              placeholder="Initial medical observations, treatment given on intake..."
              value={petForm.medical_notes}
              onChange={(e) => setPetForm({ ...petForm, medical_notes: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
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
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, cursor: "pointer" }}
            >
              {isSubmitting ? "Registering..." : "Save & Register Dog"}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT DOG MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Dog Intake Details"
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#059669", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* DOG MASTER FILE VIEW MODAL */}
      <Modal
        isOpen={isViewMasterModalOpen}
        onClose={() => setIsViewMasterModalOpen(false)}
        title={`Dog Master Profile — ${selectedDog?.name || ""}`}
        maxWidth="600px"
      >
        {selectedDog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center", background: "#F8FAFC", padding: "14px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                🐶
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>{selectedDog.name}</div>
                <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Dog ID: {selectedDog.registration_number}</div>
                <div style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600, marginTop: "2px" }}>Rescue Reference: {selectedDog.rescue_id || "-"}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
              <div><strong>Breed:</strong> {selectedDog.breed}</div>
              <div><strong>Gender:</strong> {selectedDog.gender}</div>
              <div><strong>Estimated Age:</strong> {selectedDog.estimated_age}</div>
              <div><strong>Rescue Date:</strong> {selectedDog.rescue_date}</div>
              <div><strong>Intake Date:</strong> {selectedDog.intake_date}</div>
              <div><strong>Status:</strong> {selectedDog.status}</div>
              <div><strong>Medical Status:</strong> {selectedDog.medical_status}</div>
              <div><strong>Adoption Readiness:</strong> {selectedDog.adoption_status}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => { setIsViewMasterModalOpen(false); openQrModal(selectedDog); }}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaQrcode /> Open Safety Tag / QR
              </button>
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

      {/* SUPPLY REQUEST MODAL */}
      <Modal
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        title="Request Shelter Supplies & Inventory"
        maxWidth="480px"
      >
        <form onSubmit={handleSupplySubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Item Name / Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dog Kibble 20kg Bags or Antibiotic Vials"
              value={supplyForm.itemName}
              onChange={(e) => setSupplyForm({ ...supplyForm, itemName: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Category</label>
              <select
                value={supplyForm.category}
                onChange={(e) => setSupplyForm({ ...supplyForm, category: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                <option value="Food & Nutrition">Food & Nutrition</option>
                <option value="Medicines">Medicines</option>
                <option value="Vaccines">Vaccines</option>
                <option value="Supplies">Supplies</option>
                <option value="Gear">Gear</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Quantity Needed</label>
              <input
                type="text"
                placeholder="e.g. 50 kg"
                value={supplyForm.stock}
                onChange={(e) => setSupplyForm({ ...supplyForm, stock: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setIsSupplyModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#F59E0B", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Submitting..." : "Submit Supply Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* REPORT GENERATOR MODAL */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Generate Shelter Operational Report"
        maxWidth="520px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <form onSubmit={handleGenerateReportSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155" }}>Select Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
            >
              <option value="occupancy">Shelter Occupancy & Capacity Report</option>
              <option value="intake">Rescued Dog Intake & Registration Summary</option>
              <option value="tags">Safety Tag & QR Code Audit Report</option>
            </select>
            <button
              type="submit"
              style={{ padding: "10px", borderRadius: "8px", border: "none", background: "#8B5CF6", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
            >
              Generate Live Metrics Report
            </button>
          </form>

          {reportGeneratedText && (
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "8px", padding: "12px" }}>
              <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", color: "#334155", whiteSpace: "pre-wrap" }}>{reportGeneratedText}</pre>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([reportGeneratedText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  triggerDownload(url, `Shelter_Report_${reportType}.txt`);
                }}
                style={{ marginTop: "10px", width: "100%", padding: "8px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
              >
                Download Report File
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
                <span style={{ fontWeight: 800, color: "#0F172A", fontSize: "16px" }}>Dog Name: {qrDog.name || "-"}</span>
                <span style={{ padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: tagStatus === "ACTIVE" ? "#DCFCE7" : "#FEE2E2", color: tagStatus === "ACTIVE" ? "#166534" : "#991B1B", border: tagStatus === "ACTIVE" ? "1px solid #86EFAC" : "1px solid #FCA5A5", textTransform: "uppercase" }}>
                  Tag Status: {tagStatus}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Dog ID:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{qrDog.registration_number || qrDog.id || "-"}</span>
              </div>
              {qrDog.rescue_id && (
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  <strong>Rescue Case ID:</strong> <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#2563EB" }}>{qrDog.rescue_id}</span>
                </div>
              )}
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <strong>Breed:</strong> {qrDog.breed || "-"} &nbsp;|&nbsp; <strong>Gender:</strong> {qrDog.gender ? qrDog.gender.charAt(0).toUpperCase() + qrDog.gender.slice(1) : "-"}
              </div>
            </div>
          )}

          {/* SCAN ACTIVITY WATCH & TOKEN DISPLAY */}
          {qrDog && (
            <div style={{ width: "100%", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Scan Activity</div>
                  <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>
                    <strong>Total Scans:</strong> {String(tagMetadata?.scans_count ?? tagMetadata?.scan_count ?? 0)} &bull; <strong>Last Scanned:</strong> {tagMetadata?.last_scanned_at ? String(tagMetadata.last_scanned_at).slice(0, 16).replace("T", " ") : "Never"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRefreshScanData}
                  disabled={isRefreshingScanData}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontSize: "12px", fontWeight: 600, cursor: isRefreshingScanData ? "not-allowed" : "pointer" }}
                >
                  <FaSync style={{ animation: isRefreshingScanData ? "spin 1s linear infinite" : "none" }} />
                  {isRefreshingScanData ? "Refreshing..." : "Refresh Scan Data"}
                </button>
              </div>

              {rawToken && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFF", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 10px", marginTop: "4px" }}>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#6D28D9", fontWeight: 700 }}>
                    Token: {rawToken}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    style={{ padding: "4px 8px", borderRadius: "4px", border: "none", background: "#F3E8FF", color: "#6D28D9", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <FaCopy /> Copy Token
                  </button>
                </div>
              )}
            </div>
          )}

          {qrLoading && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ display: "inline-block", width: "32px", height: "32px", border: "3px solid #F3E8FF", borderTopColor: "#6D28D9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#64748B", fontWeight: 500 }}>Fetching unique Safety Tag metadata from backend...</div>
            </div>
          )}

          {!qrLoading && !qrError && !qrImageUrl && (
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#334155", padding: "24px 20px", borderRadius: "12px", fontSize: "13px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)" }}>
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
                  <div style={{ color: "#991B1B", fontWeight: 700, fontSize: "14px" }}>This pet does not have an active Safety Tag yet.</div>
                  <div style={{ fontSize: "12px", color: "#64748B", maxWidth: "400px", lineHeight: 1.5 }}>Please provision a Safety Tag to generate an authoritative QR code and safety token for this pet.</div>
                  <button type="button" onClick={() => handleProvisionTag()} disabled={isProvisioning} style={{ padding: "11px 24px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: isProvisioning ? "not-allowed" : "pointer" }}>
                    {isProvisioning ? "Provisioning..." : "Provision Safety Tag"}
                  </button>
                </>
              )}
            </div>
          )}

          {!qrLoading && !qrError && qrImageUrl && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <div style={{ padding: "18px", border: "2px solid #E2E8F0", borderRadius: "16px", background: "#FFFFFF", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <img src={qrImageUrl} alt={`Safety Tag QR Code for ${qrDog?.name || "Dog"}`} style={{ width: "240px", height: "240px", imageRendering: "pixelated", display: "block" }} />
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Scan this QR code to view pet safety information.</div>
              </div>

              {tagStatus === "ACTIVE" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
                  <button type="button" onClick={handleDownloadQr} style={{ padding: "11px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><FaDownload /> Download QR</button>
                  <button type="button" onClick={handlePrintQr} style={{ padding: "11px", borderRadius: "8px", border: "1px solid #C4B5FD", background: "#FFF", color: "#6D28D9", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><FaPrint /> Print Safety Tag</button>
                  {rawToken && (
                    <button type="button" onClick={() => window.open(`/scan-pet?token=${rawToken}`, "_blank")} style={{ padding: "11px", borderRadius: "8px", border: "1px solid #2563EB", background: "#EFF6FF", color: "#2563EB", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><FaExternalLinkAlt /> Public Scan</button>
                  )}
                  <button type="button" onClick={() => setIsDeactivateConfirmOpen(true)} style={{ padding: "11px", borderRadius: "8px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Deactivate Tag</button>
                </div>
              ) : (
                <button type="button" onClick={() => handleProvisionTag(true)} disabled={isProvisioning} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "13px" }}>
                  {isProvisioning ? "Re-Provisioning..." : "Re-Provision Safety Tag"}
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* RE-PROVISION CONFIRMATION MODAL */}
      <Modal isOpen={isReProvisionConfirmOpen} onClose={() => setIsReProvisionConfirmOpen(false)} title="Re-Provision Safety Tag?" maxWidth="450px">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            Re-provisioning this Safety Tag will generate a <strong>NEW raw token</strong> and invalidate the existing QR code tag for <strong>{qrDog?.name || "this pet"}</strong>. Continue?
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setIsReProvisionConfirmOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="button" onClick={() => handleProvisionTag(true)} disabled={isProvisioning} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700 }}>
              {isProvisioning ? "Re-Provisioning..." : "Confirm Re-Provision"}
            </button>
          </div>
        </div>
      </Modal>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      <Modal isOpen={isDeactivateConfirmOpen} onClose={() => setIsDeactivateConfirmOpen(false)} title="Deactivate Safety Tag?" maxWidth="440px">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            Are you sure you want to deactivate the Safety Tag for <strong>{qrDog?.name || "this pet"}</strong>?
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setIsDeactivateConfirmOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="button" onClick={handleDeactivateTag} disabled={isDeactivating} style={{ padding: "9px 16px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFF", fontWeight: 700 }}>
              {isDeactivating ? "Deactivating..." : "Confirm Deactivation"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ShelterManagerDashboard;
