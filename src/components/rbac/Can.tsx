import type { ReactNode } from "react";
import { usePermissions } from "../../context/PermissionContext";

interface CanProps {
  /** Single permission code or a list (any-of). */
  permission: string | string[];
  /** Rendered when the user lacks permission (defaults to null). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Permission gate: renders `children` only when the current user holds at
 * least one of the required permission codes.
 */
const Can = ({ permission, fallback = null, children }: CanProps) => {
  const { has } = usePermissions();
  const allowed = Array.isArray(permission)
    ? permission.some((p) => has(p))
    : has(permission);
  return <>{allowed ? children : fallback}</>;
};

export default Can;
