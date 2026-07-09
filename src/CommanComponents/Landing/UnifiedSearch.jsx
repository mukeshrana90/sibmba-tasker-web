import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { useLanding } from "../../context/LandingContext";
import {
  requestDeviceLocation,
  resolveSearchCoords,
} from "../../utils/landingGeocode";
import {
  selectLocationPrediction,
  useLocationPredictions,
} from "../../utils/landingLocationPredictions";
import { searchProvidersPath } from "../../utils/searchProvidersUrl";
import { serviceProviderPath } from "../../utils/normalizeMongoId";
import { Roles } from "../../utils/Roles";
import LandingLocationInput, {
  resolveLocationCoords,
} from "./LandingLocationInput";

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4-4" strokeLinecap="round" />
  </svg>
);

const LocationIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

function providerLabel(item) {
  const sp = item?.serviceProviderId || item?.serviceProvider;
  return (
    sp?.company_name ||
    sp?.full_name ||
    item?.serviceSubCategoryName ||
    "Provider"
  );
}

function providerId(item) {
  const sp = item?.serviceProviderId || item?.serviceProvider;
  return sp?._id || sp?.id;
}

export default function UnifiedSearch() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const popupRef = useRef(null);
  const debounceRef = useRef(null);
  const [useFixedPopup, setUseFixedPopup] = useState(false);
  const [popupFixedStyle, setPopupFixedStyle] = useState(null);

  const {
    selectCategory,
    nearbyEnabled,
    setNearbyEnabled,
    searchQuery,
    setSearchQuery,
    locationText,
    setLocationText,
    locationCoords,
    setLocationCoords,
  } = useLanding();

  const results = useSelector((s) => s.UserSlice.customerSearchResults);
  const [showPopup, setShowPopup] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeField, setActiveField] = useState("search");

  const locationQueryActive = String(locationText || "").trim().length >= 2;
  const {
    predictions: locationPredictions,
    loading: locationLoading,
    emptyQuery: locationEmpty,
    skipNextFetch: skipLocationFetch,
  } = useLocationPredictions(locationText, {
    enabled: activeField === "location" && locationQueryActive,
    minLength: 2,
  });

  const goToResultsPage = useCallback(
    async (opts = {}) => {
      const q = opts.query ?? searchQuery;
      const loc = opts.location ?? locationText;
      const nearby = opts.nearby ?? nearbyEnabled;
      const coordsFromOpts = opts.coords ?? locationCoords;

      if (nearby) {
        try {
          await requestDeviceLocation();
        } catch {
          /* use stored coords if GPS denied */
        }
      }

      let coords = resolveSearchCoords(loc, nearby, coordsFromOpts);

      if (!coords && !nearby && loc.trim()) {
        const resolved = await resolveLocationCoords(loc, coordsFromOpts);
        if (resolved) {
          coords = { lat: resolved.lat, lng: resolved.lng };
          setLocationCoords(resolved);
        }
      }

      setShowPopup(false);
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const resultsPath =
        token && String(role) === String(Roles.CUSTOMER)
          ? "/customer-search-providers"
          : "/search-providers";
      const trimmedLoc = loc.trim();
      const includeGeo = Boolean(trimmedLoc) || nearby;
      navigate(
        searchProvidersPath(resultsPath, {
          search: q.trim(),
          location: trimmedLoc,
          ...(includeGeo
            ? { lat: coords?.lat, lng: coords?.lng, nearby }
            : {}),
        })
      );
    },
    [
      navigate,
      searchQuery,
      locationText,
      locationCoords,
      nearbyEnabled,
      setLocationCoords,
    ]
  );

  const runSearch = useCallback(
    async (opts = {}) => {
      const q = opts.query ?? searchQuery;
      const loc = opts.location ?? locationText;
      const nearby = opts.nearby ?? nearbyEnabled;
      const coordsFromOpts = opts.coords ?? locationCoords;

      if (opts.redirect) {
        await goToResultsPage(opts);
        return;
      }

      if (nearby) {
        try {
          await requestDeviceLocation();
        } catch {
          /* use stored coords if GPS denied */
        }
      }

      let coords = resolveSearchCoords(loc, nearby, coordsFromOpts);

      if (!coords && !nearby && loc.trim()) {
        const resolved = await resolveLocationCoords(loc, coordsFromOpts);
        if (resolved) {
          coords = { lat: resolved.lat, lng: resolved.lng };
          setLocationCoords(resolved);
        }
      }

      if (!q.trim() && !loc.trim() && !nearby) {
        return;
      }

      setSearching(true);
      try {
        await dispatch(
          CustomerActions.customerSearch({
            search: q.trim(),
            ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
            ...(nearby ? { nearby: true } : {}),
          })
        );
        setShowPopup(true);
      } finally {
        setSearching(false);
      }
    },
    [
      dispatch,
      goToResultsPage,
      searchQuery,
      locationText,
      locationCoords,
      nearbyEnabled,
      setLocationCoords,
    ]
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (activeField === "location") return undefined;

    debounceRef.current = setTimeout(() => {
      const q = searchQuery.trim();
      const loc = locationText.trim();
      if (q || loc || nearbyEnabled) {
        runSearch({ query: searchQuery, location: locationText });
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, locationText, locationCoords, nearbyEnabled, activeField, runSearch]);

  useEffect(() => {
    if (!showPopup) return;

    const isInsideSearch = (e) => {
      const root = popupRef.current;
      if (!root) return false;
      if (e.target instanceof Node && root.contains(e.target)) return true;
      const rect = root.getBoundingClientRect();
      const { clientX: x, clientY: y } = e;
      return (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      );
    };

    const onDocPointerDown = (e) => {
      if (!isInsideSearch(e)) setShowPopup(false);
    };

    const onScroll = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      setShowPopup(false);
    };

    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [showPopup]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const sync = () => setUseFixedPopup(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const updatePopupPosition = useCallback(() => {
    const el = popupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPopupFixedStyle({
      position: "fixed",
      top: rect.bottom + 10,
      left: rect.left,
      width: rect.width,
      zIndex: 5000,
    });
  }, []);

  useEffect(() => {
    if (!showPopup || !useFixedPopup) {
      setPopupFixedStyle(null);
      return undefined;
    }
    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    return () => window.removeEventListener("resize", updatePopupPosition);
  }, [showPopup, useFixedPopup, updatePopupPosition]);

  const handleCategoryClick = (cat) => {
    selectCategory(cat._id);
    setShowPopup(false);
  };

  const handleProviderClick = (item) => {
    const pid = providerId(item);
    const sid = item._id;
    if (!pid) return;
    setShowPopup(false);
    navigate(serviceProviderPath(pid, sid));
  };

  const handleNearbyToggle = async (e) => {
    const on = e.target.checked;
    setNearbyEnabled(on);
    if (on) {
      try {
        await requestDeviceLocation();
      } catch {
        /* continue with stored coords */
      }
    }
    setActiveField("search");
    runSearch({ nearby: on });
  };

  const handleLocationSelect = async (prediction) => {
    skipLocationFetch();
    const coords = await selectLocationPrediction(prediction, {
      onChange: setLocationText,
      onCoordsChange: setLocationCoords,
    });
    setActiveField("search");
    setShowPopup(true);
    runSearch({
      location: coords?.label || prediction.description,
      coords: coords || undefined,
    });
  };

  const categories = nearbyEnabled ? [] : results?.category?.items || [];
  const providers = results?.bestService?.items || [];
  const nearbyCats = results?.nearbyService?.items || [];
  const hasLocationCoords = Boolean(
    resolveSearchCoords(locationText, false, locationCoords)
  );
  const hasSearchResults =
    categories.length > 0 || providers.length > 0 || nearbyCats.length > 0;
  const showLocationList =
    activeField === "location" &&
    locationQueryActive &&
    (locationLoading || locationPredictions.length > 0 || locationEmpty);
  const showSearchResults =
    activeField === "search" &&
    (searching || hasSearchResults || searchQuery.trim() || locationText.trim());
  const popupOpen =
    showPopup &&
    (showLocationList || showSearchResults || searching || locationLoading);

  useEffect(() => {
    if (!popupOpen || !useFixedPopup) return undefined;
    updatePopupPosition();
    return undefined;
  }, [
    popupOpen,
    useFixedPopup,
    updatePopupPosition,
    locationPredictions.length,
    categories.length,
    providers.length,
    searching,
    locationLoading,
  ]);

  return (
    <div className="landing-search" ref={popupRef}>
      <div className="landing-searchbar">
        <div className="landing-search-field">
          <SearchIcon />
          <div className="landing-search-fcol">
            <label>Service or provider</label>
            <input
              type="text"
              placeholder="e.g. Plumbing, cleaning, John's Electrical…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveField("search");
                setShowPopup(true);
              }}
              onFocus={() => {
                window.dispatchEvent(new Event("landing:closeJoin"));
                setActiveField("search");
                if (searchQuery.trim() || locationText.trim() || hasSearchResults) {
                  setShowPopup(true);
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && runSearch({ redirect: true })}
            />
          </div>
        </div>

        <div className="landing-search-field">
          <LocationIcon />
          <div className="landing-search-fcol landing-search-fcol--loc">
            <label>Location</label>
            <LandingLocationInput
              dropdownMode="external"
              value={locationText}
              placeholder="Search city or area…"
              onChange={(text) => {
                setLocationText(text);
                setActiveField("location");
                setShowPopup(true);
              }}
              onCoordsChange={setLocationCoords}
              onFocus={() => {
                window.dispatchEvent(new Event("landing:closeJoin"));
                setActiveField("location");
                setShowPopup(true);
              }}
              onEnter={() => {
                setActiveField("search");
                runSearch({ redirect: true });
              }}
            />
          </div>
        </div>

        <button
          type="button"
          className="landing-btn landing-btn--primary landing-search-btn"
          onClick={() => {
            setActiveField("search");
            runSearch({ redirect: true });
          }}
          disabled={searching}
          aria-label="Search"
        >
          <SearchIcon />
          <span>{searching ? "…" : "Search"}</span>
        </button>
      </div>

      {popupOpen && (
        <div
          className={`landing-search__popup${
            useFixedPopup && popupFixedStyle ? " landing-search__popup--fixed" : ""
          }`}
          style={useFixedPopup ? popupFixedStyle || undefined : undefined}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {showLocationList && (
            <div className="landing-search__group">
              <p className="landing-search__group-title">Locations</p>
              {locationLoading && locationPredictions.length === 0 && (
                <p className="landing-search__loading">Searching locations…</p>
              )}
              {locationPredictions.map((item) => (
                <button
                  type="button"
                  key={item.place_id}
                  className="landing-search__row"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleLocationSelect(item);
                  }}
                >
                  <span>{item.description}</span>
                </button>
              ))}
              {!locationLoading && locationEmpty && (
                <p className="landing-search__empty">
                  No locations found — try a city or area name
                </p>
              )}
            </div>
          )}

          {showSearchResults && (
            <>
              {searching && (
                <p className="landing-search__loading">Searching…</p>
              )}

              <div className="landing-search__toggle-row">
                <label className="landing-search__toggle">
                  <input
                    type="checkbox"
                    checked={nearbyEnabled}
                    onChange={handleNearbyToggle}
                  />
                  <span>Nearby providers</span>
                </label>
              </div>

              {!nearbyEnabled && categories.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">Categories</p>
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat._id}
                      className="landing-search__row"
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <span>{cat.service_category_name}</span>
                      <span className="landing-badge landing-badge--category">
                        Category
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!nearbyEnabled && hasLocationCoords && nearbyCats.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">Categories near you</p>
                  {nearbyCats.map((cat) => (
                    <button
                      type="button"
                      key={`near-${cat._id}`}
                      className="landing-search__row"
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <span>
                        {cat.service_category_name}
                        {cat.providerNearbyCount > 0 && (
                          <small> — {cat.providerNearbyCount} nearby</small>
                        )}
                      </span>
                      <span className="landing-badge landing-badge--category">
                        Category
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {nearbyEnabled && nearbyCats.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">Nearby categories</p>
                  {nearbyCats.map((cat) => (
                    <button
                      type="button"
                      key={`near-${cat._id}`}
                      className="landing-search__row"
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <span>
                        {cat.service_category_name}
                        {cat.providerNearbyCount > 0 && (
                          <small> — {cat.providerNearbyCount} providers near you</small>
                        )}
                      </span>
                      <span className="landing-badge landing-badge--category">
                        Category
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {providers.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">
                    {nearbyEnabled
                      ? "Nearby providers"
                      : hasLocationCoords
                        ? "Providers near location"
                        : "Providers"}
                  </p>
                  {providers.map((item) => (
                    <button
                      type="button"
                      key={item._id}
                      className="landing-search__row"
                      onClick={() => handleProviderClick(item)}
                    >
                      <span>
                        {providerLabel(item)}
                        {item.serviceSubCategoryName && (
                          <small> — {item.serviceSubCategoryName}</small>
                        )}
                      </span>
                      <span className="landing-badge landing-badge--provider">
                        Provider
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!searching &&
                !hasSearchResults &&
                (searchQuery.trim() || locationText.trim()) && (
                  <p className="landing-search__empty">
                    {nearbyEnabled
                      ? "No nearby matches. Try another service or enable location."
                      : "No results yet. Try another search or location."}
                  </p>
                )}
              {!searching && nearbyEnabled && !searchQuery.trim() && (
                <p className="landing-search__empty">
                  Type a service to find nearby categories and providers.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
