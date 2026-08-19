import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import Can from "../../components/rbac/Can";
import {
  FaUserPlus,
  FaUsers,
  FaUserShield,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaKey,
  FaExternalLinkAlt,
  FaEdit,
  FaBan,
  FaHome,
  FaStethoscope,
  FaHeart,
  FaHandHoldingHeart,
  FaUserFriends,
  FaBoxes,
  FaCoins,
  FaTruck,
} from "react-icons/fa";
import userService, { type UserPayload, extractPermissionCodes } from "../../services/userService";
import authService from "../../services/auth/authService";
import PasswordInput from "../../components/auth/PasswordInput";
import { notifyDataChanged } from "../../utils/dataSync";
import { normalizeRole, isInternalRole, getRoleTitle } from "../../utils/roleUtils";
import { formatDateTime } from "../../utils/dateUtils";
import { describePermission } from "../../utils/permissionsCatalog";

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

const formatDate = (isoString?: string): string => formatDateTime(isoString);

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

/**
 * Checks if any of the user's assigned roles are authorized for Admin Portal access.
 * Reuses existing role normalization & internal staff logic from roleUtils.
 */
const hasAdminPortalAccess = (roles: string[]): boolean => {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => isInternalRole(role));
};

interface ApiErrorShape {
  response?: { status?: number; data?: { detail?: string; message?: string } };
  message?: string;
}

const getErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as ApiErrorShape;
  if (e?.response?.data?.detail) return String(e.response.data.detail);
  if (e?.response?.data?.message) return String(e.response.data.message);
  const status = e?.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) {
    return "You don't have permission to manage user accounts. Contact a Super Administrator to grant access.";
  }
  if (status === 404) return "User account endpoint not found. Please try again later.";
  if (status !== undefined && status >= 500) {
    return "The server encountered an error. Please try again later.";
  }
  if (!e?.response && e?.message) return `Network error: ${e.message}`;
  return fallback;
};

const generatePassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 14; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const parseRoleNames = (value: string): string[] =>
  value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // Filter state for summary cards: "all" or "admin" (Admin Portal Access)
  const [activeFilter, setActiveFilter] = useState<"all" | "admin">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(() => searchParams.get("action") === "add");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserTableRow | null>(null);

  // User Profile & Password Reset Modal State
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserTableRow | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isResetTokenFormOpen, setIsResetTokenFormOpen] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleRequestPasswordReset = async () => {
    if (!selectedUserProfile?.email) return;
    try {
      setIsResettingPassword(true);
      await authService.requestPasswordReset(selectedUserProfile.email);
      addToast(`Password reset initialized for ${selectedUserProfile.email}. Check reset token to finalize.`, "success");
      setIsResetTokenFormOpen(true);
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to request password reset."), "error");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      addToast("Please enter both reset token and new password.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await authService.confirmPasswordReset(resetToken.trim(), newPassword);
      addToast(`Login password updated successfully for ${selectedUserProfile?.email || "user"}!`, "success");
      setIsResetTokenFormOpen(false);
      setResetToken("");
      setNewPassword("");
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to confirm password reset."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct User Permission Overrides State in Profile Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string>("");
  const [permUserName, setPermUserName] = useState<string>("");
  const [permUserRole, setPermUserRole] = useState<string>("");
  const [userDirectPerms, setUserDirectPerms] = useState<string[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [customPermCode, setCustomPermCode] = useState("");

  const openUserDirectPermissions = async (user: UserTableRow) => {
    setPermUserId(user.id);
    setPermUserName(user.name);
    setPermUserRole(user.roles?.[0] || user.role || "");
    setIsPermModalOpen(true);
    setLoadingPerms(true);
    try {
      const res = await userService.getUserPermissions(user.id);
      const codes = extractPermissionCodes(res);
      setUserDirectPerms(codes);
    } catch {
      setUserDirectPerms([]);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleGrantUserPerm = async (code: string) => {
    if (!permUserId || !code.trim()) return;
    try {
      setIsSubmitting(true);
      await userService.grantUserPermission(permUserId, code.trim());
      addToast(`Granted direct permission "${code.trim()}" to ${permUserName}`, "success");
      const res = await userService.getUserPermissions(permUserId);
      setUserDirectPerms(extractPermissionCodes(res));
      setCustomPermCode("");
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to grant user permission."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeUserPerm = async (code: string) => {
    if (!permUserId || !code) return;
    try {
      setIsSubmitting(true);
      await userService.revokeUserPermission(permUserId, code);
      addToast(`Revoked direct permission "${code}" from ${permUserName}`, "success");
      const res = await userService.getUserPermissions(permUserId);
      setUserDirectPerms(extractPermissionCodes(res));
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to revoke user permission."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserActiveStatus = async (user: UserTableRow) => {
    try {
      setIsSubmitting(true);
      const newStatus = !user.isActive;
      await userService.updateUser(user.id, { is_active: newStatus });
      addToast(`Account status for ${user.name} set to ${newStatus ? "Active" : "Inactive"}.`, "success");
      setSelectedUserProfile((prev) => (prev ? { ...prev, isActive: newStatus, status: newStatus ? "Active" : "Inactive" } : null));
      fetchUsers();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to update account status."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "rescue_agent",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users function - defined before useEffect to avoid "accessed before declaration" error
  const fetchUsers = useCallback(async () => {
    try {
      setError(null);

      const response = await userService.getUsers();
      const rawBody = response as unknown;
      const rawData = (rawBody as { data?: unknown })?.data;
      const rawItems = (rawData as { items?: unknown })?.items;
      const userList = Array.isArray(rawBody)
        ? (rawBody as UserPayload[])
        : Array.isArray(rawData)
        ? (rawData as UserPayload[])
        : Array.isArray(rawItems)
        ? (rawItems as UserPayload[])
        : [];

      const formattedUsers = userList.map((user: UserPayload): UserTableRow => {
        const roles = Array.isArray(user.roles)
          ? user.roles
          : user.role
          ? [user.role]
          : [];
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

      const sortedFormattedUsers = formattedUsers.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      });

      setUsers(sortedFormattedUsers);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load registered users. Please check permissions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const password = formData.password || generatePassword();
      await userService.createUser({
        full_name: formData.name,
        email: formData.email,
        role: formData.role,
        password,
      });
      addToast(`User ${formData.name} provisioned successfully!`, "success");
      setIsAddModalOpen(false);
      setFormData({ name: "", email: "", role: "rescue_agent", password: "" });
      fetchUsers();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to provision user."), "error");
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
        role_names: parseRoleNames(formData.role),
      });
      addToast(`User ${formData.name} updated successfully!`, "success");
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to update user."), "error");
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
      addToast(getErrorMessage(err, "Failed to delete user."), "error");
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

  // Memoize summary cards
  const stats = useMemo(
    () => [
      {
        title: "Total Registered Users",
        value: loading ? "..." : `${users.length} Users`,
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
        title: "Admin Portal Access",
        value: loading
          ? "..."
          : `${users.filter((u: UserTableRow) => hasAdminPortalAccess(u.roles)).length} Users`,
        trend: roleFilter !== "all" ? "Filtered View" : "Permitted Access",
        color: "#6366F1",
        icon: <FaUserShield />,
        onClick: () => {
          setActiveFilter("admin");
          document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        selected: activeFilter === "admin",
      },
    ],
    [loading, users, activeFilter, roleFilter, searchTerm]
  );

  // Filter users based on active filter, role filter, and search term
  const filteredUsers = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      // Admin Portal Access filter
      if (activeFilter === "admin" && !hasAdminPortalAccess(user.roles)) return false;

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
      case "admin":
        return "Admin Portal Access Users";
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
              setFormData({ name: "", email: "", role: "rescue_agent", password: "" });
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
            onRowClick={(row) => {
              const target = row as UserTableRow;
              setSelectedUserProfile(target);
              setIsProfileModalOpen(true);
            }}
            onView={(row) => {
              const target = row as UserTableRow;
              setSelectedUserProfile(target);
              setIsProfileModalOpen(true);
            }}
            onEdit={(row) => {
              const target = row as UserTableRow;
              setSelectedUser(target);
              setFormData({
                name: target.name || "",
                email: target.email || "",
                role: Array.isArray(target.roles) ? target.roles.join(", ") : target.role || "",
                password: "",
              });
              setIsEditModalOpen(true);
            }}
            onDelete={(row) => {
              setSelectedUser(row as UserTableRow);
              setIsDeleteModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* User Profile & Credentials Modal */}
      <Modal
        isOpen={isProfileModalOpen && !!selectedUserProfile}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUserProfile(null);
          setIsResetTokenFormOpen(false);
          setResetToken("");
          setNewPassword("");
        }}
        title={`User Profile — ${selectedUserProfile?.name || "Details"}`}
      >
        {selectedUserProfile && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header Badge Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                padding: "16px",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {selectedUserProfile.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                  {selectedUserProfile.name}
                </h3>
                <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      background: "#EFF6FF",
                      color: "#1E40AF",
                      padding: "2px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {formatRole(selectedUserProfile.roles[0] || selectedUserProfile.role)}
                  </span>
                  <span
                    style={{
                      background: selectedUserProfile.isActive ? "#DCFCE7" : "#FEE2E2",
                      color: selectedUserProfile.isActive ? "#166534" : "#991B1B",
                      padding: "2px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {selectedUserProfile.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Details Grid */}
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Account Overview
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "14px",
                }}
              >
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Full Name</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedUserProfile.name}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Email Address</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#2563EB", marginTop: "2px" }}>{selectedUserProfile.email}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Phone Number</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedUserProfile.phone || "+919876517358"}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Assigned Role</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{formatRole(selectedUserProfile.roles[0] || selectedUserProfile.role)}</div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Account Status</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: selectedUserProfile.isActive ? "#16A34A" : "#DC2626", marginTop: "2px" }}>
                    {selectedUserProfile.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>User ID (UUID)</label>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#475569", marginTop: "2px", wordBreak: "break-all" }}>{selectedUserProfile.id}</div>
                </div>
              </div>
            </div>

            {/* Role-Aware & Permission-Aware Actions Section */}
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "12px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                Account Operations &amp; Role Resource Access
              </h4>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {/* Common Account Management Actions */}
                <button
                  type="button"
                  onClick={handleRequestPasswordReset}
                  disabled={isResettingPassword}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isResettingPassword ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaKey size={13} /> {isResettingPassword ? "Initializing Reset..." : "Set / Reset Login Password"}
                </button>

                <button
                  type="button"
                  onClick={() => openUserDirectPermissions(selectedUserProfile)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "#F5F3FF",
                    color: "#6D28D9",
                    border: "1px solid #DDD6FE",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaUserShield size={13} /> Direct Permission Overrides
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(selectedUserProfile);
                    setFormData({
                      name: selectedUserProfile.name || "",
                      email: selectedUserProfile.email || "",
                      role: Array.isArray(selectedUserProfile.roles) ? selectedUserProfile.roles.join(", ") : selectedUserProfile.role || "",
                      password: "",
                    });
                    setIsProfileModalOpen(false);
                    setIsEditModalOpen(true);
                  }}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "#EFF6FF",
                    color: "#1D4ED8",
                    border: "1px solid #BFDBFE",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaEdit size={13} /> Edit User Profile
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleUserActiveStatus(selectedUserProfile)}
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: selectedUserProfile.isActive ? "#FEF2F2" : "#ECFDF5",
                    color: selectedUserProfile.isActive ? "#991B1B" : "#047857",
                    border: `1px solid ${selectedUserProfile.isActive ? "#FCA5A5" : "#A7F3D0"}`,
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaBan size={13} /> {selectedUserProfile.isActive ? "Deactivate Account" : "Activate Account"}
                </button>

                {/* Dynamic Role-Specific Navigation Actions */}
                {(() => {
                  const roleStr = String(selectedUserProfile.roles?.[0] || selectedUserProfile.role || "").toLowerCase().trim();

                  const navBtn = (label: string, path: string, icon: React.ReactNode, bg = "#F1F5F9", fg = "#0F172A", border = "#CBD5E1") => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        navigate(path);
                      }}
                      style={{
                        padding: "9px 16px",
                        borderRadius: "8px",
                        background: bg,
                        color: fg,
                        border: `1px solid ${border}`,
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {icon} {label}
                    </button>
                  );

                  const roleBtns: React.ReactNode[] = [];

                  if (roleStr.includes("super_admin") || roleStr.includes("system:admin")) {
                    roleBtns.push(navBtn("Manage Roles & Permissions Matrix", "/roles-permissions", <FaUserShield size={13} />, "#EEF2FF", "#3730A3", "#C7D2FE"));
                  }
                  if (roleStr.includes("rescue_centre_admin") || roleStr.includes("rescue_manager")) {
                    roleBtns.push(navBtn("View Rescue Operations", "/rescues", <FaExternalLinkAlt size={12} />, "#FFF7ED", "#C2410C", "#FFEDD5"));
                    roleBtns.push(navBtn("View Rescue Vehicles", "/vehicles", <FaTruck size={12} />, "#F0FDF4", "#15803D", "#BBF7D0"));
                  }
                  if (roleStr.includes("rescue_admin") || roleStr.includes("rescue_coordinator") || roleStr.includes("rescue_agent")) {
                    roleBtns.push(navBtn("View Rescue Requests", "/rescues", <FaExternalLinkAlt size={12} />, "#FFF7ED", "#C2410C", "#FFEDD5"));
                  }
                  if (roleStr.includes("veterinarian") || roleStr.includes("vet")) {
                    roleBtns.push(navBtn("View Medical Cases & EMR", "/medical", <FaStethoscope size={13} />, "#ECFDF5", "#047857", "#A7F3D0"));
                    roleBtns.push(navBtn("View Vaccination Schedules", "/medical?tab=vaccinations", <FaExternalLinkAlt size={12} />, "#EFF6FF", "#1D4ED8", "#BFDBFE"));
                  }
                  if (roleStr.includes("shelter_manager") || roleStr.includes("shelter_staff")) {
                    roleBtns.push(navBtn("View Shelter Facilities", "/shelters", <FaHome size={13} />, "#F5F3FF", "#6D28D9", "#DDD6FE"));
                    roleBtns.push(navBtn("View Shelter Dogs & Kennels", "/pets", <FaExternalLinkAlt size={12} />, "#ECFDF5", "#047857", "#A7F3D0"));
                  }
                  if (roleStr.includes("adoption_coordinator")) {
                    roleBtns.push(navBtn("View Adoption Applications", "/adoptions", <FaHeart size={13} />, "#FDF2F8", "#BE185D", "#FBCFE8"));
                  }
                  if (roleStr.includes("foster_coordinator")) {
                    roleBtns.push(navBtn("View Foster Caregivers", "/fosters", <FaHandHoldingHeart size={13} />, "#F5F3FF", "#6D28D9", "#DDD6FE"));
                    roleBtns.push(navBtn("View Foster Placements", "/fosters?tab=placements", <FaExternalLinkAlt size={12} />, "#ECFDF5", "#047857", "#A7F3D0"));
                  }
                  if (roleStr.includes("foster_family")) {
                    roleBtns.push(navBtn("View Active Foster Placements", "/fosters", <FaHandHoldingHeart size={13} />, "#F5F3FF", "#6D28D9", "#DDD6FE"));
                  }
                  if (roleStr.includes("volunteer_coordinator")) {
                    roleBtns.push(navBtn("View Volunteer Roster", "/volunteers", <FaUserFriends size={13} />, "#FFFBEB", "#B45309", "#FDE68A"));
                    roleBtns.push(navBtn("View Volunteer Shifts", "/volunteers?tab=shifts", <FaExternalLinkAlt size={12} />, "#EFF6FF", "#1D4ED8", "#BFDBFE"));
                  }
                  if (roleStr.includes("volunteer") && !roleStr.includes("volunteer_coordinator")) {
                    roleBtns.push(navBtn("View Volunteer Profile & Shifts", "/volunteers", <FaUserFriends size={13} />, "#FFFBEB", "#B45309", "#FDE68A"));
                  }
                  if (roleStr.includes("inventory_manager")) {
                    roleBtns.push(navBtn("View Inventory Stock", "/inventory", <FaBoxes size={13} />, "#ECFDF5", "#047857", "#A7F3D0"));
                    roleBtns.push(navBtn("View Requisitions", "/inventory?tab=requisitions", <FaExternalLinkAlt size={12} />, "#EFF6FF", "#1D4ED8", "#BFDBFE"));
                    roleBtns.push(navBtn("View Suppliers", "/inventory?tab=suppliers", <FaExternalLinkAlt size={12} />, "#F5F3FF", "#6D28D9", "#DDD6FE"));
                  }
                  if (roleStr.includes("finance_user")) {
                    roleBtns.push(navBtn("View Financial Ledger", "/finance", <FaCoins size={13} />, "#ECFDF5", "#047857", "#A7F3D0"));
                    roleBtns.push(navBtn("View Donation Transactions", "/finance?tab=donations", <FaExternalLinkAlt size={12} />, "#EFF6FF", "#1D4ED8", "#BFDBFE"));
                  }
                  if (roleStr.includes("donor")) {
                    roleBtns.push(navBtn("View Donor Contributions", "/finance?tab=donors", <FaCoins size={13} />, "#ECFDF5", "#047857", "#A7F3D0"));
                  }

                  return roleBtns;
                })()}
              </div>
            </div>

            {/* Optional Reset Token Confirmation Form */}
            {isResetTokenFormOpen && (
              <div style={{ background: "#EFF6FF", border: "1px solid #93C5FD", borderRadius: "10px", padding: "14px" }}>
                <h5 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 700, color: "#1E40AF" }}>
                  Confirm Password Reset with Token
                </h5>
                <p style={{ fontSize: "12px", color: "#3B82F6", margin: "0 0 10px" }}>
                  Enter the reset token generated by backend OpenAPI (or email) and specify the new test password for this user.
                </p>
                <form onSubmit={handleConfirmPasswordReset} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#1E3A8A" }}>Reset Token:</label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token..."
                      required
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #BFDBFE", fontSize: "13px", marginTop: "2px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#1E3A8A" }}>New Password:</label>
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new test password (min 10 chars)..."
                      required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{ padding: "8px 14px", borderRadius: "6px", background: "#1D4ED8", color: "#FFFFFF", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {isSubmitting ? "Updating..." : "Update Password"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsResetTokenFormOpen(false)}
                      style={{ padding: "8px 14px", borderRadius: "6px", background: "#FFFFFF", color: "#475569", border: "1px solid #CBD5E1", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Direct User Permission Overrides Modal in User Management */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={`Direct Permission Overrides — ${permUserName || "User"}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, color: "#64748B", fontSize: "13px" }}>
            Grant or revoke specific permission overrides directly for <strong>{permUserName}</strong>, overriding default role policy (`{getRoleTitle(permUserRole)}`).
          </p>

          <div style={{ background: "#F8FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Permission code (e.g. inventory:create, foster:update)"
              value={customPermCode}
              onChange={(e) => setCustomPermCode(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12.5px" }}
            />
            <button
              type="button"
              onClick={() => handleGrantUserPerm(customPermCode)}
              disabled={isSubmitting || !customPermCode.trim()}
              style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "#2563EB", color: "#FFF", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              Grant
            </button>
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px", color: "#0F172A", fontSize: "13.5px", fontWeight: 700 }}>
              Active Direct Overrides ({userDirectPerms.length})
            </h4>

            {loadingPerms ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#2563EB" }}>Loading permissions...</div>
            ) : userDirectPerms.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "12.5px" }}>
                No direct user permission overrides granted. User operates strictly under assigned role defaults.
              </div>
            ) : (
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {userDirectPerms.map((code) => (
                  <div key={code} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #E2E8F0", background: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontFamily: "monospace", fontSize: "12px" }}>{code}</div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>{describePermission(code)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeUserPerm(code)}
                      disabled={isSubmitting}
                      style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setIsPermModalOpen(false)}
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9", color: "#334155", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

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
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Email Address</label>
            <input
              type="email"
              disabled
              value={formData.email}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box", background: "#F1F5F9", color: "#64748B" }}
            />
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>Email address cannot be changed after creation.</span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role(s)</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g. veterinarian, rescue_agent"
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", boxSizing: "border-box" }}
            />
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>Separate multiple roles with a comma.</span>
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