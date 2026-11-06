import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { isLogisticsDriver, isLogisticsOwner } from "../utils/Roles";
import { loadLogisticsAccount } from "../CommanComponents/LogisticsAccountBanner";

const PrivateLogisticsDriver = () => {
  const [redirect, setRedirect] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const ownerId = localStorage.getItem("owner_id");
    if (!token) {
      setRedirect("/login");
      return;
    }
    if (isLogisticsDriver(role, ownerId)) {
      setRedirect(null);
      return;
    }
    if (!isLogisticsOwner(role, ownerId)) {
      setRedirect("/logistics/owner");
      return;
    }
    // v2.7.61: an owner who may operate units (or is still holding one) gets the operator pages
    let alive = true;
    loadLogisticsAccount().then((account) => {
      if (!alive) return;
      const op = account?.owner_operator;
      setRedirect(op?.can_operate || op?.active_asset_id ? null : "/logistics/owner");
    });
    return () => {
      alive = false;
    };
  }, []);

  if (redirect === undefined) return null;
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <Layout footerVariant="marketing">
      <Outlet />
    </Layout>
  );
};

export default PrivateLogisticsDriver;
