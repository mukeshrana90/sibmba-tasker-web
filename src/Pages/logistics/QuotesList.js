import { Fragment, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import LogisticsCountdown, {
  msLeft,
  useNowTick,
} from "../../CommanComponents/LogisticsCountdown";
import { isEquipmentJob } from "../../utils/jobKind";
import "./logistics.css";
import {
  LogisticsListSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const STATUS_OPTS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const TYPE_OPTS = [
  { value: "", label: "All types" },
  { value: "logistic", label: "Logistic / trucks" },
  { value: "equipment", label: "Equipment / plant" },
];

// Now job = local with an expiry (legacy local rows show as corridor)
function isNowJob(job) {
  return job?.job_class === "local" && Boolean(job?.expires_at);
}

// Countdown only matters while the job is still open and this quote can win
function showsCountdown(row) {
  return (
    isNowJob(row.job) &&
    Number(row.job.status) === 0 &&
    (row.status || "pending") === "pending"
  );
}

function routeLabel(job) {
  if (!job) return "Job";
  const a = placeShortLabel(job.pickup?.address) || "Pickup";
  const b = placeShortLabel(job.dropoff?.address) || "Dropoff";
  return `${a} → ${b}`;
}

// Backend keeps each job's quotes adjacent (grouped + paginated by job)
function groupByJob(rows) {
  const groups = [];
  const byJob = new Map();
  rows.forEach((row) => {
    const key = row.job?._id ? String(row.job._id) : `quote:${row._id}`;
    let group = byJob.get(key);
    if (!group) {
      group = [];
      byJob.set(key, group);
      groups.push(group);
    }
    group.push(row);
  });
  return groups;
}

function formatSubmitted(at) {
  return at ? new Date(at).toLocaleString() : "—";
}

function formatAmount(row) {
  return `${row.amount?.value ?? ""} ${row.amount?.currency || "USD"}`;
}

function QuoteStatus({ row }) {
  const status = row.status || "pending";
  return <span className={`log-chip log-chip--${status}`}>{status}</span>;
}

function JobInfo({ job, isNow }) {
  const plant = isEquipmentJob(job);
  return (
    <>
      <b>{routeLabel(job)}</b>
      <div className="log-hint log-quotes-page__sub">
        {job && !plant ? (
          <span
            className={`log-dash-job__tag${isNow ? " is-now" : " is-corridor"}`}
            title={
              isNow
                ? "Local job — posted for now, auto-cancels if no quote is accepted in time"
                : "Corridor job — scheduled for a date"
            }
          >
            {isNow ? "⚡ LOCAL · NOW" : "CORRIDOR"}
          </span>
        ) : null}
        <span>
          {job?.load_type || "Transport"}
          {job?.hub_category ? ` · ${job.hub_category}` : ""}
        </span>
      </div>
    </>
  );
}

export default function LogisticsQuotesList() {
  const dispatch = useDispatch();
  const location = useLocation();
  const isOwner = location.pathname.startsWith("/logistics/owner");
  const homeTo = isOwner ? "/logistics/owner" : "/logistics/driver";
  const midLabel = isOwner ? "Owner" : "Operator";
  const jobBase = isOwner ? "/logistics/owner/job" : "/logistics/driver/job";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [skewMs, setSkewMs] = useState(0);

  const load = async (pageNum = page) => {
    setLoading(true);
    try {
      const res = await dispatch(
        LogisticsActions.listMyQuotes({
          page: pageNum,
          limit: 12,
          status: status || undefined,
          type: type || undefined,
          from: from || undefined,
          to: to || undefined,
          q: q || undefined,
        })
      );
      const data = res?.payload?.data || {};
      setRows(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total || 0);
      setTotalJobs(data.total_jobs ?? data.total ?? 0);
      setPages(data.pages || 1);
      setPage(data.page || pageNum);
      const serverNow = Date.parse(data.server_now || "");
      if (Number.isFinite(serverNow)) setSkewMs(serverNow - Date.now());
    } finally {
      setLoading(false);
    }
  };

  // Live countdowns for pending quotes on Now jobs
  const hasCountdown = rows.some(showsCountdown);
  const now = useNowTick(hasCountdown);
  const anyExpired = rows.some((row) => {
    if (!showsCountdown(row)) return false;
    const left = msLeft(row.job.expires_at, now, skewMs);
    return left != null && left <= 0;
  });
  // Server auto-cancels expired Now jobs — refetch so the row reflects it
  useEffect(() => {
    if (!anyExpired) return undefined;
    const t = setTimeout(() => load(page), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyExpired]);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, status, type, from, to]);

  return (
    <LogisticsPageShell
      title="Quotes"
      crumbLabel="Quotes"
      midCrumb={{ to: homeTo, label: midLabel }}
      homeTo={homeTo}
    >
      <div className="log-quotes-page">
        {/* <p className="log-op-lead" style={{ marginTop: 0 }}>
          {isOwner
            ? "All quotes submitted for your fleet. Filter by status, type, and date."
            : "Your quotes across jobs. Edit pending ones from the job page; quote again after a rejection."}
        </p> */}

        <form
          className="log-jobs-toolbar log-jobs-toolbar--wrap"
          onSubmit={(e) => {
            e.preventDefault();
            load(1);
          }}
        >
          <label>
            <span className="log-fl">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="log-fl">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTS.map((o) => (
                <option key={o.value || "all-type"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
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
            <LogisticsDateInput value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="log-jobs-toolbar__search">
            <span className="log-fl">Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Route, load, operator…"
            />
          </label>
          <div className="log-jobs-toolbar__actions">
            <button type="submit" className="logistics-cta logistics-cta--primary">
              Apply
            </button>
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={() => {
                setStatus("");
                setType("");
                setFrom("");
                setTo("");
                setQ("");
                setTimeout(() => load(1), 0);
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {loading ? (
          <LogisticsListSkeleton rows={4} label="Loading quotes" />
        ) : (
          <>
            <p className="log-hint">
              {total} quote{total === 1 ? "" : "s"}
              {totalJobs && totalJobs !== total
                ? ` on ${totalJobs} job${totalJobs === 1 ? "" : "s"}`
                : ""}
              {pages > 1 ? ` · page ${page} of ${pages}` : ""}
            </p>
            <div className="log-jobs-table-wrap">
              <table className="log-jobs-table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Route / load</th>
                    <th>Operator</th>
                    <th>Vehicle</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {groupByJob(rows).map((group) => {
                    const job = group[0].job;
                    const jobId = job?._id;
                    const isNow = isNowJob(job);
                    const countdownRow = group.find(showsCountdown);
                    const jobInfo = (
                      <JobInfo job={job} isNow={isNow} />
                    );

                    // One job quoted by one truck — single row as before
                    if (group.length === 1) {
                      const row = group[0];
                      return (
                        <tr
                          key={row._id}
                          className={isNow ? "log-quotes-row--now" : undefined}
                        >
                          <td>{formatSubmitted(row.createdAt)}</td>
                          <td>{jobInfo}</td>
                          <td>{row.driver?.full_name || "—"}</td>
                          <td>{row.asset?.name || "—"}</td>
                          <td>{formatAmount(row)}</td>
                          <td>
                            <div className="log-quotes-page__status">
                              {countdownRow ? (
                                <LogisticsCountdown
                                  expiresAt={job.expires_at}
                                  now={now}
                                  skewMs={skewMs}
                                  compact
                                />
                              ) : null}
                              <QuoteStatus row={row} />
                            </div>
                          </td>
                          <td>
                            {jobId ? (
                              <Link
                                className="log-jobs-table__open"
                                to={`${jobBase}/${jobId}`}
                              >
                                {row.status === "pending" && !isOwner
                                  ? "Edit / view"
                                  : "View job"}
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      );
                    }

                    // Same job quoted by several fleet trucks (owner + operators):
                    // one job header, each quote nested under it
                    return (
                      <Fragment key={`job-${jobId}`}>
                        <tr
                          className={`log-quotes-group__head${
                            isNow ? " log-quotes-row--now" : ""
                          }`}
                        >
                          <td>
                            {job?.job_number ? (
                              <b className="log-quotes-group__num">
                                #{job.job_number}
                              </b>
                            ) : null}
                            <span className="log-quotes-group__count">
                              1 job · {group.length} quotes
                            </span>
                          </td>
                          <td colSpan={4}>
                            {jobInfo}
                            <div className="log-quotes-group__note">
                              {isOwner
                                ? `Same job — your fleet sent ${group.length} quotes on it (different trucks).`
                                : `Same job — you sent ${group.length} quotes on it.`}
                            </div>
                          </td>
                          <td>
                            {countdownRow ? (
                              <LogisticsCountdown
                                expiresAt={job.expires_at}
                                now={now}
                                skewMs={skewMs}
                                compact
                              />
                            ) : null}
                          </td>
                          <td>
                            {jobId ? (
                              <Link
                                className="log-jobs-table__open"
                                to={`${jobBase}/${jobId}`}
                              >
                                View job
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                        {group.map((row, i) => (
                          <tr
                            key={row._id}
                            className={`log-quotes-group__item${
                              isNow ? " log-quotes-row--now" : ""
                            }${i === group.length - 1 ? " is-last" : ""}`}
                          >
                            <td>{formatSubmitted(row.createdAt)}</td>
                            <td className="log-quotes-group__label">
                              ↳ Quote {i + 1} of {group.length}
                            </td>
                            <td>{row.driver?.full_name || "—"}</td>
                            <td>{row.asset?.name || "—"}</td>
                            <td>{formatAmount(row)}</td>
                            <td>
                              <QuoteStatus row={row} />
                            </td>
                            <td>
                              {jobId && row.status === "pending" ? (
                                <Link
                                  className="log-jobs-table__open"
                                  to={`${jobBase}/${jobId}`}
                                >
                                  {isOwner ? "View job" : "Edit / view"}
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={7} className="logistics-empty">
                        No quotes match these filters
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {pages > 1 ? (
              <div className="log-jobs-pager">
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  disabled={page <= 1 || loading}
                  onClick={() => load(page - 1)}
                >
                  Previous
                </button>
                <span className="log-jobs-pager__pages">
                  Page {page} / {pages}
                </span>
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  disabled={page >= pages || loading}
                  onClick={() => load(page + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </LogisticsPageShell>
  );
}
