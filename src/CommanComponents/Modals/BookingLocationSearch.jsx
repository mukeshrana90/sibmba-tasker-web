import { useEffect, useRef, useState } from "react";
import {
  fetchPlaceDetails,
  fetchPlacePredictions,
  geocodeFreeText,
} from "../../utils/landingPlaces";
import {
  draftFromPlace,
  draftFromPrediction,
} from "../../utils/bookingLocationPicker";

export default function BookingLocationSearch({ value, onChange, onSelect }) {
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const skipPredictionsRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [emptyQuery, setEmptyQuery] = useState(false);

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
        const items = await fetchPlacePredictions(query);
        if (requestId !== requestIdRef.current) return;
        setPredictions(items);
        setEmptyQuery(items.length === 0);
        setOpen(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setPredictions([]);
        setEmptyQuery(true);
        setOpen(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 220);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applyDraft = (draft) => {
    if (!draft) return;
    skipPredictionsRef.current = true;
    setOpen(false);
    setPredictions([]);
    onChange(draft.address || "");
    onSelect(draft);
  };

  const handleSelect = async (prediction) => {
    const photonDraft = draftFromPrediction(prediction);
    if (photonDraft) {
      applyDraft(photonDraft);
      return;
    }

    setLoading(true);
    const place = await fetchPlaceDetails(prediction.place_id);
    setLoading(false);

    const placeDraft = draftFromPlace(place);
    if (placeDraft) {
      applyDraft(placeDraft);
      return;
    }

    const geocoded = await geocodeFreeText(prediction.description);
    if (geocoded) {
      applyDraft({
        address: geocoded.label || prediction.description,
        lat: geocoded.lat,
        lng: geocoded.lng,
      });
    }
  };

  const handleEnter = async () => {
    const query = String(value || "").trim();
    if (!query) return;
    setOpen(false);
    setLoading(true);
    const geocoded = await geocodeFreeText(query);
    setLoading(false);
    if (geocoded) {
      applyDraft({
        address: geocoded.label || query,
        lat: geocoded.lat,
        lng: geocoded.lng,
      });
    }
  };

  const showDropdown = open && (loading || predictions.length > 0 || emptyQuery);

  return (
    <div className="bk-loc-search-wrap" ref={wrapRef}>
      <input
        type="text"
        className="control"
        placeholder="Enter a location"
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0 || loading) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleEnter();
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {showDropdown && (
        <ul className="bk-loc-suggestions" role="listbox">
          {loading && predictions.length === 0 && (
            <li className="bk-loc-suggestion-muted">Searching…</li>
          )}
          {predictions.map((item) => (
            <li
              key={item.place_id}
              role="option"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
            >
              {item.description}
            </li>
          ))}
          {!loading && emptyQuery && (
            <li className="bk-loc-suggestion-muted">
              No locations found — try a different search
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
