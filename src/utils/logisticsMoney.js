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

/**
 * Typed money while editing: sanitized, "." → "0.", no leading zeros ("05" → "5").
 * Keeps intermediate states like "53." so the next digit lands in the decimals.
 */
export function normalizeTypedMoney(raw) {
  let s = sanitizeMoneyInput(raw);
  if (s.startsWith(".")) s = `0${s}`;
  return s.replace(/^0+(?=\d)/, "");
}

/**
 * Live ".00" mask: `text` = what the field shows, `pad` = the auto-filled zeros
 * after the typed part ("53" → 53.00 / pad ".00"; "53.2" → 53.20 / pad "0").
 * The caret stays before `pad`, so typing "53" then ".24" reads 53.00 → 53.24.
 */
export function moneyInputMask(raw) {
  const typed = raw == null ? "" : String(raw);
  if (typed === "") return { text: "", pad: "" };
  const dot = typed.indexOf(".");
  const pad = dot < 0 ? ".00" : "0".repeat(Math.max(0, 2 - (typed.length - dot - 1)));
  return { text: typed + pad, pad };
}

/** Typed value to resume editing a formatted one ("53.00" → "53", "53.20" → "53.2"). */
export function editableMoneyValue(raw) {
  const s = raw == null ? "" : String(raw);
  if (!/^\d+\.\d{2}$/.test(s)) return s;
  return s.replace(/\.?0+$/, "");
}
