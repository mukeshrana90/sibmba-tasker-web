import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { useLanding } from "../../context/LandingContext";
import {
  requestDeviceLocation,
  resolveSearchCoords,
} from "../../utils/landingGeocode";
import { searchProvidersPath } from "../../utils/searchProvidersUrl";
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
  const goToResultsPage = useCallback(
    async (opts = {}) => {
      const q = opts.query ?? searchQuery;
      const loc = opts.location ?? locationText;
      const nearby = opts.nearby ?? nearbyEnabled;

      if (nearby) {
        try {
          await requestDeviceLocation();
        } catch {
          /* use stored coords if GPS denied */
        }
      }

      let coords = resolveSearchCoords(
        loc,
        nearby,
        opts.coords ?? locationCoords
      );

      if (!coords && !nearby && loc.trim()) {
        const resolved = await resolveLocationCoords(
          loc,
          opts.coords ?? locationCoords
        );
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
      navigate(
        searchProvidersPath(resultsPath, {
          search: q.trim(),
          location: loc.trim(),
          lat: coords?.lat,
          lng: coords?.lng,
          nearby,
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

      let coords = resolveSearchCoords(
        loc,
        nearby,
        opts.coords ?? locationCoords
      );

      if (!coords && !nearby && loc.trim()) {
        const resolved = await resolveLocationCoords(
          loc,
          opts.coords ?? locationCoords
        );
        if (resolved) {
          coords = { lat: resolved.lat, lng: resolved.lng };
          setLocationCoords(resolved);
        }
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
    if (!searchQuery.trim()) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        runSearch({ query: searchQuery });
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, locationText, locationCoords, runSearch]);

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

  const handleCategoryClick = (cat) => {
    selectCategory(cat._id);
    setShowPopup(false);
  };

  const handleProviderClick = (item) => {
    const pid = providerId(item);
    const sid = item._id;
    if (!pid) return;
    setShowPopup(false);
    const path = sid
      ? `/service-provider/${pid}?serviceId=${sid}`
      : `/service-provider/${pid}`;
    navigate(path);
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
    runSearch({ nearby: on });
  };

  const categories = nearbyEnabled ? [] : results?.category?.items || [];
  const providers = results?.bestService?.items || [];
  const nearbyCats = results?.nearbyService?.items || [];
  const hasResults = nearbyEnabled
    ? nearbyCats.length > 0 || providers.length > 0
    : categories.length > 0 ||
      providers.length > 0 ||
      nearbyCats.length > 0;
  const hasLocationCoords = Boolean(
    resolveSearchCoords(locationText, false, locationCoords)
  );

  return (
    <div className="landing-search" ref={popupRef}>
      <div className="landing-searchbar">
        <div className="landing-search-field">
          <SearchIcon />
          <div className="landing-search-fcol">
            <label>Service or provider</label>
            <input
              type="text"
              placeholder="e.g. Plumber, cleaning, John's Electrical…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) setShowPopup(true);
              }}
              onFocus={() => {
                window.dispatchEvent(new Event("landing:closeJoin"));
                if (searchQuery.trim() || hasResults) setShowPopup(true);
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
              value={locationText}
              placeholder="Search city or area…"
              onChange={setLocationText}
              onCoordsChange={(coords) => {
                setLocationCoords(coords);
                if (coords) {
                  runSearch({ location: coords.label, coords });
                }
              }}
              onFocus={() => {
                window.dispatchEvent(new Event("landing:closeJoin"));
              }}
              onEnter={() => runSearch({ redirect: true })}
            />
          </div>
        </div>

        <button
          type="button"
          className="landing-btn landing-btn--primary landing-search-btn"
          onClick={() => runSearch({ redirect: true })}
          disabled={searching}
          aria-label="Search"
        >
          <SearchIcon />
          <span>{searching ? "…" : "Search"}</span>
        </button>
      </div>

      {showPopup && (searching || hasResults || searchQuery.trim()) && (
        <div
          className="landing-search__popup"
          onMouseDown={(e) => e.stopPropagation()}
        >
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
                {nearbyEnabled ? "Nearby providers" : hasLocationCoords ? "Nearby providers" : "Providers"}
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

          {!searching && !hasResults && searchQuery.trim() && (
            <p className="landing-search__empty">
              {nearbyEnabled
                ? "No nearby matches. Try another service or enable location."
                : "No results yet. Try another search."}
            </p>
          )}
          {!searching && nearbyEnabled && !searchQuery.trim() && (
            <p className="landing-search__empty">
              Type a service to find nearby categories and providers.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
