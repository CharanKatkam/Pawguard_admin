import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import { FaHeart, FaUserCheck, FaClipboardCheck, FaPlus, FaTrash } from "react-icons/fa";
import adoptionService from "../../services/adoptionService";
import dogService from "../../services/dogService";
import { notifyDataChanged } from "../../utils/dataSync";

const Adoptions = () => {
  const [adoptions, setAdoptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedApp, _setSelectedApp] = useState<any | null>(null);

  // Form states
  const [newForm, setNewForm] = useState({ applicantName: "", petName: "", dogId: "", residentialStatus: "owned" });
  const [scheduleForm, setScheduleForm] = useState({ appId: "", date: "", coordinator: "" });
  const [approveForm, setApproveForm] = useState({ appId: "" });
  const [editStatus, setEditStatus] = useState("Approved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dogs, setDogs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetchAdoptions();
    dogService
      .getDogs({ is_adoptable: true })
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(list)) setDogs(list);
      })
      .catch(() => setDogs([]));
  }, []);

  const fetchAdoptions = async () => {
    try {
      setLoading(true);
      const response = await adoptionService.getAdoptions();
      if (response && Array.isArray(response.data)) {
        setAdoptions(response.data);
      }
    } catch {
      // Handled by service fallback
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.applicantName) {
      addToast("Applicant Name is required", "error");
      return;
    }
    if (!newForm.dogId) {
      addToast("Please select the dog for this application.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await adoptionService.createAdoption({
        applicant_name: newForm.applicantName,
        pet_name: newForm.petName,
        dog_id: newForm.dogId,
        residential_status: newForm.residentialStatus,
      });
      addToast(`New adoption application logged for ${newForm.applicantName}!`, "success");
      setIsNewModalOpen(false);
      setNewForm({ applicantName: "", petName: "", dogId: "", residentialStatus: "owned" });
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to log adoption application.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.appId) {
      addToast("Please select an application to schedule a visit for.", "error");
      return;
    }
    if (!scheduleForm.date) {
      addToast("Please pick an inspection date.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await adoptionService.scheduleHomeInspection(scheduleForm.appId, scheduleForm.date);
      addToast("Home verification visit scheduled.", "success");
      setIsScheduleModalOpen(false);
      setScheduleForm({ appId: "", date: "", coordinator: "" });
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Failed to schedule home verification.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = approveForm.appId;
    if (!id) {
      addToast("Please select an application to approve.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await adoptionService.updateAdoptionStatus(id, "Approved");
      addToast(`Adoption application ${id} Approved!`, "success");
      setIsApproveModalOpen(false);
      setApproveForm({ appId: "" });
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to approve application.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      setIsSubmitting(true);
      await adoptionService.updateAdoptionStatus(selectedApp.applicationId, editStatus);
      addToast(`Application ${selectedApp.applicationId} status updated to ${editStatus}!`, "success");
      setIsEditModalOpen(false);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update application status.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApp) return;
    try {
      setIsSubmitting(true);
      await adoptionService.deleteAdoption(selectedApp.applicationId);
      addToast(`Deleted application ${selectedApp.applicationId}`, "success");
      setIsDeleteModalOpen(false);
      fetchAdoptions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete application.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectedStatuses = ["rejected", "denied"];
  const scheduledVerifications = adoptions.filter((a: any) => a.home_inspection_scheduled_at).length;

  const stats = [
    { title: "Adoptions Completed", value: `${adoptions.filter(a => String(a.status).toLowerCase() === "approved" || String(a.status).toLowerCase() === "completed").length} Pets`, trend: "Approved", color: "#10B981", icon: <FaHeart /> },
    { title: "Pending Applications", value: `${adoptions.filter(a => !rejectedStatuses.includes(String(a.status).toLowerCase()) && String(a.status).toLowerCase() !== "approved" && String(a.status).toLowerCase() !== "completed").length} Reviews`, trend: "In Review", color: "#F59E0B", icon: <FaClipboardCheck /> },
    { title: "Home Verifications", value: `${scheduledVerifications} Visits`, trend: "Scheduled Inspections", color: "#2563EB", icon: <FaUserCheck /> },
  ];

  const columns = [
    { key: "applicationId", title: "App ID" },
    { key: "applicantName", title: "Applicant Name" },
    { key: "petName", title: "Pet Interested" },
    { key: "date", title: "Applied Date" },
    { key: "status", title: "Decision Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Adoption Requests & Approvals</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Adoption workflow: review applicant questionnaires, conduct home visits, schedule interviews, and issue adoption agreements.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <Can permission="create_adoptions">
          <QuickActionCard icon={<FaPlus />} title="New Adoption Request" subtitle="Log walk-in applicant" color="#2563EB" onClick={() => setIsNewModalOpen(true)} />
        </Can>
        <Can permission="create_adoptions">
          <QuickActionCard icon={<FaUserCheck />} title="Schedule Home Verification" subtitle="Assign field coordinator" color="#10B981" onClick={() => setIsScheduleModalOpen(true)} />
        </Can>
        <Can permission="approve_adoptions">
          <QuickActionCard icon={<FaHeart />} title="Approve Adoption" subtitle="Issue certificate & finalize" color="#6366F1" onClick={() => setIsApproveModalOpen(true)} />
        </Can>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Adoption Applications Queue
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading applications...</span>}
        </div>
        <DataTable
          columns={columns}
          data={adoptions}
          module="adoptions"
          onEdit={async (r) => {
            await adoptionService.updateAdoptionStatus(r.id, r.status || "Approved");
            fetchAdoptions();
          }}
          onDelete={async (r) => {
            await adoptionService.deleteAdoption(r.id);
            fetchAdoptions();
          }}
        />
      </div>

      {/* New Adoption Request Modal */}
      <Modal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} title="Log New Adoption Application">
        <form onSubmit={handleCreateNewAdoption} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Applicant Full Name *</label>
            <input type="text" required placeholder="e.g. Emily Clark" value={newForm.applicantName} onChange={(e) => setNewForm({ ...newForm, applicantName: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog *</label>
            <select required value={newForm.dogId} onChange={(e) => setNewForm({ ...newForm, dogId: e.target.value, petName: (e.target.selectedOptions[0]?.textContent || "").split(" (")[0] })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="">Select a dog...</option>
              {dogs.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name || d.registration_number || d.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Residential Status *</label>
            <select value={newForm.residentialStatus} onChange={(e) => setNewForm({ ...newForm, residentialStatus: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="owned">Owned</option>
              <option value="renting">Renting</option>
              <option value="family">Living with family</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsNewModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Logging..." : "Log Application"}</button>
          </div>
        </form>
      </Modal>

      {/* Schedule Home Verification Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule Home Inspection Visit">
        <form onSubmit={handleScheduleVerification} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Application</label>
            <select value={scheduleForm.appId} onChange={(e) => setScheduleForm({ ...scheduleForm, appId: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              {adoptions.map((a: any) => (
                <option key={a.applicationId} value={a.applicationId}>{a.applicantName} ({a.petName})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Inspection Date</label>
            <input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsScheduleModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#10B981", color: "#FFF", fontWeight: 600 }}>Book Inspection Visit</button>
          </div>
        </form>
      </Modal>

      {/* Approve Adoption Modal */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Finalize & Approve Adoption">
        <form onSubmit={handleApproveAdoption} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Application to Approve</label>
            <select value={approveForm.appId} onChange={(e) => setApproveForm({ ...approveForm, appId: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              {adoptions.map((a: any) => (
                <option key={a.applicationId} value={a.applicationId}>{a.applicationId} - {a.applicantName} ({a.petName})</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsApproveModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#6366F1", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Approving..." : "Approve Adoption"}</button>
          </div>
        </form>
      </Modal>



      {/* Edit Application Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Update Application Decision">
        <form onSubmit={handleUpdateStatusSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Decision Status</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}>
              <option value="Approved">Approved</option>
              <option value="In Review">In Review</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Saving..." : "Save Status"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Application Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Application Record">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove application <strong>{selectedApp?.applicationId}</strong> for {selectedApp?.applicantName}?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDeleteApplication} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><FaTrash /> Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Adoptions;