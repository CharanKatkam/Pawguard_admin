import { Navigate } from "react-router-dom";
import { getCurrentUserRole, getDashboardPathForRole } from "../../utils/roleUtils";

const Dashboard = () => {
  const role = getCurrentUserRole() || "super_admin";
  const path = getDashboardPathForRole(role);

  return <Navigate to={path} replace />;
};

export default Dashboard;