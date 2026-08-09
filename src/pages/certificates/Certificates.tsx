import { useEffect, useState } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import reportsService from "../../services/reportsService";
import medicalService from "../../services/medicalService";
import dogService from "../../services/dogService";
import { notifyDataChanged } from "../../utils/dataSync";
import { FaCertificate, FaFileContract, FaCheckCircle, FaPrint, FaPlus } from "react-icons/fa";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  boxSizing: "border-box",
};

const Certificates = () => {
  const { addToast } = useToast();
  const [certData, setCertData] = useState<any[]>([]);
  const [dogs, setDogs] = useState<any[]>([]);

  // Modals state
  const [isAdoptionModalOpen, setIsAdoptionModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  // Forms
  const [adoptionForm, setAdoptionForm] = useState({ dogId: "", issuedTo: "" });
  const [healthForm, setHealthForm] = useState({ dogId: "", issuedTo: "" });

  useEffect(() => {
    const loadDogs = async () => {
      try {
        const response = await dogService.getDogs({ page: 1, page_size: 200 });
        const list = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response?.data) ? response.data : [];
        setDogs(list);
      } catch {
        setDogs([]);
      }
    };
    void loadDogs();
  }, []);

  const dogName = (dogId: string) => {
    const dog = dogs.find((d) => d.id === dogId);
    return dog?.name ? `${dog.name}${dog.breed ? ` (${dog.breed})` : ""}` : dogId;
  };

  const appendCert = (created: any) => {
    if (!created) return;
    const row = created.data ?? created;
    setCertData((prev) => [
      {
        certId: row.id ?? row.certificate_id ?? "",
        type: row.clearance_type ?? row.type ?? "Certificate",
        pet: row.dog?.name ? `${row.dog.name} (${row.dog_id})` : dogName(row.dog_id ?? row.pet),
        issuedTo: row.decision_notes ?? "—",
        issuedBy: row.authorized_by_id ?? "—",
        date: row.authorized_at ?? row.created_at ?? new Date().toISOString().split("T")[0],
        status: row.status ?? "Issued",
      },
      ...prev,
    ]);
    notifyDataChanged();
  };

  const handleGenerateAdoptionCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adoptionForm.dogId || !adoptionForm.issuedTo) {
      addToast("Dog and Recipient are required", "error");
      return;
    }
    try {
      const created = await medicalService.issueCertificate({
        dog_id: adoptionForm.dogId,
        clearance_type: "adoption_clearance",
        decision_notes: `Issued to ${adoptionForm.issuedTo}`,
      });
      appendCert(created);
      addToast(`Adoption Certificate generated for ${dogName(adoptionForm.dogId)}!`, "success");
      setIsAdoptionModalOpen(false);
      setAdoptionForm({ dogId: "", issuedTo: "" });
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to generate certificate.", "error");
    }
  };

  const handleIssueHealthCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthForm.dogId) {
      addToast("Dog selection is required", "error");
      return;
    }
    try {
      const created = await medicalService.issueCertificate({
        dog_id: healthForm.dogId,
        clearance_type: "health_clearance",
        decision_notes: healthForm.issuedTo ? `Issued to ${healthForm.issuedTo}` : undefined,
      });
      appendCert(created);
      addToast(`Health Clearance Certificate generated for ${dogName(healthForm.dogId)}!`, "success");
      setIsHealthModalOpen(false);
      setHealthForm({ dogId: "", issuedTo: "" });
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to issue certificate.", "error");
    }
  };

  const handlePrintCertificates = async () => {
    try {
      addToast("Exporting medical clearance report (PDF)...", "info");
      await reportsService.generateAndDownloadReport({ report_type: "medical", format: "pdf" });
      addToast("Certificates report exported!", "success");
    } catch (err: any) {
      addToast(err?.message || "Failed to export certificates.", "error");
    }
  };

  const verifiedCount = certData.filter((c) => /approved|issued|active|verified/i.test(String(c.status ?? ""))).length;

  const stats = [
    { title: "Total Certificates", value: `${certData.length} Issued`, trend: `${verifiedCount} Verified`, color: "#2563EB", icon: <FaCertificate /> },
    { title: "Adoption Certificates", value: `${certData.filter((c) => String(c.type).includes("adoption")).length} Forms`, trend: "Legal Clearance", color: "#10B981", icon: <FaFileContract /> },
    { title: "Medical Certificates", value: `${certData.filter((c) => String(c.type).includes("health")).length} Records`, trend: "Vet Approved", color: "#6366F1", icon: <FaCheckCircle /> },
  ];

  const columns = [
    { key: "certId", title: "Certificate ID" },
    { key: "type", title: "Certificate Type" },
    { key: "pet", title: "Pet Name & ID" },
    { key: "issuedTo", title: "Recipient / Notes" },
    { key: "issuedBy", title: "Authorized By" },
    { key: "date", title: "Issue Date" },
    { key: "status", title: "Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Certificates & Legal Agreements</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Issue official digital clearance certificates for pet adoptions and veterinary health, with a session registry of issued documents.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_medical">
          <QuickActionCard icon={<FaPlus />} title="Generate Adoption Cert" subtitle="Create formal adoption clearance" color="#2563EB" onClick={() => setIsAdoptionModalOpen(true)} />
        </Can>
        <Can permission="create_medical">
          <QuickActionCard icon={<FaCertificate />} title="Issue Health Cert" subtitle="Vet medical clearance" color="#10B981" onClick={() => setIsHealthModalOpen(true)} />
        </Can>
        <QuickActionCard icon={<FaPrint />} title="Export Medical Report" subtitle="Download clearance PDF" color="#6366F1" onClick={handlePrintCertificates} />
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
          emptyMessage="No certificates issued in this session. Generate one from the actions above."
        />
      </div>

      {/* Generate Adoption Certificate Modal */}
      <Modal isOpen={isAdoptionModalOpen} onClose={() => setIsAdoptionModalOpen(false)} title="Generate Formal Adoption Certificate">
        <form onSubmit={handleGenerateAdoptionCert} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={adoptionForm.dogId} onChange={(e) => setAdoptionForm({ ...adoptionForm, dogId: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{dogName(d.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Recipient / Adopter Name *</label>
            <input type="text" required placeholder="e.g. Sarah Jenkins" value={adoptionForm.issuedTo} onChange={(e) => setAdoptionForm({ ...adoptionForm, issuedTo: e.target.value })} style={inputStyle} />
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
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={healthForm.dogId} onChange={(e) => setHealthForm({ ...healthForm, dogId: e.target.value })} style={inputStyle}>
              <option value="">Select dog...</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>{dogName(d.id)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Recipient Authority</label>
            <input type="text" placeholder="e.g. Veterinary Health Board" value={healthForm.issuedTo} onChange={(e) => setHealthForm({ ...healthForm, issuedTo: e.target.value })} style={inputStyle} />
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
