import { useEffect, useState } from "react";
import Api from "../Services/api";
import { MAX_UPLOAD_MB, setUploadLimitMb } from "../utils/uploadLimits";

/**
 * Server .env settings from GET /logistics/session → config (Now window,
 * local radius, cab service flag + classes). Cached for the page session.
 */
// Fallback only — live values (incl. USD fare bands) come from session config
export const DEFAULT_CAB_CLASSES = [
  { id: "bike", label: "Bike", wheels: 2, max_seats: 1, fare: { min_per_km: 0.25, max_per_km: 0.5, min_fare: 1 } },
  { id: "auto", label: "Auto", wheels: 3, max_seats: 3, fare: { min_per_km: 0.6, max_per_km: 0.9, min_fare: 1.5 } },
  { id: "car", label: "Car", wheels: 4, max_seats: 6, fare: { min_per_km: 1.1, max_per_km: 1.5, min_fare: 3 } },
];

const DEFAULT_CONFIG = {
  now_job_expiry_minutes: 30,
  local_job_radius_km: 50,
  cab_service_enabled: false,
  cab_now_job_expiry_minutes: 30,
  cab_classes: DEFAULT_CAB_CLASSES,
  cab_fare_currency: "USD",
  cab_road_distance_factor: 1.3,
  // Cab drop-off geofence (backend CAB_DROP_LOCATION_VERIFICATION)
  cab_drop_verification_enabled: false,
  cab_drop_radius_km: 1,
  // Upload limit per file (backend LOGISTICS_UPLOAD_MAX_MB)
  upload: { max_file_mb: MAX_UPLOAD_MB },
};

let memoryCache = null;
let inflight = null;

function fetchLogisticsConfig() {
  if (memoryCache) return Promise.resolve(memoryCache);
  // Guests browsing the public hub: /logistics/session needs login — use the
  // defaults and don't cache them, so the real config loads after login.
  if (!localStorage.getItem("token")) return Promise.resolve(DEFAULT_CONFIG);
  if (!inflight) {
    inflight = Api.get("/logistics/session")
      .then((response) => {
        if (!response?.data?.data?.config) return DEFAULT_CONFIG;
        const cfg = response.data.data.config;
        setUploadLimitMb(cfg.upload?.max_file_mb);
        memoryCache = {
          ...DEFAULT_CONFIG,
          ...cfg,
          cab_classes:
            Array.isArray(cfg.cab_classes) && cfg.cab_classes.length
              ? cfg.cab_classes
              : DEFAULT_CAB_CLASSES,
        };
        return memoryCache;
      })
      .catch(() => DEFAULT_CONFIG)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useLogisticsConfig() {
  const [config, setConfig] = useState(() => memoryCache || DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(Boolean(memoryCache));

  useEffect(() => {
    let alive = true;
    fetchLogisticsConfig().then((cfg) => {
      if (!alive) return;
      setConfig(cfg);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { config, loaded, cabEnabled: Boolean(config.cab_service_enabled) };
}

export function cabClassMeta(classes, id) {
  return (classes || DEFAULT_CAB_CLASSES).find((c) => c.id === id) || null;
}
