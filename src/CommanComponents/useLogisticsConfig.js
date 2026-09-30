import { useEffect, useState } from "react";
import Api from "../Services/api";

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
};

let memoryCache = null;
let inflight = null;

function fetchLogisticsConfig() {
  if (memoryCache) return Promise.resolve(memoryCache);
  if (!inflight) {
    inflight = Api.get("/logistics/session")
      .then((response) => {
        const cfg = response?.data?.data?.config || {};
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
