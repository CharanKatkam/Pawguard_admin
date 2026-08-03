import { useEffect, useState } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import AdoptionChart from "../../../components/dashboard/AdoptionChart";
import RecentActivities from "../../../components/dashboard/RecentActivities";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import dashboardService from "../../../services/dashboardService";
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
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileDownload,
  FaBuilding,
  FaUserShield,
  FaSlidersH,
} from "react-icons/fa";

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<"users" | "rescues" | "animals" | "finance" | "audit">("users");
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getDashboardStats("super_admin");
      console.log("Dashboard Summary API Response:", response);
      const data = response?.data || response || {};
      setDashboardStats(data);
    } catch (err: any) {
      console.error("Dashboard Summary API Error:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load summary metrics");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format numbers or currency values cleanly
  const formatStatValue = (val: any, fallback: string, isCurrency = false) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === "number") {
      return isCurrency ? `$${val.toLocaleString()}` : val.toLocaleString();
    }
    return String(val);
  };

  // 8 Master Stat Cards dynamically populated from backend summary API response
  const stats = [
    {
      title: "Total Users",
      value: loading ? "..." : formatStatValue(dashboardStats?.totalUsers ?? dashboardStats?.total_users, "1,248"),
      trend: "+12% this mo",
      color: "#2563EB",
      icon: <FaUsers />,
      description: "15 Active System Roles",
    },
    {
      title: "Total Animals",
      value: loading ? "..." : formatStatValue(dashboardStats?.totalAnimals ?? dashboardStats?.totalPets ?? dashboardStats?.total_pets ?? dashboardStats?.total_animals, "342"),
      trend: "+24 cases",
      color: "#EF4444",
      icon: <FaPaw />,
      description: "Registered in system",
    },
    {
      title: "Active Rescue Centres",
      value: loading ? "..." : formatStatValue(dashboardStats?.activeRescues ?? dashboardStats?.active_rescues ?? dashboardStats?.activeRescueCentres, "24"),
      trend: "Full Coverage",
      color: "#10B981",
      icon: <FaBuilding />,
      description: "Regional operational hubs",
    },
    {
      title: "Active Shelters",
      value: loading ? "..." : formatStatValue(dashboardStats?.activeShelters ?? dashboardStats?.active_shelters, "18"),
      trend: dashboardStats?.shelterOccupancy ? `${dashboardStats.shelterOccupancy} Occupancy` : "78% Occupancy",
      color: "#6366F1",
      icon: <FaHome />,
      description: "Facility sanctuaries",
    },
    {
      title: "Total Volunteers",
      value: loading ? "..." : formatStatValue(dashboardStats?.totalVolunteers ?? dashboardStats?.total_volunteers, "850"),
      trend: "+28 new",
      color: "#F59E0B",
      icon: <FaUserPlus />,
      description: "Registered & verified",
    },
    {
      title: "Pending Adoptions",
      value: loading ? "..." : formatStatValue(dashboardStats?.pendingAdoptions ?? dashboardStats?.pending_adoptions, "32"),
      trend: "5 Priority",
      color: "#EC4899",
      icon: <FaHeart />,
      description: "Awaiting approval",
    },
    {
      title: "Medical Cases",
      value: loading ? "..." : formatStatValue(dashboardStats?.medicalCases ?? dashboardStats?.medical_cases, "48"),
      trend: "18 Surgeries",
      color: "#8B5CF6",
      icon: <FaStethoscope />,
      description: "Clinical active watch",
    },
    {
      title: "Total Donations",
      value: loading ? "..." : formatStatValue(dashboardStats?.totalDonations ?? dashboardStats?.total_donations, "$124,500", true),
      trend: "+18.4% YoY",
      color: "#14B8A6",
      icon: <FaCoins />,
      description: "Verified ledger",
    },
  ];

  // User Management Table Data
  const userColumns = [
    { key: "id", title: "User ID" },
    { key: "name", title: "User Name" },
    { key: "email", title: "Email Address" },
    { key: "role", title: "Assigned Role" },
    { key: "status", title: "Account Status" },
  ];

  const userData = [
    { id: "USR-001", name: "Dr. John Smith", email: "vet@pawguard.com", role: "Veterinarian", status: "Active" },
    { id: "USR-002", name: "Rahul Sharma", email: "shelter.manager@pawguard.com", role: "Shelter Manager", status: "Active" },
    { id: "USR-003", name: "Sarah Jenkins", email: "rescue.coordinator@pawguard.com", role: "Rescue Coordinator", status: "Active" },
    { id: "USR-004", name: "Alex Rivera", email: "rescue.agent@pawguard.com", role: "Rescue Agent", status: "Active" },
    { id: "USR-005", name: "Priya Nair", email: "finance.user@pawguard.com", role: "Finance User", status: "Active" },
  ];

  // Audit Logs Data
  const auditColumns = [
    { key: "timestamp", title: "Timestamp" },
    { key: "user", title: "User / Admin" },
    { key: "module", title: "Module" },
    { key: "action", title: "System Action" },
    { key: "ip", title: "IP Address" },
    { key: "status", title: "Status" },
  ];

  const auditData = [
    { timestamp: "2026-07-30 17:40", user: "super.admin@pawguard.com", module: "RBAC", action: "Updated Role Permissions Matrix", ip: "192.168.1.45", status: "Success" },
    { timestamp: "2026-07-30 16:15", user: "system_cron", module: "Database", action: "Automated Database Backup Run", ip: "127.0.0.1", status: "Success" },
    { timestamp: "2026-07-30 14:02", user: "vet@pawguard.com", module: "Medical", action: "Exported Clinical Medical Logs", ip: "192.168.1.88", status: "Success" },
    { timestamp: "2026-07-30 11:30", user: "rescue.admin@pawguard.com", module: "Shelter", action: "Onboarded Rescue Facility #12", ip: "10.0.4.12", status: "Success" },
  ];

  return (
    <div>
      {/* Error Banner if Summary API sync fails */}
      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "10px",
            color: "#991B1B",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <span>
            <strong>Summary API Sync Warning:</strong> {error}
          </span>
          <button
            onClick={loadDashboard}
            style={{
              background: "#EF4444",
              color: "#FFFFFF",
              border: "none",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            Retry Sync
          </button>
        </div>
      )}
      {/* Comprehensive Hero Section */}
      <div
        style={{
          marginBottom: "20px",
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          padding: "22px 26px",
          borderRadius: "16px",
          color: "#FFFFFF",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>
                Super Administrator Master Platform
              </h1>
              <span
                style={{
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Full System Control (CRUD)
              </span>
            </div>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: "13px", lineHeight: 1.5 }}>
              Centralized platform governance: user management, global RBAC permissions, multi-branch rescue operations, finance ledgers, and system configuration.
            </p>
          </div>

          {/* Infrastructure Health Status */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 600 }}>
                System Health
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#10B981", display: "flex", alignItems: "center", gap: "6px" }}>
                <FaCheckCircle size={12} /> 99.99% Operational
              </div>
            </div>
            <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.15)" }} />
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 600 }}>
                Last Backup
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF" }}>
                Today at 04:00 AM
              </div>
            </div>
            <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.15)" }} />
            <div>
              <div style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 600 }}>
                Pending Alerts
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#F59E0B", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaExclamationTriangle size={12} /> 0 Critical | 2 Warnings
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8 Master Statistics Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* Master Quick Actions */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
          Super Administrator Master Actions
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <QuickActionCard icon={<FaUserPlus />} title="Add User" subtitle="Provision new account" color="#2563EB" onClick={() => alert("Add User modal opened")} />
          <QuickActionCard icon={<FaBuilding />} title="Add Rescue Centre" subtitle="Onboard new facility" color="#10B981" onClick={() => alert("Add Rescue Centre modal")} />
          <QuickActionCard icon={<FaUserShield />} title="Create Role" subtitle="Define RBAC policy" color="#6366F1" onClick={() => alert("Create Role modal")} />
          <QuickActionCard icon={<FaSlidersH />} title="Assign Permission" subtitle="Update access matrix" color="#8B5CF6" onClick={() => alert("Assign Permission modal")} />
          <QuickActionCard icon={<FaPaw />} title="Register Animal" subtitle="Log rescue intake" color="#EF4444" onClick={() => alert("Register Animal modal")} />
          <QuickActionCard icon={<FaClipboardList />} title="Generate Report" subtitle="Export system metrics" color="#F59E0B" onClick={() => alert("Generate Report modal")} />
          <QuickActionCard icon={<FaDatabase />} title="Backup System" subtitle="Trigger DB snapshot" color="#14B8A6" onClick={() => alert("System backup started")} />
          <QuickActionCard icon={<FaShieldAlt />} title="View Audit Logs" subtitle="Inspect security stream" color="#EC4899" onClick={() => setActiveTab("audit")} />
        </div>
      </div>

      {/* Analytics Chart & Activity Stream */}
      <div style={{ marginBottom: "20px" }}>
        <AdoptionChart />
      </div>

      {/* Interactive Module Management Panel */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "20px" }}>
        {/* Navigation Tab Bar */}
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
                  transition: "all 0.15s ease",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert("Exporting current module view to CSV/Excel...")}
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
              data={userData}
              onView={(r) => alert(`View User: ${r.name}`)}
              onEdit={(r) => alert(`Edit User: ${r.name}`)}
              onDelete={(r) => alert(`Delete User: ${r.name}`)}
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
                { key: "code", title: "Facility ID" },
                { key: "name", title: "Centre Name" },
                { key: "manager", title: "Assigned Manager" },
                { key: "cages", title: "Capacity" },
                { key: "status", title: "Status" },
              ]}
              data={[
                { code: "HUB-01", name: "Central Rescue Hub", manager: "Sarah Jenkins", cages: "85 / 100", status: "Active" },
                { code: "HUB-02", name: "North Haven Sanctuary", manager: "Rahul Sharma", cages: "38 / 50", status: "Active" },
              ]}
              onView={(r) => alert(`Facility: ${r.name}`)}
              onEdit={(r) => alert(`Edit Facility: ${r.name}`)}
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
                { key: "petId", title: "Pet ID" },
                { key: "name", title: "Pet Name" },
                { key: "vet", title: "Attending Vet" },
                { key: "condition", title: "Primary Diagnosis" },
                { key: "status", title: "Health Status" },
              ]}
              data={[
                { petId: "DOG-402", name: "Max", vet: "Dr. John Smith", condition: "Fractured Right Hind Leg", status: "Post-Op Recovery" },
                { petId: "DOG-415", name: "Bella", vet: "Dr. Sarah Connor", condition: "Severe Malnutrition & Mange", status: "In Treatment" },
              ]}
              onView={(r) => alert(`Pet: ${r.name}`)}
              onEdit={(r) => alert(`Edit Pet: ${r.name}`)}
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
                { key: "txId", title: "Transaction ID" },
                { key: "entity", title: "Donor / Vendor" },
                { key: "type", title: "Category" },
                { key: "amount", title: "Amount ($)" },
                { key: "status", title: "Status" },
              ]}
              data={[
                { txId: "TXN-8801", entity: "Global Animal Foundation", type: "Grant Donation", amount: "$15,000.00", status: "Completed" },
                { txId: "TXN-8802", entity: "VetCare Supplies Ltd", type: "Medical Expense", amount: "-$3,420.00", status: "Completed" },
              ]}
              onView={(r) => alert(`TX: ${r.txId}`)}
            />
          </div>
        )}

        {activeTab === "audit" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
              Real-Time Platform Security & Audit Trail Stream
            </h4>
            <DataTable columns={auditColumns} data={auditData} onView={(r) => alert(`Audit Detail: ${r.action}`)} />
          </div>
        )}
      </div>

      {/* System Activity Side Panel */}
      <RecentActivities />
    </div>
  );
};

export default SuperAdminDashboard;
