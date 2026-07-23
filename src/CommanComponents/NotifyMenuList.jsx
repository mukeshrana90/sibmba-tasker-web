import { useEffect, useState } from "react";
import { formatMessagePreview } from "../utils/chatUtils";

function formatTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationBody(message) {
  return String(message || "").trim();
}

export default function NotifyMenuList({ notifications, isOpen }) {
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!isOpen) setExpandedId(null);
  }, [isOpen]);

  if (!notifications?.length) {
    return (
      <ul className="notify-menu-list">
        <li className="notify-empty">No notifications yet</li>
      </ul>
    );
  }

  return (
    <ul className="notify-menu-list">
      {notifications.map((notification, index) => {
        const id = notification?._id || `notify-${index}`;
        const full = notificationBody(notification?.message);
        const preview = formatMessagePreview(notification?.message);
        const isTruncated = full.length > 25;
        const expanded = expandedId === id;

        const toggle = () => {
          if (!isTruncated) return;
          setExpandedId((prev) => (prev === id ? null : id));
        };

        return (
          <li
            key={id}
            className={`notify-item${isTruncated ? " is-expandable" : ""}${
              expanded ? " is-expanded" : ""
            }`}
            onClick={toggle}
            onKeyDown={(e) => {
              if (!isTruncated) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
              }
            }}
            role={isTruncated ? "button" : undefined}
            tabIndex={isTruncated ? 0 : undefined}
            aria-expanded={isTruncated ? expanded : undefined}
          >
            <div className="notify-item-top">
              <strong>{notification?.title}</strong>
              <span>{formatTime(notification?.createdAt)}</span>
            </div>
            <p>{expanded || !isTruncated ? full || preview : preview}</p>
          </li>
        );
      })}
    </ul>
  );
}
