import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import { useToast } from "../../context/ToastContext";
import { FaTerminal, FaCheckCircle, FaExclamationTriangle, FaUserLock } from "react-icons/fa";
import auditService from "../../services/auditService";

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await auditService.getAuditLogs();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];
      const formatted = list.map((item: any) => ({
        id: item.id ?? item.log_id ?? item._id ?? "",
        timestamp: item.timestamp ?? item.created_at ?? item.time ?? "",
        user: item.user ?? item.username ?? item.admin ?? item.email ?? "",
        role: item.role ?? item.role_name ?? "",
        action: item.action ?? item.event ?? item.description ?? item.message ?? "",
        ip: item.ip ?? item.ip_address ?? "",
        status: item.status ?? item.result ?? "",
      }));
      setLogs(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load audit logs.");
      addToast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const successful = logs.filter((l) => (l.status || "").toLowerCase() === "success").length;
  const flagged = logs.length - successful;
  const uniqueUsers = new Set(logs.map((l) => l.user).filter(Boolean)).size;

  const stats = [
    { title: "Total System Events", value: String(logs.length), trend: "Live audit stream", color: "#2563EB", icon: <FaTerminal /> },
    { title: "Successful Events", value: String(successful), trend: "No failures logged", color: "#10B981", icon: <FaCheckCircle /> },
    { title: "Flagged / Failed", value: String(flagged), trend: "Requires attention", color: "#F59E0B", icon: <FaExclamationTriangle /> },
    { title: "Active Users Tracked", value: String(uniqueUsers), trend: "Unique accounts", color: "#6366F1", icon: <FaUserLock /> },
  ];

  const columns = [
    { key: "timestamp", title: "Timestamp" },
    { key: "user", title: "User / Admin" },
    { key: "role", title: "Role" },
    { key: "action", title: "System Event / Action" },
    { key: "ip", title: "IP Address" },
    { key: "status", title: "Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Security Audit & Infrastructure Logs</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Super Administrator audit trail: real-time security tracking, user authentication history, and permission mutation logs.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
          Real-Time Audit Event Stream
        </h3>
        {loading ? (
          <p style={{ color: "#64748B" }}>Loading audit logs…</p>
        ) : error ? (
          <p style={{ color: "#EF4444" }}>{error}</p>
        ) : logs.length === 0 ? (
          <p style={{ color: "#64748B" }}>No audit events found.</p>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
          />
        )}
      </div>
    </div>
  );
};

export default AuditLogs;