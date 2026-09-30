import { useState } from "react";
import BookingLocationPickerModal from "./Modals/BookingLocationPickerModal";
import { hasValidCoords } from "../utils/bookingLocationPicker";
import { IconMap, IconPin, LogFieldLabel } from "./LogisticsFormIcons";

/**
 * Logistics location field — reuses Tasker BookingLocationPickerModal
 * (search + map pin for street, landmark, or home without street address).
 */
export default function LogisticsLocationField({
  label,
  required = false,
  address = "",
  coords = null,
  onChange,
  title = "Pick location",
  hint = "Search an address, landmark, or tap the map to drop a pin — even if there is no street address.",
  chooseLabel = "Tap to choose location",
  compact = false,
  showLabelIcon = true,
}) {
  const [open, setOpen] = useState(false);
  const hasAddress = Boolean(String(address || "").trim());
  const lng = Array.isArray(coords) ? Number(coords[0]) : null;
  const lat = Array.isArray(coords) ? Number(coords[1]) : null;
  const coordsOk = hasValidCoords({ lat, lng });
  const displayAddress = hasAddress
    ? compact && address.length > 42
      ? `${address.slice(0, 40)}…`
      : address
    : chooseLabel;

  return (
    <div className={`log-field${compact ? " log-field--compact" : ""}`}>
      {label ? (
        showLabelIcon && !compact ? (
          <LogFieldLabel icon={<IconPin size={16} />} required={required}>
            {label}
          </LogFieldLabel>
        ) : (
          <span className="log-fl">
            {label}
            {required ? <span className="log-req"> *</span> : null}
          </span>
        )
      ) : null}
      <button
        type="button"
        className={`log-location-btn${hasAddress ? " has-value" : ""}${
          compact ? " log-location-btn--compact" : ""
        }`}
        onClick={() => setOpen(true)}
        title={hasAddress ? address : undefined}
      >
        <span className="log-location-btn__icon" aria-hidden="true">
          <IconPin size={compact ? 16 : 18} />
        </span>
        <span className="log-location-btn__text">
          <b>{displayAddress}</b>
          {!compact ? (
            <small>
              {hasAddress
                ? coordsOk
                  ? "Location selected — tap to search or pin another"
                  : "Tap to confirm on map"
                : "Search or pin on map"}
            </small>
          ) : null}
        </span>
        <span className="log-location-btn__change">
          <IconMap size={14} />
          {hasAddress ? "Edit" : "Set"}
        </span>
      </button>
      {coordsOk && !compact ? (
        <span className="log-weight-hint">
          Geo saved ({lat.toFixed(5)}, {lng.toFixed(5)})
        </span>
      ) : null}

      <BookingLocationPickerModal
        show={open}
        onHide={() => setOpen(false)}
        title={title}
        hint={hint}
        initialLocation={
          hasAddress
            ? {
                address,
                ...(coordsOk ? { lat, lng } : {}),
              }
            : null
        }
        onConfirm={(loc) => {
          setOpen(false);
          onChange?.({
            address: loc.address || "",
            coords:
              hasValidCoords(loc) ? [Number(loc.lng), Number(loc.lat)] : null,
          });
        }}
      />
    </div>
  );
}
