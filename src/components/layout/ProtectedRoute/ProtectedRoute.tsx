import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../../../types/auth";
import { getCurrentUser, getCurrentUserRole, isInternalRole } from "../../../utils/roleUtils";
import { hasPermission, hasAnyPermission } from "../../../utils/rbac";
import { getAccessToken, clearAuthData, isSessionExpired } from "../../../utils/authStorage";
import { notifyAuthChanged } from "../../../utils/dataSync";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  /** Permission code(s) required to access this route (any-of). */
  permission?: string | string[];
}

const ProtectedRoute = ({ allowedRoles, permission }: ProtectedRouteProps) => {
  const user = getCurrentUser();
  const token = getAccessToken();

  // Enforce exact 300-second (5 minute) session inactivity timeout
  if (isSessionExpired()) {
    clearAuthData();
    notifyAuthChanged();
    return <Navigate to="/" replace />;
  }

  // If user is not authenticated or not an internal staff role, redirect to Login page
  if (!user || !token || !isInternalRole(user)) {
    return <Navigate to="/" replace />;
  }

  const currentRole = getCurrentUserRole();

  if (!currentRole) {
    return <Navigate to="/" replace />;
  }

  // Super Admin has unrestricted access to all routes
  if (currentRole === "super_admin") {
    return <Outlet />;
  }

  // If allowedRoles is specified, ensure user has authorization
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to="/403" replace />;
    }
  }

  // Permission-based enforcement: revoking a permission must block the page.
  if (permission) {
    const allowed = Array.isArray(permission)
      ? hasAnyPermission(permission)
      : hasPermission(permission);
    if (!allowed) {
      return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
