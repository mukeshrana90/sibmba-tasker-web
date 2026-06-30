import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import UnifiedSearch from "./UnifiedSearch";
import TopProviders from "./TopProviders";
import { useLanding } from "../../context/LandingContext";
import { categoryImageUrl, defaultImage, formatDisplayTitle } from "../../utils/landingUtils";
import { scrollToLandingSection } from "../../utils/landingNav";

const POPULAR_TAGS = [
  { label: "Electricians", query: "electrician" },
  { label: "Plumbers", query: "plumber" },
  { label: "Cleaners", query: "clean" },
  { label: "Drivers", query: "driver" },
  { label: "Builders", query: "builder" },
];

const HOW_IT_WORKS_STEPS = [
  {
    title: "Search & discover",
    description:
      "Tell us what you need and where. Browse verified providers by category, location and rating.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Connect & book",
    description:
      "Compare profiles, reviews and prices, then message and book the provider that fits your job.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 12h8M12 8v8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: "Get it done",
    description:
      "Your job gets handled by a trusted pro. Leave a rating to help the community grow.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
];

const TRUST_FEATURES = [
  {
    title: "Verified providers",
    description:
      "Identity and skill checks weed out bogus players so you deal only with genuine pros.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Real ratings & reviews",
    description: "Honest feedback from real customers helps you make confident decisions.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
      </svg>
    ),
  },
  {
    title: "Location-based matching",
    description: "Find the right people near you, wherever you are across Zimbabwe.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
];

export default function HomeLanding() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectCategory, setSearchQuery } = useLanding();
  const categories = useSelector((s) => s.UserSlice.categories);

  useEffect(() => {
    dispatch(CustomerActions.getCategories({ limit: 12 }));
  }, [dispatch]);

  useEffect(() => {
    const sectionId = location.hash.replace("#", "");
    if (!sectionId) return undefined;
    const timer = window.setTimeout(() => {
      scrollToLandingSection(sectionId);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const catList = categories?.allCat || categories?.data?.allCat || [];

  const handlePopularTag = (tag) => {
    setSearchQuery(tag.query);
    const match = catList.find((c) =>
      c.service_category_name?.toLowerCase().includes(tag.query)
    );
    if (match) {
      selectCategory(match._id);
    }
  };

  return (
    <div className="landing-page">
      <section className="landing-hero" id="top">
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="landing-blob landing-blob--a" />
          <div className="landing-blob landing-blob--b" />
        </div>

        <div className="landing-wrap landing-hero__inner">
          <span className="landing-eyebrow">
            🦁 Zimbabwe&apos;s trusted services marketplace
          </span>
          <h1>
            Find <span className="landing-hl">trusted pros</span>
            <br />
            for any job, anywhere.
          </h1>
          <p className="landing-hero__lead">
            From electricians and plumbers to cleaners and drivers — connect with
            verified, rated service providers near you, all across Zimbabwe.
          </p>

          <UnifiedSearch />

          <div className="landing-tags">
            <span className="landing-tags__label">Popular:</span>
            {POPULAR_TAGS.map((tag) => (
              <button
                type="button"
                key={tag.label}
                className="landing-tag"
                onClick={() => handlePopularTag(tag)}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="landing-stats">
            <div className="landing-hstat">
              <b>2,400+</b>
              <span>Verified providers</span>
            </div>
            <div className="landing-hstat">
              <b>30+</b>
              <span>Service categories</span>
            </div>
            <div className="landing-hstat">
              <b>15k+</b>
              <span>Jobs completed</span>
            </div>
            <div className="landing-hstat">
              <b>4.8★</b>
              <span>Average rating</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--categories" id="categories">
        <div className="landing-wrap">
          <div className="landing-sec-head">
            <div className="landing-sec-head__text">
              <span className="landing-eyebrow">Browse by need</span>
              <h2>Hot categories right now</h2>
              <p>The services people in Zimbabwe are booking most this week.</p>
            </div>
            <Link to="/services" className="landing-link-all">
              View all categories
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="landing-cat-grid">
            {catList.slice(0, 12).map((cat, idx) => (
              <button
                type="button"
                key={cat._id}
                className="landing-cat-card"
                onClick={() => selectCategory(cat._id)}
              >
                {idx < 3 && <span className="landing-cat-badge">Hot</span>}
                <div className="landing-cat-ico">
                  <img
                    src={categoryImageUrl(cat)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultImage;
                    }}
                  />
                </div>
                <h4>{formatDisplayTitle(cat.service_category_name)}</h4>
                <div className="landing-cat-count">Explore providers</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--steps" id="how">
        <div className="landing-wrap">
          <div className="landing-sec-head landing-sec-head--center">
            <div className="landing-sec-head__text">
              <span className="landing-eyebrow">Simple &amp; safe</span>
              <h2>How Simba Tasker works</h2>
              <p>Get the right professional in three easy steps.</p>
            </div>
          </div>
          <div className="landing-steps">
            {HOW_IT_WORKS_STEPS.map((step) => (
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

      <TopProviders />

      <section className="landing-section landing-section--trust" id="about">
        <div className="landing-wrap landing-trust">
          <div>
            <span className="landing-eyebrow">Built on trust</span>
            <h2 className="landing-trust__title">Safety and reliability, by design</h2>
            <p className="landing-trust__lead">
              Unlike open marketplaces, every step on Simba Tasker is built to protect you
              and reward genuine professionals.
            </p>
            <div className="landing-trust-features">
              {TRUST_FEATURES.map((feature) => (
                <div className="landing-trust-feature" key={feature.title}>
                  <div className="landing-trust-feature__icon">{feature.icon}</div>
                  <div>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-trust-visual">
            <div className="landing-trust-visual__badge">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F0A92B"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3>The verified badge means business</h3>
            <p>
              When you see the gold check, that provider has passed our verification — so
              you can hire with peace of mind.
            </p>
            <div className="landing-trust-visual__stats">
              <div>
                <b>98%</b>
                <span>Customer satisfaction</span>
              </div>
              <div>
                <b>24/7</b>
                <span>Support &amp; safety</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta" id="providercta">
        <div className="landing-wrap">
          <div className="landing-cta__inner">
            <span className="landing-eyebrow landing-cta__eyebrow">For service providers</span>
            <h2>Grow your business with Simba Tasker</h2>
            <p>
              Reach thousands of customers, manage bookings, and build your reputation in a
              trusted environment. Whether you&apos;re a business, a tradesperson or a
              freelancer — we give you the tools to succeed.
            </p>
            <div className="landing-cta__actions">
              <button
                type="button"
                className="landing-btn landing-btn--gold"
                onClick={() => navigate("/sign-up?role=2")}
              >
                Join as a provider
              </button>
              <Link to="/" className="landing-btn landing-btn--ghost">
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
