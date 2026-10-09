import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import { isEquipmentJob, jobCategoryKey, jobKindTypeChip } from "../../utils/jobKind";
import {
  JobCategoryBadge,
  JobCategorySelect,
} from "../../CommanComponents/LogisticsJobCategory";
import LogisticsCountdown, {
  msLeft,
  useNowTick,
} from "../../CommanComponents/LogisticsCountdown";
import "./logistics.css";
import {
  LogisticsSkeletonMeta,
  LogisticsTableSkeletonRows,
} from "../../CommanComponents/LogisticsSkeleton";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const PAGE_SIZE = 10;

// Job Opportunities tabs — local = "Now" jobs (expiry window from server .env), corridor = dated
const CLASS_TABS = [
  { value: "all", label: "All" },
  { value: "local", label: "⚡ Local (Now)" },
  { value: "corridor", label: "Corridor" },
];

const STATUS_LABEL = {
  0: "Pending quotes",
  1: "Accepted",
  2: "Collect",
  3: "Loaded",
  4: "Transit",
  5: "Done",
  6: "Cancelled",
  7: "Rejected",
};

function routeLabel(job) {
  if (isEquipmentJob(job)) {
    return placeShortLabel(job?.pickup?.address) || "Work site";
  }
  const pickup = placeShortLabel(job?.pickup?.address) || "Pickup";
  const dropoff = placeShortLabel(job?.dropoff?.address) || "Dropoff";
  return `${pickup} → ${dropoff}`;
}

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short display id shared by every job in a multi-transit run (UI only). */
function transitDisplayId(runId) {
  if (!runId) return "";
  return `MT-${String(runId).slice(-6).toUpperCase()}`;
}

function jobMatchesLocalFilters(job, applied) {
  if (applied.status !== "all" && Number(job.status) !== Number(applied.status)) {
    return false;
  }
  if (applied.category && applied.category !== "all" && jobCategoryKey(job) !== applied.category) {
    return false;
  }
  if (applied.q) {
    const q = applied.q.toLowerCase();
    const hay = [
      job.job_number,
      job.load_type,
      job.pickup?.address,
      job.dropoff?.address,
      job.special_notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (applied.from || applied.to) {
    const when = new Date(job.updatedAt || job.createdAt);
    if (Number.isNaN(when.getTime())) return false;
    if (applied.from) {
      const start = new Date(applied.from);
      start.setHours(0, 0, 0, 0);
      if (when < start) return false;
    }
    if (applied.to) {
      const end = new Date(applied.to);
      end.setHours(23, 59, 59, 999);
      if (when > end) return false;
    }
  }
  return true;
}

function formatMoney(job) {
  const amount =
    job?.assigned?.amount?.amount ??
    job?.assigned?.amount?.value ??
    job?.budget?.amount;
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const currency =
    job?.assigned?.amount?.currency || job?.budget?.currency || "USD";
  const rate =
    job?.budget?.rate_unit === "hour"
      ? " / hour"
      : job?.budget?.rate_unit === "day"
        ? " / day"
        : "";
  return `${currency} ${n.toLocaleString()}${rate}`;
}

function statusTone(status) {
  const n = Number(status);
  if (n === 0) return "pending";
  // Accepted → Transit: yellow
  if (n >= 1 && n <= 4) return "progress";
  if (n === 5) return "done";
  if (n === 6 || n === 7) return "closed";
  return "pending";
}

function formatDay(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWeight(job) {
  if (job?.load_weight?.value == null) return null;
  const unit = job.load_weight.unit === "kg" ? "kg" : "t";
  return `${job.load_weight.value}${unit}`;
}

/** Shared Job Opportunities table (owner + operator). */
function SupplyOpportunitiesPage({ midLabel, homeTo, jobBasePath, ownerView = false }) {
  const dispatch = useDispatch();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("all");
  const [applied, setApplied] = useState({ q: "", from: "", to: "", category: "all" });
  const [jobClass, setJobClass] = useState("all");
  const [counts, setCounts] = useState(null);
  const [skewMs, setSkewMs] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const showPagination = total > PAGE_SIZE;
  const hasFilters = Boolean(
    applied.q || applied.from || applied.to || applied.category !== "all"
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const params = { page, limit: PAGE_SIZE, job_class: jobClass };
        if (applied.q) params.q = applied.q;
        if (applied.from) params.from = applied.from;
        if (applied.to) params.to = applied.to;
        if (applied.category !== "all") params.category = applied.category;
        const res = await dispatch(LogisticsActions.availableWork(params));
        if (!alive) return;
        const nextJobs = res?.payload?.data?.data || [];
        const nextTotal = Number(res?.payload?.data?.total) || 0;
        setJobs(nextJobs);
        setTotal(nextTotal);
        setCounts(res?.payload?.data?.counts || null);
        const serverNow = Date.parse(res?.payload?.data?.server_now || "");
        if (Number.isFinite(serverNow)) setSkewMs(serverNow - Date.now());
        // Keep sidebar badge in sync when browsing unfiltered opportunities
        if (!params.q && !params.from && !params.to && !params.category) {
          window.dispatchEvent(
            new CustomEvent("simba:logistics_opportunities_refresh")
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dispatch, page, applied, jobClass, reloadKey]);

  // Live countdowns for Now jobs; refetch when one expires (server drops it)
  const hasCountdown = jobs.some((j) => j.job_class === "local" && j.expires_at);
  const now = useNowTick(hasCountdown);
  const anyExpired = jobs.some((j) => {
    const left = j.job_class === "local" ? msLeft(j.expires_at, now, skewMs) : null;
    return left != null && left <= 0;
  });
  useEffect(() => {
    if (!anyExpired) return undefined;
    const t = setTimeout(() => setReloadKey((k) => k + 1), 3000);
    return () => clearTimeout(t);
  }, [anyExpired]);

  // New job pushes (e.g. a Now job nearby) refresh the list
  useEffect(() => {
    const onNotif = (evt) => {
      if (evt?.detail?.type === "logistics_job_alert") {
        setReloadKey((k) => k + 1);
      }
    };
    window.addEventListener("simba:logistics_notification", onNotif);
    return () =>
      window.removeEventListener("simba:logistics_notification", onNotif);
  }, []);
  const applyFilters = (e) => {
    e?.preventDefault?.();
    if (from && to && new Date(to) < new Date(from)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setPage(1);
    setApplied({ q: q.trim(), from, to, category });
  };

  const clearFilters = () => {
    setQ("");
    setFrom("");
    setTo("");
    setCategory("all");
    setPage(1);
    setApplied({ q: "", from: "", to: "", category: "all" });
  };

  return (
    <LogisticsPageShell
      title="Job Opportunities"
      crumbLabel="Opportunities"
      midCrumb={{ to: homeTo, label: midLabel }}
      homeTo={homeTo}
    >
      {/* <p className="log-op-lead">
        Open loads you can quote on. Newest posts first — budget is a guide unless
        marked fixed.
      </p> */}
      {ownerView ? (
        <p className="log-op-lead">
          Open jobs your fleet can serve. Your operators quote and run them —
          make sure each unit has an operator assigned and live.
        </p>
      ) : null}

      <form className="log-jobs-toolbar" onSubmit={applyFilters}>
        <label className="log-jobs-toolbar__search">
          <span className="log-fl">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Load, pickup, or delivery…"
            aria-label="Search opportunities"
          />
        </label>
        <JobCategorySelect
          value={category}
          onChange={setCategory}
          appliedValue={applied.category}
        />
        <label className="log-jobs-toolbar__date">
          <span className="log-fl">Posted from</span>
          <LogisticsDateInput
            className="log-date-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="log-jobs-toolbar__date">
          <span className="log-fl">Posted to</span>
          <LogisticsDateInput
            className="log-date-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="log-jobs-toolbar__actions">
          <button type="submit" className="logistics-cta logistics-cta--primary">
            Apply
          </button>
          {hasFilters || q || from || to || category !== "all" ? (
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={clearFilters}
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="log-class-tabs" role="tablist" aria-label="Job type">
        {CLASS_TABS.map((tab) => {
          const n = counts?.[tab.value];
          const on = jobClass === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={on}
              className={`log-class-tabs__tab log-class-tabs__tab--${tab.value}${
                on ? " is-active" : ""
              }`}
              onClick={() => {
                setJobClass(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
              {n != null ? <span className="log-class-tabs__count">{n}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="log-jobs-meta">
        {loading
          ? <LogisticsSkeletonMeta w={240} />
          : total
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                page * PAGE_SIZE,
                total
              )} of ${total} · ${
                jobClass === "corridor"
                  ? "newest first"
                  : "Now jobs first (soonest to expire), then newest"
              }`
            : hasFilters
              ? "No opportunities match these filters"
              : "No open opportunities right now"}
      </div>

      <div className="log-jobs-table-wrap log-opp-table-wrap">
        <table className="log-jobs-table log-opp-table">
          <thead>
            <tr>
              <th>Posted</th>
              <th>Job</th>
              <th>Route</th>
              <th>When needed</th>
              <th>Budget</th>
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {loading && !jobs.length ? <LogisticsTableSkeletonRows cols={6} /> : null}
            {jobs.map((job) => {
              const weight = formatWeight(job);
              const isReturn = Boolean(job.return_trip?.goods);
              const kindChip = jobKindTypeChip(job);
              // Now job = local with an expiry (legacy local rows show as corridor)
              const isNow = job.job_class === "local" && Boolean(job.expires_at);
              return (
                <tr key={job._id} className={isNow ? "log-opp-row--now" : undefined}>
                  <td className="log-opp-table__posted">
                    {formatWhen(job.createdAt)}
                    {job.priority ? (
                      <span className="log-chip">Priority</span>
                    ) : null}
                  </td>
                  <td>
                    <Link
                      className="log-jobs-table__link"
                      to={`${jobBasePath}/${job._id}`}
                    >
                      {job.load_type || "Transport job"}
                    </Link>
                    <div className="log-opp-table__sub">
                      <span
                        className={kindChip.className}
                        title={kindChip.title}
                      >
                        {kindChip.label}
                      </span>
                      <span
                        className={`log-dash-job__tag${
                          isReturn ? " is-return" : isNow ? " is-now" : " is-corridor"
                        }`}
                      >
                        {isReturn ? "RETURN" : isNow ? "⚡ LOCAL · NOW" : "CORRIDOR"}
                      </span>
                      {weight ? <span>{weight}</span> : null}
                      {job.budget?.negotiable === false ? (
                        <span className="log-chip log-chip--muted">fixed</span>
                      ) : job.budget?.amount != null ? (
                        <span className="log-chip log-chip--negotiable">
                          negotiable
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{routeLabel(job)}</td>
                  <td>
                    {isNow && job.expires_at ? (
                      <LogisticsCountdown
                        expiresAt={job.expires_at}
                        now={now}
                        skewMs={skewMs}
                      />
                    ) : (
                      formatDay(job.when_needed)
                    )}
                  </td>
                  <td className="log-opp-table__budget">{formatMoney(job)}</td>
                  <td className="log-opp-table__open">
                    <JobCategoryBadge job={job} compact />
                    <Link
                      className={`logistics-cta logistics-cta--primary log-opp-table__cta${
                        isNow ? " log-opp-table__cta--now" : ""
                      }`}
                      to={`${jobBasePath}/${job._id}`}
                    >
                      {isNow && !ownerView ? "Quote now" : "View"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!loading && !jobs.length ? (
              <tr>
                <td colSpan={6} className="logistics-empty">
                  {hasFilters
                    ? "No opportunities in this date / search range"
                    : jobClass === "local"
                      ? "No Now (local) jobs right now — nearby ones will appear here with a countdown."
                      : "No open opportunities right now"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="log-jobs-pager" role="navigation" aria-label="Pages">
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </LogisticsPageShell>
  );
}

/** Owner: open loads near the fleet (view only — operators quote). */
export function LogisticsOwnerOpportunities() {
  return (
    <SupplyOpportunitiesPage
      midLabel="Owner"
      homeTo="/logistics/owner"
      jobBasePath="/logistics/owner/job"
      ownerView
    />
  );
}

/** Operator: open loads to quote. */
export function LogisticsOperatorOpportunities() {
  return (
    <SupplyOpportunitiesPage
      midLabel="Operator"
      homeTo="/logistics/driver"
      jobBasePath="/logistics/driver/job"
    />
  );
}

function SupplyMyJobsTable({
  title,
  midLabel,
  homeTo,
  jobBasePath,
  emptyHint,
  enableMultiTransit = false,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  /** all = normal assigned list; multi = only jobs in active multi-transits */
  const [runScope, setRunScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [applied, setApplied] = useState({
    q: "",
    status: "all",
    category: "all",
    from: "",
    to: "",
    runScope: "all",
  });
  const [selected, setSelected] = useState([]);
  const [multiRuns, setMultiRuns] = useState([]);
  const [creating, setCreating] = useState(false);

  const loadMulti = async () => {
    if (!enableMultiTransit) return;
    const res = await dispatch(
      LogisticsActions.listMultiTransits({ status: "active" })
    );
    const rows = res?.payload?.data?.data || [];
    // Client guard: only runs with ≥1 open job (Accepted→Transit)
    setMultiRuns(
      rows.filter((run) =>
        (run.jobs || []).some((j) => {
          const s = Number(j?.status);
          return s >= 1 && s <= 4;
        })
      )
    );
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        await loadMulti();
        if (applied.runScope === "multi" && enableMultiTransit) {
          if (!alive) return;
          setJobs([]);
          setTotal(0);
          return;
        }
        const params = {
          active: 0,
          page,
          limit: PAGE_SIZE,
        };
        if (applied.q) params.q = applied.q;
        if (applied.from) params.from = applied.from;
        if (applied.to) params.to = applied.to;
        if (applied.status !== "all") params.status = applied.status;
        if (applied.category !== "all") params.category = applied.category;
        const res = await dispatch(LogisticsActions.listAssignedJobs(params));
        if (!alive) return;
        setJobs(res?.payload?.data?.data || []);
        setTotal(Number(res?.payload?.data?.total) || 0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, page, applied, enableMultiTransit]);

  const jobInMulti = useMemo(() => {
    const map = new Map();
    multiRuns.forEach((run) => {
      (run.job_ids || []).forEach((jid) => {
        map.set(String(jid), run);
      });
    });
    return map;
  }, [multiRuns]);

  const multiJobsFlat = useMemo(() => {
    const rows = [];
    multiRuns.forEach((run) => {
      const tid = transitDisplayId(run._id);
      (run.jobs || []).forEach((job) => {
        if (!job) return;
        rows.push({ ...job, _multiRunId: String(run._id), _transitId: tid });
      });
    });
    rows.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0)
    );
    return rows;
  }, [multiRuns]);

  const multiFiltered = useMemo(() => {
    if (applied.runScope !== "multi") return [];
    return multiJobsFlat.filter((j) => jobMatchesLocalFilters(j, applied));
  }, [multiJobsFlat, applied]);

  const multiPageJobs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return multiFiltered.slice(start, start + PAGE_SIZE);
  }, [multiFiltered, page]);

  const showingMulti = enableMultiTransit && applied.runScope === "multi";
  const tableJobs = showingMulti ? multiPageJobs : jobs;
  const tableTotal = showingMulti ? multiFiltered.length : total;

  const acceptedSelectable = (showingMulti ? [] : jobs).filter(
    (j) => Number(j.status) === 1 && !jobInMulti.has(String(j._id))
  );

  const totalPages = Math.max(1, Math.ceil(tableTotal / PAGE_SIZE));
  const showPagination = tableTotal > PAGE_SIZE;
  const hasFilters = Boolean(
    applied.q ||
      applied.from ||
      applied.to ||
      applied.status !== "all" ||
      applied.category !== "all" ||
      applied.runScope !== "all"
  );

  const applyFilters = (e) => {
    e?.preventDefault?.();
    if (from && to && new Date(to) < new Date(from)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setPage(1);
    setApplied({
      q: q.trim(),
      status,
      category,
      from,
      to,
      runScope: enableMultiTransit ? runScope : "all",
    });
  };

  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setFrom("");
    setTo("");
    setRunScope("all");
    setCategory("all");
    setPage(1);
    setApplied({
      q: "",
      status: "all",
      category: "all",
      from: "",
      to: "",
      runScope: "all",
    });
  };

  const toggleSelect = (jobId) => {
    setSelected((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    );
  };

  const createMulti = async () => {
    if (selected.length < 2) {
      toast.error("Select at least 2 Accepted jobs");
      return;
    }
    setCreating(true);
    try {
      const res = await dispatch(
        LogisticsActions.createMultiTransit({ job_ids: selected })
      );
      if (res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not create multi-transit");
        return;
      }
      const id = res?.payload?.data?._id;
      toast.success("Multi-transit created");
      setSelected([]);
      if (id) {
        navigate(`/logistics/driver/multi-transit/${id}`);
        return;
      }
      await loadMulti();
    } finally {
      setCreating(false);
    }
  };

  const openJobOrMulti = (job) => {
    const run =
      job._multiRunId
        ? { _id: job._multiRunId }
        : jobInMulti.get(String(job._id));
    if (showingMulti && run?._id) {
      navigate(`/logistics/driver/multi-transit/${run._id}`);
      return;
    }
    navigate(`${jobBasePath}/${job._id}`);
  };

  return (
    <LogisticsPageShell
      title={title}
      crumbLabel="My Jobs"
      midCrumb={{ to: homeTo, label: midLabel }}
      homeTo={homeTo}
    >
      {enableMultiTransit ? (
        <p className="log-op-lead" style={{ marginTop: 0 }}>
          Select <strong>2+ Accepted</strong> jobs to start a{" "}
          <strong>multi-transit</strong> — one map for all pickups &amp;
          dropoffs. Use the <strong>Run</strong> filter to list only multi-transit
          jobs (click a row to open map mode). Each run shows a shared transit
          id (e.g. MT-A1B2C3).
        </p>
      ) : null}

      <form
        className="log-jobs-toolbar log-jobs-toolbar--wrap"
        onSubmit={applyFilters}
      >
        <label className="log-jobs-toolbar__search">
          <span className="log-fl">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Job no., load, pickup, or delivery…"
            aria-label="Search my jobs"
          />
        </label>
        {enableMultiTransit ? (
          <label>
            <span className="log-fl">Run</span>
            <select
              value={runScope}
              onChange={(e) => setRunScope(e.target.value)}
              aria-label="Filter by run type"
            >
              <option value="all">All</option>
              <option value="multi">Multi transit</option>
            </select>
          </label>
        ) : null}
        <label>
          <span className="log-fl">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="1">Accepted</option>
            <option value="2">Collect</option>
            <option value="3">Loaded</option>
            <option value="4">Transit</option>
            <option value="5">Done</option>
            <option value="6">Cancelled</option>
            <option value="7">Rejected</option>
          </select>
        </label>
        <JobCategorySelect
          value={category}
          onChange={setCategory}
          appliedValue={applied.category}
        />
        <label className="log-jobs-toolbar__date">
          <span className="log-fl">Updated from</span>
          <LogisticsDateInput
            className="log-date-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="log-jobs-toolbar__date">
          <span className="log-fl">Updated to</span>
          <LogisticsDateInput
            className="log-date-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="log-jobs-toolbar__actions">
          <button type="submit" className="logistics-cta logistics-cta--primary">
            Apply
          </button>
          {hasFilters ||
          q ||
          from ||
          to ||
          status !== "all" ||
          category !== "all" ||
          runScope !== "all" ? (
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={clearFilters}
            >
              Clear
            </button>
          ) : null}
          {enableMultiTransit && !showingMulti ? (
            <button
              type="button"
              className="logistics-cta logistics-cta--primary"
              disabled={selected.length < 2 || creating}
              onClick={createMulti}
            >
              {creating
                ? "Creating…"
                : `Start multi-transit (${selected.length})`}
            </button>
          ) : null}
        </div>
      </form>

      <div className="log-jobs-meta">
        {loading
          ? <LogisticsSkeletonMeta w={220} />
          : tableTotal
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                page * PAGE_SIZE,
                tableTotal
              )} of ${tableTotal} job${tableTotal === 1 ? "" : "s"}${
                showingMulti ? " in multi-transit" : ""
              } · newest first`
            : hasFilters
              ? "No jobs match these filters"
              : "No jobs yet"}
        {enableMultiTransit && !showingMulti && acceptedSelectable.length
          ? ` · ${acceptedSelectable.length} Accepted available for multi-transit`
          : null}
      </div>

      <div className="log-jobs-table-wrap">
        <table className="log-jobs-table">
          <thead>
            <tr>
              {enableMultiTransit && !showingMulti ? (
                <th aria-label="Select" />
              ) : null}
              {enableMultiTransit ? <th>Transit</th> : null}
              <th>Job</th>
              <th>Route</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Updated</th>
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {loading && !tableJobs.length ? (
              <LogisticsTableSkeletonRows
                cols={enableMultiTransit ? (showingMulti ? 7 : 8) : 6}
              />
            ) : null}
            {tableJobs.map((job) => {
              const statusLabel =
                STATUS_LABEL[job.status] ?? `Status ${job.status}`;
              const run =
                job._multiRunId
                  ? { _id: job._multiRunId }
                  : jobInMulti.get(String(job._id));
              const transitId =
                job._transitId ||
                (run?._id ? transitDisplayId(run._id) : "");
              const canSelect =
                enableMultiTransit &&
                !showingMulti &&
                Number(job.status) === 1 &&
                !run;
              const openHref = showingMulti && run?._id
                ? `/logistics/driver/multi-transit/${run._id}`
                : `${jobBasePath}/${job._id}`;
              return (
                <tr
                  key={`${job._id}-${transitId || "solo"}`}
                  className={
                    showingMulti ? "log-jobs-table__row--clickable" : undefined
                  }
                  onClick={
                    showingMulti
                      ? () => openJobOrMulti(job)
                      : undefined
                  }
                >
                  {enableMultiTransit && !showingMulti ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={selected.includes(String(job._id))}
                          onChange={() => toggleSelect(String(job._id))}
                          aria-label={`Select ${job.job_number || job._id}`}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  {enableMultiTransit ? (
                    <td onClick={(e) => e.stopPropagation()}>
                      {transitId && run?._id ? (
                        <Link
                          className="log-chip log-chip--pending log-mt-transit-link"
                          to={`/logistics/driver/multi-transit/${run._id}`}
                          title="Open multi-transit map"
                        >
                          {transitId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                  <td>
                    {showingMulti ? (
                      <span className="log-jobs-table__link">
                        {job.load_type || "Transport job"}
                      </span>
                    ) : (
                      <Link
                        className="log-jobs-table__link"
                        to={`${jobBasePath}/${job._id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {job.load_type || "Transport job"}
                      </Link>
                    )}
                    {job.job_number ? (
                      <div className="log-hint">{job.job_number}</div>
                    ) : null}
                  </td>
                  <td>{routeLabel(job)}</td>
                  <td>
                    <span
                      className={`log-chip log-chip--${statusTone(job.status)}`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td>{formatMoney(job)}</td>
                  <td>{formatWhen(job.updatedAt || job.createdAt)}</td>
                  <td className="log-opp-table__open" onClick={(e) => e.stopPropagation()}>
                    <JobCategoryBadge job={job} compact />
                    <Link
                      className="log-jobs-table__open"
                      to={openHref}
                      aria-label={
                        showingMulti ? "Open multi-transit" : "Open job"
                      }
                    >
                      ›
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!loading && !tableJobs.length ? (
              <tr>
                <td
                  colSpan={
                    enableMultiTransit
                      ? showingMulti
                        ? 7
                        : 8
                      : 6
                  }
                  className="logistics-empty"
                >
                  {hasFilters ? "No jobs match these filters" : emptyHint}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="log-jobs-pager" role="navigation" aria-label="Pages">
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </LogisticsPageShell>
  );
}

/** Operator: assigned / my jobs list (table, newest first). */
export function LogisticsOperatorMyJobs() {
  return (
    <SupplyMyJobsTable
      title="My Jobs"
      midLabel="Operator"
      homeTo="/logistics/driver"
      jobBasePath="/logistics/driver/job"
      enableMultiTransit
      emptyHint={
        <>
          No jobs assigned yet. Check{" "}
          <Link to="/logistics/driver/work">Job Opportunities</Link>.
        </>
      }
    />
  );
}

/** Owner: fleet assigned jobs (table, newest first). */
export function LogisticsOwnerMyJobs() {
  return (
    <SupplyMyJobsTable
      title="My Jobs"
      midLabel="Owner"
      homeTo="/logistics/owner"
      jobBasePath="/logistics/owner/job"
      emptyHint={
        <>
          No assigned jobs yet. Jobs appear here once a customer accepts one
          of your operators&apos; quotes — see{" "}
          <Link to="/logistics/owner/opportunities">Job Opportunities</Link>.
        </>
      }
    />
  );
}
