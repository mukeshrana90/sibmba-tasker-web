import { Link, useLocation } from "react-router-dom";
import { guestLoginPath } from "../../utils/authRedirect";
import { setLastSection } from "../../utils/lastSection";

const Icon = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Item 50: phone bottom nav for guests (hidden from tablet width up, in landing.css). */
export default function GuestBottomNav() {
  const { pathname } = useLocation();
  const inLogistics = pathname.startsWith("/logistics");
  const items = [
    {
      key: "services",
      label: "Services",
      to: "/services",
      active: !inLogistics && !pathname.startsWith("/post-task") && !pathname.startsWith("/login"),
      icon: "M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7V21h3.3l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.5-.6-.6-2.5 2.7-2.6Z",
      onClick: () => setLastSection("services"),
    },
    {
      key: "logistics",
      label: "Logistics",
      to: "/logistics",
      active: inLogistics && pathname !== "/logistics/post",
      icon: "M3 7h12v9H3zM15 10h4l2 3v3h-6zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
      onClick: () => setLastSection("logistics"),
    },
    {
      key: "post",
      label: "Post",
      to: inLogistics ? "/logistics/post" : "/post-task",
      active: pathname.startsWith("/post-task") || pathname === "/logistics/post",
      icon: "M12 5v14M5 12h14",
    },
    {
      key: "account",
      label: "Account",
      to: guestLoginPath(),
      active: pathname.startsWith("/login"),
      icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
    },
  ];
  return (
    <nav className="guest-bottom-nav" aria-label="Main" data-testid="guest-bottom-nav">
      {items.map((item) => (
        <Link
          key={item.key}
          to={item.to}
          className={item.active ? "is-active" : ""}
          data-testid={`bottom-nav-${item.key}`}
          aria-current={item.active ? "page" : undefined}
          onClick={item.onClick}
        >
          <Icon d={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
