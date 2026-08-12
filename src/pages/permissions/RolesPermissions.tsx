import { useState, useEffect, useMemo, useCallback } from "react";
import type React from "react";
import Modal from "../../components/common/Modal";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import PermissionMatrixEditor from "../../components/rbac/PermissionMatrixEditor";
import { useToast } from "../../context/ToastContext";
import {
  FaPlusCircle,
  FaUserShield,
  FaUsers,
  FaUserPlus,
  FaLock,
  FaTrash,
  FaKey,
  FaBan,
  FaCheckCircle,
  FaSearch,
} from "react-icons/fa";
import userService from "../../services/userService";
import { normalizeRole, ALLOWED_INTERNAL_ROLES, getRoleTitle } from "../../utils/roleUtils";
import {
  setRolePermissionOverrides,
  setRolePermissionOverride,
  notifyPermissionsChanged,
} from "../../utils/rbac";
import {
  buildRolePermissionOverrides,
  normalizePermissionList,
  describePermission,
  matrixPermissionKeys,
  buildPermissionMatrix,
  extractPermissionCodes,
  DEFAULT_ROLE_PERMISSIONS,
} from "../../utils/permissionsCatalog";
import type { PermissionAction, PermissionModule } from "../../utils/permissionsCatalog";
import { notifyDataChanged } from "../../utils/dataSync";
import type { RoleRecord, RoleAssignment } from "../../types/rbac";

const SYSTEM_ROLES: Set<string> = new Set([...ALLOWED_INTERNAL_ROLES]);

const isSystemRole = (roleIdentifier?: unknown): boolean => {
  const normalized = normalizeRole(String(roleIdentifier || ""));
  return normalized !== null && SYSTEM_ROLES.has(normalized);
};

const roleTitle = (name: string): string => {
  const title = getRoleTitle(name);
  return title === "Unknown Role" ? name : title;
};

const getErrorMsg = (err: unknown, fallback: string): string => {
  if (err && typeof err === "object") {
    const r = err as { response?: { data?: { detail?: unknown; message?: unknown } } };
    const detail = r?.response?.data?.detail ?? r?.response?.data?.message;
    if (typeof detail === "string" && detail) return detail;
  }
  return fallback;
};

const asUnknownArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const maybe = (value as Record<string, unknown>).data;
    if (Array.isArray(maybe)) return maybe;
  }
  return [];
};

const mapRole = (r: Record<string, unknown>): RoleRecord => {
  const name = String(r.name || r.roleName || r.title || r.slug || r.role || "");
  const rawId = r.id ?? r.role_id ?? r.uid;
  const id = rawId !== undefined && rawId !== null ? String(rawId) : name || "-";
  const isSystem = isSystemRole(name);
  const count =
    typeof r.userCount === "number"
      ? r.userCount
      : typeof r.users_count === "number"
      ? r.users_count
      : 0;
  return {
    id,
    name: name || "-",
    description: typeof r.description === "string" ? r.description : typeof r.label === "string" ? r.label : "",
    category: typeof r.category === "string" ? r.category : isSystem ? "System Governance" : "Custom Operations",
    permissions: normalizePermissionList(
      r.permissions ?? r.permission_codes ?? r.permissionCodes ?? r.permissionList
    ),
    userCount: count,
    isSystem,
    is_active: r.is_active !== false,
    status: r.is_active === false ? "Inactive" : "Active",
  };
};

const mapUser = (u: Record<string, unknown>): RoleAssignment => {
  const rolesArr = Array.isArray(u.roles) ? u.roles : [];
  const role =
    rolesArr.length > 0 ? String(rolesArr[0]) : String(u.role || "");
  const isActive =
    u.is_active !== undefined
      ? !!u.is_active
      : u.status
      ? String(u.status).toLowerCase() !== "inactive"
      : true;
  return {
    id: String(u.id ?? u.user_id ?? u.uid ?? "-"),
    name: String(u.full_name || u.name || u.username || u.email || "-"),
    email: String(u.email || "-"),
    role,
    department: String(u.department || u.facility || u.organisation || "-"),
    is_active: isActive,
    status: isActive ? "Active" : "Inactive",
  };
};

const fallbackRoles = (): RoleRecord[] =>
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, perms]) => ({
    id: name,
    name,
    description: getRoleTitle(name) || "",
    category: "System Governance",
    permissions: perms,
    userCount: 0,
    isSystem: true,
    is_active: true,
    status: "Active",
  }));

const statusBadge = (status: string) => {
  const active = status === "Active";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: active ? "#ECFDF5" : "#FEF2F2",
        color: active ? "#10B981" : "#EF4444",
      }}
    >
      {status}
    </span>
  );
};

const typeBadge = (isSystem: boolean) => (
  <span
    style={{
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      background: isSystem ? "#EFF6FF" : "#ECFDF5",
      color: isSystem ? "#2563EB" : "#059669",
    }}
  >
    {isSystem ? "System" : "Custom"}
  </span>
);

const RolesPermissions = () => {
  const { addToast } = useToast();

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [users, setUsers] = useState<RoleAssignment[]>([]);
  const [matrixTotal, setMatrixTotal] = useState(0);
  const [matrixModules, setMatrixModules] = useState<PermissionModule[]>([]);
  const [matrixActions, setMatrixActions] = useState<PermissionAction[]>([]);
  const [roleDetailLoading, setRoleDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "users">("roles");

  const [roleSearch, setRoleSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Role create/edit modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<"create" | "edit">("create");
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "Custom organizational role",
    category: "Custom Operations",
  });
  const [matrixPerms, setMatrixPerms] = useState<string[]>([]);
  const [copyFromRole, setCopyFromRole] = useState("");

  // Delete / assign / revoke
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [assignTarget, setAssignTarget] = useState<RoleAssignment | null>(null);
  const [assignRole, setAssignRole] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<RoleAssignment | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rolesRes, permsRes] = await Promise.allSettled([
        userService.getRoles(),
        userService.getPermissions(),
      ]);

      let nextRoles: RoleRecord[];
      if (rolesRes.status === "fulfilled") {
        const value = rolesRes.value;
        const list = asUnknownArray(value);
        nextRoles =
          list.length > 0
            ? list.map((r) => mapRole((r as Record<string, unknown>) ?? {}))
            : fallbackRoles();
      } else {
        nextRoles = fallbackRoles();
      }

      setRoles(nextRoles);
      setRolePermissionOverrides(
        buildRolePermissionOverrides(
          nextRoles.map((r) => ({ name: r.name, permissions: r.permissions }))
        )
      );

      if (permsRes.status === "fulfilled") {
        const value = permsRes.value;
        // Build the matrix from the Permissions API so every module/action in
        // the UI matches the backend's registered permission codes.
        const matrix = buildPermissionMatrix(value);
        setMatrixModules(matrix.modules);
        setMatrixActions(matrix.actions);
        const codes = extractPermissionCodes(value);
        setMatrixTotal(codes.length > 0 ? codes.length : matrixPermissionKeys().length);
      } else {
        setMatrixModules([]);
        setMatrixActions([]);
        setMatrixTotal(matrixPermissionKeys().length);
      }
    } catch (err: unknown) {
      setError(getErrorMsg(err, "Failed to load roles and permissions matrix."));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      setUserError(null);
      const res = await userService.getUsers();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setUsers(list.map(mapUser));
    } catch (err: unknown) {
      setUserError(getErrorMsg(err, "Failed to load users."));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRolesAndPermissions();
      void fetchUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRolesAndPermissions, fetchUsers]);

  const openCreateRole = () => {
    setRoleModalMode("create");
    setEditingRole(null);
    setRoleForm({ name: "", description: "Custom organizational role", category: "Custom Operations" });
    setMatrixPerms([]);
    setCopyFromRole("");
    setRoleModalOpen(true);
  };

  const openEditRole = async (role: RoleRecord) => {
    setRoleModalMode("edit");
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || "", category: role.category || "" });
    setMatrixPerms(role.permissions || []);
    setCopyFromRole("");
    setRoleModalOpen(true);

    // Fetch the role's authoritative permission_codes so the matrix never
    // opens empty when permissions are already assigned.
    setRoleDetailLoading(true);
    try {
      const detail = await userService.getRoleById(role.id);
      const codes = extractPermissionCodes(detail);
      if (codes.length > 0) {
        setMatrixPerms(codes);
        setRolePermissionOverride(role.name, codes);
      }
    } catch (err: unknown) {
      addToast(
        getErrorMsg(err, `Could not refresh permissions for "${roleTitle(role.name)}"; showing cached set.`),
        "error"
      );
    } finally {
      setRoleDetailLoading(false);
    }
  };

  const handleCopyFrom = (roleName: string) => {
    setCopyFromRole(roleName);
    const role = roles.find((r) => r.name === roleName);
    if (role) setMatrixPerms(role.permissions || []);
  };

  const handleSaveRole = async () => {
    if (roleModalMode === "create") {
      const name = roleForm.name.trim();
      if (!name) {
        addToast("Role name is required.", "error");
        return;
      }
      if (isSystemRole(name)) {
        addToast(`"${name}" is a system role and cannot be redefined.`, "error");
        return;
      }
      try {
        setIsSubmitting(true);
        await userService.createRole({
          name,
          description: roleForm.description.trim(),
          category: roleForm.category.trim(),
          permission_codes: matrixPerms,
        });
        addToast(`Role "${name}" created with ${matrixPerms.length} permissions.`, "success");
        setRoleModalOpen(false);
        await fetchRolesAndPermissions();
        setRolePermissionOverride(name, matrixPerms);
        notifyPermissionsChanged();
        notifyDataChanged();
      } catch (err: unknown) {
        addToast(getErrorMsg(err, "Failed to create role."), "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const role = editingRole;
    if (!role) return;
    const name = role.isSystem ? role.name : roleForm.name.trim();
    if (!name) {
      addToast("Role name cannot be empty.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.updateRole(
        role.id,
        role.isSystem
          ? { permission_codes: matrixPerms }
          : { name, description: roleForm.description.trim(), permission_codes: matrixPerms }
      );
      addToast(`Role "${name}" policy updated (${matrixPerms.length} permissions).`, "success");
      setRoleModalOpen(false);
      // Reload the latest role registry, then pin this role's saved permission
      // codes (even when cleared) so revoking access takes effect immediately.
      await fetchRolesAndPermissions();
      setRolePermissionOverride(name, matrixPerms);
      notifyPermissionsChanged();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to update role."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    const role = deleteTarget;
    if (!role) return;
    if (role.isSystem) {
      addToast("System-defined roles cannot be deleted.", "error");
      setDeleteTarget(null);
      return;
    }
    if (role.userCount && role.userCount > 0) {
      addToast(
        `Cannot delete "${role.name}" — ${role.userCount} user(s) are still assigned. Reassign them first.`,
        "error"
      );
      setDeleteTarget(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.deleteRole(role.id);
      addToast(`Deleted role "${role.name}".`, "success");
      setDeleteTarget(null);
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to delete role."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = (user: RoleAssignment) => {
    setAssignTarget(user);
    setAssignRole(user.role || "");
  };

  const handleAssignRole = async () => {
    if (!assignTarget || !assignRole) return;
    if (String(assignTarget.role).toLowerCase().includes("super_admin") && assignRole !== "super_admin") {
      addToast("A Super Admin cannot be demoted to a lower role.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.updateUser(assignTarget.id, { role: assignRole });
      addToast(`Role assigned to ${assignTarget.name}: ${roleTitle(assignRole)}`, "success");
      setAssignTarget(null);
      fetchUsers();
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to assign role."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineRoleChange = async (user: RoleAssignment, newRole: string) => {
    if (newRole === user.role) return;
    if (String(user.role).toLowerCase().includes("super_admin") && newRole !== "super_admin") {
      addToast("A Super Admin cannot be demoted to a lower role.", "error");
      return;
    }
    try {
      await userService.updateUser(user.id, { role: newRole });
      addToast(`Role updated for ${user.name}: ${roleTitle(newRole)}`, "success");
      fetchUsers();
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to update role."), "error");
    }
  };

  const handleRevokeAccess = async () => {
    const target = revokeTarget;
    if (!target) return;
    if (String(target.role).toLowerCase().includes("super_admin")) {
      addToast("Super Admin access cannot be revoked here.", "error");
      setRevokeTarget(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.updateUser(target.id, { is_active: false });
      addToast(`Access revoked for ${target.name}.`, "success");
      setRevokeTarget(null);
      fetchUsers();
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to revoke access."), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReinstate = async (user: RoleAssignment) => {
    try {
      await userService.updateUser(user.id, { is_active: true });
      addToast(`Access reinstated for ${user.name}.`, "success");
      fetchUsers();
      notifyDataChanged();
    } catch (err: unknown) {
      addToast(getErrorMsg(err, "Failed to reinstate access."), "error");
    }
  };

  const openRolePermissionsFromUser = (user: RoleAssignment) => {
    const role = roles.find((r) => r.name === user.role);
    if (role) {
      openEditRole(role);
    } else {
      addToast(`No role record found for "${user.role}".`, "info");
    }
  };

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const activeUsers = users.filter((u) => u.is_active).length;

  const stats = [
    {
      title: "Role Definitions",
      value: loading ? "..." : `${roles.length} Roles`,
      trend: `${roles.filter((r) => r.isSystem).length} System · ${roles.filter((r) => !r.isSystem).length} Custom`,
      color: "#2563EB",
      icon: <FaUserShield />,
    },
    {
      title: "Permission Matrix",
      value: loading ? "..." : `${matrixTotal} Grants`,
      trend: `${PERMISSION_COUNT_PER_MODULE} per module`,
      color: "#EF4444",
      icon: <FaLock />,
    },
    {
      title: "Personnel Coverage",
      value: usersLoading ? "..." : `${activeUsers} Active`,
      trend: `${users.length} Registered Accounts`,
      color: "#10B981",
      icon: <FaUsers />,
    },
  ];

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid #CBD5E1",
    background: active ? "#2563EB" : "#FFFFFF",
    color: active ? "#FFFFFF" : "#334155",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
  });

  const thStyle: React.CSSProperties = {
    padding: "12px 14px",
    fontWeight: 700,
    color: "#475569",
    textAlign: "left",
    whiteSpace: "nowrap",
    background: "#F8FAFC",
    position: "sticky",
    top: 0,
    zIndex: 10,
    borderBottom: "1px solid #E2E8F0",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    verticalAlign: "middle",
    color: "#0F172A",
    borderBottom: "1px solid #F1F5F9",
  };
  const actionButtonStyle = (color: string, bg: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  });

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
          Roles, Permissions & Access Control
        </h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Define module-wise permissions (View, Create, Edit, Delete, Approve, Export, Manage),
          assign roles to every user, and revoke access — all enforced against live data.
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

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button style={tabButtonStyle(activeTab === "roles")} onClick={() => setActiveTab("roles")}>
          Role Policies
        </button>
        <button style={tabButtonStyle(activeTab === "users")} onClick={() => setActiveTab("users")}>
          User Assignments
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <QuickActionCard
          icon={<FaPlusCircle />}
          title="Create Custom Role"
          subtitle="Define a new permission set"
          color="#2563EB"
          onClick={openCreateRole}
        />
        <QuickActionCard
          icon={<FaUserPlus />}
          title="Provision New User"
          subtitle="Onboard & assign role"
          color="#10B981"
          onClick={() => (window.location.href = "/users?action=add")}
        />
        <QuickActionCard
          icon={<FaUserShield />}
          title="Permission Matrix"
          subtitle="Review module-wise grants"
          color="#6366F1"
          onClick={() => setActiveTab("roles")}
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
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      {activeTab === "roles" ? (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Role Definitions & Permission Sets
            </h3>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <FaSearch
                size={13}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94A3B8",
                }}
              />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 34px",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto", width: "100%", border: "1px solid #E2E8F0", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8FAFC" }}>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Assigned Users</th>
                  <th style={thStyle}>Permissions</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#2563EB" }}>
                      Loading roles from server...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>
                      No roles found.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => openEditRole(r)}
                      title={`Edit permissions for ${roleTitle(r.name)}`}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F0F6FF")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{roleTitle(r.name)}</div>
                        {r.description && (
                          <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 2 }}>
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>{r.category}</td>
                      <td style={tdStyle}>{typeBadge(r.isSystem || false)}</td>
                      <td style={tdStyle}>{r.userCount || 0}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "#F1F5F9",
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <FaKey size={10} />
                          {r.permissions?.length ?? 0}
                        </span>
                      </td>
                      <td style={tdStyle}>{statusBadge(r.status || "Active")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="soft-card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
              Assign & Revoke Roles for Every User
            </h3>
            <div style={{ position: "relative", minWidth: "240px" }}>
              <FaSearch
                size={13}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94A3B8",
                }}
              />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 34px",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {userError && (
            <div
              style={{
                marginBottom: "14px",
                padding: "12px 16px",
                borderRadius: 10,
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ⚠️ {userError}
            </div>
          )}

          <div style={{ overflowX: "auto", width: "100%", border: "1px solid #E2E8F0", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8FAFC" }}>
                <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Department</th>
                  <th style={{ ...thStyle, minWidth: 200 }}>Assigned Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#2563EB" }}>
                      Loading users from server...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#94A3B8" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{u.name}</div>
                      </td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>{u.department}</td>
                      <td style={tdStyle}>
                        <select
                          key={`${u.id}-${u.role}`}
                          defaultValue={roles.some((r) => r.name === u.role) ? u.role : ""}
                          disabled={isSubmitting}
                          onChange={(e) => handleInlineRoleChange(u, e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #CBD5E1",
                            fontSize: 12.5,
                            background: "#FFFFFF",
                            color: "#0F172A",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="">None</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.name}>
                              {roleTitle(r.name)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>{statusBadge(u.status || "Active")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => openAssignModal(u)}
                            style={actionButtonStyle("#1D4ED8", "#EFF6FF")}
                            title="Assign role"
                          >
                            <FaUserShield /> Assign
                          </button>
                          <button
                            onClick={() => openRolePermissionsFromUser(u)}
                            style={actionButtonStyle("#6D28D9", "#F5F3FF")}
                            title="Edit this role's permission matrix"
                          >
                            <FaKey /> Permissions
                          </button>
                          {u.is_active ? (
                            <button
                              onClick={() => setRevokeTarget(u)}
                              style={actionButtonStyle("#B91C1C", "#FEF2F2")}
                              title="Revoke role & access"
                            >
                              <FaBan /> Revoke
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReinstate(u)}
                              style={actionButtonStyle("#059669", "#ECFDF5")}
                              title="Reinstate access"
                            >
                              <FaCheckCircle /> Reinstate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Role Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={
          roleModalMode === "create"
            ? "Define New Custom Role"
            : editingRole?.isSystem
            ? `Edit Permissions — ${roleTitle(editingRole.name)}`
            : `Edit Role Policy — ${editingRole ? roleTitle(editingRole.name) : ""}`
        }
        maxWidth="800px"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveRole();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {roleModalMode === "create" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Role Identifier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. senior_triage_officer"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    value={roleForm.category}
                    onChange={(e) => setRoleForm({ ...roleForm, category: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Copy permissions from an existing role</label>
                <select
                  value={copyFromRole}
                  onChange={(e) => handleCopyFrom(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Start empty</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {roleTitle(r.name)} ({r.permissions?.length ?? 0} permissions)
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : editingRole?.isSystem ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                color: "#1E40AF",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <FaUserShield style={{ marginRight: 6 }} />
              System role <strong>{roleTitle(editingRole.name)}</strong> — the name and category
              are fixed, but you can customize its permission set below.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Role Name *</label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  type="text"
                  value={roleForm.category}
                  onChange={(e) => setRoleForm({ ...roleForm, category: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {roleModalMode === "edit" && roleDetailLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 10,
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                color: "#1E40AF",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span className="dash-spin" style={{ width: 14, height: 14, border: "2px solid #BFDBFE", borderTopColor: "#2563EB", borderRadius: "50%" }} />
              Loading current permission codes for this role...
            </div>
          )}
          <PermissionMatrixEditor
            value={matrixPerms}
            onChange={setMatrixPerms}
            modules={matrixModules}
            actions={matrixActions}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              {roleModalMode === "edit" && editingRole && !editingRole.isSystem && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(editingRole);
                    setRoleModalOpen(false);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid #FCA5A5",
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <FaTrash /> Delete Role
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                style={cancelButtonStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={primaryButtonStyle}
              >
                {isSubmitting
                  ? "Saving..."
                  : roleModalMode === "create"
                  ? "Create Role"
                  : "Save Policy"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Role Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Custom Role"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to delete custom role{" "}
            <strong>{deleteTarget ? roleTitle(deleteTarget.name) : ""}</strong>? This action
            cannot be undone.
          </p>
          {deleteTarget && (deleteTarget.userCount || 0) > 0 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#B91C1C",
                fontSize: 13,
              }}
            >
              <FaBan style={{ marginRight: 6 }} />
              This role has {deleteTarget.userCount} assigned user(s). Deletion is blocked until
              they are reassigned.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteRole}
              style={{ ...primaryButtonStyle, background: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}
            >
              <FaTrash /> {isSubmitting ? "Deleting..." : "Delete Role"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="Assign Role to User"
      >
        {assignTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: "#334155", margin: 0, fontSize: 14 }}>
              Assign a role to <strong>{assignTarget.name}</strong> ({assignTarget.email}).
              The role's permission set determines their access across all modules.
            </p>
            <div>
              <label style={labelStyle}>Role *</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {roleTitle(r.name)} ({r.permissions?.length ?? 0} permissions)
                  </option>
                ))}
              </select>
            </div>
            {assignRole && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                  Permission preview
                </div>
                {(() => {
                  const role = roles.find((r) => r.name === assignRole);
                  const perms = role?.permissions || [];
                  const preview = perms.slice(0, 8).map(describePermission);
                  return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {preview.map((p) => (
                        <span
                          key={p}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: "#EFF6FF",
                            color: "#1D4ED8",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {p}
                        </span>
                      ))}
                      {perms.length > 8 && (
                        <span style={{ fontSize: 11, color: "#64748B", alignSelf: "center" }}>
                          +{perms.length - 8} more
                        </span>
                      )}
                      {perms.length === 0 && (
                        <span style={{ fontSize: 12, color: "#64748B" }}>No permissions.</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                style={cancelButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !assignRole}
                onClick={handleAssignRole}
                style={primaryButtonStyle}
              >
                {isSubmitting ? "Assigning..." : "Assign Role"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Revoke Access Modal */}
      <Modal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke Role & Access"
      >
        {revokeTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#334155", margin: 0 }}>
              Revoke the <strong>{roleTitle(revokeTarget.role)}</strong> role and access for{" "}
              <strong>{revokeTarget.name}</strong> ({revokeTarget.email})? The account will be
              deactivated and they will no longer be able to sign in.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                style={cancelButtonStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRevokeAccess}
                style={{ ...primaryButtonStyle, background: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}
              >
                <FaBan /> {isSubmitting ? "Revoking..." : "Revoke Access"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const PERMISSION_COUNT_PER_MODULE = 7;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  fontSize: 14,
  boxSizing: "border-box",
  background: "#FFFFFF",
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "#F1F5F9",
  color: "#334155",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 8,
  border: "none",
  background: "#2563EB",
  color: "#FFFFFF",
  fontWeight: 600,
  cursor: "pointer",
};

export default RolesPermissions;
