import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsCategoryTiles, {
  isCabCategory,
  isPlantCategory,
} from "../../CommanComponents/LogisticsCategoryTiles";
import { DEFAULT_CAB_CLASSES } from "../../CommanComponents/useLogisticsConfig";
import {
  EquipmentPickerModal,
  LogisticsPickField,
  SubtypePickerModal,
} from "../../CommanComponents/LogisticsEquipmentPickers";
import LogisticsLocationField from "../../CommanComponents/LogisticsLocationField";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import { buildPublicAssetUrl, defaultImage } from "../../utils/ImagePath";
import {
  loadLogisticsSearchDraft,
  saveLogisticsSearchDraft,
} from "../../utils/logisticsSearchDraft";
import {
  TRUCK_BODY_TYPES,
  CAPACITY_TIER_OPTIONS,
} from "../../utils/logisticVehicleWeight";
import "./logistics.css";
import {
  LogisticsSkeletonMeta,
  LogisticsTableSkeletonRows,
} from "../../CommanComponents/LogisticsSkeleton";

const PAGE_SIZE = 10;
const HUB_CATEGORIES = new Set([
  "logistic",
  "agricultural",
  "construction",
  "industrial",
  "cab",
]);

const AVAIL_COLOR = {
  available_now: "#1f6b3a",
  returning_empty: "#c9a227",
  scheduled: "#3b6ea5",
  on_job: "#b8860b",
  offline: "#8a8a8a",
};

const AVAIL_LABEL = {
  available_now: "Available",
  returning_empty: "Returning empty",
  scheduled: "Scheduled",
  on_job: "On job",
  offline: "Offline",
};

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "200", label: "200 km" },
];

const defaultFilters = {
  category: "logistic",
  location: "",
  location_coords: null,
  radius_km: "50",
  name: "",
  truck_type: "",
  vehicle_needed: "",
  equipment: "",
  subtype: "",
};

function formatCapacity(cap) {
  if (cap?.value == null) return "—";
  const unit = cap.unit || "tons";
  return `${cap.value} ${unit}`;
}

function formatSpecs(row, plant) {
  if (plant) {
    const bits = [row.make, row.model, row.year].filter(Boolean);
    return bits.length ? bits.join(" · ") : row.category?.name || "—";
  }
  const bits = [
    row.category?.name,
    row.make,
    row.model,
    formatCapacity(row.capacity) !== "—"
      ? formatCapacity(row.capacity)
      : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "—";
}

function ownerBusiness(row) {
  const o = row.owner || {};
  const phoneVisible =
    o.contact_phone_visible === true ||
    Number(o.is_subscribed) === 1 ||
    o.is_subscribed === true;
  return {
    company: o.company_name || o.display_name || o.full_name || "Fleet",
    contact: o.full_name && o.company_name ? o.full_name : "",
    email: phoneVisible ? o.email || "" : "",
    phone:
      phoneVisible && o.phone_number
        ? `${o.country_code || ""}${o.phone_number}`.trim()
        : "",
    verified: Number(o.is_verified) === 1,
    contactLocked: !phoneVisible,
  };
}

function formatRating(rating) {
  const avg = Number(rating?.average) || 0;
  const count = Number(rating?.count) || 0;
  if (!count && !avg) return "—";
  return `${avg.toFixed(1)}${count ? ` (${count})` : ""}`;
}

function assetPhotoUrl(path) {
  if (!path) return null;
  let normalized = String(path).replace(/\\/g, "/").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (normalized.startsWith("http") || normalized.startsWith("blob:")) {
    return normalized;
  }
  const absPublic = normalized.indexOf("/public/");
  if (absPublic !== -1) {
    normalized = normalized.slice(absPublic + "/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return buildPublicAssetUrl(normalized);
}

function hasLocation(f) {
  return Boolean(String(f.location || "").trim() && f.location_coords);
}

function initialSearchState() {
  const draft = loadLogisticsSearchDraft(defaultFilters);
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    params = new URLSearchParams();
  }
  const scope = params.get("scope");
  const category = params.get("category");
  const kind = params.get("kind");
  const fromHub = Boolean(scope || category || kind);

  let next = { ...draft };
  let allEquipment = false;

  if (kind === "equipment") {
    next.category = isPlantCategory(draft.category)
      ? draft.category
      : "agricultural";
    allEquipment = true;
  }
  if (HUB_CATEGORIES.has(category)) {
    next.category = category;
    if (category === "logistic") allEquipment = false;
  }
  if (scope === "category" || fromHub) {
    // Hub "See all" browses by category without forcing a map pin
    next.location = "";
    next.location_coords = null;
  }

  return {
    filters: next,
    allEquipment,
    fromHub,
    clearUrl: fromHub,
  };
}

export default function LogisticsSearch() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boot = useRef(initialSearchState()).current;
  const [filters, setFilters] = useState(boot.filters);
  const [allEquipment, setAllEquipment] = useState(boot.allEquipment);
  const [rows, setRows] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [equipOpen, setEquipOpen] = useState(false);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const restoredRef = useRef(false);
  const plant = isPlantCategory(filters.category);
  const cab = isCabCategory(filters.category);

  const set = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const fetchResults = useCallback(
    async (nextFilters, nextPage = 1, { notify = true, allEquip } = {}) => {
      const f = nextFilters || filters;
      const isPlant = isPlantCategory(f.category);
      const isCab = isCabCategory(f.category);
      const nearby = hasLocation(f);
      const browseAllEquip =
        allEquip != null ? allEquip : allEquipment && isPlant;

      if (nearby) {
        const radius = Number(f.radius_km);
        if (!Number.isFinite(radius) || radius <= 0) {
          if (notify) toast.error("Select a search radius");
          return false;
        }
      }

      setLoading(true);
      setSearched(true);
      try {
        const q = [f.name, isPlant ? f.equipment : "", isPlant ? f.subtype : ""]
          .filter(Boolean)
          .join(" ");

        const params = {
          q: q || undefined,
          kind: isPlant ? "equipment" : isCab ? "cab" : "vehicle",
          hub_category: isPlant && !browseAllEquip ? f.category : undefined,
          sort: nearby ? "nearest" : "rating",
          page: nextPage,
          limit: PAGE_SIZE,
        };

        if (isCab) {
          if (f.cab_class) params.cab_class = f.cab_class;
        } else if (!isPlant) {
          if (f.truck_type) params.truck_type = f.truck_type;
          if (f.vehicle_needed) params.vehicle_needed = f.vehicle_needed;
        }

        if (nearby) {
          const [lng, lat] = f.location_coords;
          params.company_lat = lat;
          params.company_long = lng;
          params.radius_km = Number(f.radius_km);
        }

        const res = await dispatch(LogisticsActions.searchAssets(params));
        const payload = res?.payload?.data || {};
        setRows(payload.data || []);
        setTotal(Number(payload.total) || 0);
        setPage(nextPage);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, filters, allEquipment]
  );

  useEffect(() => {
    saveLogisticsSearchDraft(filters);
  }, [filters]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (boot.clearUrl && searchParams.toString()) {
      navigate("/logistics/search", { replace: true });
    }
    if (boot.fromHub || hasLocation(filters)) {
      fetchResults(filters, 1, {
        notify: false,
        allEquip: allEquipment,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = async (e) => {
    e?.preventDefault();
    await fetchResults(filters, 1, { notify: true });
  };

  const onCategoryChange = async (category) => {
    const next = {
      ...filters,
      category,
      truck_type: "",
      equipment: "",
      subtype: "",
    };
    const nextAllEquip = false;
    setAllEquipment(nextAllEquip);
    setFilters(next);
    setPage(1);
    await fetchResults(next, 1, { notify: false, allEquip: nextAllEquip });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const showPagination = total > PAGE_SIZE;

  const filterSummary = !plant
    ? filters.truck_type
      ? ` · ${filters.truck_type.toLowerCase()}`
      : ""
    : filters.equipment
      ? ` · ${filters.equipment}${
          filters.subtype ? ` / ${filters.subtype}` : ""
        }`
      : "";

  return (
    <LogisticsPageShell
      title="Book a Logistic/Equipment"
      crumbLabel="Search"
    >
      <div className="log-search-layout">
        <aside className="log-search-sidebar" aria-label="Search filters">
          <form className="log-search-filters" onSubmit={runSearch}>
            <h2 className="log-search-filters__title">Filters</h2>
            <LogisticsCategoryTiles
              compact
              value={filters.category}
              onChange={onCategoryChange}
            />

            {!plant ? (
              <div className="log-search-filters__stack">
                <LogisticsLocationField
                  compact
                  label="Location"
                  address={filters.location}
                  coords={filters.location_coords}
                  title="Search near location"
                  chooseLabel="Optional — choose on map"
                  onChange={({ address, coords }) =>
                    setFilters((f) => ({
                      ...f,
                      location: address || "",
                      location_coords: coords,
                    }))
                  }
                />
                <label className="log-field">
                  <span className="log-fl">Radius</span>
                  <select
                    value={filters.radius_km}
                    onChange={set("radius_km")}
                    aria-label="Search radius"
                  >
                    {RADIUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="log-field">
                  <span className="log-fl">Name</span>
                  <input
                    value={filters.name}
                    onChange={set("name")}
                    placeholder="Name"
                  />
                </label>
                {cab ? (
                <label className="log-field">
                  <span className="log-fl">Cab type</span>
                  <select
                    value={filters.cab_class || ""}
                    onChange={set("cab_class")}
                    aria-label="Cab type"
                  >
                    <option value="">Any</option>
                    {DEFAULT_CAB_CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.wheels}-wheeler)
                      </option>
                    ))}
                  </select>
                </label>
                ) : null}
                {!cab ? (
                <>
                <label className="log-field">
                  <span className="log-fl">Truck type</span>
                  <select
                    value={filters.truck_type}
                    onChange={set("truck_type")}
                    aria-label="Truck type"
                  >
                    <option value="">Any</option>
                    {TRUCK_BODY_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="log-field">
                  <span className="log-fl">Vehicle needed</span>
                  <select
                    value={filters.vehicle_needed}
                    onChange={set("vehicle_needed")}
                    aria-label="Vehicle needed"
                  >
                    <option value="">Any</option>
                    {CAPACITY_TIER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                </>
                ) : null}
              </div>
            ) : (
              <div className="log-search-filters__stack">
                <LogisticsPickField
                  label="Equipment"
                  value={filters.equipment}
                  placeholder="None (any)"
                  onClick={() => setEquipOpen(true)}
                />
                <LogisticsPickField
                  label="Sub type"
                  value={filters.subtype}
                  placeholder="None (any)"
                  onClick={() => setSubtypeOpen(true)}
                />
                {filters.equipment || filters.subtype ? (
                  <button
                    type="button"
                    className="logistics-cta logistics-cta--ghost log-search-filters__clear-equip"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        equipment: "",
                        subtype: "",
                      }))
                    }
                  >
                    Clear equipment filters
                  </button>
                ) : null}
                <LogisticsLocationField
                  compact
                  label="Location"
                  address={filters.location}
                  coords={filters.location_coords}
                  title="Search near location"
                  chooseLabel="Optional — choose on map"
                  onChange={({ address, coords }) =>
                    setFilters((f) => ({
                      ...f,
                      location: address || "",
                      location_coords: coords,
                    }))
                  }
                />
                <label className="log-field">
                  <span className="log-fl">Radius</span>
                  <select
                    value={filters.radius_km}
                    onChange={set("radius_km")}
                    aria-label="Search radius"
                  >
                    {RADIUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <button
              className="logistics-cta logistics-cta--primary log-search-filters__submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Searching…"
                : plant
                  ? "Search equipment"
                  : cab
                    ? "Search cabs"
                    : "Search trucks"}
            </button>
          </form>
        </aside>

        <section className="log-search-main" aria-live="polite">
          {!searched ? (
            <div className="log-search-empty">
              <p className="log-search-empty__title">
                {plant ? "Find equipment" : cab ? "Find cabs" : "Find trucks"}
              </p>
              <p className="log-hint">
                Browse by category anytime. Add a map location later to narrow
                results by distance. Switching category refreshes the list.
              </p>
            </div>
          ) : (
            <>
              <div className="log-jobs-meta">
                {loading
                  ? <LogisticsSkeletonMeta w={260} />
                  : total
                    ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                        page * PAGE_SIZE,
                        total
                      )} of ${total} ${plant ? "asset" : cab ? "cab" : "truck"}${
                        total === 1 ? "" : "s"
                      }${
                        hasLocation(filters)
                          ? ` within ${filters.radius_km} km`
                          : " (all areas — add location to filter by distance)"
                      }${filterSummary}`
                    : `No ${plant ? "assets" : cab ? "cabs" : "trucks"} found${
                        hasLocation(filters)
                          ? ` within ${filters.radius_km} km`
                          : ""
                      }${filterSummary}`}
              </div>

              <div className="log-jobs-table-wrap log-search-table-wrap">
                <table className="log-jobs-table log-search-table">
                  <thead>
                    <tr>
                      <th>{plant ? "Equipment" : "Vehicle"}</th>
                      <th>Specs</th>
                      <th>Owner / business</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Distance</th>
                      <th>Rating</th>
                      <th aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading && !rows.length ? (
                      <LogisticsTableSkeletonRows cols={8} />
                    ) : null}
                    {rows.map((row) => {
                      const state = row.availability?.state || "offline";
                      const statusLabel =
                        row.availability?.state_label ||
                        AVAIL_LABEL[state] ||
                        state;
                      const statusDetail = row.availability?.status_detail;
                      const biz = ownerBusiness(row);
                      const thumb =
                        assetPhotoUrl(row.photos?.[0]) || defaultImage;
                      const place = placeShortLabel(row.current_location);
                      const pinHint =
                        row.location_source === "operator_gps"
                          ? "Live GPS"
                          : row.location_source === "vehicle_home"
                            ? "Base location"
                            : null;
                      return (
                        <tr key={row.asset_id}>
                          <td>
                            <div className="log-search-asset">
                              <img
                                className="log-search-asset__thumb"
                                src={thumb}
                                alt=""
                              />
                              <Link
                                className="log-jobs-table__link"
                                to={`/logistics/asset/${row.asset_id}`}
                              >
                                {row.name || "Asset"}
                              </Link>
                            </div>
                          </td>
                          <td>{formatSpecs(row, plant)}</td>
                          <td>
                            <div className="log-search-owner">
                              <b>
                                {biz.company}
                                {biz.verified ? (
                                  <span
                                    className="log-chip log-chip--active log-search-owner__verified"
                                    title="Verified"
                                  >
                                    Verified
                                  </span>
                                ) : null}
                              </b>
                              {biz.contact ? (
                                <span className="log-hint">{biz.contact}</span>
                              ) : null}
                              {biz.email ? (
                                <span className="log-hint">{biz.email}</span>
                              ) : null}
                              {biz.phone ? (
                                <span className="log-hint">{biz.phone}</span>
                              ) : biz.contactLocked ? (
                                <span className="log-hint log-search-owner__locked">
                                  Book to contact
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            <div className="log-search-status">
                              <span
                                className="log-chip"
                                style={{
                                  background: `${AVAIL_COLOR[state] || "#8a8a8a"}22`,
                                  color: AVAIL_COLOR[state] || "#8a8a8a",
                                }}
                              >
                                {statusLabel}
                              </span>
                              {statusDetail ? (
                                <span className="log-hint">{statusDetail}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            {place ? (
                              <div
                                className="log-search-location"
                                title={
                                  pinHint
                                    ? `${row.current_location} · ${pinHint}`
                                    : row.current_location || undefined
                                }
                              >
                                <span className="log-search-location__label">
                                  Current location
                                </span>
                                <span className="log-search-location__value">
                                  {place}
                                </span>
                              </div>
                            ) : (
                              <span className="log-hint">—</span>
                            )}
                          </td>
                          <td>
                            {row.distance_km != null
                              ? `${row.distance_km} km`
                              : "—"}
                          </td>
                          <td>{formatRating(row.rating)}</td>
                          <td>
                            <Link
                              className="log-jobs-table__open"
                              to={`/logistics/asset/${row.asset_id}`}
                              aria-label={`Open ${row.name || "asset"}`}
                            >
                              ›
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && !rows.length ? (
                      <tr>
                        <td colSpan={8} className="logistics-empty">
                          No assets found within this radius — try a wider
                          radius or another location.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {showPagination ? (
                <div
                  className="log-jobs-pager"
                  role="navigation"
                  aria-label="Search results pages"
                >
                  <button
                    type="button"
                    className="logistics-cta logistics-cta--ghost"
                    disabled={page <= 1 || loading}
                    onClick={() => fetchResults(filters, page - 1)}
                  >
                    Previous
                  </button>
                  <span className="log-jobs-pager__pages">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="logistics-cta logistics-cta--ghost"
                    disabled={page >= totalPages || loading}
                    onClick={() => fetchResults(filters, page + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <EquipmentPickerModal
        open={equipOpen}
        category={filters.category}
        onClose={() => setEquipOpen(false)}
        onSelect={(equipment) =>
          setFilters((f) => ({ ...f, equipment, subtype: "" }))
        }
      />
      <SubtypePickerModal
        open={subtypeOpen}
        category={filters.category}
        equipment={filters.equipment}
        onClose={() => setSubtypeOpen(false)}
        onSelect={(subtype) => setFilters((f) => ({ ...f, subtype }))}
      />
    </LogisticsPageShell>
  );
}
