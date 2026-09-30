const DRAFT_KEY = "logistics_search_filters_v1";

const CATEGORIES = new Set([
  "logistic",
  "agricultural",
  "construction",
  "industrial",
  "cab",
]);

function validCoords(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  return Number.isFinite(lng) && Number.isFinite(lat);
}

export function loadLogisticsSearchDraft(defaults) {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...defaults };

    const category = CATEGORIES.has(parsed.category)
      ? parsed.category
      : defaults.category;
    const location = String(parsed.location || "").trim();
    const location_coords = validCoords(parsed.location_coords)
      ? [Number(parsed.location_coords[0]), Number(parsed.location_coords[1])]
      : null;

    return {
      ...defaults,
      category,
      location: location_coords ? location : "",
      location_coords: location_coords && location ? location_coords : null,
      radius_km: String(parsed.radius_km || defaults.radius_km),
      name: String(parsed.name || ""),
      truck_type: String(parsed.truck_type || ""),
      vehicle_needed: String(parsed.vehicle_needed || ""),
      equipment: String(parsed.equipment || ""),
      subtype: String(parsed.subtype || ""),
    };
  } catch {
    return { ...defaults };
  }
}

export function saveLogisticsSearchDraft(filters) {
  try {
    if (!filters || typeof filters !== "object") return;
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        category: filters.category,
        location: filters.location || "",
        location_coords: validCoords(filters.location_coords)
          ? [
              Number(filters.location_coords[0]),
              Number(filters.location_coords[1]),
            ]
          : null,
        radius_km: filters.radius_km,
        name: filters.name || "",
        truck_type: filters.truck_type || "",
        vehicle_needed: filters.vehicle_needed || "",
        equipment: filters.equipment || "",
        subtype: filters.subtype || "",
      })
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearLogisticsSearchDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
