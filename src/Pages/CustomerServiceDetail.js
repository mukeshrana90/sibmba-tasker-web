import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import Slider from "react-slick";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../Components/Layout/Layout";
import CustomerActions from "../Redux/Actions/CustomerActions";
import CustomerBookServiceModal from "../CommanComponents/Modals/CustomerBookServiceModal";
import StarRating from "../CommanComponents/StarRating";
import MapComponent from "../CommanComponents/MapComponent";
import Loader from "../CommanComponents/Loader";
import ProviderAvatar, {
  resolveCustomProfileImage,
} from "../CommanComponents/ProviderAvatar";
import facebookLogo from "../Assets/Images/facebook.svg";
import instagramLogo from "../Assets/Images/instagram.svg";
import whatsappLogo from "../Assets/Images/whatsapp.png";
import linkIcon from "../Assets/Images/link.png";
import {
  avatarColor,
  formatDisplayTitle,
  formatMoney,
  handleCategoryImageError,
  handleUserImageError,
  providerDisplayName,
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

function ServiceGalleryHero({ mainImage, provider, title }) {
  const providerImg = resolveCustomProfileImage(provider);
  const label = providerDisplayName(provider) || title || "SP";
  const initials = providerInitials(label);
  const color = avatarColor(label);
  const initialStage = mainImage
    ? "service"
    : providerImg
      ? "provider"
      : "initials";
  const [stage, setStage] = useState(initialStage);

  useEffect(() => {
    setStage(
      mainImage ? "service" : providerImg ? "provider" : "initials"
    );
  }, [mainImage, providerImg]);

  if (stage === "service" && mainImage) {
    return (
      <img
        src={serviceImageUrl(mainImage)}
        alt={title || "Service"}
        onError={() => setStage(providerImg ? "provider" : "initials")}
      />
    );
  }

  if (stage === "provider" && providerImg) {
    return (
      <img
        src={providerImg}
        alt={label}
        onError={() => setStage("initials")}
      />
    );
  }

  return (
    <div
      className="tgallery-fallback"
      style={{ background: `linear-gradient(145deg,${color},${color}cc)` }}
    >
      <span>{initials}</span>
    </div>
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

export default function CustomerServiceDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const service_id = normalizeMongoId(searchParams.get("service_id"));

  const [show, setShow] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const gallerySliderRef = useRef(null);

  const serviceDetail = useSelector((e) => e.UserSlice.serviceDetail);
  const customerDetails = useSelector((e) => e.login.customerDetails);

  const detailReturnPath = customerServiceDetailPath(service_id);

  const buildWhatsAppUrl = () => {
    const sp = serviceDetail?.serviceProviderId;
    const providerName = providerDisplayName(sp);
    const categoryName = formatDisplayTitle(
      serviceDetail?.serviceSubCategoryName ||
        serviceDetail?.serviceCategoryId?.service_category_name,
      "your service"
    );
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
  const categoryName = formatDisplayTitle(
    serviceDetail?.serviceCategoryId?.service_category_name,
    "Service"
  );
  const serviceTitle = formatDisplayTitle(
    serviceDetail?.serviceSubCategoryName,
    ""
  );
  const providerLoc =
    safeVal(sp?.street_address) || safeVal(sp?.suburbs) || null;
  const displayPrice = formatMoney(serviceDetail?.price);

  const galleryImages = useMemo(() => {
    const title = serviceTitle || providerName || "Service";
    const items = images
      .filter(Boolean)
      .map((img, idx) => ({
        src: serviceImageUrl(img),
        label: `${title}${images.length > 1 ? ` · ${idx + 1}` : ""}`,
      }));
    if (items.length > 0) return items;
    const providerImg = resolveCustomProfileImage(sp);
    if (providerImg) {
      return [{ src: providerImg, label: providerName || "Provider" }];
    }
    return [];
  }, [images, serviceTitle, providerName, sp]);

  const gallerySliderSettings = useMemo(
    () => ({
      dots: true,
      infinite: galleryImages.length > 1,
      speed: 400,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: galleryImages.length > 1,
      adaptiveHeight: false,
      initialSlide: activeGalleryIndex,
    }),
    [galleryImages.length, activeGalleryIndex]
  );

  const openGallery = (index = 0) => {
    if (galleryImages.length === 0) return;
    setActiveGalleryIndex(index);
    setShowGalleryModal(true);
  };

  useEffect(() => {
    if (!showGalleryModal || !gallerySliderRef.current) return;
    gallerySliderRef.current.slickGoTo(activeGalleryIndex);
  }, [showGalleryModal, activeGalleryIndex]);

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
                {serviceTitle || "Service details"}
              </span>
            </div>

            <div className="page-head">
              <h1>{serviceTitle || "Service details"}</h1>
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
                    <button
                      type="button"
                      className="big tgallery-open"
                      onClick={() => openGallery(0)}
                      disabled={galleryImages.length === 0}
                      aria-label="Open photo gallery"
                    >
                      <ServiceGalleryHero
                        mainImage={mainImage}
                        provider={sp}
                        title={serviceTitle || providerName}
                      />
                    </button>
                    {sideImages.length > 0 && (
                      <div className="col">
                        {sideImages.map((image, index) => (
                          <button
                            type="button"
                            key={index}
                            className="small tgallery-open"
                            onClick={() => openGallery(index + 1)}
                            aria-label={`Open photo ${index + 2}`}
                          >
                            <img
                              src={serviceImageUrl(image)}
                              alt={`Service ${index + 2}`}
                              onError={handleCategoryImageError}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2>{serviceTitle || "N/A"}</h2>
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
                        <ProviderAvatar
                          provider={sp}
                          name={providerName}
                          className="pav"
                          imgClassName="pav--img"
                        />
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
                          {safeVal(sp?.email) && (
                            <small className="pinfo-email">{sp.email}</small>
                          )}
                          {providerLoc && (
                            <small className="pinfo-address">{providerLoc}</small>
                          )}
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
                      <b>{displayPrice}</b>
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
                      <b>{displayPrice}</b>
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
                          className="btn btn-block svc-wa-btn"
                          onClick={handleWhatsAppClick}
                        >
                          <img
                            src={whatsappLogo}
                            alt=""
                            className="svc-wa-btn__icon"
                            width={20}
                            height={20}
                          />
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

      <Modal
        show={showGalleryModal}
        onHide={() => setShowGalleryModal(false)}
        centered
        dialogClassName="provider-gallery-modal__dialog"
        contentClassName="provider-gallery-modal__content"
        className="provider-gallery-modal"
      >
        <Modal.Header closeButton className="provider-gallery-modal__header">
          <Modal.Title>
            Service photos
            {galleryImages.length > 1 && (
              <span className="provider-gallery-modal__count">
                {activeGalleryIndex + 1} / {galleryImages.length}
              </span>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="provider-gallery-modal__body">
          {galleryImages.length > 0 && (
            <Slider
              ref={gallerySliderRef}
              key={`svc-gallery-${activeGalleryIndex}-${showGalleryModal}`}
              {...gallerySliderSettings}
              afterChange={(index) => setActiveGalleryIndex(index)}
              className="provider-gallery-carousel"
            >
              {galleryImages.map((item, idx) => (
                <div key={`${item.src}-${idx}`}>
                  <div className="provider-gallery-slide">
                    <div className="provider-gallery-modal__viewport">
                      <img
                        src={item.src}
                        alt={item.label}
                        onError={handleCategoryImageError}
                      />
                    </div>
                    <p className="provider-gallery-caption">{item.label}</p>
                  </div>
                </div>
              ))}
            </Slider>
          )}
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
