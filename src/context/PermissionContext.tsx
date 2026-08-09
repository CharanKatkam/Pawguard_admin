import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "../types/auth";
import userService from "../services/userService";
import {
  buildRolePermissionOverrides,
  extractUserPermissions,
} from "../utils/permissionsCatalog";
import {
  setRolePermissionOverrides,
  setRolePermissionOverride,
  getCurrentUserPermissions,
  hasPermission,
  can as canImpl,
  PERMISSIONS_CHANGED_EVENT,
} from "../utils/rbac";
import { getCurrentUser, getCurrentUserRole } from "../utils/roleUtils";
import { subscribeToDataChange, AUTH_CHANGED_EVENT } from "../utils/dataSync";

export interface PermissionContextValue {
  /** Effective permission codes for the current user (expanded). */
  permissions: string[];
  role: UserRole | null;
  loading: boolean;
  /** Check a single permission code (e.g. `view_users`). */
  has: (permission: string) => boolean;
  /** Check a granular action+module permission (e.g. `create`, `adoptions`). */
  can: (action: string, module: string) => boolean;
  canView: (module: string) => boolean;
  canManage: (module: string) => boolean;
  /** Re-read the current permission overrides and notify all consumers. */
  refresh: () => void;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  // `tick` forces re-render whenever overrides change so every consumer
  // (sidebar, routes, buttons, forms) re-evaluates access immediately.
  const [tick, setTick] = useState(0);
  // Bumped when a login/logout happens in this tab so the captured role and
  // override map are re-derived instead of going stale.
  const [authVersion, setAuthVersion] = useState(0);
  const role = getCurrentUserRole();

  /** Re-read the current override map and bump consumers (no network). */
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    setLoading(false);
  }, []);

  /** Initial / explicit backend load of the role registry. */
  const loadFromBackend = useCallback(async () => {
    const currentRole = getCurrentUserRole();
    const user = getCurrentUser();

    // 1. Prefer permissions embedded on the authenticated user object.
    const userPerms = extractUserPermissions(user);
    if (userPerms.length > 0 && currentRole) {
      setRolePermissionOverride(currentRole, userPerms);
    }

    // 2. Super Admin may read the live role registry directly; other roles
    // rely on the stored user permissions / static defaults to avoid
    // triggering the global 401 handler on admin-only endpoints.
    if (currentRole === "super_admin") {
      try {
        const res = await userService.getRoles();
        const list = Array.isArray(res) ? res : [];
        if (list.length > 0) {
          setRolePermissionOverrides(buildRolePermissionOverrides(list));
        }
      } catch {
        // Non-admin / network failure → keep defaults or user permissions.
      }
    }

    setTick((t) => t + 1);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Defer the initial backend load so state updates happen outside the
    // effect body (avoids cascading renders and satisfies the hooks linter).
    const timer = window.setTimeout(() => {
      void loadFromBackend();
    }, 0);

    // Permission edits (e.g. saved on the Roles & Permissions page) update the
    // override map directly and broadcast this event — consumers only need to
    // re-read the map to take effect immediately.
    const onPermissionsChanged = () => refresh();
    const onAuthChanged = () => setAuthVersion((v) => v + 1);
    const unsubscribe = subscribeToDataChange(refresh);
    window.addEventListener(PERMISSIONS_CHANGED_EVENT, onPermissionsChanged);
    window.addEventListener("storage", onPermissionsChanged);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, onPermissionsChanged);
      window.removeEventListener("storage", onPermissionsChanged);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, [loadFromBackend, refresh, authVersion]);

  const permissions = useMemo(
    () => getCurrentUserPermissions(role ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, tick]
  );

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions,
      role,
      loading,
      has: (p) => hasPermission(p),
      can: (a, m) => canImpl(a, m),
      canView: (m) => canImpl("view", m),
      canManage: (m) => canImpl("manage", m),
      refresh,
    }),
    [permissions, role, loading, refresh]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePermissions = (): PermissionContextValue => {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return ctx;
};

export default PermissionContext;
