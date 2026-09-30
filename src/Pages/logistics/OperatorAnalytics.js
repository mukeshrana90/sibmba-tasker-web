import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsAnalyticsMap from "../../CommanComponents/LogisticsAnalyticsMap";
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
          <div
            key={row[labelKey]}
            className="log-chart__col"
            title={`${row[labelKey]}: ${v}`}
          >
            <div className="log-chart__bar-wrap">
              <div className="log-chart__bar" style={{ height: `${pct}%` }} />
            </div>
            <span className="log-chart__label">
              {String(row[labelKey]).slice(5) || row[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutMix({ breakdown }) {
  const entries = Object.entries(breakdown || {}).filter(([, v]) => Number(v) > 0);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0) || 1;
  const colors = {
    pending: "#c4bbae",
    active: "#e6b800",
    delivered: "#2e7d32",
    cancelled: "#8a3b3b",
    rejected: "#6b5d45",
  };
  let acc = 0;
  const stops = entries.map(([k, v]) => {
    const start = (acc / total) * 100;
    acc += Number(v);
    const end = (acc / total) * 100;
    return `${colors[k] || "#038654"} ${start}% ${end}%`;
  });
  return (
    <div className="log-donut-wrap">
      <div
        className="log-donut"
        style={{
          background: stops.length
            ? `conic-gradient(${stops.join(", ")})`
            : "#ebe4d6",
        }}
        aria-hidden
      />
      <ul className="log-analytics-kv">
        {Object.entries(breakdown || {}).map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <b>{v}</b>
          </li>
        ))}
      </ul>
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

/**
 * Operator analytics — date range, charts, hotspot ranks, job map.
 * Same GET /logistics/analytics (scoped to assigned.driver_id).
 */
export default function LogisticsOperatorAnalytics() {
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
      midCrumb={{ to: "/logistics/driver", label: "Operator" }}
      homeTo="/logistics/driver"
    >
      <div className="log-analytics-page">
        <p className="log-op-lead" style={{ marginTop: 0 }}>
          Your jobs, quotes, and pay-share earnings for the selected dates —
          charts plus a map of pickups (red) and dropoffs (green).
        </p>

        <form
          className="log-jobs-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({ from, to });
          }}
        >
          <label>
            <span className="log-fl">From</span>
            <LogisticsDateInput
              className="log-date-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            <span className="log-fl">To</span>
            <LogisticsDateInput
              className="log-date-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <div className="log-jobs-toolbar__actions">
            <button
              type="submit"
              className="logistics-cta logistics-cta--primary"
            >
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
                <span>{summary.earnings_label || "My earnings"}</span>
              </div>
              <div>
                <strong>{summary.delivered ?? 0}</strong>
                <span>Delivered</span>
              </div>
              <div>
                <strong>{summary.active ?? 0}</strong>
                <span>In progress</span>
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
                <strong>{summary.quotes_total ?? 0}</strong>
                <span>Quotes submitted</span>
              </div>
            </div>

            <div className="log-analytics-grid">
              <section className="log-analytics-card log-analytics-card--wide">
                <h3>
                  Job map · red = pickup · green = dropoff
                  {data?.map_points?.length
                    ? ` · ${data.map_points.length} pins`
                    : ""}
                </h3>
                <LogisticsAnalyticsMap points={data?.map_points || []} />
              </section>

              <section className="log-analytics-card">
                <h3>My earnings by month</h3>
                <BarChart rows={earningsSeries} />
              </section>
              <section className="log-analytics-card">
                <h3>Jobs by month</h3>
                <BarChart rows={jobsSeries} />
              </section>

              <section className="log-analytics-card">
                <h3>Job status mix</h3>
                <DonutMix breakdown={data?.status_breakdown} />
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
                <h3>Assigned vehicles</h3>
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
                </ul>
              </section>

              <section className="log-analytics-card">
                <h3>
                  Customer reviews
                  {data?.reviews?.count
                    ? ` · ${data.reviews.average}★ (${data.reviews.count})`
                    : ""}
                </h3>
                <BarChart rows={reviewBars} height={120} />
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
                title="Tough pickups (cancel / reject)"
                items={data?.bad_locations}
              />

              <section className="log-analytics-card log-analytics-card--wide">
                <h3>How to read this</h3>
                <ul className="log-analytics-notes">
                  <li>
                    <b>My earnings:</b> your pay-share on delivered jobs in the
                    date range (same rules as Earnings).
                  </li>
                  <li>
                    <b>Win rate:</b> accepted quotes ÷ all your quotes (
                    {summary.win_rate_pct ?? 0}%).
                  </li>
                  <li>
                    <b>Cycle time:</b> average hours from accept → delivered OTP
                    confirmation.
                  </li>
                  <li>
                    <b>Map:</b> every pickup/drop pin from your assigned jobs in
                    range — zoom to see corridors you run most.
                  </li>
                  <li>
                    <b>Hotspots:</b> place labels that appear most often on your
                    jobs.
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
