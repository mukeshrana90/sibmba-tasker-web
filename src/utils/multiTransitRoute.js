/** GeoJSON [lng, lat] → { lat, lng } */
function parseJobCoords(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Haversine distance in km */
export function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Whether pickup / drop icons are still "active" vs faded (done).
 * Pick fades once loaded/in transit/done (status >= 3).
 * Drop fades once delivered (status >= 5).
 */
export function stopIconState(job, kind) {
  const s = Number(job?.status);
  if (kind === "pickup") {
    return s >= 3 ? "done" : "active";
  }
  return s >= 5 ? "done" : "active";
}

/**
 * Build ordered stop list from truck GPS using nearest open pick/drop.
 * Same-job drop is only unlocked after that job's pickup is visited (or already loaded).
 */
export function buildNearestMultiTransitRoute(jobs = [], origin = null) {
  const pending = [];
  (jobs || []).forEach((job) => {
    const s = Number(job?.status);
    if (s >= 5 || s === 6 || s === 7) return;
    const pickup = parseJobCoords(job?.pickup?.coordinates);
    const dropoff = parseJobCoords(job?.dropoff?.coordinates);
    const jobId = String(job._id);
    if (s < 3 && pickup) {
      pending.push({
        key: `${jobId}:pick`,
        jobId,
        job,
        kind: "pickup",
        lat: pickup.lat,
        lng: pickup.lng,
        unlocked: true,
        label: job.job_number || job.load_type || "Job",
        address: job.pickup?.address || "",
      });
      if (dropoff) {
        pending.push({
          key: `${jobId}:drop`,
          jobId,
          job,
          kind: "dropoff",
          lat: dropoff.lat,
          lng: dropoff.lng,
          unlocked: false,
          label: job.job_number || job.load_type || "Job",
          address: job.dropoff?.address || "",
        });
      }
    } else if (s >= 3 && s < 5 && dropoff) {
      pending.push({
        key: `${jobId}:drop`,
        jobId,
        job,
        kind: "dropoff",
        lat: dropoff.lat,
        lng: dropoff.lng,
        unlocked: true,
        label: job.job_number || job.load_type || "Job",
        address: job.dropoff?.address || "",
      });
    }
  });

  const start =
    origin &&
    Number.isFinite(Number(origin.lat)) &&
    Number.isFinite(Number(origin.lng))
      ? { lat: Number(origin.lat), lng: Number(origin.lng) }
      : pending[0]
        ? { lat: pending[0].lat, lng: pending[0].lng }
        : null;

  if (!start || !pending.length) {
    return { origin: start, stops: [], totalKm: 0 };
  }

  const remaining = pending.map((p) => ({ ...p }));
  const stops = [];
  let cursor = start;
  let totalKm = 0;

  while (remaining.some((s) => s.unlocked)) {
    let bestIdx = -1;
    let bestDist = Infinity;
    remaining.forEach((stop, i) => {
      if (!stop.unlocked) return;
      const d = haversineKm(cursor, stop);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    if (bestIdx < 0) break;
    const next = remaining.splice(bestIdx, 1)[0];
    totalKm += Number.isFinite(bestDist) ? bestDist : 0;
    stops.push({
      ...next,
      step: stops.length + 1,
      distance_from_prev_km: Number.isFinite(bestDist)
        ? Math.round(bestDist * 10) / 10
        : null,
    });
    cursor = { lat: next.lat, lng: next.lng };
    if (next.kind === "pickup") {
      remaining.forEach((s) => {
        if (s.jobId === next.jobId && s.kind === "dropoff") s.unlocked = true;
      });
    }
  }

  return { origin: start, stops, totalKm: Math.round(totalKm * 10) / 10 };
}

export function multiStopMapsUrl(origin, stops = []) {
  if (!origin || !stops.length) return null;
  const pts = [
    `${origin.lat},${origin.lng}`,
    ...stops.map((s) => `${s.lat},${s.lng}`),
  ];
  if (pts.length === 2) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      pts[0]
    )}&destination=${encodeURIComponent(pts[1])}&travelmode=driving`;
  }
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(1, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    pts[0]
  )}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(
    waypoints
  )}&travelmode=driving`;
}

/** Ordered waypoints for one common driving route: truck → stops. */
export function planWaypoints(plan) {
  if (!plan) return [];
  const pts = [];
  if (
    plan.origin &&
    Number.isFinite(Number(plan.origin.lat)) &&
    Number.isFinite(Number(plan.origin.lng))
  ) {
    pts.push({
      lat: Number(plan.origin.lat),
      lng: Number(plan.origin.lng),
    });
  }
  (plan.stops || []).forEach((s) => {
    if (Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng))) {
      pts.push({ lat: Number(s.lat), lng: Number(s.lng) });
    }
  });
  return pts;
}

function roundKm(km) {
  return Math.round(Number(km) * 10) / 10;
}

/**
 * Google Directions (driving) for a fixed stop order — one continuous road path.
 * Optional; multi-transit prefers OSRM to avoid Maps JS Auth/Script errors on Leaflet pages.
 * Does not re-order waypoints (optimizeWaypoints: false).
 */
async function fetchGoogleDrivingRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;
  if (typeof window === "undefined") return null;
  // Skip when Directions is not already available — do not inject Maps JS here
  // (cross-origin Maps failures surface as opaque "Script error" in CRA overlay).
  if (!window.google?.maps?.DirectionsService) return null;

  // Google allows up to 25 intermediate waypoints.
  if (waypoints.length > 27) return null;

  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const service = new window.google.maps.DirectionsService();
      const request = {
        origin: waypoints[0],
        destination: waypoints[waypoints.length - 1],
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      };
      if (waypoints.length > 2) {
        request.waypoints = waypoints.slice(1, -1).map((location) => ({
          location,
          stopover: true,
        }));
      }
      service.route(request, (result, status) => {
        try {
          if (status !== "OK" || !result?.routes?.[0]) {
            done(null);
            return;
          }
          const route = result.routes[0];
          const path = [];
          const legDistancesKm = [];
          const pushLatLng = (ll) => {
            if (!ll) return;
            const lat = typeof ll.lat === "function" ? ll.lat() : Number(ll.lat);
            const lng = typeof ll.lng === "function" ? ll.lng() : Number(ll.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) path.push([lat, lng]);
          };
          (route.legs || []).forEach((leg) => {
            if (leg?.distance?.value != null) {
              legDistancesKm.push(leg.distance.value / 1000);
            } else {
              legDistancesKm.push(null);
            }
            (leg.steps || []).forEach((step) => {
              (step.path || []).forEach(pushLatLng);
            });
          });
          if (!path.length && route.overview_path?.length) {
            route.overview_path.forEach(pushLatLng);
          }
          const totalKm = legDistancesKm.reduce(
            (sum, d) => sum + (Number.isFinite(d) ? d : 0),
            0
          );
          done({
            path,
            totalKm,
            legDistancesKm,
            source: "google",
          });
        } catch {
          done(null);
        }
      });
    } catch {
      done(null);
    }
  });
}

/**
 * OSRM driving route for a fixed stop order (OSM roads). Fallback when Google fails.
 */
async function fetchOsrmDrivingRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;
  const coords = waypoints
    .map((w) => `${Number(w.lng).toFixed(6)},${Number(w.lat).toFixed(6)}`)
    .join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    const path = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const legDistancesKm = (route.legs || []).map((leg) =>
      leg?.distance != null ? leg.distance / 1000 : null
    );
    return {
      path,
      totalKm: (route.distance || 0) / 1000,
      legDistancesKm,
      source: "osrm",
    };
  } catch {
    return null;
  }
}

/**
 * One road-following driving path for the suggested stop order.
 * Prefer OSRM (matches Leaflet/OSM map; no Maps JS). Use Google only if already loaded.
 * Never reorders stops.
 */
export async function fetchDrivingRouteForPlan(plan) {
  const waypoints = planWaypoints(plan);
  if (waypoints.length < 2) return null;
  try {
    const osrm = await fetchOsrmDrivingRoute(waypoints);
    if (osrm?.path?.length) return osrm;
  } catch {
    /* fall through */
  }
  try {
    const google = await fetchGoogleDrivingRoute(waypoints);
    if (google?.path?.length) return google;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Attach road polyline + road km to a nearest-neighbour plan.
 * Falls back to straight-line distances already on the plan.
 */
export async function enrichPlanWithRoadRoute(plan) {
  if (!plan?.stops?.length) {
    return {
      ...plan,
      roadPath: null,
      distanceSource: "none",
    };
  }
  const road = await fetchDrivingRouteForPlan(plan);
  if (!road?.path?.length) {
    return {
      ...plan,
      roadPath: null,
      distanceSource: "straight_line",
    };
  }
  const stops = (plan.stops || []).map((stop, i) => {
    const d = road.legDistancesKm?.[i];
    return {
      ...stop,
      distance_from_prev_km: Number.isFinite(d)
        ? roundKm(d)
        : stop.distance_from_prev_km,
    };
  });
  return {
    ...plan,
    stops,
    totalKm: roundKm(road.totalKm),
    roadPath: road.path,
    distanceSource: road.source || "road",
  };
}
