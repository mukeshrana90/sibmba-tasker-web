import { reverseGeocodeCoords } from "./landingPlaces";
import { requestDeviceLocation } from "./landingGeocode";

export const DEFAULT_BOOKING_MAP_CENTER = { lat: -17.8292, lng: 31.0522 };

export function hasValidCoords(loc) {
  if (!loc) return false;
  const lat = Number(loc.lat);
  const lng = Number(loc.lng);
  return !Number.isNaN(lat) && !Number.isNaN(lng) && !(lat === 0 && lng === 0);
}

export function coordsFromInitial(initialLocation) {
  if (!hasValidCoords(initialLocation)) return null;
  return { lat: Number(initialLocation.lat), lng: Number(initialLocation.lng) };
}

export function coordsFromStorage() {
  if (typeof localStorage === "undefined") return null;
  const lat = parseFloat(localStorage.getItem("latitude"));
  const lng = parseFloat(localStorage.getItem("longitude"));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export async function resolveBookingPickerDraft(initialLocation, deps = {}) {
  const {
    reverseGeocode = reverseGeocodeCoords,
    requestLocation = requestDeviceLocation,
    getStoredCoords = coordsFromStorage,
    defaultCenter = DEFAULT_BOOKING_MAP_CENTER,
  } = deps;

  const address = String(initialLocation?.address || "").trim();
  const initialCoords = coordsFromInitial(initialLocation);

  if (initialCoords && address) {
    return { address, lat: initialCoords.lat, lng: initialCoords.lng };
  }

  if (initialCoords) {
    const reversed = await reverseGeocode(initialCoords.lat, initialCoords.lng);
    if (reversed?.label) {
      return {
        address: reversed.label,
        lat: reversed.lat,
        lng: reversed.lng,
      };
    }
    return { address: "", lat: initialCoords.lat, lng: initialCoords.lng };
  }

  const stored = getStoredCoords();
  if (stored) {
    const reversed = await reverseGeocode(stored.lat, stored.lng);
    if (reversed?.label) {
      return {
        address: reversed.label,
        lat: reversed.lat,
        lng: reversed.lng,
      };
    }
    return { address: "", lat: stored.lat, lng: stored.lng };
  }

  try {
    const device = await requestLocation();
    const reversed = await reverseGeocode(device.lat, device.lng);
    if (reversed?.label) {
      return {
        address: reversed.label,
        lat: reversed.lat,
        lng: reversed.lng,
      };
    }
    return { address: "", lat: device.lat, lng: device.lng };
  } catch {
    /* fall through to default */
  }

  const reversedDefault = await reverseGeocode(
    defaultCenter.lat,
    defaultCenter.lng
  );
  if (reversedDefault?.label) {
    return {
      address: reversedDefault.label,
      lat: reversedDefault.lat,
      lng: reversedDefault.lng,
    };
  }

  return {
    address: "",
    lat: defaultCenter.lat,
    lng: defaultCenter.lng,
  };
}

export function draftFromPlace(place) {
  const loc = place?.geometry?.location;
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  if (!hasValidCoords({ lat, lng })) return null;
  return {
    address: place.formatted_address || place.name || "",
    lat: Number(lat),
    lng: Number(lng),
  };
}

export function draftFromPrediction(prediction) {
  if (!prediction) return null;
  if (prediction.isPhoton && prediction.lat != null && prediction.lng != null) {
    return {
      address: prediction.description || "",
      lat: Number(prediction.lat),
      lng: Number(prediction.lng),
    };
  }
  return null;
}
