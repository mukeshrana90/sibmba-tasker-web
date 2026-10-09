import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDismissOnOutsidePointer, usePopoverToggle } from "../../Hooks/useDismissOnOutsidePointer";
import { ImagePathCustomer } from "../../utils/ImagePath";
import { handleUserImageError } from "../../utils/landingUtils";
import { customerDisplayName } from "../../utils/customerProfileUtils";
import NotifyMenuList from "../../CommanComponents/NotifyMenuList";
import useNotificationClear from "../../Hooks/useNotificationClear";
import ModuleSwitcher, { LOGISTICS_HUB_NAV } from "./ModuleSwitcher";
import { getActiveModule, isSharedModulePath } from "../../utils/Roles";
import { useLogisticsSupplyChrome } from "./LogisticsSupplyChromeContext";
import LogisticsSosButton from "../../CommanComponents/LogisticsSosButton";
import { canUseSos, emergencyContactsPath } from "../../utils/logisticsSos";

function getInitials(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1E1A15"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function isNavActive(route, currentPath) {
  if (route.exact) return currentPath === route.path;
  return currentPath === route.path || currentPath.startsWith(`${route.path}/`);
}

/**
 * Role 4 logistics chrome.
 * Supply (owner/operator): slim top — logo, Tasker|Logistics, notifications, profile.
 * Hub (when role 4 visits demand hub): horizontal Hub links kept.
 */
export default function LogisticsAppNav({
  isDriver = false,
  customerDetails,
  notificationDetail,
  onDeleteAccount,
  onLogout,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const supplyChrome = useLogisticsSupplyChrome();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [hubMobileOpen, setHubMobileOpen] = useState(false);

  const avatarRef = useRef(null);
  const notifyRef = useRef(null);

  const supplyMode =
    currentPath.startsWith("/logistics/owner") ||
    currentPath.startsWith("/logistics/driver") ||
    (isSharedModulePath(currentPath) && getActiveModule() === "logistics");

  const supplyHome = isDriver ? "/logistics/driver" : "/logistics/owner";
  const logoHome = supplyMode ? supplyHome : "/logistics";

  const notifyCount = notificationDetail?.length || 0;
  const { clearOne, clearAll, clearing } = useNotificationClear();
  const profileImage = customerDetails?.profile_image
    ? ImagePathCustomer(customerDetails.profile_image)
    : null;
  const initials = getInitials(customerDisplayName(customerDetails));

  const closeAvatar = useCallback(() => setAvatarOpen(false), []);
  const closeNotify = useCallback(() => setNotifyOpen(false), []);

  useDismissOnOutsidePointer(avatarRef, avatarOpen, closeAvatar);
  useDismissOnOutsidePointer(notifyRef, notifyOpen, closeNotify);

  const toggleNotify = usePopoverToggle(setNotifyOpen, {
    onBeforeOpen: () => setAvatarOpen(false),
  });
  const toggleAvatar = usePopoverToggle(setAvatarOpen, {
    onBeforeOpen: () => setNotifyOpen(false),
  });

  useEffect(() => {
    setHubMobileOpen(false);
    setAvatarOpen(false);
    setNotifyOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`appnav appnav--logistics${
        supplyMode ? " appnav--logistics-supply" : ""
      }`}
    >
      <div className="appnav-inner">
        {supplyMode ? (
          <button
            type="button"
            className="menu-btn log-side-toggle"
            aria-label="Menu"
            aria-expanded={Boolean(supplyChrome?.mobileOpen)}
            onClick={() => supplyChrome?.toggleMobile?.()}
          >
            <MenuIcon />
          </button>
        ) : null}

        <Link to={logoHome} className="logo">
          <img
            src={require("../../Assets/Images/dark-logo.png")}
            alt="Simba Tasker"
          />
        </Link>

        <ModuleSwitcher taskerHome="/" logisticsHome={supplyHome} />

        {!supplyMode ? (
          <nav className="app-links">
            {LOGISTICS_HUB_NAV.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={isNavActive(route, currentPath) ? "active" : ""}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div className="app-links app-links--spacer" aria-hidden="true" />
        )}

        <div className="app-tools">
          <div
            className={`notify-wrap${notifyOpen ? " open" : ""}`}
            ref={notifyRef}
          >
            <button
              type="button"
              className={`icon-btn${notifyOpen ? " active" : ""}`}
              aria-label="Notifications"
              aria-expanded={notifyOpen}
              onPointerUp={toggleNotify}
              onClick={(e) => e.preventDefault()}
            >
              <BellIcon />
              {notifyCount > 0 && (
                <span className="badge">
                  {notifyCount > 99 ? "99+" : notifyCount}
                </span>
              )}
            </button>

            <div
              className="notify-menu"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <NotifyMenuList
                notifications={notificationDetail}
                isOpen={notifyOpen}
                onClearOne={clearOne}
                onClearAll={clearAll}
                clearing={clearing}
                onOpenNotification={(_n, path) => {
                  setNotifyOpen(false);
                  if (path) navigate(path);
                }}
              />
            </div>
          </div>

          <div
            className={`avatar-wrap${avatarOpen ? " open" : ""}`}
            ref={avatarRef}
          >
            <button
              type="button"
              className="avatar-btn"
              aria-haspopup="true"
              aria-expanded={avatarOpen}
              onPointerUp={toggleAvatar}
              onClick={(e) => e.preventDefault()}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt=""
                  className="av"
                  onError={handleUserImageError}
                />
              ) : (
                <span className="av">{initials}</span>
              )}
              <ChevronIcon />
            </button>

            <div
              className="avatar-menu"
              role="menu"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="am-head">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt=""
                    className="am-av"
                    onError={handleUserImageError}
                  />
                ) : (
                  <span className="am-av">{initials}</span>
                )}
                <div className="am-meta">
                  <b>{customerDisplayName(customerDetails) || "Account"}</b>
                  <Link to="/edit-profile" onClick={() => setAvatarOpen(false)}>
                    View profile
                  </Link>
                </div>
              </div>
              <Link
                to="/edit-profile"
                className="am-item"
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                Edit profile
              </Link>
              <Link
                to="/change-password"
                className="am-item"
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                Change password
              </Link>
              {canUseSos() ? (
                <>
                  <LogisticsSosButton
                    variant="menu"
                    onOpen={() => setAvatarOpen(false)}
                  />
                  <Link
                    to={emergencyContactsPath()}
                    className="am-item"
                    role="menuitem"
                    onClick={() => setAvatarOpen(false)}
                  >
                    Emergency contacts
                  </Link>
                </>
              ) : null}
              {onDeleteAccount ? (
                <button
                  type="button"
                  className="am-item danger"
                  role="menuitem"
                  onClick={() => {
                    setAvatarOpen(false);
                    onDeleteAccount();
                  }}
                >
                  Delete account
                </button>
              ) : null}
              {onLogout ? (
                <button
                  type="button"
                  className="am-item danger"
                  role="menuitem"
                  onClick={() => {
                    setAvatarOpen(false);
                    onLogout();
                  }}
                >
                  <LogoutIcon />
                  Log out
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {!supplyMode ? (
          <button
            type="button"
            className="menu-btn"
            aria-label="Menu"
            aria-expanded={hubMobileOpen}
            onClick={() => setHubMobileOpen((v) => !v)}
          >
            <MenuIcon />
          </button>
        ) : null}
      </div>

      {!supplyMode && hubMobileOpen ? (
        <div className="appnav-mobile">
          <nav className="app-links-mobile">
            {LOGISTICS_HUB_NAV.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={isNavActive(route, currentPath) ? "active" : ""}
                onClick={() => setHubMobileOpen(false)}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
