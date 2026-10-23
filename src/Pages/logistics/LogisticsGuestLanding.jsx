import { Link, useNavigate } from "react-router-dom";
import UnifiedSearch from "../../CommanComponents/Landing/UnifiedSearch";
import { CategoryGlyph } from "../../CommanComponents/LogisticsFormIcons";
import { CATEGORIES, CAB_CATEGORY } from "../../CommanComponents/LogisticsCategoryTiles";
import { accountLinkTo } from "../../utils/authRedirect";
import truckArt from "../../Assets/Images/logistics/hub-banner-truck.png";
import "./LogisticsGuestLanding.css";

/**
 * /logistics before login (v2.7.53): the Logistics Hub as a marketing page in the
 * home landing style (landing.css building blocks). Logged-in customers keep the
 * Hub (HubHome). Search, categories and asset pages are public; posting / booking
 * go through login (accountLinkTo).
 */

const POPULAR = [
  { label: "Tipper truck", q: "tipper" },
  { label: "Flatbed", q: "flatbed" },
  { label: "Tractor", q: "tractor" },
  { label: "Excavator", q: "excavator" },
  { label: "Crane", q: "crane" },
];

const CATEGORY_COPY = {
  logistic: { title: "Logistic trucks", sub: "Move goods, local or long-haul" },
  agricultural: { title: "Agricultural", sub: "Tractors, planters, harvesters" },
  construction: { title: "Construction", sub: "Excavators, loaders, cranes" },
  industrial: { title: "Industrial", sub: "Forklifts, generators, compressors" },
  cab: { title: "Cab", sub: "Bike, auto or car — ride now" },
};

const Svg = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const STEPS = [
  {
    title: "Post or search",
    description: "Post your job, or pick a truck or machine near you by category and location.",
    icon: (
      <Svg>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4-4" />
      </Svg>
    ),
  },
  {
    title: "Compare quotes",
    description: "Verified fleet owners send quotes — check ratings, chat and accept the one that fits.",
    icon: (
      <Svg>
        <path d="M4 6h16M4 12h10M4 18h7" />
        <path d="m15 17 2 2 4-4" />
      </Svg>
    ),
  },
  {
    title: "Track to done",
    description: "Follow every step live and confirm the delivery with a one-time code.",
    icon: (
      <Svg>
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </Svg>
    ),
  },
];

const TRUST = [
  {
    title: "Verified fleet owners",
    description: "Every company is approved by Simba before its trucks and machines appear.",
    icon: (
      <Svg>
        <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </Svg>
    ),
  },
  {
    title: "Documents checked",
    description: "Road licence, insurance and operator licences are tracked — expired papers take a unit off the road.",
    icon: (
      <Svg>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5M9 14l2 2 4-4" />
      </Svg>
    ),
  },
  {
    title: "Live tracking & SOS",
    description: "See each step of the trip, and raise an SOS that reaches Simba and the fleet at once.",
    icon: (
      <Svg>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Svg>
    ),
  },
  {
    title: "One clear price",
    description: "You see the agreed price before the job starts — no surprises at the end.",
    icon: (
      <Svg>
        <path d="M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9 9.4 12 10s5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" />
      </Svg>
    ),
  },
];

const BENEFITS = [
  { big: "Verified", small: "Fleet owners checked by Simba" },
  { big: "Live", small: "Tracking on every trip" },
  { big: "OTP", small: "Safe delivery confirmation" },
  { big: "4", small: "Categories of trucks & plant" },
];

export default function LogisticsGuestLanding({ cabEnabled, spotlight, loading, AssetSection, Shimmer }) {
  const navigate = useNavigate();
  const categories = cabEnabled ? [...CATEGORIES, CAB_CATEGORY] : CATEGORIES;
  const sliders = [
    {
      key: "featured",
      title: "Top logistics providers",
      lead: "Popular trucks from top fleet owners — trusted by customers and ready to book.",
      rows: spotlight.featured_logistics,
      badge: "Featured",
      seeAllTo: "/logistics/search?category=logistic&scope=category",
    },
    {
      key: "rated-trucks",
      title: "Top rated logistics",
      lead: "Best-reviewed trucks and transporters on Simba Logistics.",
      rows: spotlight.top_rated_logistics,
      seeAllTo: "/logistics/search?category=logistic&scope=category",
    },
    {
      key: "rated-plant",
      title: "Top rated equipment",
      lead: "Agricultural, construction and industrial plant hire.",
      rows: spotlight.top_rated_equipment,
      seeAllTo: "/logistics/search?kind=equipment&scope=category",
    },
  ].filter((s) => (s.rows || []).length);

  const catLink = (c) =>
    c.id === "cab" ? accountLinkTo("/logistics/post?category=cab") : `/logistics/search?category=${c.id}&scope=category`;

  return (
    <div className="landing-page lgl-page">
      <section className="landing-hero lgl-hero" id="top">
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="landing-blob landing-blob--a" />
          <div className="landing-blob landing-blob--b" />
          <img className="lgl-hero__truck" src={truckArt} alt="" />
        </div>

        <div className="landing-wrap landing-hero__inner">
          <span className="landing-eyebrow">🚚 Zimbabwe&apos;s logistics &amp; equipment marketplace</span>
          <h1>
            Trucks &amp; <span className="landing-hl">machines</span>
            <br />
            from trusted fleets.
          </h1>
          <p className="landing-hero__lead">
            Book trucks, tractors, excavators and more{cabEnabled ? ", or ride a cab" : ""} — compare quotes
            from verified fleet owners near you, all across Zimbabwe.
          </p>

          <UnifiedSearch defaultMode="logistics" showModeSwitch={false} />

          <div className="landing-tags">
            <span className="landing-tags__label">Popular:</span>
            {POPULAR.map((t) => (
              <button
                type="button"
                key={t.label}
                className="landing-tag"
                onClick={() => navigate(`/logistics/search?q=${encodeURIComponent(t.q)}`)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="landing-stats lgl-benefits">
            {BENEFITS.map((b) => (
              <div className="landing-hstat" key={b.small}>
                <b>{b.big}</b>
                <span>{b.small}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--categories" id="categories">
        <div className="landing-wrap">
          <div className="landing-sec-head">
            <div className="landing-sec-head__text">
              <span className="landing-eyebrow">Browse by need</span>
              <h2>What do you need moved or done?</h2>
              <p>Pick a category to see trucks and machines available near you.</p>
            </div>
            <Link to="/logistics/search" className="landing-link-all">
              Search all equipment
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="landing-cat-grid lgl-cat-grid">
            {categories.map((c, i) => (
              <Link key={c.id} to={catLink(c)} className="landing-cat-card lgl-cat-card">
                {i === 0 ? <span className="landing-cat-badge">Popular</span> : null}
                <div className="landing-cat-ico lgl-cat-ico">
                  <CategoryGlyph type={c.icon} size={26} />
                </div>
                <h4>{CATEGORY_COPY[c.id]?.title || c.label}</h4>
                <div className="landing-cat-count">{CATEGORY_COPY[c.id]?.sub || "Explore"}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {loading || sliders.length ? (
        <section className="landing-section lgl-spotlight" id="fleets">
          <div className="landing-wrap">
            <div className="landing-sec-head">
              <div className="landing-sec-head__text">
                <span className="landing-eyebrow">On Simba Logistics</span>
                <h2>Top fleets and machines</h2>
                <p>Rated by customers after real jobs.</p>
              </div>
            </div>
            {loading ? (
              <Shimmer />
            ) : (
              sliders.map((s) => (
                <AssetSection key={s.key} title={s.title} lead={s.lead} rows={s.rows} badge={s.badge} seeAllTo={s.seeAllTo} empty="" />
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="landing-section landing-section--steps" id="how">
        <div className="landing-wrap">
          <div className="landing-sec-head landing-sec-head--center">
            <div className="landing-sec-head__text">
              <span className="landing-eyebrow">Simple &amp; safe</span>
              <h2>How Simba Logistics works</h2>
              <p>From request to delivery in three steps.</p>
            </div>
          </div>
          <div className="landing-steps">
            {STEPS.map((step) => (
              <div className="landing-step" key={step.title}>
                <div className="landing-step__num" aria-hidden="true" />
                <div className="landing-step__icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--trust" id="about">
        <div className="landing-wrap landing-trust">
          <div>
            <span className="landing-eyebrow">Built on trust</span>
            <h2 className="landing-trust__title">Safe trips, checked fleets</h2>
            <p className="landing-trust__lead">
              Every truck and machine on Simba Logistics belongs to an approved company with its papers in order.
            </p>
            <div className="landing-trust-features">
              {TRUST.map((f) => (
                <div className="landing-trust-feature" key={f.title}>
                  <div className="landing-trust-feature__icon">{f.icon}</div>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-trust-visual">
            <div className="landing-trust-visual__badge">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#F0A92B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3>Approved fleets only</h3>
            <p>Simba reviews each company and its documents before its trucks and machines can be booked.</p>
            <div className="landing-trust-visual__stats">
              <div>
                <b>OTP</b>
                <span>Delivery you confirm</span>
              </div>
              <div>
                <b>24/7</b>
                <span>SOS &amp; support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta lgl-cta" id="get-started">
        <div className="landing-wrap lgl-cta__grid">
          <div className="landing-cta__inner">
            <span className="landing-eyebrow landing-cta__eyebrow">For customers</span>
            <h2>Need something moved today?</h2>
            <p>Post your job once and let verified fleet owners near you send their best quote.</p>
            <div className="landing-cta__actions">
              <Link className="landing-btn landing-btn--gold" to={accountLinkTo("/logistics/post")}>
                Post a job
              </Link>
              <Link className="landing-btn landing-btn--ghost" to="/logistics/search">
                Search equipment
              </Link>
            </div>
          </div>
          <div className="landing-cta__inner">
            <span className="landing-eyebrow landing-cta__eyebrow">For equipment owners</span>
            <h2>Own trucks or machines?</h2>
            <p>List your fleet on Simba Logistics, add your operators and get jobs from customers across Zimbabwe.</p>
            <div className="landing-cta__actions">
              <button type="button" className="landing-btn landing-btn--gold" onClick={() => navigate("/sign-up?role=4")}>
                Join as Equipment Owner
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
