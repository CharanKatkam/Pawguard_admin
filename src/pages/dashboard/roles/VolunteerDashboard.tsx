import { useState, useEffect, useCallback } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import Modal from "../../../components/common/Modal";
import { useToast } from "../../../context/ToastContext";
import {
  FaClipboardList,
  FaClock,
  FaCalendarCheck,
  FaAward,
  FaSignInAlt,
  FaSignOutAlt,
  FaBell,
  FaSync,
  FaSearch,
  FaUserCheck,
} from "react-icons/fa";
import volunteerService from "../../../services/volunteerService";
import notificationService from "../../../services/notificationService";
import { getCurrentUser } from "../../../utils/roleUtils";
import { useDataSync, notifyDataChanged } from "../../../utils/dataSync";
import { formatDateTime } from "../../../utils/dateUtils";

type TabKey = "available" | "my_shifts" | "summary" | "notifications";

const VolunteerDashboard = () => {
  const { addToast } = useToast();
  const currentUser = getCurrentUser();

  const [activeTab, setActiveTab] = useState<TabKey>("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States
  const [availableShifts, setAvailableShifts] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState<any[]>([]);
  const [serviceSummary, setServiceSummary] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState<string>("Shift tasks completed");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVolunteerPortalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const profileId = (currentUser as any)?.volunteer_profile_id || (currentUser as any)?.id || "";

      const [shiftRes, notifRes, summaryRes] = await Promise.allSettled([
        volunteerService.getShifts(),
        notificationService.getNotifications(1, 20),
        profileId ? volunteerService.getServiceSummary(profileId) : Promise.resolve(null),
      ]);

      const rawShifts = shiftRes.status === "fulfilled"
        ? (Array.isArray(shiftRes.value) ? shiftRes.value : (shiftRes.value as any)?.data || (shiftRes.value as any)?.items || [])
        : [];

      const rawNotifs = notifRes.status === "fulfilled"
        ? (Array.isArray(notifRes.value) ? notifRes.value : (notifRes.value as any)?.data || [])
        : [];

      const summaryObj = summaryRes.status === "fulfilled" ? (summaryRes.value as any)?.data || summaryRes.value || {} : {};

      setAvailableShifts(rawShifts);
      setNotifications(rawNotifs);
      setServiceSummary(summaryObj);

      // Fetch attendance for available shifts
      if (rawShifts.length > 0) {
        const attPromises = rawShifts.slice(0, 10).map((s: any) =>
          volunteerService.getShiftAttendance(s.id).catch(() => [])
        );
        const attResults = await Promise.allSettled(attPromises);
        const allAtt: any[] = [];
        attResults.forEach((res, i) => {
          if (res.status === "fulfilled") {
            const val = (res as PromiseFulfilledResult<any>).value;
            const list = Array.isArray(val) ? val : val?.data || [];
            list.forEach((att: any) => {
              allAtt.push({ ...att, shift: rawShifts[i] });
            });
          }
        });
        setMyAttendance(allAtt);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load volunteer portal data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchVolunteerPortalData();
  }, [fetchVolunteerPortalData]);

  useDataSync(fetchVolunteerPortalData);

  // Handle Accept / Join Shift
  const handleJoinShift = async (shiftId: string) => {
    try {
      setIsSubmitting(true);
      await volunteerService.joinShift(shiftId);
      addToast("Shift accepted & joined successfully! View it under 'My Joined Shifts'.", "success");
      fetchVolunteerPortalData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to join shift.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Check-In
  const handleCheckIn = async (attendanceId: string) => {
    try {
      setIsSubmitting(true);
      await volunteerService.checkInAttendance(attendanceId);
      addToast("Check-in successful! Have a great volunteer shift.", "success");
      fetchVolunteerPortalData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Check-in failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Check-Out
  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendance?.id) return;
    try {
      setIsSubmitting(true);
      await volunteerService.checkOutAttendance(selectedAttendance.id, checkOutNotes);
      addToast("Check-out complete! Thank you for your volunteer service.", "success");
      setIsCheckOutModalOpen(false);
      setSelectedAttendance(null);
      fetchVolunteerPortalData();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Check-out failed.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Certificate Issue
  const handleDownloadCertificate = async () => {
    const profileId = (currentUser as any)?.volunteer_profile_id || (currentUser as any)?.id || "";
    if (!profileId) {
      addToast("No active volunteer profile linked.", "error");
      return;
    }
    try {
      addToast("Fetching verified volunteer service certificate...", "info");
      const cert = await volunteerService.getCertificate(profileId);
      if (cert?.certificate_url || cert?.download_url) {
        window.open(cert.certificate_url || cert.download_url, "_blank");
        addToast("Service Certificate opened.", "success");
      } else {
        addToast("Service Certificate generated successfully!", "success");
      }
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to generate certificate.", "error");
    }
  };

  // Filtered Open Shifts
  const filteredShifts = availableShifts.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const role = String(s.role_name || s.title || "").toLowerCase();
    const facility = String(s.shelter_facility_id || "").toLowerCase();
    return role.includes(q) || facility.includes(q);
  });

  const totalHours = serviceSummary?.total_hours || serviceSummary?.hours_served || 0;
  const completedCount = serviceSummary?.completed_shifts || myAttendance.filter((a) => a.check_out_at).length;

  const statCards = [
    {
      title: "Available Shifts",
      value: loading ? "..." : String(availableShifts.length),
      trend: "Open Opportunities",
      color: "#2563EB",
      icon: <FaClipboardList />,
      onClick: () => setActiveTab("available"),
    },
    {
      title: "My Joined Shifts",
      value: loading ? "..." : String(myAttendance.length),
      trend: `${completedCount} Completed`,
      color: "#10B981",
      icon: <FaCalendarCheck />,
      onClick: () => setActiveTab("my_shifts"),
    },
    {
      title: "Volunteer Hours Served",
      value: loading ? "..." : `${totalHours} Hrs`,
      trend: "Verified Contributions",
      color: "#6366F1",
      icon: <FaClock />,
      onClick: () => setActiveTab("summary"),
    },
    {
      title: "Service Certificate",
      value: "Verified",
      trend: "Official Recognition",
      color: "#EC4899",
      icon: <FaAward />,
      onClick: () => void handleDownloadCertificate(),
    },
  ];

  const shiftColumns = [
    {
      key: "role_name",
      header: "Activity / Role Name",
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
      header: "Open Capacity",
      render: (v: number) => <strong style={{ color: "#2563EB" }}>{v ?? 5} Volunteers</strong>,
    },
  ];

  const attendanceColumns = [
    {
      key: "shift",
      header: "Shift Role & Activity",
      render: (_: any, r: any) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{r.shift?.role_name || r.role_name || "Volunteer Shift"}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>ID: {String(r.id).slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: "check_in_at",
      header: "Check-In Status",
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: v ? "#047857" : "#D97706" }}>
          {v ? `✓ Checked In (${formatDateTime(v)})` : "⏳ Pending Check-In"}
        </span>
      ),
    },
    {
      key: "check_out_at",
      header: "Check-Out Status",
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: v ? "#047857" : "#64748B" }}>
          {v ? `✓ Completed (${formatDateTime(v)})` : "Not Checked Out"}
        </span>
      ),
    },
    {
      key: "hours_served",
      header: "Hours Logged",
      render: (v: number) => <strong style={{ color: "#2563EB" }}>{v || 0} Hours</strong>,
    },
  ];

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Hero Header */}
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
              Personal Volunteer Portal &amp; Shift Schedule
            </h1>
            <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
              Personal portal: accept shift opportunities, manage attendance check-in/out, track volunteer service hours, and view verified certificates.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchVolunteerPortalData}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#FFF",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FaSync /> Refresh Schedule
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Navigation Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaClipboardList />} title="Browse Open Shifts" subtitle="Find volunteer opportunities" color="#2563EB" onClick={() => setActiveTab("available")} />
        <QuickActionCard icon={<FaCalendarCheck />} title="My Shift Schedule" subtitle="Check-in & Check-out" color="#10B981" onClick={() => setActiveTab("my_shifts")} />
        <QuickActionCard icon={<FaAward />} title="Service Certificate" subtitle="Download verified certificate" color="#EC4899" onClick={() => void handleDownloadCertificate()} />
        <QuickActionCard icon={<FaBell />} title="Notifications" subtitle={`${notifications.length} Alerts`} color="#6366F1" onClick={() => setActiveTab("notifications")} />
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {statCards.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* TABBED WORKSPACE */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        {/* Navigation Tabs */}
        <div style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("available")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "available" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "available" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "available" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaClipboardList /> 🗓️ Available Shifts ({availableShifts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("my_shifts")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "my_shifts" ? "2px solid #10B981" : "1px solid #CBD5E1",
                background: activeTab === "my_shifts" ? "#ECFDF5" : "#FFFFFF",
                color: activeTab === "my_shifts" ? "#047857" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaCalendarCheck /> 👤 My Joined Shifts ({myAttendance.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "summary" ? "2px solid #6366F1" : "1px solid #CBD5E1",
                background: activeTab === "summary" ? "#EEF2FF" : "#FFFFFF",
                color: activeTab === "summary" ? "#4338CA" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaAward /> 📜 Service History &amp; Certificate
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "notifications" ? "2px solid #EC4899" : "1px solid #CBD5E1",
                background: activeTab === "notifications" ? "#FCE7F3" : "#FFFFFF",
                color: activeTab === "notifications" ? "#BE185D" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaBell /> 🔔 Notifications ({notifications.length})
            </button>
          </div>
        </div>

        {/* TAB 1: AVAILABLE SHIFTS */}
        {activeTab === "available" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                Browse Open Shelter &amp; Community Shifts ({filteredShifts.length})
              </h3>
              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
                <input
                  type="text"
                  placeholder="Search shifts by role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "220px" }}
                />
              </div>
            </div>

            <DataTable
              columns={shiftColumns}
              data={filteredShifts}
              loading={loading}
              emptyMessage="No available shifts matching criteria."
              renderRowActions={(row: any) => (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleJoinShift(row.id)}
                  style={{
                    padding: "6px 14px",
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
                  <FaUserCheck /> Accept &amp; Join Shift
                </button>
              )}
            />
          </div>
        )}

        {/* TAB 2: MY JOINED SHIFTS & ATTENDANCE */}
        {activeTab === "my_shifts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                My Joined Shifts &amp; Attendance Actions ({myAttendance.length})
              </h3>
            </div>

            <DataTable
              columns={attendanceColumns}
              data={myAttendance}
              loading={loading}
              emptyMessage="You have not joined any shifts yet. Browse 'Available Shifts' to accept an opportunity."
              renderRowActions={(row: any) => (
                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                  {!row.check_in_at && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => void handleCheckIn(row.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#10B981",
                        color: "#FFF",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaSignInAlt /> Check In
                    </button>
                  )}

                  {row.check_in_at && !row.check_out_at && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setSelectedAttendance(row);
                        setCheckOutNotes("Shift tasks completed");
                        setIsCheckOutModalOpen(true);
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
                      <FaSignOutAlt /> Check Out &amp; Complete
                    </button>
                  )}

                  {row.check_out_at && (
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#047857", background: "#D1FAE5", padding: "4px 10px", borderRadius: "999px" }}>
                      ✓ COMPLETED ({row.hours_served || 0} hrs)
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        )}

        {/* TAB 3: SERVICE HISTORY & CERTIFICATE */}
        {activeTab === "summary" && (
          <div>
            <div style={{ background: "#F8FAFC", padding: "20px", borderRadius: "12px", border: "1px solid #E2E8F0", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                    Verified Volunteer Service Record
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "13px" }}>
                    Official record of community rescue contributions and shelter service hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadCertificate()}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#EC4899",
                    color: "#FFF",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaAward size={14} /> Download Service Certificate
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginTop: "16px" }}>
                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Total Hours Contributed</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#2563EB", marginTop: "4px" }}>{totalHours} Hours</div>
                </div>

                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Completed Shifts</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>{completedCount} Shifts</div>
                </div>

                <div style={{ background: "#FFF", padding: "14px", borderRadius: "10px", border: "1px solid #CBD5E1" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Status / Recognition</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#047857", marginTop: "4px" }}>ACTIVE VOLUNTEER</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div>
            <h3 style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
              Volunteer Notifications &amp; Updates ({notifications.length})
            </h3>
            {notifications.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", background: "#F8FAFC", borderRadius: "8px", color: "#64748B" }}>
                No notifications logged.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {notifications.map((n) => (
                  <div key={n.id} style={{ padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "#FFF" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>{n.title}</div>
                      <span style={{ fontSize: "11px", color: "#64748B" }}>{n.time || formatDateTime(n.created_at)}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#334155", marginTop: "4px" }}>{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check-Out Confirmation Modal */}
      <Modal isOpen={isCheckOutModalOpen} onClose={() => setIsCheckOutModalOpen(false)} title="Confirm Shift Check-Out">
        <form onSubmit={handleCheckOutSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Shift Completion Notes</label>
            <textarea
              rows={3}
              placeholder="Record any shift observations, animal socialization notes, or completed tasks..."
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsCheckOutModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 700 }}>
              {isSubmitting ? "Processing Check-Out..." : "Confirm Check-Out & Complete"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VolunteerDashboard;

