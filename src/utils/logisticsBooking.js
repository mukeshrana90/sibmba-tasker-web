/**
 * Customer "Book" gate for a logistics asset — mirrors backend assetBookable
 * (utils/logistics/availability.js). Customer-facing state already maps
 * returning_empty → available_now and an operator-less truck → offline.
 *
 * available_now / returning_empty → Book
 * on_job (operator busy)          → Book + "acceptance may take longer" notice
 * offline / scheduled             → blocked
 */
export function assetBookState(asset) {
  const availability = asset?.availability || {};
  const state = availability.state || "offline";

  if (asset?.direct_booking_enabled === false) {
    return { canBook: false, blockedReason: "Direct booking is off for this unit" };
  }
  if (asset?.is_active != null && Number(asset.is_active) !== 1) {
    return { canBook: false, blockedReason: "Booking unavailable right now" };
  }

  const bookable =
    availability.bookable ??
    asset?.bookable ??
    (state === "available_now" || state === "on_job");

  if (!bookable) {
    let blockedReason = "Operator offline — booking unavailable right now";
    if (state === "scheduled") {
      blockedReason = "Scheduled — not taking bookings yet";
    } else if (availability.status_detail === "No operator assigned") {
      blockedReason = "No operator assigned — booking unavailable right now";
    }
    return { canBook: false, blockedReason };
  }

  return {
    canBook: true,
    delayedNotice:
      state === "on_job"
        ? "The operator is currently on another job — you can still book. Acceptance may take longer: the owner will confirm or assign another operator."
        : null,
  };
}
