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
 * Item 19: where a document or trial notification opens. Uses the fields the
 * backend sends (asset_id, operator_id, doc_type, business_doc, link).
 */
export function logisticsNotificationDocPath(notification) {
  if (!notification || typeof notification !== "object") return null;
  const meta = { ...(notification.meta || {}), ...(notification.data || {}) };
  const get = (k) => notification[k] || meta[k];
  const idOf = (v) => (v && typeof v === "object" ? v._id : v);
  const type = String(notification.type || meta.type || "").toLowerCase();
  if (type === "logistics_whatsapp_trial") {
    return get("link") || "/logistics/owner/subscription";
  }
  const docType = get("doc_type");
  const q = docType ? `doc=${encodeURIComponent(docType)}` : "";
  const isOperator = Boolean(localStorage.getItem("owner_id"));
  if (get("business_doc") || meta.subject === "business") {
    return isOperator ? null : `/logistics/owner/verification${q ? `?${q}` : ""}`;
  }
  const assetId = idOf(get("asset_id"));
  if (assetId && docType) {
    return isOperator ? "/logistics/driver" : `/logistics/owner/fleet/${assetId}?${q}`;
  }
  const operatorId = idOf(get("operator_id"));
  if (operatorId && docType) {
    if (isOperator) return "/logistics/driver";
    // The owner's own licence / face photo is managed on Availability
    if (String(operatorId) === String(localStorage.getItem("userId"))) {
      return "/logistics/owner/availability";
    }
    return `/logistics/owner/operators?operator=${operatorId}&${q}`;
  }
  return null;
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
