/**
 * Operator dashboard availability helpers (pure — unit tested).
 */

// available_tomorrow is stored as "scheduled" (equipment only).
export const OPERATOR_STATUS_OPTIONS = [
  { value: "available_now", label: "Available now" },
  { value: "returning_empty", label: "Return empty" },
  { value: "available_tomorrow", label: "Scheduled" },
  { value: "offline", label: "Offline" },
];

export const OPERATOR_STATUS_LABEL = {
  available_now: "AVAILABLE NOW",
  available_tomorrow: "SCHEDULED",
  returning_empty: "RETURNING EMPTY",
  scheduled: "SCHEDULED",
  offline: "OFFLINE",
  on_job: "ON JOB",
};

/**
 * Status options for the selected asset.
 * Trucks: available now / return empty / offline.
 * Equipment: available now / return empty / scheduled / offline.
 */
export function statusOptionsForAsset(asset, options = OPERATOR_STATUS_OPTIONS) {
  if (asset?.kind === "equipment") return options;
  return options.filter((opt) => opt.value !== "available_tomorrow");
}

/** Keep select value valid when options change (e.g. switch to equipment). */
export function coerceStatusSelection(selectedState, options) {
  if (options.some((o) => o.value === selectedState)) return selectedState;
  return options[0]?.value || "offline";
}

export function remainingLabel(until) {
  if (!until) return null;
  const end = new Date(until).getTime();
  if (!Number.isFinite(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function isLiveAvailabilityState(uiState) {
  return ["available_now", "returning_empty", "available_tomorrow"].includes(
    uiState
  );
}
