import { useState, useEffect } from "react";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaStethoscope, FaSyringe, FaFileMedical, FaExclamationCircle } from "react-icons/fa";
import medicalService from "../../../services/medicalService";

const VeterinarianDashboard = () => {
  const [medicalRecords, setMedicalRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await medicalService.getMedicalRecords();
        if (res && Array.isArray(res.data)) {
          setMedicalRecords(res.data);
        }
      } catch {
        // Fallback handled by service
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const stats = [
    { title: "Critical ICU Patients", value: `${medicalRecords.filter((r) => r.status === "Critical ICU" || r.status === "Post-Op Recovery").length || 4} Patients`, trend: "High Priority", trendUp: false, color: "#EF4444", icon: <FaExclamationCircle /> },
    { title: "Surgeries Today", value: "3 Scheduled", trend: "Operating Room A", color: "#2563EB", icon: <FaStethoscope /> },
    { title: "Vaccinations Due", value: "14 Pets", trend: "Rabies & Parvo", color: "#F59E0B", icon: <FaSyringe /> },
    { title: "Cleared Healthy", value: `${medicalRecords.filter((r) => r.status === "Completed" || r.status === "Discharged").length || 28} Pets`, trend: "Ready for Adoption", color: "#10B981", icon: <FaFileMedical /> },
  ];

  const medicalColumns = [
    { key: "recordId", title: "Record ID" },
    { key: "petName", title: "Pet Name & ID" },
    { key: "vetName", title: "Attending Vet" },
    { key: "diagnosis", title: "Primary Medical Diagnosis" },
    { key: "treatment", title: "Treatment Plan" },
    { key: "status", title: "Care Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "20px 24px", borderRadius: "14px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Veterinary Medical Station</h1>
        <p style={{ margin: "4px 0 0", color: "#94A3B8", fontSize: "13px" }}>
          Clinical healthcare suite: medical diagnoses, surgery logs, vaccination tracking, and intensive care management.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaStethoscope />} title="Record Medical Exam" subtitle="Log diagnosis & symptoms" color="#2563EB" onClick={() => alert("Medical Exam modal")} />
        <QuickActionCard icon={<FaSyringe />} title="Log Vaccination" subtitle="Administer vaccine booster" color="#10B981" onClick={() => alert("Log Vaccination modal")} />
        <QuickActionCard icon={<FaFileMedical />} title="Issue Certificate" subtitle="Medical health clearance" color="#6366F1" onClick={() => alert("Medical Certificate modal")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, color: "#0F172A", fontSize: "16px", fontWeight: 700 }}>
            Active Medical Patients & ICU Queue
          </h3>
          {loading ? (
            <span style={{ fontSize: "12px", color: "#2563EB", fontWeight: 600 }}>Syncing records...</span>
          ) : (
            <span style={{ color: "#EF4444", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", background: "#FEF2F2", padding: "4px 10px", borderRadius: "999px" }}>
              <FaExclamationCircle /> Clinical Active Watch
            </span>
          )}
        </div>
        <DataTable columns={medicalColumns} data={medicalRecords} />
      </div>
    </div>
  );
};

export default VeterinarianDashboard;
