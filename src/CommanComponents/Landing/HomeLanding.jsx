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
          <div className="landing-section__head">
            <span className="landing-eyebrow">Simple process</span>
            <h2>How it works</h2>
          </div>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step__num">1</div>
              <h3>Search &amp; compare</h3>
              <p>Find services by name or category and filter by location.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step__num">2</div>
              <h3>Book with confidence</h3>
              <p>View profiles, ratings, and reviews before you hire.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step__num">3</div>
              <h3>Get it done</h3>
              <p>Track your booking and pay securely when the job is complete.</p>
            </div>
          </div>
        </div>
      </section>

      <TopProviders />

      <section className="landing-section landing-section--trust" id="about">
        <div className="landing-wrap landing-trust">
          <div>
            <span className="landing-eyebrow">Why Simba Tasker</span>
            <h2>Trusted by customers across Zimbabwe</h2>
            <ul className="landing-trust__list">
              <li>Verified service providers</li>
              <li>Transparent ratings and reviews</li>
              <li>Secure booking and payments</li>
              <li>Support when you need it</li>
            </ul>
          </div>
          <div className="landing-trust__panel">
            <strong>98%</strong>
            <span>Customer satisfaction</span>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-wrap landing-cta__inner">
          <div>
            <h2>Are you a service provider?</h2>
            <p>Join Simba Tasker and grow your business with new customers.</p>
          </div>
          <div className="landing-cta__actions">
            <button
              type="button"
              className="landing-btn landing-btn--gold"
              onClick={() => navigate("/sign-up?role=2")}
            >
              Join as a provider
            </button>
            <Link to="/provider" className="landing-btn landing-btn--ghost">
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
