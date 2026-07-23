import { Navigate, Outlet, useLocation } from "react-router-dom";
import RequireProviderService from "./RequireProviderService";
import { Roles } from "../utils/Roles";

const PrivateRoute = () => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return location.pathname === "/" ? <Outlet /> : <Navigate to="/" replace />;
  }

  if (token && location.pathname === "/") {
    if (String(role) === String(Roles.CUSTOMER)) return <Outlet />;
    if (String(role) === String(Roles.SERVICE_PROVIDER)) {
      return <Navigate to="/requests" replace />;
    }
    if (String(role) === String(Roles.CORPORATE)) {
      return <Navigate to="/corporate" replace />;
    }
  }

  if (String(role) === String(Roles.SERVICE_PROVIDER)) {
    return (
      <RequireProviderService>
        <Outlet />
      </RequireProviderService>
    );
  }

  return <Outlet />;
};

export default PrivateRoute;
