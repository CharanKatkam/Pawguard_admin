import { useState, useEffect, useCallback } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaTerminal,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserLock,
  FaEye,
  FaFileDownload,
  FaFilter,
  FaSync,
  FaSearch,
  FaInfoCircle,
} from "react-icons/fa";
import auditService from "../../services/auditService";
import { formatDateTime } from "../../utils/dateUtils";

export interface FormattedAuditLog {
  id: string;
  rawTimestamp: string;
  timestamp: string;
  user: string;
  userId: string;
  role: string;
  action: string;
  eventType: string;
  entityType: string;
  entityId: string;
  ip: string;
  status: string;
  previousState: any;
  newState: any;
  rawItem: any;
  [key: string]: unknown;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<FormattedAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedLog, setSelectedLog] = useState<FormattedAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { addToast } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, unknown> = {};
      if (eventTypeFilter) params.event_type = eventTypeFilter;

      const response = await auditService.getAuditLogs(params);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
        ? response.items
        : [];

      const formatted: FormattedAuditLog[] = list.map((item: any) => {
        const rawTs = item.timestamp || item.created_at || item.time || new Date().toISOString();
        return {
          id: String(item.id || item.entry_id || item.log_id || item._id || Math.random()),
          rawTimestamp: rawTs,
          timestamp: formatDateTime(rawTs),
          user: String(item.user || item.username || item.admin || item.email || item.user_id || "System Action"),
          userId: String(item.user_id || item.user || ""),
          role: String(item.role || item.role_name || "Internal Role"),
          action: String(item.action || item.event || item.event_type || item.description || item.message || "Operation Executed"),
          eventType: String(item.event_type || item.action || "audit_event"),
          entityType: String(item.entity_type || item.resource || item.module || "system"),
          entityId: String(item.entity_id || item.target_id || "-"),
          ip: String(item.ip || item.ip_address || "127.0.0.1"),
          status: String(item.status || item.result || "SUCCESS").toUpperCase(),
          previousState: item.previous_state ?? item.old_val ?? null,
          newState: item.new_state ?? item.new_val ?? null,
          rawItem: item,
        };
      });

      setLogs(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || "Failed to load audit logs from backend.");
      addToast("Could not load audit logs from server.", "error");
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter, addToast]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      setIsExporting(true);
      const data = await auditService.exportAuditLogs(format, {
        event_type: eventTypeFilter || undefined,
      });

      if (format === "csv") {
        const blob = data instanceof Blob ? data : new Blob([String(data)], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pawguard_audit_logs_${new Date().toISOString().slice(0, 10)}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const str = JSON.stringify(data, null, 2);
        const blob = new Blob([str], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pawguard_audit_logs_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      addToast(`Audit logs exported successfully (${format.toUpperCase()})!`, "success");
    } catch {
      addToast("Failed to export audit logs from server.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Search filtering
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.user.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.role.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.ip.toLowerCase().includes(q)
    );
  });

  const successful = filteredLogs.filter((l) => l.status === "SUCCESS").length;
  const flagged = filteredLogs.length - successful;
  const uniqueUsers = new Set(filteredLogs.map((l) => l.user).filter(Boolean)).size;

  const stats = [
    { title: "Total System Events", value: String(filteredLogs.length), trend: "Live server audit trail", color: "#2563EB", icon: <FaTerminal /> },
    { title: "Successful Operations", value: String(successful), trend: "Verified executions", color: "#10B981", icon: <FaCheckCircle /> },
    { title: "Flagged / Failed", value: String(flagged), trend: "Security monitoring", color: "#EF4444", icon: <FaExclamationTriangle /> },
    { title: "Active Users Tracked", value: String(uniqueUsers), trend: "Unique user accounts", color: "#6366F1", icon: <FaUserLock /> },
  ];

  const columns = [
    { key: "timestamp", title: "Timestamp" },
    {
      key: "user",
      title: "User / Admin",
      render: (v: string, row: FormattedAuditLog) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0F172A" }}>{v}</div>
          <div style={{ fontSize: "11px", color: "#64748B" }}>IP: {row.ip}</div>
        </div>
      ),
    },
    {
      key: "role",
      title: "Role",
      render: (v: string) => (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            background: "#EFF6FF",
            color: "#1D4ED8",
            textTransform: "capitalize",
          }}
        >
          {v || "Staff"}
        </span>
      ),
    },
    {
      key: "action",
      title: "System Event / Action",
      render: (v: string, row: FormattedAuditLog) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0F172A" }}>{v}</div>
          {row.entityType && row.entityType !== "system" && (
            <div style={{ fontSize: "11px", color: "#6366F1", marginTop: "2px" }}>
              Resource: <strong>{row.entityType}</strong> ({row.entityId})
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (v: string) => (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: "999px",
            background: v === "SUCCESS" ? "#D1FAE5" : "#FEE2E2",
            color: v === "SUCCESS" ? "#047857" : "#DC2626",
            border: v === "SUCCESS" ? "1px solid #A7F3D0" : "1px solid #FCA5A5",
          }}
        >
          {v}
        </span>
      ),
    },
    {
      key: "id",
      title: "Details",
      render: (_: string, row: FormattedAuditLog) => (
        <button
          onClick={() => {
            setSelectedLog(row);
            setIsDetailModalOpen(true);
          }}
          style={{
            padding: "5px 10px",
            borderRadius: "6px",
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#2563EB",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <FaEye /> View
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Security Audit &amp; Infrastructure Logs</h1>
            <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
              Authoritative server-side audit trail: operational CRUD events, security mutations, and administrative activity stream.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => void handleExport("csv")}
              disabled={isExporting}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #475569",
                background: "#334155",
                color: "#FFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isExporting ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaFileDownload /> Export CSV
            </button>
            <button
              onClick={() => void handleExport("json")}
              disabled={isExporting}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #475569",
                background: "#334155",
                color: "#FFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isExporting ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaFileDownload /> Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Real-Time Audit Event Stream
          </h3>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Event Type Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <FaFilter size={12} color="#64748B" />
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", background: "#FFF" }}
              >
                <option value="">All Event Types</option>
                <option value="animal_registered">Animal Registered</option>
                <option value="safety_tag_provisioned">Safety Tag Provisioned</option>
                <option value="rescue_dispatched">Rescue Dispatched</option>
                <option value="medical_clearance">Medical Clearance</option>
                <option value="adoption_submitted">Adoption Submitted</option>
                <option value="inventory_changed">Inventory Changed</option>
                <option value="role_permission_changed">Role / RBAC Changed</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: "10px", top: "11px", color: "#94A3B8" }} size={12} />
              <input
                type="text"
                placeholder="Search user, action, IP, resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "8px 12px 8px 30px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "13px", width: "240px" }}
              />
            </div>

            <button
              onClick={() => void fetchLogs()}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#F8FAFC",
                color: "#334155",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaSync style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#64748B", padding: "20px 0" }}>Fetching server-side audit logs...</p>
        ) : error ? (
          <p style={{ color: "#EF4444", padding: "20px 0" }}>{error}</p>
        ) : filteredLogs.length === 0 ? (
          <p style={{ color: "#64748B", padding: "20px 0" }}>No matching audit log entries found on the server.</p>
        ) : (
          <DataTable columns={columns} data={filteredLogs} />
        )}
      </div>

      {/* Detailed Audit Record Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Audit Log Detailed Event Record"
        maxWidth="640px"
      >
        {selectedLog && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#F8FAFC", padding: "14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>System Action</div>
              <div style={{ fontSize: "16px", fontWeight: 800, color: "#0F172A", marginTop: "2px" }}>{selectedLog.action}</div>
              <div style={{ fontSize: "12px", color: "#6366F1", marginTop: "4px" }}>
                Event Type: <strong>{selectedLog.eventType}</strong> &bull; Entry UUID: <span style={{ fontFamily: "monospace" }}>{selectedLog.id}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Acting User &amp; Role</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>{selectedLog.user}</div>
                <div style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>{selectedLog.role}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Timestamp &amp; IP</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedLog.timestamp}</div>
                <div style={{ fontSize: "12px", color: "#64748B" }}>IP: {selectedLog.ip}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Target Resource</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "2px", textTransform: "capitalize" }}>{selectedLog.entityType}</div>
                <div style={{ fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>ID: {selectedLog.entityId}</div>
              </div>

              <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Execution Status</div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "4px",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: selectedLog.status === "SUCCESS" ? "#D1FAE5" : "#FEE2E2",
                    color: selectedLog.status === "SUCCESS" ? "#047857" : "#DC2626",
                  }}
                >
                  {selectedLog.status}
                </span>
              </div>
            </div>

            {/* State Snapshots */}
            {(selectedLog.previousState || selectedLog.newState) && (
              <div style={{ background: "#1E293B", padding: "14px", borderRadius: "10px", color: "#F8FAFC" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#94A3B8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaInfoCircle /> State Transition Snapshot (JSON)
                </div>
                {selectedLog.previousState && (
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#FCA5A5", fontWeight: 700 }}>PREVIOUS STATE:</div>
                    <pre style={{ margin: "4px 0", fontSize: "11px", background: "#0F172A", padding: "8px", borderRadius: "6px", overflowX: "auto" }}>
                      {JSON.stringify(selectedLog.previousState, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newState && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#86EFAC", fontWeight: 700 }}>NEW STATE:</div>
                    <pre style={{ margin: "4px 0", fontSize: "11px", background: "#0F172A", padding: "8px", borderRadius: "6px", overflowX: "auto" }}>
                      {JSON.stringify(selectedLog.newState, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
              >
                Close Record
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogs;