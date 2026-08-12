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
  FaDollarSign,
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
import { isPending } from "../../../utils/chartUtils";
import type { AnyRecord, DashboardSummary } from "../../../types/dashboard";

const AnalyticsCharts = lazy(() => import("../../../components/dashboard/AnalyticsCharts"));

const isIncome = (record: AnyRecord): boolean =>
  /donation|income|grant|fundraising|sponsor|revenue|inflow/i.test(
    String(record.type ?? record.category ?? record.transaction_type ?? record.description ?? "")
  );

const pickCount = (
  summary: DashboardSummary,
  list: AnyRecord[],
  keys: string[],
  predicate?: (record: AnyRecord) => boolean
): number => {
  for (const key of keys) {
    const value = summary[key];
    if (typeof value === "number") return value;
  }
  return predicate ? list.filter(predicate).length : list.length;
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { summary, users, dogs, shelters, rescues, adoptions, fosters, volunteers, inventory, medical, finance, activities, loading, error, lastUpdated, refreshing, refresh } =
    useExecutiveDashboard();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const user = getCurrentUser();
  const displayName = user?.name || "Administrator";
  const roleTitle = getRoleTitle(getCurrentUserRole() ?? "super_admin");

  const kpis = [
    {
      title: "Total Users",
      value: pickCount(summary, users, ["total_users", "users_count"]),
      subtitle: `${users.filter((u) => u.is_active !== false).length} active accounts`,
      icon: <FaUsers />,
      color: "#2563EB",
      path: "/users",
    },
    {
      title: "Rescued Dogs",
      value: pickCount(summary, dogs, ["total_dogs", "dogs_count"]),
      subtitle: `${dogs.length} registered dogs`,
      icon: <FaPaw />,
      color: "#EF4444",
      path: "/pets",
    },
    {
      title: "Shelters",
      value: pickCount(summary, shelters, ["total_shelters", "shelters_count", "rescue_centres_count"]),
      subtitle: "Facilities in the network",
      icon: <FaBuilding />,
      color: "#8B5CF6",
      path: "/shelters",
    },
    {
      title: "Active Rescues",
      value: pickCount(summary, rescues, ["active_rescues", "rescue_requests"], (r) => isPending(r)),
      subtitle: "Incidents in progress",
      icon: <FaTruckMedical />,
      color: "#F97316",
      path: "/rescues",
    },
    {
      title: "Pending Adoptions",
      value: pickCount(summary, adoptions, ["pending_adoptions", "adoptions_count"], (r) => isPending(r)),
      subtitle: "Applications in review",
      icon: <FaHeart />,
      color: "#EC4899",
      path: "/adoptions",
    },
    {
      title: "Active Fosters",
      value: pickCount(summary, fosters, ["active_foster_placements", "foster_placements"], (r) => isPending(r)),
      subtitle: "Current foster placements",
      icon: <FaHouse />,
      color: "#10B981",
      path: "/fosters",
    },
    {
      title: "Volunteers",
      value: pickCount(summary, volunteers, ["volunteers", "volunteers_count"]),
      subtitle: `${volunteers.length} applications received`,
      icon: <FaHandsHolding />,
      color: "#F59E0B",
      path: "/volunteers",
    },
    {
      title: "Donations",
      value: pickCount(summary, finance, ["donations_count", "total_donations"], isIncome),
      subtitle: "Incoming contributions",
      icon: <FaDollarSign />,
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
