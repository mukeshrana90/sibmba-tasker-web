/**
 * One price everywhere for a logistics job (v2.7.49).
 *
 * The API sends `job.price_summary` = { budget, agreed, priority_fee, total,
 * fee_in_total, stage }. Before a quote is accepted the customer's Budget is
 * shown; once accepted, the Agreed price (accepted quote). A priority job adds
 * its fee (paid to the equipment owner) and a Total line.
 * Older payloads without price_summary fall back to budget / assigned.amount.
 */

function money(value, currency) {
  const n = Number(value);
  if (value == null || value === "" || !Number.isFinite(n)) return null;
  return { value: Math.round(n * 100) / 100, currency: currency || "USD" };
}

/** "USD 120" / "USD 12.5" — same style as the quotes list. */
export function formatPrice(price, suffix = "") {
  if (!price || price.value == null) return null;
  const n = Number(price.value);
  if (!Number.isFinite(n)) return null;
  return `${price.currency || "USD"} ${n.toFixed(2).replace(/\.00$/, "")}${suffix}`;
}

/** price_summary from the API, or the same figures worked out locally. */
export function jobPriceSummary(job) {
  if (job?.price_summary && typeof job.price_summary === "object") {
    return job.price_summary;
  }
  const budget = money(job?.budget?.amount, job?.budget?.currency);
  const agreed = money(job?.assigned?.amount?.value, job?.assigned?.amount?.currency);
  const fee =
    job?.priority && Number(job?.priority_fee?.value) > 0
      ? money(job.priority_fee.value, job.priority_fee.currency)
      : null;
  const base = agreed || budget;
  const feeInTotal = Boolean(base && fee && fee.currency === base.currency);
  return {
    budget,
    agreed,
    priority_fee: fee,
    total: base
      ? feeInTotal
        ? money(base.value + fee.value, base.currency)
        : { ...base }
      : null,
    fee_in_total: feeInTotal,
    stage: agreed ? "agreed" : "budget",
  };
}

function rateSuffix(job) {
  const unit = job?.budget?.rate_unit;
  return unit === "hour" ? " / hour" : unit === "day" ? " / day" : "";
}

/**
 * @returns {{
 *   lines: { key: string, label: string, value: string }[],
 *   headline: string|null,   // total when present, else agreed, else budget
 *   baseLabel: "Budget"|"Agreed price",
 *   stage: "budget"|"agreed",
 *   fee: string|null,        // formatted priority fee
 *   summary: object
 * }}
 */
export function jobPriceLines(job) {
  const summary = jobPriceSummary(job);
  const suffix = rateSuffix(job);
  const agreed = summary.stage === "agreed" && summary.agreed;
  const base = agreed ? summary.agreed : summary.budget;
  const baseLabel = agreed ? "Agreed price" : "Budget";
  const fee = summary.priority_fee || null;
  const lines = [];
  if (base) lines.push({ key: agreed ? "agreed" : "budget", label: baseLabel, value: formatPrice(base, suffix) });
  if (fee) lines.push({ key: "priority_fee", label: "Priority fee", value: formatPrice(fee) });
  if (fee && summary.fee_in_total && summary.total) {
    lines.push({ key: "total", label: "Total", value: formatPrice(summary.total, suffix) });
  }
  const headlinePrice =
    (fee && summary.fee_in_total && summary.total) || summary.agreed || summary.budget || null;
  return {
    lines,
    headline: formatPrice(headlinePrice, suffix),
    baseLabel,
    stage: agreed ? "agreed" : "budget",
    fee: formatPrice(fee),
    summary,
  };
}

/**
 * Short price for operator / owner lists: agreed once accepted, else budget,
 * plus a "+ USD 5 priority" hint for priority jobs.
 */
export function jobListPrice(job) {
  const { summary } = jobPriceLines(job);
  const base = summary.stage === "agreed" && summary.agreed ? summary.agreed : summary.budget;
  const fee = summary.priority_fee ? formatPrice(summary.priority_fee) : null;
  return {
    price: formatPrice(base, rateSuffix(job)),
    priorityHint: fee ? `+ ${fee} priority` : null,
    agreed: summary.stage === "agreed",
  };
}

/** Add the job's priority fee to another amount (e.g. hire completion amount). */
export function withPriorityFee(job, price) {
  const p = money(price?.value, price?.currency);
  if (!p) return { amount: null, fee: null, total: null };
  const { summary } = jobPriceLines(job);
  const fee = summary.priority_fee;
  const sameCurrency = fee && (fee.currency || "USD") === p.currency;
  return {
    amount: formatPrice(p),
    fee: sameCurrency ? formatPrice(fee) : null,
    total: sameCurrency ? formatPrice(money(p.value + Number(fee.value), p.currency)) : formatPrice(p),
  };
}
