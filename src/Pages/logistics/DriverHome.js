import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsFleetMap from "../../CommanComponents/LogisticsFleetMap";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import {
  OPERATOR_STATUS_LABEL,
  OPERATOR_STATUS_OPTIONS,
  coerceStatusSelection,
  isLiveAvailabilityState,
  statusOptionsForAsset,
} from "../../utils/logisticsOperatorStatus";
import { reverseGeocodeCoords } from "../../utils/landingPlaces";
import { jobKindTypeChip } from "../../utils/jobKind";
import { jobImageUrl } from "./MyJobs";
import { defaultImage } from "../../utils/ImagePath";
import "./logistics.css";
import {
  LogisticsListSkeleton,
  LogisticsStatsSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import LogisticsUnitPicker, { unitDisabled } from "../../CommanComponents/LogisticsUnitPicker";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";
import LogisticsSosContactsPrompt from "../../CommanComponents/LogisticsSosContactsPrompt";
import { OperatorDocBanner } from "../../CommanComponents/LogisticsDocAlerts";

const PLACEHOLDER_LABELS = new Set([
  "current location",
  "current gps",
  "owner-set location",
  "set your city",
]);

function isMeaningfulPlaceLabel(label) {
  const s = String(label || "").trim();
  if (!s || s.length < 3) return false;
  return !PLACEHOLDER_LABELS.has(s.toLowerCase());
}

async function resolveOutgoingPlaceLabel(rawLabel, lat, lng) {
  if (isMeaningfulPlaceLabel(rawLabel)) return String(rawLabel).trim();
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    try {
      const reversed = await reverseGeocodeCoords(Number(lat), Number(lng));
      if (isMeaningfulPlaceLabel(reversed?.label)) {
        return String(reversed.label).trim();
      }
    } catch {
      /* backend will reverse-geocode as fallback */
    }
  }
  return String(rawLabel || "").trim();
}

function formatWhen(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount, currency = "USD") {
  if (amount == null || amount === "") return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return `${currency} ${n.toLocaleString()}`;
}

function jobRouteLabel(job) {
  const pickup = placeShortLabel(job?.pickup?.address) || "Pickup";
  const dropoff = placeShortLabel(job?.dropoff?.address) || "Dropoff";
  return `${pickup} → ${dropoff}`;
}

function verifiedAgo(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function assetLine(asset) {
  if (!asset) return "No vehicle selected";
  const parts = [
    asset.name,
    asset.registration ? `Plate ${asset.registration}` : null,
    asset.kind === "equipment" ? "Equipment" : asset.kind === "cab" ? "Cab" : "Truck",
  ].filter(Boolean);
  return parts.join(" · ");
}

function OperatorSection({ section }) {
  if (section === "earnings") return <OperatorEarnings />;
  return <OperatorDashboard />;
}

function OperatorDashboard() {
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedState, setSelectedState] = useState("offline");

  const reload = async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    try {
      const res = await dispatch(LogisticsActions.getOperatorDashboard());
      const next = res?.payload?.data || null;
      setData(next);
      const av = next?.availability || {};
      const active = next?.active_asset;
      const assigned = next?.assigned_assets || [];
      const lockedIds = (next?.truck_switch_lock?.locked_asset_ids || []).map(
        String
      );
      const preferredLocked =
        lockedIds.find((id) => assigned.some((a) => String(a._id) === id)) ||
        "";
      // Units the owner disabled (plan limit / by hand) can't be picked
      const usable = (id) =>
        assigned.some((a) => String(a._id) === String(id) && !unitDisabled(a));
      const nextAssetId = String(
        [active?._id, av.active_asset_id].find((id) => id && usable(id)) ||
          assigned.find((a) => !unitDisabled(a))?._id ||
          ""
      );
      // Keep the operator's selected truck when going offline (active_asset_id cleared)
      // Prefer the unit that still has their active jobs when locked.
      setSelectedAssetId((prev) => {
        if (preferredLocked) return preferredLocked;
        if (prev && usable(prev)) return String(prev);
        return nextAssetId;
      });
      const nextState = av.ui_state || av.state || "offline";
      setSelectedState(nextState);
      return next;
    } finally {
      if (!soft) setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Owner changed this operator's truck status / map pin → refresh banner,
  // Using now, Set status and map (also on tab focus as a fallback)
  useEffect(() => {
    const onLogisticsNotif = (evt) => {
      const type = String(evt?.detail?.type || "").toUpperCase();
      if (type === "LOGISTICS_AVAILABILITY_UPDATED") reload({ soft: true });
    };
    const onFocus = () => {
      if (document.visibilityState === "visible") reload({ soft: true });
    };
    window.addEventListener("simba:logistics_notification", onLogisticsNotif);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener(
        "simba:logistics_notification",
        onLogisticsNotif
      );
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availability = data?.availability || {};
  const stats = data?.stats || {};
  const nearby = data?.nearby || [];
  const assigned = data?.assigned_assets || [];
  const truckSwitchLock = data?.truck_switch_lock || {};
  const lockedAssetIds = (truckSwitchLock.locked_asset_ids || []).map(String);
  const truckSwitchLocked = Boolean(truckSwitchLock.locked);

  // Banner + map = last committed live unit (only after Update status)
  const committedAssetId = String(
    availability.active_asset_id || data?.active_asset?._id || ""
  );
  const committedAsset =
    assigned.find((a) => String(a._id) === committedAssetId) ||
    data?.active_asset ||
    null;
  // Draft selection for the form only — does not drive the green banner
  const draftAsset =
    assigned.find((a) => String(a._id) === String(selectedAssetId)) || null;
  const usableUnits = assigned.filter((a) => !unitDisabled(a));
  const disabledUnits = assigned.filter(unitDisabled);
  const planLockedUnits = disabledUnits.filter((a) => a.plan_locked);
  const draftKind = draftAsset?.kind || committedAsset?.kind || "vehicle";
  const statusOptions = useMemo(
    () =>
      statusOptionsForAsset(
        { kind: draftKind },
        OPERATOR_STATUS_OPTIONS
      ),
    [draftKind]
  );
  const uiState = availability.ui_state || availability.state || "offline";
  const isLive = isLiveAvailabilityState(uiState);
  const ago = verifiedAgo(availability.last_verified_at);
  const lat = Number(availability.lat);
  const lng = Number(availability.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const placeDisplay =
    [
      availability.location_label,
      committedAsset?.location_label,
      data?.active_asset?.location_label,
    ]
      .map((v) => String(v || "").trim())
      .find((v) => isMeaningfulPlaceLabel(v)) || null;

  useEffect(() => {
    setSelectedState((prev) => coerceStatusSelection(prev, statusOptions));
  }, [statusOptions]);

  const mapVehicles = useMemo(() => {
    if (!hasCoords || !committedAsset) return [];
    return [
      {
        asset_id: committedAsset._id,
        name: committedAsset.name,
        availability: uiState,
        live_location: {
          lat,
          lng,
          operator_name: "You",
          updated_at: availability.last_verified_at,
        },
      },
    ];
  }, [
    hasCoords,
    committedAsset,
    lat,
    lng,
    uiState,
    availability.last_verified_at,
  ]);

  const onUsingNowChange = (nextId) => {
    const next = String(nextId || "");
    // Disabled options can't be chosen; guard anyway
    const picked = assigned.find((a) => String(a._id) === next);
    if (picked && unitDisabled(picked)) return;
    if (
      truckSwitchLocked &&
      lockedAssetIds.length &&
      !lockedAssetIds.includes(next)
    ) {
      toast.error(
        truckSwitchLock.message ||
          "Finish your task first — you cannot switch trucks while you have active jobs.",
        { autoClose: 8000 }
      );
      return;
    }
    setSelectedAssetId(next);
  };

  const applyStatus = async (payload, { verified = false } = {}) => {
    setSaving(true);
    const prevSnapshot = data;
    const prevSelectedState = selectedState;
    const prevSelectedAssetId = selectedAssetId;
    const nextActive =
      payload.state === "offline"
        ? null
        : assigned.find((a) => String(a._id) === String(payload.asset_id)) ||
          null;
    // Optimistic banner only after button click (committed fields)
    setSelectedState(payload.state);
    setData((prev) => ({
      ...(prev || {}),
      availability: {
        ...(prev?.availability || {}),
        state:
          payload.state === "available_tomorrow" ? "scheduled" : payload.state,
        ui_state: payload.state,
        ...(payload.lat != null ? { lat: payload.lat } : {}),
        ...(payload.lng != null ? { lng: payload.lng } : {}),
        ...(payload.location_label
          ? { location_label: payload.location_label }
          : {}),
        ...(payload.last_verified_at
          ? { last_verified_at: payload.last_verified_at }
          : {}),
        ...(payload.state === "offline"
          ? { active_asset_id: null }
          : payload.asset_id
            ? { active_asset_id: payload.asset_id }
            : {}),
      },
      active_asset:
        payload.state === "offline"
          ? null
          : nextActive || prev?.active_asset || null,
    }));
    try {
      const res = await dispatch(LogisticsActions.patchMyAvailability(payload));
      if (res?.meta?.requestStatus === "rejected") {
        // Revert optimistic UI — API uses HTTP 200 + success:false for errors
        if (prevSnapshot) setData(prevSnapshot);
        setSelectedState(prevSelectedState);
        setSelectedAssetId(prevSelectedAssetId);
        const detail = res?.payload?.data;
        const msg =
          res?.payload?.message ||
          detail?.message ||
          "Could not update status — try again after finishing any active job";
        toast.error(msg, { autoClose: 8000 });
        await reload({ soft: true });
        return;
      }
      const patchData = res?.payload?.data;
      if (patchData?.availability) {
        setData((prev) => ({
          ...(prev || {}),
          availability: {
            ...(prev?.availability || {}),
            ...patchData.availability,
          },
          active_asset:
            patchData.active_asset !== undefined
              ? patchData.active_asset
              : prev?.active_asset,
          assigned_assets:
            patchData.assigned_assets || prev?.assigned_assets || [],
          truck_switch_lock:
            patchData.truck_switch_lock !== undefined
              ? patchData.truck_switch_lock
              : prev?.truck_switch_lock,
        }));
        const nextUi =
          patchData.availability.ui_state ||
          patchData.ui_state ||
          patchData.availability.state;
        if (nextUi) setSelectedState(nextUi);
        const committedId = String(
          patchData.availability.active_asset_id ||
            patchData.active_asset?._id ||
            ""
        );
        if (committedId) setSelectedAssetId(committedId);
      }
      toast.success(
        verified
          ? "Status and location updated"
          : payload.state === "offline"
            ? "You are offline — other assigned assets set offline"
            : "Status updated"
      );
      await reload({ soft: true });
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!assigned.length) {
      toast.error("No vehicle assigned yet — ask your owner");
      return;
    }
    if (selectedState !== "offline" && !selectedAssetId) {
      toast.error("Select the vehicle you are using");
      return;
    }
    if (
      selectedState !== "offline" &&
      truckSwitchLocked &&
      lockedAssetIds.length &&
      !lockedAssetIds.includes(String(selectedAssetId))
    ) {
      toast.error(
        truckSwitchLock.message ||
          "Finish your task first — you cannot switch trucks while you have active jobs.",
        { autoClose: 8000 }
      );
      return;
    }
    // Disabled unit (owner / plan limit): Offline only — server enforces too
    if (selectedState !== "offline" && draftAsset && Number(draftAsset.is_active) === 0) {
      toast.error(
        draftAsset.plan_locked
          ? `${draftAsset.name} is disabled by your owner's plan limit — you can't go online or quote with it. Ask your owner to re-enable it.`
          : `${draftAsset.name} is disabled by your owner — you can't go online with it.`,
        { autoClose: 8000 }
      );
      return;
    }
    // Offline: no GPS needed — keep the last place label only.
    if (selectedState === "offline") {
      await applyStatus({
        state: selectedState,
        // Always send asset when known — offline still needs it for fleet sync
        asset_id: selectedAssetId || undefined,
        location_label: availability.location_label || undefined,
      });
      return;
    }
    // One button: read GPS, then save status + location together.
    // last_verified_at is only sent for a real GPS fix (local-job quotes need it fresh).
    const pos = await readGpsPosition();
    if (!pos) {
      toast.error(
        "Could not read GPS — status saved without a location update. Allow location access to quote on Now jobs.",
        { autoClose: 7000 }
      );
      await applyStatus({
        state: selectedState,
        asset_id: selectedAssetId || undefined,
        location_label: availability.location_label || undefined,
      });
      return;
    }
    const place = await resolveOutgoingPlaceLabel(null, pos.lat, pos.lng);
    await applyStatus(
      {
        state: selectedState,
        asset_id: selectedAssetId || undefined,
        location_label: place || undefined,
        lat: pos.lat,
        lng: pos.lng,
        last_verified_at: new Date().toISOString(),
      },
      { verified: true }
    );
  };

  const readGpsPosition = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLocating(false);
          resolve({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        () => {
          setLocating(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

  const scrollToMap = (e) => {
    e.preventDefault();
    document.getElementById("log-dash-map")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading && !data) {
    return (
      <LogisticsStatsSkeleton tiles={3} chart={false} list={3} label="Loading dashboard" />
    );
  }

  const busy = saving || locating;
  const bannerPhoto =
    jobImageUrl(committedAsset?.photos?.[0]) ||
    (committedAsset ? defaultImage : null);

  return (
    <div className="log-dash">
      <LogisticsSosContactsPrompt />
      <OperatorDocBanner compliance={data?.document_compliance} />
      {/* <p className="log-dash__intro">
        Drive one vehicle at a time. Change truck, status, and verify GPS here —
        other assigned assets go offline when you go live.
      </p> */}

      <section className="log-dash-avail-block" aria-label="Availability">
        <div className={`log-dash-avail${isLive ? " is-on" : " is-off"}`}>
          <div className="log-dash-avail__left">
            <div className="log-dash-avail__title">
              <span className="log-dash-avail__dot" aria-hidden="true" />
              <strong>
                {OPERATOR_STATUS_LABEL[uiState] || OPERATOR_STATUS_LABEL.offline}
              </strong>
            </div>
            <p className="log-dash-avail__vehicle">
              {committedAsset
                ? assetLine(committedAsset)
                : "No live unit — select Using now and Update status"}
            </p>
            <p>
              {placeDisplay
                ? `Current location · ${placeShortLabel(placeDisplay)}`
                : hasCoords
                  ? "Current location · pinned (label pending)"
                  : "Current location · Update status to set"}
              {ago ? ` · Verified ${ago}` : " · GPS not verified yet"}
            </p>
            <a href="#log-dash-map" className="log-dash-avail__map" onClick={scrollToMap}>
              View on map
            </a>
          </div>
          {bannerPhoto ? (
            <div className="log-dash-avail__media" aria-hidden={!committedAsset}>
              <img
                src={bannerPhoto}
                alt={
                  committedAsset
                    ? committedAsset.name || "Current unit"
                    : ""
                }
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultImage;
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="log-dash-avail-controls">
          {!assigned.length ? (
            <p className="log-hint" style={{ margin: 0 }}>
              No truck or equipment is assigned to you yet. Ask your owner to
              assign one from Operators / Fleet.
            </p>
          ) : (
            <>
              <div className="log-dash-vehicle-panel__grid">
                <div className="log-field">
                  <span className="log-fl" id="log-using-now-label">Using now</span>
                  <LogisticsUnitPicker
                    units={assigned}
                    value={selectedAssetId}
                    onChange={onUsingNowChange}
                    disabled={busy}
                  />
                </div>
                <label className="log-field">
                  <span className="log-fl">Set status</span>
                  <select
                    aria-label="Set status"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="log-dash-vehicle-panel__actions log-dash-vehicle-panel__actions--stack">
                  <button
                    type="button"
                    className="logistics-cta logistics-cta--primary"
                    disabled={busy || (!usableUnits.length && selectedState !== "offline")}
                    onClick={saveStatus}
                  >
                    {locating
                      ? "Reading GPS…"
                      : saving
                        ? "Saving…"
                        : "Update status"}
                  </button>
                </div>
              </div>
              {disabledUnits.length ? (
                <p className="log-plan-locked-strip log-plan-locked-strip--op" role="alert">
                  <b>
                    {disabledUnits.length === assigned.length
                      ? `All your units are disabled by your owner${planLockedUnits.length === disabledUnits.length ? "'s plan limit" : ""}:`
                      : `${disabledUnits.length} of your units ${disabledUnits.length === 1 ? "is" : "are"} disabled by your owner${planLockedUnits.length === disabledUnits.length ? "'s plan limit" : ""}:`}{" "}
                    {disabledUnits.map((a) => a.name).join(", ")}.
                  </b>
                  <span>
                    {disabledUnits.length === assigned.length
                      ? "You can still browse jobs and your history, but can't go online or quote until your owner makes one of them active."
                      : "You can't select them, go online or quote with them. Ask your owner to choose them as active units."}
                  </span>
                </p>
              ) : null}
              <p className="log-hint" style={{ marginBottom: 0 }}>
                Update status saves your status and current GPS location
                together (place label comes from coordinates). Keep it fresh —
                Now jobs need your location from the last 10 minutes to quote.
                {assigned.length > 1
                  ? ` Other assigned vehicles/equipment (${assigned.length - 1}) go offline when you go live on one unit.`
                  : ""}
                {truckSwitchLocked
                  ? " You have active job(s) — stay on that truck (Available is OK after Offline). Only your fleet owner can reassign those jobs to another unit or operator."
                  : ""}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="log-dash-stats">
        <div>
          <strong>{stats.local_jobs ?? 0}</strong>
          <span>Local Jobs</span>
          <em>near you</em>
        </div>
        <div>
          <strong>{stats.return_loads ?? 0}</strong>
          <span>Return Load</span>
          <em>opportunity</em>
        </div>
        <div>
          <strong>{stats.profile_views ?? 0}</strong>
          <span>Profile views</span>
          <em>(7 days)</em>
        </div>
      </section>

      <div className="log-dash-grid">
        <section className="log-dash-map-card" id="log-dash-map">
          <h2>Your Current Location</h2>
          <div className="log-dash-map log-dash-map--leaflet">
            {hasCoords ? (
              <LogisticsFleetMap
                vehicles={mapVehicles}
                jobs={[]}
                showVehicles
                showJobs={false}
                height={280}
              />
            ) : (
              <p className="logistics-empty" style={{ padding: 24 }}>
                Tap <strong>Update status</strong> above to place your vehicle on the
                map.
              </p>
            )}
            <div className="log-dash-map__badge">
              GPS {ago ? `verified · ${ago}` : "not verified yet"}
            </div>
          </div>
        </section>

        <section className="log-dash-opps">
          <div className="log-dash-opps__head">
            <h2>Nearby Opportunities</h2>
            <Link to="/logistics/driver/work">View all →</Link>
          </div>
          <ul className="log-dash-opps__list">
            {nearby.slice(0, 4).map((job) => {
              const isReturn = Boolean(job.return_trip?.goods);
              const budget = job.budget?.amount;
              const weight = job.load_weight?.value
                ? `${job.load_weight.value}t`
                : null;
              const kindChip = jobKindTypeChip(job);
              return (
                <li key={job._id} className="log-dash-job">
                  <div className="log-dash-job__top">
                    <span
                      className={kindChip.className}
                      title={kindChip.title}
                    >
                      {kindChip.label}
                    </span>
                    <span
                      className={`log-dash-job__tag${
                        isReturn ? " is-return" : " is-local"
                      }`}
                    >
                      {isReturn ? "RETURN LOAD" : "LOCAL JOB"}
                    </span>
                    {job.route?.distance_km != null ? (
                      <span className="log-dash-job__dist">
                        ~{Math.round(job.route.distance_km)} km
                      </span>
                    ) : null}
                  </div>
                  <h3>
                    {[weight, job.load_type || "Cargo"].filter(Boolean).join(" – ")}
                  </h3>
                  <p className="log-dash-job__route">{jobRouteLabel(job)}</p>
                  <p className="log-dash-job__when">
                    {formatWhen(job.when_needed) || "Flexible"}
                    {job.flexible_dates ? " · Flexible" : ""}
                  </p>
                  <div className="log-dash-job__foot">
                    <strong>
                      {budget != null ? `US$${budget}` : "Quote open"}
                    </strong>
                    <Link
                      className="logistics-cta logistics-cta--primary log-dash-job__cta"
                      to={`/logistics/driver/job/${job._id}`}
                    >
                      View Job
                    </Link>
                  </div>
                </li>
              );
            })}
            {!nearby.length && (
              <li className="logistics-empty">No nearby opportunities yet</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

const EARNINGS_PAGE_SIZE = 10;

function OperatorEarnings() {
  const dispatch = useDispatch();
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ q: "", from: "", to: "" });

  const totalPages = Math.max(1, Math.ceil(total / EARNINGS_PAGE_SIZE) || 1);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const params = { page, limit: EARNINGS_PAGE_SIZE };
        if (applied.q) params.q = applied.q;
        if (applied.from) params.from = applied.from;
        if (applied.to) params.to = applied.to;
        const res = await dispatch(LogisticsActions.driverEarnings(params));
        const data = res?.payload?.data || {};
        if (!alive) return;
        setSummary(data.summary || null);
        setJobs(Array.isArray(data.data) ? data.data : []);
        setTotal(data.total || 0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dispatch, page, applied]);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setApplied({ q: q.trim(), from, to });
  };

  const clearFilters = () => {
    setQ("");
    setFrom("");
    setTo("");
    setPage(1);
    setApplied({ q: "", from: "", to: "" });
  };

  const totalAmt =
    formatMoney(summary?.amount, summary?.currency) || "$0";
  const myEarn =
    formatMoney(
      summary?.my_earning ?? summary?.operator_earning,
      summary?.currency
    ) || "$0";

  return (
    <div className="log-op-home log-earnings-page">
      {/* <p className="log-op-lead" style={{ marginTop: 0 }}>
        Filter by date range or search a <strong>job number</strong> to see
        what you earned on that delivery. Share comes from the pay frozen when
        the job was accepted.
      </p> */}

      <div className="log-op-hero">
        <span className="log-op-hero__lbl">This period</span>
        <strong className="log-op-hero__amt">{myEarn}</strong>
        <p className="log-op-hero__sub">
          My earning · {summary?.jobs_completed ?? 0} job
          {(summary?.jobs_completed || 0) === 1 ? "" : "s"} completed
        </p>
        <p className="log-op-hero__sub" style={{ opacity: 0.85, marginTop: 4 }}>
          Job totals {totalAmt}
          {summary?.pay_note
            ? ` · ${summary.pay_note}`
            : " · share from pay frozen on each job"}
        </p>
      </div>

      <form
        className="log-jobs-toolbar log-jobs-toolbar--wrap"
        onSubmit={applyFilters}
      >
        <label className="log-jobs-toolbar__search">
          <span className="log-fl">Job / search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Job number, route…"
          />
        </label>
        <label>
          <span className="log-fl">From</span>
          <LogisticsDateInput
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          <span className="log-fl">To</span>
          <LogisticsDateInput
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="log-jobs-toolbar__actions">
          <button type="submit" className="logistics-cta logistics-cta--primary">
            Apply
          </button>
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            onClick={clearFilters}
          >
            Reset
          </button>
        </div>
      </form>

      <h2 className="log-sect">Completed jobs</h2>
      {loading ? (
        <LogisticsListSkeleton rows={4} media={false} label="Loading earnings" />
      ) : (
        <>
          <div className="log-jobs-table-wrap">
            <table className="log-jobs-table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Completed</th>
                  <th>Route</th>
                  <th>Job total</th>
                  <th>Pay</th>
                  <th>My earning</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.job_id}>
                    <td>
                      <b>{j.job_number || "—"}</b>
                    </td>
                    <td>{formatWhen(j.completed_at) || "Completed"}</td>
                    <td>{j.route || "Job"}</td>
                    <td>
                      {formatMoney(j.amount?.amount, j.amount?.currency)}
                    </td>
                    <td>
                      <span className="log-hint">{j.pay_label || "—"}</span>
                    </td>
                    <td>
                      <b>
                        {formatMoney(
                          j.my_earning?.amount ?? j.operator_earning?.amount,
                          j.my_earning?.currency || j.amount?.currency
                        )}
                      </b>
                      {j.pay_type === "monthly" ? (
                        <div className="log-hint">Monthly salary (manual)</div>
                      ) : null}
                    </td>
                    <td>
                      <Link
                        className="log-jobs-table__open"
                        to={`/logistics/driver/job/${j.job_id}`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!jobs.length ? (
                  <tr>
                    <td colSpan={7} className="logistics-empty">
                      No completed jobs in this range
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {total > EARNINGS_PAGE_SIZE ? (
            <div className="log-jobs-pager">
              <button
                type="button"
                className="logistics-cta logistics-cta--ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="log-jobs-pager__pages">
                Page {page} of {totalPages} · {total} jobs
              </span>
              <button
                type="button"
                className="logistics-cta logistics-cta--ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function LogisticsDriverHome() {
  const location = useLocation();
  const path = location.pathname;

  let section = "dashboard";
  let title = "Dashboard";
  let crumb = "Dashboard";
  if (path.endsWith("/earnings")) {
    section = "earnings";
    title = "Earnings";
    crumb = "Earnings";
  }

  return (
    <LogisticsPageShell
      title={title}
      crumbLabel={crumb}
      midCrumb={{ to: "/logistics/driver", label: "Operator" }}
      homeTo="/logistics/driver"
    >
      <OperatorSection section={section} />
    </LogisticsPageShell>
  );
}
