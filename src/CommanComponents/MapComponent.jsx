import React, { useEffect, useRef, useState } from "react";
import {
  geocodeFreeText,
  getGoogleMapsApiKey,
  loadGooglePlaces,
} from "../utils/landingPlaces";

function parseCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function isUsableAddress(address) {
  const trimmed = String(address || "").trim();
  if (!trimmed) return false;
  if (trimmed === "undefined" || trimmed === "null") return false;
  if (/\bundefined\b/i.test(trimmed)) return false;
  return true;
}

const GoogleMap = ({ coordinates, address, onMapClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);

  onMapClickRef.current = onMapClick;

  const position = parseCoordinates(coordinates);

  useEffect(() => {
    if (!mapRef.current || !position || !window.google?.maps) return;

    if (!mapInstanceRef.current) {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
      });

      const newMarker = new window.google.maps.Marker({
        position,
        map: googleMap,
        title: address || "",
      });

      mapInstanceRef.current = googleMap;
      markerRef.current = newMarker;

      googleMap.addListener("click", (event) => {
        const clickedPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        markerRef.current?.setPosition(clickedPosition);
        onMapClickRef.current?.(clickedPosition);
      });
    }

    markerRef.current?.setPosition(position);
    mapInstanceRef.current.setCenter(position);

    const resizeTimer = window.setTimeout(() => {
      if (mapInstanceRef.current) {
        window.google.maps.event.trigger(mapInstanceRef.current, "resize");
        mapInstanceRef.current.setCenter(position);
      }
    }, 150);

    return () => window.clearTimeout(resizeTimer);
    // position derived from coordinates prop via lat/lng deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, address]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  if (!position) {
    return <div>No location data available</div>;
  }

  return (
    <div
      ref={mapRef}
      style={{ height: "400px", width: "100%", cursor: "crosshair" }}
    />
  );
};

const MapComponent = ({ coordinates, address, onMapClick }) => {
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && !!window.google?.maps
  );
  const [error, setError] = useState(false);
  const [resolvedCoordinates, setResolvedCoordinates] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (ready) return undefined;

    let cancelled = false;

    const boot = async () => {
      try {
        if (window.google?.maps) {
          if (!cancelled) setReady(true);
          return;
        }
        if (getGoogleMapsApiKey()) {
          await loadGooglePlaces();
        }
        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("MapComponent: failed to load Google Maps", err);
        if (!cancelled) setError(true);
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const direct = parseCoordinates(coordinates);
    if (direct) {
      setResolvedCoordinates(coordinates);
      setGeocoding(false);
      return undefined;
    }

    if (!isUsableAddress(address)) {
      setResolvedCoordinates(null);
      setGeocoding(false);
      return undefined;
    }

    let cancelled = false;
    setGeocoding(true);

    geocodeFreeText(address)
      .then((result) => {
        if (cancelled) return;
        if (result?.lat != null && result?.lng != null) {
          setResolvedCoordinates([result.lng, result.lat]);
        } else {
          setResolvedCoordinates(null);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedCoordinates(null);
      })
      .finally(() => {
        if (!cancelled) setGeocoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coordinates, address]);

  if (error) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
        Unable to load map. You can still pick an address from Google search.
      </div>
    );
  }

  if (!ready || geocoding) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      coordinates={resolvedCoordinates}
      address={address}
      onMapClick={onMapClick}
    />
  );
};

export default MapComponent;
