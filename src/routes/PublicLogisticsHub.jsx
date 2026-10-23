import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { canHubConsume, Roles } from "../utils/Roles";

/**
 * Hub pages guests may browse before login (v2.7.49): hub home, search and
 * asset detail. Same chrome as PrivateLogisticsHub. Guests (no token) see the
 * pages with the guest header; account actions send them to /login?redirect=.
 * Logged-in users keep PrivateLogisticsHub's role rules (supply side → own home).
 */
const PublicLogisticsHub = () => {
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) {
      setRedirect(null);
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

export default PublicLogisticsHub;
