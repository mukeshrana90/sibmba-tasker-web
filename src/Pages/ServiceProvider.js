import React, { useEffect, useMemo, useRef } from "react";
import Modal from "react-bootstrap/Modal";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CustomerActions from "../Redux/Actions/CustomerActions";
import MapComponent from "../CommanComponents/MapComponent";
import Loader from "../CommanComponents/Loader";
import {
  avatarColor,
  formatPrice,
  handleCategoryImageError,
  handleUserImageError,
  isVerified as providerIsVerified,
  providerDisplayName,
  providerInitials,
  providerLocation,
  serviceImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import { isLoggedIn, redirectToLogin } from "../utils/authRedirect";

function starsText(rating) {
  const filled = Math.round(Number(rating) || 0);
  return "★★★★★".slice(0, filled) + "☆☆☆☆☆".slice(0, 5 - filled);
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function safeVal(v) {
  return !v || v === "undefined" ? null : v;
}

function formatReviewDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString();
}

function getRatingBars(feedbacks) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbacks.forEach((f) => {
    const r = Math.round(Number(f.rating) || 0);
    if (r >= 1 && r <= 5) counts[r] += 1;
  });
  const total = feedbacks.length || 1;
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    pct: Math.round((counts[star] / total) * 100),
  }));
}

export default function ServiceProvider() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { id } = useParams();
  const pageRef = useRef(null);

  const profile = useSelector((e) => e.UserSlice.serviceProviderProfile);
  const loading = useSelector((e) => e.UserSlice.loading);
  const [showMapModal, setShowMapModal] = React.useState(false);
  const [mapData, setMapData] = React.useState({ coordinates: null, address: "" });
  const [similarProviders, setSimilarProviders] = React.useState([]);

  const searchParams = new URLSearchParams(location.search);
  const serviceIdParam = searchParams.get("serviceId");

  const provider = profile?.provider;
  const services = useMemo(() => profile?.services || [], [profile?.services]);
  const feedbacks = useMemo(() => profile?.feedbacks || [], [profile?.feedbacks]);
  const averageRating = profile?.averageRating ?? 0;
  const completedJobsCount = profile?.completedJobsCount ?? 0;
  const distanceKm = profile?.distanceKm;

  useEffect(() => {
    if (!id) return;
    const lat = localStorage.getItem("latitude");
    const long = localStorage.getItem("longitude");
    dispatch(
      CustomerActions.getServiceProviderProfile({
        providerId: id,
        lat: lat || undefined,
        long: long || undefined,
      })
    );
  }, [id, dispatch]);

  const selectedService = useMemo(() => {
    if (!serviceIdParam) return services[0] || null;
    return (
      services.find((s) => String(s._id) === String(serviceIdParam)) ||
      services[0] ||
      null
    );
  }, [services, serviceIdParam]);

  const categoryId = selectedService?.serviceCategoryId?._id || null;

  useEffect(() => {
    if (!provider) return;

    const lat = localStorage.getItem("latitude");
    const long = localStorage.getItem("longitude");

    const fetchSimilar = async () => {
      try {
        const payload = { limit: 10, minReviews: 0 };
        if (categoryId) payload.categoryId = categoryId;
        if (lat && long) {
          payload.nearby = true;
          payload.lat = lat;
          payload.lng = long;
        }

        const res = await dispatch(
          CustomerActions.getTopRatedServices(payload)
        ).unwrap();

        const items = res?.data?.items || [];
        const deduped = [];
        const seen = new Set();

        for (const item of items) {
          const pid = item.serviceProvider?._id;
          if (!pid || String(pid) === String(id) || seen.has(String(pid))) {
            continue;
          }
          seen.add(String(pid));
          deduped.push(item);
          if (deduped.length >= 3) break;
        }

        setSimilarProviders(deduped);
      } catch {
        setSimilarProviders([]);
      }
    };

    fetchSimilar();
  }, [provider, id, categoryId, dispatch]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal:not(.in)");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [profile, similarProviders]);

  const feedbackCount = feedbacks.length;
  const ratingBars = useMemo(() => getRatingBars(feedbacks), [feedbacks]);

  const displayName =
    provider?.company_name && provider.company_name !== "undefined"
      ? provider.company_name
      : provider?.full_name || "Service Provider";

  const street =
    safeVal(provider?.street_address) || safeVal(provider?.suburbs) || null;

  const locationLabel = [street, safeVal(provider?.country)]
    .filter(Boolean)
    .join(", ");

  const primaryCategory =
    selectedService?.serviceCategoryId?.service_category_name ||
    services[0]?.serviceCategoryId?.service_category_name ||
    "Services";

  const areaLabel =
    safeVal(provider?.suburbs) || safeVal(provider?.country) || "your area";

  const roleLabel =
    safeVal(provider?.identify_yourself) ||
    selectedService?.serviceSubCategoryName ||
    services[0]?.serviceSubCategoryName ||
    "Service Provider";

  const isVerified =
    provider?.account_verified === 1 || provider?.is_verified === "1";

  const serviceChips = useMemo(() => {
    const names = services
      .map((s) => s.serviceSubCategoryName)
      .filter(Boolean);
    return [...new Set(names)].slice(0, 8);
  }, [services]);

  const galleryImages = useMemo(() => {
    const items = [];
    services.forEach((svc) => {
      if (Array.isArray(svc.images)) {
        svc.images.forEach((img) => {
          if (img && items.length < 6) {
            items.push({
              src: serviceImageUrl(img),
              label: svc.serviceSubCategoryName || "Service",
            });
          }
        });
      }
    });
    return items;
  }, [services]);

  const minPrice = useMemo(() => {
    return services.reduce((min, svc) => {
      const price = Number(svc.price);
      if (!price || Number.isNaN(price)) return min;
      return min === null || price < min ? price : min;
    }, null);
  }, [services]);

  const bookServiceId =
    serviceIdParam ||
    (services.length === 1 ? services[0]._id : services[0]?._id);

  const profileImageSrc = userImageUrl(provider);
  const hasProfileImage = Boolean(provider?.profile_image);

  const openServiceDetail = (svcId) => {
    if (!svcId) return;
    navigate(`/customer-service-detail?service_id=${svcId}`);
  };

  const handleMessage = () => {
    if (!provider?._id) return;
    const returnPath = `/messages?userID=${provider._id}`;
    if (!isLoggedIn()) {
      redirectToLogin(navigate, returnPath);
      return;
    }
    navigate(returnPath);
    localStorage.setItem("reciverID", provider._id);
  };

  const handleBook = () => {
    if (!bookServiceId) return;
    openServiceDetail(bookServiceId);
  };

  const handleMap = () => {
    if (!provider?.location?.coordinates) return;
    setMapData({
      coordinates: provider.location.coordinates,
      address: street || displayName,
    });
    setShowMapModal(true);
  };

  if (loading && !profile) {
    return (
      <Layout footerVariant="marketing">
        <Loader />
      </Layout>
    );
  }

  if (!loading && !provider) {
    return (
      <Layout footerVariant="marketing">
        <div className="simba-page p-profile">
          <div className="wrap">
            <p style={{ padding: "40px 0" }}>Service provider not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-profile" ref={pageRef}>
        <div className="wrap">
          <div className="crumbs">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
              Home
            </a>
            <span>/</span>
            <a
              href="/near-by-services"
              onClick={(e) => {
                e.preventDefault();
                navigate("/near-by-services");
              }}
            >
              Providers
            </a>
            <span>/</span>
            <a
              href="/near-by-services"
              onClick={(e) => {
                e.preventDefault();
                navigate("/near-by-services");
              }}
            >
              {primaryCategory}
            </a>
            <span>/</span>
            <span className="here">{displayName}</span>
          </div>
        </div>

        <section className="phero">
          <div className="wrap">
            <div className="phero-card">
              <div className="phero-inner">
                <div
                  className="phero-avatar"
                  style={{
                    background: hasProfileImage
                      ? "transparent"
                      : "linear-gradient(145deg,#13705C,#0A4338)",
                  }}
                >
                  {hasProfileImage ? (
                    <img
                      src={profileImageSrc}
                      alt={displayName}
                      onError={handleUserImageError}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "inherit",
                      }}
                    />
                  ) : (
                    initials(displayName)
                  )}
                  <span className="av-dot" />
                </div>

                <div className="phero-info">
                  <div className="phero-name">
                    <h1>{displayName}</h1>
                    {isVerified && (
                      <span className="badge-verified">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#3a2a07"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m20 6-11 11-5-5" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="phero-role">{roleLabel}</div>
                  <div className="phero-tags">
                    <span className="pt">
                      <span className="stars">{starsText(averageRating)}</span>
                      <b>{Number(averageRating).toFixed(1)}</b>
                      <span style={{ opacity: 0.8, fontWeight: 600 }}>
                        ({feedbackCount} reviews)
                      </span>
                    </span>
                    {locationLabel && (
                      <span className="pt">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        <span>{locationLabel}</span>
                      </span>
                    )}
                    {distanceKm != null && (
                      <span className="pt">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <path d="M12 7v5l3 2" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                        <span>{distanceKm} km from you</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="phero-actions">
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={handleBook}
                    disabled={!bookServiceId}
                  >
                    Book now
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleMessage}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                    </svg>
                    Message
                  </button>
                </div>
              </div>

              <div className="pstats">
                <div className="pstat">
                  <b>{completedJobsCount}</b>
                  <span>Jobs completed</span>
                </div>
                <div className="pstat">
                  <b>{services.length}</b>
                  <span>Services listed</span>
                </div>
                <div className="pstat">
                  <b>{Number(averageRating).toFixed(1)}</b>
                  <span>Average rating</span>
                </div>
                <div className="pstat">
                  <b>{distanceKm != null ? `${distanceKm} km` : "—"}</b>
                  <span>Distance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pbody">
          <div className="wrap pgrid">
            <div className="main">
              {serviceChips.length > 0 && (
                <div className="card reveal">
                  <h2>
                    <span className="hico">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21a8 8 0 0 1 16 0" />
                      </svg>
                    </span>
                    About
                  </h2>
                  <div className="about-text">
                    <p>
                      {displayName} offers {services.length} service
                      {services.length === 1 ? "" : "s"} across {primaryCategory}
                      {locationLabel ? ` in ${locationLabel}` : ""}.
                      {completedJobsCount > 0
                        ? ` ${completedJobsCount} completed job${completedJobsCount === 1 ? "" : "s"} on Simba Tasker.`
                        : ""}
                    </p>
                  </div>
                  <div className="chips">
                    {serviceChips.map((chip) => (
                      <span className="chip" key={chip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="card reveal">
                <h2>
                  <span className="hico">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 7h-9M14 17H5M17 14l3 3-3 3M7 4 4 7l3 3" />
                    </svg>
                  </span>
                  Services &amp; pricing
                </h2>
                <p className="lead">
                  Browse what this provider offers and typical pricing.
                </p>
                {services.length > 0 ? (
                  <div className="svc-list">
                    {services.map((svc) => {
                      const catName =
                        svc.serviceCategoryId?.service_category_name || "";
                      return (
                        <button
                          type="button"
                          key={svc._id}
                          className="svc"
                          onClick={() => openServiceDetail(svc._id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                            border: "none",
                            font: "inherit",
                          }}
                        >
                          <div className="svc-ico">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
                            </svg>
                          </div>
                          <div className="svc-txt">
                            <b>{svc.serviceSubCategoryName || "Service"}</b>
                            <small>{catName || "General service"}</small>
                          </div>
                          <span className="svc-price">
                            {svc.price
                              ? `From $${Number(svc.price).toFixed(2)}`
                              : "Quote"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="lead">No services listed for this provider yet.</p>
                )}
              </div>

              {galleryImages.length > 0 && (
                <div className="card reveal">
                  <h2>
                    <span className="hico">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.5-3.5L9 20" />
                      </svg>
                    </span>
                    Recent work
                  </h2>
                  <p className="lead">Photos from this provider&apos;s services.</p>
                  <div className="gallery">
                    {galleryImages.map((item, idx) => (
                      <div className="gimg" key={`${item.src}-${idx}`}>
                        <img
                          src={item.src}
                          alt={item.label}
                          onError={handleCategoryImageError}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            position: "absolute",
                            inset: 0,
                          }}
                        />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card reveal" id="reviews">
                <h2>
                  <span className="hico">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
                    </svg>
                  </span>
                  Reviews
                </h2>

                {feedbackCount > 0 ? (
                  <>
                    <div className="rev-summary">
                      <div className="rev-score">
                        <b>{Number(averageRating).toFixed(1)}</b>
                        <span className="stars">{starsText(averageRating)}</span>
                        <span>{feedbackCount} reviews</span>
                      </div>
                      <div className="rev-bars">
                        {ratingBars.map((bar) => (
                          <div className="rbar" key={bar.star}>
                            <span>{bar.star}</span>
                            <div className="track">
                              <div
                                className="fill"
                                style={{ width: `${bar.pct}%` }}
                              />
                            </div>
                            <span>{bar.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {feedbacks.slice(0, 6).map((feedback) => {
                      const reviewerName =
                        feedback?.user_id?.full_name || "Customer";
                      const reviewerImg = userImageUrl(feedback?.user_id);
                      const hasReviewerImg = Boolean(
                        feedback?.user_id?.profile_image
                      );
                      return (
                        <div className="review" key={feedback._id}>
                          {hasReviewerImg ? (
                            <img
                              className="rev-av"
                              src={reviewerImg}
                              alt={reviewerName}
                              onError={handleUserImageError}
                              style={{
                                objectFit: "cover",
                                background: "var(--primary-soft)",
                              }}
                            />
                          ) : (
                            <div
                              className="rev-av"
                              style={{
                                background:
                                  "linear-gradient(145deg,#2B5FC2,#1d3f82)",
                              }}
                            >
                              {initials(reviewerName)}
                            </div>
                          )}
                          <div className="rev-main">
                            <div className="rev-head">
                              <b>{reviewerName}</b>
                              <span className="when">
                                {formatReviewDate(feedback?.createdAt)}
                              </span>
                            </div>
                            <div className="rev-stars">
                              {starsText(feedback?.rating)}
                            </div>
                            <div className="rev-body">{feedback?.message}</div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="lead">No reviews yet.</p>
                )}
              </div>
            </div>

            <aside className="side" id="book">
              <div className="booking">
                <div className="price">
                  <b>{minPrice != null ? `$${minPrice.toFixed(0)}` : "Quote"}</b>
                  {minPrice != null && <span>/ service</span>}
                </div>
                <div className="resp">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 7v5l3 2" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  {completedJobsCount > 0
                    ? `${completedJobsCount} jobs completed`
                    : "New on Simba Tasker"}
                </div>

                {locationLabel && (
                  <div className="book-row">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    Service area <b>{street || locationLabel}</b>
                  </div>
                )}

                {distanceKm != null && (
                  <div className="book-row">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 7v5l3 2" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    Distance <b>{distanceKm} km</b>
                  </div>
                )}

                <div className="book-row">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Status{" "}
                  <b style={{ color: "var(--primary)" }}>
                    {isVerified ? "Verified pro" : "Provider"}
                  </b>
                </div>

                <div className="book-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={handleBook}
                    disabled={!bookServiceId}
                  >
                    Book this provider
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-block"
                    onClick={handleMessage}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                    </svg>
                    Message provider
                  </button>
                  {provider?.location?.coordinates && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-block"
                      onClick={handleMap}
                    >
                      View on map
                    </button>
                  )}
                </div>

                <div className="guarantee">
                  <svg
                    width="20"
                    height="20"
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
                  <span>
                    Protected by Simba Tasker. Pay securely and only release funds
                    when the job is done right.
                  </span>
                </div>
              </div>

              <div className="mini">
                <h4>Verifications</h4>
                <div className="verif-row">
                  <span className="vchk">
                    {provider?.email_verified === 1 ? (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    ) : (
                      "—"
                    )}
                  </span>
                  Identity {provider?.email_verified === 1 ? "verified" : "pending"}
                </div>
                <div className="verif-row">
                  <span className="vchk">
                    {provider?.phone_verified === 1 ? (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    ) : (
                      "—"
                    )}
                  </span>
                  Phone number{" "}
                  {provider?.phone_verified === 1 ? "confirmed" : "pending"}
                </div>
                <div className="verif-row">
                  <span className="vchk">
                    {isVerified ? (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m20 6-11 11-5-5" />
                      </svg>
                    ) : (
                      "—"
                    )}
                  </span>
                  Account {isVerified ? "verified" : "pending"}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {similarProviders.length > 0 && (
          <section className="section">
            <div className="wrap">
              <div className="sec-head reveal">
                <h2>Similar providers in {areaLabel}</h2>
                <p>
                  Other top-rated {primaryCategory.toLowerCase()} you might also
                  consider.
                </p>
              </div>
              <div className="sim-grid">
                {similarProviders.map((item) => {
                  const sp = item.serviceProvider || {};
                  const name = providerDisplayName(sp);
                  const loc = providerLocation(sp);
                  const verified = providerIsVerified(sp);
                  const rating = item.averageRating || 0;
                  const reviews = item.reviewCount || 0;
                  const rate = formatPrice(item.price);
                  const color = avatarColor(name);
                  const pid = sp._id;
                  const sid = item._id;

                  return (
                    <div className="prov-card" key={item._id}>
                      <div className="prov-top">
                        <div
                          className="avatar"
                          style={{
                            background: `linear-gradient(145deg,${color},${color}cc)`,
                          }}
                        >
                          {providerInitials(name)}
                        </div>
                        <div className="prov-id">
                          <h4>
                            {name}
                            {verified && (
                              <span className="verified" title="Verified">
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#fff"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m20 6-11 11-5-5" />
                                </svg>
                              </span>
                            )}
                          </h4>
                          <div className="role">
                            {item.serviceSubCategoryName || roleLabel}
                          </div>
                          <div className="loc">{loc}</div>
                        </div>
                      </div>
                      <div className="prov-meta">
                        <div className="rating">
                          <span className="stars">{starsText(rating)}</span>
                          {Number(rating).toFixed(1)}
                          <span className="rev">({reviews})</span>
                        </div>
                        <span className="chip-rate">{rate}</span>
                      </div>
                      <div className="prov-foot">
                        <button
                          type="button"
                          className="view-btn"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            navigate(
                              `/service-provider/${pid}?serviceId=${sid}`
                            )
                          }
                        >
                          View profile
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {minPrice != null && (
          <div className="mobile-cta">
            <span className="mc-price">
              ${minPrice.toFixed(0)}
              <small style={{ fontWeight: 600, color: "var(--muted)" }}>
                /service
              </small>
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBook}
              disabled={!bookServiceId}
            >
              Book now
            </button>
          </div>
        )}
      </div>

      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Provider Location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="comman-small-pop text-center">
            <MapComponent
              coordinates={mapData.coordinates}
              address={mapData.address}
            />
          </div>
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
