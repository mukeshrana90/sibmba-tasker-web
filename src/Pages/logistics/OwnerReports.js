import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import "./logistics.css";
import {
  LogisticsListSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";

function routeLabel(job) {
  if (!job) return "Job";
  const a = placeShortLabel(job.pickup?.address) || "Pickup";
  const b = placeShortLabel(job.dropoff?.address) || "Dropoff";
  if (a === b) return a;
  return `${a} → ${b}`;
}

export default function OwnerReports() {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [resolveNotes, setResolveNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await dispatch(
        LogisticsActions.listOwnerReports({
          status: status || undefined,
          page,
          limit: 20,
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not load reports");
        setRows([]);
        return;
      }
      const payload = res?.payload?.data || {};
      setRows(payload.data || []);
      setTotal(payload.total || 0);
      setPages(payload.pages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, status, page]);

  const resolve = async (reportId) => {
    setBusyId(reportId);
    try {
      const res = await dispatch(
        LogisticsActions.resolveJobReport({
          reportId,
          note: resolveNotes[reportId] || "",
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not resolve");
        return;
      }
      toast.success("Report marked resolved");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <LogisticsPageShell
      title="Customer reports"
      crumbLabel="Reports"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <div className="log-form-card log-owner-reports">
        <p className="log-op-lead">
          Issues customers filed on your jobs (behaviour, charges, equipment,
          mishandling, or anything else). Open the job for full detail, fix it,
          then mark resolved — or the customer can resolve it themselves.
        </p>

        <div className="log-quotes-filters" style={{ marginBottom: 16 }}>
          <label className="log-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="">All</option>
            </select>
          </label>
        </div>

        {loading ? (
          <LogisticsListSkeleton rows={4} media={false} label="Loading reports" />
        ) : !rows.length ? (
          <p className="logistics-empty">No reports in this filter</p>
        ) : (
          <ul className="log-owner-reports__list">
            {rows.map((r) => (
              <li key={r._id} className="log-owner-reports__item">
                <div className="log-owner-reports__head">
                  <span
                    className={`log-job-report__badge log-job-report__badge--${r.status}`}
                  >
                    {r.status === "open" ? "Open" : "Resolved"}
                  </span>
                  {r.kind === "suspicious_dropoff" ? (
                    <span className="log-job-report__badge log-job-report__badge--dropoff">
                      Suspicious drop-off
                    </span>
                  ) : null}
                  <time dateTime={r.createdAt}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : ""}
                  </time>
                </div>
                <p className="log-owner-reports__route">
                  {routeLabel(r.job)}
                  {r.job?.job_number ? ` · #${r.job.job_number}` : ""}
                </p>
                <p className="log-owner-reports__customer">
                  Customer:{" "}
                  {r.customer?.company_name ||
                    r.customer?.full_name ||
                    "Customer"}
                </p>
                <p className="log-job-report__msg">{r.message}</p>
                {r.kind === "suspicious_dropoff" ? (
                  <p className="log-job-report__resolve-note">
                    {r.customer_verdict === "no_issue"
                      ? "Customer confirmed no issue."
                      : r.customer_verdict === "issue"
                        ? `Customer reported a problem${r.customer_message ? `: “${r.customer_message}”` : ""}. Sent to admin.`
                        : r.escalated_at
                          ? "No answer from the customer — sent to admin."
                          : "Waiting for the customer to confirm."}
                  </p>
                ) : null}
                {r.status === "resolved" && r.resolve_note ? (
                  <p className="log-job-report__resolve-note">
                    Resolve note ({r.resolved_by_role}): {r.resolve_note}
                  </p>
                ) : null}
                <div className="log-owner-reports__actions">
                  <Link
                    className="logistics-cta"
                    to={`/logistics/owner/job/${r.job_id}`}
                  >
                    View job
                  </Link>
                  {r.status === "open" ? (
                    <>
                      <input
                        type="text"
                        className="log-field-input"
                        placeholder="Optional resolve note"
                        value={resolveNotes[r._id] || ""}
                        onChange={(e) =>
                          setResolveNotes((prev) => ({
                            ...prev,
                            [r._id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="logistics-cta logistics-cta--primary"
                        disabled={busyId === r._id}
                        onClick={() => resolve(r._id)}
                      >
                        {busyId === r._id ? "Saving…" : "Mark resolved"}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <div className="log-quotes-pager">
            <button
              type="button"
              className="logistics-cta"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {pages} · {total} total
            </span>
            <button
              type="button"
              className="logistics-cta"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </LogisticsPageShell>
  );
}
