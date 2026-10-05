/** True when the subscription's `bucket` is at (or over) its plan limit (null limit = unlimited). */
export function isPlanBucketFull(sub, bucket) {
  const max = sub?.plan?.limits?.[bucket];
  if (max == null) return false;
  return (Number(sub?.usage?.[bucket]) || 0) >= max;
}

/** Plan bucket → singular label used in limit messages. */
export const PLAN_BUCKET_LABEL = {
  vehicles: "logistic truck",
  cabs: "cab",
  equipment: "equipment",
  operators: "operator",
};
