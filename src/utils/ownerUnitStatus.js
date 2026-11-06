import { unitOccupancy } from "./ownerOperator";

/**
 * Owner screens: why customers can't book a unit right now (v2.7.30 rule —
 * a unit is bookable only while an assigned operator is live on it).
 * Returns "" when bookable or unknown.
 */
export function notBookableReason(asset) {
  const cv = asset?.customer_view;
  if (!cv || cv.bookable) return "";
  const detail = String(cv.status_detail || "");
  if (detail === "No operator assigned") return "Not bookable — no operator assigned";
  if (detail === "Operator not online on this unit") {
    return "Not bookable — nobody is live on this unit";
  }
  // 29 Oct 2026: every document must be verified by Simba first
  if (detail === "Awaiting document check") {
    return "Awaiting Simba's document check — the unit is shown to customers once verified";
  }
  // Road licence missing / rejected, or documents expired (doc 12 · L36)
  if (detail === "Documents expired" || / (required|rejected)$/.test(detail)) {
    return `Not bookable — ${detail}`;
  }
  if (cv.state === "scheduled") return "Not bookable — scheduled";
  return "Not bookable — offline";
}

const RAW_LABEL = {
  available_now: "Available now",
  returning_empty: "Returning empty",
  scheduled: "Scheduled",
  on_job: "On a job",
  offline: "Offline",
};

const RAW_TONE = {
  available_now: "active",
  returning_empty: "pending",
  scheduled: "active",
  on_job: "progress",
  offline: "closed",
};

/**
 * One status chip for a unit on owner screens (doc 12 · L36): what customers
 * see, never the stored state next to "Not bookable". Uses `customer_view`
 * from the API; falls back to the stored state only when it's missing.
 * Returns { label, tone } for `log-chip log-chip--{tone}`.
 */
export function unitStatusChip(asset) {
  const cv = asset?.customer_view;
  if (!cv) {
    const st = asset?.availability?.state || asset?.availability || "offline";
    return { label: RAW_LABEL[st] || String(st), tone: RAW_TONE[st] || "closed" };
  }
  if (!cv.bookable) {
    if (cv.status_detail === "No operator assigned") return { label: "Not bookable — no operator", tone: "closed" };
    if (cv.status_detail === "Operator not online on this unit") {
      return { label: asset?.owner_operating ? "Not bookable — nobody live" : "Not bookable — operator not live", tone: "closed" };
    }
    if (cv.status_detail === "Awaiting document check") return { label: "Awaiting document check", tone: "progress" };
    return { label: notBookableReason(asset), tone: "closed" };
  }
  if (cv.state === "on_job") return { label: "On a job", tone: "progress" };
  if (cv.raw_state === "returning_empty") return { label: "Returning empty", tone: "pending" };
  return { label: "Available now", tone: "active" };
}

/**
 * Availability dropdown (item 6): always the real status, and never "Available
 * now" with nobody live. { value, options, holder, disabled, hint }.
 * holder: "owner" (the owner is on the unit), "operator" or null.
 */
export function ownerStatusControl(asset, { ownerActiveAssetId } = {}) {
  const occ = unitOccupancy(asset);
  const cv = asset?.customer_view;
  const stored = asset?.availability?.state || "offline";
  const ownerOn =
    occ.by === "owner" ||
    (ownerActiveAssetId && String(ownerActiveAssetId) === String(asset?._id));
  const onJob = occ.reason === "on_job" || cv?.state === "on_job" || stored === "on_job";
  const opt = (value) => ({ value, label: RAW_LABEL[value] });
  if (onJob) {
    return {
      value: "on_job",
      options: [opt("on_job")],
      holder: ownerOn ? "owner" : occ.by || null,
      disabled: true,
      hint: "Changes when the job finishes.",
    };
  }
  const raw = cv?.raw_state || asset?.live_operator_state || stored;
  const liveValue = raw === "returning_empty" ? "returning_empty" : raw === "scheduled" ? "scheduled" : "available_now";
  if (ownerOn) {
    const options = [opt("available_now"), opt("returning_empty")];
    if (asset?.kind === "equipment") options.push(opt("scheduled"));
    options.push(opt("offline"));
    return { value: liveValue, options, holder: "owner", disabled: false, hint: "" };
  }
  const operatorLive = occ.busy || Boolean(asset?.live_operator_state);
  if (operatorLive) {
    const options = [opt("available_now"), opt("returning_empty")];
    if (liveValue === "scheduled") options.push(opt("scheduled"));
    return {
      value: liveValue,
      options,
      holder: "operator",
      disabled: false,
      hint: "To free this unit, the operator goes offline or you unassign them.",
    };
  }
  return {
    value: "offline",
    options: [opt("offline")],
    holder: null,
    disabled: true,
    hint: "Becomes available when someone goes live on it.",
  };
}

/** Filter key matching unitStatusChip: "available_now" | "on_job" | "not_bookable". */
export function unitStatusKey(asset) {
  const cv = asset?.customer_view;
  if (!cv) {
    const st = asset?.availability?.state || "offline";
    return st === "on_job" ? "on_job" : st === "offline" ? "not_bookable" : "available_now";
  }
  if (!cv.bookable) return "not_bookable";
  return cv.state === "on_job" ? "on_job" : "available_now";
}

export const UNIT_STATUS_FILTERS = [
  { value: "available_now", label: "Available now" },
  { value: "on_job", label: "On a job" },
  { value: "not_bookable", label: "Not bookable" },
];

/** Map pin tone for the owner fleet map: bookable units only count as available. */
export function unitMapTone(vehicle) {
  const cv = vehicle?.customer_view;
  if (!cv) return null;
  if (!cv.bookable) return "offline";
  return cv.state === "on_job" ? "on_route" : "available";
}

/** Unit photo minimum (doc 12 · 4.3) — same rule as the backend. */
export const MIN_ASSET_PHOTOS = 2;

export function photosMissingNote(asset) {
  const n = (asset?.photos || []).length;
  return n < MIN_ASSET_PHOTOS
    ? `Add at least ${MIN_ASSET_PHOTOS} real photos (${n} uploaded)`
    : "";
}
