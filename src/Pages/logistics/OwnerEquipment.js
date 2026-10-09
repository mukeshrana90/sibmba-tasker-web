import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import "./logistics.css";
import {
  LogisticsGridSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import { notBookableReason } from "../../utils/ownerUnitStatus";

const PAGE_SIZE = 8;

const AVAIL_LABEL = {
  available_now: "Available",
  returning_empty: "Returning empty",
  scheduled: "Scheduled",
  on_job: "On job",
  offline: "Offline",
};

const AVAIL_TONE = {
  available_now: "active",
  returning_empty: "pending",
  scheduled: "active",
  on_job: "progress",
  offline: "closed",
};

const CAP_PREFIXES = ["subtype:", "mobility:", "engine:", "vin:"];

/** Category / Equipment type / Sub type / extra specs from stored capabilities. */
function equipmentMeta(asset) {
  const caps = (asset.capabilities || []).map((c) => String(c || "").trim());
  const byPrefix = (prefix) => {
    const hit = caps.find((c) => c.toLowerCase().startsWith(prefix));
    return hit ? hit.slice(prefix.length).trim() : "";
  };
  const equipmentType =
    caps.find(
      (c) => c && !CAP_PREFIXES.some((p) => c.toLowerCase().startsWith(p))
    ) || "";
  const category = String((asset.services || [])[0] || "");
  return {
    category: category
      ? category.charAt(0).toUpperCase() + category.slice(1)
      : "",
    equipmentType,
    subtype: byPrefix("subtype:"),
    extra: [
      asset.make && asset.model
        ? `${asset.make} ${asset.model}`
        : asset.make || asset.model,
      byPrefix("mobility:"),
      asset.capacity?.value != null
        ? `${asset.capacity.value} ${asset.capacity.unit || "tons"}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/** Assigned operators; live = this unit is their active asset and they're not offline. */
function assetOperators(asset) {
  return (asset.assigned_operators || []).map((op) => {
    const av = op.logistics_availability || {};
    const live =
      String(av.active_asset_id || "") === String(asset._id) &&
      av.state &&
      av.state !== "offline";
    return { _id: op._id, name: op.full_name || op.email || "Operator", live };
  });
}

/**
 * Owner non-logistic equipment — list, search, filter (kind=equipment).
 */
export default function OwnerEquipment() {
  const dispatch = useDispatch();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dispatch(
          LogisticsActions.listAssets({ kind: "equipment" })
        );
        setAssets(res?.payload?.data?.assets || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [dispatch]);

  const categories = useMemo(() => {
    const set = new Set();
    assets.forEach((a) => {
      const c = (a.services || [])[0];
      if (c) set.add(String(c));
    });
    return [...set].sort();
  }, [assets]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (status !== "all" && (a.availability?.state || "offline") !== status) {
        return false;
      }
      if (category !== "all") {
        const c = String((a.services || [])[0] || "").toLowerCase();
        if (c !== category.toLowerCase()) return false;
      }
      if (!needle) return true;
      const hay = [
        a.name,
        a.make,
        a.model,
        a.registration,
        a.chassis_number,
        ...(a.assigned_operators || []).map((op) => op.full_name),
        ...(a.capabilities || []),
        ...(a.services || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [assets, q, status, category]);

  useEffect(() => {
    setPage(1);
  }, [q, status, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  return (
    <LogisticsPageShell
      title="Non-logistic equipment"
      crumbLabel="Equipment"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <div className="log-equip-page">
        {/* <p className="log-op-lead">
          Plant and equipment (not road trucks). Search, filter by status or
          category, then open an item to manage it.
        </p> */}

        <div className="log-jobs-toolbar log-jobs-toolbar--wrap">
          <label className="log-jobs-toolbar__search">
            <span className="log-fl">Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, type, operator, VIN…"
            />
          </label>
          <label>
            <span className="log-fl">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="available_now">Available</option>
              <option value="scheduled">Scheduled</option>
              <option value="on_job">On job</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          <label>
            <span className="log-fl">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="log-jobs-toolbar__actions">
            <Link
              className="logistics-cta logistics-cta--primary"
              to="/logistics/owner/fleet/add"
            >
              Add equipment
            </Link>
          </div>
        </div>

        {loading ? (
          <LogisticsGridSkeleton cards={6} label="Loading equipment" />
        ) : (
          <>
            <div className="log-jobs-table-wrap">
              <table className="log-jobs-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Category</th>
                    <th>Equipment type</th>
                    <th>Sub type</th>
                    <th>Operator</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((asset) => {
                    const st = asset.availability?.state || "offline";
                    const meta = equipmentMeta(asset);
                    const ops = assetOperators(asset);
                    return (
                      <tr key={asset._id}>
                        <td>
                          <b>{asset.name}</b>
                          {meta.extra ? (
                            <span className="log-equip-row__sub">{meta.extra}</span>
                          ) : null}
                        </td>
                        <td>{meta.category || "—"}</td>
                        <td>{meta.equipmentType || "—"}</td>
                        <td>{meta.subtype || "—"}</td>
                        <td>
                          {ops.length ? (
                            <span className="log-equip-ops">
                              {ops.map((op) => (
                                <span
                                  key={op._id}
                                  className={`log-equip-op${op.live ? " is-live" : ""}`}
                                  title={op.live ? "Live on this equipment" : "Assigned"}
                                >
                                  {op.live ? (
                                    <span className="log-equip-op__dot" aria-hidden="true" />
                                  ) : null}
                                  {op.name}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <Link
                              className="log-equip-op log-equip-op--none"
                              to="/logistics/owner/operators"
                            >
                              Not assigned · Assign
                            </Link>
                          )}
                        </td>
                        <td>
                          <span
                            className={`log-chip log-chip--${AVAIL_TONE[st] || "closed"}`}
                          >
                            {AVAIL_LABEL[st] || st}
                          </span>
                          {notBookableReason(asset) ? (
                            <span className="log-unit-notbookable">{notBookableReason(asset)}</span>
                          ) : null}
                        </td>
                        <td>
                          <Link
                            className="log-jobs-table__open"
                            to={`/logistics/owner/fleet/${asset._id}`}
                          >
                            View / edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={7} className="logistics-empty">
                        {assets.length
                          ? "No equipment matches your filters."
                          : "No non-logistic equipment yet. Add plant from Fleet → choose a plant category."}
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
                  Page {pageSafe} of {totalPages} · {filtered.length} items
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
