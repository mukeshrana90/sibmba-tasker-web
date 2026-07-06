import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import moment from "moment";
import BookingConfirmationModal from "../CommanComponents/Modals/BookingConfirmationModal";
import CancelModal from "../CommanComponents/Modals/CancelModal";
import SimbaPager from "../CommanComponents/SimbaPager";
import { bookingDetailPath } from "../utils/normalizeMongoId";
import { SimbaTaskTimeline } from "../CommanComponents/TaskDetail/SimbaTaskDetailParts";
import {
  formatDisplayTitle,
  handleUserImageError,
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import { getTaskFlowDescription, taskStatus } from "../utils/jobFlowStatus";

const TASK_TABS = [
  { key: "first", label: "Tasks" },
  { key: "second", label: "Quotation" },
  { key: "third", label: "Upcoming" },
  { key: "fourth", label: "Completed" },
];

const UPCOMING_PAGE_SIZE = 10;

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 7v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PlaceholderThumbIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty">
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

export default function ServiceTasks() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab");
  const allowedTabs = new Set(["first", "second", "third", "fourth"]);
  const [activeTab, setActiveTab] = useState(
    allowedTabs.has(initialTab) ? initialTab : "first"
  );
  const [isRequestModal, setIsRequestModal] = useState(false);
  const [showModalCancel, setShowModalCancel] = useState(false);
  const [ids] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [selectedCompletedTask, setSelectedCompletedTask] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTask, setDisputeTask] = useState(null);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [filteredData, setFilteredData] = useState({
    acceptedTasks: [],
    myQuotations: [],
    tasks: [],
    completedTasks: [],
  });
  const [upcomingPage, setUpcomingPage] = useState(1);
  const postTasksList = useSelector(
    (state) => state.service.getPostTaskService
  );
  const tasksPagination = postTasksList?.tasksPagination;

  const fetchPostTaskList = useCallback(() => {
    const base = {
      limit: UPCOMING_PAGE_SIZE,
    };

    if (activeTab === "third") {
      dispatch(
        ServiceActions.getPostTaskList({
          ...base,
          type: "tasks",
          page: upcomingPage,
        })
      );
      return;
    }

    dispatch(
      ServiceActions.getPostTaskList({
        ...base,
        page: 1,
      })
    );
  }, [activeTab, dispatch, upcomingPage]);

  useEffect(() => {
    fetchPostTaskList();
  }, [fetchPostTaskList]);

  const handleTabChange = (tab) => {
    setUpcomingPage(1);
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!postTasksList) return;

    const query = searchQuery.toLowerCase().trim();

    if (activeTab === "first") {
      const filteredAccepted = (postTasksList.acceptedTasks || []).filter(
        (task) =>
          task?.need_done?.toLowerCase().includes(query) ||
          task?.user_details?.full_name?.toLowerCase().includes(query)
      );
      setFilteredData({
        acceptedTasks: filteredAccepted,
        myQuotations: [],
        tasks: [],
        completedTasks: [],
      });
    } else if (activeTab === "second") {
      const filteredQuotations = (postTasksList.myQuotations || []).filter(
        (quotation) =>
          quotation?.need_done?.toLowerCase().includes(query) ||
          quotation?.user_details?.full_name?.toLowerCase().includes(query)
      );
      setFilteredData({
        acceptedTasks: [],
        myQuotations: filteredQuotations,
        tasks: [],
        completedTasks: [],
      });
    } else if (activeTab === "third") {
      const filteredTasks = (postTasksList.tasks || []).filter(
        (task) =>
          task?.need_done?.toLowerCase().includes(query) ||
          task?.user_details?.full_name?.toLowerCase().includes(query)
      );
      setFilteredData({
        acceptedTasks: [],
        myQuotations: [],
        tasks: filteredTasks,
        completedTasks: [],
      });
    } else if (activeTab === "fourth") {
      const filteredCompleted = (postTasksList.completedTasks || []).filter((task) => {
        const matchesQuery =
          task?.need_done?.toLowerCase().includes(query) ||
          task?.user_details?.full_name?.toLowerCase().includes(query);
        return Number(task?.status) === taskStatus.COMPLETED && matchesQuery;
      });
      setFilteredData({
        acceptedTasks: [],
        myQuotations: [],
        tasks: [],
        completedTasks: filteredCompleted,
      });
    }
  }, [postTasksList, searchQuery, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === activeTab) return;
    params.set("tab", activeTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [activeTab, location.pathname, location.search, navigate]);

  // useEffect(() => {
  //   if (!postTasksList) return;

  //   const filterData = () => {
  //     const query = searchQuery.toLowerCase().trim();

  //     if (!query) {
  //       // If search query is empty, show all data
  //       setFilteredData({
  //         acceptedTasks: postTasksList.tasks || [],
  //         myQuotations: postTasksList.myQuotations || [],
  //         tasks: postTasksList.acceptedTasks || [],
  //       });
  //       return;
  //     }

  //     // Filter based on active tab
  //     setFilteredData({
  //       acceptedTasks:
  //         activeTab === "first"
  //           ? (postTasksList.acceptedTasks || []).filter(
  //             (task) =>
  //               task?.need_done?.toLowerCase().includes(query) ||
  //               task?.user_details?.full_name?.toLowerCase().includes(query)
  //           )
  //           : postTasksList.acceptedTasks || [],
  //       myQuotations:
  //         activeTab === "second"
  //           ? (postTasksList.myQuotations || []).filter(
  //             (quotation) =>
  //               quotation?.need_done?.toLowerCase().includes(query) ||
  //               quotation?.user_details?.full_name?.toLowerCase().includes(query)
  //           )
  //           : postTasksList.myQuotations || [],
  //       tasks:
  //         activeTab === "third"
  //           ? (postTasksList.tasks || []).filter(
  //             (task) =>
  //               task?.need_done?.toLowerCase().includes(query) ||
  //               task?.user_details?.full_name?.toLowerCase().includes(query)
  //           )
  //           : postTasksList.tasks || [],
  //     });
  //   };

  //   filterData();
  // }, [postTasksList, searchQuery, activeTab]);

  // Format date (e.g., "24 Apr")
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDatee = (dateString) => {
    return moment(dateString).format("DD MMM");
  };

  // Handle reject button
  const handleConfirmCancel = () => {
    navigate(bookingDetailPath(ids, "service=reject"));
    setShowModalCancel(false);
  };

  // Close cancel modal with navigation
  const handleCloseModalCancel = () => {
    navigate(bookingDetailPath(ids));
    setShowModalCancel(false);
  };

  const handleCloseModalCancell = () => {
    setShowModalCancel(false);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenFeedback = (task) => {
    setSelectedCompletedTask(task);
    setFeedbackRating(0);
    setFeedbackMessage("");
    setShowFeedbackModal(true);
  };

  const handleCloseFeedback = () => {
    if (feedbackSubmitting) return;
    setShowFeedbackModal(false);
    setFeedbackRating(0);
    setFeedbackMessage("");
    setSelectedCompletedTask(null);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedCompletedTask?._id) return;
    if (!feedbackRating) {
      toast.error("Please give rating.");
      return;
    }
    setFeedbackSubmitting(true);
    const customerId =
      selectedCompletedTask?.user_details?._id ||
      selectedCompletedTask?.user_details?.id ||
      selectedCompletedTask?.bookBy?._id ||
      selectedCompletedTask?.bookBy?.id ||
      selectedCompletedTask?.user_id?._id ||
      selectedCompletedTask?.user_id?.id ||
      (typeof selectedCompletedTask?.user_id === "string"
        ? selectedCompletedTask.user_id
        : null) ||
      selectedCompletedTask?.customer_id ||
      selectedCompletedTask?.seekerId;
    if (!customerId) {
      toast.error("Could not identify the customer.");
      setFeedbackSubmitting(false);
      return;
    }
    const payload = {
      task_id: selectedCompletedTask._id,
      ratedSeekerId: customerId,
      rating: feedbackRating,
      message: feedbackMessage.trim(),
      type: 2,
    };
    try {
      const res = await dispatch(CustomerActions.giveFeedbackToSeeker(payload));
      if (res?.payload?.success) {
        toast.success("Feedback submitted successfully.");
        handleCloseFeedback();
      } else {
        toast.error(res?.payload?.message || "Could not submit feedback.");
      }
    } catch {
      toast.error("Could not submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleOpenDispute = (task) => {
    setDisputeTask(task);
    setDisputeTitle("");
    setDisputeDescription("");
    setShowDisputeModal(true);
  };

  const handleCloseDispute = () => {
    if (disputeSubmitting) return;
    setShowDisputeModal(false);
    setDisputeTask(null);
    setDisputeTitle("");
    setDisputeDescription("");
  };

  const handleSubmitDispute = async () => {
    if (!disputeTitle.trim() || !disputeDescription.trim()) {
      toast.error("Please enter title and message.");
      return;
    }
    const refId = disputeTask?.referenceId ?? disputeTask?.reference_id ?? null;
    if (!refId) {
      toast.error("Task reference not found.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      const res = await dispatch(
        CustomerActions.raiseDispute({
          referenceId: refId,
          reason: disputeTitle.trim(),
          description: disputeDescription.trim(),
        })
      );
      if (res?.payload?.success) {
        toast.success(res?.payload?.message || "Dispute submitted successfully.");
        handleCloseDispute();
      } else {
        toast.error(res?.payload?.message || "Could not submit dispute.");
      }
    } catch {
      toast.error("Could not submit dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const getTaskMapCoordinates = (task) => {
    const directLat = Number(
      task?.latitude ?? task?.lat ?? task?.location?.lat
    );
    const directLng = Number(
      task?.longitude ?? task?.lng ?? task?.location?.lng
    );
    if (!Number.isNaN(directLat) && !Number.isNaN(directLng)) {
      return { lat: directLat, lng: directLng };
    }
    const coords = task?.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords;
      if (!Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
        return { lat: Number(lat), lng: Number(lng) };
      }
    }
    return null;
  };

  const openTaskDetail = (task, withStatus = true) => {
    const base = `/servicetasksdetails/${task?._id}`;
    navigate(
      withStatus ? `${base}?status=task&fromTab=${activeTab}` : base
    );
  };

  const handleTaskThumbError = (e) => {
    const thumb = e.currentTarget.closest(".tthumb");
    e.currentTarget.style.display = "none";
    if (thumb) {
      thumb.classList.remove("tthumb--photo");
    }
  };

  const renderBrowseTaskCard = (task, withStatus = true) => {
    const imageSrc = task?.images?.length > 0 ? task.images[0] : null;
    const whenLabel = withStatus
      ? formatDatee(task?.when_done)
      : formatDate(task?.when_done);
    const address =
      task?.address && task.address !== "undefined" ? task.address : null;

    return (
      <button
        key={task?._id}
        type="button"
        className={`tcard sp-task-card${
          withStatus ? "" : " sp-task-card--upcoming"
        }`}
        onClick={() => openTaskDetail(task, withStatus)}
      >
        <div className={`tthumb${imageSrc ? " tthumb--photo" : ""}`}>
          {imageSrc ? (
            <img
              src={taskImageUrl(imageSrc)}
              alt={task?.need_done || "Task"}
              onError={handleTaskThumbError}
            />
          ) : (
            <PlaceholderThumbIcon />
          )}
        </div>
        <div className="tinfo">
          <div className="tinfo-head">
            <h3>{formatDisplayTitle(task?.need_done, "Task")}</h3>
            {!withStatus ? <span className="tbadge posted">Open</span> : null}
          </div>
          <div className="tsched">
            <ClockIcon />
            {task?.task_time}
            {whenLabel ? `, ${whenLabel}` : ""}
          </div>
          {address ? (
            <div className="tloc">
              <LocationIcon />
              <span>{address}</span>
            </div>
          ) : null}
          <div className="tdesc tdesc--wrap">
            {task?.details || "No description provided."}
          </div>
        </div>
        <div className="tside">
          <span className="tprice">${task?.budget ?? "N/A"}</span>
          <span className="tarrow">
            View <ArrowIcon />
          </span>
        </div>
      </button>
    );
  };

  const renderMyQuotations = (task) => {
    const address =
      task?.user_details?.address &&
      task.user_details.address !== "undefined"
        ? task.user_details.address
        : "-";

    return (
      <button
        key={task?._id}
        type="button"
        className="quotation-card sp-quote-card"
        onClick={() => navigate(`/quotations-detail/${task?._id}`)}
      >
        <div className="tthumb tthumb--photo">
          <img
            src={userImageUrl(task?.user_details)}
            alt={task?.user_details?.full_name || "Customer"}
            onError={handleUserImageError}
          />
        </div>
        <div className="tinfo">
          <h3>{task?.user_details?.full_name || "Customer"}</h3>
          <div className="tsched">{address}</div>
          <div className="tdesc tdesc--wrap">
            {task?.description || "No description provided"}
          </div>
        </div>
        <div className="tside">
          <span className="tprice">${task?.offer_price || "N/A"}</span>
          <span className="tarrow">
            Offer <ArrowIcon />
          </span>
        </div>
      </button>
    );
  };

  const renderCompletedTaskCard = (task) => {
    const detailUrl = `/servicetasksdetails/${task?._id}?status=task&fromTab=${activeTab}`;
    const map = getTaskMapCoordinates(task);
    const mapUrl = map
      ? `https://maps.google.com/maps?q=${map.lat},${map.lng}&z=14&output=embed`
      : null;
    const shareUrl = map
      ? `https://maps.google.com/?q=${map.lat},${map.lng}`
      : null;

    const imageSrc = task?.images?.length > 0 ? task.images[0] : null;
    const title = formatDisplayTitle(task?.need_done?.trim(), "Task");
    const details = task?.details?.trim() || "";
    const normalizeLabel = (value) =>
      value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const showDetails =
      details.length > 0 &&
      normalizeLabel(details) !== normalizeLabel(title);
    const address =
      task?.address && task.address !== "undefined" ? task.address : null;

    return (
      <div className="tk-card tk-card--completed" key={task?._id}>
        <div className="tk-main">
          <div className="tk-top">
            <button
              type="button"
              className={`tk-thumb${imageSrc ? " tk-thumb--photo" : ""}`}
              onClick={() => navigate(detailUrl)}
              aria-label={`View ${title}`}
            >
              {imageSrc ? (
                <img
                  src={taskImageUrl(imageSrc)}
                  alt={title}
                  onError={handleTaskThumbError}
                />
              ) : (
                <PlaceholderThumbIcon />
              )}
            </button>
            <div className="tk-id">
              <div className="tk-id-head">
                <h2>
                  <button
                    type="button"
                    className="tk-title-btn"
                    onClick={() => navigate(detailUrl)}
                  >
                    {title}
                  </button>
                </h2>
                <span className="tbadge completed">Completed</span>
              </div>
              {showDetails ? <p className="tk-sub">{details}</p> : null}
              <div className="tk-meta">
                <div className="tk-meta-line">
                  <ClockIcon />
                  <span>
                    {task?.task_time}
                    {task?.when_done
                      ? `, ${formatDatee(task.when_done)}`
                      : ""}
                  </span>
                </div>
                {address ? (
                  <div className="tk-meta-line">
                    <LocationIcon />
                    <span>{address}</span>
                  </div>
                ) : null}
              </div>
              <div className="tk-price">${task?.budget ?? "N/A"}</div>
            </div>
          </div>

          <div className="tk-timeline">
            <SimbaTaskTimeline status={task?.status} />
            <p className="tk-note">{getTaskFlowDescription(task?.status)}</p>
          </div>

          <div className="done-banner">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="m20 6-11 11-5-5" />
            </svg>
            Job completed. Payment will be processed by the customer.
          </div>

          <div className="tk-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleOpenFeedback(task)}
            >
              Rate the customer
            </button>
          </div>

          <p className="dispute-line">
            Having an issue?{" "}
            <button type="button" onClick={() => handleOpenDispute(task)}>
              Raise dispute
            </button>
          </p>
        </div>

        {map && mapUrl && shareUrl ? (
          <div className="tk-map">
            <div className="map-frame">
              <iframe
                title={`completed-task-map-${task?._id}`}
                src={mapUrl}
                loading="lazy"
              />
            </div>
            <div className="map-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => window.open(shareUrl, "_blank")}
              >
                Open in Maps
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "Task location",
                        text: "Completed task location",
                        url: shareUrl,
                      });
                      return;
                    }
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      toast.success("Location copied.");
                    }
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Share location
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <CorporatePageShell
        title="Browse Tasks"
        crumbLabel="Tasks"
        pageClass="p-corporate-portal p-mytasks p-browsetask"
      >
        <div className="browse-head">
          <div className="browse-tools">
            <div className="task-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4-4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or task"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        <div className="tabs">
          {TASK_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => handleTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={activeTab === "fourth" ? "task-list" : "tasklist"}>
          {activeTab === "first" &&
            (filteredData.acceptedTasks.length > 0 ? (
              filteredData.acceptedTasks.map((task) => renderBrowseTaskCard(task, true))
            ) : (
              <EmptyState
                title="No tasks found"
                message={
                  searchQuery
                    ? "No tasks match your search."
                    : "You don't have any active tasks yet."
                }
              />
            ))}

          {activeTab === "second" &&
            (filteredData.myQuotations.length > 0 ? (
              filteredData.myQuotations.map(renderMyQuotations)
            ) : (
              <EmptyState
                title="No quotations found"
                message={
                  searchQuery
                    ? "No quotations match your search."
                    : "Your submitted quotations will appear here."
                }
              />
            ))}

          {activeTab === "third" &&
            (filteredData.tasks.length > 0 ? (
              <>
                {filteredData.tasks.map((task) => renderBrowseTaskCard(task, false))}
                <SimbaPager
                  page={tasksPagination?.page || upcomingPage}
                  totalPages={tasksPagination?.totalPages || 1}
                  onPageChange={setUpcomingPage}
                />
              </>
            ) : (
              <EmptyState
                title="No upcoming tasks"
                message={
                  searchQuery
                    ? "No upcoming tasks match your search."
                    : "Browse and quote on tasks to fill this list."
                }
              />
            ))}

          {activeTab === "fourth" &&
            (filteredData.completedTasks.length > 0 ? (
              filteredData.completedTasks.map(renderCompletedTaskCard)
            ) : (
              <EmptyState
                title="No completed tasks"
                message={
                  searchQuery
                    ? "No completed tasks match your search."
                    : "Finished jobs will appear here."
                }
              />
            ))}
        </div>
      </CorporatePageShell>
        <BookingConfirmationModal
          show={isRequestModal}
          handleClose={() => setIsRequestModal(false)}
        />
        <CancelModal
          show={showModalCancel}
          handleClose={handleCloseModalCancell}
          handleConfirm={handleConfirmCancel}
          handleCloseModal={handleCloseModalCancel}
        />
        <Modal
          show={showFeedbackModal}
          onHide={handleCloseFeedback}
          centered
          backdrop={feedbackSubmitting ? "static" : true}
        >
          <Modal.Header closeButton={!feedbackSubmitting}>
            <Modal.Title>Rate Customer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="rating-stars mb-3">
              <ul className="d-flex list-unstyled gap-2 mb-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <li key={star}>
                    <button
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{ background: "transparent", border: 0, padding: 0 }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill={star <= feedbackRating ? "#FFC107" : "#E0E0E0"}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Form.Group>
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Write your feedback"
                disabled={feedbackSubmitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="rate-customer-modal-footer">
            <button
              type="button"
              className="btn btn-light border rate-customer-modal-btn"
              onClick={handleCloseFeedback}
              disabled={feedbackSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="booking-job-done-btn rate-customer-modal-btn"
              onClick={handleSubmitFeedback}
              disabled={feedbackSubmitting}
            >
              {feedbackSubmitting ? "Please wait..." : "Submit"}
            </button>
          </Modal.Footer>
        </Modal>
        <Modal
          show={showDisputeModal}
          onHide={handleCloseDispute}
          centered
          backdrop={disputeSubmitting ? "static" : true}
        >
          <Modal.Header closeButton={!disputeSubmitting}>
            <Modal.Title>Raise Dispute</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Dispute title"
                value={disputeTitle}
                onChange={(e) => setDisputeTitle(e.target.value)}
                disabled={disputeSubmitting}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Describe the issue..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                disabled={disputeSubmitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 dispute-modal-footer">
            <button
              type="button"
              className="btn btn-light border rate-customer-modal-btn"
              onClick={handleCloseDispute}
              disabled={disputeSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="booking-job-done-btn rate-customer-modal-btn"
              onClick={handleSubmitDispute}
              disabled={disputeSubmitting}
            >
              {disputeSubmitting ? "Please wait..." : "Submit"}
            </button>
          </Modal.Footer>
        </Modal>
        <ToastContainer />
    </>
  );
}
