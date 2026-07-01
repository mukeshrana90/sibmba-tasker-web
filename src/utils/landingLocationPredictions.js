import { useEffect, useRef, useState } from "react";
import {
  fetchPlaceDetails,
  fetchPlacePredictions,
  mergeLocationPredictions,
  readPlaceCoords,
} from "./landingPlaces";
import { geocodeLocationText, zimbabweCitySuggestions } from "./landingGeocode";
import { geocodeFreeText } from "./landingPlaces";

export function buildLocalLocationPredictions(query) {
  const q = String(query || "").toLowerCase();
  return zimbabweCitySuggestions
    .filter((city) => city.toLowerCase().includes(q))
    .map((city) => ({
      place_id: `local:${city}`,
      description: `${city}, Zimbabwe`,
      isLocal: true,
    }));
}

export function useLocationPredictions(query, { enabled = true, minLength = 2 } = {}) {
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const skipRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [emptyQuery, setEmptyQuery] = useState(false);

  const skipNextFetch = () => {
    skipRef.current = true;
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!enabled) {
      setPredictions([]);
      setLoading(false);
      setEmptyQuery(false);
      return undefined;
    }

    if (skipRef.current) {
      skipRef.current = false;
      return undefined;
    }

    const trimmed = String(query || "").trim();
    if (trimmed.length < minLength) {
      setPredictions([]);
      setLoading(false);
      setEmptyQuery(false);
      return undefined;
    }

    setLoading(true);
    setPredictions([]);
    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const remoteItems = await fetchPlacePredictions(trimmed);
        if (requestId !== requestIdRef.current) return;

        const localItems =
          remoteItems.length < 6 ? buildLocalLocationPredictions(trimmed) : [];
        const merged = mergeLocationPredictions({
          googleItems: remoteItems.filter((i) => i.source === "google"),
          photonItems: remoteItems.filter((i) => i.source === "photon"),
          localItems,
        });

        setPredictions(merged);
        setEmptyQuery(merged.length === 0);
      } catch {
        if (requestId !== requestIdRef.current) return;
        const localItems = buildLocalLocationPredictions(trimmed);
        setPredictions(localItems);
        setEmptyQuery(localItems.length === 0);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [query, enabled, minLength]);

  return { predictions, loading, emptyQuery, skipNextFetch };
}

export async function selectLocationPrediction(prediction, { onChange, onCoordsChange }) {
  const label = prediction?.description || "";
  onChange?.(label);

  const applyCoords = (coords) => {
    if (!coords) {
      onCoordsChange?.(null);
      return;
    }
    onCoordsChange?.(coords);
    localStorage.setItem("latitude", String(coords.lat));
    localStorage.setItem("longitude", String(coords.lng));
  };

  if (prediction?.isLocal) {
    const cityName = label.replace(/, Zimbabwe$/i, "").trim();
    const local = geocodeLocationText(cityName);
    if (local) {
      applyCoords({ lat: local.lat, lng: local.lng, label: local.label });
      onChange?.(local.label);
    }
    return local ? { lat: local.lat, lng: local.lng, label: local.label } : null;
  }

  if (
    prediction?.isPhoton &&
    prediction.lat != null &&
    prediction.lng != null
  ) {
    const coords = { lat: prediction.lat, lng: prediction.lng, label };
    applyCoords(coords);
    return coords;
  }

  const place = await fetchPlaceDetails(prediction.place_id);
  const coords = readPlaceCoords(place);
  if (coords) {
    const resolved = {
      lat: coords.lat,
      lng: coords.lng,
      label: place?.formatted_address || label,
    };
    applyCoords(resolved);
    onChange?.(resolved.label);
    return resolved;
  }

  const resolved = await resolveLocationCoords(label, null);
  if (resolved) {
    applyCoords(resolved);
    onChange?.(resolved.label || label);
  }
  return resolved;
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
