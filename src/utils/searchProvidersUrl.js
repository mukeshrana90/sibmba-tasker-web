export function buildSearchProvidersParams({
  search = "",
  location = "",
  lat,
  lng,
  categoryIds = [],
  minRating = 0,
  maxRate,
  availableOnly = false,
  verifiedOnly = true,
  sort = "rating",
  page = 1,
  nearby = false,
} = {}) {
  const params = new URLSearchParams();
  const q = String(search || "").trim();
  const loc = String(location || "").trim();

  if (q) params.set("search", q);
  if (loc) params.set("location", loc);
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  if (categoryIds?.length) {
    params.set("categoryIds", categoryIds.join(","));
  }
  if (minRating > 0) params.set("minRating", String(minRating));
  if (maxRate != null && maxRate < 40) params.set("maxRate", String(maxRate));
  if (availableOnly) params.set("availableOnly", "1");
  if (!verifiedOnly) params.set("verifiedOnly", "0");
  if (sort && sort !== "rating") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  if (nearby) params.set("nearby", "1");

  return params;
}

export function searchProvidersPath(basePath, filters) {
  const qs = buildSearchProvidersParams(filters).toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function parseSearchProvidersQuery(searchParams) {
  const get = (key) => searchParams.get(key);
  const categoryRaw = get("categoryIds") || get("categoryId") || get("cat");
  const categoryIds = categoryRaw
    ? categoryRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    search: get("search") || get("q") || "",
    location: get("location") || get("loc") || "",
    lat: get("lat") ? parseFloat(get("lat")) : null,
    lng: get("lng") ? parseFloat(get("lng")) : null,
    categoryIds,
    minRating: parseFloat(get("minRating") || get("rating") || "0") || 0,
    maxRate: get("maxRate") ? parseFloat(get("maxRate")) : 40,
    availableOnly: get("availableOnly") === "1" || get("availOnly") === "1",
    verifiedOnly: get("verifiedOnly") !== "0",
    sort: get("sort") || "rating",
    page: Math.max(1, parseInt(get("page") || "1", 10) || 1),
    nearby: get("nearby") === "1" || get("nearby") === "true",
  };
}
