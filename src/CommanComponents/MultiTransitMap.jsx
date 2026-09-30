import { useEffect, useRef } from "react";
import { parseJobCoords } from "./LogisticsJobRoutePanel";
import {
  truckStatusPinHtml,
  vehicleMapPinTone,
} from "./LogisticsFleetMap";
import {
  buildNearestMultiTransitRoute,
  stopIconState,
} from "../utils/multiTransitRoute";
import { loadLeaflet } from "../utils/loadLeaflet";

/** Package teardrop — red pick / green drop; faded when that leg is done. */
function packageStopPinHtml(kind, faded, step) {
  const palette =
    kind === "dropoff"
      ? { light: "#2ecc71", dark: "#1e8f4a", title: "Dropoff" }
      : { light: "#e85d4c", dark: "#c73e32", title: "Pickup" };
  const opacity = faded ? "0.38" : "1";
  const badge = step
    ? `<span class="log-mt-step-badge">${step}</span>`
    : "";

  return `<div class="log-map-truck-pin log-mt-pkg-pin${
    faded ? " is-faded" : ""
  }" style="opacity:${opacity}" title="${palette.title}">
    ${badge}
    <svg viewBox="0 0 48 64" width="40" height="52" aria-hidden="true">
      <path fill="${palette.light}" d="M24 2C13.5 2 5 10.5 5 21c0 14.5 19 41 19 41s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <path fill="${palette.dark}" d="M24 2c0 0 0 60 0 60s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
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

function straightPathFromPlan(plan) {
  const path = [];
  if (plan?.origin) {
    path.push([plan.origin.lat, plan.origin.lng]);
  }
  (plan?.stops || []).forEach((s) => {
    path.push([s.lat, s.lng]);
  });
  return path;
}

function resolveRoutePath(plan) {
  if (Array.isArray(plan?.roadPath) && plan.roadPath.length >= 2) {
    return plan.roadPath;
  }
  return straightPathFromPlan(plan);
}

/** Stop zoom/pan animations before remove — avoids `_leaflet_pos` on dead panes. */
function destroyLeafletMap(map) {
  if (!map) return;
  try {
    map.stop?.();
  } catch {
    /* ignore */
  }
  try {
    map.off();
  } catch {
    /* ignore */
  }
  try {
    // Kill pending zoom transition callbacks before tearing down panes
    if (map._panAnim) {
      map._panAnim.stop?.();
      map._panAnim = null;
    }
    map._zoomTransitionEnd = null;
  } catch {
    /* ignore */
  }
  try {
    map.remove();
  } catch {
    /* ignore */
  }
}

/**
 * Multi-transit map: package pins + one road-following common route.
 * Animations disabled; safe teardown prevents `_leaflet_pos` crashes from
 * fitBounds/zoom ending after React Strict Mode or route updates unmount the map.
 */
export default function MultiTransitMap({
  jobs = [],
  height = 520,
  focusJobId,
  truckLocation = null,
  truckAvailability = "on_job",
  routePlan = null,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const routeLineRef = useRef(null);
  const plan =
    routePlan || buildNearestMultiTransitRoute(jobs, truckLocation);
  const planRef = useRef(plan);
  planRef.current = plan;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const truckRef = useRef(truckLocation);
  truckRef.current = truckLocation;
  const focusRef = useRef(focusJobId);
  focusRef.current = focusJobId;
  const truckTone = vehicleMapPinTone(truckAvailability);
  const toneRef = useRef(truckTone);
  toneRef.current = truckTone;

  // Structure only — road geometry must NOT remount the map.
  const structureKey = JSON.stringify({
    jobs: (jobs || []).map((j) => [
      j._id,
      j.status,
      j.pickup?.coordinates,
      j.dropoff?.coordinates,
    ]),
    focus: focusJobId || "",
    truck: truckLocation
      ? [truckLocation.lat, truckLocation.lng, truckTone]
      : null,
    route: (plan.stops || []).map((s) => s.key),
  });

  const routePathKey = JSON.stringify({
    src: plan.distanceSource || "",
    n: plan.roadPath?.length || 0,
    a: plan.roadPath?.[0] || null,
    b: plan.roadPath?.[plan.roadPath.length - 1] || null,
    stops: (plan.stops || []).map((s) => [s.lat, s.lng]),
    origin: plan.origin || null,
  });

  useEffect(() => {
    let cancelled = false;
    let resizeTimer;
    let mapInstance = null;

    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !elRef.current) return;

        destroyLeafletMap(mapRef.current);
        mapRef.current = null;
        routeLineRef.current = null;

        const planLocal = planRef.current;
        const jobsLocal = jobsRef.current || [];
        const truckLocationLocal = truckRef.current;
        const focusLocal = focusRef.current;
        const toneLocal = toneRef.current;
        const bounds = [];
        const center =
          planLocal.origin ||
          (truckLocationLocal &&
          Number.isFinite(truckLocationLocal.lat) &&
          Number.isFinite(truckLocationLocal.lng)
            ? [truckLocationLocal.lat, truckLocationLocal.lng]
            : [-17.8252, 31.0335]);

        const map = L.map(elRef.current, {
          scrollWheelZoom: true,
          // Prevent zoom-end callbacks after unmount (Strict Mode / remount)
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView(
          Array.isArray(center) ? center : [center.lat, center.lng],
          11,
          { animate: false }
        );

        if (cancelled) {
          destroyLeafletMap(map);
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

        const layers = L.layerGroup().addTo(map);

        if (
          truckLocationLocal &&
          Number.isFinite(Number(truckLocationLocal.lat)) &&
          Number.isFinite(Number(truckLocationLocal.lng))
        ) {
          const tLat = Number(truckLocationLocal.lat);
          const tLng = Number(truckLocationLocal.lng);
          bounds.push([tLat, tLng]);
          L.marker([tLat, tLng], {
            icon: L.divIcon({
              className: "log-map-icon",
              html: truckStatusPinHtml(toneLocal),
              iconSize: [40, 52],
              iconAnchor: [20, 50],
              popupAnchor: [0, -44],
            }),
            zIndexOffset: 800,
          })
            .addTo(layers)
            .bindPopup(
              `<b>Your truck</b><br/>Start of suggested route<br/>${
                toneLocal === "on_route"
                  ? "On route"
                  : toneLocal === "available"
                    ? "Available"
                    : "Offline"
              }`
            );
        }

        const stepByKey = new Map(
          (planLocal.stops || []).map((s) => [s.key, s.step])
        );

        jobsLocal.forEach((job) => {
          const pickup = parseJobCoords(job?.pickup?.coordinates);
          const dropoff = parseJobCoords(job?.dropoff?.coordinates);
          const jobId = String(job._id);
          const entries = [
            pickup && {
              kind: "pickup",
              lat: pickup.lat,
              lng: pickup.lng,
              address: job.pickup?.address,
              key: `${jobId}:pick`,
            },
            dropoff && {
              kind: "dropoff",
              lat: dropoff.lat,
              lng: dropoff.lng,
              address: job.dropoff?.address,
              key: `${jobId}:drop`,
            },
          ].filter(Boolean);

          entries.forEach((item) => {
            const faded = stopIconState(job, item.kind) === "done";
            const step = stepByKey.get(item.key);
            const focused =
              focusLocal && String(job._id) === String(focusLocal);
            const label = `${job.job_number || "Job"} · ${
              item.kind === "pickup" ? "Pickup" : "Dropoff"
            }${faded ? " (done)" : ""}${step ? ` · Stop #${step}` : ""}`;
            bounds.push([item.lat, item.lng]);
            L.marker([item.lat, item.lng], {
              icon: L.divIcon({
                className: `log-map-icon${focused ? " is-focused" : ""}`,
                html: packageStopPinHtml(item.kind, faded, step),
                iconSize: [40, 52],
                iconAnchor: [20, 50],
                popupAnchor: [0, -44],
              }),
              zIndexOffset: faded ? 100 : step ? 400 + (20 - (step || 0)) : 200,
            })
              .addTo(layers)
              .bindPopup(
                `<b>${job.job_number || "Job"}</b><br/>${label}<br/>${
                  item.address || ""
                }`
              );
          });
        });

        const path = resolveRoutePath(planRef.current);
        if (path.length >= 2) {
          routeLineRef.current = L.polyline(path, {
            color: "#038654",
            weight: 5,
            opacity: 0.92,
            lineJoin: "round",
            lineCap: "round",
          }).addTo(map);
        }

        if (cancelled || mapRef.current !== map) {
          destroyLeafletMap(map);
          return;
        }

        if (bounds.length > 1) {
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 13,
            animate: false,
          });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 12, { animate: false });
        }

        resizeTimer = setTimeout(() => {
          if (cancelled || mapRef.current !== map) return;
          try {
            if (map.getContainer?.() && map._loaded) {
              map.invalidateSize({ animate: false });
            }
          } catch {
            /* ignore */
          }
        }, 100);
      } catch {
        /* keep empty */
      }
    })();

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      const map = mapRef.current || mapInstance;
      mapRef.current = null;
      routeLineRef.current = null;
      destroyLeafletMap(map);
    };
  }, [structureKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap polyline in place when road geometry arrives (no remount)
  useEffect(() => {
    const map = mapRef.current;
    const L = typeof window !== "undefined" ? window.L : null;
    if (!map || !L || !map._loaded) return;
    try {
      if (!map.getContainer?.()) return;
    } catch {
      return;
    }

    const path = resolveRoutePath(planRef.current);

    try {
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
      if (path.length >= 2) {
        routeLineRef.current = L.polyline(path, {
          color: "#038654",
          weight: 5,
          opacity: 0.92,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map);
      }
    } catch {
      /* ignore */
    }
  }, [routePathKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="log-mt-map"
      style={{ height }}
      ref={elRef}
      role="img"
      aria-label="Multi-transit suggested route map"
    />
  );
}
