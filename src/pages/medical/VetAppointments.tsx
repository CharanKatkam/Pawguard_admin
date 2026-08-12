import { useState, useEffect, useCallback } from "react";
import type { Column } from "../../components/common/DataTable";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaHospital,
  FaCalendarAlt,
  FaPlus,
  FaCheck,
  FaBan,
  FaSearch,
} from "react-icons/fa";
import vetService from "../../services/vetService";
import dogService from "../../services/dogService";
import { notifyDataChanged } from "../../utils/dataSync";

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

const formatDate = (v: unknown): string => {
  if (!v) return "-";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
};

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  display: "inline-block",
  textTransform: "capitalize",
});

const VetAppointments = () => {
  const [activeTab, setActiveTab] = useState<"directory" | "appointments">("directory");

  // Vet directory state
  const [clinics, setClinics] = useState<Row[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [clinicsError, setClinicsError] = useState<string | null>(null);
  const [clinicSearch, setClinicSearch] = useState("");

  // Appointments state
  const [appointments, setAppointments] = useState<Row[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // Dog Management data used for appointment pet selection + display
  const [dogs, setDogs] = useState<Row[]>([]);

  // Booking modal state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingClinics, setBookingClinics] = useState<Row[]>([]);
  const [bookingForm, setBookingForm] = useState({
    pet_id: "",
    clinic_id: "",
    starts_at: "",
    ends_at: "",
    reason: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchClinics = useCallback(async (search: string) => {
    try {
      setClinicsLoading(true);
      setClinicsError(null);
      const res = await vetService.getClinics({
        search: search.trim() || undefined,
        page: 1,
        page_size: 100,
      });
      setClinics(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setClinicsError(toErrorMessage(err, "Failed to load veterinary clinics."));
    } finally {
      setClinicsLoading(false);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setAppointmentsLoading(true);
      setAppointmentsError(null);
      const res = await vetService.getAppointments({ page: 1, page_size: 100 });
      setAppointments(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setAppointmentsError(toErrorMessage(err, "Failed to load appointments."));
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  const fetchDogs = useCallback(async () => {
    try {
      const res = await dogService.getAllDogs();
      setDogs(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setDogs([]);
    }
  }, []);

  // Initial load is deferred so state updates happen outside the effect body
  // (avoids cascading renders and satisfies the React hooks linter).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDogs();
      void fetchAppointments();
      void fetchClinics("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDogs, fetchAppointments, fetchClinics]);

  // Debounced server-side search for the vet directory
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchClinics(clinicSearch);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [clinicSearch, fetchClinics]);

  const clinicName = (id: unknown): string => {
    const match = clinics.find((c) => pick(c, "id") === id);
    return match ? str(pick(match, "name")) : id ? str(id) : "-";
  };

  const dogName = (id: unknown): string => {
    const match = dogs.find((d) => pick(d, "id") === id);
    return match ? str(pick(match, "name")) || str(id) : id ? str(id) : "-";
  };

  const dogLabel = (d: Row): string => {
    const name = str(pick(d, "name"));
    const breed = str(pick(d, "breed"));
    return name ? (breed ? `${name} (${breed})` : name) : str(pick(d, "id")) || "Unknown dog";
  };

  const openBooking = async () => {
    setBookingForm({ pet_id: "", clinic_id: "", starts_at: "", ends_at: "", reason: "", notes: "" });
    setIsBookingOpen(true);
    try {
      const res = await vetService.getClinics({ page: 1, page_size: 100 });
      setBookingClinics(Array.isArray(res?.data) ? res.data : clinics);
    } catch {
      setBookingClinics(clinics);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.pet_id) {
      addToast("Please select a dog.", "error");
      return;
    }
    if (!bookingForm.clinic_id) {
      addToast("Please select a clinic.", "error");
      return;
    }
    if (!bookingForm.starts_at || !bookingForm.ends_at) {
      addToast("Start and end date/time are required.", "error");
      return;
    }
    if (!bookingForm.reason.trim()) {
      addToast("A reason for the appointment is required.", "error");
      return;
    }
    if (new Date(bookingForm.ends_at) <= new Date(bookingForm.starts_at)) {
      addToast("End time must be after the start time.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await vetService.bookAppointment({
        pet_id: bookingForm.pet_id,
        clinic_id: bookingForm.clinic_id,
        starts_at: new Date(bookingForm.starts_at).toISOString(),
        ends_at: new Date(bookingForm.ends_at).toISOString(),
        reason: bookingForm.reason.trim(),
        notes: bookingForm.notes.trim() || null,
      });
      addToast("Veterinary appointment booked successfully!", "success");
      setIsBookingOpen(false);
      setBookingForm({ pet_id: "", clinic_id: "", starts_at: "", ends_at: "", reason: "", notes: "" });
      void fetchAppointments();
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to book appointment."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const id = str(pick(cancelTarget, "id"));
    if (!id) return;
    try {
      setIsCancelling(true);
      await vetService.cancelAppointment(id, cancelReason.trim() || undefined);
      addToast("Appointment cancelled.", "success");
      setCancelTarget(null);
      setCancelReason("");
      void fetchAppointments();
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to cancel appointment."), "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirm = async (row: Row) => {
    const id = str(pick(row, "id"));
    if (!id) return;
    try {
      setConfirmingId(id);
      await vetService.confirmAppointment(id);
      addToast("Appointment confirmed.", "success");
      void fetchAppointments();
      notifyDataChanged();
    } catch (err) {
      addToast(toErrorMessage(err, "Failed to confirm appointment."), "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const renderStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === "confirmed" || s === "completed") return <span style={badgeStyle("#ECFDF5", "#10B981")}>{status}</span>;
    if (s === "requested") return <span style={badgeStyle("#FFFBEB", "#F59E0B")}>{status}</span>;
    if (s === "cancelled") return <span style={badgeStyle("#FEF2F2", "#EF4444")}>{status}</span>;
    if (s === "no_show") return <span style={badgeStyle("#F1F5F9", "#64748B")}>{status}</span>;
    return <span style={badgeStyle("#F1F5F9", "#475569")}>{status}</span>;
  };

  const directoryColumns: Column[] = [
    { key: "name", title: "Clinic / Veterinarian" },
    {
      key: "services",
      title: "Services / Specialization",
      render: (v) => str(v) || "-",
    },
    {
      key: "phone",
      title: "Contact",
      render: (v, r) => {
        const email = str(pick(r, "email"));
        return (
          <div>
            <div>{str(v) || "-"}</div>
            {email && <div style={{ fontSize: "12px", color: "#64748B" }}>{email}</div>}
          </div>
        );
      },
    },
    {
      key: "address",
      title: "Location",
      render: (v, r) => {
        const lat = pick(r, "latitude");
        const lng = pick(r, "longitude");
        return (
          <div>
            <div>{str(v) || "-"}</div>
            {lat !== undefined && lng !== undefined && (
              <div style={{ fontSize: "12px", color: "#64748B" }}>
                {str(lat)}, {str(lng)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "is_emergency",
      title: "Type",
      render: (v) => (
        <span style={badgeStyle(v ? "#FEF2F2" : "#EFF6FF", v ? "#DC2626" : "#2563EB")}>
          {v ? "Emergency" : "General"}
        </span>
      ),
    },
  ];

  const appointmentColumns: Column[] = [
    { key: "pet_id", title: "Dog", render: (v) => dogName(v) },
    { key: "clinic_id", title: "Clinic", render: (v) => clinicName(v) },
    { key: "starts_at", title: "Date / Time", render: (v) => formatDate(v) },
    { key: "ends_at", title: "Ends", render: (v) => formatDate(v) },
    { key: "reason", title: "Reason" },
    { key: "status", title: "Status", render: (v) => renderStatus(str(v)) },
  ];

  const appointmentRowActions = (row: Row) => {
    const status = str(pick(row, "status")).toLowerCase();
    const id = str(pick(row, "id"));
    const canCancel = status !== "cancelled" && status !== "completed" && status !== "no_show";
    return (
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        {status === "requested" && (
          <Can permission="edit_medical">
            <button
              onClick={() => void handleConfirm(row)}
              disabled={confirmingId === id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #6EE7B7",
                background: "#FFFFFF",
                color: "#047857",
                fontSize: "12px",
                fontWeight: 600,
                cursor: confirmingId === id ? "not-allowed" : "pointer",
              }}
            >
              <FaCheck /> {confirmingId === id ? "Confirming..." : "Confirm"}
            </button>
          </Can>
        )}
        {canCancel && (
          <Can permission="edit_medical">
            <button
              onClick={() => setCancelTarget(row)}
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
              <FaBan /> Cancel
            </button>
          </Can>
        )}
      </div>
    );
  };

  const tabStyle = (tab: "directory" | "appointments"): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 18px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    background: activeTab === tab ? "#2563EB" : "#FFFFFF",
    color: activeTab === tab ? "#FFFFFF" : "#475569",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  });

  return (
    <div>
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>
          Vet Directory & Appointment Booking
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Veterinary clinic directory and appointment scheduling for rescued dogs under medical care.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <Can permission="create_medical">
          <QuickActionCard
            icon={<FaPlus />}
            title="Book Appointment"
            subtitle="Schedule a vet visit"
            color="#06B6D4"
            onClick={() => void openBooking()}
          />
        </Can>
        <QuickActionCard
          icon={<FaHospital />}
          title="Vet Directory"
          subtitle="Browse clinics & vets"
          color="#2563EB"
          onClick={() => setActiveTab("directory")}
        />
        <QuickActionCard
          icon={<FaCalendarAlt />}
          title="Appointments"
          subtitle="View bookings & status"
          color="#10B981"
          onClick={() => setActiveTab("appointments")}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setActiveTab("directory")} style={tabStyle("directory")}>
          <FaHospital /> Vet Directory
        </button>
        <button onClick={() => setActiveTab("appointments")} style={tabStyle("appointments")}>
          <FaCalendarAlt /> Appointments
        </button>
      </div>

      {activeTab === "directory" && (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Veterinary Clinics & Veterinarians
            </h3>
            <div style={{ position: "relative", minWidth: "260px" }}>
              <FaSearch
                size={14}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94A3B8",
                }}
              />
              <input
                type="text"
                placeholder="Search by name, address, services..."
                value={clinicSearch}
                onChange={(e) => setClinicSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <DataTable
            columns={directoryColumns}
            data={clinics}
            module="medical"
            loading={clinicsLoading}
            error={clinicsError}
            onRetry={() => void fetchClinics(clinicSearch)}
            emptyMessage="No veterinary clinics found. Add clinics through the backend veterinary network, or try a different search."
          />
        </div>
      )}

      {activeTab === "appointments" && (
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
              Veterinary Appointments
            </h3>
            {appointmentsLoading && (
              <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>
                Loading appointments...
              </span>
            )}
          </div>
          <DataTable
            columns={appointmentColumns}
            data={appointments}
            module="medical"
            loading={appointmentsLoading}
            error={appointmentsError}
            onRetry={() => void fetchAppointments()}
            renderRowActions={appointmentRowActions}
            emptyMessage="No appointments found for your access level. Book an appointment to get started."
          />
        </div>
      )}

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        title="Book Veterinary Appointment"
        maxWidth="560px"
      >
        <form onSubmit={handleBook} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Dog *
            </label>
            <select
              required
              value={bookingForm.pet_id}
              onChange={(e) => setBookingForm({ ...bookingForm, pet_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={str(pick(d, "id"))} value={str(pick(d, "id"))}>
                  {dogLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Clinic / Vet *
            </label>
            <select
              required
              value={bookingForm.clinic_id}
              onChange={(e) => setBookingForm({ ...bookingForm, clinic_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select clinic...</option>
              {bookingClinics.map((c) => (
                <option key={str(pick(c, "id"))} value={str(pick(c, "id"))}>
                  {str(pick(c, "name"))}
                  {str(pick(c, "address")) ? ` — ${str(pick(c, "address"))}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Start Date / Time *
              </label>
              <input
                type="datetime-local"
                required
                value={bookingForm.starts_at}
                onChange={(e) => setBookingForm({ ...bookingForm, starts_at: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                End Date / Time *
              </label>
              <input
                type="datetime-local"
                required
                value={bookingForm.ends_at}
                onChange={(e) => setBookingForm({ ...bookingForm, ends_at: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Reason *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vaccination booster"
              value={bookingForm.reason}
              onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Notes
            </label>
            <input
              type="text"
              placeholder="Optional notes for the clinic"
              value={bookingForm.notes}
              onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsBookingOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#06B6D4", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setCancelReason("");
        }}
        title="Cancel Appointment"
        maxWidth="460px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to cancel the appointment for{" "}
            <strong>{cancelTarget ? dogName(pick(cancelTarget, "pet_id")) : ""}</strong> at{" "}
            <strong>{cancelTarget ? clinicName(pick(cancelTarget, "clinic_id")) : ""}</strong>?
          </p>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Cancellation Reason
            </label>
            <input
              type="text"
              placeholder="Optional reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason("");
              }}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Keep Appointment
            </button>
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => void handleCancel()}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaBan /> {isCancelling ? "Cancelling..." : "Cancel Appointment"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VetAppointments;
