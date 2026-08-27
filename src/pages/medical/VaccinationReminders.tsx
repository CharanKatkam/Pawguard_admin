import { useState, useEffect, useCallback } from "react";
import DataTable from "../../components/common/DataTable";
import type { Column } from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaSyringe,
  FaPills,
  FaBell,
  FaExclamationTriangle,
  FaTrash,
  FaPaperPlane,
  FaPlus,
  FaRedoAlt,
} from "react-icons/fa";
import reminderService from "../../services/reminderService";
import dogService from "../../services/dogService";
import notificationService from "../../services/notificationService";
import { notifyDataChanged, useDataSync } from "../../utils/dataSync";
import { getCurrentUserRole } from "../../utils/roleUtils";

type Row = Record<string, unknown>;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  boxSizing: "border-box",
};

const pick = (row: Row, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

const toErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { detail?: string; message?: string } } };
  return e?.response?.data?.detail || e?.response?.data?.message || fallback;
};

const badge = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
});

import { formatDateTime } from "../../utils/dateUtils";

const formatDate = (v: unknown): string => formatDateTime(v as string);

const parseTime = (v: unknown): number | null => {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  return isNaN(t) ? null : t;
};

type DueState = "overdue" | "due_soon" | "upcoming" | "none";

const dueStateOf = (due: unknown): DueState => {
  const t = parseTime(due);
  if (t === null) return "none";
  const now = Date.now();
  if (t < now) return "overdue";
  if (t - now <= 14 * 86400000) return "due_soon";
  return "upcoming";
};

const dueBadge = (state: DueState): React.ReactNode => {
  if (state === "overdue") return <span style={badge("#FEF2F2", "#EF4444")}>Overdue</span>;
  if (state === "due_soon") return <span style={badge("#FFFBEB", "#F59E0B")}>Due soon</span>;
  if (state === "upcoming") return <span style={badge("#EFF6FF", "#2563EB")}>Upcoming</span>;
  return <span style={badge("#F1F5F9", "#64748B")}>No due date</span>;
};

const dueCell = (v: unknown): React.ReactNode => {
  if (v === undefined || v === null || v === "") return <span style={badge("#F1F5F9", "#64748B")}>No due date</span>;
  return (
    <div>
      <div>{formatDate(v)}</div>
      <div style={{ marginTop: 4 }}>{dueBadge(dueStateOf(v))}</div>
    </div>
  );
};

const boolBadge = (value: unknown, activeBg: string, activeColor: string, inactiveBg: string, inactiveColor: string, activeLabel: string, inactiveLabel: string): React.ReactNode =>
  value ? (
    <span style={badge(activeBg, activeColor)}>{activeLabel}</span>
  ) : (
    <span style={badge(inactiveBg, inactiveColor)}>{inactiveLabel}</span>
  );

const VaccinationReminders = () => {
  const [dogs, setDogs] = useState<Row[]>([]);
  const [dogsLoading, setDogsLoading] = useState(true);
  const [dogsError, setDogsError] = useState<string | null>(null);
  const [dogId, setDogId] = useState("");

  const [vaccinations, setVaccinations] = useState<Row[]>([]);
  const [vaccLoading, setVaccLoading] = useState(false);
  const [vaccError, setVaccError] = useState<string | null>(null);

  const [prescriptions, setPrescriptions] = useState<Row[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);

  const [administrations, setAdministrations] = useState<Row[]>([]);

  const [activeTab, setActiveTab] = useState<"vaccination" | "medication" | "reminders">("vaccination");
  const [reminders, setReminders] = useState<Row[]>([]);
  const [remLoading, setRemLoading] = useState(false);
  const [remError, setRemError] = useState<string | null>(null);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    kind: "vaccination" as "vaccination" | "medication",
    title: "",
    due_at: "",
    details: "",
    source_key: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notifyTarget, setNotifyTarget] = useState<Row | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [togglingRxId, setTogglingRxId] = useState<string | null>(null);

  const { addToast } = useToast();

  const selectedDog = dogs.find((d) => pick(d, "id") === dogId) || null;
  const dogLabel = selectedDog
    ? str(pick(selectedDog, "name")) +
      (str(pick(selectedDog, "breed")) ? ` (${str(pick(selectedDog, "breed"))})` : "")
    : "";

  const fetchDogs = useCallback(async () => {
    try {
      setDogsLoading(true);
      setDogsError(null);
      const res = await dogService.getAllDogs();
      const list = Array.isArray(res?.data) ? res.data : [];
      setDogs(list);
      if (!dogId && list.length > 0) {
        setDogId(String(pick(list[0], "id") ?? ""));
      }
    } catch (err) {
      setDogsError(toErrorMessage(err, "Failed to load dogs."));
    } finally {
      setDogsLoading(false);
    }
  }, [dogId]);

  const fetchData = useCallback(async () => {
    if (!dogId) return;
    try {
      setVaccLoading(true);
      setVaccError(null);
      setRxLoading(true);
      setRxError(null);
      setRemLoading(true);
      setRemError(null);
      const isShelterManager = getCurrentUserRole() === "shelter_manager";
      const [vacc, rx, admin, rem] = await Promise.all([
        reminderService.getVaccinations({ dog_id: dogId, page: 1, page_size: 20 }),
        reminderService.getPrescriptions({ dog_id: dogId, page: 1, page_size: 20 }),
        reminderService.getDogAdministrations(dogId),
        isShelterManager
          ? reminderService.getPetReminders(dogId).catch(() => ({ data: [] }))
          : reminderService.getPetReminders(dogId),
      ]);
      setVaccinations(Array.isArray(vacc?.data) ? vacc.data : []);
      setPrescriptions(Array.isArray(rx?.data) ? rx.data : []);
      setAdministrations(Array.isArray(admin?.data) ? admin.data : []);
      setReminders(Array.isArray(rem?.data) ? rem.data : []);
    } catch (err) {
      const msg = toErrorMessage(err, "Failed to load reminders.");
      setVaccError(msg);
      setRxError(msg);
      setRemError(msg);
    } finally {
      setVaccLoading(false);
      setRxLoading(false);
      setRemLoading(false);
    }
  }, [dogId]);

  useDataSync(fetchData);

  useEffect(() => {
    void fetchDogs();
  }, [fetchDogs]);

  useEffect(() => {
    if (dogId) void fetchData();
  }, [dogId, fetchData]);

  const openReminderModal = (kind: "vaccination" | "medication", row: Row, petId: string) => {
    const due = kind === "vaccination" ? pick(row, "next_due_at") : pick(row, "end_at");
    const subject =
      kind === "vaccination" ? str(pick(row, "vaccine_name")) : str(pick(row, "drug_name"));
    setReminderForm({
      kind,
      title: subject ? `${subject} — due` : `${kind === "vaccination" ? "Vaccination" : "Medication"} due`,
      due_at: str(due),
      details: kind === "vaccination" ? "Vaccination booster due for this dog." : "Medication follow-up due for this dog.",
      source_key: `${kind}:${petId}`,
    });
    setIsReminderModalOpen(true);
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dogId || !reminderForm.title.trim() || !reminderForm.due_at) {
      addToast("Reminder title and due date are required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const dueIso = new Date(reminderForm.due_at).toISOString();
      await reminderService.createPetReminder(dogId, {
        kind: reminderForm.kind,
        title: reminderForm.title.trim(),
        due_at: dueIso,
        details: reminderForm.details.trim() || undefined,
        source_key: reminderForm.source_key,
      });
      addToast("Reminder created.", "success");
      setIsReminderModalOpen(false);
      void fetchData();
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to create reminder."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminderNotification = async () => {
    if (!notifyTarget || !dogId) return;
    try {
      setIsNotifying(true);
      await notificationService.sendBroadcastNotification({
        title: `Reminder: ${str(pick(notifyTarget, "title"))}`,
        message: `${dogLabel} — ${str(pick(notifyTarget, "kind"))} "${str(pick(notifyTarget, "title"))}" is due ${formatDate(
          pick(notifyTarget, "due_at")
        )}.`,
        type: "medical",
        targetRoles: ["super_admin", "rescue_centre_admin", "veterinarian", "shelter_manager"],
      });
      addToast("Reminder notification sent via Notifications module.", "success");
      setNotifyTarget(null);
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to send reminder notification."), "error");
    } finally {
      setIsNotifying(false);
    }
  };

  const handleDeleteReminder = async () => {
    if (!deleteTarget || !dogId) return;
    const reminderId = str(pick(deleteTarget, "id"));
    try {
      setIsDeleting(true);
      await reminderService.deletePetReminder(dogId, reminderId);
      addToast("Reminder removed.", "success");
      setDeleteTarget(null);
      void fetchData();
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to delete reminder."), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePrescription = async (row: Row) => {
    const rxId = str(pick(row, "id"));
    const nextActive = !pick(row, "is_active");
    try {
      setTogglingRxId(rxId);
      await reminderService.updatePrescriptionStatus(rxId, nextActive);
      addToast(`Prescription marked ${nextActive ? "active" : "inactive"}.`, "success");
      void fetchData();
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to update prescription status."), "error");
    } finally {
      setTogglingRxId(null);
    }
  };

  // ---- Derived stats ----
  const nowMs = Date.now();
  const upcomingVaccinations = vaccinations.filter(
    (v) => dueStateOf(pick(v, "next_due_at")) === "upcoming" || dueStateOf(pick(v, "next_due_at")) === "due_soon"
  ).length;
  const overdueVaccinations = vaccinations.filter(
    (v) => dueStateOf(pick(v, "next_due_at")) === "overdue"
  ).length;
  const activePrescriptions = prescriptions.filter((p) => {
    const end = parseTime(pick(p, "end_at"));
    return Boolean(pick(p, "is_active")) && (end === null || end >= nowMs);
  }).length;
  const activeReminders = reminders.filter((r) => Boolean(pick(r, "is_active"))).length;

  const stats = [
    {
      title: "Upcoming Vaccinations",
      value: `${upcomingVaccinations}`,
      trend: "Due in future",
      color: "#2563EB",
      icon: <FaBell />,
      onClick: () => {
        setActiveTab("vaccination");
        document.getElementById("vaccination-tab-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Overdue Vaccinations",
      value: `${overdueVaccinations}`,
      trend: "Action required",
      color: "#EF4444",
      icon: <FaExclamationTriangle />,
      onClick: () => {
        setActiveTab("vaccination");
        document.getElementById("vaccination-tab-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Active Medication Plans",
      value: `${activePrescriptions}`,
      trend: "Prescriptions",
      color: "#F59E0B",
      icon: <FaPills />,
      onClick: () => {
        setActiveTab("medication");
        document.getElementById("medication-tab-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
    {
      title: "Active Reminders",
      value: `${activeReminders}`,
      trend: "Pet reminders",
      color: "#10B981",
      icon: <FaSyringe />,
      onClick: () => {
        setActiveTab("reminders");
        document.getElementById("reminders-tab-section")?.scrollIntoView({ behavior: "smooth" });
      },
    },
  ];

  // ---- Tables ----
  const vaccinationColumns: Column[] = [
    { key: "vaccine_name", title: "Vaccine" },
    { key: "administered_at", title: "Administered", render: (v) => <span>{formatDate(v)}</span> },
    { key: "next_due_at", title: "Next Due", render: (v) => dueCell(v) },
    { key: "lot_number", title: "Lot Number" },
  ];

  const prescriptionColumns: Column[] = [
    { key: "drug_name", title: "Medication" },
    { key: "dosage", title: "Dosage" },
    { key: "route", title: "Route" },
    { key: "start_at", title: "Start", render: (v) => <span>{formatDate(v)}</span> },
    { key: "end_at", title: "End", render: (v) => <span>{formatDate(v)}</span> },
    {
      key: "is_active",
      title: "Schedule Status",
      render: (v, r) =>
        !v && parseTime(pick(r, "end_at")) !== null && parseTime(pick(r, "end_at"))! < Date.now()
          ? <span style={badge("#FEF2F2", "#EF4444")}>Ended</span>
          : boolBadge(v, "#ECFDF5", "#10B981", "#F1F5F9", "#64748B", "Active", "Inactive"),
    },
  ];

  const reminderColumns: Column[] = [
    { key: "title", title: "Reminder" },
    {
      key: "kind",
      title: "Type",
      render: (v) =>
        v === "medication" ? (
          <span style={badge("#FFFBEB", "#F59E0B")}>Medication</span>
        ) : (
          <span style={badge("#EFF6FF", "#2563EB")}>Vaccination</span>
        ),
    },
    { key: "due_at", title: "Due", render: (v) => dueCell(v) },
    { key: "details", title: "Details" },
    { key: "source_key", title: "Source" },
    {
      key: "is_active",
      title: "Reminder Status",
      render: (v) =>
        boolBadge(v, "#ECFDF5", "#10B981", "#F1F5F9", "#94A3B8", "Active", "Resolved"),
    },
  ];

  const administrationColumns: Column[] = [
    { key: "medication_name", title: "Medication" },
    { key: "dosage", title: "Dosage" },
    { key: "route", title: "Route" },
    { key: "administered_at", title: "Administered", render: (v) => <span>{formatDate(v)}</span> },
    { key: "notes", title: "Notes" },
  ];

  const sectionTitle = (title: string, subtitle: string) => (
    <div style={{ marginBottom: "12px" }}>
      <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0F172A" }}>{title}</h3>
      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>{subtitle}</p>
    </div>
  );

  const goToNotifications = () => {
    window.location.href = "/notifications";
  };

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Smart Vaccination & Medication Reminders</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Track vaccination due dates, medication schedules and pet reminders, then notify staff through the Notifications module.
        </p>
      </div>

      {/* Dog picker */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Dog *
            </label>
            <select
              value={dogId}
              onChange={(e) => setDogId(e.target.value)}
              style={inputStyle}
              disabled={dogsLoading}
            >
              <option value="">{dogsLoading ? "Loading dogs..." : "Select a dog..."}</option>
              {dogs.map((d) => (
                <option key={str(pick(d, "id"))} value={str(pick(d, "id"))}>
                  {str(pick(d, "name"))}
                  {str(pick(d, "breed")) ? ` (${str(pick(d, "breed"))})` : ""} — {str(pick(d, "id"))}
                </option>
              ))}
            </select>
            {dogsError && <p style={{ margin: "8px 0 0", fontSize: "12.5px", color: "#DC2626" }}>{dogsError}</p>}
          </div>
          <div>
            <button
              onClick={() => dogId && void fetchData()}
              disabled={!dogId}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "9px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: dogId ? "#0F172A" : "#94A3B8", fontWeight: 600, fontSize: "13px", cursor: dogId ? "pointer" : "not-allowed" }}
            >
              <FaRedoAlt size={12} /> Refresh
            </button>
          </div>
          <div>
            <button
              onClick={goToNotifications}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 18px", borderRadius: "9px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              <FaBell size={13} /> View Notifications
            </button>
          </div>
        </div>
      </div>

      {!dogId && !dogsLoading && (
        <div className="soft-card" style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>
          <FaSyringe size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: "15px" }}>Select a dog to view its vaccination schedule, medication plans and reminders.</p>
        </div>
      )}

      {dogId && dogsLoading && (
        <div style={{ textAlign: "center", padding: "30px", color: "#64748B" }}>Loading dogs...</div>
      )}

      {dogId && !dogsLoading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {stats.map((s) => (
              <StatCard key={s.title} {...s} />
            ))}
          </div>

          {vaccError || rxError || remError ? (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: "13px" }}>
              {(vaccError || rxError || remError) && <div>{vaccError || rxError || remError}</div>}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("vaccination")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: activeTab === "vaccination" ? "#2563EB" : "#FFFFFF",
                color: activeTab === "vaccination" ? "#FFFFFF" : "#475569",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <FaSyringe /> Vaccination Schedule
            </button>
            <button
              onClick={() => setActiveTab("medication")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: activeTab === "medication" ? "#2563EB" : "#FFFFFF",
                color: activeTab === "medication" ? "#FFFFFF" : "#475569",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <FaPills /> Medication Schedule
            </button>
            <button
              onClick={() => setActiveTab("reminders")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: activeTab === "reminders" ? "#2563EB" : "#FFFFFF",
                color: activeTab === "reminders" ? "#FFFFFF" : "#475569",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <FaBell /> Pet Reminders
            </button>
          </div>

          {activeTab === "vaccination" && (
            <div id="vaccination-tab-section" className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
              {sectionTitle("Vaccination Schedule", `Booster due dates derived from administered vaccines for ${dogLabel}.`)}
              <DataTable
                columns={vaccinationColumns}
                data={vaccinations}
                module="medical"
                loading={vaccLoading}
                emptyMessage="No vaccination records for this dog yet."
                renderRowActions={(row) => (
                  <Can permission="create_medical">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReminderModal("vaccination", row, dogId);
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 600, fontSize: "12px", cursor: "pointer", marginRight: "6px" }}
                    >
                      <FaPlus size={11} /> Create reminder
                    </button>
                  </Can>
                )}
              />
            </div>
          )}

          {activeTab === "medication" && (
            <div id="medication-tab-section" className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
              {sectionTitle("Medication Schedule", `Prescription windows (start/end) and administration log for ${dogLabel}.`)}
              <DataTable
                columns={prescriptionColumns}
                data={prescriptions}
                module="medical"
                loading={rxLoading}
                emptyMessage="No medication prescriptions for this dog."
                renderRowActions={(row) => (
                  <>
                    <Can permission="create_medical">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReminderModal("medication", row, dogId);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 600, fontSize: "12px", cursor: "pointer", marginRight: "6px" }}
                      >
                        <FaPlus size={11} /> Create reminder
                      </button>
                    </Can>
                    <Can permission="edit_medical">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleTogglePrescription(row);
                        }}
                        disabled={togglingRxId === str(pick(row, "id"))}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontWeight: 600, fontSize: "12px", cursor: "pointer", marginRight: "6px" }}
                      >
                        {pick(row, "is_active") ? "Mark Inactive" : "Mark Active"}
                      </button>
                    </Can>
                  </>
                )}
              />
              {administrations.length > 0 ? (
                <div style={{ marginTop: "20px" }}>
                  <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    Administration Log ({administrations.length})
                  </p>
                  <DataTable columns={administrationColumns} data={administrations} emptyMessage="No administrations logged." />
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "reminders" && (
            <div id="reminders-tab-section" className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
              {sectionTitle("Pet Reminders", `Active vaccination / medication reminders for ${dogLabel}.`)}
              <DataTable
                columns={reminderColumns}
                data={reminders}
                module="medical"
                loading={remLoading}
                emptyMessage="No reminders created for this dog."
                renderRowActions={(row) => (
                  <>
                    <Can permission="create_medical">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifyTarget(row);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 600, fontSize: "12px", cursor: "pointer", marginRight: "6px" }}
                      >
                        <FaPaperPlane size={11} /> Send reminder
                      </button>
                    </Can>
                    <Can permission="delete_medical">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(row);
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #FECACA", background: "#FEF2F2", color: "#EF4444", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                      >
                        <FaTrash size={11} /> Delete
                      </button>
                    </Can>
                  </>
                )}
              />
            </div>
          )}
        </>
      )}

      {/* Create Reminder Modal */}
      <Modal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} title="Create Vaccination / Medication Reminder" maxWidth="560px">
        <form onSubmit={handleCreateReminder} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Kind</label>
              <select
                value={reminderForm.kind}
                onChange={(e) => setReminderForm({ ...reminderForm, kind: e.target.value as "vaccination" | "medication" })}
                style={inputStyle}
              >
                <option value="vaccination">Vaccination</option>
                <option value="medication">Medication</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Due *</label>
              <input
                type="datetime-local"
                required
                value={reminderForm.due_at}
                onChange={(e) => setReminderForm({ ...reminderForm, due_at: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rabies booster — due"
              value={reminderForm.title}
              onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Details</label>
            <textarea
              rows={3}
              value={reminderForm.details}
              onChange={(e) => setReminderForm({ ...reminderForm, details: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Source Key</label>
            <input type="text" readOnly value={reminderForm.source_key} style={{ ...inputStyle, background: "#F1F5F9", color: "#64748B" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsReminderModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600, cursor: "pointer" }}>{isSubmitting ? "Saving..." : "Create Reminder"}</button>
          </div>
        </form>
      </Modal>

      {/* Send reminder notification Modal */}
      <Modal isOpen={notifyTarget !== null} onClose={() => setNotifyTarget(null)} title="Send Reminder Notification" maxWidth="520px">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#334155", lineHeight: 1.6 }}>
            Send a <strong>medical</strong> notification through the existing Notifications module to all active staff
            (super admin, rescue centre admin, veterinarian, shelter manager):
          </p>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
              {notifyTarget ? str(pick(notifyTarget, "title")) : ""}
            </div>
            <div style={{ fontSize: "13px", color: "#475569", marginTop: 6 }}>
              {dogLabel} — {notifyTarget ? str(pick(notifyTarget, "kind")) : ""} due {notifyTarget ? formatDate(pick(notifyTarget, "due_at")) : ""}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" onClick={() => setNotifyTarget(null)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={handleSendReminderNotification} disabled={isNotifying} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}>{isNotifying ? "Sending..." : "Send Notification"}</button>
          </div>
        </div>
      </Modal>

      {/* Delete reminder Modal */}
      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete Reminder" maxWidth="450px">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, color: "#334155" }}>
            Are you sure you want to delete the reminder <strong>{deleteTarget ? str(pick(deleteTarget, "title")) : ""}</strong> for {dogLabel}?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setDeleteTarget(null)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isDeleting} onClick={handleDeleteReminder} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}><FaTrash /> {isDeleting ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VaccinationReminders;