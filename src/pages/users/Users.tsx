import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaUserPlus,
  FaUsers,
  FaUserCheck,
  FaUserShield,
  FaTrash,
} from "react-icons/fa";
import userService from "../../services/userService";
import PasswordInput from "../../components/auth/PasswordInput";
import { notifyDataChanged } from "../../utils/dataSync";

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "rescue_agent",
    department: "Rescue Operations",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUsers();
      const userList = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      const formattedUsers = userList.map((user: any) => ({
        id: user.id || user.user_id || "-",
        name: user.full_name || user.name || user.username || "-",
        email: user.email || "-",
        role: Array.isArray(user.roles) ? user.roles.join(", ") : user.role || "-",
        department: user.department || user.facility || "-",
        status: user.is_active !== undefined ? (user.is_active ? "Active" : "Inactive") : (user.status || "Active"),
      }));

      setUsers(formattedUsers);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load registered users. Please check permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) {
      addToast("Please fill in required fields (Name & Email)", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.createUser({
        full_name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        password: formData.password || "Password123!",
      });
      addToast(`User ${formData.name} provisioned successfully!`, "success");
      setIsAddModalOpen(false);
      setFormData({ name: "", email: "", role: "rescue_agent", department: "Rescue Operations", password: "" });
      fetchUsers();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to provision user.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await userService.updateUser(selectedUser.id, {
        full_name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
      });
      addToast(`User ${formData.name} updated successfully!`, "success");
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update user.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      await userService.deleteUser(selectedUser.id);
      addToast(`User ${selectedUser.name} deleted successfully!`, "success");
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete user.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = [
    {
      title: "Total Registered Users",
      value: loading ? "..." : `${users.length} Users`,
      trend: "Organization Accounts",
      color: "#2563EB",
      icon: <FaUsers />,
    },
    {
      title: "Active Personnel",
      value: loading
        ? "..."
        : `${users.filter((u) => u.status === "Active").length} Active`,
      trend: "Current Workforce",
      color: "#10B981",
      icon: <FaUserCheck />,
    },
    {
      title: "Administrators",
      value: loading
        ? "..."
        : `${users.filter((u) => String(u.role).toLowerCase().includes("admin")).length} Admins`,
      trend: "System Access",
      color: "#EF4444",
      icon: <FaUserShield />,
    },
  ];

  const columns = [
    { key: "id", title: "User ID" },
    { key: "name", title: "Full Name" },
    { key: "email", title: "Email Address" },
    { key: "role", title: "Assigned Role" },
    { key: "department", title: "Department / Facility" },
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
          User Management & Personnel
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Manage user accounts, assign role permissions, onboard rescue staff, veterinarians, coordinators and volunteers.
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
        <Can permission="create_users">
          <QuickActionCard
            icon={<FaUserPlus />}
            title="Provision User Account"
            subtitle="Onboard new staff member"
            color="#2563EB"
            onClick={() => {
              setFormData({ name: "", email: "", role: "rescue_agent", department: "Rescue Operations", password: "" });
              setIsAddModalOpen(true);
            }}
          />
        </Can>

        <Can permission="manage_permissions">
          <QuickActionCard
            icon={<FaUserShield />}
            title="Manage Role Access"
            subtitle="Update user permissions"
            color="#6366F1"
            onClick={() => {
              addToast("Opening role permission management matrix", "info");
              window.location.href = "/roles-permissions";
            }}
          />
        </Can>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            Registered Organization Accounts
          </h3>
          {loading && (
            <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>
              Loading users...
            </span>
          )}
        </div>

        <DataTable
          columns={columns}
          data={users}
          module="users"
          onEdit={async (row) => {
            await userService.updateUser(row.id || "1", row);
            fetchUsers();
          }}
          onDelete={async (row) => {
            await userService.deleteUser(row.id || "1");
            fetchUsers();
          }}
        />
      </div>

      {/* Provision User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New User Account"
      >
        <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Sarah Connor"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Email Address *</label>
            <input
              type="email"
              required
              placeholder="sarah@pawguard.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Initial Password</label>
            <PasswordInput
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank for auto-generated password"
              autoComplete="new-password"
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              >
                <option value="super_admin">Super Admin</option>
                <option value="rescue_centre_admin">Rescue Centre Admin</option>
                <option value="rescue_coordinator">Rescue Coordinator</option>
                <option value="rescue_agent">Rescue Agent</option>
                <option value="veterinarian">Veterinarian</option>
                <option value="shelter_manager">Shelter Manager</option>
                <option value="adoption_coordinator">Adoption Coordinator</option>
                <option value="foster_coordinator">Foster Coordinator</option>
                <option value="volunteer_coordinator">Volunteer Coordinator</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="finance_user">Finance User</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Department</label>
              <input
                type="text"
                placeholder="e.g. Medical Care"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600, cursor: "pointer" }}
            >
              {isSubmitting ? "Provisioning..." : "Provision User"}
            </button>
          </div>
        </form>
      </Modal>



      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Account"
      >
        <form onSubmit={handleUpdateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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

      {/* Delete User Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm User Deletion"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to permanently delete the account for <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
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
              onClick={handleDeleteUser}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FaTrash /> {isSubmitting ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;