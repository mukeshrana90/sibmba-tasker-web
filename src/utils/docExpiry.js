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
