import { useState, useEffect, useCallback } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaUserFriends,
  FaClipboardList,
  FaPlus,
  FaUserCheck,
  FaUserTimes,
  FaClock,
  FaSignInAlt,
  FaSignOutAlt,
  FaAward,
  FaFilter,
  FaSync,
  FaSearch,
  FaEye,
} from "react-icons/fa";
import volunteerService from "../../services/volunteerService";
import shelterService from "../../services/shelterService";
import { notifyDataChanged } from "../../utils/dataSync";
import { formatDateTime } from "../../utils/dateUtils";

type TabKey = "directory" | "shifts";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "applied", label: "Applied" },
  { value: "onboarded", label: "Onboarded" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const VolunteerManagement = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("directory");

  // Volunteers State
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volLoading, setVolLoading] = useState(true);
  const [volError, setVolError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Shifts State
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState<string | null>(null);

  // Facilities List
  const [facilities, setFacilities] = useState<any[]>([]);

  // Modals state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any | null>(null);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

  // Application Form
  const [applyForm, setApplyForm] = useState({
    emergency_contact_name: "",
    emergency_contact_phone: "",
    skills: "Dog Handling, Sanitation",
    availability: "Weekends & Mornings",
    notes: "",
    medical_conditions: "None",
    animal_handling_experience: "2 years volunteer experience",
  });

  // Shift Form
  const [shiftForm, setShiftForm] = useState({
    shelter_facility_id: "",
    role_name: "Dog Walking & Socialization",
    start_at: "",
    end_at: "",
    capacity: 5,
  });

  const fetchVolunteers = useCallback(async () => {
    try {
      setVolLoading(true);
      setVolError(null);
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;

      const response = await volunteerService.getVolunteers(params);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
        ? response.items
        : [];
      setVolunteers(list);
    } catch (err: any) {
      setVolError(err?.response?.data?.detail || "Failed to load volunteer roster.");
    } finally {
      setVolLoading(false);
    }
  }, [statusFilter]);

  const fetchShifts = useCallback(async () => {
    try {
      setShiftLoading(true);
      setShiftError(null);
      const response = await volunteerService.getShifts();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
        ? response.items
        : [];
      setShifts(list);
    } catch (err: any) {
      setShiftError(err?.response?.data?.detail || "Failed to load scheduled shifts.");
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await shelterService.getShelters();
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setFacilities(list);
    } catch {
      // Quiet fail if shelter facilities cannot be loaded
    }
  }, []);

  useEffect(() => {
    void fetchVolunteers();
    void fetchShifts();
    void fetchFacilities();
  }, [fetchVolunteers, fetchShifts, fetchFacilities]);

  const handleApplyVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.emergency_contact_name || !applyForm.emergency_contact_phone) {
      addToast("Emergency contact name and phone are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await volunteerService.applyVolunteer(applyForm);
      addToast("Volunteer profile registered successfully!", "success");
      setIsApplyModalOpen(false);
      fetchVolunteers();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to register volunteer.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.role_name || !shiftForm.start_at || !shiftForm.end_at) {
      addToast("Role name, start time, and end time are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await volunteerService.createShift({
        shelter_facility_id: shiftForm.shelter_facility_id || null,
        role_name: shiftForm.role_name,
        start_at: new Date(shiftForm.start_at).toISOString(),
        end_at: new Date(shiftForm.end_at).toISOString(),
        capacity: Number(shiftForm.capacity || 5),
      });
      addToast("Volunteer shift created!", "success");
      setIsShiftModalOpen(false);
      fetchShifts();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to create shift.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (profileId: string, status: "applied" | "onboarded" | "active" | "inactive") => {
    try {
      await volunteerService.updateVolunteerProfile(profileId, { status });
      addToast(`Volunteer profile status updated to ${status.toUpperCase()}!`, "success");
      fetchVolunteers();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to update profile status.", "error");
    }
  };

  const handleJoinShift = async (shiftId: string) => {
    try {
      await volunteerService.joinShift(shiftId);
      addToast("Volunteer joined/assigned to shift successfully!", "success");
      fetchShifts();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to join shift.", "error");
    }
  };

  const handleOpenAttendance = async (shift: any) => {
    setSelectedShift(shift);
    setIsAttendanceModalOpen(true);
    try {
      setAttLoading(true);
      const res = await volunteerService.getShiftAttendance(shift.id);
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setAttendanceList(list);
    } catch {
      setAttendanceList([]);
    } finally {
      setAttLoading(false);
    }
  };

  const handleCheckIn = async (attendanceId: string) => {
    try {
      await volunteerService.checkInAttendance(attendanceId);
      addToast("Volunteer checked in successfully!", "success");
      if (selectedShift?.id) void handleOpenAttendance(selectedShift);
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Check-in failed.", "error");
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await volunteerService.checkOutAttendance(attendanceId, "Shift completed");
      addToast("Volunteer checked out successfully!", "success");
      if (selectedShift?.id) void handleOpenAttendance(selectedShift);
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Check-out failed.", "error");
    }
  };

  const handleIssueCertificate = async (profileId: string) => {
    try {
      addToast("Generating verified service certificate...", "info");
      const cert = await volunteerService.getCertificate(profileId);
      if (cert?.certificate_url || cert?.download_url) {
        window.open(cert.certificate_url || cert.download_url, "_blank");
        addToast("Service Certificate opened.", "success");
      } else {
        addToast("Service Certificate generated successfully!", "success");
      }
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.response?.data?.message || "Failed to issue certificate.", "error");
    }
  };

  // Filtered Volunteers
  const filteredVolunteers = volunteers.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = String(v.user?.full_name || v.emergency_contact_name || "").toLowerCase();
    const email = String(v.user?.email || v.email || "").toLowerCase();
    const skills = String(v.skills || "").toLowerCase();
    return name.includes(q) || email.includes(q) || skills.includes(q);
  });

  const activeCount = volunteers.filter((v) => v.status === "active").length;
  const onboardedCount = volunteers.filter((v) => v.status === "onboarded").length;
  const appliedCount = volunteers.filter((v) => v.status === "applied").length;

  const stats = [
    { title: "Total Registered Volunteers", value: String(volunteers.length), trend: "Verified Roster", color: "#2563EB", icon: <FaUserFriends /> },
    { title: "Active Volunteers", value: String(activeCount), trend: "Available for Shifts", color: "#10B981", icon: <FaUserCheck /> },
    { title: "Onboarded / Applied", value: `${onboardedCount} / ${appliedCount}`, trend: "Pipeline", color: "#F59E0B", icon: <FaClock /> },
    { title: "Scheduled Shifts", value: String(shifts.length), trend: "Shelter Operations", color: "#6366F1", icon: <FaClipboardList /> },
  ];

  const volColumns = [
    {
      key: "name",
      title: "Volunteer Name / Email",
      render: (_: string, row: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {row.user?.full_name || row.emergency_contact_name || "Volunteer Profile"}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {row.user?.email || `ID: ${String(row.id).slice(0, 8)}`}
          </div>
        </div>
      ),
    },
    {
      key: "emergency_contact_phone",
      title: "Contact Info",
      render: (v: string, row: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#334155" }}>{v || row.user?.phone || "-"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Contact: {row.emergency_contact_name || "-"}</div>
        </div>
      ),
    },
    {
      key: "skills",
      title: "Skills & Experience",
      render: (v: string, row: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#2563EB" }}>{v || "General Volunteer"}</div>
          {row.animal_handling_experience && (
            <div style={{ fontSize: "11px", color: "#64748B" }}>{row.animal_handling_experience}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (v: string) => {
        const s = String(v || "applied").toLowerCase();
        const color = s === "active" ? "#047857" : s === "onboarded" ? "#1D4ED8" : s === "applied" ? "#D97706" : "#DC2626";
        const bg = s === "active" ? "#D1FAE5" : s === "onboarded" ? "#EFF6FF" : s === "applied" ? "#FEF3C7" : "#FEE2E2";
        return (
          <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 8px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
            {s}
          </span>
        );
      },
    },
    {
      key: "created_at",
      title: "Joined Date",
      render: (v: string) => formatDateTime(v),
    },
    {
      key: "actions",
      title: "Actions & Approval",
      render: (_: string, row: any) => {
        const status = String(row.status || "applied").toLowerCase();
        return (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setSelectedVolunteer(row);
                setIsProfileModalOpen(true);
              }}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#2563EB", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
            >
              <FaEye /> Profile
            </button>

            {status === "applied" && (
              <button
                onClick={() => void handleUpdateStatus(row.id, "onboarded")}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
              >
                <FaUserCheck /> Onboard
              </button>
            )}

            {status === "onboarded" && (
              <button
                onClick={() => void handleUpdateStatus(row.id, "active")}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
              >
                <FaUserCheck /> Activate
              </button>
            )}

            {status === "active" && (
              <button
                onClick={() => void handleUpdateStatus(row.id, "inactive")}
                style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#F59E0B", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
              >
                <FaUserTimes /> Deactivate
              </button>
            )}

            <button
              onClick={() => void handleIssueCertificate(row.id)}
              style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF", color: "#6366F1", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
            >
              <FaAward /> Certificate
            </button>
          </div>
        );
      },
    },
  ];

  const shiftColumns = [
    {
      key: "role_name",
      title: "Shift Role / Task",
      render: (v: string, row: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v || row.title || "Shelter Assistance"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Facility ID: {row.shelter_facility_id ? String(row.shelter_facility_id).slice(0, 8) : "Central Shelter"}</div>
        </div>
      ),
    },
    {
      key: "start_at",
      title: "Start Time",
      render: (v: string) => formatDateTime(v),
    },
    {
      key: "end_at",
      title: "End Time",
      render: (v: string) => formatDateTime(v),
    },
    {
      key: "capacity",
      title: "Capacity",
      render: (v: number) => <strong style={{ color: "#2563EB" }}>{v ?? 5} Volunteers</strong>,
    },
    {
      key: "actions",
      title: "Shift Actions",
      render: (_: string, row: any) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => void handleJoinShift(row.id)}
            style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
          >
            Assign / Join
          </button>
          <button
            onClick={() => void handleOpenAttendance(row)}
            style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#2563EB", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <FaClock /> Attendance
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto", boxSizing: "border-box" }}>
      {/* Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Volunteer Management &amp; Shift Scheduling</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Authoritative backend volunteer roster, onboarding pipeline, shift scheduling, capacity management, and attendance check-in.
        </p>
      </div>

      {/* Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_volunteers">
          <button
            onClick={() => setIsApplyModalOpen(true)}
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #BFDBFE",
              background: "#EFF6FF",
              color: "#1D4ED8",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            <FaPlus size={18} color="#2563EB" />
            <div>
              <div>Register New Volunteer</div>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#3B82F6" }}>Create profile &amp; application</div>
            </div>
          </button>
        </Can>
        <Can permission="create_volunteers">
          <button
            onClick={() => setIsShiftModalOpen(true)}
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #A7F3D0",
              background: "#ECFDF5",
              color: "#047857",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              textAlign: "left",
            }}
          >
            <FaClipboardList size={18} color="#10B981" />
            <div>
              <div>Create Volunteer Shift</div>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#059669" }}>Schedule shift &amp; capacity</div>
            </div>
          </button>
        </Can>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #E2E8F0", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("directory")}
          style={{
            padding: "10px 22px",
            borderRadius: "10px 10px 0 0",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700,
            background: activeTab === "directory" ? "#0F172A" : "transparent",
            color: activeTab === "directory" ? "#FFFFFF" : "#64748B",
            transition: "all 0.15s ease",
          }}
        >
          Volunteers Roster &amp; Pipeline
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          style={{
            padding: "10px 22px",
            borderRadius: "10px 10px 0 0",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 700,
            background: activeTab === "shifts" ? "#0F172A" : "transparent",
            color: activeTab === "shifts" ? "#FFFFFF" : "#64748B",
            transition: "all 0.15s ease",
          }}
        >
          Shift Scheduling &amp; Capacity
        </button>
      </div>

      {activeTab === "directory" ? (
        <div className="soft-card" style={{ padding: "20px", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Volunteer Profiles Directory
            </h3>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <FaFilter size={12} color="#64748B" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
                <input
                  type="text"
                  placeholder="Search name, email, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "220px" }}
                />
              </div>

              <button
                onClick={() => void fetchVolunteers()}
                disabled={volLoading}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaSync style={{ animation: volLoading ? "spin 1s linear infinite" : "none" }} /> Refresh
              </button>
            </div>
          </div>

          {volError && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {volError}
            </div>
          )}

          {volLoading ? (
            <p style={{ color: "#64748B", padding: "20px 0" }}>Loading volunteer profiles from backend...</p>
          ) : (
            <DataTable columns={volColumns} data={filteredVolunteers} module="volunteers" />
          )}
        </div>
      ) : (
        <div className="soft-card" style={{ padding: "20px", overflowX: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Scheduled Shifts &amp; Capacity Control
            </h3>
            <button
              onClick={() => void fetchShifts()}
              disabled={shiftLoading}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F8FAFC", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FaSync style={{ animation: shiftLoading ? "spin 1s linear infinite" : "none" }} /> Refresh Shifts
            </button>
          </div>

          {shiftError && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "8px", background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "13px", fontWeight: 600 }}>
              ⚠️ {shiftError}
            </div>
          )}

          {shiftLoading ? (
            <p style={{ color: "#64748B", padding: "20px 0" }}>Loading scheduled shifts from backend...</p>
          ) : (
            <DataTable columns={shiftColumns} data={shifts} module="volunteers" />
          )}
        </div>
      )}

      {/* Register Volunteer Profile Modal */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Register Volunteer Profile / Application">
        <form onSubmit={handleApplyVolunteer} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Emergency Contact Name *</label>
              <input type="text" required placeholder="e.g. Jane Doe" value={applyForm.emergency_contact_name} onChange={(e) => setApplyForm({ ...applyForm, emergency_contact_name: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Emergency Contact Phone *</label>
              <input type="text" required placeholder="e.g. +91-9876543210" value={applyForm.emergency_contact_phone} onChange={(e) => setApplyForm({ ...applyForm, emergency_contact_phone: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Skills / Specialty</label>
              <input type="text" placeholder="e.g. Grooming, Dog Walking" value={applyForm.skills} onChange={(e) => setApplyForm({ ...applyForm, skills: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Availability</label>
              <input type="text" placeholder="e.g. Weekends, Morning Shift" value={applyForm.availability} onChange={(e) => setApplyForm({ ...applyForm, availability: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Animal Handling Experience</label>
            <input type="text" placeholder="e.g. 2 years experience with large dogs" value={applyForm.animal_handling_experience} onChange={(e) => setApplyForm({ ...applyForm, animal_handling_experience: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Medical Conditions / Notes</label>
            <textarea rows={2} placeholder="Any allergies or notes" value={applyForm.notes} onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsApplyModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Submitting..." : "Submit Application"}</button>
          </div>
        </form>
      </Modal>

      {/* Create Volunteer Shift Modal */}
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title="Create Volunteer Shift Schedule">
        <form onSubmit={handleCreateShift} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role / Activity Name *</label>
            <input type="text" required placeholder="e.g. Dog Walking &amp; Socialization" value={shiftForm.role_name} onChange={(e) => setShiftForm({ ...shiftForm, role_name: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          {facilities.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Shelter Facility</label>
              <select value={shiftForm.shelter_facility_id} onChange={(e) => setShiftForm({ ...shiftForm, shelter_facility_id: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFF" }}>
                <option value="">Central Shelter Facility</option>
                {facilities.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Start Date &amp; Time *</label>
              <input type="datetime-local" required value={shiftForm.start_at} onChange={(e) => setShiftForm({ ...shiftForm, start_at: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>End Date &amp; Time *</label>
              <input type="datetime-local" required value={shiftForm.end_at} onChange={(e) => setShiftForm({ ...shiftForm, end_at: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Volunteer Capacity Limit *</label>
            <input type="number" min="1" required value={shiftForm.capacity} onChange={(e) => setShiftForm({ ...shiftForm, capacity: Number(e.target.value) })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsShiftModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Creating..." : "Save Shift Schedule"}</button>
          </div>
        </form>
      </Modal>

      {/* Volunteer Profile Details Modal */}
      <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Volunteer Full Profile Record">
        {selectedVolunteer && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                {selectedVolunteer.user?.full_name || selectedVolunteer.emergency_contact_name || "Volunteer Record"}
              </h2>
              <div style={{ fontSize: "13px", color: "#64748B", marginTop: "2px" }}>
                Email: {selectedVolunteer.user?.email || "N/A"} &bull; Status: <strong style={{ textTransform: "uppercase", color: "#2563EB" }}>{selectedVolunteer.status}</strong>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
              <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Emergency Contact</div>
                <div style={{ fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedVolunteer.emergency_contact_name}</div>
                <div style={{ color: "#2563EB" }}>{selectedVolunteer.emergency_contact_phone}</div>
              </div>

              <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Skills &amp; Availability</div>
                <div style={{ fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedVolunteer.skills || "-"}</div>
                <div style={{ color: "#64748B" }}>{selectedVolunteer.availability || "-"}</div>
              </div>

              <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Animal Handling Experience</div>
                <div style={{ fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedVolunteer.animal_handling_experience || "None specified"}</div>
              </div>

              <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Background Check</div>
                <div style={{ fontWeight: 700, color: selectedVolunteer.background_check_completed ? "#047857" : "#D97706", marginTop: "2px" }}>
                  {selectedVolunteer.background_check_completed ? "VERIFIED & PASSED" : "PENDING VERIFICATION"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", fontWeight: 600 }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Attendance & Check-In / Check-Out Modal */}
      <Modal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title="Shift Attendance & Check-In Control" maxWidth="680px">
        {selectedShift && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#0F172A" }}>{selectedShift.role_name || "Shift Activity"}</div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                Start: {formatDateTime(selectedShift.start_at)} &bull; End: {formatDateTime(selectedShift.end_at)}
              </div>
            </div>

            {attLoading ? (
              <p style={{ color: "#64748B" }}>Fetching attendance roster...</p>
            ) : attendanceList.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", background: "#F8FAFC", borderRadius: "8px", color: "#64748B" }}>
                No volunteers currently enrolled for this shift.
              </div>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {attendanceList.map((att: any) => (
                  <div key={att.id} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F172A" }}>Volunteer ID: {String(att.volunteer_id).slice(0, 8)}</div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        Check-In: {att.check_in_at ? formatDateTime(att.check_in_at) : "Not Checked In"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {!att.check_in_at && (
                        <button
                          onClick={() => void handleCheckIn(att.id)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <FaSignInAlt /> Check In
                        </button>
                      )}

                      {att.check_in_at && !att.check_out_at && (
                        <button
                          onClick={() => void handleCheckOut(att.id)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <FaSignOutAlt /> Check Out
                        </button>
                      )}

                      {att.check_out_at && (
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#047857", background: "#D1FAE5", padding: "4px 8px", borderRadius: "999px" }}>
                          SHIFT COMPLETED ({att.hours_served || 0} hrs)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setIsAttendanceModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", fontWeight: 600 }}>Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VolunteerManagement;
