/**
 * Backend sets `seekerMarkedCompleteAt` when seeker confirms completion (unlocks Pay).
 * Legacy boolean flags kept for older documents / mocks.
 * @param {Record<string, unknown> | null | undefined} t
 */
function hasSeekerMarkedCompleteAt(t) {
  if (!t || typeof t !== "object") return false;
  const v = t.seekerMarkedCompleteAt;
  if (v == null || v === "") return false;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return true;
  if (typeof v === "string" && v.trim() !== "") return true;
  return false;
}

/**
 * Whether the seeker has already confirmed job/task completion (unlocks Pay on some flows).
 * @param {Record<string, unknown> | null | undefined} t
 */
export function isSeekerConfirmedTaskData(t) {
  if (!t || typeof t !== "object") return false;
  if (hasSeekerMarkedCompleteAt(t)) return true;
  return (
    t.seeker_confirmed_completion === true ||
    t.seekerConfirmedCompletion === true ||
    t.is_seeker_confirmed_complete === true ||
    t.seeker_confirm_complete === true
  );
}

/**
 * Same as task: booking uses `seekerMarkedCompleteAt` from API.
 * @param {Record<string, unknown> | null | undefined} booking
 */
export function isSeekerConfirmedBookingData(booking) {
  if (!booking || typeof booking !== "object") return false;
  if (hasSeekerMarkedCompleteAt(booking)) return true;
  return (
    booking.seeker_confirmed_completion === true ||
    booking.seekerConfirmedCompletion === true ||
    booking.is_seeker_confirmed_complete === true ||
    booking.seeker_confirm_complete === true
  );
}
