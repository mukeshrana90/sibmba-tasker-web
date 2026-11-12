import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Api from "../Services/api";
import { HARARE, nearestZimCity } from "../utils/landingGeocode";
import { buildPublicAssetUrl } from "../utils/ImagePath";
import { serviceProviderPath } from "../utils/normalizeMongoId";
import { formatDisplayTitle, providerDisplayName, providerLocation } from "../utils/landingUtils";
import { haversineKm } from "../utils/multiTransitRoute";

const LIMIT = 6;

// Logistics: what the customer asked for, and the tag on each card
const HUB_LABEL = {
  logistic: "Truck",
  agricultural: "Agricultural",
  construction: "Construction",
  industrial: "Plant / industrial",
};
function wantedLabel({ kind, category }) {
  if (category && HUB_LABEL[category]) return `${HUB_LABEL[category].toLowerCase()} equipment`;
  if (kind === "equipment") return "equipment";
  if (kind === "cab") return "cabs";
  if (kind === "vehicle") return "trucks";
  return "";
}
function rowTag(row) {
  if (row.kind === "cab") return "Cab";
  if (row.kind !== "equipment") return "Truck";
  return HUB_LABEL[String(row.hub_category || "").toLowerCase()] || "Equipment";
}
/** A row outside what was searched (another category / kind). */
function isOther(row, { kind, category }) {
  if (category) return String(row.hub_category || "").toLowerCase() !== category;
  if (kind && kind !== "all") return (row.kind || "vehicle") !== kind;
  return false;
}

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
  // fromUser: the API measured distance from the customer (else from Harare centre)
  const near = coords
    ? [
        { coords, radiusKm: 100, fromUser: true, heading: city ? `Nearest available in ${city.label}` : "Nearest available" },
        { coords, radiusKm: 300, fromUser: true, heading: "Nearest available" },
      ]
    : [];
  const harare = [
    { coords: HARARE, radiusKm: 100, heading: "Nearest available in Harare" },
    { coords: HARARE, radiusKm: 300, heading: "Nearest available around Harare" },
  ];
  const areas = [...near, ...harare];
  if (module === "logistics") {
    const withWords = (w) =>
      areas.map((a) => (extra) =>
        assets({ query: w, kind, category, ...a, ...extra }).then((rows) => ({
          rows,
          heading: a.heading,
          fromUser: Boolean(a.fromUser),
          inHarare: !a.fromUser,
        }))
      );
    const label = wantedLabel({ kind, category });
    return [
      ...(query ? withWords(query) : []),
      ...withWords(""),
      () =>
        assets({ kind, category }).then((rows) => ({
          rows,
          heading: label ? `Top rated ${label}` : "Top rated",
        })),
      // Last resort: other categories — said plainly, so nobody takes a truck for a tractor
      () =>
        assets({}).then((rows) => {
          const other = rows.filter((r) => isOther(r, { kind, category }));
          return {
            rows: label ? other : rows,
            heading: label ? "Top rated in other categories" : "Top rated",
            other: Boolean(label),
          };
        }),
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

/** "2 km", "460 km", "7,460 km" */
function kmText(km) {
  const n = km < 100 ? Math.round(km) : Math.round(km / 10) * 10;
  return `${n.toLocaleString()} km`;
}

function rowCard(module, row, { fromUser = false } = {}) {
  if (module === "logistics") {
    const photo = row.photos?.[0];
    // Search rows carry asset_id, not _id
    const id = row.asset_id || row._id;
    // distance_km is only "away" from the customer when the search was centred on them;
    // the Harare fallback measures from Harare centre, so show the place instead
    const where =
      fromUser && row.distance_km != null
        ? `${kmText(row.distance_km)} away`
        : row.location_label || "";
    return {
      key: id,
      to: `/logistics/asset/${id}`,
      title: row.name || "Unit",
      sub: [
        where,
        Number(row.rating?.count) > 0 ? `${Number(row.rating.average || 0).toFixed(1)} ★` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      image: photo ? buildPublicAssetUrl(photo) : "",
      tag: rowTag(row),
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
  const [state, setState] = useState({ loading: true, rows: [], heading: "", other: false, fromUser: false, inHarare: false });
  const coordKey = coords ? `${coords.lat},${coords.lng}` : "";

  useEffect(() => {
    let alive = true;
    setState({ loading: true, rows: [], heading: "", other: false, fromUser: false, inHarare: false });
    (async () => {
      const steps = fallbackSteps({ module, query, categoryId, kind, category, coords });
      for (const step of steps) {
        try {
          const { rows, heading, other = false, fromUser = false, inHarare = false } = await step();
          if (!alive) return;
          if (rows?.length) {
            setState({ loading: false, rows: rows.slice(0, LIMIT), heading, other, fromUser, inHarare });
            return;
          }
        } catch {
          /* try the next, wider step */
        }
      }
      if (alive) setState({ loading: false, rows: [], heading: "", other: false, fromUser: false, inHarare: false });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, query, categoryId, kind, category, coordKey]);

  const postTo = module === "logistics" ? "/logistics/post" : "/post-task";
  const cards = state.rows.map((r) => rowCard(module, r, { fromUser: state.fromUser }));
  const wanted = module === "logistics" ? wantedLabel({ kind, category }) : "";
  // Customer's location set, nothing near it: say where these are and how far that is
  const hasUser = coords?.lat != null && coords?.lng != null;
  const harareKm = hasUser ? haversineKm({ lat: Number(coords.lat), lng: Number(coords.lng) }, HARARE) : null;
  const farHarare = module === "logistics" && state.inHarare && hasUser && harareKm > 20;
  const lead = state.loading
    ? "Looking further afield…"
    : farHarare && cards.length
      ? `No ${wanted || "units"} near your location. The nearest are in Harare, about ${kmText(harareKm)} from you.`
      : state.other
      ? `No ${wanted} listed yet. These are from other categories — not ${wanted}.`
      : cards.length
        ? message || "Nothing matched exactly, so here is what's closest."
        : wanted
          ? `No ${wanted} listed yet. Post a request and the right fleets can respond.`
          : "We're still adding providers here. Post a request and the right people can respond.";

  return (
    <div
      className={`empty-results${compact ? " empty-results--compact" : ""}`}
      data-testid="empty-results"
      data-module={module}
      data-state={state.loading ? "loading" : cards.length ? (state.other ? "other" : "fallback") : "none"}
    >
      {/* Logistics: every explanation (other categories, far from Harare, closest match,
          nothing yet) uses the same notice box */}
      <p className={`empty-results__lead${module === "logistics" && !state.loading ? " empty-results__lead--notice" : ""}`}>
        {lead}
      </p>
      {state.heading ? <h3 className="empty-results__heading" data-testid="empty-results-heading">{state.heading}</h3> : null}
      {cards.length ? (
        <ul className="empty-results__list">
          {cards.map((c) => (
            <li key={c.key}>
              <Link to={c.to} className="empty-results__card" data-testid="empty-results-card">
                {c.image ? <img src={c.image} alt="" loading="lazy" /> : null}
                <span>
                  {c.tag ? <em className="empty-results__tag">{c.tag}</em> : null}
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
          {wanted ? `Post a request for ${wanted}` : "Post a request"}
        </Link>
        {children}
      </div>
    </div>
  );
}
