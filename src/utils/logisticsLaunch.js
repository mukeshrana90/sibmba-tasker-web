import { useEffect, useState } from "react";
import Api from "../Services/api";

// 23 Nov (client): "Approvals from 25 Nov 2026 · First 60 days free · simbatasker.com ·
// WhatsApp +263 …" — all from backend .env via GET /logistics/public-config (no login).
let config = { approvals_from: null, approvals_from_ts: null, free_days: 60, support_whatsapp: null };
let loaded = false;
let inflight = null;
const listeners = new Set();

export function loadLaunchConfig() {
  if (loaded) return Promise.resolve(config);
  if (inflight) return inflight;
  inflight = Api.get("/logistics/public-config", { skipErrorToast: true })
    .then((r) => {
      const d = r?.data?.data;
      if (d) {
        config = { ...config, ...d, free_days: Number.isFinite(Number(d.free_days)) ? Number(d.free_days) : config.free_days };
        loaded = true;
        listeners.forEach((fn) => fn(config));
      }
      return config;
    })
    .catch(() => config)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Free period length in days (60 until the API says otherwise). */
export function freeDays() {
  return config.free_days;
}

export function useLaunchConfig() {
  const [c, setC] = useState(config);
  useEffect(() => {
    listeners.add(setC);
    loadLaunchConfig();
    return () => listeners.delete(setC);
  }, []);
  return c;
}

/** "+263786545442" → "+263 786 545 442" */
export function formatZimPhone(raw) {
  const d = String(raw || "").replace(/[^\d+]/g, "");
  const m = d.match(/^\+?263(\d{2,3})(\d{3})(\d{3})$/);
  return m ? `+263 ${m[1]} ${m[2]} ${m[3]}` : String(raw || "");
}

/** "25 Nov 2026" in Harare time. */
export function formatApprovalsFrom(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" });
}
