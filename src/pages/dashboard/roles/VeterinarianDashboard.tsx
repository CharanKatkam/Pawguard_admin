import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../../components/dashboard/StatCard";
import DataTable from "../../../components/common/DataTable";
import QuickActionCard from "../../../components/dashboard/QuickActionCard";
import { FaStethoscope, FaSyringe, FaFileMedical, FaExclamationCircle } from "react-icons/fa";
import dashboardService from "../../../services/dashboardService";
import { useDataSync } from "../../../utils/dataSync";

const VeterinarianDashboard = () => {
  const navigate = useNavigate();
  const [medicalRecords, setMedicalRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getVeterinarianDashboard();

      const data = res?.data || res || {};
      const recordsList = Array.isArray(data)
        ? data
        : Array.isArray(data?.records)
        ? data.records
        : Array.isArray(data?.medicalRecords)
        ? data.medicalRecords
        : typeof data === "object" && Object.keys(data).length > 0
        ? [data]
        : [];

      setMedicalRecords(recordsList);
    } catch (err: any) {
      console.error("Veterinarian Dashboard Error:", err);
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load veterinarian medical records. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useDataSync(fetchRecords);

  const stats = [
    { title: "Critical ICU Patients", value: loading ? "..." : `${medicalRecords.filter((r) => String(r.status).toLowerCase().includes("critical") || String(r.status).toLowerCase().includes("post-op")).length} Patients`, trend: "High Priority", color: "#EF4444", icon: <FaExclamationCircle /> },
    { title: "Surgeries Today", value: loading ? "..." : `${medicalRecords.filter((r) => String(r.treatment || r.status).toLowerCase().includes("surgery")).length} Scheduled`, trend: "Operating Room", color: "#2563EB", icon: <FaStethoscope /> },
    { title: "Vaccinations Due", value: loading ? "..." : `${medicalRecords.filter((r) => String(r.treatment || r.status).toLowerCase().includes("vaccin")).length} Pets`, trend: "Immunization", color: "#F59E0B", icon: <FaSyringe /> },
    { title: "Cleared Healthy", value: loading ? "..." : `${medicalRecords.filter((r) => String(r.status).toLowerCase().includes("completed") || String(r.status).toLowerCase().includes("discharged") || String(r.status).toLowerCase().includes("healthy")).length} Pets`, trend: "Ready for Adoption", color: "#10B981", icon: <FaFileMedical /> },
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


      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <QuickActionCard icon={<FaStethoscope />} title="Record Medical Exam" subtitle="Log diagnosis & symptoms" color="#2563EB" onClick={() => navigate("/medical-records")} />
        <QuickActionCard icon={<FaSyringe />} title="Log Vaccination" subtitle="Administer vaccine booster" color="#10B981" onClick={() => navigate("/medical-records")} />
        <QuickActionCard icon={<FaFileMedical />} title="Issue Certificate" subtitle="Medical health clearance" color="#6366F1" onClick={() => navigate("/certificates")} />
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
