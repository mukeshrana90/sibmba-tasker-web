import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import "./logistics.css";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const PAGE_SIZE = 10;

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount, currency = "USD") {
  if (amount == null || amount === "") return "—";
  return `${currency} ${Number(amount).toLocaleString()}`;
}

export default function LogisticsOwnerEarnings() {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ q: "", from: "", to: "" });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const showPagination = total > PAGE_SIZE;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const params = { page, limit: PAGE_SIZE };
        if (applied.q) params.q = applied.q;
        if (applied.from) params.from = applied.from;
        if (applied.to) params.to = applied.to;
        const res = await dispatch(LogisticsActions.driverEarnings(params));
        const data = res?.payload?.data || {};
        if (!alive) return;
        setRows(Array.isArray(data.data) ? data.data : []);
        setDrivers(Array.isArray(data.drivers) ? data.drivers : []);
        setSummary(data.summary || null);
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

  return (
    <LogisticsPageShell
      title="Earnings"
      crumbLabel="Earnings"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <div className="log-earnings-page">
        {/* <p className="log-op-lead" style={{ marginTop: 0 }}>
          Job totals from completed deliveries. <strong>My earning</strong> is
          your share after the operator pay snapshot frozen on each job
          (percentage / fixed / monthly). Changing an operator’s pay later does
          not rewrite past jobs. Monthly-fixed operators show 0 job earning
          (salary handled manually).
        </p> */}

        <div className="logistics-stats">
          <div>
            <strong>{summary?.jobs_completed ?? 0}</strong>
            <span>Completed jobs</span>
          </div>
          <div>
            <strong>
              {formatMoney(summary?.amount ?? 0, summary?.currency || "USD")}
            </strong>
            <span>Job totals</span>
          </div>
          <div>
            <strong>
              {formatMoney(
                summary?.my_earning ?? summary?.owner_earning ?? 0,
                summary?.currency || "USD"
              )}
            </strong>
            <span>My earning</span>
          </div>
          <div>
            <strong>
              {formatMoney(
                summary?.operator_earning ?? 0,
                summary?.currency || "USD"
              )}
            </strong>
            <span>Operator share</span>
          </div>
        </div>

        <form className="log-jobs-toolbar log-jobs-toolbar--wrap" onSubmit={applyFilters}>
          <label className="log-jobs-toolbar__search">
            <span className="visually-hidden">Search</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Job number, route, operator, vehicle…"
            />
          </label>
          <label>
            <span>From</span>
            <LogisticsDateInput
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            <span>To</span>
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

        {drivers.length > 0 ? (
          <div className="log-jobs-table-wrap" style={{ marginBottom: 16 }}>
            <table className="log-jobs-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Jobs</th>
                  <th>Job total</th>
                  <th>Operator share</th>
                  <th>My earning</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.sub_user_id || d.full_name}>
                    <td>{d.full_name || "Operator"}</td>
                    <td>{d.jobs_completed ?? 0}</td>
                    <td>
                      {formatMoney(d.total?.amount, d.total?.currency)}
                    </td>
                    <td>
                      {formatMoney(
                        d.operator_earning?.amount,
                        d.operator_earning?.currency || d.total?.currency
                      )}
                    </td>
                    <td>
                      {formatMoney(
                        d.owner_earning?.amount,
                        d.owner_earning?.currency || d.total?.currency
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <h2 className="log-sect">Completed jobs</h2>
        {loading ? (
          <p className="logistics-empty">Loading earnings…</p>
        ) : (
          <>
            <div className="log-jobs-table-wrap">
              <table className="log-jobs-table">
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Completed</th>
                    <th>Route</th>
                    <th>Operator</th>
                    <th>Vehicle</th>
                    <th>Job total</th>
                    <th>Pay</th>
                    <th>Operator</th>
                    <th>My earning</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.job_id}>
                      <td>
                        <b>{row.job_number || "—"}</b>
                      </td>
                      <td>{formatWhen(row.completed_at)}</td>
                      <td>
                        <b>{row.load_type || "Job"}</b>
                        <div className="log-hint">{row.route || "—"}</div>
                      </td>
                      <td>{row.driver?.full_name || "Owner operated"}</td>
                      <td>
                        {row.asset?.name || "—"}
                        {row.asset?.registration
                          ? ` · ${row.asset.registration}`
                          : ""}
                      </td>
                      <td>
                        {formatMoney(row.amount?.amount, row.amount?.currency)}
                        {row.paid ? (
                          <span className="log-chip log-chip--done">paid</span>
                        ) : (
                          <span className="log-chip log-chip--muted">
                            assigned
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="log-hint">{row.pay_label || "—"}</span>
                      </td>
                      <td>
                        {formatMoney(
                          row.operator_earning?.amount,
                          row.operator_earning?.currency || row.amount?.currency
                        )}
                      </td>
                      <td>
                        <b>
                          {formatMoney(
                            row.my_earning?.amount ??
                              row.owner_earning?.amount,
                            row.my_earning?.currency || row.amount?.currency
                          )}
                        </b>
                      </td>
                      <td>
                        <Link
                          className="log-jobs-table__open"
                          to={`/logistics/owner/job/${row.job_id}`}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={10} className="logistics-empty">
                        No completed jobs in this range
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {showPagination ? (
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
                  Page {page} of {totalPages}
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
    </LogisticsPageShell>
  );
}
