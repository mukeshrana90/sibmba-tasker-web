import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import { useLanding } from "../../context/LandingContext";
import {
  requestDeviceLocation,
  resolveSearchCoords,
} from "../../utils/landingGeocode";
import { useNearbyLocationToggle } from "../../Hooks/useNearbyLocationToggle";
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

/** Logistics suggestions (v2.7.53) from search rows: units, fleet businesses, hub categories. */
const LG_CATEGORIES = [
  { id: "logistic", label: "Logistic trucks", words: ["truck", "lorry", "logistic", "transport", "flatbed", "tipper", "trailer", "tanker"] },
  { id: "agricultural", label: "Agricultural equipment", words: ["agri", "tractor", "harvester", "planter", "harrow", "plough", "farm"] },
  { id: "construction", label: "Construction equipment", words: ["construct", "excavator", "loader", "crane", "bulldozer", "grader", "roller", "build"] },
  { id: "industrial", label: "Industrial equipment", words: ["industr", "forklift", "generator", "compressor", "plant"] },
];
const KIND_LABEL = { vehicle: "Truck", equipment: "Equipment", cab: "Cab" };
// "Tata" + "Tata Ace" → "Tata Ace"
const makeModel = (make, model) => {
  const mk = String(make || "").trim();
  const md = String(model || "").trim();
  if (mk && md.toLowerCase().startsWith(mk.toLowerCase())) return md;
  return [mk, md].filter(Boolean).join(" ");
};

function logisticsSuggestions(text, rows) {
  const t = text.toLowerCase();
  const units = rows.slice(0, 5).map((r) => {
    const type = (r.capabilities || []).find((c) => c && !String(c).includes(":") && !/ton truck|regular/i.test(c));
    const biz = r.owner?.display_name || r.owner?.company_name || "";
    return {
      id: r.asset_id,
      name: r.name || "Unit",
      kind: KIND_LABEL[r.kind] || "Unit",
      sub: [type, makeModel(r.make, r.model), biz].filter(Boolean).join(" · "),
    };
  });
  const businesses = [
    ...new Set(
      rows
        .map((r) => r.owner?.company_name || "")
        .filter((n) => n && n.toLowerCase().includes(t))
    ),
  ].slice(0, 3);
  const categories = LG_CATEGORIES.filter(
    (c) => c.label.toLowerCase().includes(t) || c.words.some((w) => w.startsWith(t) || t.includes(w))
  ).slice(0, 2);
  return { q: text, units, businesses, categories };
}

/**
 * defaultMode "logistics" + showModeSwitch false = logistics-only search bar
 * (guest Logistics landing, v2.7.53); home keeps the Services | Logistics switch.
 */
export default function UnifiedSearch({ defaultMode = "services", showModeSwitch = true } = {}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const popupRef = useRef(null);
  const debounceRef = useRef(null);
  const [popupMaxHeight, setPopupMaxHeight] = useState(null);

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
  // v2.7.53 logistics suggestions: units / businesses / categories matching the typed text
  const [lgSuggest, setLgSuggest] = useState({ q: "", units: [], businesses: [], categories: [] });
  const lgSeq = useRef(0);
  const [activeField, setActiveField] = useState("search");
  // "Services | Logistics" switch: Logistics searches trucks / equipment on
  // /logistics/search (open to guests) instead of service providers.
  const [mode, setMode] = useState(defaultMode === "logistics" ? "logistics" : "services");
  const logistics = mode === "logistics";

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

      if (nearby && !coordsFromOpts?.lat) {
        try {
          await requestDeviceLocation({ forceFresh: true, maximumAge: 0 });
        } catch {
          /* coords passed via opts when nearby toggle succeeded */
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

  const goToLogisticsSearch = useCallback(
    async (opts = {}) => {
      const q = String(opts.query ?? searchQuery).trim();
      const loc = String(opts.location ?? locationText).trim();
      const coordsFromOpts = opts.coords ?? locationCoords;
      let coords = loc ? resolveSearchCoords(loc, false, coordsFromOpts) : null;
      if (!coords && loc) {
        const resolved = await resolveLocationCoords(loc, coordsFromOpts);
        if (resolved) coords = { lat: resolved.lat, lng: resolved.lng };
      }
      setShowPopup(false);
      const params = new URLSearchParams();
      params.set("q", q);
      if (loc) params.set("location", loc);
      if (loc && coords?.lat != null && coords?.lng != null) {
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
      }
      navigate(`/logistics/search?${params.toString()}`);
    },
    [navigate, searchQuery, locationText, locationCoords]
  );

  const runSearch = useCallback(
    async (opts = {}) => {
      const q = opts.query ?? searchQuery;
      const loc = opts.location ?? locationText;
      const nearby = opts.nearby ?? nearbyEnabled;
      const coordsFromOpts = opts.coords ?? locationCoords;

      // Logistics mode: live suggestions from GET /logistics/assets/search?kind=all (public)
      if (logistics) {
        if (opts.redirect) {
          await goToLogisticsSearch(opts);
          return;
        }
        const text = String(q || "").trim();
        if (text.length < 2) {
          setLgSuggest({ q: "", units: [], businesses: [], categories: [] });
          return;
        }
        const seq = ++lgSeq.current;
        setSearching(true);
        try {
          const res = await dispatch(LogisticsActions.searchAssets({ q: text, kind: "all", limit: 8, sort: "rating" }));
          if (seq !== lgSeq.current) return;
          const rows = res?.payload?.data?.data || [];
          setLgSuggest(logisticsSuggestions(text, rows));
          setShowPopup(true);
        } finally {
          if (seq === lgSeq.current) setSearching(false);
        }
        return;
      }

      if (opts.redirect) {
        await goToResultsPage(opts);
        return;
      }

      if (nearby && !coordsFromOpts?.lat) {
        try {
          await requestDeviceLocation({ forceFresh: true, maximumAge: 0 });
        } catch {
          /* coords passed via opts when nearby toggle succeeded */
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
      goToLogisticsSearch,
      logistics,
      searchQuery,
      locationText,
      locationCoords,
      nearbyEnabled,
      setLocationCoords,
    ]
  );

  const { loading: nearbyLoading, handleToggle: handleNearbyToggleBase, permissionModal } =
    useNearbyLocationToggle({
      onEnabled: (coords) => {
        setLocationCoords({
          lat: coords.lat,
          lng: coords.lng,
          label: "Current location",
        });
        setNearbyEnabled(true);
        setActiveField("search");
        runSearch({ nearby: true, coords });
      },
      onDisabled: () => {
        setNearbyEnabled(false);
        setActiveField("search");
        runSearch({ nearby: false });
      },
    });

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
    if (!showPopup) return undefined;

    const isInsideSearch = (target) => {
      const root = popupRef.current;
      if (!root) return false;
      return target instanceof Node && root.contains(target);
    };

    const onDocPointerDown = (e) => {
      if (!isInsideSearch(e.target)) setShowPopup(false);
    };

    const onScroll = (e) => {
      if (isInsideSearch(e.target)) return;
      if (document.activeElement?.closest(".landing-search")) return;
      setShowPopup(false);
    };

    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      window.removeEventListener("scroll", onScroll);
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
    navigate(serviceProviderPath(pid, sid));
  };

  const handleNearbyToggle = (e) => handleNearbyToggleBase(e, nearbyEnabled);

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
  const showLogisticsResults =
    logistics && activeField === "search" && (searching || searchQuery.trim().length >= 2);
  const hasLogisticsResults =
    lgSuggest.units.length + lgSuggest.businesses.length + lgSuggest.categories.length > 0;
  const showSearchResults =
    !logistics &&
    activeField === "search" &&
    (searching || hasSearchResults || searchQuery.trim() || locationText.trim());
  const popupOpen =
    showPopup &&
    (showLocationList || showSearchResults || showLogisticsResults || searching || locationLoading);

  const handlePopupRowPointer = (handler) => (e) => {
    e.preventDefault();
    handler();
  };

  useEffect(() => {
    if (!popupOpen) {
      setPopupMaxHeight(null);
      return undefined;
    }

    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const updatePopupHeight = () => {
      const root = popupRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const spaceBelow = viewport.height - rect.bottom - 12;
      if (spaceBelow > 140) {
        setPopupMaxHeight(Math.min(420, spaceBelow));
      } else {
        setPopupMaxHeight(Math.min(280, viewport.height * 0.45));
      }
    };

    updatePopupHeight();
    viewport.addEventListener("resize", updatePopupHeight);
    viewport.addEventListener("scroll", updatePopupHeight);
    window.addEventListener("resize", updatePopupHeight);
    return () => {
      viewport.removeEventListener("resize", updatePopupHeight);
      viewport.removeEventListener("scroll", updatePopupHeight);
      window.removeEventListener("resize", updatePopupHeight);
    };
  }, [popupOpen]);

  return (
    <div className={`landing-search${logistics ? " landing-search--logistics" : ""}`} ref={popupRef}>
      {showModeSwitch ? (
      <div className="landing-search-mode-row">
        <div
          className="module-switcher landing-search-mode"
          role="tablist"
          aria-label="What do you want to search?"
        >
          {[
            { id: "services", label: "Services" },
            { id: "logistics", label: "Logistics" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={mode === m.id ? "is-active" : ""}
              onClick={() => {
                setMode(m.id);
                setShowPopup(false);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {logistics ? (
          <Link to="/logistics" className="landing-search-mode__hub">
            Open Logistics Hub →
          </Link>
        ) : null}
      </div>
      ) : null}
      <div className="landing-searchbar">
        <div className="landing-search-field">
          <SearchIcon />
          <div className="landing-search-fcol">
            <label>{logistics ? "Truck or equipment" : "Service or provider"}</label>
            <input
              type="text"
              placeholder={
                logistics
                  ? "e.g. Tipper truck, excavator, tractor"
                  : "e.g. Plumbing, cleaning, John's Electrical"
              }
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
          className="landing-search__popup"
          style={popupMaxHeight ? { maxHeight: popupMaxHeight } : undefined}
          onPointerDown={(e) => e.stopPropagation()}
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
                  onPointerDown={handlePopupRowPointer(() => handleLocationSelect(item))}
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

          {showLogisticsResults && (
            <>
              {searching && !hasLogisticsResults && <p className="landing-search__loading">Searching…</p>}
              {lgSuggest.categories.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">Categories</p>
                  {lgSuggest.categories.map((c) => (
                    <button
                      type="button"
                      key={`cat-${c.id}`}
                      className="landing-search__row"
                      onPointerDown={handlePopupRowPointer(() => {
                        setShowPopup(false);
                        navigate(`/logistics/search?category=${c.id}&scope=category`);
                      })}
                    >
                      <span>{c.label}</span>
                      <span className="landing-badge landing-badge--category">Category</span>
                    </button>
                  ))}
                </div>
              )}
              {lgSuggest.units.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">Trucks &amp; equipment</p>
                  {lgSuggest.units.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      className="landing-search__row"
                      onPointerDown={handlePopupRowPointer(() => {
                        setShowPopup(false);
                        navigate(`/logistics/asset/${u.id}`);
                      })}
                    >
                      <span>
                        {u.name}
                        {u.sub ? <small> — {u.sub}</small> : null}
                      </span>
                      <span className="landing-badge landing-badge--provider">{u.kind}</span>
                    </button>
                  ))}
                </div>
              )}
              {lgSuggest.businesses.length > 0 && (
                <div className="landing-search__group">
                  <p className="landing-search__group-title">Fleet businesses</p>
                  {lgSuggest.businesses.map((b) => (
                    <button
                      type="button"
                      key={`biz-${b}`}
                      className="landing-search__row"
                      onPointerDown={handlePopupRowPointer(() => goToLogisticsSearch({ query: b }))}
                    >
                      <span>{b}</span>
                      <span className="landing-badge landing-badge--category">Business</span>
                    </button>
                  ))}
                </div>
              )}
              {!searching && lgSuggest.q && !hasLogisticsResults && (
                <p className="landing-search__empty">No trucks or equipment match “{lgSuggest.q}” yet — try another word.</p>
              )}
              {searchQuery.trim().length >= 2 && (
                <button
                  type="button"
                  className="landing-search__row landing-search__row--all"
                  onPointerDown={handlePopupRowPointer(() => goToLogisticsSearch({}))}
                >
                  <span>
                    Search all for “{searchQuery.trim()}”
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </>
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
                    disabled={nearbyLoading}
                    readOnly
                    tabIndex={-1}
                    onPointerDown={handleNearbyToggle}
                  />
                  <span>{nearbyLoading ? "Getting location…" : "Nearby providers"}</span>
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
                      onPointerDown={handlePopupRowPointer(() => handleCategoryClick(cat))}
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
                      onPointerDown={handlePopupRowPointer(() => handleCategoryClick(cat))}
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
                      onPointerDown={handlePopupRowPointer(() => handleCategoryClick(cat))}
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
                      onPointerDown={handlePopupRowPointer(() => handleProviderClick(item))}
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
      {permissionModal}
    </div>
  );
}
