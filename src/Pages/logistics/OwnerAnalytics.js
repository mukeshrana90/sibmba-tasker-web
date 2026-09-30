import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import "./logistics.css";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

function formatMoney(amount, currency = "USD") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString()}`;
}

function BarChart({ rows, valueKey = "value", labelKey = "month", height = 160 }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  if (!rows.length) {
    return <p className="logistics-empty">No data yet</p>;
  }
  return (
    <div className="log-chart" style={{ height }}>
      {rows.map((row) => {
        const v = Number(row[valueKey]) || 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div key={row[labelKey]} className="log-chart__col" title={`${row[labelKey]}: ${v}`}>
            <div className="log-chart__bar-wrap">
              <div className="log-chart__bar" style={{ height: `${pct}%` }} />
            </div>
            <span className="log-chart__label">{String(row[labelKey]).slice(5) || row[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function RankList({ title, items }) {
  return (
    <section className="log-analytics-card">
      <h3>{title}</h3>
      {!items?.length ? (
        <p className="logistics-empty">No data yet</p>
      ) : (
        <ol className="log-analytics-rank">
          {items.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <b>{item.count}</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function LogisticsOwnerAnalytics() {
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const params = {};
        if (applied.from) params.from = applied.from;
        if (applied.to) params.to = applied.to;
        const res = await dispatch(LogisticsActions.analytics(params));
        if (alive) setData(res?.payload?.data || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dispatch, applied]);

  const summary = data?.summary || {};
  const earningsSeries = useMemo(
    () =>
      (data?.earnings_series || []).map((r) => ({
        month: r.month,
        value: r.amount,
      })),
    [data]
  );
  const jobsSeries = data?.jobs_series || [];
  const reviewBars = useMemo(() => {
    const dist = data?.reviews?.distribution || {};
    return [1, 2, 3, 4, 5].map((n) => ({
      month: `${n}★`,
      value: dist[n] || 0,
    }));
  }, [data]);

  return (
    <LogisticsPageShell
      title="Analytics"
      crumbLabel="Analytics"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <div className="log-analytics-page">
        {/* <p className="log-op-lead" style={{ marginTop: 0 }}>
          Fleet performance across logistics and equipment: earnings, win rate,
          cycle time, demand hotspots, and missed market opportunities.
        </p> */}

        <form
          className="log-jobs-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({ from, to });
          }}
        >
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
              Apply range
            </button>
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={() => {
                setFrom("");
                setTo("");
                setApplied({ from: "", to: "" });
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {loading ? (
          <p className="logistics-empty">Loading analytics…</p>
        ) : (
          <>
            <div className="logistics-stats log-analytics-stats">
              <div>
                <strong>
                  {formatMoney(
                    summary.earnings?.amount,
                    summary.earnings?.currency
                  )}
                </strong>
                <span>Fleet earnings</span>
              </div>
              <div>
                <strong>{summary.delivered ?? 0}</strong>
                <span>Delivered</span>
              </div>
              <div>
                <strong>{summary.win_rate_pct ?? 0}%</strong>
                <span>Quote win rate</span>
              </div>
              <div>
                <strong>
                  {summary.avg_cycle_hours != null
                    ? `${summary.avg_cycle_hours}h`
                    : "—"}
                </strong>
                <span>Avg cycle time</span>
              </div>
              <div>
                <strong>{summary.missed_opportunities ?? 0}</strong>
                <span>Missed open jobs</span>
              </div>
              <div>
                <strong>{summary.quotes_total ?? 0}</strong>
                <span>Quotes submitted</span>
              </div>
            </div>

            <div className="log-analytics-grid">
              <section className="log-analytics-card">
                <h3>Earnings by month</h3>
                <BarChart rows={earningsSeries} />
              </section>
              <section className="log-analytics-card">
                <h3>Jobs created by month</h3>
                <BarChart rows={jobsSeries} />
              </section>

              <section className="log-analytics-card">
                <h3>Job status mix</h3>
                <ul className="log-analytics-kv">
                  {Object.entries(data?.status_breakdown || {}).map(
                    ([k, v]) => (
                      <li key={k}>
                        <span>{k}</span>
                        <b>{v}</b>
                      </li>
                    )
                  )}
                </ul>
              </section>

              <section className="log-analytics-card">
                <h3>Quote funnel</h3>
                <ul className="log-analytics-kv">
                  {Object.entries(data?.quote_breakdown || {}).map(([k, v]) => (
                    <li key={k}>
                      <span>{k}</span>
                      <b>{v}</b>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="log-analytics-card">
                <h3>Logistics vs equipment</h3>
                <div className="log-jobs-table-wrap">
                  <table className="log-jobs-table">
                    <thead>
                      <tr>
                        <th>Vertical</th>
                        <th>Delivered</th>
                        <th>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Logistic / trucks</td>
                        <td>{data?.combinations?.logistic_jobs ?? 0}</td>
                        <td>
                          {formatMoney(
                            data?.combinations?.logistic_earnings,
                            summary.earnings?.currency
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Equipment / plant</td>
                        <td>{data?.combinations?.equipment_jobs ?? 0}</td>
                        <td>
                          {formatMoney(
                            data?.combinations?.equipment_earnings,
                            summary.earnings?.currency
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="log-analytics-card">
                <h3>Fleet readiness</h3>
                <ul className="log-analytics-kv">
                  <li>
                    <span>Vehicles</span>
                    <b>{data?.fleet?.vehicles ?? 0}</b>
                  </li>
                  <li>
                    <span>Equipment</span>
                    <b>{data?.fleet?.equipment ?? 0}</b>
                  </li>
                  <li>
                    <span>Available now</span>
                    <b>{data?.fleet?.availability?.available_now ?? 0}</b>
                  </li>
                  <li>
                    <span>On job</span>
                    <b>{data?.fleet?.availability?.on_job ?? 0}</b>
                  </li>
                  <li>
                    <span>Offline</span>
                    <b>{data?.fleet?.availability?.offline ?? 0}</b>
                  </li>
                  <li>
                    <span>Avg asset rating</span>
                    <b>{data?.fleet?.avg_rating ?? 0}</b>
                  </li>
                </ul>
              </section>

              <RankList
                title="Pickup hotspots"
                items={data?.hotspots?.pickups}
              />
              <RankList
                title="Drop-off hotspots"
                items={data?.hotspots?.dropoffs}
              />
              <RankList
                title="Bad locations (cancel / reject)"
                items={data?.bad_locations}
              />

              <section className="log-analytics-card">
                <h3>
                  Customer reviews
                  {data?.reviews?.count
                    ? ` · ${data.reviews.average}★ (${data.reviews.count})`
                    : ""}
                </h3>
                <BarChart rows={reviewBars} height={120} />
              </section>

              <section className="log-analytics-card log-analytics-card--wide">
                <h3>Business notes</h3>
                <ul className="log-analytics-notes">
                  <li>
                    <b>Missed opportunities:</b> open market jobs your fleet has
                    not quoted ({summary.missed_opportunities ?? 0} of{" "}
                    {summary.pending_market ?? 0} pending).
                  </li>
                  <li>
                    <b>Win rate:</b> accepted quotes ÷ all quotes (
                    {summary.win_rate_pct ?? 0}%).
                  </li>
                  <li>
                    <b>Cycle time:</b> average hours from accept → delivered
                    confirmation.
                  </li>
                  <li>
                    <b>Earnings:</b> full fleet job amounts (assigned/paid), not
                    operator pay-share splits.
                  </li>
                  <li>
                    <b>Hotspots:</b> most frequent pickup and drop-off place
                    labels from completed and active fleet jobs.
                  </li>
                  <li>
                    <b>Bad locations:</b> pickups that appear most often on
                    cancelled or rejected jobs.
                  </li>
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </LogisticsPageShell>
  );
}
