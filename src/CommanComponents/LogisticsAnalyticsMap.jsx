import { useEffect, useRef } from "react";
import { loadLeaflet } from "../utils/loadLeaflet";

function pinHtml(kind) {
  const color = kind === "dropoff" ? "#2e7d32" : "#c73e32";
  const title = kind === "dropoff" ? "Dropoff" : "Pickup";
  return `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)" title="${title}"></div>`;
}

function safeDestroyMap(map) {
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
    map.remove();
  } catch {
    /* ignore */
  }
}

function pointsKey(points) {
  return JSON.stringify(
    (points || []).map((p) => [p.kind, p.lat, p.lng, p.job_id || ""])
  );
}

/**
 * Analytics map — pickup (red) / dropoff (green) dots from job coordinates.
 * Keeps one Leaflet instance and swaps markers (same pattern as FleetMap) to
 * avoid `_leaflet_pos` crashes from zoom animation after teardown / navigation.
 */
export default function LogisticsAnalyticsMap({ points = [], height = 360 }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const LRef = useRef(null);
  const key = pointsKey(points);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const hasPoints = (points || []).some(
    (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
  );

  useEffect(() => {
    let cancelled = false;
    let resizeTimer;

    const paintMarkers = (map, L) => {
      const valid = (pointsRef.current || []).filter(
        (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
      );

      if (layerRef.current) {
        try {
          layerRef.current.clearLayers();
        } catch {
          /* ignore */
        }
      } else {
        layerRef.current = L.layerGroup().addTo(map);
      }

      const bounds = [];
      valid.forEach((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        bounds.push([lat, lng]);
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: "log-map-icon",
            html: pinHtml(p.kind),
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        });
        marker.bindPopup(
          `<b>${p.kind === "dropoff" ? "Dropoff" : "Pickup"}</b><br/>${
            p.label || ""
          }${p.job_number ? `<br/>Job ${p.job_number}` : ""}`
        );
        layerRef.current.addLayer(marker);
      });

      try {
        map.stop?.();
        if (bounds.length > 1) {
          map.fitBounds(bounds, {
            padding: [36, 36],
            maxZoom: 12,
            animate: false,
          });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 11, { animate: false });
        }
      } catch {
        /* map mid-teardown */
      }
    };

    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !elRef.current) return;
        LRef.current = L;

        if (!mapRef.current) {
          const map = L.map(elRef.current, {
            scrollWheelZoom: true,
            zoomAnimation: false,
            fadeAnimation: false,
            markerZoomAnimation: false,
          }).setView([-17.8252, 31.0335], 6);
          mapRef.current = map;

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
          }).addTo(map);

          layerRef.current = L.layerGroup().addTo(map);
        }

        paintMarkers(mapRef.current, L);

        resizeTimer = setTimeout(() => {
          if (cancelled || !mapRef.current) return;
          try {
            mapRef.current.invalidateSize({ animate: false });
          } catch {
            /* map already torn down */
          }
        }, 80);
      } catch {
        /* keep empty panel */
      }
    })();

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [key]);

  useEffect(() => {
    return () => {
      layerRef.current = null;
      const map = mapRef.current;
      mapRef.current = null;
      safeDestroyMap(map);
    };
  }, []);

  return (
    <div className="log-analytics-map-wrap" style={{ position: "relative" }}>
      {!hasPoints ? (
        <p
          className="logistics-empty"
          style={{
            position: "absolute",
            zIndex: 2,
            left: 12,
            top: 12,
            margin: 0,
            padding: "6px 10px",
            background: "rgba(255,255,255,.92)",
            borderRadius: 6,
          }}
        >
          No mapped pickups/dropoffs in this range
        </p>
      ) : null}
      <div
        className="log-analytics-map"
        style={{ height }}
        ref={elRef}
        role="img"
        aria-label="Jobs pickup and dropoff map"
      />
    </div>
  );
}
