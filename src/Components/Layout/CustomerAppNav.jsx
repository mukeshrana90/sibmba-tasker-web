import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Search from "../../CommanComponents/Search";
import { useDismissOnOutsidePointer, usePopoverToggle } from "../../Hooks/useDismissOnOutsidePointer";
import { ImagePathCustomer } from "../../utils/ImagePath";
import { handleUserImageError } from "../../utils/landingUtils";
import { customerDisplayName } from "../../utils/customerProfileUtils";
import { ChatContext } from "../../context/ChatProvider";
import NotifyMenuList from "../../CommanComponents/NotifyMenuList";

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "Service", path: "/services" },
  { label: "Corporate", path: "/corporate-list" },
  { label: "Bookings", path: "/bookings" },
  { label: "My Tasks", path: "/my-task" },
];

function getInitials(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4-4" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
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

export default function CustomerAppNav({
  customerDetails,
  notificationDetail,
  onDeleteAccount,
  onLogout,
}) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { chatList } = useContext(ChatContext) || {};

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const avatarRef = useRef(null);
  const notifyRef = useRef(null);

  const unreadMessages = useMemo(
    () =>
      (chatList || []).reduce((sum, chat) => sum + (chat.unreadCount || 0), 0),
    [chatList]
  );

  const notifyCount = notificationDetail?.length || 0;
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
    setMobileOpen(false);
    setAvatarOpen(false);
    setNotifyOpen(false);
  }, [location.pathname]);

  const isActive = (path) => currentPath === path;

  return (
    <header className="appnav">
      <div className="appnav-inner">
        <Link to="/" className="logo">
          <img
            src={require("../../Assets/Images/dark-logo.png")}
            alt="Simba Tasker"
          />
        </Link>

        <div className="app-search">
          <SearchIcon />
          <Search variant="appnav" />
        </div>

        <nav className="app-links">
          {NAV_LINKS.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={isActive(route.path) ? "active" : ""}
            >
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="app-tools">
          <Link
            to="/messages"
            className={`icon-btn${currentPath === "/messages" ? " active" : ""}`}
            aria-label="Messages"
          >
            <MessageIcon />
            {unreadMessages > 0 && (
              <span className="badge">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
          </Link>

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
              <div className="notify-menu-head">
                <h3>Notifications</h3>
              </div>
              <NotifyMenuList
                notifications={notificationDetail}
                isOpen={notifyOpen}
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
                  <b>{customerDisplayName(customerDetails)}</b>
                  <Link
                    to="/edit-profile"
                    onClick={() => setAvatarOpen(false)}
                  >
                    Edit Profile
                  </Link>
                </div>
              </div>

              <Link
                to="/community"
                className={`am-item${isActive("/community") ? " active" : ""}`}
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                Community
              </Link>
              <Link
                to="/product-history"
                className={`am-item${isActive("/product-history") ? " active" : ""}`}
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                Product History
              </Link>
              <Link
                to="/change-password"
                className={`am-item${isActive("/change-password") ? " active" : ""}`}
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                Change Password
              </Link>
              <button
                type="button"
                className="am-item"
                role="menuitem"
                onClick={() => {
                  setAvatarOpen(false);
                  onDeleteAccount();
                }}
              >
                Delete account
              </button>
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
            </div>
          </div>
        </div>

        <button
          type="button"
          className="menu-btn"
          aria-label="Menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <MenuIcon />
        </button>
      </div>

      {mobileOpen && (
        <div className="appnav-mobile">
          <div className="app-search app-search--mobile">
            <SearchIcon />
            <Search variant="appnav" />
          </div>
          <nav className="app-links-mobile">
            {NAV_LINKS.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={isActive(route.path) ? "active" : ""}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
