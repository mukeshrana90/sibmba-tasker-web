import { useEffect, useState } from "react";
import Api from "../Services/api";

// 23 Nov (client): home / login / sign-up numbers come live from the database
// (GET /customer/public/home-stats, cached 10 min on the server). These are only
// shown until the first answer arrives or when the API can't be reached.
const FALLBACK = { registered_providers: 3800, users: 6000, categories: 30, rating: 4.1 };
let cache = null;
let inflight = null;

function fetchStats() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = Api.get("/customer/public/home-stats", { skipErrorToast: true })
      .then((r) => {
        const d = r?.data?.data;
        if (d) cache = { ...(d.display || d), rating: d.rating };
        return cache;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** "3,800+" — the server already rounds down. */
export const plusCount = (n) => `${Number(n || 0).toLocaleString("en-US")}+`;
export const ratingText = (r) => `${Number(r || 0).toFixed(1)}★`;

export default function useHomeStats() {
  const [stats, setStats] = useState(cache || FALLBACK);
  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => {
      if (alive && s) setStats({ ...FALLBACK, ...s });
    });
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}
