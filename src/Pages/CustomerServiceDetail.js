import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../Components/Layout/Layout";
import CustomerActions from "../Redux/Actions/CustomerActions";
import CustomerBookServiceModal from "../CommanComponents/Modals/CustomerBookServiceModal";
import StarRating from "../CommanComponents/StarRating";
import MapComponent from "../CommanComponents/MapComponent";
import Loader from "../CommanComponents/Loader";
import facebookLogo from "../Assets/Images/facebook.svg";
import instagramLogo from "../Assets/Images/instagram.svg";
import linkIcon from "../Assets/Images/link.png";
import {
  avatarColor,
  handleCategoryImageError,
  handleProviderAvatarError,
  handleUserImageError,
  providerInitials,
  serviceImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import { isLoggedIn, redirectToLogin } from "../utils/authRedirect";
import { hasBookingDraftForService } from "../utils/bookingDraft";
import {
  customerServiceDetailPath,
  messagesPath,
  normalizeMongoId,
  persistReceiverId,
  serviceProviderPath,
} from "../utils/normalizeMongoId";

function PlaceholderImageIcon({ size = 46 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function safeVal(v) {
  return !v || v === "undefined" ? null : v;
}

function formatReviewDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function providerDisplayName(sp) {
  if (!sp) return "Provider";
  return (
    safeVal(sp.company_name) ||
    safeVal(sp.full_name) ||
    "Provider"
  );
}

export default function CustomerServiceDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const service_id = normalizeMongoId(searchParams.get("service_id"));

  const [show, setShow] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const serviceDetail = useSelector((e) => e.UserSlice.serviceDetail);
  const customerDetails = useSelector((e) => e.login.customerDetails);

  const detailReturnPath = customerServiceDetailPath(service_id);

  const buildWhatsAppUrl = () => {
    const sp = serviceDetail?.serviceProviderId;
    const providerName = providerDisplayName(sp);
    const categoryName =
      serviceDetail?.serviceSubCategoryName ||
      serviceDetail?.serviceCategoryId?.service_category_name ||
      "your service";
    const userLocation =
      safeVal(customerDetails?.street_address) ||
      safeVal(customerDetails?.suburbs) ||
      null;
    const message = [
      `Hi ${providerName}, I found you on Simba Tasker.`,
      `I need help with:`,
      `Service: ${categoryName}`,
      userLocation ? `Location: ${userLocation}` : null,
      `Please provide a quote. Thank you.`,
    ]
      .filter(Boolean)
      .join("\n");
    const phone = sp?.phone_number ? sp.phone_number.replace(/\D/g, "") : "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const handleShow = () => {
    setShow(true);
  };

  useEffect(() => {
    if (!service_id || !isLoggedIn()) return;

    const params = new URLSearchParams(location.search);
    const openBooking = params.get("openBooking") === "1";
    const hasDraft = hasBookingDraftForService(service_id);

    if (openBooking || hasDraft) {
      setShow(true);
      if (openBooking) {
        navigate(detailReturnPath, { replace: true });
      }
    }
  }, [service_id, location.search, navigate, detailReturnPath]);

  const handleMessageClick = () => {
    const providerId = serviceDetail?.serviceProviderId?._id;
    if (!providerId) return;
    const returnPath = messagesPath(providerId);
    if (!isLoggedIn()) {
      redirectToLogin(navigate, returnPath);
      return;
    }
    navigate(returnPath);
    persistReceiverId(providerId);
  };

  const handleWhatsAppClick = (e) => {
    if (!isLoggedIn()) {
      e.preventDefault();
      redirectToLogin(navigate, detailReturnPath);
      return;
    }
    dispatch(
      CustomerActions.logProviderEvent({
        provider_id: serviceDetail.serviceProviderId._id,
        serviceCategoryId: serviceDetail?.serviceCategoryId?._id,
        source: "profile",
      })
    ).catch(() => {});
  };

  useEffect(() => {
    if (service_id) {
      dispatch(CustomerActions.getServiceDetail({ service_id }));
    }
  }, [dispatch, service_id]);

  const images = serviceDetail?.images?.length > 0 ? serviceDetail.images : [];
  const mainImage = images[0];
  const sideImages = images.slice(1, 3);
  const feedbacks = serviceDetail?.feedbacks || [];
  const sp = serviceDetail?.serviceProviderId;
  const providerName = providerDisplayName(sp);
  const categoryName =
    serviceDetail?.serviceCategoryId?.service_category_name || "Service";
  const providerLoc =
    safeVal(sp?.street_address) || safeVal(sp?.suburbs) || null;
  const pColor = avatarColor(providerName);

  const validLink = (v) => v && v !== "undefined";
  const toHref = (v) =>
    v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
  const hasSocial =
    validLink(sp?.facebook_link) ||
    validLink(sp?.instagram_link) ||
    validLink(sp?.website_link);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-taskdetails p-servicedetail">
        <main className="page">
          <div className="wrap">
            <div className="crumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/services">Services</Link>
              <span>/</span>
              <span style={{ color: "var(--ink)", opacity: 1 }}>
                {serviceDetail?.serviceSubCategoryName || "Service details"}
              </span>
            </div>

            <div className="page-head">
              <h1>{serviceDetail?.serviceSubCategoryName || "Service details"}</h1>
            </div>

            {!serviceDetail ? (
              <div className="svc-detail-loading">
                <Loader />
              </div>
            ) : (
              <div className="tgrid">
                <div className="main">
                  <div
                    className={`tgallery${
                      sideImages.length === 0 ? " tgallery--single" : ""
                    }`}
                  >
                    <div className="big">
                      {mainImage ? (
                        <img
                          src={serviceImageUrl(mainImage)}
                          alt={serviceDetail.serviceSubCategoryName || "Service"}
                          onError={handleCategoryImageError}
                        />
                      ) : (
                        <PlaceholderImageIcon />
                      )}
                    </div>
                    {sideImages.length > 0 && (
                      <div className="col">
                        {sideImages.map((image, index) => (
                          <div key={index} className="small">
                            <img
                              src={serviceImageUrl(image)}
                              alt={`Service ${index + 2}`}
                              onError={handleCategoryImageError}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2>{serviceDetail.serviceSubCategoryName || "N/A"}</h2>
                    <p className="svc-detail-sub">
                      {categoryName} · Service listing
                    </p>
                    {serviceDetail.desc && serviceDetail.desc !== "N/A" && (
                      <p className="svc-detail-desc">{serviceDetail.desc}</p>
                    )}
                    {serviceDetail.averageRating > 0 && (
                      <div className="svc-detail-rating">
                        <StarRating
                          averageRating={serviceDetail.averageRating}
                          reviewCount={feedbacks.length}
                        />
                      </div>
                    )}
                    {providerLoc && (
                      <div className="meta-row">
                        <span className="mi">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </span>
                        <div className="mtxt">
                          <small>Location</small>
                          <b>{providerLoc}</b>
                        </div>
                      </div>
                    )}
                  </div>

                  {sp?._id && (
                    <div className="card">
                      <h2>
                        <span className="hico">
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
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21a8 8 0 0 1 16 0" />
                          </svg>
                        </span>
                        Service Provider
                      </h2>
                      <div
                        className="prov-block svc-prov-click"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(serviceProviderPath(sp._id))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(serviceProviderPath(sp._id));
                          }
                        }}
                      >
                        <span
                          className="pav"
                          style={{
                            background: `linear-gradient(145deg,${pColor},${pColor}cc)`,
                          }}
                        >
                          <img
                            src={userImageUrl(sp)}
                            alt={providerName}
                            onError={(e) =>
                              handleProviderAvatarError(
                                e,
                                providerInitials(providerName)
                              )
                            }
                          />
                        </span>
                        <div className="pinfo">
                          <b>
                            {providerName}
                            <span className="verified" title="Provider">
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
                          </b>
                          {safeVal(sp?.email) && <small>{sp.email}</small>}
                          {providerLoc && <small>{providerLoc}</small>}
                        </div>
                        <div className="prov-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Message"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMessageClick();
                            }}
                          >
                            <svg
                              width="19"
                              height="19"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="View on map"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMapModal(true);
                            }}
                          >
                            <svg
                              width="19"
                              height="19"
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
                          </button>
                        </div>
                      </div>
                      {hasSocial && (
                        <div className="svc-social">
                          {validLink(sp.facebook_link) && (
                            <a
                              href={toHref(sp.facebook_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img src={facebookLogo} alt="Facebook" />
                            </a>
                          )}
                          {validLink(sp.instagram_link) && (
                            <a
                              href={toHref(sp.instagram_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img src={instagramLogo} alt="Instagram" />
                            </a>
                          )}
                          {validLink(sp.website_link) && (
                            <a
                              href={toHref(sp.website_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <img src={linkIcon} alt="Website" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card">
                    <h2>
                      <span className="hico">
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
                          <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
                        </svg>
                      </span>
                      Reviews
                    </h2>
                    {feedbacks.length === 0 ? (
                      <p className="svc-detail-empty">No reviews yet.</p>
                    ) : (
                      <ul className="svc-review-list">
                        {feedbacks.map((feedback, index) => (
                          <li key={feedback?._id || index} className="svc-review">
                            <img
                              src={userImageUrl(feedback?.user_id)}
                              alt={feedback?.user_id?.full_name || "Customer"}
                              onError={handleUserImageError}
                            />
                            <div className="svc-review-body">
                              <div className="svc-review-head">
                                <b>{feedback?.user_id?.full_name || "Customer"}</b>
                                <span>{formatReviewDate(feedback?.createdAt)}</span>
                              </div>
                              <StarRating
                                averageRating={feedback?.rating}
                                type="noreview"
                              />
                              {feedback?.message && <p>{feedback.message}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <aside className="side">
                  <div className="summary">
                    <h3>Book this service</h3>
                    <div className="sum-row">
                      <span>Price</span>
                      <b>${serviceDetail.price ?? "N/A"}</b>
                    </div>
                    {serviceDetail.averageRating > 0 && (
                      <div className="sum-row">
                        <span>Rating</span>
                        <b>{Number(serviceDetail.averageRating).toFixed(1)} ★</b>
                      </div>
                    )}
                    <div className="sum-row">
                      <span>Category</span>
                      <b>{categoryName}</b>
                    </div>
                    <div className="sum-total">
                      <span>From</span>
                      <b>${serviceDetail.price ?? "—"}</b>
                    </div>
                    <div className="side-actions">
                      {serviceDetail.is_booked === 0 && (
                        <button
                          type="button"
                          className="btn btn-primary btn-block"
                          onClick={handleShow}
                        >
                          Book service
                        </button>
                      )}
                      {sp?._id && (
                        <a
                          href={isLoggedIn() ? buildWhatsAppUrl() : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-block svc-wa-btn"
                          onClick={handleWhatsAppClick}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="18"
                            height="18"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Get quote on WhatsApp
                        </a>
                      )}
                      {sp?._id && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-block"
                          onClick={handleMessageClick}
                        >
                          Message provider
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-block"
                        onClick={() => setShowMapModal(true)}
                      >
                        View on map
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </main>
      </div>

      <CustomerBookServiceModal
        show={show}
        setShow={setShow}
        service_id={service_id}
      />

      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Service Location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MapComponent
            coordinates={
              serviceDetail?.location?.coordinates ||
              serviceDetail?.serviceProviderId?.location?.coordinates
            }
            address={
              safeVal(sp?.street_address) ||
              safeVal(sp?.suburbs) ||
              providerLoc
            }
          />
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
