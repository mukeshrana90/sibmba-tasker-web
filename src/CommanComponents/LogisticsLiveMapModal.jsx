import { useCallback, useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Api from "../Services/api";
import LogisticsFleetMap from "./LogisticsFleetMap";
import BookingLocationSearch from "./Modals/BookingLocationSearch";
import UseMyLocationButton from "./UseMyLocationButton";
import { buildPublicAssetUrl, defaultImage } from "../utils/ImagePath";

// 23 Nov (client): customer "View on map" — live equipment within 100 km whose
// operator location was updated in the last 2 hours (GET /logistics/assets/map).
const HARARE = { lat: -17.8252, lng: 31.0335, label: "Harare" };
const RADIUS_KM = 100;

const ago = (iso) => {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min ago`;
};

// 23 Nov: one map for trucks and equipment — chips filter it (opens on All)
const KIND_CHIPS = [
  { value: "all", label: "All" },
  { value: "vehicle", label: "Trucks" },
  { value: "equipment", label: "Equipment" },
];
const NOUN = { all: "trucks & equipment", vehicle: "trucks", equipment: "equipment", cab: "cabs" };

export default function LogisticsLiveMapModal({ show, onHide, initialCenter = null, kind: tabKind = "all" }) {
  const cabOnly = tabKind === "cab";
  const [kind, setKind] = useState(cabOnly ? "cab" : "all");
  const noun = NOUN[kind] || NOUN.all;
  const [center, setCenter] = useState(initialCenter || HARARE);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ live_hours: 2, radius_km: RADIUS_KM });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show) {
      setCenter(initialCenter || HARARE);
      setKind(cabOnly ? "cab" : "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await Api.get("/logistics/assets/map", {
        params: { lat: center.lat, lng: center.lng, radius_km: RADIUS_KM, kind },
        skipErrorToast: true,
      });
      const d = r?.data?.data;
      if (r?.data?.success === false || !d) throw new Error(r?.data?.message || "Couldn't load the map");
      setRows(d.data || []);
      setMeta({ live_hours: d.live_hours || 2, radius_km: d.radius_km || RADIUS_KM });
    } catch (e) {
      setRows([]);
      setError(e?.message || "Couldn't load the map");
    } finally {
      setLoading(false);
    }
  }, [center.lat, center.lng, kind]);

  useEffect(() => {
    if (show) load();
  }, [show, load]);

  // Shorter map on phones so the search, summary and map fit on one screen
  const mapHeight =
    typeof window !== "undefined" && window.matchMedia?.("(max-width: 575px)").matches ? 340 : 480;

  const unitLine = (r) =>
    [
      r.business_name,
      r.availability?.state_label,
      r.distance_km != null ? `${r.distance_km} km away` : "",
      r.live_location?.updated_at ? `Location ${ago(r.live_location.updated_at)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

  // Thumbnail (first visible photo) + plate (signed-in users only — the API sends null to guests)
  const photoUrl = (r) => {
    if (!r.photo) return defaultImage;
    const p = String(r.photo);
    return p.startsWith("http") ? p : buildPublicAssetUrl(p.startsWith("/") ? p : `/${p}`);
  };
  const unitCard = (r) => ({
    name: r.name,
    sub: unitLine(r),
    href: `/logistics/asset/${r.asset_id}`,
    photo: photoUrl(r),
    plate: r.plate || "",
  });

  // 23 Nov: units on the same (rounded) spot — e.g. one depot — become one pin with a
  // count, otherwise they sit exactly on top of each other and look like a single unit
  const groups = [];
  const byPlace = new Map();
  for (const r of rows) {
    const key = `${r.live_location?.lat},${r.live_location?.lng}`;
    if (!byPlace.has(key)) {
      byPlace.set(key, []);
      groups.push(byPlace.get(key));
    }
    byPlace.get(key).push(r);
  }
  const sharedSpots = groups.filter((g) => g.length > 1);
  const sharedUnits = sharedSpots.reduce((n, g) => n + g.length, 0);

  const vehicles = groups.map((g) => {
    const r = g[0];
    if (g.length === 1) {
      return {
        asset_id: r.asset_id,
        name: r.name,
        // pin colour reads the state text (available → yellow, on a job → green)
        availability: r.availability?.state || "offline",
        live_location: { lat: r.live_location?.lat, lng: r.live_location?.lng, pin_kind: "live" },
        pin_glyph: r.kind === "equipment" ? "equipment" : "truck",
        popup_sub: unitLine(r),
        href: `/logistics/asset/${r.asset_id}`,
        popup_unit: unitCard(r),
      };
    }
    const anyTaking = g.find((x) => x.availability?.taking_orders) || r;
    return {
      asset_id: g.map((x) => x.asset_id).join(","),
      name: `${g.length} units here`,
      count: g.length,
      availability: anyTaking.availability?.state || "offline",
      live_location: { lat: r.live_location?.lat, lng: r.live_location?.lng, pin_kind: "live" },
      pin_glyph: g.every((x) => x.kind === "equipment") ? "equipment" : "truck",
      popup_items: g.map(unitCard),
    };
  });

  return (
    // Same look as the booking location picker (simba-book-loc-modal: rounded search
    // box, suggestion dropdown, header + body spacing)
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      className="simba-book-loc-modal log-live-map-modal"
      backdropClassName="simba-book-loc-backdrop"
      data-testid="live-map-modal"
    >
      <Modal.Header closeButton className="bk-modal-head">
        <Modal.Title>Live {noun} on the map</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bk-loc-body">
        <p className="bk-loc-hint">
          Search a place or use your location. Shows {noun} within {RADIUS_KM} km whose operator shared a location in the
          last {meta.live_hours} hours.
        </p>
        <div className="log-live-map__controls">
          <div className="bk-loc-search log-live-map__search">
            <BookingLocationSearch
              value={query}
              onChange={setQuery}
              onSelect={(draft) => {
                const lat = Number(draft?.lat);
                const lng = Number(draft?.lng);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                  setCenter({ lat, lng, label: draft.address || "Selected place" });
                }
              }}
            />
          </div>
          <UseMyLocationButton
            className="log-live-map__mine"
            onLocated={({ lat, lng }) => {
              setQuery("");
              setCenter({ lat, lng, label: "your location" });
            }}
          />
        </div>
        {!cabOnly && (
          <div className="log-live-map__kinds" role="group" aria-label="Show">
            {KIND_CHIPS.map((c) => {
              const n = c.value === "all" ? null : rows.filter((r) => r.kind === c.value).length;
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`log-live-map__kind${kind === c.value ? " is-active" : ""}`}
                  aria-pressed={kind === c.value}
                  data-testid={`live-map-kind-${c.value}`}
                  onClick={() => setKind(c.value)}
                >
                  {c.label}
                  {kind === "all" && n != null && !loading ? <span className="log-live-map__kind-n">{n}</span> : null}
                </button>
              );
            })}
          </div>
        )}
        <p
          className={`log-live-map__meta${!loading && !error && !rows.length ? " is-empty" : ""}${error ? " is-error" : ""}`}
          data-testid="live-map-meta"
          aria-live="polite"
        >
          <span className="log-live-map__dot" aria-hidden="true" />
          {loading
            ? `Loading live ${noun}…`
            : error
              ? error
              : rows.length
                ? `${rows.length} live unit${rows.length === 1 ? "" : "s"} within ${meta.radius_km} km of ${center.label || "here"}${
                    sharedSpots.length === 1
                      ? ` · ${sharedUnits} at the same place (tap the pin with the number)`
                      : sharedSpots.length > 1
                        ? ` · ${sharedUnits} share ${sharedSpots.length} places (pins with a number)`
                        : ""
                  } · location updated in the last ${meta.live_hours} h`
                : `No live ${noun} within ${meta.radius_km} km of ${center.label || "here"} in the last ${meta.live_hours} hours.`}
        </p>
        <div className="bk-map-wrap log-live-map__map">
        <LogisticsFleetMap
          key={`${center.lat},${center.lng}`}
          vehicles={vehicles}
          jobs={[]}
          showJobs={false}
          showLocalJobs={false}
          height={mapHeight}
          emptyCenter={center}
        />
        </div>
      </Modal.Body>
    </Modal>
  );
}
