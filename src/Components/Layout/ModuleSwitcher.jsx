import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getActiveModule,
  resolveActiveModule,
  setActiveModule,
  syncActiveModuleFromPath,
} from "../../utils/Roles";

/**
 * Product module toggle for the app header (between logo and menus).
 * taskerHome: role home when leaving Logistics (/, /requests, /corporate, or Hub for role 4).
 * logisticsHome: supply home for role 4 (/logistics/owner|/driver) or Hub (/logistics).
 * activeOverride: force highlighted tab (role 4 Hub vs Owner).
 */
export default function ModuleSwitcher({
  onChange,
  taskerHome = "/",
  logisticsHome = "/logistics",
  activeOverride = null,
  className = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = useState(() =>
    activeOverride || resolveActiveModule(location.pathname)
  );

  useEffect(() => {
    syncActiveModuleFromPath(location.pathname);
    setActive(activeOverride || resolveActiveModule(location.pathname));
  }, [location.pathname, activeOverride]);

  const select = (module) => {
    setActiveModule(module);
    setActive(module);
    onChange?.(module);
    if (module === "logistics") {
      const target = logisticsHome || "/logistics";
      if (location.pathname !== target) navigate(target);
      return;
    }
    const home = taskerHome || "/";
    if (location.pathname !== home) navigate(home);
  };

  const selected = activeOverride || active;

  return (
    <div
      className={`module-switcher module-switcher--nav${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label="Product module"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selected === "tasker"}
        className={selected === "tasker" ? "is-active" : ""}
        onClick={() => select("tasker")}
      >
        Simba Tasker
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={selected === "logistics"}
        className={selected === "logistics" ? "is-active" : ""}
        onClick={() => select("logistics")}
      >
        Logistics
      </button>
    </div>
  );
}

export const LOGISTICS_HUB_NAV = [
  { label: "Hub", path: "/logistics", exact: true },
  { label: "Post job", path: "/logistics/post" },
  { label: "Book / Search", path: "/logistics/search" },
  { label: "My jobs", path: "/logistics/jobs" },
];

/** Legacy top-link lists (hub still uses horizontal links). */
export const LOGISTICS_OWNER_NAV = [
  { label: "Dashboard", path: "/logistics/owner", exact: true },
  { label: "Fleet", path: "/logistics/owner/fleet" },
  { label: "Operators", path: "/logistics/owner/operators" },
  { label: "Jobs", path: "/logistics/owner/jobs" },
  { label: "Earnings", path: "/logistics/owner/earnings" },
];

export const LOGISTICS_DRIVER_NAV = [
  { label: "Work", path: "/logistics/driver", exact: true },
  { label: "Available", path: "/logistics/driver/work" },
  { label: "Earnings", path: "/logistics/driver/earnings" },
];

/** Dark supply sidebar — Equipment owner (includes vehicles + operators). */
export const LOGISTICS_OWNER_SIDEBAR = [
  { label: "Dashboard", path: "/logistics/owner", exact: true, icon: "dashboard" },
  {
    label: "Job Opportunities",
    path: "/logistics/owner/opportunities",
    icon: "jobs",
    badge: "opportunities",
  },
  { label: "My Jobs", path: "/logistics/owner/jobs", icon: "briefcase" },
  { label: "Quotes", path: "/logistics/owner/quotes", icon: "jobs" },
  {
    label: "My Vehicles",
    path: "/logistics/owner/fleet",
    icon: "vehicle",
    matchPaths: ["/logistics/owner/fleet"],
  },
  {
    // Shown only when backend CAB_SERVICE_ENABLED=true (session config)
    label: "Cabs",
    path: "/logistics/owner/fleet",
    search: "?kind=cab",
    icon: "vehicle",
    cabOnly: true,
  },
  {
    label: "Equipment",
    path: "/logistics/owner/equipment",
    icon: "jobs",
    matchPaths: ["/logistics/owner/equipment"],
  },
  {
    label: "Operators",
    path: "/logistics/owner/operators",
    icon: "users",
    matchPaths: ["/logistics/owner/operators"],
  },
  { label: "Availability", path: "/logistics/owner/availability", icon: "clock" },
  { label: "Earnings", path: "/logistics/owner/earnings", icon: "earnings" },
  { label: "Subscription", path: "/logistics/owner/subscription", icon: "earnings" },
  { label: "Analytics", path: "/logistics/owner/analytics", icon: "analytics" },
  { label: "Reports", path: "/logistics/owner/reports", icon: "support" },
  { label: "Messages", path: "/messages", icon: "messages", badge: "messages" },
  { label: "Support", path: "/logistics/owner/support", icon: "support" },
];

/** Operator sidebar — same as owner minus Vehicles + Operators. */
export const LOGISTICS_OPERATOR_SIDEBAR = [
  { label: "Dashboard", path: "/logistics/driver", exact: true, icon: "dashboard" },
  {
    label: "Job Opportunities",
    path: "/logistics/driver/work",
    icon: "jobs",
    badge: "opportunities",
  },
  { label: "My Jobs", path: "/logistics/driver/jobs", icon: "briefcase" },
  { label: "Quotes", path: "/logistics/driver/quotes", icon: "jobs" },
  { label: "Earnings", path: "/logistics/driver/earnings", icon: "earnings" },
  { label: "Analytics", path: "/logistics/driver/analytics", icon: "analytics" },
  { label: "Messages", path: "/messages", icon: "messages", badge: "messages" },
  { label: "Support", path: "/logistics/driver/support", icon: "support" },
];

export function useProductModule() {
  const location = useLocation();
  const [module, setModule] = useState(() =>
    resolveActiveModule(location.pathname)
  );

  useEffect(() => {
    syncActiveModuleFromPath(location.pathname);
    setModule(resolveActiveModule(location.pathname));
  }, [location.pathname]);

  return module;
}

export { getActiveModule, resolveActiveModule };
