import { useEffect, useMemo, useRef, useState } from "react";
import { loadGooglePlaces } from "../utils/landingPlaces";

/** GeoJSON [lng, lat] → { lat, lng } */
export function parseJobCoords(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const COUNTRY_NAMES = new Set([
  "india",
  "zimbabwe",
  "zambia",
  "south africa",
  "botswana",
  "mozambique",
  "namibia",
  "kenya",
  "uganda",
  "tanzania",
]);

/** Common admin/state names (India + Zimbabwe) — used as last resort. */
const STATE_NAMES = new Set([
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
  "delhi",
  "nct of delhi",
  "chandigarh",
  "jammu and kashmir",
  "ladakh",
  "puducherry",
  "harare",
  "bulawayo",
  "manicaland",
  "mashonaland",
  "masvingo",
  "matabeleland",
  "midlands",
]);

const CITY_HINTS = new Set([
  "chandigarh",
  "mohali",
  "greater mohali",
  "panchkula",
  "noida",
  "gurgaon",
  "gurugram",
  "delhi",
  "new delhi",
  "dehradun",
  "ludhiana",
  "amritsar",
  "jaipur",
  "lucknow",
  "kanpur",
  "bareilly",
  "harare",
  "bulawayo",
  "gweru",
  "mutare",
  "masvingo",
]);

function normPart(p) {
  return String(p || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isCountryPart(p) {
  return COUNTRY_NAMES.has(normPart(p).toLowerCase());
}

/** "Punjab 160055" / "160002" / "Uttar Pradesh 243122" — PIN is 6 digits (IN) or 5 (common). */
function stripPostal(p) {
  return normPart(p)
    .replace(/\b\d{6}(-\d{3,4})?\b/g, "")
    .replace(/\b\d{5}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPostalOnly(p) {
  // Prefer 6-digit IN PIN; avoid treating 3–4 digit house numbers as postcodes
  return /^\d{6}(-\d{3,4})?$/.test(normPart(p)) || /^\d{5}$/.test(normPart(p));
}

function isStatePart(p) {
  const s = stripPostal(p).toLowerCase();
  if (!s) return false;
  if (STATE_NAMES.has(s)) return true;
  // "Punjab 160055" already stripped → Punjab
  return false;
}

function isStreetNoise(p) {
  const s = normPart(p);
  if (!s) return true;
  const lower = s.toLowerCase();
  if (isPostalOnly(s)) return true;
  if (
    /^(sector|phase|block|plot|house|road|rd\.?|street|st\.?|ave\.?|avenue|lane|colony|industrial area|ftg|d block|[a-z] block)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/^(sector|phase|block)\s+/i.test(lower)) return true;
  if (/^phase\s*\d+/i.test(lower)) return true;
  // Lone short codes like "7" between commas
  if (/^\d{1,3}[A-Za-z]?$/.test(s)) return true;
  return false;
}

function isPlusCodeToken(p) {
  return /^[A-Z0-9]{2,}\+[A-Z0-9]+/i.test(normPart(p));
}

/**
 * Route-friendly place label from a Google-style address.
 * Prefer: primary + city, else village/locality, else state.
 * e.g. "350, Sector 119, Greater Mohali, …, Punjab …, India" → "350, Greater Mohali"
 */
export function placeShortLabel(address) {
  const raw = String(address || "").trim();
  if (!raw) return "—";

  const rawParts = raw.split(",").map(normPart).filter(Boolean);
  if (!rawParts.length) return "—";

  const parts = rawParts
    .map((p, i) => {
      if (i === 0) return p; // keep house / street / plus-code primary as-is
      if (isPostalOnly(p)) return "";
      return stripPostal(p) || p;
    })
    .filter(Boolean)
    .filter((p) => !isCountryPart(p));

  if (!parts.length) return "—";

  const primary = parts[0];
  const rest = parts.slice(1);

  // Primary already names a place (plus-code + village): "76GF+74 Baderna Khurd"
  if (
    isPlusCodeToken(primary) &&
    /\s[A-Za-z]/.test(primary) &&
    rest.length <= 1
  ) {
    if (rest.length === 1 && isStatePart(rest[0])) {
      return primary;
    }
  }

  let state = null;
  const geo = [];
  for (const p of rest) {
    if (isStatePart(p)) {
      state = stripPostal(p) || p;
      continue;
    }
    if (isStreetNoise(p)) continue;
    if (isPostalOnly(p)) continue;
    geo.push(p);
  }

  let city = null;
  for (const p of geo) {
    if (CITY_HINTS.has(p.toLowerCase())) city = p;
  }
  if (city) {
    if (primary.toLowerCase().includes(city.toLowerCase())) return primary;
    return `${primary}, ${city}`;
  }

  if (geo.length) {
    const locality = geo[geo.length - 1];
    if (
      locality &&
      !primary.toLowerCase().includes(locality.toLowerCase()) &&
      locality.toLowerCase() !== primary.toLowerCase()
    ) {
      return `${primary}, ${locality}`;
    }
  }

  if (state && !primary.toLowerCase().includes(state.toLowerCase())) {
    return `${primary}, ${state}`;
  }

  return primary;
}

function formatCoordPair(pos) {
  if (!pos) return null;
  return `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
}

function haversineKm(a, b) {
  if (!a || !b) return null;
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

function PinIcon({ tone = "pickup" }) {
  const fill = tone === "dropoff" ? "#e11d48" : "#0f5c4c";
  return (
    <svg
      className={`log-route-pin log-route-pin--${tone}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill={fill}
        d="M12 2c-3.9 0-7 3.1-7 7 0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
      />
    </svg>
  );
}

function RouteMap({ pickup, dropoff, distanceLabel }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const overlays = useRef([]);
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.maps
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ready) return undefined;
    let cancelled = false;
    loadGooglePlaces()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!mapRef.current || !ready || !window.google?.maps || !pickup || !dropoff) {
      return undefined;
    }

    overlays.current.forEach((item) => item?.setMap?.(null));
    overlays.current = [];

    const map =
      mapObj.current ||
      new window.google.maps.Map(mapRef.current, {
        center: pickup,
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: "cooperative",
      });
    mapObj.current = map;

    const pickupMarker = new window.google.maps.Marker({
      map,
      position: pickup,
      title: "Pickup",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
    });

    const dropMarker = new window.google.maps.Marker({
      map,
      position: dropoff,
      title: "Drop-off",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#e11d48",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
    });

    overlays.current.push(pickupMarker, dropMarker);

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pickup);
    bounds.extend(dropoff);
    map.fitBounds(bounds, 56);

    const drawStraight = () => {
      const line = new window.google.maps.Polyline({
        path: [pickup, dropoff],
        map,
        geodesic: true,
        strokeColor: "#2563eb",
        strokeOpacity: 0,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              strokeColor: "#2563eb",
              scale: 3,
            },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
      overlays.current.push(line);
    };

    const directions = new window.google.maps.DirectionsService();
    directions.route(
      {
        origin: pickup,
        destination: dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          const renderer = new window.google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: "#2563eb",
              strokeOpacity: 0.85,
              strokeWeight: 4,
            },
          });
          renderer.setDirections(result);
          overlays.current.push(renderer);
        } else {
          drawStraight();
        }
      }
    );

    return () => {
      overlays.current.forEach((item) => item?.setMap?.(null));
      overlays.current = [];
    };
  }, [ready, pickup, dropoff]);

  if (error) {
    return (
      <div className="log-route-map log-route-map--empty">
        Map could not load. Check Google Maps API key.
      </div>
    );
  }

  if (!pickup || !dropoff) {
    return (
      <div className="log-route-map log-route-map--empty">
        Location coordinates are missing for this route.
      </div>
    );
  }

  return (
    <div className="log-route-map-wrap">
      <div ref={mapRef} className="log-route-map" />
      {!ready ? (
        <div className="log-route-map__status">Loading map…</div>
      ) : null}
      {distanceLabel ? (
        <span className="log-route-map__badge">{distanceLabel}</span>
      ) : null}
    </div>
  );
}

/**
 * Pickup / drop-off summary + interactive route map (web version of logistics mobile card).
 */
export default function LogisticsJobRoutePanel({
  pickup,
  dropoff,
  distanceKm,
}) {
  const pickupPos = useMemo(
    () => parseJobCoords(pickup?.coordinates),
    [pickup]
  );
  const dropoffPos = useMemo(
    () => parseJobCoords(dropoff?.coordinates),
    [dropoff]
  );

  const computedKm = useMemo(() => {
    if (distanceKm != null && Number.isFinite(Number(distanceKm))) {
      return Number(distanceKm);
    }
    return haversineKm(pickupPos, dropoffPos);
  }, [distanceKm, pickupPos, dropoffPos]);

  const distanceLabel =
    computedKm != null && Number.isFinite(computedKm)
      ? `~${Math.round(computedKm)} km`
      : null;

  return (
    <section className="log-route-panel" aria-label="Pickup and delivery route">
      <div className="log-route-panel__ends">
        <div className="log-route-end">
          <div className="log-route-end__label">
            <PinIcon tone="pickup" />
            <span>Pickup</span>
          </div>
          <strong>{placeShortLabel(pickup?.address)}</strong>
          <p className="log-route-end__addr">{pickup?.address || "—"}</p>
          {pickupPos ? (
            <span className="log-route-end__coords">
              {formatCoordPair(pickupPos)}
            </span>
          ) : null}
        </div>
        <div className="log-route-end">
          <div className="log-route-end__label">
            <PinIcon tone="dropoff" />
            <span>Drop-off</span>
          </div>
          <strong>{placeShortLabel(dropoff?.address)}</strong>
          <p className="log-route-end__addr">{dropoff?.address || "—"}</p>
          {dropoffPos ? (
            <span className="log-route-end__coords">
              {formatCoordPair(dropoffPos)}
            </span>
          ) : null}
        </div>
      </div>
      <RouteMap
        pickup={pickupPos}
        dropoff={dropoffPos}
        distanceLabel={distanceLabel}
      />
    </section>
  );
}
