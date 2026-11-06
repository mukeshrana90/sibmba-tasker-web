import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Roles } from "../utils/Roles";
import { consumeLastSectionRedirect, lastSectionRedirect } from "../utils/lastSection";

const ProtectHome = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Item 51: guests and customers can land on the section they last used
  useEffect(() => {
    consumeLastSectionRedirect();
  }, []);

  if (!token || String(role) === String(Roles.CUSTOMER)) {
    const section = lastSectionRedirect();
    if (section) return <Navigate to={section} replace />;
  }

  if (!token) {
    return <Outlet />;
  }

  if (String(role) === String(Roles.CUSTOMER)) return <Outlet />;
  // Equipment owners use Tasker as customers when module toggle is Simba Tasker
  if (String(role) === String(Roles.LOGISTICS)) return <Outlet />;
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
