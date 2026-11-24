import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { ADD_LOCKED_TITLE, useAddLocked } from "../../CommanComponents/LogisticsAddLock";
import LogisticsLocationField from "../../CommanComponents/LogisticsLocationField";
import "./logistics.css";
import {
  LogisticsGridSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import { UNIT_STATUS_FILTERS, ownerStatusControl, unitStatusChip, unitStatusKey } from "../../utils/ownerUnitStatus";
import { apiErrorMessage, isApiFailure } from "../../utils/ownerOperator";
import { refreshLogisticsAccount } from "../../CommanComponents/LogisticsAccountBanner";
import { OwnerOperatorCard, UnitOperateControl, useOwnerOperator } from "../../CommanComponents/LogisticsOwnerOperator";

const PAGE_SIZE = 10;

function capabilityLine(asset) {
  const caps = (asset.capabilities || []).filter(Boolean);
  const subtype = caps.find((c) => String(c).startsWith("subtype:"));
  const mobility = caps.find((c) => String(c).startsWith("mobility:"));
  const parts = [
    asset.make && asset.model ? `${asset.make} ${asset.model}` : asset.make || asset.model,
    asset.year,
    asset.capacity?.value != null
      ? `${asset.capacity.value} ${asset.capacity.unit || "tons"}`
      : null,
    asset.registration ? `Plate ${asset.registration}` : null,
    subtype ? subtype.replace(/^subtype:/i, "") : null,
    mobility ? mobility.replace(/^mobility:/i, "") : null,
  ].filter(Boolean);
  return parts.join(" · ") || "No specifications listed";
}

function operatorNames(asset) {
  return (asset.assigned_operators || [])
    .map((o) => o.full_name)
    .filter(Boolean);
}

function assetCoords(asset) {
  const live = asset?.live_location;
  if (
    Number.isFinite(Number(live?.lat)) &&
    Number.isFinite(Number(live?.lng))
  ) {
    return [Number(live.lng), Number(live.lat)];
  }
  const loc = asset?.location?.coordinates;
  if (Array.isArray(loc) && loc.length >= 2) {
    return [Number(loc[0]), Number(loc[1])];
  }
  const home = asset?.home_location?.coordinates;
  if (Array.isArray(home) && home.length >= 2) {
    return [Number(home[0]), Number(home[1])];
  }
  return null;
}

function assetAddress(asset) {
  return (
    asset?.live_location?.label ||
    asset?.availability?.note ||
    ""
  );
}

function gpsHint(asset) {
  const live = asset?.live_location;
  if (
    live &&
    Number.isFinite(Number(live.lat)) &&
    Number.isFinite(Number(live.lng))
  ) {
    const pin = live.pin_kind
      ? ` · ${String(live.pin_kind).replace(/_/g, " ")}`
      : "";
    return `${Number(live.lat).toFixed(4)}, ${Number(live.lng).toFixed(4)}${pin}`;
  }
  return "No GPS yet";
}

/**
 * Owner Availability — logistic trucks table + search filters.
 * Status + map pin (for when operator only has phone / no data).
 */
export default function OwnerAvailability() {
  // 29 Oct 2026: no new units until Simba approves the company
  const addLocked = useAddLocked();
  const dispatch = useDispatch();
  const ownerOp = useOwnerOperator();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [operator, setOperator] = useState("all");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState("");
  const [draftLoc, setDraftLoc] = useState({});

  const load = async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    try {
      // Trucks + cabs: unit status and base pin (operators go live themselves)
      const res = await dispatch(LogisticsActions.listAssets({}));
      const rows = (res?.payload?.data?.assets || []).filter(
        (a) => a.kind === "vehicle" || a.kind === "cab"
      );
      setAssets(rows);
      const next = {};
      rows.forEach((a) => {
        next[a._id] = {
          address: assetAddress(a),
          coords: assetCoords(a),
        };
      });
      setDraftLoc(next);
    } finally {
      if (!soft) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const operators = useMemo(() => {
    const map = new Map();
    assets.forEach((a) => {
      (a.assigned_operators || []).forEach((o) => {
        if (o?._id && o.full_name) map.set(String(o._id), o.full_name);
      });
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (status !== "all" && unitStatusKey(a) !== status) return false;
      if (operator !== "all") {
        const ids = (a.assigned_operators || []).map((o) => String(o._id));
        if (!ids.includes(operator)) return false;
      }
      if (!needle) return true;
      const hay = [
        a.name,
        a.make,
        a.model,
        a.registration,
        a.year,
        ...operatorNames(a),
        ...(a.capabilities || []),
        capabilityLine(a),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [assets, q, status, operator]);

  useEffect(() => {
    setPage(1);
  }, [q, status, operator]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  const setStatusFor = async (asset, control, state) => {
    if (state === control.value) return;
    setSavingId(asset._id);
    try {
      let res;
      if (control.holder === "owner") {
        // The owner's own unit: status follows the owner's live state
        res = await dispatch(
          state === "offline"
            ? LogisticsActions.releaseSelf(asset._id)
            : LogisticsActions.operateSelf({ id: asset._id, state })
        );
      } else {
        res = await dispatch(LogisticsActions.patchAssetAvailability({ id: asset._id, state }));
      }
      // The API answers 200 with success:false for refusals (e.g. no
      // operator live on the unit) — treat that as an error too
      if (isApiFailure(res)) {
        toast.error(apiErrorMessage(res?.payload, "Could not update status"), { autoClose: 8000 });
        return;
      }
      toast.success("Vehicle status updated");
      if (control.holder === "owner") await refreshLogisticsAccount();
      await load({ soft: true });
    } finally {
      setSavingId("");
    }
  };

  const saveLocation = async (asset) => {
    const draft = draftLoc[asset._id] || {};
    const coords = draft.coords;
    if (
      !Array.isArray(coords) ||
      coords.length < 2 ||
      !Number.isFinite(Number(coords[0])) ||
      !Number.isFinite(Number(coords[1]))
    ) {
      toast.error("Pick a location on the map first");
      return;
    }
    setSavingId(asset._id);
    try {
      const res = await dispatch(
        LogisticsActions.patchAssetAvailability({
          // Item 6: the pin only — never resend the stored status with it
          id: asset._id,
          lat: Number(coords[1]),
          lng: Number(coords[0]),
          location_label: String(draft.address || "").trim() || "Owner-set location",
        })
      );
      if (isApiFailure(res)) {
        toast.error(apiErrorMessage(res?.payload, "Could not save location"));
        return;
      }
      toast.success("Location saved — truck can get nearby jobs from this pin");
      await load();
    } finally {
      setSavingId("");
    }
  };

  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setOperator("all");
    setPage(1);
  };

  return (
    <LogisticsPageShell
      title="Availability"
      crumbLabel="Availability"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <div className="log-owner-avail">
        <OwnerOperatorCard />
        {/* <p className="log-op-lead">
          Logistic trucks only — set status here. If an operator only has phone
          (no data), get their area by call and{" "}
          <strong>set the map pin</strong> so they still get nearby job alerts.
          Live fleet view is on the{" "}
          <Link to="/logistics/owner">Owner dashboard</Link>.
        </p> */}

        <div className="log-jobs-toolbar log-jobs-toolbar--wrap">
          <label className="log-jobs-toolbar__search">
            <span className="log-fl">Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Vehicle, plate, operator…"
            />
          </label>
          <label>
            <span className="log-fl">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {UNIT_STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="log-fl">Operator</span>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            >
              <option value="all">All</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="log-jobs-toolbar__actions">
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={clearFilters}
            >
              Reset
            </button>
            {addLocked ? (
              <button type="button" className="logistics-cta logistics-cta--primary is-locked" disabled title={ADD_LOCKED_TITLE}>
                Add vehicle
              </button>
            ) : (
              <Link
                className="logistics-cta logistics-cta--primary"
                to="/logistics/owner/fleet/add"
              >
                Add vehicle
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <LogisticsGridSkeleton cards={6} label="Loading vehicles" />
        ) : (
          <>
            <div className="log-jobs-table-wrap log-card-table-wrap">
              <table className="log-jobs-table log-owner-avail__table log-card-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Operator</th>
                    <th>Status</th>
                    <th>GPS / map pin</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((asset) => {
                    const control = ownerStatusControl(asset, {
                      ownerActiveAssetId: ownerOp?.active_asset_id,
                    });
                    const chip = unitStatusChip(asset);
                    const ops = operatorNames(asset).join(", ");
                    const draft = draftLoc[asset._id] || {
                      address: "",
                      coords: null,
                    };
                    const busy = savingId === asset._id;
                    return (
                      <tr key={asset._id}>
                        <td className="log-card-table__title">
                          <b>{asset.name}</b>
                          <div className="log-hint">{capabilityLine(asset)}</div>
                        </td>
                        <td data-label="Operator">{ops || "—"}</td>
                        <td data-label="Status" className="log-owner-avail__cell-wide">
                          <span className={`log-chip log-chip--${chip.tone}`}>
                            {chip.label}
                          </span>
                          <label className="log-owner-avail__status">
                            <span className="visually-hidden">Set status</span>
                            <select
                              data-testid="unit-status-select"
                              value={control.value}
                              disabled={busy || control.disabled}
                              onChange={(e) =>
                                setStatusFor(asset, control, e.target.value)
                              }
                            >
                              {control.options.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {control.hint ? <div className="log-hint">{control.hint}</div> : null}
                          <UnitOperateControl asset={asset} onChanged={() => load({ soft: true })} />
                        </td>
                        <td data-label="GPS / map pin" className="log-owner-avail__cell-wide">
                          <div className="log-hint">{gpsHint(asset)}</div>
                          <div className="log-owner-avail__loc">
                            <LogisticsLocationField
                              label=""
                              compact
                              address={draft.address || ""}
                              coords={draft.coords}
                              title={`Set location · ${asset.name}`}
                              hint="When the operator only has phone coverage, ask for their area and pin it on the map."
                              chooseLabel="Open map to set location"
                              onChange={({ address, coords }) =>
                                setDraftLoc((prev) => ({
                                  ...prev,
                                  [asset._id]: { address, coords },
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="logistics-cta logistics-cta--primary"
                              disabled={busy}
                              onClick={() => saveLocation(asset)}
                            >
                              {busy ? "Saving…" : "Save location"}
                            </button>
                          </div>
                        </td>
                        <td className="log-card-table__actions">
                          <Link
                            className="log-jobs-table__open"
                            to={`/logistics/owner/fleet/${asset._id}`}
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={5} className="logistics-empty">
                        {assets.length
                          ? "No trucks match your filters."
                          : (
                            <>
                              No logistic trucks yet.{" "}
                              <Link to="/logistics/owner/fleet/add">
                                Add a vehicle
                              </Link>
                            </>
                          )}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="log-jobs-pager">
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="log-jobs-pager__pages">
                  Page {pageSafe} of {totalPages} · {filtered.length} trucks
                </span>
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </LogisticsPageShell>
  );
}
