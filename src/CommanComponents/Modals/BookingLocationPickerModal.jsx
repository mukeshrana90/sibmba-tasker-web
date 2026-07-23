import { useEffect, useRef, useState } from "react";
import Modal from "react-bootstrap/Modal";
import BookingLocationSearch from "./BookingLocationSearch";
import { loadGooglePlaces } from "../../utils/landingPlaces";
import {
  DEFAULT_BOOKING_MAP_CENTER,
  resolveBookingPickerDraft,
} from "../../utils/bookingLocationPicker";

function PickerMap({ center, address, onPick }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  const [mapsReady, setMapsReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.maps
  );
  const [mapsError, setMapsError] = useState(false);

  onPickRef.current = onPick;

  useEffect(() => {
    if (mapsReady) return undefined;

    let cancelled = false;
    loadGooglePlaces()
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [mapsReady]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !mapsReady || mapObj.current) {
      return undefined;
    }

    const position = { lat: center.lat, lng: center.lng };
    const map = new window.google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new window.google.maps.Marker({
      position,
      map,
      draggable: true,
      title: address || "Selected location",
    });

    const emitPick = (lat, lng) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const label =
          status === "OK" && results?.[0]?.formatted_address
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onPickRef.current({ lat, lng, address: label });
      });
    };

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      emitPick(pos.lat(), pos.lng());
    });

    map.addListener("click", (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      marker.setPosition({ lat, lng });
      map.panTo({ lat, lng });
      emitPick(lat, lng);
    });

    mapObj.current = map;
    markerRef.current = marker;

    const resizeTimer = window.setTimeout(() => {
      if (mapObj.current) {
        window.google.maps.event.trigger(mapObj.current, "resize");
        mapObj.current.setCenter(position);
      }
    }, 150);

    return () => window.clearTimeout(resizeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, center.lat, center.lng]);

  useEffect(() => {
    if (!markerRef.current || !mapObj.current) return;
    const position = { lat: center.lat, lng: center.lng };
    markerRef.current.setPosition(position);
    mapObj.current.panTo(position);
  }, [center.lat, center.lng]);

  useEffect(() => {
    return () => {
      mapObj.current = null;
      markerRef.current = null;
    };
  }, []);

  if (mapsError) {
    return <div className="bk-map-status">Unable to load map.</div>;
  }

  if (!mapsReady) {
    return <div className="bk-map-status">Loading map…</div>;
  }

  return <div ref={mapRef} className="bk-map-canvas" />;
}

export default function BookingLocationPickerModal({
  show,
  onHide,
  initialLocation,
  onConfirm,
  title = "Pick service location",
  hint = "Search for an address or tap the map to drop a pin.",
}) {
  const [draft, setDraft] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [resolving, setResolving] = useState(false);
  const initialLocationRef = useRef(initialLocation);

  useEffect(() => {
    if (!show) return;
    initialLocationRef.current = initialLocation;
  }, [show, initialLocation]);

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;
    setResolving(true);
    setDraft(null);
    setSearchText("");

    resolveBookingPickerDraft(initialLocationRef.current)
      .then((resolved) => {
        if (cancelled) return;
        setDraft(resolved);
        setSearchText(resolved.address || "");
      })
      .catch(() => {
        if (cancelled) return;
        setDraft({
          address: "",
          lat: DEFAULT_BOOKING_MAP_CENTER.lat,
          lng: DEFAULT_BOOKING_MAP_CENTER.lng,
        });
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [show]);

  const center = draft
    ? { lat: draft.lat, lng: draft.lng }
    : DEFAULT_BOOKING_MAP_CENTER;

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      className="simba-book-loc-modal"
      backdropClassName="simba-book-loc-backdrop"
    >
      <Modal.Header closeButton className="bk-modal-head">
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bk-loc-body">
        <p className="bk-loc-hint">{hint}</p>
        <div className="bk-loc-search">
          <BookingLocationSearch
            value={searchText}
            onChange={setSearchText}
            onSelect={(location) => {
              setDraft(location);
              setSearchText(location.address || "");
            }}
          />
        </div>
        <div className="bk-map-wrap">
          {show && draft && !resolving && (
            <PickerMap
              key={`${draft.lat}-${draft.lng}`}
              center={center}
              address={draft.address}
              onPick={setDraft}
            />
          )}
          {(resolving || !draft) && (
            <div className="bk-map-status">Finding your location…</div>
          )}
        </div>
        {draft?.address && (
          <div className="bk-loc-selected">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>{draft.address}</span>
          </div>
        )}
        <div className="bk-modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onHide}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!draft?.address?.trim() || resolving}
            onClick={() => {
              if (draft) onConfirm(draft);
              onHide();
            }}
          >
            Use this location
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
