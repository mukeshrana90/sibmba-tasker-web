const SCRIPT_ATTR = "data-landing-places-script";
const ZW_BBOX = "25.2,-22.5,33.1,-15.6";
const LOAD_TIMEOUT_MS = 8000;
const GOOGLE_PREDICT_TIMEOUT_MS = 6000;

let loadPromise = null;

function getApiKey() {
  const raw = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

export function getGoogleMapsApiKey() {
  return getApiKey();
}

function withTimeout(promise, ms, label = "timeout") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

function waitForGooglePlaces(maxMs = LOAD_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== "undefined" && window.google?.maps?.places) {
        resolve(window.google);
        return;
      }
      if (Date.now() - start > maxMs) {
        reject(new Error("Google Places load timeout"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function injectGooglePlacesScript(apiKey, resolve, reject) {
  const callbackName = "__landingPlacesInit";
  window[callbackName] = () => {
    delete window[callbackName];
    if (window.google?.maps?.places) resolve(window.google);
    else reject(new Error("Google Places library unavailable"));
  };

  const script = document.createElement("script");
  script.setAttribute(SCRIPT_ATTR, "1");
  script.async = true;
  script.defer = true;
  script.onerror = () => reject(new Error("Failed to load Google Maps"));
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
    apiKey
  )}&libraries=places&loading=async&callback=${callbackName}`;
  document.head.appendChild(script);
}

export function loadGooglePlaces() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return Promise.reject(new Error("Missing REACT_APP_GOOGLE_MAPS_API_KEY"));
  }

  if (typeof window !== "undefined" && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (loadPromise) {
    return withTimeout(loadPromise, LOAD_TIMEOUT_MS);
  }

  loadPromise = new Promise((resolve, reject) => {
    const ours = document.querySelector(`script[${SCRIPT_ATTR}]`);
    const anyMaps = document.querySelector('script[src*="maps.googleapis.com"]');

    if (ours || anyMaps) {
      waitForGooglePlaces(LOAD_TIMEOUT_MS).then(resolve).catch(() => {
        if (!ours) {
          injectGooglePlacesScript(apiKey, resolve, reject);
          waitForGooglePlaces(LOAD_TIMEOUT_MS).then(resolve).catch(reject);
        } else {
          reject(new Error("Google Places load timeout"));
        }
      });
      return;
    }

    injectGooglePlacesScript(apiKey, resolve, reject);
    waitForGooglePlaces(LOAD_TIMEOUT_MS).then(resolve).catch(reject);
  });

  return withTimeout(loadPromise, LOAD_TIMEOUT_MS);
}

function formatPhotonLabel(props) {
  const parts = [
    props.name,
    props.city,
    props.district,
    props.state,
    props.country,
  ].filter((p) => p && p !== props.name);
  const unique = [...new Set(parts)];
  return [props.name, ...unique].filter(Boolean).join(", ");
}

export async function fetchPhotonPredictions(input, options = {}) {
  const query = String(input || "").trim();
  if (query.length < 2) return [];

  const { worldwide = false, limit = 8 } = options;

  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      lang: "en",
    });
    if (!worldwide) {
      params.set("bbox", ZW_BBOX);
    }

    const url = `https://photon.komoot.io/api/?${params.toString()}`;
    const res = await withTimeout(fetch(url), 5000, "photon-timeout");
    if (!res.ok) return [];

    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    return features
      .filter((f) => {
        if (worldwide) return true;
        const code = f?.properties?.countrycode;
        return !code || code === "ZW";
      })
      .map((f) => {
        const [lng, lat] = f.geometry?.coordinates || [];
        const props = f.properties || {};
        const osmId = props.osm_id || props.name;
        return {
          place_id: `photon:${props.osm_type || "x"}:${osmId}:${lat}:${lng}`,
          description: formatPhotonLabel(props),
          isPhoton: true,
          source: "photon",
          lat,
          lng,
        };
      })
      .filter((item) => item.description && item.lat != null && item.lng != null);
  } catch {
    return [];
  }
}

/** Server-side friendly — used in tests and mirrors browser Google autocomplete. */
export async function fetchGooglePredictionsREST(input, apiKey = getApiKey()) {
  const query = String(input || "").trim();
  if (query.length < 2 || !apiKey) return { status: "NO_KEY", predictions: [] };

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
    query
  )}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    status: data.status || "UNKNOWN",
    predictions: Array.isArray(data.predictions) ? data.predictions : [],
    error: data.error_message,
  };
}

async function fetchGooglePredictions(input) {
  const query = String(input || "").trim();
  if (query.length < 2 || !getApiKey()) return [];

  const google = await loadGooglePlaces();
  return new Promise((resolve) => {
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input: query },
      (predictions, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !predictions?.length
        ) {
          resolve([]);
          return;
        }
        resolve(
          predictions.map((p) => ({
            ...p,
            source: "google",
          }))
        );
      }
    );
  });
}

function dedupePredictions(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${(item.description || "").toLowerCase()}|${item.lat ?? ""}|${
      item.lng ?? ""
    }`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeLocationPredictions({
  googleItems = [],
  photonItems = [],
  localItems = [],
} = {}) {
  const merged = [...googleItems, ...photonItems];
  const seen = new Set(
    merged.map((i) => (i.description || "").toLowerCase())
  );

  localItems.forEach((item) => {
    const key = (item.description || "").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  return dedupePredictions(merged);
}

export async function fetchPlacePredictions(input) {
  const query = String(input || "").trim();
  if (query.length < 2) return [];

  let googleItems = [];
  if (getApiKey()) {
    try {
      googleItems = await withTimeout(
        fetchGooglePredictions(query),
        GOOGLE_PREDICT_TIMEOUT_MS
      );
    } catch {
      googleItems = [];
    }
  }

  let photonItems = [];
  if (googleItems.length < 6) {
    photonItems = await fetchPhotonPredictions(query, {
      worldwide: true,
      limit: Math.max(4, 8 - googleItems.length),
    });
  }

  return mergeLocationPredictions({ googleItems, photonItems, localItems: [] });
}

export async function fetchPlaceDetails(placeId) {
  if (!placeId || String(placeId).startsWith("photon:")) return null;

  try {
    const google = await loadGooglePlaces();
    const host = document.createElement("div");
    const service = new google.maps.places.PlacesService(host);

    return await new Promise((resolve) => {
      service.getDetails(
        {
          placeId,
          fields: ["formatted_address", "geometry", "name"],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else {
            resolve(null);
          }
        }
      );
    });
  } catch {
    return null;
  }
}

export function readPlaceCoords(place) {
  const loc = place?.geometry?.location;
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return { lat, lng };
}

export async function geocodeFreeText(text) {
  const query = String(text || "").trim();
  if (!query) return null;

  if (getApiKey()) {
    try {
      const google = await loadGooglePlaces();
      const geocoded = await new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
          if (status !== "OK" || !results?.[0]) {
            resolve(null);
            return;
          }
          const place = results[0];
          const coords = readPlaceCoords(place);
          if (!coords) {
            resolve(null);
            return;
          }
          resolve({
            lat: coords.lat,
            lng: coords.lng,
            label: place.formatted_address || query,
          });
        });
      });
      if (geocoded) return geocoded;
    } catch {
      /* fall through */
    }
  }

  const photon = await fetchPhotonPredictions(query, { worldwide: true, limit: 1 });
  if (photon[0]?.lat != null) {
    return {
      lat: photon[0].lat,
      lng: photon[0].lng,
      label: photon[0].description,
    };
  }

  return null;
}

export async function reverseGeocodeCoords(lat, lng) {
  if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return null;
  }

  if (getApiKey()) {
    try {
      const google = await loadGooglePlaces();
      const reversed = await new Promise((resolve) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            resolve({
              lat: Number(lat),
              lng: Number(lng),
              label: results[0].formatted_address,
            });
          } else {
            resolve(null);
          }
        });
      });
      if (reversed) return reversed;
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=en`
    );
    if (res.ok) {
      const data = await res.json();
      const props = data?.features?.[0]?.properties;
      if (props) {
        const parts = [props.name, props.city, props.state, props.country].filter(Boolean);
        if (parts.length) {
          return { lat: Number(lat), lng: Number(lng), label: parts.join(", ") };
        }
      }
    }
  } catch {
    /* fall through */
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
    label: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
  };
}
