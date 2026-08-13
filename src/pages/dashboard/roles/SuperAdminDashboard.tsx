import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaPaw,
  FaBuilding,
  FaTruckMedical,
  FaHeart,
  FaHouse,
  FaHandsHolding,
  FaIndianRupeeSign,
} from "react-icons/fa6";
import { FaRegClock, FaShieldAlt, FaSync } from "react-icons/fa";
import useExecutiveDashboard from "../../../hooks/useExecutiveDashboard";
import ExecutiveSummaryCard from "../../../components/dashboard/ExecutiveSummaryCard";
import DashboardSectionHeader from "../../../components/dashboard/DashboardSectionHeader";
import DashboardSkeleton from "../../../components/dashboard/DashboardSkeleton";
import QuickActions from "../../../components/dashboard/QuickActions";
import SystemAlerts from "../../../components/dashboard/SystemAlerts";
import DashboardNotificationsPanel from "../../../components/dashboard/DashboardNotificationsPanel";
import RecentActivitiesPanel from "../../../components/dashboard/RecentActivitiesPanel";
import DashboardNavigationCards from "../../../components/dashboard/DashboardNavigationCards";
import { getCurrentUser, getCurrentUserRole, getRoleTitle } from "../../../utils/roleUtils";

const AnalyticsCharts = lazy(() => import("../../../components/dashboard/AnalyticsCharts"));

const formatINR = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const {
    summary,
    users,
    dogs,
    shelters,
    rescues,
    adoptions,
    fosters,
    volunteers,
    donations,
    inventory,
    medical,
    finance,
    financeSummary,
    activities,
    loading,
    error,
    lastUpdated,
    refreshing,
    refresh,
  } = useExecutiveDashboard();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const user = getCurrentUser();
  const displayName = user?.name || "Administrator";
  const roleTitle = getRoleTitle(getCurrentUserRole() ?? "super_admin");

  // 1. Total Users
  const totalUsers = users.length || Number(summary.total_users || summary.users_count || 0);
  const activeUsersCount = users.filter((u) => u.is_active !== false).length;

  // 2. Rescued Dogs
  const totalDogs = dogs.length || Number(summary.total_dogs || summary.dogs_count || 0);
  const rescuedDogsCount = dogs.filter((d) =>
    Boolean(d.rescue_case_id || String(d.status || d.current_status || "").toLowerCase().includes("rescue"))
  ).length;

  // 3. Shelters
  const totalShelters = shelters.length || Number(summary.total_shelters || summary.shelters_count || 0);
  const activeSheltersCount = shelters.filter((s) => s.status !== "inactive" && s.is_active !== false).length;

  // 4. Active Rescues (matching PawGuard lifecycle: reported -> verified -> dispatched -> located -> rescued -> admitted)
  const activeRescuesList = rescues.filter((r) =>
    /reported|verified|dispatched|located|rescued|admitted|pending|in_progress|open/i.test(
      String(r.status || r.stage || r.dispatch_status || "")
    )
  );
  const activeRescuesCount = rescues.length > 0 ? activeRescuesList.length : Number(summary.active_rescues || 0);
  const awaitingDispatchCount = rescues.filter((r) =>
    /reported|pending|new/i.test(String(r.status || r.stage || ""))
  ).length;

  // 5. Pending Adoptions (submitted, screening, interview, home_check, vetting)
  const pendingAdoptionsList = adoptions.filter((a) =>
    /submitted|screening|interview|home_check|vetting|pending|in_review/i.test(String(a.status || ""))
  );
  const pendingAdoptionsCount = adoptions.length > 0 ? pendingAdoptionsList.length : Number(summary.pending_adoptions || 0);
  const newAdoptionAppsCount = adoptions.filter((a) => String(a.status || "").toLowerCase() === "submitted").length;

  // 6. Active Fosters
  const activeFostersList = fosters.filter((f) =>
    /active|placed|approved|in_progress|pending/i.test(String(f.status || f.placement_status || ""))
  );
  const activeFostersCount = fosters.length > 0 ? activeFostersList.length : Number(summary.active_foster_placements || 0);

  // 7. Volunteers
  const totalVolunteers = volunteers.length || Number(summary.volunteers_count || summary.volunteers || 0);
  const activeVolunteersCount = volunteers.filter((v) => v.is_active !== false && String(v.status || "").toLowerCase() !== "rejected").length;

  // 8. Donations (INR ₹) — aligned with Finance.tsx calculation & financeSummary source
  const numericVal = (val: unknown): number => {
    const n = Number(String(val ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const summaryRevenue = financeSummary?.total_donations ?? financeSummary?.totalRevenue ?? financeSummary?.total_revenue ?? financeSummary?.total_income;
  const summarySuccessfulDonations = financeSummary?.successful_donations ?? financeSummary?.successfulDonations;

  const transactionIncomeSum = finance
    .filter((t) => /income|donation|revenue/.test(String(t.type || "").toLowerCase()))
    .reduce((sum, t) => sum + numericVal(t.amount), 0);

  const donationIncomeSum = donations
    .filter((d) => String(d.status || "").toLowerCase() === "success" || String(d.status || "").toLowerCase() === "posted")
    .reduce((sum, d) => sum + numericVal(d.amount), 0);

  const rawDonationsSum = donations.reduce((sum, d) => sum + numericVal(d.amount), 0);

  const totalDonationAmount = Number(
    summaryRevenue ??
    (transactionIncomeSum > 0 ? transactionIncomeSum : undefined) ??
    (donationIncomeSum > 0 ? donationIncomeSum : undefined) ??
    (rawDonationsSum > 0 ? rawDonationsSum : undefined) ??
    summary.total_donations ??
    summary.total_revenue ??
    0
  );

  const successfulCount = Number(
    summarySuccessfulDonations ??
    (donations.filter((d) => String(d.status || "").toLowerCase() === "success" || String(d.status || "").toLowerCase() === "posted").length > 0
      ? donations.filter((d) => String(d.status || "").toLowerCase() === "success" || String(d.status || "").toLowerCase() === "posted").length
      : undefined) ??
    (donations.length > 0 ? donations.length : undefined) ??
    finance.filter((t) => /income|donation|revenue/.test(String(t.type || "").toLowerCase())).length ??
    0
  );

  const kpis = [
    {
      title: "Total Users",
      value: totalUsers,
      subtitle: `${activeUsersCount} active accounts`,
      icon: <FaUsers />,
      color: "#2563EB",
      path: "/users",
    },
    {
      title: "Rescued Dogs",
      value: totalDogs,
      subtitle: `${totalDogs} registered dogs${rescuedDogsCount > 0 ? ` · ${rescuedDogsCount} rescued` : ""}`,
      icon: <FaPaw />,
      color: "#EF4444",
      path: "/pets",
    },
    {
      title: "Shelters",
      value: totalShelters,
      subtitle: `${activeSheltersCount} active facilities`,
      icon: <FaBuilding />,
      color: "#8B5CF6",
      path: "/shelters",
    },
    {
      title: "Active Rescues",
      value: activeRescuesCount,
      subtitle: activeRescuesCount > 0 ? `${awaitingDispatchCount} awaiting dispatch` : "No active rescue incidents",
      icon: <FaTruckMedical />,
      color: "#F97316",
      path: "/rescues",
    },
    {
      title: "Pending Adoptions",
      value: pendingAdoptionsCount,
      subtitle: pendingAdoptionsCount > 0 ? `${newAdoptionAppsCount} new applications` : "No pending adoptions",
      icon: <FaHeart />,
      color: "#EC4899",
      path: "/adoptions",
    },
    {
      title: "Active Fosters",
      value: activeFostersCount,
      subtitle: activeFostersCount > 0 ? `${fosters.length} total placements` : "No active foster placements",
      icon: <FaHouse />,
      color: "#10B981",
      path: "/fosters",
    },
    {
      title: "Volunteers",
      value: totalVolunteers,
      subtitle: totalVolunteers > 0 ? `${activeVolunteersCount} active volunteers` : "No volunteer records",
      icon: <FaHandsHolding />,
      color: "#F59E0B",
      path: "/volunteers",
    },
    {
      title: "Donations",
      value: formatINR(totalDonationAmount),
      subtitle: successfulCount > 0 ? `${successfulCount} successful donations` : "No donations recorded",
      icon: <FaIndianRupeeSign />,
      color: "#06B6D4",
      path: "/finance",
    },
  ];

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Welcome back, {displayName}</h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34D399",
                  border: "1px solid rgba(52, 211, 153, 0.4)",
                  padding: "2px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <FaShieldAlt size={10} /> {roleTitle}
              </span>
            </div>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: "13.5px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <FaRegClock />
              {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · "}
              {now.toLocaleTimeString("en-US")}
              {lastUpdated && (
                <>
                  {" · Last updated "}
                  {lastUpdated.toLocaleTimeString("en-US")}
                </>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => refresh()}
              disabled={refreshing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "#334155",
                color: "#FFF",
                border: "none",
                padding: "9px 16px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.7 : 1,
              }}
            >
              <FaSync className={refreshing ? "dash-spin" : undefined} />
              {refreshing ? "Refreshing..." : "Refresh Summary"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A",
            color: "#92400E",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {kpis.map((kpi) => (
          <ExecutiveSummaryCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            color={kpi.color}
            path={kpi.path}
            loading={loading}
          />
        ))}
      </div>

      <div style={{ marginBottom: "28px" }}>
        <DashboardSectionHeader
          title="Quick Actions"
          subtitle="Frequently used operations"
        />
        <QuickActions />
      </div>

      <div style={{ marginBottom: "28px" }}>
        <DashboardSectionHeader
          title="System Alerts"
          subtitle="Items that need your attention"
          actionLabel="View audit logs"
          actionIcon={<FaShieldAlt />}
          onAction={() => navigate("/audit-logs")}
        />
        <SystemAlerts
          inventory={inventory}
          medical={medical}
          shelters={shelters}
          rescues={rescues}
          finance={finance}
          adoptions={adoptions}
          volunteers={volunteers}
        />
      </div>

      <div style={{ marginBottom: "28px" }}>
        <DashboardSectionHeader
          title="Analytics"
          subtitle="Live operational insights across the platform"
        />
        <Suspense fallback={<DashboardSkeleton rows={4} />}>
          <AnalyticsCharts
            adoptions={adoptions}
            rescues={rescues}
            finance={finance}
            inventory={inventory}
            medical={medical}
            shelters={shelters}
            users={users}
          />
        </Suspense>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
          alignItems: "start",
        }}
      >
        <DashboardNotificationsPanel />
        <RecentActivitiesPanel activities={activities} loading={loading} />
      </div>

      <div style={{ marginBottom: "28px" }}>
        <DashboardSectionHeader
          title="Explore Modules"
          subtitle="Quick access shortcuts to frequently used operational areas"
        />
        <DashboardNavigationCards />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
