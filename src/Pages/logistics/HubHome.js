import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import { buildPublicAssetUrl, defaultImage } from "../../utils/ImagePath";
import { assetBookState } from "../../utils/logisticsBooking";
import { useLogisticsConfig } from "../../CommanComponents/useLogisticsConfig";
import { CategoryGlyph } from "../../CommanComponents/LogisticsFormIcons";
import {
  CATEGORIES,
  CAB_CATEGORY,
} from "../../CommanComponents/LogisticsCategoryTiles";

import "./logistics.css";

const HOW_IT_WORKS = [
  { n: 1, title: "Post or pick", sub: "Post your job, or book a truck, machine or cab directly." },
  { n: 2, title: "Compare quotes", sub: "Nearby verified fleets quote — chat, check ratings, accept one." },
  { n: 3, title: "Track to done", sub: "Follow every step live and confirm with an OTP / PIN." },
];

const HUB_SLIDER_LIMIT = 6;

const PRIMARY = [
  {
    to: "/logistics/post",
    title: "Post a job",
    sub: "Transport or plant — pick a category",
    icon: "post",
  },
  {
    to: "/logistics/search",
    title: "Book a Logistic/Equipment",
    sub: "Search trucks or plant by category",
    icon: "book",
  },
  {
    to: "/logistics/post?category=cab",
    title: "Book a cab",
    sub: "Bike, auto or car — ride now",
    icon: "cab",
    cabOnly: true,
  },
  {
    to: "/logistics/jobs",
    title: "My jobs",
    sub: "Open, in progress, completed",
    icon: "jobs",
    wide: true,
  },
];

function IconPost() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 9h6M9 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 16h11l2.5-5H8L6 16zM7 11V8h6v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="16.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14.5" cy="16.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 11h3l2 5h-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function IconJobs() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 19c1.5-3.2 4-4.8 7-4.8S17.5 15.8 19 19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.6l2.2 4.6 5 .7-3.6 3.5.9 5.1L12 15.8 7.5 17.5l.9-5.1L4.8 8.9l5-.7L12 3.6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NeedIcon({ type }) {
  if (type === "post") return <IconPost />;
  if (type === "jobs") return <IconJobs />;
  if (type === "cab") return <CategoryGlyph type="cab" size={22} />;
  return <IconBook />;
}

function assetPhotoUrl(path) {
  if (!path) return null;
  let normalized = String(path).replace(/\\/g, "/").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (normalized.startsWith("http") || normalized.startsWith("blob:")) {
    return normalized;
  }
  const absPublic = normalized.indexOf("/public/");
  if (absPublic !== -1) {
    normalized = normalized.slice(absPublic + "/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return buildPublicAssetUrl(normalized);
}

function formatRating(rating) {
  const avg = Number(rating?.average) || 0;
  const count = Number(rating?.count) || 0;
  if (count <= 0 && avg <= 0) return "New";
  return `${avg.toFixed(1)} ★ · ${count} review${count === 1 ? "" : "s"}`;
}

function HubAssetCard({ row, badge }) {
  const thumb = assetPhotoUrl(row.photos?.[0]);
  const { canBook, blockedReason } = assetBookState(row);
  return (
    <article className="log-hub-asset">
      {badge ? <span className="log-hub-asset__badge">{badge}</span> : null}
      <Link
        to={`/logistics/asset/${row.asset_id}`}
        className="log-hub-asset__main"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="log-hub-asset__thumb"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = defaultImage;
            }}
          />
        ) : (
          <span
            className="log-hub-asset__thumb log-hub-asset__thumb--empty"
            aria-hidden="true"
          />
        )}
        <span className="log-hub-asset__body">
          <b>{row.name}</b>
          <span className="log-hub-asset__owner">
            {row.owner?.full_name || "Fleet"}
            {Number(row.owner?.is_verified) === 1 ? " · Verified" : ""}
          </span>
          <span className="log-hub-asset__rating">
            {formatRating(row.rating)}
          </span>
          <span className="log-hub-asset__meta">
            {row.capacity?.value != null
              ? `${row.capacity.value} ${row.capacity.unit || "tons"}`
              : row.category?.name || row.kind}
            {row.history?.completed_jobs
              ? ` · ${row.history.completed_jobs} jobs`
              : ""}
          </span>
          {row.current_location ? (
            <span className="log-hub-asset__location">
              <span className="log-hub-asset__location-label">
                Current location
              </span>
              <span className="log-hub-asset__location-value">
                {placeShortLabel(row.current_location)}
              </span>
            </span>
          ) : null}
        </span>
      </Link>
      <div className="log-hub-asset__actions">
        <Link
          className="logistics-cta logistics-cta--ghost"
          to={`/logistics/asset/${row.asset_id}`}
        >
          Reviews
        </Link>
        <Link
          className="logistics-cta logistics-cta--primary"
          title={canBook ? undefined : blockedReason}
          to={
            canBook
              ? `/logistics/post?asset=${row.asset_id}`
              : `/logistics/asset/${row.asset_id}`
          }
        >
          {canBook ? "Book" : "View"}
        </Link>
      </div>
    </article>
  );
}

function HubShimmerCard() {
  return (
    <div className="log-hub-asset log-hub-shimmer-card">
      <div className="log-hub-asset__main">
        <span className="log-hub-shimmer-thumb log-hub-shimmer" aria-hidden="true" />
        <span className="log-hub-asset__body">
          <span className="log-hub-shimmer-line log-hub-shimmer" aria-hidden="true" />
          <span className="log-hub-shimmer-line log-hub-shimmer is-short" aria-hidden="true" />
          <span className="log-hub-shimmer-line log-hub-shimmer is-mid" aria-hidden="true" />
          <span className="log-hub-shimmer-line log-hub-shimmer is-loc" aria-hidden="true" />
        </span>
      </div>
      <div className="log-hub-asset__actions">
        <span className="log-hub-shimmer-btn log-hub-shimmer" aria-hidden="true" />
        <span className="log-hub-shimmer-btn log-hub-shimmer" aria-hidden="true" />
      </div>
    </div>
  );
}

function HubShimmerSection() {
  return (
    <section className="log-hub-section log-hub-shimmer-section">
      <div className="log-hub-section__head">
        <div className="log-hub-section__titles">
          <span className="log-hub-shimmer-title log-hub-shimmer" aria-hidden="true" />
          <span className="log-hub-shimmer-lead log-hub-shimmer" aria-hidden="true" />
        </div>
        <span className="log-hub-shimmer-link log-hub-shimmer" aria-hidden="true" />
      </div>
      <div className="log-hub-slider">
        <div className="log-hub-slider__track log-hub-shimmer-track">
          {[0, 1, 2].map((i) => (
            <div className="log-hub-slider__item" key={i}>
              <HubShimmerCard />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HubSpotlightShimmer() {
  return (
    <div
      className="log-hub-spotlight-shimmer"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading top providers"
    >
      <HubShimmerSection />
      <HubShimmerSection />
      <HubShimmerSection />
    </div>
  );
}

function HubAssetSection({ title, lead, rows, badge, empty, seeAllTo }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  };

  useEffect(() => {
    syncArrows();
    const el = trackRef.current;
    if (!el) return undefined;
    const onScroll = () => syncArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncArrows);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncArrows);
    };
  }, [rows]);

  const scrollByPage = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.92, 240);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const showControls = rows.length > 3;

  return (
    <section className="log-hub-section">
      <div className="log-hub-section__head">
        <div className="log-hub-section__titles">
          <h2 className="log-sect">{title}</h2>
          {lead ? <p className="log-hub-section__lead">{lead}</p> : null}
        </div>
        <div className="log-hub-section__tools">
          {seeAllTo ? (
            <Link to={seeAllTo} className="log-hub-section__all">
              See all
            </Link>
          ) : null}
          {showControls ? (
            <div className="log-hub-slider__controls">
              <button
                type="button"
                className="log-hub-slider__btn"
                onClick={() => scrollByPage(-1)}
                disabled={!canPrev}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                className="log-hub-slider__btn"
                onClick={() => scrollByPage(1)}
                disabled={!canNext}
                aria-label="Next"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {rows.length ? (
        <div className="log-hub-slider">
          <div className="log-hub-slider__track" ref={trackRef}>
            {rows.map((row) => (
              <div className="log-hub-slider__item" key={row.asset_id}>
                <HubAssetCard row={row} badge={badge} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="log-hub-section__empty" role="status">
          <span className="log-hub-section__empty-icon" aria-hidden="true">
            <IconStar />
          </span>
          <p>{empty}</p>
        </div>
      )}
    </section>
  );
}

export default function LogisticsHubHome() {
  const dispatch = useDispatch();
  // Cab tile only when backend CAB_SERVICE_ENABLED=true
  const { cabEnabled } = useLogisticsConfig();
  const [spotlight, setSpotlight] = useState({
    top_rated_logistics: [],
    top_rated_equipment: [],
    featured_logistics: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await dispatch(
        LogisticsActions.getHubSpotlight({ limit: HUB_SLIDER_LIMIT })
      );
      if (cancelled) return;
      const data = res?.payload?.data || {};
      setSpotlight({
        top_rated_logistics: (data.top_rated_logistics || []).slice(
          0,
          HUB_SLIDER_LIMIT
        ),
        top_rated_equipment: (data.top_rated_equipment || []).slice(
          0,
          HUB_SLIDER_LIMIT
        ),
        featured_logistics: (data.featured_logistics || []).slice(
          0,
          HUB_SLIDER_LIMIT
        ),
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <LogisticsPageShell title="Logistics Hub" crumbLabel="Hub">
      <div className="log-hub-home">
        <section className="log-hub-hero" aria-labelledby="hub-hero-title">
          <div className="log-hub-hero__copy">
            <span className="log-hub-hero__kicker">Simba Logistics</span>
            <h2 id="hub-hero-title">
              Move goods, hire machines{cabEnabled ? ", ride now" : ""} — all in
              one place.
            </h2>
            <p>
              Post a job or book trucks, plant equipment
              {cabEnabled ? " and cabs" : ""} on the same login. Equipment
              Providers land here as customers too.
            </p>
            <div className="log-hub-hero__ctas">
              <Link className="logistics-cta logistics-cta--primary" to="/logistics/post">
                Post a job
              </Link>
              <Link className="logistics-cta logistics-cta--ghost" to="/logistics/search">
                Book / Search
              </Link>
            </div>
          </div>
          <div className="log-hub-hero__cats" aria-label="Browse by category">
            <span className="log-hub-hero__cats-title">Browse by category</span>
            <div className="log-hub-hero__cat-grid">
              {(cabEnabled ? [...CATEGORIES, CAB_CATEGORY] : CATEGORIES).map((c) => (
                <Link
                  key={c.id}
                  to={
                    c.id === "cab"
                      ? "/logistics/post?category=cab"
                      : `/logistics/search?category=${c.id}&scope=category`
                  }
                  className={`log-hub-hero__cat log-hub-hero__cat--${c.id}`}
                >
                  <span className="log-hub-hero__cat-icon" aria-hidden="true">
                    <CategoryGlyph type={c.icon} size={24} />
                  </span>
                  <b>{c.label}</b>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="log-hub-need log-hub-need--v2" aria-labelledby="hub-need-title">
          <h2 id="hub-need-title" className="log-sect">
            What do you need?
          </h2>
          <div className="log-hub-need__grid">
            {PRIMARY.filter((a) => !a.cabOnly || cabEnabled).map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`log-hub-need__card log-hub-need__card--v2 log-hub-need__card--${a.icon}`}
              >
                <span className="log-hub-need__icon" aria-hidden="true">
                  <NeedIcon type={a.icon} />
                </span>
                <span className="log-hub-need__copy">
                  <b>{a.title}</b>
                  <span>{a.sub}</span>
                </span>
                <span className="log-hub-need__go">
                  Open <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
          <ol className="log-hub-steps" aria-label="How it works">
            {HOW_IT_WORKS.map((st) => (
              <li key={st.n}>
                <span className="log-hub-steps__n">{st.n}</span>
                <span>
                  <b>{st.title}</b>
                  <small>{st.sub}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {loading ? (
          <HubSpotlightShimmer />
        ) : (
          <>
            <HubAssetSection
              title="Top logistics providers"
              lead="Explore the most popular trucks from top fleet owners — trusted by customers and ready to book."
              rows={spotlight.featured_logistics}
              badge="Featured"
              empty="No Paid-plan fleet trucks yet."
              seeAllTo="/logistics/search?category=logistic&scope=category"
            />
            <HubAssetSection
              title="Top rated logistics"
              lead="Best-reviewed trucks and transporters on Simba Logistics."
              rows={spotlight.top_rated_logistics}
              empty="No logistics assets rated yet — try Book / Search."
              seeAllTo="/logistics/search?category=logistic&scope=category"
            />
            <HubAssetSection
              title="Top rated equipment"
              lead="Non-logistics plant hire — agricultural, construction and industrial equipment."
              rows={spotlight.top_rated_equipment}
              empty="No equipment assets rated yet — switch to a plant category in Search."
              seeAllTo="/logistics/search?kind=equipment&scope=category"
            />
          </>
        )}
      </div>
    </LogisticsPageShell>
  );
}
