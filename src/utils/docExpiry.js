/**
 * Document expiry status (mirrors backend utils/logistics/docCompliance.js).
 * Day rule (Africa/Harare): valid through the expiry day ("Expires today"),
 * expired from the next day. Expiry is stored as UTC midnight of the picked
 * YYYY-MM-DD, so it is compared as a calendar date.
 */
export const ASSET_COMPLIANCE_TYPES = ["insurance", "rego", "roadworthy", "taxi_permit"];
export const OPERATOR_COMPLIANCE_TYPES = ["licence", "medical"];
export const REMINDER_HINT = "Reminders go to you and the operator 30, 14, 7 and 1 days before expiry.";

const DAY = 86400000;

function harareTodayYmd(now = Date.now()) {
  return new Date(now + 2 * 3600000).toISOString().slice(0, 10);
}

export function expiryYmd(expires) {
  if (!expires) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(expires))) return String(expires);
  const d = new Date(expires);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function fmtExpiry(expires) {
  const ymd = expiryYmd(expires);
  if (!ymd) return "";
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** { status: valid | expiring | today | expired | no_expiry, days_left } */
export function docExpiryStatus(expires, now = Date.now()) {
  const ymd = expiryYmd(expires);
  if (!ymd) return { status: "no_expiry", days_left: null };
  const left = Math.round((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${harareTodayYmd(now)}T00:00:00Z`)) / DAY);
  if (left < 0) return { status: "expired", days_left: left };
  if (left === 0) return { status: "today", days_left: 0 };
  if (left <= 30) return { status: "expiring", days_left: left };
  return { status: "valid", days_left: left };
}

/** Chip text + tone for a document's expiry. */
export function docExpiryChip(expires) {
  const { status, days_left } = docExpiryStatus(expires);
  if (status === "no_expiry") return { label: "No expiry set", tone: "muted", status };
  if (status === "expired") return { label: `Expired ${fmtExpiry(expires)}`, tone: "closed", status };
  if (status === "today") return { label: "Expires today", tone: "progress", status };
  if (status === "expiring") {
    return { label: `Expires in ${days_left} day${days_left === 1 ? "" : "s"}`, tone: "progress", status };
  }
  return { label: `Valid until ${fmtExpiry(expires)}`, tone: "done", status };
}

/** "YYYY-MM-DD" of tomorrow in Harare — the earliest expiry a new document may have (v2.7.49). */
export function tomorrowYmd(now = Date.now()) {
  return new Date(Date.parse(`${harareTodayYmd(now)}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
}

/**
 * v2.7.49 client rules — which documents block work:
 *  - road units (truck / cab): Road licence (ZINARA) required; roadworthy too on red-plate vehicles
 *  - equipment: none
 *  - operators: driving / plant licence (medical fitness is optional)
 * Every other document is supporting only.
 */
export const OPERATOR_BLOCKING_TYPES = ["licence"];

export function assetBlockingTypes(kind, redPlate) {
  if (kind === "equipment" || kind === "plant") return [];
  return ["rego", ...(redPlate ? ["roadworthy"] : [])];
}

/** Short role of a document under the rules above (shown next to its label). */
export function docRuleHint(type, { kind = "vehicle", redPlate = false, operator = false } = {}) {
  if (operator) {
    if (type === "licence") return "Required to go live";
    if (type === "medical") return "Optional";
    return "Supporting document";
  }
  if (assetBlockingTypes(kind, redPlate).includes(type)) {
    return type === "rego" ? "Required to take work" : "Required for red-plate vehicles";
  }
  if (type === "roadworthy") return "Needed for red-plate vehicles";
  return "Supporting document";
}

/** Chip for the Simba document check (review), or null when not checked yet / old upload. */
export function docReviewChip(review) {
  const s = review?.status;
  if (s === "pending") return { label: "Pending Simba check", tone: "progress" };
  if (s === "verified") return { label: "Verified by Simba", tone: "done" };
  if (s === "rejected") return { label: `Rejected${review.reason ? `: ${review.reason}` : ""}`, tone: "closed" };
  return null;
}
