/**
 * Whether the seeker has already confirmed job/task completion (unlocks Pay on some flows).
 * @param {Record<string, unknown> | null | undefined} t
 */
export function isSeekerConfirmedTaskData(t) {
  if (!t || typeof t !== "object") return false;
  return (
    t.seeker_confirmed_completion === true ||
    t.seekerConfirmedCompletion === true ||
    t.is_seeker_confirmed_complete === true ||
    t.seeker_confirm_complete === true
  );
}
