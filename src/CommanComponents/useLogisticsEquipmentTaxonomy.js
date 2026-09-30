import { useEffect, useState } from "react";
import Api from "../Services/api";
import {
  fallbackCatalogByHub,
  normalizeHubCatalog,
} from "./logisticsEquipmentCatalog";

let memoryCache = null;
let inflight = null;

async function fetchTaxonomyByHub() {
  if (memoryCache) return memoryCache;
  if (!inflight) {
    inflight = Api.get("/logistics/equipment-taxonomy", { skipAuth: true })
      .then((response) => {
        const data = response?.data?.data || response?.data || {};
        const raw = data.by_hub || {};
        const by_hub = {};
        for (const key of Object.keys(raw)) {
          by_hub[key] = normalizeHubCatalog(raw[key]);
        }
        if (!Object.keys(by_hub).length && Array.isArray(data.hubs)) {
          for (const hub of data.hubs) {
            by_hub[hub.hub_category] = normalizeHubCatalog(hub);
          }
        }
        if (!Object.keys(by_hub).length) {
          throw new Error("Empty equipment taxonomy");
        }
        memoryCache = by_hub;
        return by_hub;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Shared loader for Fleet / PostJob / Search equipment + subtype pickers. */
export function useLogisticsEquipmentTaxonomy() {
  const [byHub, setByHub] = useState(() => memoryCache || fallbackCatalogByHub());
  const [loading, setLoading] = useState(!memoryCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchTaxonomyByHub();
        if (!cancelled) {
          setByHub(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load equipment taxonomy");
          if (!memoryCache) setByHub(fallbackCatalogByHub());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { byHub, loading, error };
}

export function clearEquipmentTaxonomyCache() {
  memoryCache = null;
}
