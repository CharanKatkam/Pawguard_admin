import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import { FaSearchLocation, FaCheckCircle, FaExclamationCircle, FaPlus } from "react-icons/fa";
import lostFoundService from "../../services/lostFoundService";
import { notifyDataChanged } from "../../utils/dataSync";

const LostAndFound = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: "lost" as "lost" | "found",
    pet_name: "",
    description: "",
    location: "",
    contact_name: "",
    contact_phone: "",
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await lostFoundService.getLostFoundList();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formatted = list.map((item: any) => ({
        id: item.id || item.report_id || "",
        type: item.type || item.category || "",
        pet_name: item.pet_name || item.name || "",
        description: item.description || "",
        location: item.location || "",
        contact: item.contact_name ? `${item.contact_name} (${item.contact_phone || ""})` : "",
        status: item.status || "",
        date: item.date_reported || item.created_at || item.date || "",
      }));

      setReports(formatted);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load lost & found listings.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await lostFoundService.createReport(formData);
      addToast("Lost/Found pet report created successfully!", "success");
      setIsAddModalOpen(false);
fetchReports();
      notifyDataChanged();
    } catch (err: any) {
      addToast(err?.response?.data?.detail || "Failed to create report", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "id", header: "Report #" },
    {
      key: "type",
      header: "Category",
      render: (val: string) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 700,
            background: val === "lost" ? "#FEF2F2" : "#EFF6FF",
            color: val === "lost" ? "#EF4444" : "#2563EB",
          }}
        >
          {val.toUpperCase()}
        </span>
      ),
    },
    { key: "pet_name", header: "Pet Identification" },
    { key: "location", header: "Last Seen Location" },
    { key: "description", header: "Description & Markers" },
    { key: "contact", header: "Contact Details" },
    {
      key: "status",
      header: "Status",
      render: (val: string) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600,
            background: val === "Reunited" ? "#ECFDF5" : "#FFFBEB",
            color: val === "Reunited" ? "#10B981" : "#F59E0B",
          }}
        >
          {val}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Lost & Found Pet Registry
          </h1>
          <p style={{ color: "#64748B", margin: "4px 0 0 0", fontSize: "14px" }}>
            Match lost pet reports with rescued animals and reunite pets with owners.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            background: "#2563EB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <FaPlus size={14} />
          <span>New Report</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard title="Total Listings" value={reports.length} icon={<FaSearchLocation />} color="#2563EB" />
        <StatCard title="Lost Dog Reports" value={reports.filter((r) => r.type === "lost").length} icon={<FaExclamationCircle />} color="#EF4444" />
        <StatCard title="Found Dog Reports" value={reports.filter((r) => r.type === "found").length} icon={<FaSearchLocation />} color="#F59E0B" />
        <StatCard title="Pets Reunited" value={reports.filter((r) => r.status === "Reunited").length} icon={<FaCheckCircle />} color="#10B981" />
      </div>

      <DataTable
        data={reports}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={fetchReports}
        emptyMessage="No active lost or found pet reports."
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Lost/Found Pet">
        <form onSubmit={handleCreateReport} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Report Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as "lost" | "found" })}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
            >
              <option value="lost">Lost Pet (Missing)</option>
              <option value="found">Found Pet (Spotted/Rescued)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Pet Name / Description *</label>
            <input type="text" required value={formData.pet_name} onChange={(e) => setFormData({ ...formData, pet_name: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Location</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600 }}>Distinctive Markers / Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Contact Name</label>
              <input type="text" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600 }}>Contact Phone</label>
              <input type="text" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #CBD5E1" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFF" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", borderRadius: "6px", background: "#2563EB", color: "#FFF", border: "none" }}>{isSubmitting ? "Submitting..." : "Save Listing"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LostAndFound;
