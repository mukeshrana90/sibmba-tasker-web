import { geocodeFreeText } from "./landingPlaces";

const ZIM_CITIES = {
  harare: { lat: -17.8252, lng: 31.0335, label: "Harare" },
  bulawayo: { lat: -20.1556, lng: 28.5823, label: "Bulawayo" },
  mutare: { lat: -18.9707, lng: 32.6709, label: "Mutare" },
  gweru: { lat: -19.455, lng: 29.815, label: "Gweru" },
  kwekwe: { lat: -18.928, lng: 29.815, label: "Kwekwe" },
  masvingo: { lat: -20.0744, lng: 30.8328, label: "Masvingo" },
  chitungwiza: { lat: -18.0127, lng: 31.0756, label: "Chitungwiza" },
  victoriafalls: { lat: -17.9243, lng: 25.8572, label: "Victoria Falls" },
};

function isValidCoordPair(lng, lat) {
  if (lng == null || lat == null) return false;
  const lngNum = Number(lng);
  const latNum = Number(lat);
  if (Number.isNaN(lngNum) || Number.isNaN(latNum)) return false;
  if (lngNum === 0 && latNum === 0) return false;
  return true;
}

function coordsFromGeoLocation(location) {
  const coords = location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = coords[0];
  const lat = coords[1];
  if (lng == null || lat == null) return null;
  return isValidCoordPair(lng, lat) ? { lat: Number(lat), lng: Number(lng) } : null;
}

function isUsableAddress(address) {
  const trimmed = String(address || "").trim();
  if (!trimmed) return false;
  if (trimmed === "undefined" || trimmed === "undefined undefined") return false;
  if (/\bundefined\b/i.test(trimmed)) return false;
  return true;
}

function coordsFromLatLongFields(entity) {
  if (!entity) return null;

  const lat = entity.lat ?? entity.latitude;
  const lng = entity.lng ?? entity.long ?? entity.longitude;
  if (lat == null || lng == null) return null;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  return isValidCoordPair(lngNum, latNum) ? { lat: latNum, lng: lngNum } : null;
}

export function resolveEntityLocationCoords(entity) {
  if (!entity) return null;

  const fromEntity = coordsFromGeoLocation(entity.location);
  if (fromEntity) return fromEntity;

  const fromUser = coordsFromGeoLocation(entity.user_id?.location);
  if (fromUser) return fromUser;

  const fromFields = coordsFromLatLongFields(entity);
  if (fromFields) return fromFields;

  const fromUserFields = coordsFromLatLongFields(entity.user_id);
  if (fromUserFields) return fromUserFields;

  if (isUsableAddress(entity.address)) {
    const geocoded = geocodeLocationText(entity.address);
    if (geocoded) return { lat: geocoded.lat, lng: geocoded.lng };
  }

  const storedLat = parseFloat(localStorage.getItem("latitude"));
  const storedLng = parseFloat(localStorage.getItem("longitude"));
  if (isValidCoordPair(storedLng, storedLat)) {
    return { lat: storedLat, lng: storedLng };
  }

  return null;
}

export async function resolveCoordsForCorporateSearch(entity, fallbackCoords = null) {
  const syncCoords = resolveEntityLocationCoords(entity);
  if (syncCoords) return syncCoords;

  if (fallbackCoords?.lat != null && fallbackCoords?.lng != null) {
    const lat = Number(fallbackCoords.lat);
    const lng = Number(fallbackCoords.lng);
    if (isValidCoordPair(lng, lat)) return { lat, lng };
  }

  const addressCandidates = [
    entity?.address,
    entity?.user_id?.address,
    entity?.bookBy?.address,
  ].filter(isUsableAddress);

  for (const address of addressCandidates) {
    const local = geocodeLocationText(address);
    if (local) return { lat: local.lat, lng: local.lng };

    const geocoded = await geocodeFreeText(address);
    if (geocoded?.lat != null && geocoded?.lng != null) {
      return { lat: geocoded.lat, lng: geocoded.lng };
    }
  }

  try {
    return await requestDeviceLocation();
  } catch {
    return null;
  }
}

export function geocodeLocationText(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const key = trimmed.toLowerCase().replace(/[\s,-]+/g, "");
  for (const [cityKey, coords] of Object.entries(ZIM_CITIES)) {
    if (
      key.includes(cityKey) ||
      trimmed.toLowerCase().includes(coords.label.toLowerCase())
    ) {
      return { lat: coords.lat, lng: coords.lng, label: coords.label };
    }
  }
  return null;
}

export function resolveSearchCoords(
  locationText,
  nearbyEnabled,
  locationCoords = null
) {
  const hasLocationText = String(locationText || "").trim().length > 0;

  if (nearbyEnabled) {
    const lat = parseFloat(localStorage.getItem("latitude"));
    const lng = parseFloat(localStorage.getItem("longitude"));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  if (!hasLocationText && !nearbyEnabled) {
    return null;
  }

  if (
    locationCoords?.lat != null &&
    locationCoords?.lng != null &&
    !Number.isNaN(locationCoords.lat) &&
    !Number.isNaN(locationCoords.lng)
  ) {
    return { lat: locationCoords.lat, lng: locationCoords.lng };
  }

  const geocoded = geocodeLocationText(locationText);
  if (geocoded) return { lat: geocoded.lat, lng: geocoded.lng };

  if (nearbyEnabled) {
    const lat = parseFloat(localStorage.getItem("latitude"));
    const lng = parseFloat(localStorage.getItem("longitude"));
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

export function getCachedDeviceLocation(maxAgeMs = 5 * 60 * 1000) {
  const lat = parseFloat(localStorage.getItem("latitude"));
  const lng = parseFloat(localStorage.getItem("longitude"));
  const updatedAt = parseInt(localStorage.getItem("locationUpdatedAt") || "0", 10);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (updatedAt && Date.now() - updatedAt > maxAgeMs) return null;
  return { lat, lng };
}

export function saveDeviceLocation({ lat, lng }) {
  localStorage.setItem("latitude", String(lat));
  localStorage.setItem("longitude", String(lng));
  localStorage.setItem("locationUpdatedAt", String(Date.now()));
}

export function isSecureGeolocationContext() {
  return typeof window === "undefined" || window.isSecureContext;
}

export function getInsecureGeolocationMessage() {
  const host =
    typeof window !== "undefined" && window.location?.host
      ? window.location.host
      : "your-dev-host";
  return `Nearby search needs HTTPS on mobile.`;
}

/**
 * Request GPS for nearby search. Must be called synchronously from a click/tap handler.
 * Uses cached coords when available (works even before a fresh GPS read).
 */
export function requestNearbyLocation({ onSuccess, onError }) {
  if (!navigator.geolocation) {
    onError(new Error("Geolocation not supported"));
    return;
  }

  const cached = getCachedDeviceLocation();
  if (cached) {
    onSuccess(cached);
    return;
  }

  if (!isSecureGeolocationContext()) {
    onError(new Error(getInsecureGeolocationMessage()));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      saveDeviceLocation(coords);
      onSuccess(coords);
    },
    onError,
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
}

export function getGeolocationErrorMessage(err) {
  if (!err) return "Could not get your location. Please try again.";
  if (err.message === "Geolocation not supported") return err.message;
  if (
    err.message === "Location requires HTTPS" ||
    err.message?.includes("Nearby search needs HTTPS")
  ) {
    return err.message;
  }
  const code = err.code;
  if (code === 1) {
    return "Location permission denied. Allow location access in your browser settings.";
  }
  if (code === 2) {
    return "Location unavailable. Try again in a moment.";
  }
  if (code === 3) {
    return "Location request timed out. Try again.";
  }
  return "Could not get your location. Please try again.";
}

export function requestDeviceLocation(options = {}) {
  const {
    forceFresh = false,
    timeout = 15000,
    maximumAge = 300000,
    enableHighAccuracy = false,
  } = options;

  if (!forceFresh) {
    const cached = getCachedDeviceLocation(maximumAge);
    if (cached) return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error(getInsecureGeolocationMessage()));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        saveDeviceLocation(coords);
        resolve(coords);
      },
      (err) => reject(err),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

export const zimbabweCitySuggestions = Object.values(ZIM_CITIES).map(
  (c) => c.label
);
