import { useState, useEffect } from "react";
import DataTable from "../../components/common/DataTable";
import QuickActionCard from "../../components/dashboard/QuickActionCard";
import StatCard from "../../components/dashboard/StatCard";
import Modal from "../../components/common/Modal";
import { useToast } from "../../context/ToastContext";
import { FaUserShield, FaLock, FaUsers, FaPlusCircle, FaTrash } from "react-icons/fa";
import userService from "../../services/userService";
import { normalizeRole, ALLOWED_INTERNAL_ROLES } from "../../utils/roleUtils";
import { notifyDataChanged } from "../../utils/dataSync";

const SYSTEM_ROLES: Set<string> = new Set([
  ...ALLOWED_INTERNAL_ROLES,
]);

const isSystemRole = (roleIdentifier?: unknown): boolean => {
  const normalized = normalizeRole(String(roleIdentifier || ""));
  return normalized !== null && SYSTEM_ROLES.has(normalized);
};

const RolesPermissions = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Modals state
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, _setSelectedRole] = useState<any | null>(null);

  // Form states
  const [roleForm, setRoleForm] = useState({ name: "", description: "Custom organizational role", category: "Custom Operations" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesRes, permsRes] = await Promise.allSettled([
        userService.getRoles(),
        userService.getPermissions(),
      ]);

      if (rolesRes.status === "fulfilled") {
        const rawRoles = Array.isArray(rolesRes.value)
          ? rolesRes.value
          : Array.isArray(rolesRes.value?.data)
          ? rolesRes.value.data
          : [];

        const formatted = rawRoles.map((r: any) => ({
          id: r.id || r.name,
          roleName: r.name || r.roleName || r.title || "-",
          category: r.category || "System Governance",
          userCount: r.userCount !== undefined ? `${r.userCount} Users` : "Active",
          accessLevel: Array.isArray(r.permissions) ? `${r.permissions.length} Permissions` : r.accessLevel || "Configured Scope",
          status: r.is_active !== false ? "Active" : "Inactive",
        }));
        setRoles(formatted);
      } else {
        // Fallback default roles if API is limited
        setRoles([
          { id: "1", roleName: "super_admin", category: "System Governance", userCount: "2 Users", accessLevel: "Full System Access", status: "Active" },
          { id: "2", roleName: "rescue_centre_admin", category: "Facility Governance", userCount: "5 Users", accessLevel: "Shelter & Rescue Scope", status: "Active" },
          { id: "3", roleName: "veterinarian", category: "Clinical Care", userCount: "8 Users", accessLevel: "Medical Records & Surgery", status: "Active" },
          { id: "4", roleName: "adoption_coordinator", category: "Community", userCount: "4 Users", accessLevel: "Adoptions & Foster Scope", status: "Active" },
        ]);
      }

      if (permsRes.status === "fulfilled") {
        const rawPerms = Array.isArray(permsRes.value)
          ? permsRes.value
          : Array.isArray(permsRes.value?.data)
          ? permsRes.value.data
          : [];
        setPermissions(rawPerms);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load roles and permissions matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      addToast("Role Name is required", "error");
      return;
    }
    if (isSystemRole(roleForm.name)) {
      addToast(`"${roleForm.name}" is a system role and cannot be redefined.`, "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.createRole({ ...roleForm, name: roleForm.name.trim() });
      addToast(`Custom role "${roleForm.name.trim()}" created successfully!`, "success");
      setIsCreateRoleModalOpen(false);
      setRoleForm({ name: "", description: "Custom organizational role", category: "Custom Operations" });
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to create role.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    if (isSystemRole(selectedRole.id || selectedRole.roleName)) {
      addToast("System roles cannot be edited in this view. Use a custom role instead.", "error");
      setIsEditModalOpen(false);
      return;
    }
    if (!roleForm.name.trim()) {
      addToast("Role name cannot be empty.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.updateRole(selectedRole.id || selectedRole.roleName, {
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
      });
      addToast(`Role "${roleForm.name.trim()}" updated!`, "success");
      setIsEditRoleModalOpen(false);
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to update role.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    if (isSystemRole(selectedRole.id || selectedRole.roleName)) {
      addToast("System-defined roles cannot be deleted.", "error");
      setIsDeleteModalOpen(false);
      return;
    }
    try {
      setIsSubmitting(true);
      await userService.deleteRole(selectedRole.id || selectedRole.roleName);
      addToast(`Deleted role "${selectedRole.roleName}"`, "success");
      setIsDeleteModalOpen(false);
      fetchRolesAndPermissions();
      notifyDataChanged();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || "Failed to delete role.";
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setIsEditRoleModalOpen = (open: boolean) => setIsEditModalOpen(open);

  const stats = [
    { title: "System Roles", value: loading ? "..." : `${roles.length} Roles`, trend: "Configured Roles", color: "#2563EB", icon: <FaUserShield /> },
    { title: "Total Permissions", value: loading ? "..." : `${permissions.length} Permissions`, trend: "System Scope", color: "#EF4444", icon: <FaLock /> },
    { title: "Active Governance", value: loading ? "..." : `${roles.filter((r) => r.status === "Active").length} Active`, trend: "Policy Enforced", color: "#10B981", icon: <FaUsers /> },
  ];

  const columns = [
    { key: "roleName", title: "Role Identifier" },
    { key: "category", title: "Category" },
    { key: "userCount", title: "Assigned Users" },
    { key: "accessLevel", title: "Access Scope" },
    { key: "status", title: "Policy Status" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px", background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "24px", borderRadius: "16px", color: "#fff" }}>
        <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 800 }}>Roles & Permission Governance</h1>
        <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: "14px" }}>
          Super Administrator Security Suite: configure access control policies, manage role definitions, and assign module permissions.
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        <QuickActionCard icon={<FaPlusCircle />} title="Create Custom Role" subtitle="Define new permission set" color="#2563EB" onClick={() => setIsCreateRoleModalOpen(true)} />
        <QuickActionCard icon={<FaUserShield />} title="Audit Role Matrix" subtitle="Review active permissions" color="#10B981" onClick={() => setIsAuditModalOpen(true)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="soft-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
            System Role Permissions Matrix
          </h3>
          {loading && <span style={{ fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>Loading roles...</span>}
        </div>
        <DataTable
          columns={columns}
          data={roles}
          onEdit={async (r) => {
            await userService.updateRole(r.id || "1", r);
            fetchRolesAndPermissions();
          }}
          onDelete={async (r) => {
            await userService.deleteRole(r.id || "1");
            fetchRolesAndPermissions();
          }}
        />
      </div>

      {/* Create Custom Role Modal */}
      <Modal isOpen={isCreateRoleModalOpen} onClose={() => setIsCreateRoleModalOpen(false)} title="Define New Custom Role">
        <form onSubmit={handleCreateRole} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role Identifier Name *</label>
            <input type="text" required placeholder="e.g. senior_triage_officer" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Description</label>
            <input type="text" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsCreateRoleModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Creating..." : "Create Role"}</button>
          </div>
        </form>
      </Modal>

      {/* Audit Matrix Modal */}
      <Modal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} title="Role Permission Matrix Audit">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ color: "#334155", margin: 0 }}>Active Role Permission Matrix:</p>
          <div style={{ maxHeight: "250px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {roles.map((r, i) => (
              <div key={i} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>{r.roleName}</div>
                  <div style={{ fontSize: "12px", color: "#64748B" }}>Scope: {r.accessLevel}</div>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#10B981" }}>ENFORCED</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>



      {/* Edit Role Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditRoleModalOpen(false)} title="Edit Role Policy">
        <form onSubmit={handleEditRoleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Role Name</label>
            <input type="text" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={() => setIsEditRoleModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#FFF", fontWeight: 600 }}>{isSubmitting ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Role Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Custom Role">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ color: "#334155", margin: 0 }}>
            Are you sure you want to delete custom role <strong>{selectedRole?.roleName}</strong>?
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #CBD5E1", background: "#F1F5F9" }}>Cancel</button>
            <button type="button" disabled={isSubmitting} onClick={handleDeleteRole} style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#EF4444", color: "#FFF", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}><FaTrash /> Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RolesPermissions;
