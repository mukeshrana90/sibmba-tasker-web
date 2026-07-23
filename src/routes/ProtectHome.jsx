import { Navigate, Outlet } from "react-router-dom";
import { Roles } from "../utils/Roles";

const ProtectHome = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return <Outlet />;
  }

  if (String(role) === String(Roles.CUSTOMER)) return <Outlet />;
  // PrivateService / RequireProviderService will bounce to /service/add when needed
  if (String(role) === String(Roles.SERVICE_PROVIDER)) {
    return <Navigate to="/requests" replace />;
  }
  if (String(role) === String(Roles.CORPORATE)) {
    return <Navigate to="/corporate" replace />;
  }

  return <Navigate to="/" replace />;
};

export default ProtectHome;
