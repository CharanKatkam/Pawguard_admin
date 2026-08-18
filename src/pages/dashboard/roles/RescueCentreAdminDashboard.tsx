import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import {
  FaAmbulance,
  FaPaw,
  FaStethoscope,
  FaHome,
  FaBoxes,
  FaHeart,
  FaChartBar,
  FaCog,
  FaUsers,
  FaSync,
  FaEye,
} from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import rescueService from "../../../services/rescueService";
import dogService from "../../../services/dogService";
import shelterService from "../../../services/shelterService";
import adoptionService from "../../../services/adoptionService";
import fosterService from "../../../services/fosterService";
import inventoryService from "../../../services/inventoryService";
import userService from "../../../services/userService";
import vehicleService from "../../../services/vehicleService";
import { rescueStatusBadge, dispatchStage, dispatchAgentNames } from "../../../utils/rescueStatus";
import { useDataSync } from "../../../utils/dataSync";
import { normalizeRole } from "../../../utils/roleUtils";
import { formatDateTime } from "../../../utils/dateUtils";

interface RescueCallRow {
  id: string;
  ticket: string;
  reporter: string;
  animal_count: number;
  status: string;
  dispatch_status: string;
  agent: string;
  created_at: string;
  rawItem: Record<string, unknown>;
}

interface DogIntakeRow {
  id: string;
  name: string;
  registration_number: string;
  shelter_name: string;
  medical_status: string;
  is_adoptable: boolean;
  rawItem: Record<string, unknown>;
}

interface ApplicationPipelineRow {
  id: string;
  applicant_name: string;
  dog_name: string;
  type: string;
  status: string;
  created_at: string;
  rawItem: Record<string, unknown>;
}

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  display: "inline-block",
  textTransform: "uppercase",
});

const unwrapList = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  return [];
};

const RescueCentreAdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rescues" | "intake" | "pipeline" | "resources">("rescues");

  // Lifecycle Data States
  const [rescueCalls, setRescueCalls] = useState<RescueCallRow[]>([]);
  const [dogIntakes, setDogIntakes] = useState<DogIntakeRow[]>([]);
  const [applications, setApplications] = useState<ApplicationPipelineRow[]>([]);
  const [rescueAgents, setRescueAgents] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);

  // Metric Totals
  const [statsData, setStatsData] = useState({
    totalCalls: 0,
    pendingCalls: 0,
    activeDispatches: 0,
    shelterDogsCount: 0,
    medicallyClearedCount: 0,
    activeAdoptionsCount: 0,
    lowStockAlertsCount: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        dashRes,
        casesRes,
        dogsRes,
        _sheltersRes,
        adoptionsRes,
        fostersRes,
        inventoryRes,
        usersRes,
        vehiclesRes,
      ] = await Promise.allSettled([
        dashboardService.getRescueCentreDashboard(),
        rescueService.getRescueCases({ page: 1, page_size: 20 }),
        dogService.getAllDogs(),
        shelterService.getShelters(),
        adoptionService.getApplications(),
        fosterService.getFosterProfiles(),
        inventoryService.getItems(),
        userService.getUsers(),
        vehicleService.getVehicles(),
      ]);

      const dashData = dashRes.status === "fulfilled" ? dashRes.value?.data || dashRes.value || {} : {};
      const casesList = casesRes.status === "fulfilled" ? unwrapList(casesRes.value) : [];
      const dogsList = dogsRes.status === "fulfilled" ? unwrapList(dogsRes.value) : [];
      const adoptionsList = adoptionsRes.status === "fulfilled" ? unwrapList(adoptionsRes.value) : [];
      const fostersList = fostersRes.status === "fulfilled" ? unwrapList(fostersRes.value) : [];
      const inventoryList = inventoryRes.status === "fulfilled" ? unwrapList(inventoryRes.value) : [];
      const usersList = usersRes.status === "fulfilled" ? unwrapList(usersRes.value) : [];
      const vehiclesList = vehiclesRes.status === "fulfilled" ? unwrapList(vehiclesRes.value) : [];

      // Process Resource Availability
      const agents = usersList.filter((u: any) => {
        const r = normalizeRole(u);
        return r === "rescue_agent" || r === "rescue_coordinator" || String(u.role || "").toLowerCase().includes("agent");
      });
      setRescueAgents(agents);
      setFleetVehicles(vehiclesList);

      // 1. Process Recent Rescue Calls & Dispatches
      const recentCalls: RescueCallRow[] = casesList.map((item: any) => {
        const stage = dispatchStage({ status: item.status, dispatch: item.dispatch });
        const agents = dispatchAgentNames(item.dispatch);
        return {
          id: item.id || "",
          ticket: item.ticket_number || item.id || "-",
          reporter: item.reporter_name || "-",
          animal_count: item.animal_count ?? 1,
          status: String(item.status || "").toLowerCase(),
          dispatch_status: stage.label,
          agent: agents.agents.length > 0 ? agents.agents.join(", ") : "-",
          created_at: item.created_at || "",
          rawItem: item,
        };
      });

      // 2. Process Shelter Dog Master Intakes
      const intakes: DogIntakeRow[] = dogsList.map((d: any) => ({
        id: String(d.id || d.dog_id || "-"),
        name: String(d.name || "Unnamed Dog"),
        registration_number: String(d.registration_number || "-"),
        shelter_name: String(d.shelter_name || d.shelter_id || "Central Shelter"),
        medical_status: String(d.medical_status || "Pending Check"),
        is_adoptable: Boolean(d.is_fit_for_adoption || d.is_adoptable || String(d.medical_status).toLowerCase().includes("clear")),
        rawItem: d,
      }));

      // 3. Process Adoption & Foster Pipeline
      const pipeline: ApplicationPipelineRow[] = [
        ...adoptionsList.map((a: any) => ({
          id: String(a.id || a.application_id || "-"),
          applicant_name: String(a.applicant_name || a.adopter_name || a.user_name || "Applicant"),
          dog_name: String(a.dog_name || a.dog?.name || "Dog"),
          type: "Adoption",
          status: String(a.status || "Submitted"),
          created_at: String(a.created_at || a.applied_at || ""),
          rawItem: a,
        })),
        ...fostersList.map((f: any) => ({
          id: String(f.id || f.placement_id || "-"),
          applicant_name: String(f.foster_family || f.user?.full_name || f.user?.email || "Foster Host"),
          dog_name: String(f.dog_name || "Dog"),
          type: "Foster Placement",
          status: String(f.status || "Active"),
          created_at: String(f.created_at || f.started_at || ""),
          rawItem: f,
        })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at));

      // 4. Calculate Aggregate Metrics
      const pendingCases = casesList.filter((c: any) => {
        const s = String(c.status || "").toLowerCase();
        return s === "pending" || s === "reported" || s === "requested";
      }).length;

      const dispatchedCases = casesList.filter((c: any) => {
        const s = String(c.status || "").toLowerCase();
        return s === "dispatched" || s === "en_route" || s === "on_site";
      }).length;

      const clearedDogs = dogsList.filter((d: any) => {
        const ms = String(d.medical_status || "").toLowerCase();
        return ms.includes("clear") || ms.includes("fit") || Boolean(d.is_fit_for_adoption || d.is_adoptable);
      }).length;

      const lowStockItems = inventoryList.filter((inv: any) => {
        const qty = Number(inv.quantity ?? inv.current_stock ?? 0);
        const minQty = Number(inv.min_quantity ?? inv.reorder_level ?? 10);
        return qty <= minQty;
      }).length;

      setRescueCalls(recentCalls);
      setDogIntakes(intakes);
      setApplications(pipeline);

      setStatsData({
        totalCalls: dashData.total_calls ?? dashData.totalCalls ?? casesList.length,
        pendingCalls: dashData.pending ?? dashData.pendingCases ?? pendingCases,
        activeDispatches: dashData.dispatched ?? dashData.dispatchedCases ?? dispatchedCases,
        shelterDogsCount: dogsList.length,
        medicallyClearedCount: clearedDogs,
        activeAdoptionsCount: adoptionsList.length + fostersList.length,
        lowStockAlertsCount: lowStockItems,
      });
    } catch (err: any) {
      console.error("Rescue Centre Admin Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load rescue centre metrics. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useDataSync(fetchDashboardData);

  const stats = [
    {
      title: "Total Rescue Requests",
      value: loading ? "..." : String(statsData.totalCalls),
      trend: `${statsData.pendingCalls} Pending Triage`,
      color: "#2563EB",
      icon: <FaAmbulance />,
      onClick: () => navigate("/rescue-requests"),
    },
    {
      title: "Active Dispatches",
      value: loading ? "..." : String(statsData.activeDispatches),
      trend: "Units En-Route / On-Site",
      color: "#10B981",
      icon: <FaUsers />,
      onClick: () => navigate("/rescue-dispatch"),
    },
    {
      title: "Shelter Intakes",
      value: loading ? "..." : String(statsData.shelterDogsCount),
      trend: `${statsData.medicallyClearedCount} Medically Cleared`,
      color: "#6366F1",
      icon: <FaPaw />,
      onClick: () => navigate("/shelter-dogs"),
    },
    {
      title: "Adoptions & Fosters",
      value: loading ? "..." : String(statsData.activeAdoptionsCount),
      trend: "Active Placement Pipeline",
      color: "#EC4899",
      icon: <FaHeart />,
      onClick: () => navigate("/adoptions"),
    },
  ];

  const rescueColumns = [
    { key: "ticket", header: "Ticket Number" },
    { key: "reporter", header: "Reporter" },
    { key: "animal_count", header: "Dogs" },
    {
      key: "status",
      header: "Rescue Status",
      render: rescueStatusBadge,
    },
    {
      key: "dispatch_status",
      header: "Dispatch Stage",
      render: (_val: string, row: any) => {
        const stage = dispatchStage({ status: row.status });
        return (
          <span style={{ padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, background: stage.bg, color: stage.color }}>
            {stage.label}
          </span>
        );
      },
    },
    { key: "agent", header: "Assigned Agent" },
    {
      key: "created_at",
      header: "Reported At",
      render: (v: string) => (v ? formatDateTime(v) : "-"),
    },
  ];

  const intakeColumns = [
    { key: "name", header: "Dog Name" },
    {
      key: "id",
      header: "Master ID / Reg #",
      render: (_: unknown, r: DogIntakeRow) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{r.name}</div>
          <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>Reg: {r.registration_number}</div>
        </div>
      ),
    },
    { key: "shelter_name", header: "Shelter Facility" },
    {
      key: "medical_status",
      header: "Medical Status",
      render: (v: string) => {
        const isCleared = v.toLowerCase().includes("clear");
        return (
          <span style={badgeStyle(isCleared ? "#ECFDF5" : "#EFF6FF", isCleared ? "#047857" : "#1D4ED8")}>
            {v.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: "is_adoptable",
      header: "Adoption Fitness",
      render: (isAdoptable: boolean) => (
        <span style={badgeStyle(isAdoptable ? "#ECFDF5" : "#FFFBEB", isAdoptable ? "#047857" : "#B45309")}>
          {isAdoptable ? "READY FOR ADOPTION" : "PENDING CLEARANCE"}
        </span>
      ),
    },
  ];

  const pipelineColumns = [
    { key: "id", header: "Application ID" },
    { key: "applicant_name", header: "Applicant / Host" },
    { key: "dog_name", header: "Dog Target" },
    {
      key: "type",
      header: "Pipeline Category",
      render: (v: string) => (
        <span style={badgeStyle(v === "Adoption" ? "#FCE7F3" : "#E0E7FF", v === "Adoption" ? "#BE185D" : "#4338CA")}>
          {v}
        </span>
      ),
    },
    {
      key: "status",
      header: "Stage Status",
      render: (v: string) => (
        <span style={badgeStyle("#F1F5F9", "#334155")}>
          {v.toUpperCase()}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Date Logged",
      render: (v: string) => (v ? formatDateTime(v) : "-"),
    },
  ];

  return (
    <div>
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
              Rescue Centre Operations & Lifecycle Management Portal
            </h1>
            <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "13px" }}>
              Complete operational monitoring: rescue cases, agent dispatch, medical intake, shelter capacity, adoption/foster workflow & inventory alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
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
            <FaSync /> Sync Metrics
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "20px", padding: "14px 18px", borderRadius: "10px", backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: "14px", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Quick Action Navigation Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaAmbulance />} title="Rescue Requests" subtitle="Incidents & Triage" color="#2563EB" onClick={() => navigate("/rescue-requests")} />
        <QuickActionCard icon={<FaUsers />} title="Dispatch Unit" subtitle="Agent Fleet" color="#10B981" onClick={() => navigate("/rescue-dispatch")} />
        <QuickActionCard icon={<FaPaw />} title="Dog Management" subtitle="Dog Master Profiles" color="#6366F1" onClick={() => navigate("/pets")} />
        <QuickActionCard icon={<FaHome />} title="Shelter Facilities" subtitle="Kennel Capacity" color="#8B5CF6" onClick={() => navigate("/shelters")} />
        <QuickActionCard icon={<FaPaw />} title="Shelter Dogs" subtitle="Post-Rescue Handover" color="#059669" onClick={() => navigate("/shelter-dogs")} />
        <QuickActionCard icon={<FaUsers />} title="Staff & Users" subtitle="User Directory" color="#D97706" onClick={() => navigate("/users")} />
        <QuickActionCard icon={<FaStethoscope />} title="Medical Suite" subtitle="Medical Records" color="#EC4899" onClick={() => navigate("/medical-records")} />
        <QuickActionCard icon={<FaChartBar />} title="Reports & Analytics" subtitle="Operational Insights" color="#3B82F6" onClick={() => navigate("/reports")} />
      </div>

      {/* Operational Headline Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      {/* MULTI-TAB LIFECYCLE MONITORING QUEUE */}
      <div className="soft-card" style={{ padding: "20px", marginBottom: "24px" }}>
        {/* Source Navigation Tabs */}
        <div style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveTab("rescues")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "rescues" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "rescues" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "rescues" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaAmbulance /> 🚑 Rescue Requests & Dispatch Stage ({rescueCalls.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("intake")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "intake" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "intake" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "intake" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaPaw /> 🐶 Shelter Dog Master Intakes ({dogIntakes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pipeline")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "pipeline" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "pipeline" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "pipeline" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaHeart /> 📋 Adoption & Foster Pipeline ({applications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("resources")}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                border: activeTab === "resources" ? "2px solid #2563EB" : "1px solid #CBD5E1",
                background: activeTab === "resources" ? "#EFF6FF" : "#FFFFFF",
                color: activeTab === "resources" ? "#1D4ED8" : "#475569",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaUsers /> 👥 Resource Availability ({rescueAgents.length} Agents, {fleetVehicles.length} Vehicles)
            </button>
          </div>
        </div>

        {/* TAB 1: RESCUE REQUESTS & DISPATCH */}
        {activeTab === "rescues" && (
          <DataTable
            columns={rescueColumns}
            data={rescueCalls}
            loading={loading}
            emptyMessage="No recent rescue requests logged."
            renderRowActions={(_row: RescueCallRow) => (
              <button
                type="button"
                onClick={() => navigate(`/rescue-requests`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #2563EB",
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FaEye /> Case Details
              </button>
            )}
          />
        )}

        {/* TAB 2: SHELTER DOG MASTER INTAKES */}
        {activeTab === "intake" && (
          <DataTable
            columns={intakeColumns}
            data={dogIntakes}
            loading={loading}
            emptyMessage="No shelter dog master records found."
            renderRowActions={(_row: DogIntakeRow) => (
              <button
                type="button"
                onClick={() => navigate(`/pets`)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #10B981",
                  background: "#ECFDF5",
                  color: "#047857",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FaEye /> Master Profile
              </button>
            )}
          />
        )}

        {/* TAB 3: ADOPTION & FOSTER PIPELINE */}
        {activeTab === "pipeline" && (
          <DataTable
            columns={pipelineColumns}
            data={applications}
            loading={loading}
            emptyMessage="No active adoption or foster applications."
            renderRowActions={(row: ApplicationPipelineRow) => (
              <button
                type="button"
                onClick={() => navigate(row.type === "Adoption" ? "/adoptions" : "/fosters")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #6366F1",
                  background: "#EEF2FF",
                  color: "#4338CA",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FaEye /> View Pipeline
              </button>
            )}
          />
        )}

        {/* TAB 4: RESOURCE AVAILABILITY MONITORING */}
        {activeTab === "resources" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                🚒 Rescue Agents ({rescueAgents.length})
              </h4>
              <DataTable
                columns={[
                  { key: "full_name", header: "Agent Name", render: (v: string, r: any) => v || r.email || r.id },
                  { key: "id", header: "User ID", render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{v}</span> },
                  {
                    key: "is_active",
                    header: "Status",
                    render: (val: boolean) => (
                      <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: val !== false ? "#ECFDF5" : "#FEF2F2", color: val !== false ? "#047857" : "#DC2626" }}>
                        {val !== false ? "ACTIVE AGENT" : "INACTIVE"}
                      </span>
                    ),
                  },
                ]}
                data={rescueAgents}
                loading={loading}
                emptyMessage="No registered rescue agents found."
              />
            </div>

            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "15px", fontWeight: 800, color: "#0F172A" }}>
                🚑 Rescue Vehicles & Fleet ({fleetVehicles.length})
              </h4>
              <DataTable
                columns={[
                  { key: "vehicle_number", header: "Plate / Number", render: (v: string, r: any) => v || r.plate || r.id },
                  { key: "model", header: "Model / Class", render: (v: string, r: any) => v || r.type || "Ambulance" },
                  {
                    key: "status",
                    header: "Operational Status",
                    render: (val: string) => {
                      const lower = String(val || "").toLowerCase();
                      const isReady = lower.includes("ready") || lower === "available";
                      return (
                        <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: isReady ? "#ECFDF5" : lower.includes("dispatch") ? "#EFF6FF" : "#FEF2F2", color: isReady ? "#047857" : lower.includes("dispatch") ? "#1D4ED8" : "#DC2626" }}>
                          {val || "Available"}
                        </span>
                      );
                    },
                  },
                ]}
                data={fleetVehicles}
                loading={loading}
                emptyMessage="No vehicles registered in fleet."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RescueCentreAdminDashboard;
