import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPlaceDetails,
  fetchPlacePredictions,
  geocodeFreeText,
  mergeLocationPredictions,
  readPlaceCoords,
} from "../../utils/landingPlaces";
import {
  geocodeLocationText,
  zimbabweCitySuggestions,
} from "../../utils/landingGeocode";

function buildLocalPredictions(query) {
  const q = query.toLowerCase();
  return zimbabweCitySuggestions
    .filter((city) => city.toLowerCase().includes(q))
    .map((city) => ({
      place_id: `local:${city}`,
      description: `${city}, Zimbabwe`,
      isLocal: true,
    }));
}

export async function resolveLocationCoords(text, storedCoords) {
  if (
    storedCoords?.lat != null &&
    storedCoords?.lng != null &&
    !Number.isNaN(storedCoords.lat) &&
    !Number.isNaN(storedCoords.lng)
  ) {
    return storedCoords;
  }

  const local = geocodeLocationText(text);
  if (local) {
    return { lat: local.lat, lng: local.lng, label: local.label };
  }

  if (text?.trim()) {
    const geocoded = await geocodeFreeText(text);
    if (geocoded) return geocoded;
  }

  return null;
}

export default function LandingLocationInput({
  value,
  onChange,
  onCoordsChange,
  onFocus,
  onBlur,
  onEnter,
  placeholder = "Search city or area…",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const skipPredictionsRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [emptyQuery, setEmptyQuery] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const updateDropdownPosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 5000,
    });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (skipPredictionsRef.current) {
      skipPredictionsRef.current = false;
      return undefined;
    }

    const query = String(value || "").trim();
    if (query.length < 2) {
      setPredictions([]);
      setLoading(false);
      setEmptyQuery(false);
      setOpen(false);
      return undefined;
    }

    setLoading(true);
    setOpen(true);
    setPredictions([]);
    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const remoteItems = await fetchPlacePredictions(query);
        if (requestId !== requestIdRef.current) return;

        const localItems =
          remoteItems.length < 6 ? buildLocalPredictions(query) : [];
        const merged = mergeLocationPredictions({
          googleItems: remoteItems.filter((i) => i.source === "google"),
          photonItems: remoteItems.filter((i) => i.source === "photon"),
          localItems,
        });

        setPredictions(merged);
        setEmptyQuery(merged.length === 0);
        setOpen(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        const localItems = buildLocalPredictions(query);
        setPredictions(localItems);
        setEmptyQuery(localItems.length === 0);
        setOpen(localItems.length > 0);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const applyCoords = (coords) => {
    if (!coords) {
      onCoordsChange(null);
      return;
    }
    onCoordsChange(coords);
    localStorage.setItem("latitude", String(coords.lat));
    localStorage.setItem("longitude", String(coords.lng));
  };

  const handleSelectPrediction = async (prediction) => {
    skipPredictionsRef.current = true;
    setOpen(false);
    setPredictions([]);
    setEmptyQuery(false);

    const label = prediction.description || "";
    onChange(label);

    if (prediction.isLocal) {
      const cityName = label.replace(/, Zimbabwe$/i, "").trim();
      const local = geocodeLocationText(cityName);
      if (local) {
        applyCoords({ lat: local.lat, lng: local.lng, label: local.label });
        onChange(local.label);
      }
      return;
    }

    if (prediction.isPhoton && prediction.lat != null && prediction.lng != null) {
      applyCoords({
        lat: prediction.lat,
        lng: prediction.lng,
        label,
      });
      return;
    }

    setLoading(true);
    const place = await fetchPlaceDetails(prediction.place_id);
    const coords = readPlaceCoords(place);
    setLoading(false);

    if (coords) {
      applyCoords({
        lat: coords.lat,
        lng: coords.lng,
        label: place?.formatted_address || label,
      });
      onChange(place?.formatted_address || label);
      return;
    }

    const resolved = await resolveLocationCoords(label, null);
    if (resolved) {
      applyCoords(resolved);
      onChange(resolved.label || label);
    }
  };

  const handleEnter = async () => {
    setOpen(false);
    const resolved = await resolveLocationCoords(value, null);
    if (resolved) {
      skipPredictionsRef.current = true;
      applyCoords(resolved);
      onChange(resolved.label || value);
    }
    onEnter?.(resolved);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showDropdown = open && (loading || predictions.length > 0 || emptyQuery);

  useEffect(() => {
    if (!showDropdown) {
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
  }, [showDropdown, predictions.length, loading, updateDropdownPosition]);

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
          onChange(e.target.value);
          onCoordsChange(null);
          if (e.target.value.trim().length >= 2) setOpen(true);
        }}
        onFocus={() => {
          onFocus?.();
          if (predictions.length > 0 || loading) setOpen(true);
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

      {showDropdown && (
        <ul
          className="landing-search__suggestions landing-search__suggestions--places landing-search__suggestions--fixed"
          style={dropdownStyle || undefined}
        >
          {loading && predictions.length === 0 && (
            <li className="landing-search__suggestion-muted">Searching…</li>
          )}
          {predictions.map((item) => (
            <li
              key={item.place_id}
              onMouseDown={(e) => {
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
