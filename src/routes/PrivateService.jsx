import { Navigate, Outlet } from "react-router-dom";
import RequireProviderService from "./RequireProviderService";
import { Roles } from "../utils/Roles";

const PrivateService = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;

  if (String(role) === String(Roles.SERVICE_PROVIDER)) {
    return (
      <RequireProviderService>
        <Outlet />
      </RequireProviderService>
    );
  }

  if (String(role) === String(Roles.CUSTOMER)) {
    return <Navigate to="/" replace />;
  }
  if (String(role) === String(Roles.CORPORATE)) {
    return <Navigate to="/corporate" replace />;
  }

  return <Navigate to="/" replace />;
};

export default PrivateService;
