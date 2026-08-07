import { useState } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import reportsService from "../../services/reportsService";
import medicalService from "../../services/medicalService";
import { notifyDataChanged } from "../../utils/dataSync";
import { FaCertificate, FaFileContract, FaCheckCircle, FaPrint, FaPlus } from "react-icons/fa";

const Certificates = () => {
  const { addToast } = useToast();
  const [certData, setCertData] = useState<any[]>([]);

  // Modals state
  const [isAdoptionModalOpen, setIsAdoptionModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);


  // Forms
  const [adoptionForm, setAdoptionForm] = useState({ pet: "", issuedTo: "" });
  const [healthForm, setHealthForm] = useState({ pet: "", issuedTo: "" });

  const appendCert = (created: any) => {
    if (!created) return;
    const row = created.data ?? created;
    setCertData((prev) => [
      {
        certId: row.certificate_id ?? row.id ?? row.cert_id ?? "",
        type: row.certificate_type ?? row.type ?? "Certificate",
        pet: row.pet_name ?? row.pet ?? "",
        issuedTo: row.issued_to ?? row.recipient ?? row.issuedTo ?? "",
        issuedBy: row.issued_by ?? row.issuedBy ?? "",
        date: row.issue_date ?? row.date ?? row.created_at ?? new Date().toISOString().split("T")[0],
        status: row.status ?? "Verified",
      },
      ...prev,
    ]);
    notifyDataChanged();
  };

  const handleGenerateAdoptionCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adoptionForm.pet || !adoptionForm.issuedTo) {
      addToast("Pet and Recipient are required", "error");
      return;
    }
    try {
      const created = await medicalService.issueCertificate({
        certificate_type: "Official Adoption Certificate",
        pet_name: adoptionForm.pet,
        issued_to: adoptionForm.issuedTo,
        issued_by: "Adoption Department",
      });
      appendCert(created);
      addToast(`Adoption Certificate generated for ${adoptionForm.pet}!`, "success");
      setIsAdoptionModalOpen(false);
      setAdoptionForm({ pet: "", issuedTo: "" });
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to generate certificate.", "error");
    }
  };

  const handleIssueHealthCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthForm.pet) {
      addToast("Pet name is required", "error");
      return;
    }
    try {
      const created = await medicalService.issueCertificate({
        certificate_type: "Rabies Health Clearance",
        pet_name: healthForm.pet,
        issued_to: healthForm.issuedTo || "Veterinary Health Board",
        issued_by: "Veterinary Department",
      });
      appendCert(created);
      addToast(`Health Clearance Certificate generated for ${healthForm.pet}!`, "success");
      setIsHealthModalOpen(false);
      setHealthForm({ pet: "", issuedTo: "" });
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to issue certificate.", "error");
    }
  };

  const handlePrintCertificates = async () => {
    try {
      addToast("Exporting certificates archive as high-res PDF...", "info");
      await reportsService.exportExecutivePdf();
      addToast("Certificates exported!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export certificates.", "error");
    }
  };

  const verifiedCount = certData.filter((c) => /verified|issued|active/i.test(String(c.status ?? ""))).length;

  const stats = [
    { title: "Total Certificates", value: `${certData.length} Issued`, trend: `${verifiedCount} Verified`, color: "#2563EB", icon: <FaCertificate /> },
    { title: "Adoption Certificates", value: `${certData.filter((c) => String(c.type).includes("Adoption")).length} Forms`, trend: "Legal Clearance", color: "#10B981", icon: <FaFileContract /> },
    { title: "Medical Certificates", value: `${certData.filter((c) => String(c.type).includes("Health")).length} Records`, trend: "Vet Approved", color: "#6366F1", icon: <FaCheckCircle /> },
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

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Certificates & Legal Agreements</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Issue official digital certificates for pet adoptions, medical health clearances, rabies vaccinations, and foster care agreements.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_certificates">
          <QuickActionCard icon={<FaPlus />} title="Generate Adoption Cert" subtitle="Create formal adoption document" color="#2563EB" onClick={() => setIsAdoptionModalOpen(true)} />
        </Can>
        <Can permission="create_certificates">
          <QuickActionCard icon={<FaCertificate />} title="Issue Health Cert" subtitle="Vet medical clearance" color="#10B981" onClick={() => setIsHealthModalOpen(true)} />
        </Can>
        <QuickActionCard icon={<FaPrint />} title="Print Certificate" subtitle="Export high-res PDF" color="#6366F1" onClick={handlePrintCertificates} />
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
        <DataTable
          columns={columns}
          data={certData}
          emptyMessage="No certificates issued yet. Generate one from the actions above."
        />
      </div>

      {/* Generate Adoption Certificate Modal */}
      <Modal isOpen={isAdoptionModalOpen} onClose={() => setIsAdoptionModalOpen(false)} title="Generate Formal Adoption Certificate">
        <form onSubmit={handleGenerateAdoptionCert} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Name & ID *</label>
            <input type="text" required placeholder="e.g. Max (DOG-402)" value={adoptionForm.pet} onChange={(e) => setAdoptionForm({ ...adoptionForm, pet: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Recipient / Adopter Name *</label>
            <input type="text" required placeholder="e.g. Sarah Jenkins" value={adoptionForm.issuedTo} onChange={(e) => setAdoptionForm({ ...adoptionForm, issuedTo: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAdoptionModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>Generate Certificate</button>
          </div>
        </form>
      </Modal>

      {/* Issue Health Certificate Modal */}
      <Modal isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} title="Issue Vet Health Clearance Certificate">
        <form onSubmit={handleIssueHealthCert} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Pet Name & ID *</label>
            <input type="text" required placeholder="e.g. Bella (DOG-415)" value={healthForm.pet} onChange={(e) => setHealthForm({ ...healthForm, pet: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Issuing Recipient Authority</label>
            <input type="text" value={healthForm.issuedTo} onChange={(e) => setHealthForm({ ...healthForm, issuedTo: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsHealthModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>Issue Health Cert</button>
          </div>
        </form>
      </Modal>


    </div>
  );
};

export default Certificates;
