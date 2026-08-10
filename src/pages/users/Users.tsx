import { useState, useEffect, useCallback, useMemo } from "react";
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
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import userService, { type UserPayload } from "../../services/userService";
import PasswordInput from "../../components/auth/PasswordInput";
import { notifyDataChanged } from "../../utils/dataSync";
import { normalizeRole } from "../../utils/roleUtils";

interface UserTableRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
  role: string; // formatted for display fallback
  isActive: boolean;
  isVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  status: "Active" | "Inactive";
  [key: string]: unknown;
}

const formatDate = (isoString?: string): string => {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }) + " " + date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
};

const formatRole = (role: string): string => {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatRoles = (roles: string[]): React.ReactNode => {
  if (!roles || roles.length === 0) return <span style={{ color: "#94A3B8" }}>No Role</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {roles.map((role) => (
        <span
          key={role}
          style={{
            background: "#EFF6FF",
            color: "#1E40AF",
            padding: "2px 8px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {formatRole(role)}
        </span>
      ))}
    </div>
  );
};

// Role filter configuration - matches backend role values with display labels
const ROLE_FILTER_OPTIONS: Array<{ value: string; label: string; backendRoles: string[] }> = [
  { value: "all", label: "All Users", backendRoles: [] },
  { value: "super_admin", label: "Super Admin", backendRoles: ["super_admin"] },
  { value: "rescue_centre_admin", label: "Rescue Centre", backendRoles: ["rescue_centre_admin"] },
  { value: "rescue_coordinator", label: "Rescue Coordinator", backendRoles: ["rescue_coordinator"] },
  { value: "rescue_agent", label: "Rescue Agent", backendRoles: ["rescue_agent"] },
  { value: "veterinarian", label: "Veterinarian", backendRoles: ["veterinarian"] },
  { value: "shelter_manager", label: "Shelter", backendRoles: ["shelter_manager"] },
  { value: "adoption_coordinator", label: "Adoption", backendRoles: ["adoption_coordinator"] },
  { value: "foster_coordinator", label: "Foster Care", backendRoles: ["foster_coordinator"] },
  { value: "volunteer_coordinator", label: "Volunteer", backendRoles: ["volunteer_coordinator"] },
  { value: "inventory_manager", label: "Inventory", backendRoles: ["inventory_manager"] },
  { value: "finance_user", label: "Finance", backendRoles: ["finance_user"] },
];

const isAdminRole = (roles: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => {
    const normalized = normalizeRole(role);
    return normalized === "super_admin" || normalized === "rescue_centre_admin";
  });
};

const Users = () => {
  const [users, setUsers] = useState<UserTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Filter state for summary cards
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "admin">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserTableRow | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "rescue_agent",
    department: "Rescue Operations",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users function - defined before useEffect to avoid "accessed before declaration" error
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await userService.getUsers();
      const userList = Array.isArray(response)
        ? (response as UserPayload[])
        : Array.isArray(response?.data)
        ? (response.data as UserPayload[])
        : [];

      const formattedUsers = userList.map((user: UserPayload): UserTableRow => {
        const roles = Array.isArray(user.roles) ? user.roles : [];
        return {
          id: user.id || "-",
          name: user.full_name || user.name || "-",
          email: user.email || "-",
          phone: user.phone ?? null,
          roles,
          role: roles.length > 0 ? roles.join(", ") : user.role || "-",
          isActive: user.is_active !== undefined ? user.is_active : (user.status === "Active"),
          isVerified: user.is_verified !== undefined ? user.is_verified : false,
          mfaEnabled: user.mfa_enabled !== undefined ? user.mfa_enabled : false,
          createdAt: user.created_at || "",
          updatedAt: user.updated_at || "",
          status: user.is_active !== undefined ? (user.is_active ? "Active" : "Inactive") : (user.status === "Active" ? "Active" : "Inactive"),
        };
      });

      setUsers(formattedUsers);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        axiosError?.response?.data?.detail ||
        axiosError?.response?.data?.message ||
        "Failed to load registered users. Please check permissions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

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
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = axiosError?.response?.data?.detail || axiosError?.response?.data?.message || "Failed to provision user.";
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
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = axiosError?.response?.data?.detail || axiosError?.response?.data?.message || "Failed to update user.";
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
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string; message?: string } } };
      const msg = axiosError?.response?.data?.detail || axiosError?.response?.data?.message || "Failed to delete user.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user matches the selected role filter
  const matchesRoleFilter = useCallback(
    (userRoles: string[], filterValue: string): boolean => {
      if (filterValue === "all") return true;
      const option = ROLE_FILTER_OPTIONS.find((opt) => opt.value === filterValue);
      if (!option || option.backendRoles.length === 0) return true;
      return userRoles.some((role) => option.backendRoles.includes(normalizeRole(role) || role));
    },
    []
  );

  // Memoize filtered users for stats
  const filteredUsersForStats = useMemo(() => {
    return users.filter((user: UserTableRow) => {
      if (activeFilter === "active" && !user.isActive) return false;
      if (activeFilter === "admin" && !isAdminRole(user.roles)) return false;
      if (!matchesRoleFilter(user.roles, roleFilter)) return false;
      const lowerSearch = searchTerm.trim().toLowerCase();
      if (lowerSearch) {
        const searchableFields = [
          user.name,
          user.email,
          user.phone,
          user.id,
          ...user.roles,
        ].filter(Boolean);
        if (!searchableFields.some((field) => String(field).toLowerCase().includes(lowerSearch))) {
          return false;
        }
      }
      return true;
    });
  }, [users, activeFilter, roleFilter, searchTerm, matchesRoleFilter]);

  // Memoize stats to avoid ref access during render lint error
  // The stats array contains onClick handlers that scroll to the table using document.getElementById
  // By memoizing, we ensure the array is only recreated when dependencies change
  const stats = useMemo(
    () => [
      {
        title: "Total Registered Users",
        value: loading ? "..." : `${filteredUsersForStats.length} Users`,
        trend: roleFilter !== "all" ? "Filtered View" : "Organization Accounts",
        color: "#2563EB",
        icon: <FaUsers />,
        onClick: () => {
          setActiveFilter("all");
          setRoleFilter("all");
          setSearchTerm("");
          document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        selected: activeFilter === "all" && roleFilter === "all" && !searchTerm,
      },
      {
        title: "Active Personnel",
        value: loading
          ? "..."
          : `${filteredUsersForStats.filter((u: UserTableRow) => u.status === "Active").length} Active`,
        trend: roleFilter !== "all" ? "Filtered View" : "Current Workforce",
        color: "#10B981",
        icon: <FaUserCheck />,
        onClick: () => {
          setActiveFilter("active");
          document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        selected: activeFilter === "active",
      },
      {
        title: "Administrators",
        value: loading
          ? "..."
          : `${filteredUsersForStats.filter((u: UserTableRow) => isAdminRole(u.roles)).length} Admins`,
        trend: roleFilter !== "all" ? "Filtered View" : "System Access",
        color: "#EF4444",
        icon: <FaUserShield />,
        onClick: () => {
          setActiveFilter("admin");
          document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        selected: activeFilter === "admin",
      },
    ],
    [loading, filteredUsersForStats, activeFilter, roleFilter, searchTerm]
  );

  // Filter users based on active filter, role filter, and search term
  const filteredUsers = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      // Active/Admin filter
      if (activeFilter === "active" && !user.isActive) return false;
      if (activeFilter === "admin" && !isAdminRole(user.roles)) return false;

      // Role filter
      if (!matchesRoleFilter(user.roles, roleFilter)) return false;

      // Search filter
      if (lowerSearch) {
        const searchableFields = [
          user.name,
          user.email,
          user.phone,
          user.id,
          ...user.roles,
        ].filter(Boolean);
        if (!searchableFields.some((field) => String(field).toLowerCase().includes(lowerSearch))) {
          return false;
        }
      }

      return true;
    });
  }, [users, activeFilter, roleFilter, searchTerm, matchesRoleFilter]);

  const getTableTitle = () => {
    if (roleFilter !== "all") {
      const option = ROLE_FILTER_OPTIONS.find((opt) => opt.value === roleFilter);
      if (option) return `${option.label} Users`;
    }
    switch (activeFilter) {
      case "active":
        return "Active Personnel";
      case "admin":
        return "Administrators";
      default:
        return "All Registered Users";
    }
  };

  const columns = [
    { key: "id", title: "User ID" },
    { key: "name", title: "Full Name" },
    { key: "email", title: "Email Address" },
    {
      key: "phone",
      title: "Phone",
      render: (val: string | null) => val ?? "—",
    },
    {
      key: "roles",
      title: "Assigned Role",
      render: (_val: string, row: UserTableRow) => formatRoles(row.roles),
    },
    {
      key: "isActive",
      title: "Status",
      render: (val: boolean) => (
        <span
          style={{
            background: val ? "#EFF6FF" : "#FEF2F2",
            color: val ? "#1E40AF" : "#991B1B",
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 700,
            display: "inline-block",
            textTransform: "capitalize",
          }}
        >
          {val ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "isVerified",
      title: "Verified",
      render: (val: boolean) => (
        val ? (
          <FaCheckCircle style={{ color: "#10B981", fontSize: "16px" }} />
        ) : (
          <FaTimesCircle style={{ color: "#EF4444", fontSize: "16px" }} />
        )
      ),
    },
    {
      key: "mfaEnabled",
      title: "MFA",
      render: (val: boolean) => (
        val ? (
          <FaCheckCircle style={{ color: "#10B981", fontSize: "16px" }} />
        ) : (
          <FaTimesCircle style={{ color: "#EF4444", fontSize: "16px" }} />
        )
      ),
    },
    {
      key: "createdAt",
      title: "Created At",
      render: (val: string) => formatDate(val),
    },
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            {getTableTitle()}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>Filter by Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setSearchTerm("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 500,
                color: "#0F172A",
                cursor: "pointer",
                minWidth: "200px",
              }}
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {loading && (
              <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>
                Loading users...
              </span>
            )}
          </div>
        </div>

        <div id="users-table">
          <DataTable
            columns={columns}
            data={filteredUsers}
            module="users"
            serverMode={true}
            totalCount={filteredUsers.length}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
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