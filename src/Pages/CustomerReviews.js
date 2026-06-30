import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import ServiceActions from "../Redux/Actions/ServiceActions";
import {
  avatarColor,
  handleReviewAvatarError,
  userImageUrl,
} from "../utils/landingUtils";

const TABS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
];

const EMPTY_COPY = {
  all: {
    title: "No Reviews Yet",
    text: "Currently you don't have any reviews.",
  },
  published: {
    title: "No Published Reviews Yet",
    text: "Currently you don't have any published reviews.",
  },
  rejected: {
    title: "No Rejected Reviews Yet",
    text: "Currently you don't have any rejected reviews.",
  },
};

function ReviewStars({ rating }) {
  const value = Math.round(Number(rating) || 0);
  return (
    <div className="rv-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? undefined : "off"}>
          ★
        </span>
      ))}
    </div>
  );
}

function getReviewStatus(review) {
  const status = Number(review?.status);
  if (status === 1) return "published";
  if (status === 2) return "rejected";
  return "pending";
}

export default function CustomerReviews() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("all");
  const reviewList = useSelector((e) => e.service.getReviewList);

  useEffect(() => {
    dispatch(ServiceActions.getCustomerReviews({}));
  }, [dispatch]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const getTaskLabel = (review) => {
    if (!review?.task_id) return null;
    const title = review?.task_id?.need_done || "Task";
    const taskDateRaw =
      review?.task_id?.when_done || review?.task_id?.createdAt;
    const taskDate = taskDateRaw ? formatDate(taskDateRaw) : null;
    return taskDate ? `${title} • ${taskDate}` : title;
  };

  const filteredReviews = () => {
    const list = Array.isArray(reviewList) ? reviewList : [];
    if (activeTab === "published") {
      return list.filter((review) => Number(review.status) === 1);
    }
    if (activeTab === "rejected") {
      return list.filter((review) => Number(review.status) === 2);
    }
    return list;
  };

  const handleReviewAction = (id, action) => {
    const status = action === "publish" ? 1 : 2;
    dispatch(ServiceActions.updateReviewStatus({ feedback_id: id, status })).then(
      (res) => {
        if (res?.payload?.success) {
          toast.success(
            action === "publish"
              ? "Review Published Successfully"
              : "Review Rejected Successfully"
          );
          dispatch(ServiceActions.getCustomerReviews({}));
        }
      }
    );
  };

  const reviews = filteredReviews();
  const empty = EMPTY_COPY[activeTab];

  return (
    <CorporatePageShell
      title="Customer Reviews"
      pageClass="p-reviews"
      showBanner={false}
    >
      <div className="tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`tab${activeTab === key ? " active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="reviews-grid">
        {reviews.length > 0 ? (
          reviews.map((review) => {
            const name = review.user_id?.full_name || "User";
            const status = getReviewStatus(review);
            const taskLabel = getTaskLabel(review);

            return (
              <div key={review._id} className="rv-card">
                <span className={`rv-badge ${status}`}>
                  {status === "published"
                    ? "Published"
                    : status === "rejected"
                      ? "Rejected"
                      : "Pending"}
                </span>
                <div className="rv-top">
                  <span
                    className="rv-av"
                    style={{ background: avatarColor(name) }}
                  >
                    <img
                      src={userImageUrl(review.user_id)}
                      alt=""
                      onError={(e) => handleReviewAvatarError(e, name)}
                    />
                  </span>
                  <div className="rv-id">
                    <b>{name}</b>
                    <ReviewStars rating={review?.rating} />
                    <div className="rv-date">{formatDate(review?.createdAt)}</div>
                  </div>
                </div>
                <div className="rv-text">{review.message || ""}</div>
                {taskLabel ? (
                  <div className="rv-task">
                    <span className="tpill">TASK</span> {taskLabel}
                  </div>
                ) : null}
                {status === "pending" ? (
                  <div className="rv-actions">
                    <button
                      type="button"
                      onClick={() => handleReviewAction(review._id, "publish")}
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction(review._id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="empty">
            <svg
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
            </svg>
            <h3>{empty.title}</h3>
            <p>{empty.text}</p>
          </div>
        )}
      </div>
    </CorporatePageShell>
  );
}
