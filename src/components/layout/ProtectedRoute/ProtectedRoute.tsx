import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../../../types/auth";
import { getCurrentUser, getCurrentUserRole, isInternalRole } from "../../../utils/roleUtils";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const user = getCurrentUser();
  const token = localStorage.getItem("access_token");

  // If user is not authenticated or not an internal staff role, redirect to Login page
  if (!user || !token || !isInternalRole(user)) {
    return <Navigate to="/" replace />;
  }

  const currentRole = getCurrentUserRole();

  if (!currentRole) {
    return <Navigate to="/" replace />;
  }

  // If allowedRoles is specified, ensure user has authorization
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to="/403" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
