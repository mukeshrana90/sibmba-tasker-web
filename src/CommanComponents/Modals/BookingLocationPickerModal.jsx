import { useEffect, useRef, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { Wrapper, Status } from "@googlemaps/react-wrapper";
import AddressAutocomplete from "../AddressAutocomplete";
import { getGoogleMapsApiKey } from "../../utils/landingPlaces";

const DEFAULT_CENTER = { lat: -17.8292, lng: 31.0522 };

function MapStatus({ status }) {
  if (status === Status.LOADING) {
    return <div className="bk-map-status">Loading map…</div>;
  }
  if (status === Status.FAILURE) {
    return <div className="bk-map-status">Unable to load map.</div>;
  }
  return null;
}

function PickerMap({ center, address, onPick }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || mapObj.current) return;

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
        onPick({ lat, lng, address: label });
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
    // Map instance is created once per center; onPick uses latest callback via closure at init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!markerRef.current || !mapObj.current) return;
    const position = { lat: center.lat, lng: center.lng };
    markerRef.current.setPosition(position);
    mapObj.current.panTo(position);
  }, [center.lat, center.lng]);

  return <div ref={mapRef} className="bk-map-canvas" />;
}

export default function BookingLocationPickerModal({
  show,
  onHide,
  initialLocation,
  onConfirm,
}) {
  const [draft, setDraft] = useState(null);
  const apiKey =
    getGoogleMapsApiKey() || "AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww";

  useEffect(() => {
    if (!show) return;
    if (initialLocation?.lat != null && initialLocation?.lng != null) {
      setDraft(initialLocation);
    } else {
      setDraft({
        address: "",
        lat: DEFAULT_CENTER.lat,
        lng: DEFAULT_CENTER.lng,
      });
    }
  }, [show, initialLocation]);

  const handlePlaceSelected = (place) => {
    const loc = place?.geometry?.location;
    if (!loc) return;
    const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
    setDraft({
      address: place.formatted_address || "",
      lat,
      lng,
    });
  };

  const center = draft
    ? { lat: draft.lat, lng: draft.lng }
    : DEFAULT_CENTER;

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
        <Modal.Title>Pick service location</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bk-loc-body">
        <p className="bk-loc-hint">
          Search for an address or tap the map to drop a pin.
        </p>
        <div className="bk-loc-search">
          <AddressAutocomplete
            apiKey={apiKey}
            className="control"
            defaultValue={draft?.address || ""}
            options={{ types: ["geocode"] }}
            onPlaceSelected={handlePlaceSelected}
            onChange={(e) =>
              setDraft((prev) => ({
                ...(prev || DEFAULT_CENTER),
                address: e.target.value,
              }))
            }
          />
        </div>
        <div className="bk-map-wrap">
          {show && draft && (
            <Wrapper
              apiKey={apiKey}
              render={MapStatus}
              libraries={["places", "geocoding"]}
            >
              <PickerMap
                key={`${draft.lat}-${draft.lng}`}
                center={center}
                address={draft.address}
                onPick={setDraft}
              />
            </Wrapper>
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
            disabled={!draft?.address?.trim()}
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
