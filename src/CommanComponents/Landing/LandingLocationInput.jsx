import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveLocationCoords,
  selectLocationPrediction,
  useLocationPredictions,
} from "../../utils/landingLocationPredictions";

export { resolveLocationCoords } from "../../utils/landingLocationPredictions";

export default function LandingLocationInput({
  value,
  onChange,
  onCoordsChange,
  onFocus,
  onBlur,
  onEnter,
  placeholder = "Search city or area…",
  dropdownMode = "fixed",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const externalDropdown = dropdownMode === "external";
  const useFixedDropdown = dropdownMode === "fixed";

  const { predictions, loading, emptyQuery, skipNextFetch } = useLocationPredictions(
    value,
    { enabled: !externalDropdown, minLength: 2 }
  );

  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const updateDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el || !useFixedDropdown) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 5000,
    });
  }, [useFixedDropdown]);

  const showInternalDropdown =
    !externalDropdown &&
    open &&
    String(value || "").trim().length >= 2 &&
    (loading || predictions.length > 0 || emptyQuery);

  const applyCoords = (coords) => {
    if (!coords) {
      onCoordsChange?.(null);
      return;
    }
    onCoordsChange?.(coords);
    localStorage.setItem("latitude", String(coords.lat));
    localStorage.setItem("longitude", String(coords.lng));
  };

  const handleSelectPrediction = async (prediction) => {
    setOpen(false);
    skipNextFetch();
    await selectLocationPrediction(prediction, { onChange, onCoordsChange });
  };

  const handleEnter = async () => {
    setOpen(false);
    const resolved = await resolveLocationCoords(value, null);
    if (resolved) {
      skipNextFetch();
      applyCoords(resolved);
      onChange?.(resolved.label || value);
    }
    onEnter?.(resolved);
  };

  useEffect(() => {
    if (externalDropdown || !open) return undefined;
    const onDocPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const frameId = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", onDocPointerDown);
    });
    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("pointerdown", onDocPointerDown);
    };
  }, [externalDropdown, open]);

  useEffect(() => {
    if (!showInternalDropdown || !useFixedDropdown) {
      setDropdownStyle(null);
      return undefined;
    }
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [
    showInternalDropdown,
    useFixedDropdown,
    predictions.length,
    loading,
    updateDropdownPosition,
  ]);

  useEffect(() => {
    if (!externalDropdown && String(value || "").trim().length >= 2) {
      setOpen(true);
    }
  }, [value, externalDropdown]);

  return (
    <div className="landing-search__loc-wrap" ref={wrapRef}>
      <input
        ref={inputRef}
        type="text"
        className="landing-search__loc-input"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange?.(e.target.value);
          onCoordsChange?.(null);
          if (!externalDropdown && e.target.value.trim().length >= 2) {
            setOpen(true);
          }
        }}
        onFocus={() => {
          onFocus?.();
          if (!externalDropdown) setOpen(true);
        }}
        onBlur={() => onBlur?.()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleEnter();
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />

      {showInternalDropdown && (
        <ul
          className={`landing-search__suggestions landing-search__suggestions--places${
            useFixedDropdown ? " landing-search__suggestions--fixed" : ""
          }`}
          style={useFixedDropdown ? dropdownStyle || undefined : undefined}
        >
          {loading && predictions.length === 0 && (
            <li className="landing-search__suggestion-muted">Searching…</li>
          )}
          {predictions.map((item) => (
            <li
              key={item.place_id}
              onPointerDown={(e) => {
                e.preventDefault();
                handleSelectPrediction(item);
              }}
            >
              {item.description}
            </li>
          ))}
          {!loading && emptyQuery && (
            <li className="landing-search__suggestion-muted">
              No locations found — try a city or area name
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
