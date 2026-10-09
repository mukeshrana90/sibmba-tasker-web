// Shimmer / skeleton placeholders shared by every Logistics page.
// They mirror the rough shape of the real content so the page doesn't jump
// when data arrives. Purely decorative: wrappers expose role="status" +
// aria-busy and a visually hidden label for screen readers.

const range = (n) => Array.from({ length: n }, (_, i) => i);

export function Sk({ w, h = 12, r, circle, className = "", style }) {
  return (
    <span
      aria-hidden="true"
      className={`log-sk${circle ? " log-sk--circle" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={{
        width: w,
        height: h,
        ...(r != null ? { borderRadius: r } : null),
        ...style,
      }}
    />
  );
}

function SkWrap({ label = "Loading", className = "", children }) {
  return (
    <div className={`log-sk-wrap ${className}`} role="status" aria-busy="true">
      <span className="log-sk-sr">{label}…</span>
      {children}
    </div>
  );
}

/** Inline one-line placeholder for "Showing x–y of z" meta rows. */
export function LogisticsSkeletonMeta({ w = 180 }) {
  return <Sk w={w} h={12} className="log-sk-meta" />;
}

/** Card list — job cards, quotes, operators, contacts… */
export function LogisticsListSkeleton({
  rows = 4,
  media = true,
  label = "Loading",
}) {
  return (
    <SkWrap label={label} className="log-sk-list">
      {range(rows).map((i) => (
        <div className="log-sk-card log-sk-row" key={i}>
          {media ? <Sk w={84} h={84} r={12} className="log-sk-row__media" /> : null}
          <div className="log-sk-row__body">
            <Sk w="38%" h={16} />
            <Sk w="72%" />
            <Sk w="55%" />
            <div className="log-sk-chips">
              <Sk w={64} h={20} r={999} />
              <Sk w={78} h={20} r={999} />
              <Sk w={52} h={20} r={999} />
            </div>
          </div>
          <div className="log-sk-row__side">
            <Sk w={70} h={22} r={999} />
            <Sk w={90} h={16} />
          </div>
        </div>
      ))}
    </SkWrap>
  );
}

/** Card grid — fleet units, equipment, availability, search results. */
export function LogisticsGridSkeleton({ cards = 6, label = "Loading" }) {
  return (
    <SkWrap label={label} className="log-sk-grid">
      {range(cards).map((i) => (
        <div className="log-sk-card log-sk-tile" key={i}>
          <div className="log-sk-tile__head">
            <Sk w={72} h={72} r={12} />
            <div className="log-sk-tile__lines">
              <Sk w="80%" h={15} />
              <Sk w="45%" />
              <Sk w={56} h={20} r={999} />
              <Sk w="65%" h={10} />
            </div>
          </div>
          <div className="log-sk-tile__actions">
            <Sk h={38} r={10} />
            <Sk h={38} r={10} />
          </div>
        </div>
      ))}
    </SkWrap>
  );
}

/** Skeleton <tr>s to drop into an existing <tbody>. */
export function LogisticsTableSkeletonRows({ rows = 6, cols = 6 }) {
  return range(rows).map((i) => (
    <tr className="log-sk-tr" key={`sk-${i}`} aria-hidden="true">
      {range(cols).map((c) => (
        <td key={c}>
          <Sk w={c === 1 ? "85%" : c === cols - 1 ? 28 : "65%"} h={c === 1 ? 14 : 12} />
          {c === 1 ? <Sk w="50%" h={10} style={{ marginTop: 8 }} /> : null}
        </td>
      ))}
    </tr>
  ));
}

/** KPI tiles + chart + list — dashboards, analytics, earnings, reports. */
export function LogisticsStatsSkeleton({
  tiles = 4,
  chart = true,
  list = 3,
  label = "Loading",
}) {
  return (
    <SkWrap label={label} className="log-sk-stats">
      <div className="log-sk-kpis">
        {range(tiles).map((i) => (
          <div className="log-sk-card log-sk-kpi" key={i}>
            <Sk w="55%" h={11} />
            <Sk w="70%" h={26} r={8} />
            <Sk w="40%" h={10} />
          </div>
        ))}
      </div>
      {chart ? (
        <div className="log-sk-card log-sk-chart">
          <Sk w={160} h={16} />
          <div className="log-sk-chart__bars">
            {[55, 80, 40, 95, 65, 75, 35, 85, 50, 70].map((h, i) => (
              <Sk key={i} h={`${h}%`} r={6} className="log-sk-chart__bar" />
            ))}
          </div>
        </div>
      ) : null}
      {list ? <LogisticsListSkeleton rows={list} media={false} label={label} /> : null}
    </SkWrap>
  );
}

/** Job / asset detail — hero band, facts, side panel. */
export function LogisticsDetailSkeleton({ media = true, label = "Loading" }) {
  return (
    <SkWrap label={label} className="log-sk-detail">
      <div className="log-sk-card log-sk-hero">
        {media ? <Sk w={120} h={120} r={14} className="log-sk-hero__media" /> : null}
        <div className="log-sk-hero__body">
          <div className="log-sk-chips">
            <Sk w={90} h={22} r={999} />
            <Sk w={70} h={22} r={999} />
          </div>
          <Sk w="48%" h={26} r={8} />
          <Sk w="70%" />
          <Sk w="35%" />
        </div>
        <div className="log-sk-hero__side">
          <Sk w={110} h={28} r={8} />
          <Sk w={140} h={40} r={10} />
        </div>
      </div>
      <div className="log-sk-detail__cols">
        <div className="log-sk-detail__main">
          <div className="log-sk-card log-sk-panel">
            <Sk w={140} h={16} />
            <div className="log-sk-route">
              <Sk w={14} h={14} circle />
              <Sk w="75%" />
            </div>
            <div className="log-sk-route">
              <Sk w={14} h={14} circle />
              <Sk w="60%" />
            </div>
            <Sk h={190} r={12} style={{ marginTop: 6 }} />
          </div>
          <div className="log-sk-card log-sk-panel">
            <Sk w={120} h={16} />
            <div className="log-sk-facts">
              {range(6).map((i) => (
                <div key={i}>
                  <Sk w="45%" h={10} />
                  <Sk w="75%" h={14} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="log-sk-detail__side">
          <div className="log-sk-card log-sk-panel">
            <div className="log-sk-party">
              <Sk w={52} h={52} circle />
              <div className="log-sk-tile__lines">
                <Sk w="70%" h={15} />
                <Sk w="45%" />
              </div>
            </div>
            <Sk w="90%" />
            <Sk w="65%" />
            <Sk h={42} r={10} style={{ marginTop: 6 }} />
            <Sk h={42} r={10} />
          </div>
        </aside>
      </div>
    </SkWrap>
  );
}

/** Generic form — edit job, subscription, emergency contacts, invites. */
export function LogisticsFormSkeleton({ fields = 6, label = "Loading" }) {
  return (
    <SkWrap label={label} className="log-sk-form">
      <div className="log-sk-card log-sk-panel">
        <Sk w={180} h={20} r={8} />
        <Sk w="60%" />
        <div className="log-sk-form__grid">
          {range(fields).map((i) => (
            <div key={i} className="log-sk-form__field">
              <Sk w={90} h={10} />
              <Sk h={44} r={10} />
            </div>
          ))}
        </div>
        <Sk w={160} h={44} r={12} style={{ marginTop: 8 }} />
      </div>
    </SkWrap>
  );
}
