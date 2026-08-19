import { useState, useEffect, useCallback, useMemo } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import Modal from "../../../components/common/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaUsers,
  FaCalendarAlt,
  FaClipboardList,
  FaUserCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaSearch,
  FaEye,
  FaClock,
  FaSignInAlt,
  FaSignOutAlt,
  FaAward,
  FaPaperPlane,
  FaFileDownload,
  FaChartBar,
  FaCheckDouble,
} from "react-icons/fa";
import volunteerService from "../../../services/volunteerService";
import shelterService from "../../../services/shelterService";
import notificationService from "../../../services/notificationService";
import reportsService from "../../../services/reportsService";
import { useDataSync, notifyDataChanged } from "../../../utils/dataSync";
import { formatDateTime } from "../../../utils/dateUtils";

const PREFERRED_ROLES = [
  "Foster Care",
  "Transport",
  "Events & Outreach",
  "Shelter Support",
];

const DEFAULT_APPROVAL_MSG =
  "Thank you for applying to volunteer with PawGuard. Your volunteer application has been approved. We will contact you when a suitable volunteer opportunity becomes available based on your preferred role and availability.";

const DEFAULT_REJECTION_MSG =
  "Thank you for your interest in volunteering with PawGuard. After reviewing your application, we are unable to proceed with your application at this time. We appreciate your interest in supporting animal welfare.";

type TabKey = "pipeline" | "roster" | "schedules" | "attendance" | "completed" | "performance_reports";

const VolunteerCoordinatorDashboard = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [volunteerFilter, setVolunteerFilter] = useState<string>("");

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  const [selectedShiftToAssign, setSelectedShiftToAssign] = useState<any | null>(null);
  const [selectedAssignVolunteerId, setSelectedAssignVolunteerId] = useState<string>("");
  const [selectedVolunteerRecord, setSelectedVolunteerRecord] = useState<any | null>(null);
  const [volunteerSummary, setVolunteerSummary] = useState<any | null>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Form
  const [customMessage, setCustomMessage] = useState<string>("");
  const [reviewRole, setReviewRole] = useState<string>("Shelter Support");

  // Application Intake Form
  const [applyForm, setApplyForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    preferred_role: "Shelter Support",
    availability: "Weekends & Mornings",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    skills: "Dog Walking, Grooming",
    notes: "",
  });

  // Shift Form
  const [shiftForm, setShiftForm] = useState({
    role_name: "Shelter Support & Care",
    shelter_facility_id: "",
    start_at: "",
    end_at: "",
    capacity: 5,
    assigned_volunteer_id: "",
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [volRes, shiftRes, facRes, statRes] = await Promise.allSettled([
        volunteerService.getVolunteers(),
        volunteerService.getShifts(),
        shelterService.getShelters(),
        volunteerService.getVolunteerStats(),
      ]);

      const volList = volRes.status === "fulfilled"
        ? (Array.isArray(volRes.value) ? volRes.value : volRes.value?.data || volRes.value?.items || [])
        : [];
      const shiftList = shiftRes.status === "fulfilled"
        ? (Array.isArray(shiftRes.value) ? shiftRes.value : shiftRes.value?.data || shiftRes.value?.items || [])
        : [];
      const facList = facRes.status === "fulfilled"
        ? (Array.isArray(facRes.value) ? facRes.value : facRes.value?.data || [])
        : [];
      const statObj = statRes.status === "fulfilled" ? statRes.value?.data || statRes.value || {} : {};

      setVolunteers(volList);
      setShifts(shiftList);
      setFacilities(facList);
      setStats(statObj);

      // Fetch attendance streams across shifts
      if (shiftList.length > 0) {
        const attPromises = shiftList.slice(0, 15).map((s: any) =>
          volunteerService.getShiftAttendance(s.id).catch(() => [])
        );
        const attResults = await Promise.allSettled(attPromises);
        const combinedAtt: any[] = [];
        attResults.forEach((res, idx) => {
          if (res.status === "fulfilled") {
            const list = Array.isArray(res.value) ? res.value : (res.value as any)?.data || [];
            list.forEach((item: any) => {
              combinedAtt.push({ ...item, shift: shiftList[idx] });
            });
          }
        });
        setAllAttendance(combinedAtt);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load volunteer coordinator data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useDataSync(fetchDashboardData);

  // Handle Application Submit
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.full_name || !applyForm.email || !applyForm.phone) {
      addToast("Full Name, Email, and Phone are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await volunteerService.applyVolunteer({
        full_name: applyForm.full_name,
        email: applyForm.email,
        phone: applyForm.phone,
        preferred_role: applyForm.preferred_role,
        availability: applyForm.availability,
        emergency_contact_name: applyForm.emergency_contact_name || applyForm.full_name,
        emergency_contact_phone: applyForm.emergency_contact_phone || applyForm.phone,
        skills: applyForm.skills,
        notes: applyForm.notes,
      });
      addToast("Volunteer application submitted successfully!", "success");
      setIsApplyModalOpen(false);
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      const errorMsg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.response?.data?.message || err?.message || "Failed to submit application.";
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Application Review Approval
  const handleApproveApplication = async (applicant: any) => {
    if (!applicant?.id) return;
    try {
      setIsSubmitting(true);
      const assignedRole = reviewRole || applicant.preferred_role || applicant.skills || "Shelter Support";
      await volunteerService.updateVolunteerProfile(applicant.id, {
        status: "onboarded",
        preferred_role: assignedRole,
      });

      const messageBody = customMessage.trim() || DEFAULT_APPROVAL_MSG;

      await notificationService.sendBroadcastNotification({
        title: "Volunteer Application Approved!",
        message: messageBody,
        type: "volunteer_update",
        targetRoles: ["volunteer"],
        actionUrl: "/volunteer-dashboard",
      }).catch(() => {});

      addToast(`Application for ${applicant.user?.full_name || applicant.full_name || "Volunteer"} approved as ${assignedRole}!`, "success");
      setIsReviewModalOpen(false);
      setSelectedApplicant(null);
      setCustomMessage("");
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      const errorMsg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.response?.data?.message || err?.message || "Failed to approve application.";
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Application Review Rejection
  const handleRejectApplication = async (applicant: any) => {
    if (!applicant?.id) return;
    try {
      setIsSubmitting(true);
      await volunteerService.updateVolunteerProfile(applicant.id, {
        status: "inactive",
      });

      const messageBody = customMessage.trim() || DEFAULT_REJECTION_MSG;

      await notificationService.sendBroadcastNotification({
        title: "Volunteer Application Status Update",
        message: messageBody,
        type: "volunteer_update",
        targetRoles: ["volunteer"],
        actionUrl: "/volunteer-dashboard",
      }).catch(() => {});

      addToast(`Application for ${applicant.user?.full_name || applicant.full_name || "Volunteer"} rejected.`, "info");
      setIsReviewModalOpen(false);
      setSelectedApplicant(null);
      setCustomMessage("");
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      const errorMsg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.response?.data?.message || err?.message || "Failed to reject application.";
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Shift
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.role_name || !shiftForm.start_at || !shiftForm.end_at) {
      addToast("Role name, start time, and end time are required.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const createdShift = await volunteerService.createShift({
        role_name: shiftForm.role_name,
        shelter_facility_id: shiftForm.shelter_facility_id || null,
        start_at: new Date(shiftForm.start_at).toISOString(),
        end_at: new Date(shiftForm.end_at).toISOString(),
        capacity: Number(shiftForm.capacity || 5),
      });

      if (shiftForm.assigned_volunteer_id) {
        const shiftId = createdShift?.id || createdShift?.data?.id;
        if (shiftId) {
          await volunteerService.joinShift(shiftId, shiftForm.assigned_volunteer_id).catch(() => {});
        }
      }

      await notificationService.sendBroadcastNotification({
        title: `New Volunteer Shift: ${shiftForm.role_name}`,
        message: `A new volunteer shift for ${shiftForm.role_name} has been scheduled. Sign up in your volunteer portal!`,
        type: "volunteer_shift",
        targetRoles: ["volunteer"],
        actionUrl: "/volunteer-dashboard",
      }).catch(() => {});

      addToast("Volunteer shift scheduled successfully!", "success");
      setIsShiftModalOpen(false);
      setShiftForm({
        role_name: "Shelter Support & Care",
        shelter_facility_id: "",
        start_at: "",
        end_at: "",
        capacity: 5,
        assigned_volunteer_id: "",
      });
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      const errorMsg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.response?.data?.message || err?.message || "Failed to create shift.";
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Open Assign Modal
  const handleOpenAssignModal = (shift: any) => {
    setSelectedShiftToAssign(shift);
    if (approvedVolunteers.length > 0) {
      setSelectedAssignVolunteerId(String(approvedVolunteers[0].id));
    } else {
      setSelectedAssignVolunteerId("");
    }
    setIsAssignModalOpen(true);
  };

  // Handle Confirm Assign Volunteer to Shift
  const handleConfirmAssignVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftToAssign || !selectedAssignVolunteerId) {
      addToast("Shift and Volunteer selection are required.", "error");
      return;
    }

    // Capacity Check
    const enrolledCount = allAttendance.filter(
      (a) => a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id
    ).length;
    const capacity = Number(selectedShiftToAssign.capacity || 5);
    if (enrolledCount >= capacity) {
      addToast(`Cannot assign volunteer: Shift capacity is full (${enrolledCount}/${capacity} enrolled).`, "error");
      return;
    }

    // Duplicate Enrollment Check
    const isAlreadyEnrolled = allAttendance.some(
      (a) =>
        (a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id) &&
        (String(a.volunteer_id) === String(selectedAssignVolunteerId) ||
          String(a.volunteer_profile_id) === String(selectedAssignVolunteerId) ||
          String(a.volunteer?.id) === String(selectedAssignVolunteerId))
    );
    if (isAlreadyEnrolled) {
      addToast("Selected volunteer is already enrolled in this shift.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      await volunteerService.joinShift(selectedShiftToAssign.id, selectedAssignVolunteerId);

      const volObj = volunteers.find((v) => String(v.id) === String(selectedAssignVolunteerId));
      const volName = volObj?.user?.full_name || volObj?.full_name || "Volunteer";

      addToast(`Successfully assigned ${volName} to shift: ${selectedShiftToAssign.role_name || "Volunteer Shift"}!`, "success");

      await notificationService.sendBroadcastNotification({
        title: `Shift Assignment: ${selectedShiftToAssign.role_name || "Volunteer Shift"}`,
        message: `You have been assigned to ${selectedShiftToAssign.role_name || "a shift"}. Check your volunteer dashboard schedule!`,
        type: "volunteer_shift",
        targetRoles: ["volunteer"],
        actionUrl: "/volunteer-dashboard",
      }).catch(() => {});

      setIsAssignModalOpen(false);
      setSelectedShiftToAssign(null);
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      const errorMsg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.response?.data?.message || err?.message || "Failed to assign volunteer to shift.";
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Open Volunteer Profile Details Modal
  const handleOpenProfileModal = async (vol: any) => {
    setSelectedVolunteerRecord(vol);
    setIsProfileModalOpen(true);
    try {
      const summary = await volunteerService.getServiceSummary(vol.id).catch(() => null);
      setVolunteerSummary(summary);
    } catch {
      setVolunteerSummary(null);
    }
  };

  // Handle Shift Attendance Drawer
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
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Check-in failed.", "error");
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await volunteerService.checkOutAttendance(attendanceId, "Shift completed successfully");
      addToast("Volunteer checked out successfully!", "success");
      if (selectedShift?.id) void handleOpenAttendance(selectedShift);
      fetchDashboardData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Check-out failed.", "error");
    }
  };

  const handleIssueCertificate = async (profileId: string) => {
    if (!profileId) {
      addToast("Invalid volunteer profile ID.", "error");
      return;
    }
    try {
      addToast("Generating verified service certificate...", "info");
      const cert = await volunteerService.getCertificate(profileId);

      const certUrl =
        cert?.certificate_url ||
        cert?.download_url ||
        cert?.url ||
        cert?.pdf_url ||
        cert?.data?.certificate_url ||
        cert?.data?.download_url ||
        cert?.data?.url;

      if (certUrl) {
        window.open(certUrl, "_blank");
        addToast("Service Certificate opened in a new tab.", "success");
        return;
      }

      const htmlContent = cert?.certificate_html || cert?.html || cert?.content;
      const base64Pdf = cert?.pdf_base64 || cert?.base64;

      if (base64Pdf) {
        const blob = new Blob([Uint8Array.from(atob(base64Pdf), (c) => c.charCodeAt(0))], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        addToast("Service Certificate generated successfully!", "success");
        return;
      }

      if (htmlContent) {
        const blob = new Blob([htmlContent], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        addToast("Service Certificate generated & opened.", "success");
        return;
      }

      if (cert instanceof Blob) {
        const blobUrl = URL.createObjectURL(cert);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `volunteer_certificate_${String(profileId).slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        addToast("Service Certificate downloaded successfully!", "success");
        return;
      }

      addToast("Service Certificate generated successfully!", "success");
    } catch (err: any) {
      const errorMsg =
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.response?.data?.message || err?.message || "Failed to issue certificate.";

      addToast(errorMsg, "error");
    }
  };

  // Export Reports
  const handleExportReports = async (format: "csv" | "pdf") => {
    try {
      addToast(`Exporting Volunteer Activity Report (${format.toUpperCase()})...`, "info");
      await reportsService.generateAndDownloadReport({
        report_type: "volunteer",
        format,
        period_start: dateStart || undefined,
        period_end: dateEnd || undefined,
      });
      addToast(`Volunteer Activity Report exported successfully as ${format.toUpperCase()}!`, "success");
    } catch (err: any) {
      // Fallback CSV generator if backend report type endpoint is not present
      if (format === "csv") {
        try {
          const csvRows = [
            ["Volunteer ID", "Shift Role", "Check-In", "Check-Out", "Hours Served", "Status"].join(","),
            ...allAttendance.map((a) =>
              [
                `"${a.volunteer_id || a.id || ""}"`,
                `"${a.shift?.role_name || a.role_name || "Volunteer Work"}"`,
                `"${a.check_in_at ? formatDateTime(a.check_in_at) : "Pending"}"`,
                `"${a.check_out_at ? formatDateTime(a.check_out_at) : "In Progress"}"`,
                `"${a.hours_served || 0}"`,
                `"${a.check_out_at ? "Completed" : a.check_in_at ? "In Progress" : "Scheduled"}"`,
              ].join(",")
            ),
          ].join("\n");

          const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `PawGuard_Volunteer_Activity_Report_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          addToast("Volunteer Activity CSV Report exported successfully!", "success");
          return;
        } catch {
          // ignore
        }
      }
      addToast(err?.message || "Failed to export volunteer report.", "error");
    }
  };

  // Lists & Derived States
  const pendingApplications = useMemo(() =>
    volunteers.filter((v) => String(v.status || "applied").toLowerCase() === "applied"),
    [volunteers]
  );

  const approvedVolunteers = useMemo(() =>
    volunteers.filter((v) => ["onboarded", "active"].includes(String(v.status || "").toLowerCase())),
    [volunteers]
  );

  const filteredRoster = useMemo(() =>
    volunteers.filter((v) => {
      const s = String(v.status || "applied").toLowerCase();
      const matchesStatus = !statusFilter || s === statusFilter.toLowerCase();
      const role = String(v.preferred_role || v.skills || "").toLowerCase();
      const matchesRole = !roleFilter || role.includes(roleFilter.toLowerCase());
      const name = String(v.user?.full_name || v.full_name || v.emergency_contact_name || "").toLowerCase();
      const email = String(v.user?.email || v.email || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || name.includes(q) || email.includes(q) || role.includes(q);
      return matchesStatus && matchesRole && matchesSearch;
    }),
    [volunteers, statusFilter, roleFilter, searchQuery]
  );

  const completedWorkList = useMemo(() =>
    allAttendance.filter((a) => Boolean(a.check_out_at)),
    [allAttendance]
  );

  // Performance calculations
  const totalShiftCount = shifts.length;
  const totalAttendanceCount = allAttendance.length;
  const totalCompletedCount = completedWorkList.length;
  const totalHoursSum = useMemo(() =>
    completedWorkList.reduce((acc, curr) => acc + (Number(curr.hours_served) || 0), 0),
    [completedWorkList]
  );
  const completionRate = totalAttendanceCount > 0 ? Math.round((totalCompletedCount / totalAttendanceCount) * 100) : 100;

  const statCards = [
    {
      title: "Registered Volunteers",
      value: loading ? "..." : String(stats?.total_volunteers ?? stats?.registered_volunteers ?? volunteers.length),
      trend: `${approvedVolunteers.length} Active / Onboarded`,
      color: "#2563EB",
      icon: <FaUsers />,
      onClick: () => setActiveTab("roster"),
    },
    {
      title: "Pending Applications",
      value: loading ? "..." : String(pendingApplications.length),
      trend: "Requires Review",
      color: "#F59E0B",
      icon: <FaClipboardList />,
      onClick: () => setActiveTab("pipeline"),
    },
    {
      title: "Scheduled Shifts",
      value: loading ? "..." : String(shifts.length),
      trend: `${totalCompletedCount} Completed Work Units`,
      color: "#10B981",
      icon: <FaCalendarAlt />,
      onClick: () => setActiveTab("schedules"),
    },
    {
      title: "Total Hours Served",
      value: loading ? "..." : `${totalHoursSum} Hrs`,
      trend: `${completionRate}% Work Completion Rate`,
      color: "#6366F1",
      icon: <FaClock />,
      onClick: () => setActiveTab("performance_reports"),
    },
  ];

  const pipelineColumns = [
    {
      key: "name",
      header: "Applicant Name & Contact",
      render: (_: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {r.user?.full_name || r.full_name || r.emergency_contact_name || "Volunteer Applicant"}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {r.user?.email || r.email || "No email"} &bull; {r.user?.phone || r.phone || r.emergency_contact_phone || "No phone"}
          </div>
        </div>
      ),
    },
    {
      key: "preferred_role",
      header: "Preferred Role",
      render: (_: string, r: any) => {
        const role = r.preferred_role || r.skills || "Shelter Support";
        return (
          <span style={{ padding: "4px 10px", borderRadius: "999px", background: "#EFF6FF", color: "#1D4ED8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>
            {role}
          </span>
        );
      },
    },
    {
      key: "availability",
      header: "Availability & Timings",
      render: (v: string) => <span style={{ fontWeight: 600, color: "#334155" }}>{v || "Weekends & Mornings"}</span>,
    },
    {
      key: "created_at",
      header: "Applied Date",
      render: (v: string) => (v ? formatDateTime(v) : "Recent"),
    },
  ];

  const rosterColumns = [
    {
      key: "name",
      header: "Volunteer Name & Contact",
      render: (_: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>
            {r.user?.full_name || r.full_name || r.emergency_contact_name || "Volunteer Record"}
          </div>
          <div style={{ fontSize: "12px", color: "#64748B" }}>
            {r.user?.email || r.email || `ID: ${String(r.id).slice(0, 8)}`}
          </div>
        </div>
      ),
    },
    {
      key: "preferred_role",
      header: "Preferred Role / Skill",
      render: (_: string, r: any) => (
        <span style={{ fontWeight: 700, color: "#2563EB" }}>
          {r.preferred_role || r.skills || "General Support"}
        </span>
      ),
    },
    {
      key: "availability",
      header: "Availability",
      render: (v: string) => <span style={{ color: "#475569" }}>{v || "Flexible"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (v: string) => {
        const s = String(v || "applied").toLowerCase();
        const color = s === "active" ? "#047857" : s === "onboarded" ? "#1D4ED8" : s === "applied" ? "#D97706" : "#DC2626";
        const bg = s === "active" ? "#ECFDF5" : s === "onboarded" ? "#EFF6FF" : s === "applied" ? "#FEF3C7" : "#FEE2E2";
        return (
          <span style={{ fontSize: "11px", fontWeight: 800, padding: "3px 10px", borderRadius: "999px", background: bg, color, textTransform: "uppercase" }}>
            {s}
          </span>
        );
      },
    },
  ];

  const shiftColumns = [
    {
      key: "role_name",
      header: "Shift Activity / Role",
      render: (v: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v || r.title || "Shelter Support"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Facility: {r.shelter_facility_id ? String(r.shelter_facility_id).slice(0, 8) : "Central Shelter"}</div>
        </div>
      ),
    },
    {
      key: "start_at",
      header: "Start Time",
      render: (v: string) => (v ? formatDateTime(v) : "-"),
    },
    {
      key: "end_at",
      header: "End Time",
      render: (v: string) => (v ? formatDateTime(v) : "-"),
    },
    {
      key: "capacity",
      header: "Enrolled / Capacity",
      render: (_: number, r: any) => {
        const enrolled = allAttendance.filter((a) => a.shift_id === r.id || a.shift?.id === r.id).length;
        const cap = Number(r.capacity ?? 5);
        const isFull = enrolled >= cap;
        return (
          <div>
            <strong style={{ color: isFull ? "#DC2626" : "#2563EB" }}>
              {enrolled} / {cap} Enrolled
            </strong>
            {isFull && (
              <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 800, color: "#DC2626", background: "#FEE2E2", padding: "2px 6px", borderRadius: "4px" }}>
                FULL
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const attendanceColumns = [
    {
      key: "volunteer_id",
      header: "Volunteer ID & Role",
      render: (v: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>ID: {String(v || r.id).slice(0, 8)}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Shift: {r.shift?.role_name || r.role_name || "Shelter Activity"}</div>
        </div>
      ),
    },
    {
      key: "check_in_at",
      header: "Check-In Timestamp",
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: v ? "#047857" : "#D97706" }}>
          {v ? `✓ ${formatDateTime(v)}` : "⏳ Pending"}
        </span>
      ),
    },
    {
      key: "check_out_at",
      header: "Check-Out Timestamp",
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: v ? "#047857" : "#64748B" }}>
          {v ? `✓ ${formatDateTime(v)}` : "In Progress"}
        </span>
      ),
    },
    {
      key: "hours_served",
      header: "Hours Served",
      render: (v: number) => <strong style={{ color: "#2563EB" }}>{v || 0} Hours</strong>,
    },
  ];

  const completedColumns = [
    {
      key: "volunteer_id",
      header: "Volunteer & Assignment",
      render: (v: string, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>ID: {String(v || r.id).slice(0, 8)}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>Task: {r.shift?.role_name || r.role_name || "Rescue Support"}</div>
        </div>
      ),
    },
    {
      key: "completed_at",
      header: "Completion Date",
      render: (_: any, r: any) => formatDateTime(r.check_out_at || r.updated_at || r.created_at),
    },
    {
      key: "hours_served",
      header: "Hours Contributed",
      render: (v: number) => <strong style={{ color: "#10B981" }}>{v || 0} Hours</strong>,
    },
    {
      key: "notes",
      header: "Completion Notes / Report",
      render: (v: string) => <span style={{ fontSize: "12px", color: "#475569" }}>{v || "Shift completed successfully"}</span>,
    },
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Dashboard Header */}
      <div
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800 }}>
              Volunteer Coordinator Dashboard
            </h1>
            <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
              Overview of volunteer applications, assignments, schedules, attendance, and work completion tracking.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIsShiftModalOpen(true)}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#10B981",
                color: "#FFF",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaCalendarAlt size={12} /> Schedule Shift
            </button>

            <button
              type="button"
              onClick={() => void handleExportReports("csv")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#FFF",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaFileDownload size={12} /> Export Report CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* TABBED OPERATIONAL WORKSPACE */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        {/* Navigation Tabs */}
        <div style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("pipeline")}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: activeTab === "pipeline" ? "2px solid #F59E0B" : "1px solid #CBD5E1",
                background: activeTab === "pipeline" ? "#FFFBEB" : "#FFFFFF",
                color: activeTab === "pipeline" ? "#B45309" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaClipboardList /> Applications ({pendingApplications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roster")}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: activeTab === "roster" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "roster" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "roster" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaUsers /> Roster ({approvedVolunteers.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("schedules")}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: activeTab === "schedules" ? "2px solid #10B981" : "1px solid #CBD5E1",
                background: activeTab === "schedules" ? "#ECFDF5" : "#FFFFFF",
                color: activeTab === "schedules" ? "#047857" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaCalendarAlt /> Shift Schedules ({shifts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attendance")}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: activeTab === "attendance" ? "2px solid #6366F1" : "1px solid #CBD5E1",
                background: activeTab === "attendance" ? "#EEF2FF" : "#FFFFFF",
                color: activeTab === "attendance" ? "#4338CA" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaClock /> Attendance Log ({allAttendance.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: activeTab === "completed" ? "2px solid #047857" : "1px solid #CBD5E1",
                background: activeTab === "completed" ? "#D1FAE5" : "#FFFFFF",
                color: activeTab === "completed" ? "#065F46" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaCheckDouble /> Completed Work ({completedWorkList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("performance_reports")}
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: activeTab === "performance_reports" ? "2px solid #EC4899" : "1px solid #CBD5E1",
                background: activeTab === "performance_reports" ? "#FCE7F3" : "#FFFFFF",
                color: activeTab === "performance_reports" ? "#BE185D" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaChartBar /> Performance &amp; Reports
            </button>
          </div>
        </div>

        {/* TAB 1: APPLICATIONS PIPELINE */}
        {activeTab === "pipeline" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Pending Volunteer Applications ({pendingApplications.length})
              </h3>
            </div>
            <DataTable
              columns={pipelineColumns}
              data={pendingApplications}
              loading={loading}
              emptyMessage="No pending volunteer applications awaiting review."
              renderRowActions={(row: any) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedApplicant(row);
                    setReviewRole(row.preferred_role || row.skills || "Shelter Support");
                    setCustomMessage("");
                    setIsReviewModalOpen(true);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#2563EB",
                    color: "#FFF",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <FaEye /> Review Application
                </button>
              )}
            />
          </div>
        )}

        {/* TAB 2: APPROVED VOLUNTEERS ROSTER */}
        {activeTab === "roster" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Volunteer Directory & Role Matching ({filteredRoster.length})
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaFilter size={12} color="#64748B" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
                  >
                    <option value="">All Preferred Roles</option>
                    {PREFERRED_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
                  >
                    <option value="">All Application Statuses</option>
                    <option value="applied">Applied (Pending)</option>
                    <option value="onboarded">Onboarded</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ position: "relative" }}>
                  <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
                  <input
                    type="text"
                    placeholder="Search name, email, role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "220px" }}
                  />
                </div>
              </div>
            </div>

            <DataTable
              columns={rosterColumns}
              data={filteredRoster}
              loading={loading}
              emptyMessage="No matching volunteers found in roster."
              renderRowActions={(row: any) => {
                const s = String(row.status || "").toLowerCase();
                return (
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => void handleOpenProfileModal(row)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        background: "#F8FAFC",
                        color: "#2563EB",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaEye /> Details
                    </button>

                    {s === "onboarded" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await volunteerService.updateVolunteerProfile(row.id, { status: "active" });
                            addToast(`Volunteer ${row.user?.full_name || row.full_name || "Profile"} activated!`, "success");
                            fetchDashboardData();
                            notifyDataChanged();
                          } catch (err: any) {
                            const errorMsg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Failed to activate profile.";
                            addToast(errorMsg, "error");
                          }
                        }}
                        style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      >
                        Activate
                      </button>
                    )}

                    {s === "active" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await volunteerService.updateVolunteerProfile(row.id, { status: "inactive" });
                            addToast(`Volunteer ${row.user?.full_name || row.full_name || "Profile"} deactivated.`, "info");
                            fetchDashboardData();
                            notifyDataChanged();
                          } catch (err: any) {
                            const errorMsg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Failed to deactivate profile.";
                            addToast(errorMsg, "error");
                          }
                        }}
                        style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#F59E0B", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      >
                        Deactivate
                      </button>
                    )}

                    {s === "inactive" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await volunteerService.updateVolunteerProfile(row.id, { status: "active" });
                            addToast(`Volunteer ${row.user?.full_name || row.full_name || "Profile"} re-activated!`, "success");
                            fetchDashboardData();
                            notifyDataChanged();
                          } catch (err: any) {
                            const errorMsg = typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "Failed to activate profile.";
                            addToast(errorMsg, "error");
                          }
                        }}
                        style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                      >
                        Re-Activate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleIssueCertificate(row.id)}
                      style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#6366F1", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <FaAward /> Certificate
                    </button>
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* TAB 3: SHIFT SCHEDULES */}
        {activeTab === "schedules" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Active Volunteer Shift Schedules ({shifts.length})
              </h3>
            </div>
            <DataTable
              columns={shiftColumns}
              data={shifts}
              loading={loading}
              emptyMessage="No volunteer shifts scheduled."
              renderRowActions={(row: any) => {
                const enrolledCount = allAttendance.filter((a) => a.shift_id === row.id || a.shift?.id === row.id).length;
                const capacity = Number(row.capacity ?? 5);
                const isFull = enrolledCount >= capacity;
                return (
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(row)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: isFull ? "#94A3B8" : "#10B981",
                        color: "#FFF",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaUserCheck /> {isFull ? "Shift Full" : "Assign / Join"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleOpenAttendance(row)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E1",
                        background: "#F8FAFC",
                        color: "#2563EB",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaClock /> View Roster ({enrolledCount})
                    </button>
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* TAB 4: ATTENDANCE LOG */}
        {activeTab === "attendance" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Real-Time Attendance Stream ({allAttendance.length})
              </h3>
            </div>
            <DataTable
              columns={attendanceColumns}
              data={allAttendance}
              loading={loading}
              emptyMessage="No attendance logs recorded yet."
              renderRowActions={(row: any) => (
                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                  {!row.check_in_at && (
                    <button
                      type="button"
                      onClick={() => void handleCheckIn(row.id)}
                      style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <FaSignInAlt /> Check In
                    </button>
                  )}
                  {row.check_in_at && !row.check_out_at && (
                    <button
                      type="button"
                      onClick={() => void handleCheckOut(row.id)}
                      style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <FaSignOutAlt /> Check Out
                    </button>
                  )}
                  {row.check_out_at && (
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#047857", background: "#D1FAE5", padding: "4px 8px", borderRadius: "999px" }}>
                      COMPLETED
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        )}

        {/* TAB 5: COMPLETED WORK */}
        {activeTab === "completed" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Verified Completed Volunteer Work Units ({completedWorkList.length})
              </h3>
            </div>
            <DataTable
              columns={completedColumns}
              data={completedWorkList}
              loading={loading}
              emptyMessage="No completed volunteer work items logged yet."
            />
          </div>
        )}

        {/* TAB 6: PERFORMANCE & ACTIVITY REPORTS */}
        {activeTab === "performance_reports" && (
          <div>
            {/* Metrics Visual Panel */}
            <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Volunteer Network Performance &amp; Activity Stream
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "13px" }}>
                    Real-time operational summary of scheduled shifts, attendance rates, verified work hours, and report exports.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => void handleExportReports("csv")}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaFileDownload /> Export CSV Report
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportReports("pdf")}
                    style={{ padding: "8px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <FaFileDownload /> Export PDF Report
                  </button>
                </div>
              </div>

              {/* Performance Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Total Shifts Scheduled</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#2563EB", marginTop: "4px" }}>{totalShiftCount} Shifts</div>
                </div>

                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Enrolled / Active Logs</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#F59E0B", marginTop: "4px" }}>{totalAttendanceCount} Logs</div>
                </div>

                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Completed Assignments</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>{totalCompletedCount} Tasks</div>
                </div>

                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Total Hours Contributed</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#6366F1", marginTop: "4px" }}>{totalHoursSum} Hours</div>
                </div>

                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Completion Index</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#047857", marginTop: "4px" }}>{completionRate}%</div>
                </div>
              </div>
            </div>

            {/* Filter Bar for Activity Reports */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>From:</span>
                <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>To:</span>
                <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <select value={volunteerFilter} onChange={(e) => setVolunteerFilter(e.target.value)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", background: "#FFF" }}>
                  <option value="">All Volunteers</option>
                  {approvedVolunteers.map((v) => (
                    <option key={v.id} value={v.id}>{v.user?.full_name || v.full_name || `Volunteer ${String(v.id).slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
            </div>

            <DataTable
              columns={completedColumns}
              data={completedWorkList.filter((c) => !volunteerFilter || String(c.volunteer_id) === volunteerFilter)}
              loading={loading}
              emptyMessage="No activity records matching selected filters."
            />
          </div>
        )}
      </div>

      {/* MODAL 1: Public / Intake Application Submission */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Volunteer Public Application Intake">
        <form onSubmit={handleApplySubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Full Name *</label>
              <input type="text" required placeholder="e.g. Jane Doe" value={applyForm.full_name} onChange={(e) => setApplyForm({ ...applyForm, full_name: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Email Address *</label>
              <input type="email" required placeholder="jane@example.com" value={applyForm.email} onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Phone Number *</label>
              <input type="text" required placeholder="+91-9876543210" value={applyForm.phone} onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Preferred Volunteer Role *</label>
              <select value={applyForm.preferred_role} onChange={(e) => setApplyForm({ ...applyForm, preferred_role: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
                {PREFERRED_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Availability &amp; Preferred Timings</label>
            <input type="text" placeholder="e.g. Weekends & Morning shifts" value={applyForm.availability} onChange={(e) => setApplyForm({ ...applyForm, availability: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Application Message / Experience Notes</label>
            <textarea rows={3} placeholder="Tell us about your background and interest in supporting animal welfare..." value={applyForm.notes} onChange={(e) => setApplyForm({ ...applyForm, notes: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsApplyModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Submitting..." : "Submit Volunteer Application"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Application Review & Response Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedApplicant(null);
        }}
        title={`Review Application — ${selectedApplicant?.user?.full_name || selectedApplicant?.full_name || "Applicant"}`}
        size="lg"
        footer={
          selectedApplicant ? (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleApproveApplication(selectedApplicant)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaCheckCircle size={12} /> Approve Application
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleRejectApplication(selectedApplicant)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaTimesCircle size={12} /> Reject Application
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setSelectedApplicant(null);
                }}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#334155", cursor: "pointer" }}
              >
                Close
              </button>
            </>
          ) : null
        }
      >
        {selectedApplicant && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Applicant Name</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedApplicant.user?.full_name || selectedApplicant.full_name || "-"}</div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Email &amp; Phone</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>
                  {selectedApplicant.user?.email || selectedApplicant.email || "-"} / {selectedApplicant.user?.phone || selectedApplicant.phone || selectedApplicant.emergency_contact_phone || "-"}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: "4px" }}>
                  Assigned Volunteer Role
                </div>
                <select
                  value={reviewRole}
                  onChange={(e) => setReviewRole(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px", fontWeight: 700, color: "#2563EB", background: "#FFF", outline: "none" }}
                >
                  {PREFERRED_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Availability / Timings</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{selectedApplicant.availability || "Weekends"}</div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Application Notes / Message</div>
                <div style={{ fontSize: "13px", color: "#334155", marginTop: "2px" }}>{selectedApplicant.notes || selectedApplicant.message || "No notes submitted."}</div>
              </div>
            </div>

            {/* Custom Notification Message Override */}
            <div style={{ background: "#EFF6FF", padding: "12px", borderRadius: "8px", border: "1px solid #BFDBFE", marginTop: "6px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E40AF", display: "flex", alignItems: "center", gap: "6px" }}>
                <FaPaperPlane /> Optional Personal Message to Applicant
              </div>
              <div style={{ fontSize: "11px", color: "#3B82F6", marginTop: "2px", marginBottom: "6px" }}>
                Leave empty to send the standard PawGuard application approval/rejection message.
              </div>
              <textarea
                rows={3}
                placeholder="Enter custom response message to be delivered via notification..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #93C5FD", fontSize: "12px", resize: "vertical" }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: Create Volunteer Shift */}
      <Modal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} title="Create Volunteer Shift Schedule">
        <form onSubmit={handleCreateShift} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Role / Activity Name *</label>
            <input type="text" required placeholder="e.g. Dog Walking &amp; Socialization" value={shiftForm.role_name} onChange={(e) => setShiftForm({ ...shiftForm, role_name: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
          </div>

          {facilities.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Shelter Facility</label>
              <select value={shiftForm.shelter_facility_id} onChange={(e) => setShiftForm({ ...shiftForm, shelter_facility_id: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}>
                <option value="">Central Shelter Facility</option>
                {facilities.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Start Time *</label>
              <input type="datetime-local" required value={shiftForm.start_at} onChange={(e) => setShiftForm({ ...shiftForm, start_at: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>End Time *</label>
              <input type="datetime-local" required value={shiftForm.end_at} onChange={(e) => setShiftForm({ ...shiftForm, end_at: e.target.value })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Capacity Limit *</label>
            <input type="number" min="1" required value={shiftForm.capacity} onChange={(e) => setShiftForm({ ...shiftForm, capacity: Number(e.target.value) })} style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Direct Volunteer Assignment (Optional)</label>
            <select
              value={shiftForm.assigned_volunteer_id}
              onChange={(e) => setShiftForm({ ...shiftForm, assigned_volunteer_id: e.target.value })}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
            >
              <option value="">Open Shift (No Direct Volunteer Assigned Yet)</option>
              {approvedVolunteers.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.user?.full_name || v.full_name || v.emergency_contact_name || "Volunteer"} — {v.preferred_role || v.skills || "General Support"} ({v.availability || "Flexible"})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsShiftModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Saving..." : "Save Shift Schedule"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Attendance & Check-In Control Drawer */}
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
              <p style={{ color: "#64748B" }}>Loading shift roster...</p>
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
                          type="button"
                          onClick={() => void handleCheckIn(att.id)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <FaSignInAlt /> Check In
                        </button>
                      )}

                      {att.check_in_at && !att.check_out_at && (
                        <button
                          type="button"
                          onClick={() => void handleCheckOut(att.id)}
                          style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <FaSignOutAlt /> Check Out
                        </button>
                      )}

                      {att.check_out_at && (
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#047857", background: "#D1FAE5", padding: "4px 8px", borderRadius: "999px" }}>
                          COMPLETED ({att.hours_served || 0} hrs)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setIsAttendanceModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", fontWeight: 600 }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ASSIGN VOLUNTEER TO SHIFT MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Volunteer to Shift: ${selectedShiftToAssign?.role_name || selectedShiftToAssign?.title || "Shift"}`}
      >
        {selectedShiftToAssign && (
          <form onSubmit={handleConfirmAssignVolunteer} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "12px 14px", borderRadius: "8px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
                {selectedShiftToAssign.role_name || selectedShiftToAssign.title || "Shelter Activity"}
              </div>
              <div style={{ fontSize: "12px", color: "#64748B" }}>
                Time: {formatDateTime(selectedShiftToAssign.start_at)} — {formatDateTime(selectedShiftToAssign.end_at)}
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
                Capacity Status:{" "}
                <strong style={{ color: "#2563EB" }}>
                  {allAttendance.filter((a) => a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id).length} / {selectedShiftToAssign.capacity || 5} Enrolled
                </strong>
              </div>
            </div>

            {/* Check Capacity */}
            {allAttendance.filter((a) => a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id).length >= (selectedShiftToAssign.capacity || 5) ? (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#FEE2E2", color: "#991B1B", fontSize: "13px", fontWeight: 700 }}>
                ⚠️ Shift capacity is full. You cannot assign additional volunteers to this shift.
              </div>
            ) : approvedVolunteers.length === 0 ? (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#FEF3C7", color: "#92400E", fontSize: "13px", fontWeight: 700 }}>
                ⚠️ No active or onboarded volunteers available. Please approve pending applications first.
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                  Select Approved Volunteer *
                </label>
                <select
                  value={selectedAssignVolunteerId}
                  onChange={(e) => setSelectedAssignVolunteerId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", outline: "none" }}
                  required
                >
                  {approvedVolunteers.map((vol) => {
                    const volName = vol.user?.full_name || vol.full_name || vol.emergency_contact_name || "Volunteer Record";
                    const volRole = vol.preferred_role || vol.skills || "Shelter Support";
                    const volAvail = vol.availability || "Flexible";
                    return (
                      <option key={vol.id} value={vol.id}>
                        {volName} — Role: {volRole} ({volAvail})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Check Duplicate Enrollment */}
            {selectedAssignVolunteerId &&
              allAttendance.some(
                (a) =>
                  (a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id) &&
                  (String(a.volunteer_id) === String(selectedAssignVolunteerId) ||
                    String(a.volunteer_profile_id) === String(selectedAssignVolunteerId) ||
                    String(a.volunteer?.id) === String(selectedAssignVolunteerId))
              ) && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#FEF3C7", color: "#92400E", fontSize: "13px", fontWeight: 700 }}>
                  ⚠️ Selected volunteer is already enrolled in this shift.
                </div>
              )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#475569", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  approvedVolunteers.length === 0 ||
                  allAttendance.filter((a) => a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id).length >= (selectedShiftToAssign.capacity || 5) ||
                  allAttendance.some(
                    (a) =>
                      (a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id) &&
                      (String(a.volunteer_id) === String(selectedAssignVolunteerId) ||
                        String(a.volunteer_profile_id) === String(selectedAssignVolunteerId) ||
                        String(a.volunteer?.id) === String(selectedAssignVolunteerId))
                  )
                }
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    isSubmitting ||
                    approvedVolunteers.length === 0 ||
                    allAttendance.filter((a) => a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id).length >= (selectedShiftToAssign.capacity || 5) ||
                    allAttendance.some(
                      (a) =>
                        (a.shift_id === selectedShiftToAssign.id || a.shift?.id === selectedShiftToAssign.id) &&
                        (String(a.volunteer_id) === String(selectedAssignVolunteerId) ||
                          String(a.volunteer_profile_id) === String(selectedAssignVolunteerId) ||
                          String(a.volunteer?.id) === String(selectedAssignVolunteerId))
                    )
                      ? "#94A3B8"
                      : "#10B981",
                  color: "#FFF",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isSubmitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: VOLUNTEER PROFILE DETAILS */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedVolunteerRecord(null);
          setVolunteerSummary(null);
        }}
        title={`Volunteer Profile — ${selectedVolunteerRecord?.user?.full_name || selectedVolunteerRecord?.full_name || "Record"}`}
        size="lg"
      >
        {selectedVolunteerRecord && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Full Name &amp; Contact</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                  {selectedVolunteerRecord.user?.full_name || selectedVolunteerRecord.full_name || "Volunteer Record"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  {selectedVolunteerRecord.user?.email || selectedVolunteerRecord.email || "No email"} &bull; {selectedVolunteerRecord.user?.phone || selectedVolunteerRecord.phone || selectedVolunteerRecord.emergency_contact_phone || "No phone"}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Assigned / Preferred Role</div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#2563EB", marginTop: "2px" }}>
                  {selectedVolunteerRecord.preferred_role || selectedVolunteerRecord.skills || "Shelter Support"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Availability: {selectedVolunteerRecord.availability || "Flexible"}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Emergency Contact</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                  {selectedVolunteerRecord.emergency_contact_name || selectedVolunteerRecord.full_name || "Primary Contact"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>
                  Phone: {selectedVolunteerRecord.emergency_contact_phone || selectedVolunteerRecord.phone || "-"}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Account Status</div>
                <div style={{ marginTop: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, padding: "4px 10px", borderRadius: "999px", background: selectedVolunteerRecord.status === "active" ? "#ECFDF5" : selectedVolunteerRecord.status === "onboarded" ? "#EFF6FF" : "#FEF3C7", color: selectedVolunteerRecord.status === "active" ? "#047857" : selectedVolunteerRecord.status === "onboarded" ? "#1D4ED8" : "#D97706", textTransform: "uppercase" }}>
                    {selectedVolunteerRecord.status || "Applied"}
                  </span>
                </div>
              </div>
            </div>

            {/* Service Summary & Attendance History Section */}
            <div style={{ background: "#EFF6FF", padding: "16px", borderRadius: "12px", border: "1px solid #BFDBFE" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E40AF", marginBottom: "10px" }}>
                Verified Service Record &amp; Attendance History
              </div>

              {(() => {
                const volProfileId = String(selectedVolunteerRecord.id || "").trim();
                const volUserId = String(selectedVolunteerRecord.user_id || selectedVolunteerRecord.user?.id || "").trim();

                const volAttendance = allAttendance.filter((a) => {
                  const attVolId = String(a.volunteer_id || a.volunteer?.id || "").trim();
                  const attProfileId = String(a.volunteer_profile_id || a.volunteer?.profile_id || "").trim();
                  const attUserId = String(a.user_id || a.user?.id || a.volunteer?.user_id || "").trim();

                  const matchesProfile = Boolean(volProfileId && (attVolId === volProfileId || attProfileId === volProfileId));
                  const matchesUser = Boolean(volUserId && (attVolId === volUserId || attUserId === volUserId));
                  return matchesProfile || matchesUser;
                });

                const completedLogs = volAttendance.filter((a) => Boolean(a.check_out_at));
                const totalHours = completedLogs.reduce((acc, curr) => acc + (Number(curr.hours_served) || 0), 0);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #93C5FD" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Hours Served</div>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "#2563EB", marginTop: "2px" }}>
                          {volunteerSummary?.total_hours || volunteerSummary?.hours_served || totalHours} Hrs
                        </div>
                      </div>
                      <div style={{ background: "#FFF", padding: "12px", borderRadius: "8px", border: "1px solid #93C5FD" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Completed Shifts</div>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "#10B981", marginTop: "2px" }}>
                          {volunteerSummary?.completed_shifts || completedLogs.length} Shifts
                        </div>
                      </div>
                      <div style={{ background: "#FFF", padding: "10px", borderRadius: "8px", border: "1px solid #93C5FD" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Joined Shifts</div>
                        <div style={{ fontSize: "20px", fontWeight: 800, color: "#6366F1", marginTop: "2px" }}>
                          {volunteerSummary?.total_shifts || volAttendance.length} Enrolled
                        </div>
                      </div>
                    </div>

                    {/* Individual Shift Attendance Log Stream */}
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1E3A8A", marginBottom: "6px" }}>
                        Individual Shift Attendance Logs ({volAttendance.length})
                      </div>
                      {volAttendance.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#64748B", background: "#FFF", padding: "10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}>
                          No shift attendance records logged for this volunteer yet.
                        </div>
                      ) : (
                        <div style={{ maxHeight: "180px", overflowY: "auto", background: "#FFF", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#F1F5F9", textAlign: "left", color: "#475569" }}>
                                <th style={{ padding: "8px 10px" }}>Shift Activity</th>
                                <th style={{ padding: "8px 10px" }}>Check-In</th>
                                <th style={{ padding: "8px 10px" }}>Check-Out</th>
                                <th style={{ padding: "8px 10px" }}>Hours</th>
                                <th style={{ padding: "8px 10px" }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {volAttendance.map((log: any, idx: number) => {
                                const isDone = Boolean(log.check_out_at);
                                const isCheckedIn = Boolean(log.check_in_at && !log.check_out_at);
                                return (
                                  <tr key={log.id || idx} style={{ borderBottom: "1px solid #E2E8F0" }}>
                                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0F172A" }}>
                                      {log.shift?.role_name || log.shift_name || "Volunteer Shift"}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "#475569" }}>
                                      {log.check_in_at ? formatDateTime(log.check_in_at) : "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px", color: "#475569" }}>
                                      {log.check_out_at ? formatDateTime(log.check_out_at) : "-"}
                                    </td>
                                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563EB" }}>
                                      {log.hours_served || 0} Hrs
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          fontWeight: 800,
                                          padding: "2px 6px",
                                          borderRadius: "4px",
                                          background: isDone ? "#D1FAE5" : isCheckedIn ? "#FEF3C7" : "#EFF6FF",
                                          color: isDone ? "#047857" : isCheckedIn ? "#D97706" : "#1D4ED8",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        {isDone ? "Completed" : isCheckedIn ? "Checked In" : "Enrolled"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => void handleIssueCertificate(selectedVolunteerRecord.id)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#6366F1", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FaAward /> Download Certificate
              </button>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
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

export default VolunteerCoordinatorDashboard;

