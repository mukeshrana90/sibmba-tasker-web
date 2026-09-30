import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ChatContext } from "../../context/ChatProvider";
import { ImagePathCustomer } from "../../utils/ImagePath";
import { handleUserImageError } from "../../utils/landingUtils";
import { customerDisplayName } from "../../utils/customerProfileUtils";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import {
  LOGISTICS_OWNER_SIDEBAR,
  LOGISTICS_OPERATOR_SIDEBAR,
} from "./ModuleSwitcher";
import { useLogisticsSupplyChrome } from "./LogisticsSupplyChromeContext";
import { useLogisticsConfig } from "../../CommanComponents/useLogisticsConfig";

function getInitials(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function isItemActive(item, path, search = "") {
  // Items sharing a path (My Vehicles vs Cabs) are told apart by ?kind=cab
  const wantsCab = /[?&]kind=cab\b/.test(search);
  if (item.search) {
    return path === item.path && wantsCab;
  }
  if (item.path === "/logistics/owner/fleet" && wantsCab) return false;
  if (item.exact) return path === item.path;
  if (item.matchPaths?.length) {
    return item.matchPaths.some(
      (p) => path === p || path.startsWith(`${p}/`)
    );
  }
  return path === item.path || path.startsWith(`${item.path}/`);
}

function Icon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case "jobs":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
        </svg>
      );
    case "vehicle":
      return (
        <svg {...common}>
          <path d="M3 14h18l-1.5-5.5A2 2 0 0 0 17.6 7H6.4a2 2 0 0 0-1.9 1.5L3 14Z" />
          <path d="M5 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM19 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 19a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 19a5 5 0 0 1 5.5-4.8" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "earnings":
      return (
        <svg {...common}>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "support":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LogisticsSupplySidebar({
  isDriver = false,
  customerDetails,
}) {
  const location = useLocation();
  const path = location.pathname;
  const dispatch = useDispatch();
  const chrome = useLogisticsSupplyChrome();
  const { chatList } = useContext(ChatContext) || {};
  const [oppCount, setOppCount] = useState(0);

  const { cabEnabled } = useLogisticsConfig();
  const items = (isDriver ? LOGISTICS_OPERATOR_SIDEBAR : LOGISTICS_OWNER_SIDEBAR).filter(
    (item) => !item.cabOnly || cabEnabled
  );

  const unreadMessages = useMemo(
    () =>
      (chatList || []).reduce((sum, chat) => sum + (chat.unreadCount || 0), 0),
    [chatList]
  );

  useEffect(() => {
    chrome?.closeMobile?.();
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    let timer = null;

    const refreshOppCount = async () => {
      try {
        const res = await dispatch(
          LogisticsActions.availableWork({ page: 1, limit: 1 })
        );
        const total = Number(res?.payload?.data?.total);
        if (!alive) return;
        setOppCount(Number.isFinite(total) ? total : 0);
      } catch {
        if (alive) setOppCount(0);
      }
    };

    refreshOppCount();

    const onLogisticsNotif = (evt) => {
      const type = String(evt?.detail?.type || "").toLowerCase();
      // New job nearby / hire / direct book — and any job lifecycle that
      // may remove an opportunity from the open list.
      if (
        type.includes("job_alert") ||
        type.includes("job_report") ||
        type.includes("quote") ||
        type.includes("job_accepted") ||
        type.includes("job_cancelled") ||
        type.includes("job_rejected") ||
        type === "logistics_notification" ||
        !type
      ) {
        refreshOppCount();
      }
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") refreshOppCount();
    };

    const onManualRefresh = () => refreshOppCount();

    window.addEventListener("simba:logistics_notification", onLogisticsNotif);
    window.addEventListener(
      "simba:logistics_opportunities_refresh",
      onManualRefresh
    );
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    // Soft poll while supply chrome is open (jobs appear even without a push)
    timer = setInterval(refreshOppCount, 60_000);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      window.removeEventListener(
        "simba:logistics_notification",
        onLogisticsNotif
      );
      window.removeEventListener(
        "simba:logistics_opportunities_refresh",
        onManualRefresh
      );
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [dispatch, path]);

  const name = customerDisplayName(customerDetails) || "User";
  const roleLabel = isDriver ? "Operator" : "Equipment owner";
  const company =
    customerDetails?.company_name ||
    customerDetails?.business_name ||
    (isDriver ? "Assigned fleet" : "Your fleet");
  const profileImage = customerDetails?.profile_image
    ? ImagePathCustomer(customerDetails.profile_image)
    : null;
  const initials = getInitials(name);
  const verified = Number(customerDetails?.is_verified) === 1;

  return (
    <>
      {chrome?.mobileOpen ? (
        <button
          type="button"
          className="log-side-backdrop"
          aria-label="Close menu"
          onClick={() => chrome.closeMobile()}
        />
      ) : null}

      <aside
        className={`log-side${chrome?.mobileOpen ? " is-open" : ""}`}
        aria-label="Logistics menu"
      >
        <nav className="log-side__nav">
          {items.map((item) => {
            const active = isItemActive(item, path, location.search);
            let badge = null;
            if (item.badge === "opportunities" && oppCount > 0) {
              badge = oppCount > 99 ? "99+" : String(oppCount);
            }
            if (item.badge === "messages" && unreadMessages > 0) {
              badge = unreadMessages > 99 ? "99+" : String(unreadMessages);
            }
            return (
              <Link
                key={item.path + (item.search || "")}
                to={item.path + (item.search || "")}
                className={`log-side__link${active ? " is-active" : ""}`}
                onClick={() => chrome?.closeMobile?.()}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {badge ? <em className="log-side__badge">{badge}</em> : null}
              </Link>
            );
          })}
        </nav>

        <div className="log-side__foot">
          <div className="log-side__user">
            {profileImage ? (
              <img
                src={profileImage}
                alt=""
                className="log-side__av"
                onError={handleUserImageError}
              />
            ) : (
              <span className="log-side__av">{initials}</span>
            )}
            <div className="log-side__meta">
              <b>{name}</b>
              <span>{roleLabel}</span>
              {verified ? (
                <span className="log-side__verified">Verified</span>
              ) : null}
              <span className="log-side__company">{company}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
