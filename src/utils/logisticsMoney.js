/** Logistics money: max 2 decimals, max 99999.99 */

export const LOGISTICS_MONEY_MAX = 99999.99;

export function roundMoney2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function hasAtMostTwoDecimals(n) {
  if (!Number.isFinite(n)) return false;
  const scaled = n * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

/**
 * Sanitize typed money input: strip invalid chars, cap decimals at 2, clamp max.
 * Allows intermediate strings like "12." while typing.
 */
export function sanitizeMoneyInput(raw) {
  let s = String(raw ?? "")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");
  if (s === "") return "";
  const dot = s.indexOf(".");
  if (dot >= 0) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  }
  const n = Number(s);
  if (Number.isFinite(n) && n > LOGISTICS_MONEY_MAX) {
    return String(LOGISTICS_MONEY_MAX);
  }
  return s;
}

/**
 * @returns {{ ok: true, value: number } | { ok: false, message: string }}
 */
export function parseLogisticsMoney(raw, { field = "Amount", allowZero = false } = {}) {
  if (raw === "" || raw == null) {
    return { ok: false, message: `${field} is required` };
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, message: `Enter a valid ${field.toLowerCase()}` };
  }
  if (allowZero ? n < 0 : n <= 0) {
    return {
      ok: false,
      message: allowZero
        ? `${field} cannot be negative`
        : `${field} must be greater than 0`,
    };
  }
  if (n > LOGISTICS_MONEY_MAX) {
    return {
      ok: false,
      message: `${field} cannot exceed ${LOGISTICS_MONEY_MAX}`,
    };
  }
  if (!hasAtMostTwoDecimals(n)) {
    return {
      ok: false,
      message: `${field} can have at most 2 digits after the decimal`,
    };
  }
  return { ok: true, value: roundMoney2(n) };
}

/** Format for display / edit fields: always 2 decimals (25 → "25.00"). */
export function formatMoneyInputValue(raw) {
  if (raw === "" || raw == null) return "";
  if (String(raw).trim() === ".") return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return roundMoney2(Math.min(Math.max(n, 0), LOGISTICS_MONEY_MAX)).toFixed(2);
}
