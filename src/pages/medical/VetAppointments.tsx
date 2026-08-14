import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Column } from "../../components/common/DataTable";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaHospital,
  FaCalendarAlt,
  FaCheck,
  FaBan,
  FaSearch,
  FaStethoscope,
} from "react-icons/fa";
import vetService from "../../services/vetService";
import dogService from "../../services/dogService";
import { notifyDataChanged } from "../../utils/dataSync";

type Row = Record<string, unknown>;

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"directory" | "appointments">("appointments");

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

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Doctor modal state
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Row | null>(null);
  const [clinicDoctors, setClinicDoctors] = useState<Row[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchDogs();
      void fetchAppointments();
      void fetchClinics("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDogs, fetchAppointments, fetchClinics]);

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

  const ownerName = (r: Row): string => {
    const val = pick(r, "owner_name", "user_name", "reporter_name", "owner_id", "user_id", "created_by");
    return str(val) || "PawGuard User";
  };

  const vetName = (r: Row): string => {
    const val = pick(r, "vet_name", "doctor_name", "veterinarian_name", "veterinarian_id", "vet_id", "doctor_id");
    return str(val) || "On-Duty Clinic Vet";
  };

  const openClinicDoctors = async (clinic: Row) => {
    setSelectedClinic(clinic);
    setIsDoctorModalOpen(true);
    const clinicId = str(pick(clinic, "id"));
    if (!clinicId) return;
    try {
      setDoctorsLoading(true);
      const docs = await vetService.getClinicVeterinarians(clinicId);
      setClinicDoctors(Array.isArray(docs?.data) ? (docs.data as Row[]) : Array.isArray(docs) ? (docs as Row[]) : []);
    } catch {
      setClinicDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const id = str(pick(cancelTarget, "id", "appointment_id"));
    if (!id) return;
    try {
      setIsCancelling(true);
      await vetService.cancelAppointment(id, cancelReason.trim() || undefined);
      addToast("Appointment cancelled successfully.", "success");
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
    const id = str(pick(row, "id", "appointment_id"));
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
    if (s === "requested" || s === "pending") return <span style={badgeStyle("#FFFBEB", "#F59E0B")}>{status}</span>;
    if (s === "cancelled") return <span style={badgeStyle("#FEF2F2", "#EF4444")}>{status}</span>;
    if (s === "no_show") return <span style={badgeStyle("#F1F5F9", "#64748B")}>{status}</span>;
    return <span style={badgeStyle("#F1F5F9", "#475569")}>{status}</span>;
  };

  const directoryColumns: Column[] = [
    { key: "name", title: "Clinic / Hospital" },
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
    { key: "id", title: "Appt ID", render: (v, r) => str(v || pick(r, "appointment_id") || "-") },
    { key: "pet_id", title: "Dog / Pet", render: (v) => dogName(v) },
    { key: "owner", title: "Owner / Submitter", render: (_, r) => ownerName(r) },
    { key: "clinic_id", title: "Clinic", render: (v) => clinicName(v) },
    { key: "vet", title: "Requested / Assigned Vet", render: (_, r) => vetName(r) },
    { key: "starts_at", title: "Date & Time", render: (v) => formatDate(v) },
    { key: "reason", title: "Reason for Visit", render: (v) => str(v) || "-" },
    {
      key: "source",
      title: "Source / Channel",
      render: (_, r) => {
        const src = pick(r, "source", "channel", "platform", "booking_source");
        return src ? (
          <span style={badgeStyle("#EFF6FF", "#1D4ED8")}>{String(src).toUpperCase()}</span>
        ) : null;
      },
    },
    { key: "notes", title: "Notes", render: (v) => str(v) || "-" },
    { key: "status", title: "Status", render: (v) => renderStatus(str(v)) },
  ];

  const appointmentRowActions = (row: Row) => {
    const status = str(pick(row, "status")).toLowerCase();
    const id = str(pick(row, "id", "appointment_id"));
    const canCancel = status !== "cancelled" && status !== "completed" && status !== "no_show";
    return (
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        {(status === "requested" || status === "pending" || status === "confirmed") && (
          <Can permission="edit_medical">
            <button
              onClick={() => navigate("/dashboard/veterinarian")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#2563EB",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <FaStethoscope /> Consultation
            </button>
          </Can>
        )}
        {(status === "requested" || status === "pending") && (
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
          Veterinary Appointments & Directory
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Received veterinary appointments submitted by PawGuard users through supported web and mobile channels.
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
        <QuickActionCard
          icon={<FaCalendarAlt />}
          title="Received Appointments"
          subtitle="View user bookings"
          color="#10B981"
          onClick={() => setActiveTab("appointments")}
        />
        <QuickActionCard
          icon={<FaHospital />}
          title="Vet Directory"
          subtitle="Browse clinics & vets"
          color="#2563EB"
          onClick={() => setActiveTab("directory")}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setActiveTab("appointments")} style={tabStyle("appointments")}>
          <FaCalendarAlt /> Received Appointments
        </button>
        <button onClick={() => setActiveTab("directory")} style={tabStyle("directory")}>
          <FaHospital /> Vet Directory
        </button>
      </div>

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
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                Received Appointments
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
                Appointments submitted by PawGuard users through supported web and mobile channels.
              </p>
            </div>
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
            emptyMessage="No appointments received yet."
          />
        </div>
      )}

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
            emptyMessage="No veterinary clinics found."
            renderRowActions={(row: Row) => (
              <button
                onClick={() => void openClinicDoctors(row)}
                style={{
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
                View Doctors / Vets
              </button>
            )}
          />
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {cancelTarget && (
        <Modal
          isOpen={true}
          onClose={() => {
            setCancelTarget(null);
            setCancelReason("");
          }}
          title="Cancel Veterinary Appointment"
          maxWidth="460px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#334155" }}>
              Are you sure you want to cancel the appointment for{" "}
              <strong>{dogName(pick(cancelTarget, "pet_id"))}</strong> at{" "}
              <strong>{clinicName(pick(cancelTarget, "clinic_id"))}</strong>?
            </p>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", color: "#334155" }}>
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Specify why the appointment is being cancelled..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  background: "#F1F5F9",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => void handleCancel()}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  cursor: isCancelling ? "wait" : "pointer",
                }}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clinic Doctors Modal */}
      {isDoctorModalOpen && selectedClinic && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsDoctorModalOpen(false);
            setSelectedClinic(null);
            setClinicDoctors([]);
          }}
          title={`Veterinarians — ${str(pick(selectedClinic, "name"))}`}
          maxWidth="640px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontWeight: 700, color: "#0F172A", fontSize: "16px" }}>{str(pick(selectedClinic, "name"))}</div>
              <div style={{ fontSize: "13px", color: "#64748B", marginTop: "4px" }}>
                Address: {str(pick(selectedClinic, "address")) || "Main Branch"} &bull; Contact: {str(pick(selectedClinic, "phone")) || "Direct Line"}
              </div>
            </div>

            <div style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>Assigned Doctors &amp; Specialists:</div>

            {doctorsLoading ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#2563EB", fontSize: "13px" }}>Loading assigned veterinarians...</div>
            ) : clinicDoctors.length === 0 ? (
              <div style={{ background: "#F1F5F9", borderRadius: "8px", padding: "20px", textAlign: "center", color: "#64748B", fontSize: "13px" }}>
                No explicit doctor profiles listed under this clinic location yet. Consultations are handled by on-duty clinic staff.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", maxHeight: "250px", overflowY: "auto" }}>
                {clinicDoctors.map((doc: Row, idx: number) => (
                  <div key={idx} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>{str(pick(doc, "name", "full_name")) || `Dr. Veterinarian #${idx + 1}`}</div>
                      <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                        Specialization: {str(pick(doc, "specialization", "services")) || "General Practice"} &bull; Phone: {str(pick(doc, "phone")) || "-"}
                      </div>
                    </div>
                    <span style={badgeStyle("#ECFDF5", "#059669")}>{str(pick(doc, "status")) || "Active"}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDoctorModalOpen(false);
                  setSelectedClinic(null);
                  setClinicDoctors([]);
                }}
                style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default VetAppointments;
