import { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import SimbaPager from "../CommanComponents/SimbaPager";
import Loader from "../CommanComponents/Loader";
import MapComponent from "../CommanComponents/MapComponent";
import { setCustomer } from "../Redux/Reducers/LoginSlice";
import {
  avatarColor,
  handleCategoryImageError,
  handleUserImageError,
  productImageUrl,
  providerInitials,
  userImageUrl,
} from "../utils/landingUtils";

const TABS = [
  { key: "business-details", label: "Business Details" },
  { key: "products", label: "Products" },
  { key: "reviews", label: "Customer Reviews" },
];

function safeVal(value) {
  if (value == null || value === "" || value === "undefined" || value === "null") {
    return null;
  }
  return String(value).trim() || null;
}

function starsText(rating) {
  const filled = Math.round(Number(rating) || 0);
  return "★★★★★".slice(0, filled) + "☆☆☆☆☆".slice(0, 5 - filled);
}

function formatReviewDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRatingBars(feedbacks) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  feedbacks.forEach((item) => {
    const rating = Math.round(Number(item.rating) || 0);
    if (rating >= 1 && rating <= 5) counts[rating] += 1;
  });
  const total = feedbacks.length || 1;
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    pct: Math.round((counts[star] / total) * 100),
  }));
}

function corporateStreet(corp) {
  const parts = [safeVal(corp?.house_number), safeVal(corp?.street_address)].filter(
    Boolean
  );
  return parts.join(", ") || null;
}

function corporateMapAddress(corp, street, companyAddress, displayName) {
  return (
    street ||
    companyAddress ||
    safeVal(corp?.street_address) ||
    safeVal(corp?.address) ||
    displayName
  );
}

function corporateMapCoordinates(corp) {
  const coords =
    corp?.location?.coordinates || corp?._doc?.location?.coordinates || null;
  return coords;
}

function InfoRow({ label, value }) {
  return (
    <div className="corp-info-row">
      <span>{label}</span>
      <b>{value || "N/A"}</b>
    </div>
  );
}

export default function SuggestedCorporatePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: userId } = useParams();
  const [searchParams] = useSearchParams();

  const [showMapModal, setShowMapModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [leadFilter] = useState("all");
  const [searchText] = useState("");
  const [activeTab, setActiveTab] = useState(
    searchParams.get("page") || "business-details"
  );

  const [corpoProfile, setCorpoProfile] = useState(null);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [packageDetails, setPackageDetails] = useState("");
  const [role, setRole] = useState("");

  const visibleTabs = useMemo(
    () =>
      String(role) === "2"
        ? TABS.filter((tab) => tab.key !== "products")
        : TABS,
    [role]
  );

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || "business-details");
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    const fetchCorporateInfo = async () => {
      if (!userId) return;
      setLoading(true);
      const customerId = localStorage.getItem("userId");
      try {
        const response = await dispatch(
          CustomerActions.corpoInfoProductListUser({
            userId,
            page,
            limit,
            status: leadFilter,
            search: searchText,
            customerId,
          })
        );

        const payload = response?.payload;
        setCorpoProfile(payload?.corporateUser || null);
        setProductList(Array.isArray(payload?.data) ? payload.data : []);
        setReviews(payload?.feedback || []);
        setTotalPages(
          Number(payload?.totalPages) ||
            Math.max(
              1,
              Math.ceil((payload?.totalItems || payload?.data?.length || 0) / limit)
            )
        );
      } catch (err) {
        console.error("Fetch error:", err);
        setCorpoProfile(null);
        setProductList([]);
        setReviews([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchCorporateInfo();
    getProfileApiCall();
  }, [dispatch, userId, page, limit, leadFilter, searchText]);

  const getProfileApiCall = async () => {
    try {
      const apiRes = await dispatch(CustomerActions.getProfileWithSuscription());
      if (apiRes?.payload?.success) {
        dispatch(setCustomer(apiRes?.payload?.data.user));
      }
      const isSubscribed = apiRes?.payload?.data?.user?.isSubscribed;
      setRole(apiRes?.payload?.data?.user?.role ?? "");
      setPackageDetails(isSubscribed === 1);
    } catch (error) {
      console.error("Subscription check failed:", error);
    }
  };

  const isSubscriptionExpired = () => !packageDetails;

  const guardSpAction = (action) => {
    if (String(role) === "2" && isSubscriptionExpired()) {
      setShowPlanModal(true);
      return;
    }
    action();
  };

  const displayName = safeVal(corpoProfile?.full_name) || "Corporate";
  const categoryName =
    safeVal(corpoProfile?.corporateCategoryId?.name) || "Corporate supplier";
  const hasProfileImage = Boolean(safeVal(corpoProfile?.profile_image));
  const profileImageSrc = userImageUrl(corpoProfile);
  const isVerified =
    corpoProfile?.account_verified === 1 || Boolean(corpoProfile?.email_verified);
  const street = corporateStreet(corpoProfile);
  const companyAddress = safeVal(corpoProfile?.address);
  const reviewCount = reviews.length;
  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return (
      reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0) /
      reviews.length
    );
  }, [reviews]);
  const ratingBars = useMemo(() => getRatingBars(reviews), [reviews]);

  const handleChat = () => {
    guardSpAction(() => {
      if (!corpoProfile?._id) return;
      navigate(`/messages?userID=${corpoProfile._id}`);
      localStorage.setItem("reciverID", corpoProfile._id);
    });
  };

  const handleCall = () => {
    guardSpAction(() => {
      const phone = corpoProfile?.phone_number;
      if (phone) window.location.href = `tel:${phone}`;
    });
  };

  const handleMap = () => {
    guardSpAction(() => setShowMapModal(true));
  };

  if (loading && !corpoProfile) {
    return (
      <Layout footerVariant="marketing">
        <div className="simba-page p-profile p-corp-profile">
          <div className="corp-profile-loading">
            <Loader />
          </div>
        </div>
      </Layout>
    );
  }

  if (!loading && !corpoProfile) {
    return (
      <Layout footerVariant="marketing">
        <div className="simba-page p-profile p-corp-profile">
          <div className="wrap">
            <div className="corp-profile-empty">
              <h3>Corporate profile not found</h3>
              <p>This supplier may no longer be available.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate(-1)}>
                Go back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-profile p-corp-profile">
        <div className="wrap">
          <div className="corp-profile-topbar">
            <button type="button" className="corp-back" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="crumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/corporate-list">Corporate</Link>
              <span>/</span>
              <span className="here">{displayName}</span>
            </div>
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
                      : `linear-gradient(145deg,${avatarColor(displayName)},#0A4338)`,
                  }}
                >
                  {hasProfileImage ? (
                    <img
                      src={profileImageSrc}
                      alt={displayName}
                      onError={handleUserImageError}
                    />
                  ) : (
                    providerInitials(displayName)
                  )}
                  <span className="av-dot" />
                </div>

                <div className="phero-info">
                  <div className="phero-name">
                    <h1>{displayName}</h1>
                    {isVerified && (
                      <span className="badge-verified">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3a2a07" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m20 6-11 11-5-5" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="phero-role">{categoryName}</div>
                  <div className="phero-tags">
                    <span className="pt">
                      <span className="stars">{starsText(averageRating)}</span>
                      <b>{averageRating.toFixed(1)}</b>
                      <span style={{ opacity: 0.8, fontWeight: 600 }}>
                        ({reviewCount} reviews)
                      </span>
                    </span>
                    {(companyAddress || street) && (
                      <span className="pt">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        <span>{companyAddress || street}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="phero-actions">
                  <button type="button" className="btn btn-gold" onClick={handleChat}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                    </svg>
                    Direct Chat
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleCall}>
                    Call Now
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleMap}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    Map
                  </button>
                </div>
              </div>

              <div className="pstats">
                <div className="pstat">
                  <b>{productList.length}</b>
                  <span>Products listed</span>
                </div>
                <div className="pstat">
                  <b>{reviewCount}</b>
                  <span>Customer reviews</span>
                </div>
                <div className="pstat">
                  <b>{averageRating.toFixed(1)}</b>
                  <span>Average rating</span>
                </div>
                <div className="pstat">
                  <b>{corpoProfile?.status === 1 ? "Active" : "Inactive"}</b>
                  <span>Account status</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pbody">
          <div className="wrap">
            <div className="corp-tab-nav">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`corp-tab${activeTab === tab.key ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "business-details" && (
              <div className="card reveal in">
                <h2>
                  <span className="hico">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                    </svg>
                  </span>
                  Business Details
                </h2>
                <p className="lead">Contact information and company profile.</p>

                <div className="corp-detail-layout">
                  <div className="corp-detail-photo">
                    {hasProfileImage ? (
                      <img
                        src={profileImageSrc}
                        alt={displayName}
                        onError={handleUserImageError}
                      />
                    ) : (
                      <div
                        className="corp-detail-photo-fallback"
                        style={{
                          background: `linear-gradient(145deg,${avatarColor(displayName)},#0A4338)`,
                        }}
                      >
                        {providerInitials(displayName)}
                      </div>
                    )}
                  </div>

                  <div className="corp-info-grid">
                    <InfoRow label="Company name" value={displayName} />
                    <InfoRow label="Profession type" value={categoryName} />
                    <InfoRow label="Email" value={corpoProfile?.email} />
                    <InfoRow label="Phone" value={corpoProfile?.phone_number} />
                    <InfoRow label="Street address" value={street} />
                    <InfoRow label="Company address" value={companyAddress} />
                    <InfoRow
                      label="Verified"
                      value={isVerified ? "Yes" : "No"}
                    />
                    <InfoRow
                      label="Status"
                      value={corpoProfile?.status === 1 ? "Active" : "Inactive"}
                    />
                  </div>
                </div>

                <div className="corp-detail-actions">
                  <button type="button" className="btn btn-ghost corp-action-btn" onClick={handleChat}>
                    Direct Chat
                  </button>
                  <button type="button" className="btn btn-gold corp-action-btn" onClick={handleCall}>
                    Call Now
                  </button>
                  <button type="button" className="btn btn-ghost corp-action-btn" onClick={handleMap}>
                    View on Map
                  </button>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="card reveal in">
                <h2>
                  <span className="hico">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </span>
                  Products
                </h2>
                <p className="lead">Browse products offered by this corporate supplier.</p>

                {productList.length > 0 ? (
                  <>
                    <div className="corp-product-grid">
                      {productList.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          className="corp-product-card"
                          onClick={() => navigate(`/product-detail/${product._id}`)}
                        >
                          <div className="corp-product-img">
                            <img
                              src={productImageUrl(product.images?.[0] || "")}
                              alt={product?.name || "Product"}
                              onError={handleCategoryImageError}
                            />
                          </div>
                          <div className="corp-product-body">
                            <h4>{product?.name || "Product"}</h4>
                            <p>{product?.description || "No description"}</p>
                            <span className="corp-product-price">
                              ${Number(product?.price || 0).toFixed(2)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="corp-profile-pager">
                      <SimbaPager
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                      />
                    </div>
                  </>
                ) : (
                  <div className="corp-profile-empty inline">
                    <h3>No products yet</h3>
                    <p>This corporate has not listed any products.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="card reveal in">
                <h2>
                  <span className="hico">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
                    </svg>
                  </span>
                  Customer Reviews
                </h2>

                {reviews.length > 0 ? (
                  <>
                    <div className="rev-summary">
                      <div className="rev-score">
                        <b>{averageRating.toFixed(1)}</b>
                        <span className="stars">{starsText(averageRating)}</span>
                        <span>{reviewCount} reviews</span>
                      </div>
                      <div className="rev-bars">
                        {ratingBars.map((bar) => (
                          <div className="rbar" key={bar.star}>
                            <span>{bar.star}</span>
                            <div className="track">
                              <div className="fill" style={{ width: `${bar.pct}%` }} />
                            </div>
                            <span>{bar.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {reviews.map((review) => {
                      const reviewerName =
                        safeVal(review.user_id?.full_name) || "Customer";
                      return (
                        <div className="review" key={review._id}>
                          <img
                            className="corp-review-avatar"
                            src={userImageUrl(review.user_id)}
                            alt={reviewerName}
                            onError={handleUserImageError}
                          />
                          <div className="rev-main">
                            <div className="rev-head">
                              <b>{reviewerName}</b>
                              <span className="when">
                                {formatReviewDate(review.createdAt)}
                              </span>
                            </div>
                            <div className="rev-stars">
                              {starsText(review.rating)}
                            </div>
                            <div className="rev-body">{review.message || ""}</div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="corp-profile-empty inline">
                    <h3>No reviews yet</h3>
                    <p>Be the first to leave feedback for this corporate.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <Modal show={showMapModal} onHide={() => setShowMapModal(false)} centered size="lg">
          <Modal.Header closeButton className="border-none pb-0">
            <Modal.Title>Business Location</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="comman-small-pop text-center">
              <MapComponent
                coordinates={corporateMapCoordinates(corpoProfile)}
                address={corporateMapAddress(
                  corpoProfile,
                  street,
                  companyAddress,
                  displayName
                )}
              />
            </div>
          </Modal.Body>
        </Modal>

        <Modal
          show={showPlanModal}
          onHide={() => setShowPlanModal(false)}
          centered
          backdrop="static"
          keyboard={false}
        >
          <Modal.Body>
            <div className="comman-small-pop">
              <h3>Upgrade Plan</h3>
              <div className="d-flex justify-content-center download-app-section mt-2">
                Please subscribe to our plan to access this feature
              </div>
              <div className="d-flex justify-content-center mt-3">
                <button
                  type="button"
                  className="primaryBtn"
                  onClick={() => navigate("/payment")}
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </Layout>
  );
}
