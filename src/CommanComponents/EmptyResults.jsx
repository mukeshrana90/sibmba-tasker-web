import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Api from "../Services/api";
import { HARARE, nearestZimCity } from "../utils/landingGeocode";
import { buildPublicAssetUrl } from "../utils/ImagePath";
import { serviceProviderPath } from "../utils/normalizeMongoId";
import { formatDisplayTitle, providerDisplayName, providerLocation } from "../utils/landingUtils";

const LIMIT = 6;

// ---- One widening step per module. Each returns rows, or [] to try the next step.
async function topRated({ categoryId, coords, radiusKm }) {
  const params = { limit: LIMIT, minReviews: 0 };
  if (categoryId) params.categoryId = categoryId;
  if (coords) {
    params.nearby = true;
    params.lat = coords.lat;
    params.lng = coords.lng;
    params.radius = radiusKm * 1000; // metres on this API
  }
  const res = await Api.get("/customer/top-rated-services", { params, skipErrorToast: true });
  return res?.data?.data?.items || res?.data?.items || [];
}

async function assets({ query, kind, category, coords, radiusKm }) {
  const params = { kind: kind || "all", limit: LIMIT, sort: coords ? "nearest" : "rating", page: 1 };
  if (query) params.q = query;
  if (category) params.hub_category = category;
  if (coords) {
    params.company_lat = coords.lat;
    params.company_long = coords.lng;
    params.radius_km = radiusKm;
  }
  const res = await Api.get("/logistics/assets/search", { params, skipErrorToast: true });
  return res?.data?.data?.data || [];
}

async function corporates({ coords, radiusKm }) {
  const res = await Api.get("/service/getNearbyCorporate", {
    params: { lat: coords.lat, lng: coords.lng, page: 1, limit: LIMIT, radius: Math.round(radiusKm * 0.62) },
    skipErrorToast: true,
  });
  const rows = res?.data?.data;
  return Array.isArray(rows) ? rows : [];
}

/** Nearest to the user (or Harare), widening, then top rated anywhere. */
export function fallbackSteps({ module, query, categoryId, kind, category, coords }) {
  const city = nearestZimCity(coords);
  const near = coords
    ? [
        { coords, radiusKm: 100, heading: city ? `Nearest available in ${city.label}` : "Nearest available" },
        { coords, radiusKm: 300, heading: "Nearest available" },
      ]
    : [];
  const harare = [
    { coords: HARARE, radiusKm: 100, heading: "Nearest available in Harare" },
    { coords: HARARE, radiusKm: 300, heading: "Nearest available around Harare" },
  ];
  const areas = [...near, ...harare];
  if (module === "logistics") {
    const withWords = (w) =>
      areas.map((a) => (extra) => assets({ query: w, kind, category, ...a, ...extra }).then((rows) => ({ rows, heading: a.heading })));
    return [
      ...(query ? withWords(query) : []),
      ...withWords(""),
      () => assets({ kind, category }).then((rows) => ({ rows, heading: "Top rated" })),
      () => assets({}).then((rows) => ({ rows, heading: "Top rated" })),
    ];
  }
  if (module === "corporate") {
    return areas.map((a) => () => corporates(a).then((rows) => ({ rows, heading: a.heading })));
  }
  const inCategory = categoryId
    ? [
        ...areas.map((a) => () => topRated({ categoryId, ...a }).then((rows) => ({ rows, heading: a.heading }))),
        () => topRated({ categoryId }).then((rows) => ({ rows, heading: "Top rated" })),
      ]
    : [];
  return [
    ...inCategory,
    ...areas.map((a) => () => topRated(a).then((rows) => ({ rows, heading: a.heading }))),
    () => topRated({}).then((rows) => ({ rows, heading: "Top rated" })),
  ];
}

function rowCard(module, row) {
  if (module === "logistics") {
    const photo = row.photos?.[0];
    // Search rows carry asset_id, not _id
    const id = row.asset_id || row._id;
    return {
      key: id,
      to: `/logistics/asset/${id}`,
      title: row.name || "Unit",
      sub: [
        row.distance_km != null ? `${Math.round(row.distance_km)} km away` : row.location_label,
        Number(row.rating?.count) > 0 ? `${Number(row.rating.average || 0).toFixed(1)} ★` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      image: photo ? buildPublicAssetUrl(photo) : "",
    };
  }
  if (module === "corporate") {
    return {
      key: row._id,
      to: `/get-corporate/${row._id}`,
      title: row.full_name || "Corporate supplier",
      sub: row.corporateCategoryId?.name || row.address || "",
    };
  }
  const sp = row.serviceProvider || {};
  return {
    key: row._id,
    to: sp._id ? serviceProviderPath(sp._id, row._id) : "/services",
    title: providerDisplayName(sp),
    sub: [
      formatDisplayTitle(row.serviceSubCategoryName || row.serviceCategoryName),
      providerLocation(sp),
      Number(row.reviewCount) > 0 ? `${row.averageRating} ★` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * Item 54/55: an empty search never ends on "No data found". Widens the search
 * (nearest, then Harare, then top rated) and always offers "Post a request".
 * module: "services" | "logistics" | "corporate".
 */
export default function EmptyResults({
  module = "services",
  message,
  query = "",
  categoryId,
  kind,
  category,
  coords,
  compact = false,
  children,
}) {
  const [state, setState] = useState({ loading: true, rows: [], heading: "" });
  const coordKey = coords ? `${coords.lat},${coords.lng}` : "";

  useEffect(() => {
    let alive = true;
    setState({ loading: true, rows: [], heading: "" });
    (async () => {
      const steps = fallbackSteps({ module, query, categoryId, kind, category, coords });
      for (const step of steps) {
        try {
          const { rows, heading } = await step();
          if (!alive) return;
          if (rows?.length) {
            setState({ loading: false, rows: rows.slice(0, LIMIT), heading });
            return;
          }
        } catch {
          /* try the next, wider step */
        }
      }
      if (alive) setState({ loading: false, rows: [], heading: "" });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, query, categoryId, kind, category, coordKey]);

  const postTo = module === "logistics" ? "/logistics/post" : "/post-task";
  const cards = state.rows.map((r) => rowCard(module, r));
  const lead = state.loading
    ? "Looking further afield…"
    : cards.length
      ? message || "Nothing matched exactly, so here is what's closest."
      : "We're still adding providers here. Post a request and the right people can respond.";

  return (
    <div
      className={`empty-results${compact ? " empty-results--compact" : ""}`}
      data-testid="empty-results"
      data-module={module}
      data-state={state.loading ? "loading" : cards.length ? "fallback" : "none"}
    >
      <p className="empty-results__lead">{lead}</p>
      {state.heading ? <h3 className="empty-results__heading" data-testid="empty-results-heading">{state.heading}</h3> : null}
      {cards.length ? (
        <ul className="empty-results__list">
          {cards.map((c) => (
            <li key={c.key}>
              <Link to={c.to} className="empty-results__card" data-testid="empty-results-card">
                {c.image ? <img src={c.image} alt="" loading="lazy" /> : null}
                <span>
                  <b>{c.title}</b>
                  {c.sub ? <small>{c.sub}</small> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="empty-results__actions">
        <Link to={postTo} className="empty-results__post" data-testid="post-request">
          Post a request
        </Link>
        {children}
      </div>
    </div>
  );
}
