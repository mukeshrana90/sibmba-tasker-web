import { useEffect, useRef } from "react";
import { loadLeaflet } from "../utils/loadLeaflet";

/**
 * Map vehicle pin tone from availability:
 * - offline → red truck teardrop (provided pin art)
 * - on_job → green truck teardrop (in route)
 * - available* / returning_empty → yellow truck teardrop
 */
export function vehicleMapPinTone(availability) {
  const s = String(availability || "offline").toLowerCase();
  if (s === "on_job") return "on_route";
  if (
    s === "available_now" ||
    s === "returning_empty" ||
    s === "scheduled" ||
    s === "available_tomorrow"
  ) {
    return "available";
  }
  return "offline";
}

/** Teardrop truck pin — only the pin body colour changes (red / yellow / green). */
export function truckStatusPinHtml(tone) {
  const palette = {
    offline: { light: "#e53935", dark: "#b71c1c", title: "Offline" },
    available: { light: "#f5c518", dark: "#d4a017", title: "Available" },
    on_route: { light: "#2ecc71", dark: "#1e8f4a", title: "On route" },
  };
  const colors = palette[tone] || palette.offline;

  return `<div class="log-map-truck-pin log-map-truck-pin--${tone}" title="${colors.title}">
    <svg viewBox="0 0 48 64" width="40" height="52" aria-hidden="true">
      <path fill="${colors.light}" d="M24 2C13.5 2 5 10.5 5 21c0 14.5 19 41 19 41s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <path fill="${colors.dark}" d="M24 2c0 0 0 60 0 60s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <circle cx="24" cy="22" r="12.5" fill="#f0f0f0"/>
      <path fill="#ffffff" d="M24 9.5c-6.9 0-12.5 5.6-12.5 12.5 0 6.9 5.6 12.5 12.5 12.5V9.5Z"/>
      <g fill="#151515" transform="translate(11.5 16)">
        <path d="M2.2 11.2h20.2v3.1H2.2z"/>
        <path d="M3.2 4.2h11.6v7H3.2z"/>
        <path d="M14.8 6.1h4.6l2.4 5.1h-7V6.1z"/>
        <rect x="4.1" y="5.4" width="3.2" height="2.4" rx="0.35" fill="#fff"/>
        <rect x="8.2" y="6.8" width="4.6" height="0.85" rx="0.2" fill="#fff" fill-opacity="0.85"/>
        <circle cx="6.2" cy="14.35" r="1.85" fill="#151515"/>
        <circle cx="6.2" cy="14.35" r="0.75" fill="#fff"/>
        <circle cx="17.6" cy="14.35" r="1.85" fill="#151515"/>
        <circle cx="17.6" cy="14.35" r="0.75" fill="#fff"/>
      </g>
    </svg>
  </div>`;
}

/** Blue teardrop pin with cardboard package (pending jobs). */
function packagePinHtml() {
  return `<div class="log-map-truck-pin log-map-truck-pin--job" title="Pending job">
    <svg viewBox="0 0 48 64" width="40" height="52" aria-hidden="true">
      <path fill="#3b82f6" d="M24 2C13.5 2 5 10.5 5 21c0 14.5 19 41 19 41s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <path fill="#1d4ed8" d="M24 2c0 0 0 60 0 60s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
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

/** Amber teardrop pin with lightning bolt (local "Now" jobs). */
function localJobPinHtml() {
  return `<div class="log-map-truck-pin log-map-truck-pin--local" title="Local job (Now)">
    <svg viewBox="0 0 48 64" width="40" height="52" aria-hidden="true">
      <path fill="#f59e0b" d="M24 2C13.5 2 5 10.5 5 21c0 14.5 19 41 19 41s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <path fill="#d97706" d="M24 2c0 0 0 60 0 60s19-26.5 19-41C43 10.5 34.5 2 24 2Z"/>
      <circle cx="24" cy="22" r="12.5" fill="#fffbeb"/>
      <path fill="#b45309" d="M26.2 12.5 17.8 23.4h5.4l-1.6 8.6 8.6-11.2h-5.6z"/>
    </svg>
  </div>`;
}

/** Now job = local with an expiry (legacy local rows are plain pending jobs). */
export function isLocalNowJob(job) {
  return job?.job_class === "local" && Boolean(job?.expires_at);
}

function vehicleIconOptions(L, tone) {
  return L.divIcon({
    className: "log-map-icon",
    html: truckStatusPinHtml(tone),
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    popupAnchor: [0, -44],
  });
}

function jobIconOptions(L, local = false) {
  return L.divIcon({
    className: "log-map-icon",
    html: local ? localJobPinHtml() : packagePinHtml(),
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    popupAnchor: [0, -44],
  });
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

/** Escape text for Leaflet popup HTML. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMapDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function buildJobPopupHtml(point) {
  const lines = [`<b>${escapeHtml(point.label)}</b>`];
  if (point.local) {
    lines.push(
      `<span class="log-map-popup-now">⚡ Local job (Now)${
        point.expiresLabel ? ` · expires ${escapeHtml(point.expiresLabel)}` : ""
      }</span>`
    );
  }
  const pickup = String(point.pickupLabel || "").trim();
  const dropoff = String(point.dropoffLabel || "").trim();
  if (pickup || dropoff) {
    if (pickup && dropoff && pickup === dropoff) {
      lines.push(`Site: ${escapeHtml(pickup)}`);
    } else {
      if (pickup) lines.push(`<b>Pickup:</b> ${escapeHtml(pickup)}`);
      if (dropoff) lines.push(`<b>Drop-off:</b> ${escapeHtml(dropoff)}`);
    }
  } else if (point.sub) {
    lines.push(escapeHtml(point.sub));
  }
  if (point.neededLabel && !point.local) {
    lines.push(`<b>Needed:</b> ${escapeHtml(point.neededLabel)}`);
  }
  if (point.local && point.href) {
    lines.push(
      // Owners view (their operators quote) — v2.7.30
      `<a class="log-map-popup-link" href="${escapeHtml(point.href)}">${
        String(point.href).includes("/logistics/owner/") ? "View job" : "Quote now"
      } →</a>`
    );
  }
  return lines.join("<br/>");
}

function buildPoints(vehicles, jobs, showVehicles, showJobs, showLocalJobs, jobHrefBase) {
  return [
    ...(showVehicles
      ? (vehicles || []).map((v) => {
          const pinKind =
            v.live_location?.pin_kind || v.live_location?.source || "";
          const op = v.live_location?.operator_name;
          const tone = vehicleMapPinTone(v.availability);
          let sub = "Vehicle";
          if (pinKind === "live" || pinKind === "operator") {
            sub = op ? `Live · Operator: ${op}` : "Live GPS";
          } else if (pinKind === "home") {
            sub = op
              ? `Home / create location · ${op}`
              : "Home / create location";
          } else if (pinKind === "last_known" || pinKind === "asset") {
            sub = op ? `Last GPS · ${op}` : "Last known GPS";
          } else if (op) {
            sub = `Operator: ${op}`;
          }
          if (tone === "on_route") sub = `${sub} · On route`;
          else if (tone === "available") sub = `${sub} · Available`;
          else sub = `${sub} · Offline`;
          return {
            lat: Number(v.live_location?.lat),
            lng: Number(v.live_location?.lng),
            kind: "vehicle",
            tone,
            label: v.name,
            sub,
          };
        })
      : []),
    // Pending (corridor) jobs and local "Now" jobs are separate layers
    ...(jobs || [])
      .filter((j) => (isLocalNowJob(j) ? showLocalJobs : showJobs))
      .map((j) => {
        const local = isLocalNowJob(j);
        const id = j.job_id || j._id;
        return {
          lat: Number(j.lat),
          lng: Number(j.lng),
          kind: "job",
          local,
          label: j.load_type || (local ? "Local job" : "Pending job"),
          pickupLabel: j.pickup_address || "",
          dropoffLabel: j.dropoff_address || "",
          createdLabel: formatMapDate(j.createdAt),
          neededLabel: formatMapDate(j.when_needed),
          expiresLabel: local
            ? new Date(j.expires_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          href: local && jobHrefBase && id ? `${jobHrefBase}/${id}` : "",
        };
      }),
  ].filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** Stable key so parent re-renders with equal data do not remount Leaflet. */
export function fleetMapDataKey(vehicles, jobs, showVehicles, showJobs, showLocalJobs = true) {
  const v = showVehicles
    ? (vehicles || []).map((x) => [
        x.asset_id || x._id || "",
        x.live_location?.lat,
        x.live_location?.lng,
        x.name || "",
        vehicleMapPinTone(x.availability),
      ])
    : [];
  const j = showJobs || showLocalJobs
    ? (jobs || []).map((x) => [
        x._id || x.job_id || "",
        x.lat,
        x.lng,
        x.load_type || "",
        x.pickup_address || "",
        x.dropoff_address || "",
        x.createdAt || "",
        x.when_needed || "",
        x.job_class || "",
        x.expires_at || "",
      ])
    : [];
  return JSON.stringify({
    v,
    j,
    showVehicles: !!showVehicles,
    showJobs: !!showJobs,
    showLocalJobs: !!showLocalJobs,
  });
}

/**
 * Full-width fleet map: vehicles (recent GPS) + pending job pickups.
 * Keeps one Leaflet instance and swaps markers — avoids _leaflet_pos crashes
 * when availability (pin colour) changes mid zoom/pan.
 */
export default function LogisticsFleetMap({
  vehicles = [],
  jobs = [],
  showVehicles = true,
  showJobs = true,
  showLocalJobs = true,
  jobHrefBase = "",
  height = 420,
}) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const LRef = useRef(null);
  const dataKey = fleetMapDataKey(vehicles, jobs, showVehicles, showJobs, showLocalJobs);
  const propsRef = useRef({ vehicles, jobs, showVehicles, showJobs, showLocalJobs, jobHrefBase });
  propsRef.current = { vehicles, jobs, showVehicles, showJobs, showLocalJobs, jobHrefBase };

  useEffect(() => {
    let cancelled = false;
    let resizeTimer;

    const paintMarkers = (map, L) => {
      const {
        vehicles: vs,
        jobs: js,
        showVehicles: sv,
        showJobs: sj,
        showLocalJobs: sl,
        jobHrefBase: hb,
      } = propsRef.current;
      const points = buildPoints(vs, js, sv, sj, sl, hb);

      if (layerRef.current) {
        try {
          layerRef.current.clearLayers();
        } catch {
          /* ignore */
        }
      } else {
        layerRef.current = L.layerGroup().addTo(map);
      }

      const iconCache = {
        offline: vehicleIconOptions(L, "offline"),
        on_route: vehicleIconOptions(L, "on_route"),
        available: vehicleIconOptions(L, "available"),
      };
      const jobIcon = jobIconOptions(L);
      const localJobIcon = jobIconOptions(L, true);
      const bounds = [];

      points.forEach((p) => {
        const icon =
          p.kind === "job"
            ? p.local
              ? localJobIcon
              : jobIcon
            : iconCache[p.tone] || iconCache.offline;
        const marker = L.marker([p.lat, p.lng], { icon });
        marker.bindPopup(
          p.kind === "job"
            ? buildJobPopupHtml(p)
            : `<b>${escapeHtml(p.label)}</b><br/>${escapeHtml(p.sub || "")}`
        );
        layerRef.current.addLayer(marker);
        bounds.push([p.lat, p.lng]);
      });

      try {
        map.stop?.();
        if (bounds.length > 1) {
          map.fitBounds(bounds, {
            padding: [28, 28],
            maxZoom: 13,
            animate: false,
          });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 12, { animate: false });
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
            scrollWheelZoom: false,
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
        // keep empty panel; list panels still work
      }
    })();

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [dataKey]);

  useEffect(() => {
    return () => {
      layerRef.current = null;
      const map = mapRef.current;
      mapRef.current = null;
      safeDestroyMap(map);
    };
  }, []);

  return (
    <div
      className="log-fleet-map"
      style={{ height }}
      ref={elRef}
      role="img"
      aria-label="Fleet and pending jobs map"
    />
  );
}
