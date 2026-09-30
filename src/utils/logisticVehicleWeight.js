/**
 * Truck body type (fleet Type / customer Truck type).
 * Capacity tiers (customer Vehicle needed) derived from asset capacity tons.
 */

export const TRUCK_BODY_TYPES = [
  "Regular",
  "Flatbed",
  "Refrigerated",
  "Container"
];

/** Capacity buckets shown as Vehicle needed (post + search). */
export const CAPACITY_TIER_OPTIONS = [
  "below 2 ton",
  "4 ton",
  "6 ton",
  "10 ton",
  "20 ton",
  "50 ton",
];

/** @deprecated alias — Vehicle needed is capacity tiers now */
export const LOGISTIC_VEHICLE_OPTIONS = CAPACITY_TIER_OPTIONS;

const TIER_MAX = [
  { label: "below 2 ton", max: 2 },
  { label: "4 ton", max: 4 },
  { label: "6 ton", max: 6 },
  { label: "10 ton", max: 10 },
  { label: "20 ton", max: 20 },
  { label: "50 ton", max: 50 },
];

const TIER_SET = new Set(CAPACITY_TIER_OPTIONS);
const BODY_SET = new Set(TRUCK_BODY_TYPES.map((t) => t.toLowerCase()));

export function toTonsValue(value, unit = "tons") {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const u = String(unit || "tons").toLowerCase();
  if (u === "kg" || u === "kilogram" || u === "kilograms") return n / 1000;
  return n;
}

/** Max tons allowed for a Vehicle needed label. */
export function vehicleMaxTons(vehicleNeeded) {
  const v = String(vehicleNeeded || "").trim().toLowerCase();
  if (!v) return 50;
  const below = v.match(/below\s*(\d+(?:\.\d+)?)\s*ton/);
  if (below) return Number(below[1]);
  const tonMatch = v.match(/(\d+(?:\.\d+)?)\s*ton/);
  if (tonMatch) return Number(tonMatch[1]);
  // Legacy labels
  if (/curtain|flatbed|refrigerat|below\s*5/i.test(v)) return 5;
  if (/tipper|10\s*ton/i.test(v)) return 10;
  return 50;
}

/**
 * Map asset capacity (tons) → Vehicle needed tier.
 * 1.5 → below 2 ton; 25.5 → 50 ton (above 20, up to 50).
 */
export function capacityToTier(tons) {
  if (tons == null || !Number.isFinite(Number(tons)) || Number(tons) < 0) {
    return null;
  }
  const t = Number(tons);
  for (const row of TIER_MAX) {
    if (t <= row.max + 1e-9) return row.label;
  }
  return "50 ton";
}

/** Inclusive capacity range for a tier label (for search filters). */
export function tierCapacityRange(tierLabel) {
  const label = String(tierLabel || "").trim().toLowerCase();
  let prev = 0;
  for (const row of TIER_MAX) {
    if (row.label === label || row.label.toLowerCase() === label) {
      return { min: prev + (prev === 0 ? 0 : 1e-9), max: row.max, exclusiveMin: prev > 0 };
    }
    prev = row.max;
  }
  return null;
}

/** Mongo-friendly range: below 2 → (0, 2]; 4 ton → (2, 4]; … */
export function tierCapacityQuery(tierLabel) {
  const label = String(tierLabel || "").trim().toLowerCase();
  let prev = 0;
  for (const row of TIER_MAX) {
    if (row.label === label || row.label.toLowerCase() === label) {
      if (prev === 0) {
        return { $gt: 0, $lte: row.max };
      }
      return { $gt: prev, $lte: row.max };
    }
    prev = row.max;
  }
  return null;
}

export function assetMaxTons(asset, vehicleNeededFallback) {
  const cap = asset?.capacity;
  if (cap?.value != null && cap.value !== "") {
    const tons = toTonsValue(cap.value, cap.unit || "tons");
    if (tons != null && tons > 0) return tons;
  }
  return vehicleMaxTons(
    vehicleNeededFallback ||
      capacityToTier(
        toTonsValue(
          Array.isArray(asset?.capabilities) ? null : null
        )
      ) ||
      "50 ton"
  );
}

export function assetCapacityTons(asset) {
  const cap = asset?.capacity;
  if (cap?.value == null || cap.value === "") return null;
  return toTonsValue(cap.value, cap.unit || "tons");
}

export function assetBodyType(asset) {
  const caps = asset?.capabilities || [];
  for (const raw of caps) {
    const c = String(raw || "").trim();
    if (!c) continue;
    const lower = c.toLowerCase();
    if (
      lower.startsWith("subtype:") ||
      lower.startsWith("mobility:") ||
      lower.startsWith("engine:") ||
      lower.startsWith("vin:")
    ) {
      continue;
    }
    if (BODY_SET.has(lower) || TRUCK_BODY_TYPES.includes(c)) return c;
  }
  return "";
}

/** Vehicle needed options for a given package weight (tons). */
export function vehiclesForWeightTons(tons) {
  if (tons == null || !(tons > 0)) return [...CAPACITY_TIER_OPTIONS];
  const tier = capacityToTier(tons);
  if (!tier) return [...CAPACITY_TIER_OPTIONS];
  const idx = CAPACITY_TIER_OPTIONS.indexOf(tier);
  if (idx < 0) return [...CAPACITY_TIER_OPTIONS];
  // Allow selected tier and larger (can still carry the load)
  return CAPACITY_TIER_OPTIONS.slice(idx);
}

export function suggestVehicleForWeight(tons, currentVehicle) {
  const current = String(currentVehicle || "").trim();
  if (tons == null || !(tons > 0)) {
    return TIER_SET.has(current) ? current : "below 2 ton";
  }
  const suggested = capacityToTier(tons) || "50 ton";
  if (TIER_SET.has(current) && vehicleMaxTons(current) >= tons - 1e-9) {
    return current;
  }
  return suggested;
}

export function weightExceedsVehicle(tons, vehicleNeeded) {
  if (tons == null || !(tons > 0)) return false;
  const max = vehicleMaxTons(vehicleNeeded);
  return tons > max + 1e-9;
}

export function weightExceedsMax(tons, maxTons) {
  if (tons == null || !(tons > 0) || maxTons == null || !(maxTons > 0)) {
    return false;
  }
  return tons > maxTons + 1e-9;
}

export function isTruckBodyType(value) {
  const v = String(value || "").trim();
  return TRUCK_BODY_TYPES.includes(v) || BODY_SET.has(v.toLowerCase());
}

export function normalizeTruckBodyType(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  const hit = TRUCK_BODY_TYPES.find((t) => t.toLowerCase() === v.toLowerCase());
  return hit || v;
}

/** Migrate legacy Vehicle needed labels toward a capacity tier when possible. */
export function normalizeVehicleNeededLabel(raw) {
  const v = String(raw || "").trim();
  if (!v) return "below 2 ton";
  if (TIER_SET.has(v)) return v;
  const lower = v.toLowerCase();
  if (TIER_SET.has(lower)) {
    return CAPACITY_TIER_OPTIONS.find((t) => t.toLowerCase() === lower) || v;
  }
  if (isTruckBodyType(v)) return "below 2 ton";
  const max = vehicleMaxTons(v);
  return capacityToTier(max) || "below 2 ton";
}
