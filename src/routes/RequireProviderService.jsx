import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../CommanComponents/Loader";
import { Roles } from "../utils/Roles";
import {
  fetchProviderHasService,
  isProviderServiceSetupPath,
  notifyProviderServiceRequired,
} from "../utils/providerServiceGate";

/**
 * Blocks service-provider portal navigation until they have ≥1 service.
 * Allows /service/add (and a few auth/setup paths) while incomplete.
 */
export default function RequireProviderService({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ checking: true, redirect: null });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (!token) {
        if (!cancelled) setState({ checking: false, redirect: "/login" });
        return;
      }

      if (String(role) !== String(Roles.SERVICE_PROVIDER)) {
        if (!cancelled) setState({ checking: false, redirect: null });
        return;
      }

      if (isProviderServiceSetupPath(location.pathname)) {
        if (!cancelled) setState({ checking: false, redirect: null });
        return;
      }

      try {
        const hasService = await fetchProviderHasService({ force: true });
        if (cancelled) return;
        if (!hasService) {
          notifyProviderServiceRequired();
          setState({ checking: false, redirect: "/service/add" });
          return;
        }
        setState({ checking: false, redirect: null });
      } catch (error) {
        console.error("RequireProviderService check failed:", error);
        if (!cancelled) {
          notifyProviderServiceRequired();
          setState({ checking: false, redirect: "/service/add" });
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state.checking) {
    return <Loader />;
  }

  if (state.redirect) {
    return <Navigate to={state.redirect} replace />;
  }

  return children ? children : <Outlet />;
}
