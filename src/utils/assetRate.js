/** "USD 50 / day" from an asset price_hint ({ amount, currency, unit }). Older rows have no unit → per day. */
export function rateUnitOf(hint) {
  return hint?.unit === "hour" ? "hour" : "day";
}

export function formatRate(hint, { negotiable = true } = {}) {
  if (!hint || hint.amount == null || hint.amount === "") return null;
  const base = `${hint.currency || "USD"} ${Number(hint.amount).toLocaleString()} / ${rateUnitOf(hint)}`;
  return negotiable && hint.negotiable ? `${base} (negotiable)` : base;
}
