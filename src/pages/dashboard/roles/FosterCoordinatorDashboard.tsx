import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable, { type Column } from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaHome, FaPaw, FaUserPlus, FaCalendarCheck, FaSync } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import fosterService from "../../../services/fosterService";
import { useDataSync } from "../../../utils/dataSync";
import { formatDateTime } from "../../../utils/dateUtils";

const FosterCoordinatorDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, profileRes] = await Promise.allSettled([
        dashboardService.getFosterDashboard(),
        fosterService.getFosterProfiles(),
      ]);

      let dashObj: any = null;
      if (dashRes.status === "fulfilled" && dashRes.value) {
        dashObj = dashRes.value?.data || dashRes.value;
      }

      let profileList: any[] = [];
      if (profileRes.status === "fulfilled" && profileRes.value) {
        profileList = Array.isArray(profileRes.value?.data)
          ? profileRes.value.data
          : Array.isArray(profileRes.value)
          ? profileRes.value
          : [];
      } else if (dashObj) {
        profileList = Array.isArray(dashObj?.placements)
          ? dashObj.placements
          : Array.isArray(dashObj?.fosters)
          ? dashObj.fosters
          : Array.isArray(dashObj?.items)
          ? dashObj.items
          : [];
      }

      // Sort newest -> oldest
      profileList.sort((a, b) => {
        const timeA = new Date(a.created_at || a.date || a.updated_at || 0).getTime();
        const timeB = new Date(b.created_at || b.date || b.updated_at || 0).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setDashboardData(dashObj);
      setProfiles(profileList);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Failed to load foster metrics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useDataSync(fetchDashboard);

  // Fallback metric calculations from profile records if dashboard API returns null/403
  const activeHomesCount =
    dashboardData?.active_homes ??
    dashboardData?.activeHomes ??
    profiles.filter((p) => p.is_available || String(p.status).toLowerCase() === "active").length;

  const petsInCareCount =
    dashboardData?.pets_in_care ??
    dashboardData?.petsInCare ??
    profiles.reduce((sum, p) => sum + Number(p.active_count || 0), 0);

  const pendingRequestsCount =
    dashboardData?.pending_requests ??
    dashboardData?.pendingRequests ??
    profiles.filter((p) => String(p.status).toLowerCase() === "pending" || String(p.status).toLowerCase() === "applied").length;

  const availableCapacityCount =
    dashboardData?.available_capacity ??
    dashboardData?.availableCapacity ??
    profiles.reduce((sum, p) => sum + Math.max(0, (Number(p.max_capacity) || 1) - (Number(p.active_count) || 0)), 0);

  const stats = [
    { title: "Active Foster Homes", value: loading ? "..." : String(activeHomesCount), trend: "Available Homes", color: "#2563EB", icon: <FaHome />, onClick: () => navigate("/fosters") },
    { title: "Pets in Foster Care", value: loading ? "..." : String(petsInCareCount), trend: "Active Placements", color: "#10B981", icon: <FaPaw />, onClick: () => navigate("/pets") },
    { title: "Pending Foster Applications", value: loading ? "..." : String(pendingRequestsCount), trend: "Requires Review", color: "#F59E0B", icon: <FaUserPlus />, onClick: () => navigate("/fosters") },
    { title: "Total Care Capacity", value: loading ? "..." : String(availableCapacityCount), trend: "Available Slots", color: "#6366F1", icon: <FaCalendarCheck />, onClick: () => navigate("/fosters") },
  ];

  const columns: Column<any>[] = [
    {
      key: "id",
      title: "Profile / Placement ID",
      render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748B" }}>{v ? String(v).slice(0, 10) : "-"}</span>,
    },
    {
      key: "foster_family",
      title: "Foster Parent / Family",
      render: (_: string, row: any) => {
        const user = row.user || {};
        const name = user.full_name || user.name || user.email || row.foster_name || row.family || row.id || "Foster Parent";
        return <div style={{ fontWeight: 700, color: "#0F172A" }}>{name}</div>;
      },
    },
    {
      key: "active_count",
      title: "Active Placements",
      render: (v: number) => <span style={{ fontWeight: 700, color: "#2563EB" }}>{v ?? 0} Pets</span>,
    },
    {
      key: "max_capacity",
      title: "Capacity",
      render: (v: number) => <span>{v ?? 1} Max</span>,
    },
    {
      key: "created_at",
      title: "Registered / Created",
      render: (v: string, row: any) => {
        const dateStr = v || row.date || row.updated_at;
        return <span style={{ fontSize: "12px", color: "#64748B" }}>{dateStr ? formatDateTime(dateStr) : "N/A"}</span>;
      },
    },
    {
      key: "status",
      title: "Status",
      render: (v: string, row: any) => {
        const isAvail = !!row.is_available;
        const statusStr = String(v || (isAvail ? "active" : "busy")).toUpperCase();
        return (
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 800,
              background: isAvail ? "#D1FAE5" : "#EFF6FF",
              color: isAvail ? "#065F46" : "#1E40AF",
            }}
          >
            {statusStr}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Foster Care Administration Station</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Onboard foster caregivers, place animals in temporary homes, and monitor care duration and return logs.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", color: "#B45309", fontSize: "13px", fontWeight: 600 }}>
          ℹ️ {error} — Fallback data loaded directly from active foster records.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaUserPlus />} title="Register Fosterer" subtitle="Onboard new caregiver" color="#2563EB" onClick={() => navigate("/fosters?action=apply")} />
        <QuickActionCard icon={<FaPaw />} title="Place Dog in Foster" subtitle="Match dog with family" color="#10B981" onClick={() => navigate("/fosters?action=place")} />
        <QuickActionCard icon={<FaSync />} title="Refresh Roster" subtitle="Sync latest foster data" color="#6366F1" onClick={fetchDashboard} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Active Foster Caregivers &amp; Placements (Newest First)
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading foster data...</span>}
        </div>
        <DataTable columns={columns} data={profiles} loading={loading} emptyMessage="No active foster profiles registered." />
      </div>
    </div>
  );
};

export default FosterCoordinatorDashboard;
