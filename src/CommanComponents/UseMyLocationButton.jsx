import { useNearbyLocationToggle } from "../Hooks/useNearbyLocationToggle";

/**
 * "Use my location" (item 49). Reuses the app's permission flow; onLocated gets
 * { lat, lng, label: "Current location" }.
 */
export default function UseMyLocationButton({ onLocated, className = "", active = false }) {
  const { loading, handleToggle, permissionModal } = useNearbyLocationToggle({
    onEnabled: (coords) =>
      onLocated?.({ lat: coords.lat, lng: coords.lng, label: "Current location" }),
  });
  return (
    <>
      <button
        type="button"
        className={`use-my-location${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
        data-testid="use-my-location"
        disabled={loading}
        onClick={(e) => handleToggle(e, false)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          <circle cx="12" cy="12" r="8" />
        </svg>
        {loading ? "Finding you…" : "Use my location"}
      </button>
      {permissionModal}
    </>
  );
}
