/** Registration / chassis: A–Z and 0–9 only, uppercased. */
export function normalizePlateInput(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function isValidPlateChars(value) {
  if (!value) return true;
  return /^[A-Z0-9]+$/.test(value);
}

const KG_PER_TON = 1000;

export function toTons(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return unit === "kg" ? n / KG_PER_TON : n;
}

export function formatTons(tons) {
  if (tons == null) return "";
  const rounded = Math.round(tons * 10000) / 10000;
  return `${rounded} ton${rounded === 1 ? "" : "s"}`;
}
