import { getActiveModule } from "./Roles";

/** Resolve logistics job id from a notification document or socket payload. */
export function notificationJobId(notification) {
  if (!notification || typeof notification !== "object") return null;
  const raw =
    notification.job_id ||
    notification.jobId ||
    notification.meta?.job_id ||
    notification.meta?.jobId ||
    null;
  if (!raw) return null;
  if (typeof raw === "object" && raw._id) return String(raw._id);
  const s = String(raw).trim();
  return s || null;
}

/**
 * Deep-link path for a logistics notification.
 * Customer hub → /logistics/jobs/:id
 * Fleet owner → /logistics/owner/job/:id
 * Operator → /logistics/driver/job/:id
 */
export function logisticsNotificationJobPath(
  notification,
  { role, ownerId, activeModule } = {}
) {
  const jobId = notificationJobId(notification);
  if (!jobId) return null;

  const type = String(notification?.type || "").toLowerCase();
  const isLogistics =
    type.startsWith("logistics_") ||
    Boolean(notificationJobId(notification));

  if (!isLogistics && activeModule && activeModule !== "logistics") {
    return null;
  }

  const r = Number(role != null ? role : localStorage.getItem("role"));
  const oid =
    ownerId != null
      ? ownerId
      : localStorage.getItem("owner_id") || localStorage.getItem("ownerId");
  const mod = activeModule || getActiveModule() || "tasker";

  if (r === 4 && (mod === "logistics" || type.startsWith("logistics_"))) {
    if (oid && String(oid) !== "null" && String(oid).trim()) {
      return `/logistics/driver/job/${jobId}`;
    }
    return `/logistics/owner/job/${jobId}`;
  }

  return `/logistics/jobs/${jobId}`;
}
