import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ChatContext } from "../../context/ChatProvider";
import {
  getActiveModule,
  resolveActiveModule,
  setActiveModule,
  syncActiveModuleFromPath,
} from "../../utils/Roles";

/** Logistics notices use logistics_* types and / or carry a TransportJob id. */
export const notificationModuleOf = (n) =>
  String(n?.type || "").startsWith("logistics") || n?.job_id
    ? "logistics"
    : "tasker";

// Last time the user had each module open (per user, this browser). In-app
// notifications have no read flag, so "new" = created after that moment.
const seenKey = (module) =>
  `moduleSeenAt:${localStorage.getItem("userId") || "guest"}:${module}`;
function readSeenAt(module) {
  try {
    const v = Number(localStorage.getItem(seenKey(module)));
    if (v > 0) return v;
    const now = Date.now(); // first run: only later activity counts as new
    localStorage.setItem(seenKey(module), String(now));
    return now;
  } catch {
    return Date.now();
  }
}
function markSeen(module) {
  try {
    localStorage.setItem(seenKey(module), String(Date.now()));
  } catch {
    /* ignore */
  }
}

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
  // Guest header shows "Services | Logistics"
  taskerLabel = "Simba Tasker",
  logisticsLabel = "Logistics",
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

  // v2.7.55 red dot on the other module: unread chats there (chat is
  // module-scoped) or notifications for it since it was last open.
  const { unreadByModule } = useContext(ChatContext) || {};
  const notifications = useSelector((state) => state.UserSlice?.notificationData);
  const loggedIn = !!localStorage.getItem("token");
  useEffect(() => {
    if (loggedIn) markSeen(selected);
  }, [selected, notifications, loggedIn]);
  const hasNew = useMemo(() => {
    const out = { tasker: false, logistics: false };
    if (!loggedIn) return out;
    for (const module of ["tasker", "logistics"]) {
      if (module === selected) continue;
      const seenAt = readSeenAt(module);
      out[module] =
        (unreadByModule?.[module] || 0) > 0 ||
        (Array.isArray(notifications) &&
          notifications.some(
            (n) =>
              notificationModuleOf(n) === module &&
              new Date(n?.createdAt).getTime() > seenAt
          ));
    }
    return out;
  }, [selected, unreadByModule, notifications, loggedIn]);
  const dot = (module) =>
    hasNew[module] ? (
      <span className="module-switcher__dot" aria-label="New activity" />
    ) : null;

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
        {taskerLabel}
        {dot("tasker")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={selected === "logistics"}
        className={selected === "logistics" ? "is-active" : ""}
        onClick={() => select("logistics")}
      >
        {logisticsLabel}
        {dot("logistics")}
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
  { label: "Subscription", path: "/logistics/owner/subscription", icon: "subscription" },
  { label: "Analytics", path: "/logistics/owner/analytics", icon: "analytics" },
  { label: "Reports", path: "/logistics/owner/reports", icon: "support" },
  { label: "SOS alerts", path: "/logistics/owner/sos", icon: "support" },
  { label: "Emergency contacts", path: "/logistics/owner/emergency-contacts", icon: "users" },
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
  { label: "Emergency contacts", path: "/logistics/driver/emergency-contacts", icon: "users" },
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
