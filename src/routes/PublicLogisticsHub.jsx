import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../Components/Layout/Layout";
import { guestLoginPath } from "../utils/authRedirect";
import { SUPPLY_DRAFT_MESSAGE, clearLogisticsJobDraft, hasLogisticsJobDraft } from "../utils/logisticsJobDraft";
import { canHubConsume, homeRouteForRole, Roles } from "../utils/Roles";

/**
 * Hub pages guests may browse before login (v2.7.49): hub home, search and
 * asset detail. Same chrome as PrivateLogisticsHub. Guests (no token) see the
 * pages with the guest header; account actions send them to /login?redirect=.
 * Guests can also fill in Post a job; it is saved as a draft until they sign in.
 * Logged-in users keep PrivateLogisticsHub's role rules (supply side → own home).
 */
const PublicLogisticsHub = () => {
  const location = useLocation();
  const [redirect, setRedirect] = useState(undefined);
  const onPostPage = location.pathname.replace(/\/$/, "") === "/logistics/post";
  // Read once: the effect below clears the draft, and may run twice in StrictMode
  const supplyWithDraft = useRef(
    onPostPage &&
      Boolean(localStorage.getItem("token")) &&
      Number(localStorage.getItem("role")) === Roles.LOGISTICS &&
      hasLogisticsJobDraft()
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) {
      // Editing, booking a unit and cab rides still need an account first
      const params = new URLSearchParams(location.search);
      const needsAccount =
        onPostPage &&
        (params.has("edit") || params.has("asset") || params.get("category") === "cab");
      setRedirect(needsAccount ? guestLoginPath(`${location.pathname}${location.search}`) : null);
      return;
    }
    // Owners and operators can't send a job drafted before they signed in
    if (supplyWithDraft.current) {
      clearLogisticsJobDraft();
      // Only one toast shows at a time: this one replaces the login message
      toast.clearWaitingQueue();
      toast.dismiss();
      toast.error(SUPPLY_DRAFT_MESSAGE, { toastId: "logistics-draft-supply", autoClose: 7000 });
      setRedirect(homeRouteForRole(role, localStorage.getItem("owner_id")));
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
