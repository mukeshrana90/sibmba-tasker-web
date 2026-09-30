/**
 * Cab fare guide — mirrors backend cabService.estimateRideFare so the minimum
 * shown here is exactly what POST /job enforces. Rates/factor come from
 * GET /logistics/session config (cab_classes[].fare, cab_road_distance_factor).
 */
const EARTH_KM = 6371;

function haversineKm(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) return null;
  const [lng1, lat1] = a.map(Number);
  const [lng2, lat2] = b.map(Number);
  if (![lng1, lat1, lng2, lat2].every(Number.isFinite)) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const ceil10 = (n) => Math.ceil(n * 10 - 1e-9) / 10;

export function estimateRideFare(classMeta, pickupCoords, dropoffCoords, roadFactor = 1.3) {
  const fare = classMeta?.fare;
  const straight = haversineKm(pickupCoords, dropoffCoords);
  if (!fare || straight == null) return null;
  const distance_km = Math.round(straight * (Number(roadFactor) || 1.3) * 10) / 10;
  const min = ceil10(Math.max(fare.min_fare, distance_km * fare.min_per_km));
  const max = Math.max(min, ceil10(distance_km * fare.max_per_km));
  // Rates first so the computed min/max aren't overwritten by the class floor
  return {
    min_per_km: fare.min_per_km,
    max_per_km: fare.max_per_km,
    fare_floor: fare.min_fare,
    distance_km,
    min_fare: min,
    max_fare: max,
  };
}

export function formatFare(n, currency = "USD") {
  return `${currency} ${Number(n || 0).toFixed(2)}`;
}
