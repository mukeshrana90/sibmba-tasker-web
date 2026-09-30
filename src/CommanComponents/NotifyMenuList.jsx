import { useEffect, useState } from "react";
import { formatMessagePreview } from "../utils/chatUtils";
import { formatNotificationTime } from "../utils/notificationTime";
import {
  logisticsNotificationJobPath,
  notificationJobId,
} from "../utils/logisticsNotificationNav";


function notificationBody(message) {
  return String(message || "").trim();
}

function truncateText(text, max = 48) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

export default function NotifyMenuList({
  notifications,
  isOpen,
  onClearOne,
  onClearAll,
  clearing = false,
  onOpenNotification,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const list = Array.isArray(notifications) ? notifications : [];

  useEffect(() => {
    if (!isOpen) {
      setExpandedId(null);
      setBusyId(null);
    }
  }, [isOpen]);

  if (!list.length) {
    return (
      <ul className="notify-menu-list">
        <li className="notify-empty">No notifications yet</li>
      </ul>
    );
  }

  return (
    <>
      <div className="notify-menu-actions">
        {onClearAll ? (
          <button
            type="button"
            className="notify-clear-all"
            disabled={clearing}
            onClick={(e) => {
              e.stopPropagation();
              onClearAll();
            }}
          >
            {clearing ? "Clearing…" : "Clear all"}
          </button>
        ) : null}
      </div>
      <ul className="notify-menu-list">
        {list.map((notification, index) => {
          const id = notification?._id || `notify-${index}`;
          const title = String(notification?.title || "Notification").trim();
          const full = notificationBody(notification?.message);
          const preview = formatMessagePreview(notification?.message);
          const titleNeedsExpand = title.length > 42;
          const bodyNeedsExpand = full.length > 25;
          const canExpand = titleNeedsExpand || bodyNeedsExpand;
          const expanded = expandedId === id;
          const canClear = Boolean(onClearOne && notification?._id);
          const jobPath =
            typeof onOpenNotification === "function"
              ? logisticsNotificationJobPath(notification, {
                  role: localStorage.getItem("role"),
                })
              : null;
          const canOpenJob = Boolean(
            jobPath && notificationJobId(notification)
          );

          const toggle = () => {
            setExpandedId((prev) => (prev === id ? null : id));
          };

          const openJob = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!canOpenJob) return;
            onOpenNotification(notification, jobPath);
          };

          return (
            <li
              key={id}
              className={`notify-item${canExpand ? " is-expandable" : ""}${
                expanded ? " is-expanded" : ""
              }`}
            >
              <div className="notify-item-main">
                <div
                  className="notify-item-body"
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                >
                  <div className="notify-item-top">
                    <strong>
                      {expanded || !titleNeedsExpand
                        ? title
                        : truncateText(title, 42)}
                    </strong>
                    <span>{formatNotificationTime(notification?.createdAt)}</span>
                  </div>
                  <p>
                    {expanded || !bodyNeedsExpand
                      ? full || preview
                      : preview}
                  </p>
                  {expanded && canOpenJob ? (
                    <button
                      type="button"
                      className="notify-item-details-link"
                      onClick={openJob}
                    >
                      Check details
                    </button>
                  ) : null}
                </div>
                {canClear ? (
                  <button
                    type="button"
                    className="notify-clear-one"
                    aria-label="Clear notification"
                    title="Clear"
                    disabled={clearing || busyId === notification._id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setBusyId(notification._id);
                      try {
                        await onClearOne(notification._id);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
