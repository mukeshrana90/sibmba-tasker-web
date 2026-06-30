export const PROVIDER_SEARCH_PATHS = [
  "/customer-search-providers",
  "/search-providers",
];

export function isProviderSearchPath(pathname) {
  return PROVIDER_SEARCH_PATHS.some((path) => pathname.startsWith(path));
}

export function readSearchFromUrl(search = "") {
  const params = new URLSearchParams(search);
  const raw = params.get("search") || "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function buildSearchUrlWithoutQuery(pathname, search = "", key = "search") {
  const params = new URLSearchParams(search);
  params.delete(key);
  const hasLocation = Boolean(params.get("location")?.trim());
  const nearby = params.get("nearby") === "1" || params.get("nearby") === "true";
  if (!hasLocation && !nearby) {
    params.delete("lat");
    params.delete("lng");
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function resolveSearchSubmitCoords(locationQuery, nearby, locationCoords) {
  const trimmed = String(locationQuery || "").trim();
  if (!trimmed) {
    return { coords: null, nearby: false };
  }
  if (locationCoords?.lat != null && locationCoords?.lng != null) {
    return {
      coords: { lat: locationCoords.lat, lng: locationCoords.lng },
      nearby: Boolean(nearby),
    };
  }
  return { coords: null, nearby: Boolean(nearby) };
}
