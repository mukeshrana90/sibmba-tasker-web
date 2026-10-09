/**
 * Owner screens: why customers can't book a unit right now (v2.7.30 rule —
 * a unit is bookable only while an assigned operator is live on it).
 * Returns "" when bookable or unknown.
 */
export function notBookableReason(asset) {
  const cv = asset?.customer_view;
  if (!cv || cv.bookable) return "";
  if (cv.status_detail === "No operator assigned") return "Not bookable — no operator assigned";
  if (cv.status_detail === "Operator not online on this unit") {
    return "Not bookable — no operator is live on this unit";
  }
  if (cv.state === "scheduled") return "Not bookable — scheduled";
  return "Not bookable — offline";
}
