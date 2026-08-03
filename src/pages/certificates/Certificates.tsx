import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import { FaCertificate, FaFileContract, FaCheckCircle, FaPrint, FaPlus } from "react-icons/fa";

const Certificates = () => {
  const stats = [
    { title: "Total Certificates", value: "312 Issued", trend: "100% Verified", color: "#2563EB", icon: <FaCertificate /> },
    { title: "Adoption Certificates", value: "186 Forms", trend: "Legal Clearance", color: "#10B981", icon: <FaFileContract /> },
    { title: "Medical Certificates", value: "126 Records", trend: "Vet Approved", color: "#6366F1", icon: <FaCheckCircle /> },
  ];

  const columns = [
    { key: "certId", title: "Certificate ID" },
    { key: "type", title: "Certificate Type" },
    { key: "pet", title: "Pet Name & ID" },
    { key: "issuedTo", title: "Recipient / Adopter" },
    { key: "issuedBy", title: "Issuing Authority" },
    { key: "date", title: "Issue Date" },
    { key: "status", title: "Status" },
  ];

  const data = [
    { certId: "CERT-7001", type: "Official Adoption Certificate", pet: "Max (DOG-402)", issuedTo: "Sarah Jenkins", issuedBy: "Adoption Dept", date: "2026-07-28", status: "Verified" },
    { certId: "CERT-7002", type: "Rabies Health Clearance", pet: "Bella (DOG-415)", issuedTo: "City Health Board", issuedBy: "Dr. John Smith", date: "2026-07-26", status: "Verified" },
    { certId: "CERT-7003", type: "Foster Care Agreement", pet: "Charlie (DOG-399)", issuedTo: "Mark Stevens", issuedBy: "Foster Dept", date: "2026-07-24", status: "Verified" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Certificates & Legal Agreements</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Issue official digital certificates for pet adoptions, medical health clearances, rabies vaccinations, and foster care agreements.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlus />} title="Generate Adoption Cert" subtitle="Create formal adoption document" color="#2563EB" onClick={() => alert("Generate Cert modal")} />
        <QuickActionCard icon={<FaCertificate />} title="Issue Health Cert" subtitle="Vet medical clearance" color="#10B981" onClick={() => alert("Health Cert modal")} />
        <QuickActionCard icon={<FaPrint />} title="Print Certificate" subtitle="Export high-res PDF" color="#6366F1" onClick={() => alert("Print Certificate")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
          Issued Digital Certificates Registry
        </h3>
        <DataTable columns={columns} data={data} onView={(r) => alert(`Certificate ID: ${r.certId}`)} />
      </div>
    </div>
  );
};

export default Certificates;
