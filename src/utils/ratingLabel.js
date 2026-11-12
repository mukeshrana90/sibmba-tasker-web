export const NEW_RATING_LABEL = "New";

/** No count supplied: the average decides. A count of 0 always means no reviews yet. */
export function hasReviews(average, count) {
  const n = count === undefined || count === null || count === "" ? NaN : Number(count);
  return Number.isFinite(n) ? n > 0 : Number(average) > 0;
}

/** "New" until the first review, else "4.5" plus any suffix (" ★"). */
export function ratingLabel(average, count, suffix = "") {
  if (!hasReviews(average, count)) return NEW_RATING_LABEL;
  return `${(Number(average) || 0).toFixed(1)}${suffix}`;
}
