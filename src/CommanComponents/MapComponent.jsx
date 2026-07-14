import React, { useEffect, useMemo, useRef, useState } from "react";
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

function buildMapEmbedUrl(coordinates, address) {
  const position = parseCoordinates(coordinates);
  if (position) {
    return `https://maps.google.com/maps?q=${position.lat},${position.lng}&z=14&output=embed`;
  }
  if (isUsableAddress(address)) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(
      String(address).trim()
    )}&z=14&output=embed`;
  }
  return null;
}

function MapEmbed({ url }) {
  return (
    <iframe
      title="Location map"
      src={url}
      width="100%"
      height="400"
      style={{ border: 0, borderRadius: "8px" }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}

function ReadOnlyMap({ coordinates, address }) {
  const embedUrl = useMemo(
    () => buildMapEmbedUrl(coordinates, address),
    [coordinates, address]
  );

  if (!embedUrl) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-muted"
        style={{ height: 400 }}
      >
        No location data available
      </div>
    );
  }

  return <MapEmbed url={embedUrl} />;
}

function MapUnavailable({ message }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-muted text-center px-3"
      style={{ height: 400, background: "#f8f9fa", borderRadius: 8 }}
    >
      <p className="mb-1 fw-semibold" style={{ color: "#444" }}>
        Map unavailable
      </p>
      <p className="mb-0 small" style={{ maxWidth: 360 }}>
        {message ||
          "Google Maps could not load. Search for an address above, or try again later."}
      </p>
    </div>
  );
}

const GoogleMap = ({ coordinates, address, onMapClick, onInitError }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);
  const onInitErrorRef = useRef(onInitError);

  onMapClickRef.current = onMapClick;
  onInitErrorRef.current = onInitError;

  const position = parseCoordinates(coordinates);

  useEffect(() => {
    if (!position || !window.google?.maps) return undefined;

    let cancelled = false;
    let resizeTimer = null;

    const init = () => {
      if (cancelled) return;
      const el = mapRef.current;
      if (!(el instanceof HTMLElement)) {
        resizeTimer = window.setTimeout(init, 50);
        return;
      }

      try {
        if (!mapInstanceRef.current) {
          const googleMap = new window.google.maps.Map(el, {
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
            if (!event?.latLng) return;
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

        resizeTimer = window.setTimeout(() => {
          if (!mapInstanceRef.current || !window.google?.maps?.event) return;
          window.google.maps.event.trigger(mapInstanceRef.current, "resize");
          mapInstanceRef.current.setCenter(position);
        }, 150);
      } catch (err) {
        console.error("MapComponent: failed to init map", err);
        onInitErrorRef.current?.(err);
      }
    };

    // Wait a frame so the modal has painted the map container.
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(init);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lng, address]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  if (!position) {
    return <MapUnavailable message="No location data available yet. Search or click the map after it loads." />;
  }

  return (
    <div
      ref={mapRef}
      style={{ height: "400px", width: "100%", cursor: "crosshair" }}
    />
  );
};

const InteractiveMap = ({ coordinates, address, onMapClick }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resolvedCoordinates, setResolvedCoordinates] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const embedFallbackUrl = useMemo(
    () => buildMapEmbedUrl(resolvedCoordinates || coordinates, address),
    [resolvedCoordinates, coordinates, address]
  );

  useEffect(() => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      setError(true);
      setErrorMessage(
        "Google Maps API key is invalid or the Maps project was deleted. Update REACT_APP_GOOGLE_MAPS_API_KEY."
      );
      setReady(false);
      previousAuthFailure?.();
    };
    return () => {
      window.gm_authFailure = previousAuthFailure;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        if (!getGoogleMapsApiKey()) {
          if (!cancelled) {
            setError(true);
            setErrorMessage("Missing REACT_APP_GOOGLE_MAPS_API_KEY.");
          }
          return;
        }

        if (window.google?.maps?.Map) {
          if (!cancelled) setReady(true);
          return;
        }

        await loadGooglePlaces();
        if (cancelled) return;

        if (!window.google?.maps?.Map) {
          setError(true);
          setErrorMessage("Google Maps failed to load.");
          return;
        }
        setReady(true);
      } catch (err) {
        console.error("MapComponent: failed to load Google Maps", err);
        if (!cancelled) {
          setError(true);
          setErrorMessage(
            err?.message || "Google Maps failed to load. Check your API key."
          );
        }
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (embedFallbackUrl) {
      return <MapEmbed url={embedFallbackUrl} />;
    }
    return <MapUnavailable message={errorMessage} />;
  }

  if (!ready || geocoding) {
    return (
      <div
        className="d-flex align-items-center justify-content-center text-muted"
        style={{ height: 400 }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      coordinates={resolvedCoordinates || coordinates}
      address={address}
      onMapClick={onMapClick}
      onInitError={() => {
        setError(true);
        setErrorMessage(
          "Could not initialize the map. Search for an address above, or check the Google Maps API key."
        );
      }}
    />
  );
};

const MapComponent = ({ coordinates, address, onMapClick }) => {
  if (!onMapClick) {
    return <ReadOnlyMap coordinates={coordinates} address={address} />;
  }

  return (
    <InteractiveMap
      coordinates={coordinates}
      address={address}
      onMapClick={onMapClick}
    />
  );
};

export default MapComponent;
