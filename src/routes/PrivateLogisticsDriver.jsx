import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { isLogisticsDriver, isLogisticsOwner } from "../utils/Roles";
import { loadLogisticsAccount, useLogisticsAccount } from "../CommanComponents/LogisticsAccountBanner";

const SETUP_PATH = "/logistics/driver/setup";
const NEEDS_UPLOAD = new Set(["missing", "rejected", "expired"]);

/**
 * 12 Nov 2026: an operator without a usable selfie or licence (none yet, rejected or
 * expired) must complete the setup screen first. Waiting for Simba's check is fine.
 */
export function operatorNeedsSetup(account) {
  if (!account) return false;
  const face = account.operator_face?.status;
  const lic = account.operator_licence;
  const faceDue = face ? NEEDS_UPLOAD.has(face) : false;
  const licDue = Boolean(lic?.required) && NEEDS_UPLOAD.has(lic?.status || "missing");
  return faceDue || licDue;
}

const PrivateLogisticsDriver = () => {
  const [redirect, setRedirect] = useState(undefined);
  const [isDriver, setIsDriver] = useState(false);
  const location = useLocation();
  // Live account state, so finishing the setup screen lets the operator through
  const account = useLogisticsAccount();
  const needsSetup = isDriver && operatorNeedsSetup(account);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const ownerId = localStorage.getItem("owner_id");
    if (!token) {
      setRedirect("/login");
      return;
    }
    if (isLogisticsDriver(role, ownerId)) {
      let alive = true;
      loadLogisticsAccount().then(() => {
        if (!alive) return;
        setIsDriver(true);
        setRedirect(null);
      });
      return () => {
        alive = false;
      };
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
  if (needsSetup && location.pathname !== SETUP_PATH) return <Navigate to={SETUP_PATH} replace />;

  return (
    <Layout footerVariant="marketing">
      <Outlet />
    </Layout>
  );
};

export default PrivateLogisticsDriver;
