import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import AdoptionChart from "../../../components/dashboard/AdoptionChart";
import { buildMonthlyAdoptionHistory } from "../../../utils/adoptionStats";
import RecentActivities from "../../../components/dashboard/RecentActivities";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { useToast } from "../../../context/ToastContext";
import { useDataSync } from "../../../utils/dataSync";
import { getAuditStream } from "../../../utils/eventSystem";
import dashboardService from "../../../services/dashboardService";
import reportsService from "../../../services/reportsService";
import settingsService from "../../../services/settingsService";
import userService from "../../../services/userService";
import petService from "../../../services/petService";
import shelterService from "../../../services/shelterService";
import adoptionService from "../../../services/adoptionService";
import medicalService from "../../../services/medicalService";
import financeService from "../../../services/financeService";
import auditService from "../../../services/auditService";
import {
  FaUserPlus,
  FaDatabase,
  FaShieldAlt,
  FaUsers,
  FaHome,
  FaHeart,
  FaPaw,
  FaStethoscope,
  FaCoins,
  FaClipboardList,
  FaFileDownload,
  FaBuilding,
  FaUserShield,
  FaSlidersH,
  FaAmbulance,
  FaBoxes,
  FaChartLine,
  FaCog,
  FaBell,
  FaExclamationTriangle,
} from "react-icons/fa";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "rescues" | "animals" | "finance" | "audit">("users");
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [usersData, setUsersData] = useState<any[]>([]);
  const [sheltersData, setSheltersData] = useState<any[]>([]);
  const [petsData, setPetsData] = useState<any[]>([]);
  const [adoptionsData, setAdoptionsData] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);



  const unwrapList = (res: PromiseSettledResult<any>) => {
    if (res.status !== "fulfilled") return [];
    const v = res.value;
    return Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
  };

  const loadDashboard = async (isManualRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, usersRes, petsRes, sheltersRes, adoptionsRes, medicalRes, financeRes, auditRes] =
        await Promise.allSettled([
          dashboardService.getSuperAdminDashboard(),
          userService.getUsers(),
          petService.getPets(),
          shelterService.getShelters(),
          adoptionService.getAdoptions(),
          medicalService.getMedicalRecords(),
          financeService.getFinanceRecords(),
          auditService.getAuditLogs(),
        ]);

      const usersList = unwrapList(usersRes);
      const petsList = unwrapList(petsRes);
      const sheltersList = unwrapList(sheltersRes);
      const adoptionsList = unwrapList(adoptionsRes);
      unwrapList(medicalRes);
      const financeList = unwrapList(financeRes);
      const auditList = unwrapList(auditRes);

      setUsersData(usersList);
      setSheltersData(sheltersList);
      setPetsData(petsList);
      setAdoptionsData(adoptionsList);
      setFinanceData(financeList);
      setAuditData([...getAuditStream(), ...auditList]);

      // Prefer the dedicated dashboard endpoint; otherwise compute live counts
      // from the operational lists we already fetched.
      const dashPayload =
        dashRes.status === "fulfilled" ? (dashRes.value?.data || dashRes.value) : null;

      setDashboardStats(dashPayload || {});
      if (isManualRefresh) {
        addToast("Dashboard summary metrics refreshed!", "success");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load summary metrics");
    } finally {
      setLoading(false);
    }
  };

  useDataSync(() => loadDashboard());

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getKpiCards = () => {
    if (!dashboardStats) return [];

    const formatVal = (v: any) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "number") return v.toLocaleString();
      return String(v);
    };

    const definitions = [
      {
        key: "total_users",
        title: "Total Platform Users",
        value: formatVal(dashboardStats.total_users ?? dashboardStats.users_count),
        trend: "All Roles",
        color: "#2563EB",
        icon: <FaUsers />,
      },
      {
        key: "total_dogs",
        title: "Rescued Dogs",
        value: formatVal(dashboardStats.total_dogs ?? dashboardStats.dogs_count),
        trend: "Total Intake",
        color: "#EF4444",
        icon: <FaPaw />,
      },
      {
        key: "adoptable_dogs",
        title: "Adoptable Dogs",
        value: formatVal(dashboardStats.adoptable_dogs),
        trend: "Ready for Adoption",
        color: "#10B981",
        icon: <FaHeart />,
      },
      {
        key: "pending_adoptions",
        title: "Pending Adoptions",
        value: formatVal(dashboardStats.pending_adoptions ?? dashboardStats.adoptions_count),
        trend: "Applications in Review",
        color: "#F59E0B",
        icon: <FaClipboardList />,
      },
      {
        key: "verified_users",
        title: "Verified Users",
        value: formatVal(dashboardStats.verified_users),
        trend: "Identity Verified",
        color: "#8B5CF6",
        icon: <FaUserShield />,
      },
      {
        key: "active_sessions",
        title: "Active Sessions",
        value: formatVal(dashboardStats.active_sessions),
        trend: "Current Logins",
        color: "#06B6D4",
        icon: <FaSlidersH />,
      },
      {
        key: "open_grievances",
        title: "Open Grievances",
        value: formatVal(dashboardStats.open_grievances),
        trend: "Requires Review",
        color: "#DC2626",
        icon: <FaExclamationTriangle />,
      },
      {
        key: "unread_notifications",
        title: "Unread Notifications",
        value: formatVal(dashboardStats.unread_notifications),
        trend: "System Alerts",
        color: "#6366F1",
        icon: <FaBell />,
      },
      {
        key: "active_foster_placements",
        title: "Active Foster Placements",
        value: formatVal(dashboardStats.active_foster_placements),
        trend: "Foster Care",
        color: "#EC4899",
        icon: <FaHome />,
      },
      {
        key: "shelter_capacity",
        title: "Shelter Capacity",
        value: formatVal(dashboardStats.shelter_occupancy?.capacity ?? dashboardStats.shelter_capacity),
        trend: "Total Cages Available",
        color: "#64748B",
        icon: <FaBuilding />,
      },
      {
        key: "shelter_occupied",
        title: "Shelter Occupied",
        value: formatVal(dashboardStats.shelter_occupancy?.occupied ?? dashboardStats.shelter_occupied),
        trend: "Current Occupants",
        color: "#3B82F6",
        icon: <FaBoxes />,
      },
      {
        key: "shelter_occupancy_pct",
        title: "Shelter Occupancy %",
        value:
          (dashboardStats.shelter_occupancy?.occupancy_pct ?? dashboardStats.shelter_occupancy_pct) !== undefined &&
          (dashboardStats.shelter_occupancy?.occupancy_pct ?? dashboardStats.shelter_occupancy_pct) !== null
            ? `${dashboardStats.shelter_occupancy?.occupancy_pct ?? dashboardStats.shelter_occupancy_pct}%`
            : null,
        trend: "Capacity Utilization",
        color: "#059669",
        icon: <FaChartLine />,
      },
    ];

    // Only include cards where backend returns valid data (omit placeholder zeroes or unprovided fields)
    return definitions.filter((item) => item.value !== null && item.value !== undefined);
  };

  const userColumns = [
    { key: "id", title: "User ID" },
    { key: "name", title: "Full Name" },
    { key: "email", title: "Email Address" },
    { key: "role", title: "Role" },
    { key: "status", title: "Status" },
  ];

  const userRows = usersData.map((u: any) => ({
    id: u.id ?? u.user_id ?? "N/A",
    name: u.full_name ?? (u.first_name || u.last_name ? [u.first_name, u.last_name].filter(Boolean).join(" ") : null) ?? u.name ?? "N/A",
    email: u.email ?? u.username ?? "N/A",
    role: u.role?.name ?? u.role_name ?? u.role ?? "N/A",
    status: u.status ?? (u.is_active !== undefined ? (u.is_active ? "Active" : "Inactive") : "N/A"),
    raw: u,
  }));

  const auditColumns = [
    { key: "id", title: "Log ID" },
    { key: "action", title: "Security Event" },
    { key: "user", title: "Operator" },
    { key: "ip", title: "IP Address" },
    { key: "status", title: "Status" },
    { key: "time", title: "Timestamp" },
  ];

  const auditRows = auditData.map((a: any) => ({
    id: a.audit_id ?? a.log_id ?? a.id ?? "N/A",
    action: a.action ?? a.event ?? a.description ?? "N/A",
    user: a.user ?? a.username ?? a.admin ?? a.email ?? "N/A",
    ip: a.ip_address ?? a.ip ?? "N/A",
    status: a.status ?? a.result ?? "N/A",
    time: a.timestamp ? new Date(a.timestamp).toLocaleString() : (a.created_at ? new Date(a.created_at).toLocaleString() : "N/A"),
    raw: a,
  }));

  const fmtAmount = (val: any) => {
    if (val === undefined || val === null || val === "") return "";
    const n = Number(val);
    if (isNaN(n)) return String(val);
    const sign = n < 0 ? "-$" : "$";
    return `${sign}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const handleBackup = async () => {
    try {
      addToast("Initiating database backup snapshot...", "info");
      await settingsService.triggerBackup();
      addToast("System backup snapshot created successfully!", "success");
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Backup failed.", "error");
    }
  };

  const handleExportMetrics = async () => {
    try {
      addToast("Generating system metrics report...", "info");
      await reportsService.exportExecutivePdf();
      addToast("System metrics report downloaded!", "success");
    } catch (err: any) {
      addToast(err?.message || "Report export failed.", "error");
    }
  };

  const handleExportCsvView = async () => {
    try {
      addToast("Exporting module view...", "info");
      await reportsService.exportCsvDump();
      addToast("CSV Data Dump downloaded!", "success");
    } catch (err: any) {
      addToast(err?.message || "Export failed.", "error");
    }
  };

  return (
    <div>
      {/* Banner */}
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Super Admin Executive Command</h1>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                color: "#34D399",
                border: "1px solid rgba(52, 211, 153, 0.4)",
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Master Access
            </span>
          </div>
          <p style={{ margin: 0, color: "#94A3B8", fontSize: "14px" }}>
            Global platform governance: manage users, rescue centres, roles, security audits, and financial ledgers.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => loadDashboard(true)}
            style={{
              background: "#334155",
              color: "#FFF",
              border: "none",
              padding: "9px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Refresh Summary
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "10px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Stats Summary Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {getKpiCards().map((item) => (
          <StatCard
            key={item.title}
            title={item.title}
            value={item.value}
            trend={item.trend}
            color={item.color}
            icon={item.icon}
            compact={true}
          />
        ))}
      </div>

      {/* Quick Navigation (Open Modules) */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
            Quick Navigation (Modules)
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
            Direct one-click access to core administrative modules
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <QuickActionCard icon={<FaUsers />} title="User Management" subtitle="Manage accounts & staff" color="#2563EB" onClick={() => navigate("/users")} />
          <QuickActionCard icon={<FaUserShield />} title="Roles & Permissions" subtitle="RBAC matrix & access" color="#8B5CF6" onClick={() => navigate("/roles-permissions")} />
          <QuickActionCard icon={<FaAmbulance />} title="Rescue Management" subtitle="Incidents & dispatch" color="#EF4444" onClick={() => navigate("/rescues")} />
          <QuickActionCard icon={<FaBuilding />} title="Shelter Management" subtitle="Facilities & capacity" color="#10B981" onClick={() => navigate("/shelters")} />
          <QuickActionCard icon={<FaStethoscope />} title="Medical Management" subtitle="Vet care & records" color="#EC4899" onClick={() => navigate("/medical-records")} />
          <QuickActionCard icon={<FaBoxes />} title="Inventory Management" subtitle="Supplies & stock items" color="#F59E0B" onClick={() => navigate("/inventory")} />
          <QuickActionCard icon={<FaCoins />} title="Finance Management" subtitle="Donations & ledger" color="#059669" onClick={() => navigate("/finance")} />
          <QuickActionCard icon={<FaChartLine />} title="Reports & Analytics" subtitle="Executive KPIs & exports" color="#3B82F6" onClick={() => navigate("/reports")} />
          <QuickActionCard icon={<FaCog />} title="System Settings" subtitle="Global config rules" color="#64748B" onClick={() => navigate("/settings")} />
          <QuickActionCard icon={<FaBell />} title="Notifications" subtitle="Alert preferences" color="#6366F1" onClick={() => navigate("/settings")} />
        </div>
      </div>

      {/* Quick Actions (Perform Operations) */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
            Quick Actions (Perform Operations)
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
            Execute administrative operations and platform actions
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <QuickActionCard icon={<FaUserPlus />} title="Add User" subtitle="Provision new account" color="#2563EB" onClick={() => navigate("/users")} />
          <QuickActionCard icon={<FaBuilding />} title="Add Rescue Centre" subtitle="Onboard new facility" color="#10B981" onClick={() => navigate("/shelters")} />
          <QuickActionCard icon={<FaUserShield />} title="Create Role" subtitle="Define RBAC policy" color="#6366F1" onClick={() => navigate("/roles-permissions")} />
          <QuickActionCard icon={<FaSlidersH />} title="Assign Permission" subtitle="Update access matrix" color="#8B5CF6" onClick={() => navigate("/roles-permissions")} />
          <QuickActionCard icon={<FaPaw />} title="Register Animal" subtitle="Log rescue intake" color="#EF4444" onClick={() => navigate("/pets")} />
          <QuickActionCard icon={<FaClipboardList />} title="Generate Report" subtitle="Export system metrics" color="#F59E0B" onClick={handleExportMetrics} />
          <QuickActionCard icon={<FaDatabase />} title="Backup System" subtitle="Trigger DB snapshot" color="#14B8A6" onClick={handleBackup} />
          <QuickActionCard icon={<FaShieldAlt />} title="View Audit Logs" subtitle="Inspect security stream" color="#EC4899" onClick={() => navigate("/audit-logs")} />
        </div>
      </div>

      {/* Analytics Chart */}
      <div style={{ marginBottom: "20px" }}>
        <AdoptionChart data={buildMonthlyAdoptionHistory(adoptionsData)} />
      </div>

      {/* Interactive Module Management Panel */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: "12px", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "users", label: "User & Role Management", icon: <FaUsers /> },
              { id: "rescues", label: "Rescue Centres & Shelters", icon: <FaBuilding /> },
              { id: "animals", label: "Animals & Medical Records", icon: <FaPaw /> },
              { id: "finance", label: "Finance & Inventory", icon: <FaCoins /> },
              { id: "audit", label: "Security & Audit Logs", icon: <FaShieldAlt /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: activeTab === tab.id ? "#2563EB" : "#E2E8F0",
                  background: activeTab === tab.id ? "#EFF6FF" : "#FFFFFF",
                  color: activeTab === tab.id ? "#2563EB" : "#64748B",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsvView}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#F8FAFC",
              border: "1px solid #CBD5E1",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#0F172A",
              cursor: "pointer",
            }}
          >
            <FaFileDownload /> Export View (CSV/PDF)
          </button>
        </div>

        {/* Tab Content Panels */}
        {activeTab === "users" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Registered Platform Accounts & Role Governance
            </h4>
            <DataTable
              columns={userColumns}
              data={userRows}
              loading={loading}
              emptyMessage="No user accounts found."
              onEdit={() => navigate("/users")}
              onDelete={() => navigate("/users")}
            />
          </div>
        )}

        {activeTab === "rescues" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Active Rescue Centres & Shelter Capacity Overview
            </h4>
            <DataTable
              columns={[
                { key: "facility_id", title: "Facility ID" },
                { key: "name", title: "Centre Name" },
                { key: "location", title: "Location" },
                { key: "capacity", title: "Capacity" },
                { key: "occupancy", title: "Occupancy" },
                { key: "status", title: "Status" },
              ]}
              data={sheltersData.map((f: any) => ({
                facility_id: f.facility_id ?? f.code ?? f.id ?? "N/A",
                name: f.name ?? f.facility_name ?? "N/A",
                location: f.location ?? f.address ?? "N/A",
                capacity: f.capacity !== undefined && f.capacity !== null ? String(f.capacity) : "N/A",
                occupancy: f.occupancy !== undefined && f.occupancy !== null ? String(f.occupancy) : (f.current_occupancy !== undefined && f.current_occupancy !== null ? String(f.current_occupancy) : "N/A"),
                status: f.status ?? (f.is_active !== undefined ? (f.is_active ? "Active" : "Inactive") : "N/A"),
              }))}
              loading={loading}
              emptyMessage="No rescue centres found."
              onEdit={() => navigate("/shelters")}
            />
          </div>
        )}

        {activeTab === "animals" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Master Animal & Clinical Medical Directory
            </h4>
            <DataTable
              columns={[
                { key: "dog_id", title: "Registration ID" },
                { key: "name", title: "Pet Name" },
                { key: "breed", title: "Breed" },
                { key: "gender", title: "Gender" },
                { key: "status", title: "Health Status" },
              ]}
              data={petsData.map((p: any) => ({
                dog_id: p.registration_number ?? p.dog_id ?? p.id ?? "N/A",
                name: p.name ?? p.pet_name ?? "N/A",
                breed: p.breed ?? "N/A",
                gender: p.gender ?? "N/A",
                status: p.health_status ?? p.status ?? p.medical_condition ?? "N/A",
              }))}
              loading={loading}
              emptyMessage="No rescued animals found."
              onEdit={() => navigate("/pets")}
            />
          </div>
        )}

        {activeTab === "finance" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Global Financial Ledgers & Supply Inventory Overview
            </h4>
            <DataTable
              columns={[
                { key: "transaction_id", title: "Transaction ID" },
                { key: "entity", title: "Donor / Vendor" },
                { key: "type", title: "Category" },
                { key: "amount", title: "Amount ($)" },
                { key: "status", title: "Status" },
              ]}
              data={financeData.map((t: any) => ({
                transaction_id: t.transaction_id ?? t.tx_id ?? t.id ?? "N/A",
                entity: t.entity ?? t.donor ?? t.vendor ?? t.payer_name ?? "N/A",
                type: t.transaction_type ?? t.type ?? t.category ?? "N/A",
                amount: t.amount !== undefined && t.amount !== null && t.amount !== "" ? fmtAmount(t.amount) : "N/A",
                status: t.status ?? "N/A",
              }))}
              loading={loading}
              emptyMessage="No financial transactions found."
            />
          </div>
        )}

        {activeTab === "audit" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Real-Time Platform Security & Audit Trail Stream
            </h4>
            <DataTable
              columns={auditColumns}
              data={auditRows}
              loading={loading}
              emptyMessage="No audit events found."
            />
          </div>
        )}
      </div>

      <RecentActivities />
    </div>
  );
};

export default SuperAdminDashboard;
