import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import { FaShieldAlt, FaTerminal, FaUserLock, FaHistory } from "react-icons/fa";

const AuditLogs = () => {
  const stats = [
    { title: "Total System Events", value: "8,940", trend: "+320 today", color: "#2563EB", icon: <FaTerminal /> },
    { title: "Security Audits", value: "100% Passed", trend: "0 Breaches", color: "#10B981", icon: <FaShieldAlt /> },
    { title: "Admin Interventions", value: "42 Actions", trend: "Role Governance", color: "#6366F1", icon: <FaUserLock /> },
    { title: "Retention Window", value: "365 Days", trend: "Compliant", color: "#F59E0B", icon: <FaHistory /> },
  ];

  const columns = [
    { key: "timestamp", title: "Timestamp" },
    { key: "user", title: "User / Admin" },
    { key: "role", title: "Role" },
    { key: "action", title: "System Event / Action" },
    { key: "ip", title: "IP Address" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { timestamp: "2026-07-30 17:40:12", user: "super.admin@pawguard.com", role: "Super Administrator", action: "Updated Role Permissions Matrix", ip: "192.168.1.45", status: "Success" },
    { timestamp: "2026-07-30 16:15:00", user: "system_cron", role: "System Automation", action: "Automated Database Backup Run", ip: "127.0.0.1", status: "Success" },
    { timestamp: "2026-07-30 14:02:44", user: "vet@pawguard.com", role: "Veterinarian", action: "Exported Clinical Medical Logs", ip: "192.168.1.88", status: "Success" },
    { timestamp: "2026-07-30 11:30:19", user: "rescue.admin@pawguard.com", role: "Rescue Centre Admin", action: "Onboarded Rescue Facility #12", ip: "10.0.4.12", status: "Success" },
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
        <DataTable columns={columns} data={data} onView={(r) => alert(`Audit Detail: ${r.action}`)} />
      </div>
    </div>
  );
};

export default AuditLogs;
