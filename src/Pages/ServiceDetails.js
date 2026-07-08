import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import Loader from "../CommanComponents/Loader";
import StarRating from "../CommanComponents/StarRating";
import DeleteConfirmation from "../CommanComponents/Modals/DeleteConfirmation";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { timeSchedule, weekDays } from "../utils/rawjson";
import {
  formatDisplayTitle,
  handleCategoryImageError,
  handleUserImageError,
  serviceImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import {
  normalizeMongoId,
  serviceEditPath,
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

function formatReviewDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeSlot(time) {
  if (!time) return "";
  return String(time).replace(
    /(\d{1,2})\s*(am|pm)\s*[-–—]\s*(\d{1,2})\s*(am|pm)/i,
    (_, p1, p2, p3, p4) =>
      `${parseInt(p1, 10)} ${p2.toLowerCase()} – ${parseInt(p3, 10)} ${p4.toLowerCase()}`
  );
}

export default function ServiceDetails() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: routeId } = useParams();
  const serviceId = normalizeMongoId(routeId);

  const serviceDetail = useSelector((e) => e.service.serviceDetail);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    dispatch(ServiceActions.getMyServiceDetailById({ id: serviceId }))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, serviceId]);

  const title = formatDisplayTitle(
    serviceDetail?.serviceSubCategoryName,
    "Service details"
  );
  const categoryName = formatDisplayTitle(
    serviceDetail?.serviceCategoryId?.service_category_name,
    "Category"
  );
  const images = serviceDetail?.images?.length ? serviceDetail.images : [];
  const mainImage = images[0];
  const sideImages = images.slice(1, 3);
  const feedbacks = serviceDetail?.feedbacks || [];
  const price = serviceDetail?.price;

  const sortedDays = useMemo(() => {
    const days = serviceDetail?.availability?.[0]?.day;
    if (!Array.isArray(days)) return [];
    return [...days].sort((a, b) => {
      const aIndex = weekDays.indexOf(String(a).toLowerCase());
      const bIndex = weekDays.indexOf(String(b).toLowerCase());
      return aIndex - bIndex;
    });
  }, [serviceDetail]);

  const sortedTimes = useMemo(() => {
    const times = serviceDetail?.availability?.[0]?.timeArr;
    if (!Array.isArray(times)) return [];
    const normalizeTime = (t) =>
      String(t).toLowerCase().replace(/\s+/g, "").replace(/[-–—]/g, "-");
    return [...times].sort((a, b) => {
      const aIndex = timeSchedule.findIndex(
        (slot) => normalizeTime(slot) === normalizeTime(a)
      );
      const bIndex = timeSchedule.findIndex(
        (slot) => normalizeTime(slot) === normalizeTime(b)
      );
      return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex);
    });
  }, [serviceDetail]);

  const handleDelete = () => {
    if (!serviceDetail?._id) return;
    setIsDeleting(true);
    dispatch(
      ServiceActions.deleteMyServices({
        service_id: normalizeMongoId(serviceDetail._id),
      })
    )
      .then((res) => {
        if (res?.payload?.success) {
          toast.success(res?.payload?.message || "Service deleted.");
          navigate("/allmyservices");
        } else {
          toast.error(res?.payload?.message || "Could not delete service.");
        }
      })
      .finally(() => {
        setIsDeleting(false);
        setShowDeleteModal(false);
      });
  };

  return (
    <>
      <CorporatePageShell
        title={loading ? "Service details" : title}
        crumbLabel="Services"
        pageClass="p-corporate-portal p-sp-services p-sp-service-detail"
      >
        {loading ? (
          <div className="svc-loading">
            <Loader />
          </div>
        ) : !serviceDetail ? (
          <div className="empty">
            <h3>Service not found</h3>
            <p>This service may have been removed.</p>
            <Link to="/allmyservices" className="btn btn-primary">
              Back to My Services
            </Link>
          </div>
        ) : (
          <>
            <div className="sp-detail-hero">
              <div
                className={`sp-detail-gallery${
                  sideImages.length === 0 ? " sp-detail-gallery--single" : ""
                }`}
              >
                <div className="sp-detail-gallery-main">
                  {mainImage ? (
                    <img
                      src={serviceImageUrl(mainImage)}
                      alt={title}
                      onError={handleCategoryImageError}
                    />
                  ) : (
                    <PlaceholderImageIcon size={56} />
                  )}
                </div>
                {sideImages.length > 0 && (
                  <div className="sp-detail-gallery-side">
                    {sideImages.map((image, index) => (
                      <div key={index} className="sp-detail-gallery-thumb">
                        <img
                          src={serviceImageUrl(image)}
                          alt={`${title} ${index + 2}`}
                          onError={handleCategoryImageError}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sp-detail-info card">
                <div className="sp-detail-rating">
                  <StarRating
                    averageRating={serviceDetail?.averageRating}
                    reviewCount={feedbacks.length}
                  />
                </div>
                <h2>{title}</h2>
                <p className="sp-detail-category">{categoryName}</p>
                {serviceDetail?.desc && serviceDetail.desc !== "N/A" && (
                  <p className="sp-detail-desc">{serviceDetail.desc}</p>
                )}
                {price != null && price !== "" && (
                  <div className="sp-detail-price">
                    <b>${price}</b>
                    <span>starting price</span>
                  </div>
                )}
                <div className="sp-detail-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      navigate(serviceEditPath(serviceDetail?._id))
                    }
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            <div className="sp-detail-section card">
              <h3>Availability</h3>
              <p className="avail-label">Days</p>
              <div className="sp-chip-row">
                {sortedDays.length ? (
                  sortedDays.map((day) => (
                    <span key={day} className="sp-chip">
                      {String(day).charAt(0).toUpperCase() +
                        String(day).slice(1).toLowerCase()}
                    </span>
                  ))
                ) : (
                  <span className="sp-muted">No days set</span>
                )}
              </div>

              <p className="avail-label" style={{ marginTop: 18 }}>
                Time slots
              </p>
              <div className="sp-chip-row">
                {sortedTimes.length ? (
                  sortedTimes.map((time) => (
                    <span key={time} className="sp-chip sp-chip--time">
                      {formatTimeSlot(time)}
                    </span>
                  ))
                ) : (
                  <span className="sp-muted">No time slots set</span>
                )}
              </div>
            </div>

            <div className="sp-detail-section card">
              <h3>Reviews</h3>
              {feedbacks.length === 0 ? (
                <p className="sp-muted">No reviews yet.</p>
              ) : (
                <ul className="sp-review-list">
                  {feedbacks.map((feedback) => (
                    <li
                      key={feedback?._id || feedback?.createdAt}
                      className="sp-review"
                    >
                      <img
                        src={userImageUrl(feedback?.user_id)}
                        alt=""
                        onError={handleUserImageError}
                      />
                      <div className="sp-review-body">
                        <div className="sp-review-head">
                          <div>
                            <b>
                              {feedback?.user_id?.full_name || "Customer"}
                            </b>
                            <StarRating
                              averageRating={feedback?.rating}
                              type="noreview"
                            />
                          </div>
                          <span>{formatReviewDate(feedback?.createdAt)}</span>
                        </div>
                        {feedback?.message && <p>{feedback.message}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sp-detail-back">
              <Link to="/allmyservices" className="btn btn-ghost">
                Back to My Services
              </Link>
            </div>
          </>
        )}
      </CorporatePageShell>

      <DeleteConfirmation
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        message="Are you sure you want to delete this service?"
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
