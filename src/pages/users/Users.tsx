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
  FaCheckCircle,
  FaTimesCircle,
  FaKey,
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
import { normalizeRole, isInternalRole } from "../../utils/roleUtils";
import { formatDateTime } from "../../utils/dateUtils";
import { describePermission } from "../../utils/permissionsCatalog";

interface UserTableRow {
  id: string;
  name: string;
  full_name?: string | null;
  email: string;
  phone: string | null;
  roles: string[];
  role: string;
  isActive: boolean;
  is_active?: boolean;
  isVerified: boolean;
  is_verified?: boolean;
  mfaEnabled: boolean;
  mfa_enabled?: boolean;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  direct_permissions?: string[];
  status: "Active" | "Inactive";
  [key: string]: unknown;
}

const formatDate = (isoString?: string): string => formatDateTime(isoString);

const formatRole = (role: string): string => {
  if (!role) return "General Public";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatRoles = (roles: string[]): React.ReactNode => {
  if (!roles || roles.length === 0) return <span style={{ color: "#94A3B8" }}>General Public</span>;
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

  // User Profile Modal State
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserTableRow | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Reset State inside Profile Modal
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isResetTokenFormOpen, setIsResetTokenFormOpen] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Direct User Permission Overrides State
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string>("");
  const [permUserName, setPermUserName] = useState<string>("");
  const [permUserRole, setPermUserRole] = useState<string>("");
  const [userDirectPerms, setUserDirectPerms] = useState<string[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [customPermCode, setCustomPermCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Add / Edit User
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "rescue_agent",
    password: "",
  });

  /**
   * Fetch complete user profile from backend API to ensure exact field matching
   * without stale state or hardcoded fallbacks.
   */
  const handleOpenUserProfile = async (userRow: UserTableRow) => {
    // 1. Immediately reset profile state to null to avoid stale React state
    setSelectedUserProfile(null);
    setIsProfileModalOpen(true);
    setProfileLoading(true);

    try {
      // 2. Fetch fresh detailed user profile from backend API (single source of truth)
      const userRes = await userService.getUserById(userRow.id);
      const userPayload = ((userRes as any)?.data || userRes) as Record<string, unknown>;

      let perms: string[] = [];
      try {
        const permRes = await userService.getUserPermissions(userRow.id);
        perms = extractPermissionCodes(permRes);
      } catch {
        perms = Array.isArray(userPayload.direct_permissions) ? (userPayload.direct_permissions as string[]) : [];
      }

      const rolesArr = Array.isArray(userPayload.roles)
        ? (userPayload.roles as string[])
        : Array.isArray(userPayload.role_names)
        ? (userPayload.role_names as string[])
        : userPayload.role
        ? [String(userPayload.role)]
        : userRow.roles;

      const fullObj: UserTableRow = {
        id: String(userPayload.id || userRow.id),
        name: String(userPayload.full_name || userPayload.name || userRow.name || "Not provided"),
        full_name: (userPayload.full_name as string) || (userPayload.name as string) || userRow.full_name || null,
        email: String(userPayload.email || userRow.email || ""),
        phone: userPayload.phone !== undefined ? (userPayload.phone as string | null) : userRow.phone,
        roles: rolesArr,
        role: rolesArr.length > 0 ? rolesArr.join(", ") : String(userPayload.role || userRow.role || "general_public"),
        isActive: userPayload.is_active !== undefined ? Boolean(userPayload.is_active) : userRow.isActive,
        is_active: userPayload.is_active !== undefined ? Boolean(userPayload.is_active) : userRow.isActive,
        isVerified: userPayload.is_verified !== undefined ? Boolean(userPayload.is_verified) : userRow.isVerified,
        is_verified: userPayload.is_verified !== undefined ? Boolean(userPayload.is_verified) : userRow.isVerified,
        mfaEnabled: userPayload.mfa_enabled !== undefined ? Boolean(userPayload.mfa_enabled) : userRow.mfaEnabled,
        mfa_enabled: userPayload.mfa_enabled !== undefined ? Boolean(userPayload.mfa_enabled) : userRow.mfaEnabled,
        createdAt: (userPayload.created_at as string) || userRow.createdAt,
        created_at: (userPayload.created_at as string) || userRow.createdAt,
        updatedAt: (userPayload.updated_at as string) || userRow.updatedAt,
        updated_at: (userPayload.updated_at as string) || userRow.updatedAt,
        direct_permissions: perms,
        status: (userPayload.is_active ?? userRow.isActive) ? "Active" : "Inactive",
      };

      setSelectedUserProfile(fullObj);
    } catch {
      // Fallback to table row data, strictly handling null phone as null / "Not provided"
      setSelectedUserProfile({
        ...userRow,
        phone: userRow.phone ?? null,
        is_active: userRow.isActive,
        is_verified: userRow.isVerified,
        mfa_enabled: userRow.mfaEnabled,
        created_at: userRow.createdAt,
        updated_at: userRow.updatedAt,
        direct_permissions: [],
      });
    } finally {
      setProfileLoading(false);
    }
  };

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

  const openUserDirectPermissions = async (user: UserTableRow) => {
    setPermUserId(user.id);
    setPermUserName(user.full_name || user.name);
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
      const currentActive = user.is_active ?? user.isActive;
      const newStatus = !currentActive;
      await userService.updateUser(user.id, { is_active: newStatus });
      addToast(`Account status for ${user.full_name || user.name} set to ${newStatus ? "Active" : "Inactive"}.`, "success");
      setSelectedUserProfile((prev) => (prev ? { ...prev, isActive: newStatus, is_active: newStatus, status: newStatus ? "Active" : "Inactive" } : null));
      fetchUsers();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, "Failed to update account status."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch users function
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
          : Array.isArray(user.role_names)
          ? user.role_names
          : user.role
          ? [user.role]
          : [];
        return {
          id: user.id || "-",
          name: user.full_name || user.name || "-",
          full_name: user.full_name || user.name || null,
          email: user.email || "-",
          phone: user.phone !== undefined ? user.phone : null,
          roles,
          role: roles.length > 0 ? roles.join(", ") : user.role || "-",
          isActive: user.is_active !== undefined ? user.is_active : (user.status === "Active"),
          is_active: user.is_active !== undefined ? user.is_active : (user.status === "Active"),
          isVerified: user.is_verified !== undefined ? user.is_verified : false,
          is_verified: user.is_verified !== undefined ? user.is_verified : false,
          mfaEnabled: user.mfa_enabled !== undefined ? user.mfa_enabled : false,
          mfa_enabled: user.mfa_enabled !== undefined ? user.mfa_enabled : false,
          createdAt: user.created_at || "",
          created_at: user.created_at || "",
          updatedAt: user.updated_at || "",
          updated_at: user.updated_at || "",
          direct_permissions: user.direct_permissions || [],
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

  const matchesRoleFilter = useCallback(
    (userRoles: string[], filterValue: string): boolean => {
      if (filterValue === "all") return true;
      const option = ROLE_FILTER_OPTIONS.find((opt) => opt.value === filterValue);
      if (!option || option.backendRoles.length === 0) return true;
      return userRoles.some((role) => option.backendRoles.includes(normalizeRole(role) || role));
    },
    []
  );

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
        title: "Admin Staff Roles",
        value: loading ? "..." : `${users.filter((u) => hasAdminPortalAccess(u.roles)).length} Staff`,
        trend: "Authorized Internal Roles",
        color: "#10B981",
        icon: <FaUserShield />,
        onClick: () => {
          setActiveFilter("admin");
          setRoleFilter("all");
          setSearchTerm("");
          document.getElementById("users-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
        selected: activeFilter === "admin",
      },
      {
        title: "Active Accounts",
        value: loading ? "..." : `${users.filter((u) => u.isActive).length} Active`,
        trend: "Platform Ready",
        color: "#059669",
        icon: <FaCheckCircle />,
      },
      {
        title: "Inactive Accounts",
        value: loading ? "..." : `${users.filter((u) => !u.isActive).length} Inactive`,
        trend: "Access Suspended",
        color: "#EF4444",
        icon: <FaTimesCircle />,
      },
    ],
    [users, loading, activeFilter, roleFilter, searchTerm]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeFilter === "admin" && !hasAdminPortalAccess(u.roles)) {
        return false;
      }
      if (!matchesRoleFilter(u.roles, roleFilter)) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nameMatch = u.name.toLowerCase().includes(term);
        const emailMatch = u.email.toLowerCase().includes(term);
        const idMatch = u.id.toLowerCase().includes(term);
        const phoneMatch = Boolean(u.phone && String(u.phone).toLowerCase().includes(term));
        const roleMatch = u.roles.some((r) => r.toLowerCase().includes(term));
        return nameMatch || emailMatch || idMatch || phoneMatch || roleMatch;
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
      render: (val: string | null) => (val && val.trim() ? val : "Not provided"),
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
          User Management &amp; Personnel
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
              void handleOpenUserProfile(row as UserTableRow);
            }}
            onView={(row) => {
              void handleOpenUserProfile(row as UserTableRow);
            }}
            onEdit={(row) => {
              const target = row as UserTableRow;
              setSelectedUser(target);
              setFormData({
                name: target.full_name || target.name || "",
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
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUserProfile(null);
          setIsResetTokenFormOpen(false);
          setResetToken("");
          setNewPassword("");
        }}
        title={`User Profile — ${selectedUserProfile?.full_name || selectedUserProfile?.name || "Details"}`}
      >
        {profileLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#64748B" }}>
            Loading user profile from API...
          </div>
        ) : selectedUserProfile ? (
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
                {(selectedUserProfile.full_name || selectedUserProfile.name || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                  {selectedUserProfile.full_name || selectedUserProfile.name || "Not provided"}
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
                    {formatRole(selectedUserProfile.roles?.[0] || selectedUserProfile.role || "general_public")}
                  </span>
                  <span
                    style={{
                      background: (selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "#DCFCE7" : "#FEE2E2",
                      color: (selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "#166534" : "#991B1B",
                      padding: "2px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {(selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Details Grid */}
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Account Overview &amp; API Details
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
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                    {selectedUserProfile.full_name || selectedUserProfile.name || "Not provided"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Email Address</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#2563EB", marginTop: "2px" }}>
                    {selectedUserProfile.email || "Not provided"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Phone Number</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                    {selectedUserProfile.phone && String(selectedUserProfile.phone).trim() ? selectedUserProfile.phone : "Not provided"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Assigned Role</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>
                    {selectedUserProfile.roles && selectedUserProfile.roles.length > 0
                      ? selectedUserProfile.roles.map(formatRole).join(", ")
                      : formatRole(selectedUserProfile.role || "general_public")}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Account Status</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: (selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "#16A34A" : "#DC2626", marginTop: "2px" }}>
                    {(selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "Active" : "Inactive"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Verification</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: (selectedUserProfile.is_verified ?? selectedUserProfile.isVerified) ? "#16A34A" : "#64748B", marginTop: "2px" }}>
                    {(selectedUserProfile.is_verified ?? selectedUserProfile.isVerified) ? "Verified" : "Unverified"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>MFA</label>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: (selectedUserProfile.mfa_enabled ?? selectedUserProfile.mfaEnabled) ? "#16A34A" : "#64748B", marginTop: "2px" }}>
                    {(selectedUserProfile.mfa_enabled ?? selectedUserProfile.mfaEnabled) ? "Enabled" : "Disabled"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>User ID (UUID)</label>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#475569", marginTop: "2px", wordBreak: "break-all" }}>
                    {selectedUserProfile.id || "Not available"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Created Date</label>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#334155", marginTop: "2px" }}>
                    {(selectedUserProfile.created_at || selectedUserProfile.createdAt) ? formatDateTime(String(selectedUserProfile.created_at || selectedUserProfile.createdAt)) : "Not available"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Updated Date</label>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#334155", marginTop: "2px" }}>
                    {(selectedUserProfile.updated_at || selectedUserProfile.updatedAt) ? formatDateTime(String(selectedUserProfile.updated_at || selectedUserProfile.updatedAt)) : "Not available"}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Direct Permissions</label>
                  {selectedUserProfile.direct_permissions && selectedUserProfile.direct_permissions.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      {selectedUserProfile.direct_permissions.map((code) => (
                        <span key={code} style={{ background: "#F1F5F9", color: "#334155", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontFamily: "monospace" }}>
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "#94A3B8", fontStyle: "italic", marginTop: "2px" }}>
                      None (Role default permissions apply)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Operations Section */}
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "12px", padding: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                Account Operations &amp; Resource Access
              </h4>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
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
                      name: selectedUserProfile.full_name || selectedUserProfile.name || "",
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
                    background: (selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "#FEF2F2" : "#ECFDF5",
                    color: (selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "#991B1B" : "#047857",
                    border: `1px solid ${(selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "#FCA5A5" : "#A7F3D0"}`,
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaBan size={13} /> {(selectedUserProfile.is_active ?? selectedUserProfile.isActive) ? "Deactivate Account" : "Activate Account"}
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

                  if (/veterinarian/.test(roleStr)) {
                    roleBtns.push(navBtn("Open Vet Dashboard", "/veterinarian-dashboard", <FaStethoscope size={13} />, "#ECFDF5", "#047857", "#A7F3D0"));
                  } else if (/shelter/.test(roleStr)) {
                    roleBtns.push(navBtn("Open Shelter Manager Dashboard", "/shelter-manager-dashboard", <FaHome size={13} />, "#EFF6FF", "#1D4ED8", "#BFDBFE"));
                  } else if (/rescue_agent|rescue_coordinator|rescue_centre/.test(roleStr)) {
                    roleBtns.push(navBtn("View Rescue Dispatches", "/rescue-dispatch", <FaTruck size={13} />, "#F5F3FF", "#6D28D9", "#DDD6FE"));
                  } else if (/adoption/.test(roleStr)) {
                    roleBtns.push(navBtn("View Adoption Applications", "/adoptions", <FaHeart size={13} />, "#FDF2F8", "#BE185D", "#FBCFE8"));
                  } else if (/foster/.test(roleStr)) {
                    roleBtns.push(navBtn("View Foster Placements", "/fosters", <FaHandHoldingHeart size={13} />, "#FFF7ED", "#C2410C", "#FFEDD5"));
                  } else if (/volunteer/.test(roleStr)) {
                    roleBtns.push(navBtn("View Volunteer Roster", "/volunteers", <FaUserFriends size={13} />, "#FEFCE8", "#A16207", "#FEF08A"));
                  } else if (/inventory/.test(roleStr)) {
                    roleBtns.push(navBtn("View Inventory Suite", "/inventory", <FaBoxes size={13} />, "#F0FDF4", "#15803D", "#BBF7D0"));
                  } else if (/finance/.test(roleStr)) {
                    roleBtns.push(navBtn("View Finance Dashboard", "/finance-dashboard", <FaCoins size={13} />, "#F0FDF4", "#15803D", "#BBF7D0"));
                  }

                  return roleBtns;
                })()}
              </div>

              {/* Confirm Password Reset Form inline if token is generated */}
              {isResetTokenFormOpen && (
                <form onSubmit={handleConfirmPasswordReset} style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E2E8F0", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1E40AF" }}>
                    Enter Password Reset Confirmation Token
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Reset Token (from email / dev log) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Paste reset token string..."
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>New Password *</label>
                    <PasswordInput
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setIsResetTokenFormOpen(false)}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", background: "#FFFFFF", fontSize: "12px" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#10B981", color: "#FFFFFF", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                    >
                      {isSubmitting ? "Updating Password..." : "Finalize Password Update"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Provision New User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Provision User Account">
        <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="sarah.j@pawguard.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Assigned System Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px", background: "#FFFFFF" }}
            >
              <option value="super_admin">Super Admin (Full System Privileges)</option>
              <option value="rescue_centre_admin">Rescue Centre Admin</option>
              <option value="rescue_coordinator">Rescue Coordinator</option>
              <option value="rescue_agent">Rescue Agent</option>
              <option value="veterinarian">Veterinarian</option>
              <option value="shelter_manager">Shelter Manager</option>
              <option value="adoption_coordinator">Adoption Coordinator</option>
              <option value="foster_coordinator">Foster Coordinator</option>
              <option value="volunteer_coordinator">Volunteer Coordinator</option>
              <option value="inventory_manager">Inventory Manager</option>
              <option value="finance_user">Finance Officer</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Initial Password (Optional — Auto-generated if left empty)
            </label>
            <PasswordInput
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569", fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
            >
              {isSubmitting ? "Provisioning..." : "Provision Account"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Account Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User Account Details">
        <form onSubmit={handleUpdateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Assigned Role(s) (comma-separated)</label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
            />
            <span style={{ fontSize: "11px", color: "#64748B" }}>e.g. super_admin, veterinarian</span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569", fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Deprovision Account">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
            Are you sure you want to permanently delete the user account for <strong>{selectedUser?.name}</strong> (<code>{selectedUser?.email}</code>)? This action cannot be undone.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#FFFFFF", color: "#475569", fontWeight: 600 }}>
              Cancel
            </button>
            <button type="button" onClick={handleDeleteUser} disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#DC2626", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}>
              {isSubmitting ? "Deleting..." : "Permanently Delete Account"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Direct Permission Overrides Modal */}
      <Modal isOpen={isPermModalOpen} onClose={() => setIsPermModalOpen(false)} title={`Direct Permissions — ${permUserName}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>{permUserName}</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>Role: {formatRole(permUserRole)} &bull; User ID: <code>{permUserId}</code></div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#334155" }}>Active Direct Permissions ({userDirectPerms.length})</h4>
            {loadingPerms ? (
              <p style={{ color: "#64748B", fontSize: "13px" }}>Loading direct permissions...</p>
            ) : userDirectPerms.length === 0 ? (
              <p style={{ color: "#94A3B8", fontSize: "13px", fontStyle: "italic" }}>No direct permission overrides assigned. User inherits role default permissions.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                {userDirectPerms.map((code) => (
                  <li key={code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F1F5F9", padding: "8px 12px", borderRadius: "6px" }}>
                    <div>
                      <code style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B" }}>{code}</code>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>{describePermission(code)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeUserPerm(code)}
                      disabled={isSubmitting}
                      style={{ border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#991B1B", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "14px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Grant New Direct Permission Code</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="e.g. create_rescue, view_finance"
                value={customPermCode}
                onChange={(e) => setCustomPermCode(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "13px" }}
              />
              <button
                type="button"
                onClick={() => handleGrantUserPerm(customPermCode)}
                disabled={isSubmitting || !customPermCode.trim()}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "#6D28D9", color: "#FFF", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
              >
                Grant Permission
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;