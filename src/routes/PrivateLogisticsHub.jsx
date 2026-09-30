import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { canHubConsume, Roles } from "../utils/Roles";

/** Hub demand — keep same app chrome (logo, module toggle, chat, notifications, profile). */
const PrivateLogisticsHub = () => {
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) {
      setRedirect("/login");
      return;
    }
    let permissions = [];
    try {
      permissions = JSON.parse(localStorage.getItem("logisticsPermissions") || "[]");
    } catch {
      permissions = [];
    }
    if (!canHubConsume(role, permissions)) {
      if (Number(role) === Roles.LOGISTICS) {
        const ownerId = localStorage.getItem("owner_id");
        setRedirect(ownerId ? "/logistics/driver" : "/logistics/owner");
      } else {
        setRedirect("/login");
      }
      return;
    }
    setRedirect(null);
  }, []);

  if (redirect === undefined) return null;
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <Layout footerVariant="marketing">
      <Outlet />
    </Layout>
  );
};

export default PrivateLogisticsHub;
