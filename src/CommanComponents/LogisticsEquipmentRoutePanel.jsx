import { useEffect, useMemo, useRef, useState } from "react";
import { loadLeaflet } from "../utils/loadLeaflet";
import { placeShortLabel, parseJobCoords } from "./LogisticsJobRoutePanel";
import { truckStatusPinHtml } from "./LogisticsFleetMap";
import { haversineKm } from "../utils/multiTransitRoute";

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

/** Site pin — green package (multi-transit drop style). */
function sitePinHtml(stepLabel) {
  const badge = stepLabel
    ? `<span class="log-mt-step-badge">${stepLabel}</span>`
    : "";
  return `<div class="log-map-truck-pin log-mt-pkg-pin" title="Site">
    ${badge}
    <svg viewBox="0 0 48 64" width="40" height="52" aria-hidden="true">
      <path fill="#2ecc71" d="M24 2C13.5 2 5 10.5 5 21c0 14.5 19 41 19 41s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <path fill="#1e8f4a" d="M24 2c0 0 0 60 0 60s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <circle cx="24" cy="22" r="12.5" fill="#eef6ff"/>
      <path fill="#ffffff" d="M24 9.5c-6.9 0-12.5 5.6-12.5 12.5 0 6.9 5.6 12.5 12.5 12.5V9.5Z"/>
      <g transform="translate(15.2 14.2)">
        <path fill="#e8a04a" d="M8.8 2.2 2.4 5.4v9.2l6.4 3.2 6.4-3.2V5.4Z"/>
        <path fill="#c47a2a" d="M8.8 5.4v9.6l6.4-3.2V5.4Z"/>
        <path fill="#d99238" d="M2.4 5.4 8.8 8.6v6.4L2.4 14.6Z"/>
        <path fill="#f0b86a" d="M8.8 2.2 15.2 5.4 8.8 8.6 2.4 5.4Z"/>
        <path fill="#fff" fill-opacity="0.95" d="M11.2 9.1h3.1v2.35h-3.1z"/>
        <path stroke="#b86a20" stroke-width="0.55" fill="none" d="M8.8 2.2v6.4M2.4 5.4l6.4 3.2 6.4-3.2"/>
      </g>
    </svg>
  </div>`;
}

/** Equipment last-known pin — red package (multi-transit pick style). */
function equipmentPinHtml(stepLabel) {
  const badge = stepLabel
    ? `<span class="log-mt-step-badge">${stepLabel}</span>`
    : "";
  return `<div class="log-map-truck-pin log-mt-pkg-pin" title="Equipment">
    ${badge}
    <svg viewBox="0 0 48 64" width="40" height="52" aria-hidden="true">
      <path fill="#e85d4c" d="M24 2C13.5 2 5 10.5 5 21c0 14.5 19 41 19 41s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <path fill="#c73e32" d="M24 2c0 0 0 60 0 60s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <circle cx="24" cy="22" r="12.5" fill="#eef6ff"/>
      <path fill="#ffffff" d="M24 9.5c-6.9 0-12.5 5.6-12.5 12.5 0 6.9 5.6 12.5 12.5 12.5V9.5Z"/>
      <g transform="translate(15.2 14.2)">
        <path fill="#e8a04a" d="M8.8 2.2 2.4 5.4v9.2l6.4 3.2 6.4-3.2V5.4Z"/>
        <path fill="#c47a2a" d="M8.8 5.4v9.6l6.4-3.2V5.4Z"/>
        <path fill="#d99238" d="M2.4 5.4 8.8 8.6v6.4L2.4 14.6Z"/>
        <path fill="#f0b86a" d="M8.8 2.2 15.2 5.4 8.8 8.6 2.4 5.4Z"/>
        <path fill="#fff" fill-opacity="0.95" d="M11.2 9.1h3.1v2.35h-3.1z"/>
        <path stroke="#b86a20" stroke-width="0.55" fill="none" d="M8.8 2.2v6.4M2.4 5.4l6.4 3.2 6.4-3.2"/>
      </g>
    </svg>
  </div>`;
}

function pinKindTone(pinKind) {
  if (pinKind === "live") return "on_route";
  if (pinKind === "home") return "available";
  return "available";
}

async function fetchOsrmPath(from, to) {
  if (!from || !to) return null;
  const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(
    6
  )},${to.lat.toFixed(6)}`;
  try {
    const res = await fetch(
      `${OSRM_URL}/${coords}?overview=full&geometries=geojson&steps=false`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    return {
      path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      km: (route.distance || 0) / 1000,
    };
  } catch {
    return null;
  }
}

function destroyMap(map) {
  if (!map) return;
  try {
    map.stop?.();
    map.off();
    map.remove();
  } catch {
    /* ignore */
  }
}

function PinLabel({ tone, children }) {
  return (
    <div className="log-route-end__label">
      <span
        className={`log-eq-pin-swatch log-eq-pin-swatch--${tone}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
}

/**
 * Equipment hire route panel (not pick→drop).
 * Customer: site pin only.
 * Supply: equipment last location → site + road path (OSRM).
 */
export default function LogisticsEquipmentRoutePanel({
  site,
  equipmentLocation = null,
  viewer = "customer",
  height = 320,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const [roadKm, setRoadKm] = useState(null);

  const sitePos = useMemo(
    () => parseJobCoords(site?.coordinates),
    [site]
  );
  const equipPos = useMemo(() => {
    if (!equipmentLocation) return null;
    const lat = Number(equipmentLocation.lat);
    const lng = Number(equipmentLocation.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [equipmentLocation]);

  const showDispatch = viewer === "supply" && equipPos && sitePos;
  const approxKm = useMemo(() => {
    if (roadKm != null) return roadKm;
    if (showDispatch) return haversineKm(equipPos, sitePos);
    return null;
  }, [roadKm, showDispatch, equipPos, sitePos]);

  const mapKey = JSON.stringify({
    viewer,
    site: sitePos,
    equip: equipPos,
    name: equipmentLocation?.name || "",
    kind: equipmentLocation?.pin_kind || "",
  });

  useEffect(() => {
    let cancelled = false;
    let mapInstance = null;

    (async () => {
      if (!sitePos && !equipPos) return;
      try {
        const L = await loadLeaflet();
        if (cancelled || !elRef.current) return;
        destroyMap(mapRef.current);
        mapRef.current = null;

        const center = sitePos || equipPos;
        const map = L.map(elRef.current, {
          scrollWheelZoom: true,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView([center.lat, center.lng], 13, { animate: false });

        if (cancelled) {
          destroyMap(map);
          return;
        }
        mapInstance = map;
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          maxZoom: 19,
          errorTileUrl:
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        }).addTo(map);

        const bounds = [];

        if (equipPos && viewer === "supply") {
          bounds.push([equipPos.lat, equipPos.lng]);
          const pinKind = equipmentLocation?.pin_kind || "last_known";
          const html =
            pinKind === "live"
              ? truckStatusPinHtml(pinKindTone(pinKind))
              : equipmentPinHtml("E");
          const title = equipmentLocation?.name || "Equipment";
          const detail = [
            `<b>${title}</b>`,
            "Equipment last location",
            pinKind === "live"
              ? "Live GPS"
              : pinKind === "home"
                ? "Home / create location"
                : "Last known position",
            equipmentLocation?.label || "",
          ]
            .filter(Boolean)
            .join("<br/>");
          L.marker([equipPos.lat, equipPos.lng], {
            icon: L.divIcon({
              className: "log-map-icon",
              html,
              iconSize: [40, 52],
              iconAnchor: [20, 50],
              popupAnchor: [0, -44],
            }),
            zIndexOffset: 500,
          })
            .addTo(map)
            .bindPopup(detail);
        }

        if (sitePos) {
          bounds.push([sitePos.lat, sitePos.lng]);
          const detail = [
            "<b>Site</b>",
            "Where equipment is required",
            site?.address || placeShortLabel(site?.address) || "",
          ]
            .filter(Boolean)
            .join("<br/>");
          L.marker([sitePos.lat, sitePos.lng], {
            icon: L.divIcon({
              className: "log-map-icon",
              html: sitePinHtml("S"),
              iconSize: [40, 52],
              iconAnchor: [20, 50],
              popupAnchor: [0, -44],
            }),
            zIndexOffset: 400,
          })
            .addTo(map)
            .bindPopup(detail);
        }

        if (showDispatch) {
          const road = await fetchOsrmPath(equipPos, sitePos);
          if (cancelled || mapRef.current !== map) return;
          if (road?.path?.length) {
            setRoadKm(Math.round(road.km * 10) / 10);
            L.polyline(road.path, {
              color: "#038654",
              weight: 5,
              opacity: 0.92,
              lineJoin: "round",
              lineCap: "round",
            }).addTo(map);
          } else {
            setRoadKm(Math.round(haversineKm(equipPos, sitePos) * 10) / 10);
            L.polyline(
              [
                [equipPos.lat, equipPos.lng],
                [sitePos.lat, sitePos.lng],
              ],
              {
                color: "#038654",
                weight: 4,
                opacity: 0.55,
                dashArray: "8 8",
              }
            ).addTo(map);
          }
        } else {
          setRoadKm(null);
        }

        if (cancelled || mapRef.current !== map) return;
        if (bounds.length > 1) {
          map.fitBounds(bounds, {
            padding: [48, 48],
            maxZoom: 14,
            animate: false,
          });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 14, { animate: false });
        }
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current || mapInstance;
      mapRef.current = null;
      destroyMap(map);
    };
  }, [mapKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const distanceLabel =
    approxKm != null && Number.isFinite(approxKm)
      ? `~${Math.round(approxKm)} km`
      : null;

  return (
    <section
      className="log-route-panel log-route-panel--equipment"
      aria-label={
        viewer === "supply"
          ? "Equipment to site route"
          : "Equipment site location"
      }
    >
      <div
        className={`log-route-panel__ends${
          viewer === "customer" || !equipPos
            ? " log-route-panel__ends--single"
            : ""
        }`}
      >
        {viewer === "supply" && equipPos ? (
          <div className="log-route-end">
            <PinLabel tone="equipment">Equipment</PinLabel>
            <strong>
              {equipmentLocation?.name || "Selected equipment"}
            </strong>
            <p className="log-route-end__addr">
              {equipmentLocation?.pin_kind === "live"
                ? "Live GPS"
                : equipmentLocation?.pin_kind === "home"
                  ? "Home / create location"
                  : "Last known position"}
              {equipmentLocation?.label
                ? ` · ${equipmentLocation.label}`
                : ""}
            </p>
            <span className="log-route-end__coords">
              {equipPos.lat.toFixed(4)}, {equipPos.lng.toFixed(4)}
            </span>
          </div>
        ) : null}
        <div className="log-route-end">
          <PinLabel tone="site">Site</PinLabel>
          <strong>{placeShortLabel(site?.address) || "Work site"}</strong>
          <p className="log-route-end__addr">
            {site?.address || "Where the equipment is required"}
          </p>
          {sitePos ? (
            <span className="log-route-end__coords">
              {sitePos.lat.toFixed(4)}, {sitePos.lng.toFixed(4)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="log-route-map log-route-map--leaflet" style={{ height }}>
        <div
          ref={elRef}
          className="log-eq-map"
          style={{ height: "100%", width: "100%" }}
          role="img"
          aria-label="Equipment site map"
        />
        {distanceLabel && showDispatch ? (
          <span className="log-route-map__badge">{distanceLabel} · road</span>
        ) : null}
        {viewer === "supply" && !equipPos ? (
          <span className="log-route-map__badge">Site only · no equipment GPS yet</span>
        ) : null}
      </div>
    </section>
  );
}
