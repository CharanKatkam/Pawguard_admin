import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaStethoscope, FaSyringe, FaNotesMedical, FaFileMedical, FaUserMd } from "react-icons/fa";
import medicalService from "../../services/medicalService";

const MedicalRecords = () => {
  const [medicalRecords, setMedicalRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const response = await medicalService.getMedicalRecords();
        if (response && Array.isArray(response.data)) {
          setMedicalRecords(response.data);
        }
      } catch {
        // Handled by service fallback
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const stats = [
    { title: "Active Patients", value: `${medicalRecords.length || 48} Pets`, trend: "+4 this week", color: "#2563EB", icon: <FaStethoscope /> },
    { title: "Surgeries Completed", value: "18 Cases", trend: "+12%", color: "#10B981", icon: <FaNotesMedical /> },
    { title: "Vaccinations Administered", value: "142 Records", trend: "+24%", color: "#F59E0B", icon: <FaSyringe /> },
    { title: "Certificates Issued", value: "86 Issued", trend: "100% Verified", color: "#6366F1", icon: <FaFileMedical /> },
  ];

  const columns = [
    { key: "recordId", title: "Record ID" },
    { key: "petName", title: "Pet Name & ID" },
    { key: "vetName", title: "Attending Vet" },
    { key: "diagnosis", title: "Diagnosis" },
    { key: "treatment", title: "Treatment Plan" },
    { key: "status", title: "Health Status" },
  ];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Medical Records & Clinical Care</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Centralized veterinary management system: patient histories, surgical logs, treatment schedules, and medical clearance certificates.
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaStethoscope />} title="Record Examination" subtitle="Log new clinical diagnosis" color="#2563EB" onClick={() => alert("New Examination modal opened")} />
        <QuickActionCard icon={<FaSyringe />} title="Log Vaccination" subtitle="Administer vaccine booster" color="#10B981" onClick={() => alert("Vaccination entry modal opened")} />
        <QuickActionCard icon={<FaUserMd />} title="Schedule Surgery" subtitle="Book operating theater" color="#F59E0B" onClick={() => alert("Schedule Surgery modal opened")} />
        <QuickActionCard icon={<FaFileMedical />} title="Issue Certificate" subtitle="Generate health clearance" color="#6366F1" onClick={() => alert("Certificate generation modal opened")} />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {/* Data Table */}
      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Patient Clinical Directory
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading medical records...</span>}
        </div>
        <DataTable columns={columns} data={medicalRecords} onView={(row) => alert(`Viewing Record: ${row.recordId}`)} onEdit={(row) => alert(`Editing Record: ${row.recordId}`)} />
      </div>
    </div>
  );
};

export default MedicalRecords;
