import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import {
  FaPaw,
  FaAmbulance,
  FaHeart,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import petService from "../../services/petService";
import { notifyDataChanged } from "../../utils/dataSync";

const Pets = () => {
  const [dogs, setDogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAdoptableModalOpen, setIsAdoptableModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDog, setSelectedDog] = useState<any | null>(null);

  // Form states
  const [petForm, setPetForm] = useState({
    name: "",
    breed: "Indie Rescue Mix",
    age: "2 Years",
    gender: "Male",
    status: "Adoptable",
  });
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    dogId: "",
    status: "In Treatment",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDogs();
  }, []);

  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await petService.getPets();
      const dogList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formattedDogs = dogList.map((dog: any) => ({
        ...dog,
        registration_number: dog.registration_number || dog.id || dog.petId || "-",
        name: dog.name || "-",
        breed: dog.breed || "-",
        estimated_age: dog.estimated_age || dog.age || "-",
        status: dog.status || "Adoptable",
      }));

      setDogs(formattedDogs);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load dogs list. Access may be restricted."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petForm.name) {
      addToast("Pet Name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await petService.createPet({
        name: petForm.name,
        breed: petForm.breed,
        age: petForm.age,
        gender: petForm.gender,
        status: petForm.status,
      });
      addToast(`Rescued pet "${petForm.name}" registered successfully!`, "success");
      setIsRegisterModalOpen(false);
      setPetForm({ name: "", breed: "Indie Rescue Mix", age: "2 Years", gender: "Male", status: "Adoptable" });
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to register pet.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = statusUpdateForm.dogId;
    if (!id) {
      addToast("Please select a dog to update.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await petService.updatePetStatus(id, statusUpdateForm.status);
      addToast(`Status updated for pet ${id} to ${statusUpdateForm.status}`, "success");
      setIsStatusModalOpen(false);
      setStatusUpdateForm({ dogId: "", status: "In Treatment" });
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update status.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAdoptable = async (dog: any) => {
    try {
      await petService.updatePetStatus(dog.id || dog.registration_number, "Adoptable");
      addToast(`${dog.name} is now marked Ready for Adoption!`, "success");
      setIsAdoptableModalOpen(false);
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update status.";
      addToast(msg, "error");
    }
  };

  const handleEditDogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog) return;
    try {
      setIsSubmitting(true);
      await petService.updatePet(selectedDog.id || selectedDog.registration_number, {
        name: petForm.name,
        breed: petForm.breed,
        age: petForm.age,
        status: petForm.status,
      });
      addToast(`Updated record for ${petForm.name}!`, "success");
      setIsEditModalOpen(false);
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update record.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDog = async () => {
    if (!selectedDog) return;
    try {
      setIsSubmitting(true);
      await petService.deletePet(selectedDog.id || selectedDog.registration_number);
      addToast(`Deleted pet ${selectedDog.name}`, "success");
      setIsDeleteModalOpen(false);
      setSelectedDog(null);
      fetchDogs();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete pet.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    {
      title: "Total Registered Dogs",
      value: loading ? "..." : dogs.length,
      trend: "Registered Dogs",
      color: "#2563EB",
      icon: <FaPaw />,
    },
    {
      title: "Dogs in Shelter",
      value: loading
        ? "..."
        : dogs.filter((dog) => String(dog.status).toLowerCase().includes("shelter") || String(dog.status).toLowerCase().includes("treatment")).length,
      trend: "Currently Sheltered",
      color: "#EF4444",
      icon: <FaAmbulance />,
    },
    {
      title: "Adoptable Dogs",
      value: loading
        ? "..."
        : dogs.filter((dog) => dog.is_adoptable || String(dog.status).toLowerCase().includes("adopt")).length,
      trend: "Ready for Adoption",
      color: "#10B981",
      icon: <FaHeart />,
    },
  ];

  const columns = [
    { key: "registration_number", title: "Dog ID" },
    { key: "name", title: "Dog Name" },
    { key: "breed", title: "Breed" },
    { key: "estimated_age", title: "Age" },
    { key: "status", title: "Status" },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: "24px",
          background: "linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",
          padding: "24px",
          borderRadius: "16px",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>
          Animal & Rescue Case Directory
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Comprehensive dog tracking, intake records, shelter management and adoption monitoring.
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <QuickActionCard
          icon={<FaPlus />}
          title="Register New Dog"
          subtitle="Register rescued dog"
          color="#2563EB"
          onClick={() => {
            setPetForm({ name: "", breed: "Indie Rescue Mix", age: "2 Years", gender: "Male", status: "Adoptable" });
            setIsRegisterModalOpen(true);
          }}
        />

        <QuickActionCard
          icon={<FaAmbulance />}
          title="Update Status"
          subtitle="Update dog status"
          color="#EF4444"
          onClick={() => setIsStatusModalOpen(true)}
        />

        <QuickActionCard
          icon={<FaHeart />}
          title="Ready For Adoption"
          subtitle="Mark adoptable"
          color="#10B981"
          onClick={() => setIsAdoptableModalOpen(true)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Registered Dogs
          </h3>
          {loading && (
            <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>
              Loading dogs...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={dogs}
          onEdit={async (row) => {
            await petService.updatePet(row.dog_id || row.id || "1", row);
            fetchDogs();
          }}
          onDelete={async (row) => {
            await petService.deletePet(row.dog_id || row.id || "1");
            fetchDogs();
          }}
        />
      </div>

      {/* Register New Dog Modal */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        title="Register Rescued Pet"
      >
        <form onSubmit={handleRegisterPet} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Dog Name / Code Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Max or DOG-501"
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Breed</label>
              <input
                type="text"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Estimated Age</label>
              <input
                type="text"
                value={petForm.age}
                onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Initial Health / Rescue Status</label>
            <select
              value={petForm.status}
              onChange={(e) => setPetForm({ ...petForm, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="Adoptable">Adoptable</option>
              <option value="In Treatment">In Treatment</option>
              <option value="Critical Care">Critical Care</option>
              <option value="Fostered">Fostered</option>
              <option value="Quarantine">Quarantine</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Registering..." : "Register Dog"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Rescue Animal Status"
      >
        <form onSubmit={handleUpdateStatus} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Select Dog</label>
            <select
              value={statusUpdateForm.dogId}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, dogId: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="">Choose a dog...</option>
              {dogs.map((d) => (
                <option key={d.registration_number} value={d.registration_number}>
                  {d.name} ({d.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>New Operational Status</label>
            <select
              value={statusUpdateForm.status}
              onChange={(e) => setStatusUpdateForm({ ...statusUpdateForm, status: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            >
              <option value="Adoptable">Adoptable</option>
              <option value="In Treatment">In Treatment</option>
              <option value="Critical Care">Critical Care</option>
              <option value="Fostered">Fostered</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark Adoptable Modal */}
      <Modal
        isOpen={isAdoptableModalOpen}
        onClose={() => setIsAdoptableModalOpen(false)}
        title="Mark Animal Ready for Adoption"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Select an animal to clear for adoption listing:
          </p>
          <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {dogs.map((d) => (
              <div
                key={d.registration_number}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#F8FAFC",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{d.name}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>ID: {d.registration_number} | {d.breed}</div>
                </div>
                <button
                  onClick={() => handleMarkAdoptable(d)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#10B981",
                    color: "#FFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear for Adoption
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>



      {/* Edit Dog Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Animal Record"
      >
        <form onSubmit={handleEditDogSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Name</label>
            <input
              type="text"
              required
              value={petForm.name}
              onChange={(e) => setPetForm({ ...petForm, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Breed</label>
              <input
                type="text"
                value={petForm.breed}
                onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Age</label>
              <input
                type="text"
                value={petForm.age}
                onChange={(e) => setPetForm({ ...petForm, age: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dog Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Animal Record Deletion"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to remove record for <strong>{selectedDog?.name}</strong> ({selectedDog?.registration_number})?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteDog}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaTrash /> {isSubmitting ? "Deleting..." : "Delete Record"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Pets;