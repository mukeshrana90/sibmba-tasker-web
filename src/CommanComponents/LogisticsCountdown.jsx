import { useEffect, useState } from "react";

/** Re-render every second while `active` (shared ticking clock). */
export function useNowTick(active = true, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs]);
  return now;
}

/** ms left until expiresAt; skewMs = serverNow - clientNow (corrects device clock). */
export function msLeft(expiresAt, now = Date.now(), skewMs = 0) {
  if (!expiresAt) return null;
  const t = new Date(expiresAt).getTime();
  if (!Number.isFinite(t)) return null;
  return t - (now + skewMs);
}

export function formatCountdown(ms) {
  if (ms == null) return "";
  if (ms <= 0) return "Expired";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Local ("Now") job countdown chip: amber, turns red under 5 min, grey when expired.
 */
export default function LogisticsCountdown({ expiresAt, now, skewMs = 0, compact = false }) {
  const left = msLeft(expiresAt, now, skewMs);
  if (left == null) return null;
  const tone = left <= 0 ? "expired" : left <= 5 * 60 * 1000 ? "urgent" : "live";
  const until = new Date(expiresAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <span
      className={`log-countdown log-countdown--${tone}`}
      role="timer"
      aria-live="off"
      title={`Auto-cancels at ${until} if no quote is accepted`}
    >
      <span className="log-countdown__icon" aria-hidden="true">
        ⏱
      </span>
      <b>{left <= 0 ? "Expired" : formatCountdown(left)}</b>
      {!compact && left > 0 ? <small>left · until {until}</small> : null}
    </span>
  );
}
