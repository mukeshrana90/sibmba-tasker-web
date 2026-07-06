import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../Components/Layout/Layout";
import CustomerActions from "../Redux/Actions/CustomerActions";
import LandingLocationInput, {
  resolveLocationCoords,
} from "../CommanComponents/Landing/LandingLocationInput";
import { resolveSearchCoords, requestDeviceLocation } from "../utils/landingGeocode";
import { reverseGeocodeCoords } from "../utils/landingPlaces";
import { resolveSearchSubmitCoords } from "../utils/headerSearchSync";
import {
  avatarColor,
  formatDisplayTitle,
  isVerified,
  providerDisplayName,
  providerInitials,
  renderStars,
  shortenLocationLabel,
  displayField,
} from "../utils/landingUtils";
import SimbaPager from "../CommanComponents/SimbaPager";
import {
  buildSearchProvidersApiPayload,
  buildSearchProvidersParams,
  parseSearchProvidersQuery,
} from "../utils/searchProvidersUrl";

const PAGE_SIZE = 10;
const RATE_MAX = 40;

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4-4" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function providerProfilePath(item) {
  const pid = item.providerId || item.serviceProvider?._id;
  const sid = item.serviceId;
  if (!pid) return null;
  return sid
    ? `/service-provider/${pid}?serviceId=${sid}`
    : `/service-provider/${pid}`;
}

function availabilityDisplay(item) {
  const status = item.availabilityStatus;
  if (status === "now" || item.availableNow) {
    return { label: "Available now", dotClass: "" };
  }
  if (status === "today" || item.availableToday) {
    return { label: "Available today", dotClass: "today" };
  }
  return { label: "Busy", dotClass: "off" };
}

function ProviderCard({ item }) {
  const sp = item.serviceProvider || {};
  const name = providerDisplayName(sp);
  const color = avatarColor(name);
  const verified = item.verified ?? isVerified(sp);
  const profilePath = providerProfilePath(item);
  const availability = availabilityDisplay(item);
  const rawLocation = displayField(item.location, "");
  const locationFull =
    rawLocation === "N/A" || !rawLocation ? "Zimbabwe" : rawLocation;
  const { display: locationShort } = shortenLocationLabel(locationFull);

  return (
    <div className="prov-card">
      <div className="prov-top">
        <div
          className="avatar"
          style={{ background: `linear-gradient(145deg,${color},${color}cc)` }}
        >
          {providerInitials(name)}
        </div>
        <div className="prov-id">
          <h4>
            {name}
            {verified && (
              <span className="verified" title="Verified">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m20 6-11 11-5-5" />
                </svg>
              </span>
            )}
          </h4>
          <div className="role">{formatDisplayTitle(item.role || item.serviceCategoryName, "Service provider")}</div>
          <div className="loc" title={locationFull}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>{locationShort}</span>
          </div>
        </div>
      </div>
      <div className="prov-meta">
        <div className="rating">
          <span className="stars">{renderStars(item.averageRating)}</span>
          {Number(item.averageRating || 0).toFixed(1)}
          <span className="rev">({item.reviewCount || 0})</span>
        </div>
      </div>
      {(item.skills || []).length > 0 && (
        <div className="prov-skills">
          {item.skills.map((skill) => (
            <span key={skill} className="skill">
              {formatDisplayTitle(skill)}
            </span>
          ))}
        </div>
      )}
      <div className="prov-foot">
        <span className="status">
          <span className={`dot ${availability.dotClass}`} />
          {availability.label}
        </span>
        {profilePath ? (
          <Link to={profilePath} className="view-btn">
            View profile
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SearchProvidersContent({ variant = "visitor" }) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const results = useSelector((s) => s.UserSlice.searchProvidersResults);
  const loading = useSelector((s) => s.UserSlice.searchProvidersLoading);

  const parsed = useMemo(
    () => parseSearchProvidersQuery(searchParams),
    [searchParams]
  );

  const [searchInput, setSearchInput] = useState(parsed.search);
  const [locationInput, setLocationInput] = useState(parsed.location);
  const [locationCoords, setLocationCoords] = useState(
    parsed.lat != null && parsed.lng != null
      ? { lat: parsed.lat, lng: parsed.lng, label: parsed.location }
      : null
  );
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const homeLink = "/";
  const homeLabel = variant === "customer" ? "Home" : "Home";

  useEffect(() => {
    setSearchInput(parsed.search);
    setLocationInput(parsed.location);
    if (parsed.lat != null && parsed.lng != null) {
      setLocationCoords({
        lat: parsed.lat,
        lng: parsed.lng,
        label: parsed.location,
      });
    } else {
      setLocationCoords(null);
    }
  }, [parsed.search, parsed.location, parsed.lat, parsed.lng]);

  const pushFilters = useCallback(
    (patch) => {
      const next = { ...parsed, ...patch };
      const params = buildSearchProvidersParams({
        ...next,
        maxRate: next.maxRate >= RATE_MAX ? undefined : next.maxRate,
      });
      setSearchParams(params, { replace: false });
    },
    [parsed, setSearchParams]
  );

  const fetchResults = useCallback(async () => {
    let lat = null;
    let lng = null;

    if (parsed.nearby) {
      const coords = resolveSearchCoords("", true, locationCoords);
      lat = coords?.lat ?? null;
      lng = coords?.lng ?? null;
    } else if (
      parsed.lat != null &&
      parsed.lng != null &&
      !Number.isNaN(parsed.lat) &&
      !Number.isNaN(parsed.lng)
    ) {
      lat = parsed.lat;
      lng = parsed.lng;
    } else if (
      locationCoords?.lat != null &&
      locationCoords?.lng != null &&
      !Number.isNaN(locationCoords.lat) &&
      !Number.isNaN(locationCoords.lng)
    ) {
      lat = locationCoords.lat;
      lng = locationCoords.lng;
    }

    await dispatch(
      CustomerActions.searchProviders(
        buildSearchProvidersApiPayload({
          search: parsed.search,
          lat,
          lng,
          categoryIds: parsed.categoryIds,
          minRating: parsed.minRating,
          maxRate: parsed.maxRate < RATE_MAX ? parsed.maxRate : undefined,
          availableOnly: parsed.availableOnly,
          verifiedOnly: parsed.verifiedOnly,
          sort: parsed.sort,
          page: parsed.page,
          limit: PAGE_SIZE,
          nearby: parsed.nearby,
        })
      )
    );
  }, [dispatch, parsed, locationCoords]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSearchSubmit = async () => {
    const locationQuery = locationInput.trim();
    const { coords: presetCoords, nearby: useNearby } = resolveSearchSubmitCoords(
      locationQuery,
      parsed.nearby,
      locationCoords
    );

    let coords = presetCoords;
    if (locationQuery && !coords) {
      coords = resolveSearchCoords(locationQuery, useNearby, locationCoords);
      if (!coords) {
        const resolved = await resolveLocationCoords(locationQuery, locationCoords);
        if (resolved) {
          coords = { lat: resolved.lat, lng: resolved.lng };
          setLocationCoords(resolved);
        }
      }
    }

    if (!locationQuery) {
      setLocationCoords(null);
    }

    pushFilters({
      search: searchInput.trim(),
      location: locationQuery,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      nearby: locationQuery ? useNearby : false,
      page: 1,
    });
  };

  const handleLocationChange = (val) => {
    setLocationInput(val);
  };

  const handleLocationCoordsChange = (coords) => {
    setLocationCoords(coords);
    if (coords?.label) {
      setLocationInput(coords.label);
    }
    if (!coords) {
      if (parsed.nearby) {
        pushFilters({ nearby: false, page: 1 });
      }
      return;
    }
    if (!parsed.nearby) return;

    const devLat = parseFloat(localStorage.getItem("latitude"));
    const devLng = parseFloat(localStorage.getItem("longitude"));
    const isDeviceLocation =
      !Number.isNaN(devLat) &&
      !Number.isNaN(devLng) &&
      Math.abs(coords.lat - devLat) < 0.002 &&
      Math.abs(coords.lng - devLng) < 0.002;

    if (!isDeviceLocation) {
      pushFilters({ nearby: false, page: 1 });
    }
  };

  const handleNearbyToggle = async (e) => {
    const on = e.target.checked;
    if (!on) {
      pushFilters({ nearby: false, page: 1 });
      return;
    }

    setNearbyLoading(true);
    try {
      const coords = await requestDeviceLocation();
      let label = "Current location";
      const reversed = await reverseGeocodeCoords(coords.lat, coords.lng);
      if (reversed?.label) {
        label = reversed.label;
      }
      const nextCoords = { lat: coords.lat, lng: coords.lng, label };
      setLocationInput(label);
      setLocationCoords(nextCoords);
      pushFilters({
        nearby: true,
        location: label,
        lat: coords.lat,
        lng: coords.lng,
        page: 1,
      });
    } catch {
      e.target.checked = false;
    } finally {
      setNearbyLoading(false);
    }
  };

  const toggleCategory = (catId) => {
    const set = new Set(parsed.categoryIds);
    if (set.has(catId)) set.delete(catId);
    else set.add(catId);
    pushFilters({ categoryIds: Array.from(set), page: 1 });
  };

  const toggleLocationChip = (loc) => {
    pushFilters({
      location: parsed.location === loc ? "" : loc,
      nearby: false,
      page: 1,
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setLocationInput("");
    setLocationCoords(null);
    setSearchParams(new URLSearchParams(), { replace: false });
  };

  const items = results?.items || [];
  const total = results?.total ?? 0;
  const totalPages = results?.totalPages ?? 0;
  const categoryFilters = useMemo(
    () => results?.categoryFilters || [],
    [results?.categoryFilters]
  );
  const locationFilters = useMemo(
    () =>
      (results?.locationFilters || []).filter((loc) => {
        const text = String(loc ?? "").trim();
        return text && text !== "undefined" && text !== "null";
      }),
    [results?.locationFilters]
  );

  const title = useMemo(() => {
    if (parsed.categoryIds.length === 1) {
      const cat = categoryFilters.find(
        (c) => String(c._id) === String(parsed.categoryIds[0])
      );
      if (cat?.name) return `${formatDisplayTitle(cat.name)} in Zimbabwe`;
    }
    if (parsed.search) return `Results for “${formatDisplayTitle(parsed.search)}”`;
    return "All service providers";
  }, [parsed.categoryIds, parsed.search, categoryFilters]);

  const crumbLabel = useMemo(() => {
    if (parsed.categoryIds.length === 1) {
      const cat = categoryFilters.find(
        (c) => String(c._id) === String(parsed.categoryIds[0])
      );
      return formatDisplayTitle(cat?.name, "Category");
    }
    if (parsed.search) return "Search";
    return "All providers";
  }, [parsed.categoryIds, parsed.search, categoryFilters]);

  return (
    <div className="simba-page p-search">
      <section className="search-head">
        <div className="blob a" aria-hidden="true" />
        <div className="wrap">
          <div className="crumbs">
            <Link to={homeLink}>{homeLabel}</Link>
            <span>/</span>
            <span>Providers</span>
            <span>/</span>
            <span style={{ color: "var(--ink)", opacity: 1 }}>{crumbLabel}</span>
          </div>
          <h1>{title}</h1>
          <p className="sub">
            Verified, rated professionals ready to help across Zimbabwe.
          </p>

          <div className="searchbar">
            <div className="search-field">
              <SearchIcon />
              <div className="fcol">
                <label>Service or provider</label>
                <input
                  type="text"
                  placeholder="e.g. Plumbing, cleaning, John's Electrical…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                />
              </div>
            </div>
            <div className="search-field">
              <LocationIcon />
              <div className="fcol">
                <label>Location</label>
                <LandingLocationInput
                  value={locationInput}
                  placeholder="Harare, Bulawayo…"
                  onChange={handleLocationChange}
                  onCoordsChange={handleLocationCoordsChange}
                  onEnter={handleSearchSubmit}
                />
              </div>
            </div>
            <button
              type="button"
              className={`btn search-btn${loading ? " is-loading" : ""}`}
              onClick={handleSearchSubmit}
              disabled={loading}
              aria-busy={loading}
              aria-label="Search"
            >
              <SearchIcon />
              <span>Search</span>
            </button>
          </div>
        </div>
      </section>

      <section className="listing">
        <div className="wrap listing-grid">
          <aside className="filters">
            <div className="filters-head">
              <h3>Filters</h3>
              <button type="button" onClick={clearFilters}>
                Clear all
              </button>
            </div>

            <div className="fgroup">
              <h5>Search area</h5>
              <label className="fopt">
                <input
                  type="checkbox"
                  checked={parsed.nearby}
                  disabled={nearbyLoading}
                  onChange={handleNearbyToggle}
                />
                {nearbyLoading ? "Getting location…" : "NearBy Search"}
              </label>
            </div>

            <div className="fgroup fgroup--category">
              <h5>Category</h5>
              <div className="cat-filter-scroll">
                {categoryFilters.map((cat) => {
                  const checked = parsed.categoryIds.includes(String(cat._id));
                  return (
                    <label
                      key={cat._id}
                      className={`fopt${checked ? " fopt--checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(String(cat._id))}
                      />
                      <span className="cat-name" title={formatDisplayTitle(cat.name)}>
                        {formatDisplayTitle(cat.name)}
                      </span>
                      <span className="cnt">{cat.count}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="fgroup">
              <h5>Minimum rating</h5>
              {[
                { value: 0, label: "Any rating" },
                { value: 4.5, label: "4.5 & up" },
                { value: 4.8, label: "4.8 & up" },
                { value: 5, label: "5.0 only" },
              ].map((opt) => (
                <label key={opt.value} className="fopt">
                  <input
                    type="radio"
                    name="rating"
                    checked={parsed.minRating === opt.value}
                    onChange={() =>
                      pushFilters({ minRating: opt.value, page: 1 })
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <div className="fgroup">
              <h5>Max hourly rate</h5>
              <input
                type="range"
                min="10"
                max={RATE_MAX}
                step="1"
                value={parsed.maxRate}
                onChange={(e) =>
                  pushFilters({ maxRate: Number(e.target.value), page: 1 })
                }
              />
              <div className="range-val">
                <span>$10</span>
                <span>
                  {parsed.maxRate >= RATE_MAX ? "Any" : `$${parsed.maxRate}`}
                </span>
              </div>
            </div>

            <div className="fgroup">
              <h5>Availability</h5>
              <label className="fopt">
                <input
                  type="checkbox"
                  checked={parsed.availableOnly}
                  onChange={(e) =>
                    pushFilters({ availableOnly: e.target.checked, page: 1 })
                  }
                />
                Available now only
              </label>
              <label className="fopt">
                <input
                  type="checkbox"
                  checked={parsed.verifiedOnly}
                  onChange={(e) =>
                    pushFilters({ verifiedOnly: e.target.checked, page: 1 })
                  }
                />
                Verified providers only
              </label>
            </div>

            {locationFilters.length > 0 && (
              <div className="fgroup">
                <h5>Location</h5>
                <div className="fchips">
                  {locationFilters.map((loc) => {
                    const { display } = shortenLocationLabel(loc);
                    return (
                    <button
                      key={loc}
                      type="button"
                      className={`fchip${
                        parsed.location.toLowerCase() === loc.toLowerCase()
                          ? " active"
                          : ""
                      }`}
                      title={loc}
                      onClick={() => toggleLocationChip(loc)}
                    >
                      {display}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          <div className="results">
            <div className="results-top">
              <div className="results-count">
                <b>{total}</b> providers found
              </div>
              {variant !== "customer" && (
              <div className="results-tools">
                <div className="sort-wrap">
                  <select
                    className="sort-sel"
                    value={parsed.sort}
                    onChange={(e) =>
                      pushFilters({ sort: e.target.value, page: 1 })
                    }
                  >
                    <option value="rating">Top rated</option>
                    <option value="reviews">Most reviewed</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                    {parsed.lat != null && parsed.lng != null && (
                      <option value="distance">Nearest first</option>
                    )}
                  </select>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
              )}
            </div>

            <div className="prov-grid">
              {loading && !items.length ? (
                <div className="empty">
                  <p>Searching…</p>
                </div>
              ) : items.length === 0 ? (
                <div className="empty">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4-4" strokeLinecap="round" />
                  </svg>
                  <h3>No providers match your filters</h3>
                  <p>Try widening your search or clearing some filters.</p>
                </div>
              ) : (
                items.map((item) => (
                  <ProviderCard
                    key={`${item.providerId}-${item.serviceId}`}
                    item={item}
                  />
                ))
              )}
            </div>

            <SimbaPager
              page={parsed.page}
              totalPages={totalPages}
              onPageChange={(p) => {
                pushFilters({ page: p });
                document.querySelector(".p-search .listing")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SearchProvidersPage({ variant = "visitor" }) {
  return (
    <Layout footerVariant="marketing">
      <SearchProvidersContent variant={variant} />
    </Layout>
  );
}
