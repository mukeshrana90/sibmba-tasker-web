import React, { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import AddQuotationModal from "../CommanComponents/Modals/AddQuotationModal";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";
import defaultImage from "../Assets/Images/placeholder.jpg";
import JobFlowStepper from "../CommanComponents/JobFlowStepper";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import {
  getProviderTaskDetailActionVisibility,
  getTaskFlowDescription,
  getTaskFlowStepperState,
  JOB_FLOW_STEP_LABELS,
  taskStatus,
} from "../utils/jobFlowStatus";
export default function ServiceTaskDetails() {
  const TASK_STATUS_TOAST_ID = "service-task-status-update";
  const showSingleStatusToast = (message) => {
    toast.dismiss();
    toast.clearWaitingQueue?.();
    setTimeout(() => {
      toast.success(message, { toastId: TASK_STATUS_TOAST_ID });
    }, 0);
  };
  const getStatusColor = (status) => {
    const s = Number(status);
    const statusMap = {
      0: "yellow",
      1: "green",
      2: "red",
      3: "green",
      4: "green",
      5: "green",
    };
    return statusMap[s] || "green";
  };

  const dropdownRefs = useRef({});
  const [dropdownStates, setDropdownStates] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const status = searchParams.get("status");
  const fromTab = searchParams.get("fromTab");

  const [show, setShow] = useState(false);
  const [showQutation, setShowQuotation] = useState(false);

  const handleClose = () => setShow(false);
  const handleCloseQuotation = () => setShowQuotation(false);
  const handleShowQuotation = () => setShowQuotation(true);

  const [showEditQuotation, setShowEditQuotation] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [taskStatusSubmitting, setTaskStatusSubmitting] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [showAllTaskDisputes, setShowAllTaskDisputes] = useState(false);
  const [showCreatorRatingsModal, setShowCreatorRatingsModal] = useState(false);
  const [creatorRatingsLoading, setCreatorRatingsLoading] = useState(false);
  const [taskCreatorRatingsData, setTaskCreatorRatingsData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const taskStatusSubmittingRef = useRef(false);

  const handleCloseEditQuotation = () => {
    setShowEditQuotation(false);
    setSelectedQuotation(null);
  };

  const handleShowEditQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setShowEditQuotation(true);
  };

  const postTaskDetails = useSelector(
    (state) => state.UserSlice.postTaskDetail
  );

  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: postTaskDetails?.data?.task?.images?.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          arrows: false,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
        },
      },
    ],
  };

  useEffect(() => {
    dispatch(CustomerActions.getPostTaskDetail(id));
  }, [dispatch, id]);
  useEffect(() => {
    setShowAllTaskDisputes(false);
  }, [id]);
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => {}
    );
  }, []);

  const task = postTaskDetails?.data?.task;
  const quotations = postTaskDetails?.data?.quotations;
  const taskDisputes = Array.isArray(task?.disputes) ? task.disputes : [];
  const hasTaskDisputes = taskDisputes.length > 0;
  const visibleTaskDisputes = showAllTaskDisputes
    ? taskDisputes
    : taskDisputes.slice(0, 3);
  const customerRatingSummary = postTaskDetails?.data?.customerRatingSummary;
  const taskCreatorAverageRatingRaw =
    customerRatingSummary?.averageRating ??
    task?.user_id?.customerAverageRating ??
    task?.user_id?.averageRating;
  const taskCreatorReviewCountRaw =
    customerRatingSummary?.reviewCount ??
    task?.user_id?.customerReviewCount ??
    task?.user_id?.overallFeedbackCount;
  const taskCreatorAverageRating = Number.isFinite(
    Number(taskCreatorAverageRatingRaw)
  )
    ? Number(taskCreatorAverageRatingRaw)
    : 0;
  const taskCreatorReviewCount = Number.isFinite(Number(taskCreatorReviewCountRaw))
    ? Number(taskCreatorReviewCountRaw)
    : 0;
  const taskCreatorUserId = task?.user_id?._id ?? task?.user_id?.id ?? task?.user_id;
  const taskCreatorName = task?.user_id?.full_name || "Task Creator";
  const creatorRatingsListRaw =
    taskCreatorRatingsData?.overallFeedbacks ??
    taskCreatorRatingsData?.ratings ??
    taskCreatorRatingsData?.reviews ??
    [];
  const creatorRatingsList = Array.isArray(creatorRatingsListRaw)
    ? creatorRatingsListRaw
    : [];
  const creatorRatingsAverage = Number(
    taskCreatorRatingsData?.averageRating ??
      taskCreatorRatingsData?.customerAverageRating ??
      taskCreatorAverageRating
  );
  const creatorRatingsCount = Number(
    taskCreatorRatingsData?.reviewCount ??
      taskCreatorRatingsData?.customerReviewCount ??
      taskCreatorRatingsData?.overallFeedbackCount ??
      creatorRatingsList.length ??
      taskCreatorReviewCount
  );
  const taskCreatorNameFromRatings =
    creatorRatingsList?.[0]?.ratedSeekerId?.full_name || taskCreatorName;
  const selectedQuotationId =
    task?.quatation_id ?? task?.quotation_id ?? task?.quote_id;
  const acceptedQuotationForMap = quotations?.find(
    (q) => String(q?._id) === String(selectedQuotationId)
  );
  const selectedServiceProviderId =
    task?.serviceProviderId ??
    task?.service_provider_id ??
    task?.service_provider?._id ??
    acceptedQuotationForMap?.service_provider?._id ??
    acceptedQuotationForMap?.service_provider_id;
  const taskProviderName =
    acceptedQuotationForMap?.service_provider?.full_name ||
    quotations?.find(
      (q) => String(q?.service_provider?._id) === String(selectedServiceProviderId)
    )?.service_provider?.full_name ||
    task?.serviceProvider?.full_name ||
    "Service Provider";
  const getTaskDisputeRaisedByName = (dispute) => {
    if (!dispute) return "Unknown";
    if (Number(dispute?.role) === 1) {
      return task?.user_id?.full_name || "Customer";
    }
    if (Number(dispute?.role) === 2) {
      return taskProviderName;
    }
    const raisedById = dispute?.raisedBy ? String(dispute.raisedBy) : "";
    if (
      raisedById &&
      (raisedById === String(task?.user_id?._id) ||
        raisedById === String(task?.user_id?.id))
    ) {
      return task?.user_id?.full_name || "Customer";
    }
    return taskProviderName;
  };
  const getTaskDisputeRaisedByClass = (dispute) => {
    if (Number(dispute?.role) === 1) {
      return "task-dispute-details-item__raisedby-badge--customer";
    }
    if (Number(dispute?.role) === 2) {
      return "task-dispute-details-item__raisedby-badge--provider";
    }
    const raisedById = dispute?.raisedBy ? String(dispute.raisedBy) : "";
    if (
      raisedById &&
      (raisedById === String(task?.user_id?._id) ||
        raisedById === String(task?.user_id?.id))
    ) {
      return "task-dispute-details-item__raisedby-badge--customer";
    }
    return "task-dispute-details-item__raisedby-badge--provider";
  };
  const canRaiseTaskDispute = Boolean(
    task?.referenceId &&
      selectedQuotationId &&
      [
        taskStatus.ON_THE_WAY,
        taskStatus.IN_PROGRESS,
        taskStatus.COMPLETED,
      ].includes(Number(task?.status))
  );
  const taskCoordinates = Array.isArray(task?.location?.coordinates)
    ? task.location.coordinates
    : null;
  const providerCoordinates = Array.isArray(
    acceptedQuotationForMap?.service_provider?.location?.coordinates
  )
    ? acceptedQuotationForMap.service_provider.location.coordinates
    : null;
  const mapLat = taskCoordinates?.[1] ?? providerCoordinates?.[1] ?? null;
  const mapLng = taskCoordinates?.[0] ?? providerCoordinates?.[0] ?? null;
  const hasRouteCoordinates =
    taskCoordinates?.[1] != null &&
    taskCoordinates?.[0] != null &&
    providerCoordinates?.[1] != null &&
    providerCoordinates?.[0] != null;
  const routeEmbedUrl = hasRouteCoordinates
    ? `https://maps.google.com/maps?saddr=${taskCoordinates[1]},${taskCoordinates[0]}&daddr=${providerCoordinates[1]},${providerCoordinates[0]}&output=embed`
    : `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=14&output=embed`;
  const routeShareUrl = hasRouteCoordinates
    ? `https://www.google.com/maps/dir/?api=1&origin=${taskCoordinates[1]},${taskCoordinates[0]}&destination=${providerCoordinates[1]},${providerCoordinates[0]}&travelmode=driving`
    : `https://maps.google.com/?q=${mapLat},${mapLng}`;

  const handleQuotationSubmit = ({
    offer_price,
    description,
    task_id,
    quatation_id,
  }) => {
    if (quatation_id) {
      // Edit quotation
      dispatch(
        ServiceActions.editQuotation({
          quatation_id,
          // task_id,
          offer_price,
          description,
        })
      )
        .then((res) => {
          if (res?.payload?.success) {
            dispatch(CustomerActions.getPostTaskDetail(id));
            setDropdownStates((prev) => ({
              ...prev,
              [quatation_id]: false,
            }));
            toast.success("Quotation updated successfully");
          } else {
            toast.error(res?.payload?.message || "Failed to update quotation");
          }
        })
        .catch(() => {
          toast.error("Error updating quotation");
        });
    } else {
      // Add new quotation
      dispatch(
        ServiceActions.createQuotation({ task_id, offer_price, description })
      )
        .then((res) => {
          if (res?.payload?.success) {
            toast.success(res?.payload?.message);
            dispatch(CustomerActions.getPostTaskDetail(id));
          }
        })
        .catch(() => {
          toast.error("Error adding quotation");
        });
    }
  };

  /**
   * Provider task status updates (same API as cancel / job done).
   * @param {number} nextStatus
   * @param {{ navigateToList?: boolean; successMessage: string }} opts
   */
  const applyProviderTaskStatus = (nextStatus, opts) => {
    const { navigateToList = false, successMessage } = opts;
    if (taskStatusSubmittingRef.current || !id) return;
    taskStatusSubmittingRef.current = true;
    setTaskStatusSubmitting(true);
    const requestData = {
      task_id: id,
      status: nextStatus,
      ...(selectedQuotationId ? { quatation_id: selectedQuotationId } : {}),
      ...(selectedServiceProviderId
        ? { service_provider_id: selectedServiceProviderId }
        : {}),
    };
    dispatch(
      CustomerActions.acceptRejectTaskStatus(requestData)
    )
      .then((res) => {
        if (res?.payload?.success) {
          showSingleStatusToast(successMessage);
          dispatch(CustomerActions.getPostTaskDetail(id));
          if (navigateToList) {
            navigate(fromTab ? `/taskslist?tab=${fromTab}` : "/taskslist");
          }
        } else {
          toast.error(res?.payload?.message || "Could not update status.");
        }
      })
      .catch(() => {
        toast.error("Something went wrong. Please try again.");
      })
      .finally(() => {
        taskStatusSubmittingRef.current = false;
        setTaskStatusSubmitting(false);
      });
  };

  const handleTaskCancel = () => {
    applyProviderTaskStatus(taskStatus.REJECTED, {
      navigateToList: true,
      successMessage: "Cancelled",
    });
  };

  const handleTaskJobDone = () => {
    applyProviderTaskStatus(taskStatus.COMPLETED, {
      navigateToList: true,
      successMessage: "Job marked as done.",
    });
  };

  const handleOnTheWay = () => {
    applyProviderTaskStatus(taskStatus.ON_THE_WAY, {
      successMessage: "Marked as on the way.",
    });
  };

  const handleInProgress = () => {
    applyProviderTaskStatus(taskStatus.IN_PROGRESS, {
      successMessage: "Marked as in progress.",
    });
  };

  const handleButtonClick = (id) => {
    setDropdownStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const handleOpenDisputeModal = () => setShowDisputeModal(true);
  const handleCloseDisputeModal = () => {
    if (disputeSubmitting) return;
    setShowDisputeModal(false);
    setDisputeTitle("");
    setDisputeDescription("");
  };
  const handleSubmitDispute = async () => {
    if (!disputeTitle.trim() || !disputeDescription.trim()) {
      toast.error("Please enter title and message.");
      return;
    }
    if (!task?.referenceId) {
      toast.error("Task reference not found.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      const res = await dispatch(
        CustomerActions.raiseDispute({
          referenceId: task.referenceId,
          reason: disputeTitle.trim(),
          description: disputeDescription.trim(),
        })
      );
      if (res?.payload?.success) {
        toast.success(res?.payload?.message || "Dispute submitted successfully.");
        handleCloseDisputeModal();
      } else {
        toast.error(res?.payload?.message || "Could not submit dispute.");
      }
    } catch {
      toast.error("Could not submit dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };
  const handleCloseCreatorRatingsModal = () => setShowCreatorRatingsModal(false);
  const handleOpenCreatorRatingsModal = async () => {
    if (!taskCreatorUserId) {
      toast.error("Task creator id not found.");
      return;
    }
    setCreatorRatingsLoading(true);
    setShowCreatorRatingsModal(true);
    try {
      const res = await dispatch(
        CustomerActions.getCustomerRatingsById(taskCreatorUserId)
      );
      if (res?.payload?.success === false) {
        toast.error(res?.payload?.message || "Could not load ratings.");
        return;
      }
      setTaskCreatorRatingsData(res?.payload?.data ?? res?.payload ?? null);
    } catch {
      toast.error("Could not load ratings.");
    } finally {
      setCreatorRatingsLoading(false);
    }
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title task-details-title">
                <h2>Task Details</h2>
              </div>
              <div className="service-detail-card pt-3">
                <div className="service-detail-media">
                  {task?.images?.length > 0 ? (
                    <Slider {...sliderSettings}>
                      {task.images.map((image, index) => (
                        <div key={index} className="card-box">
                          <img
                            src={`${process.env.REACT_APP_API_URLL}${image}`}
                            alt={task.need_done}
                            style={{ maxWidth: "200px", margin: "0 auto" }}
                          />
                        </div>
                      ))}
                    </Slider>
                  ) : (
                    <img
                      src={require("../Assets/Images/placeholder.jpg")}
                      alt="Default"
                    />
                  )}
                  {task && (
                    <div className="task-creator-rating">
                      <div className="task-creator-rating-head">
                        <div>
                          <p className="task-creator-rating-title">
                            Task Creator Rating
                          </p>
                          <p className="task-creator-rating-name mb-0">
                            {taskCreatorName}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="task-creator-rating-view-btn"
                          onClick={handleOpenCreatorRatingsModal}
                          disabled={creatorRatingsLoading || !taskCreatorUserId}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {creatorRatingsLoading ? "Loading..." : "View"}
                        </button>
                      </div>
                      <StarRating
                        averageRating={taskCreatorAverageRating}
                        reviewCount={taskCreatorReviewCount}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <h3>{task?.need_done || "Task"}</h3>
                  <h5>
                    {task?.task_time},{" "}
                    {formatTaskWhenDoneDisplay(task?.when_done)}
                  </h5>
                  <p>{task?.details || "No description provided."}</p>
                  <div className="book-service-action-btn">
                    <h4>${task?.budget || "N/A"}</h4>
                    {status !== "task" ? (
                      <button
                        className="addQuotation"
                        onClick={handleShowQuotation}
                        disabled={quotations?.length > 0}
                      >
                        Add Quotation
                      </button>
                    ) : (
                      (() => {
                        const {
                          showCancel,
                          showOnTheWay,
                          showInProgress,
                          showJobDone,
                        } = getProviderTaskDetailActionVisibility(task?.status);

                        return (
                          <div className="book-service-action book-service-action--task-flow">
                            {showCancel && (
                              <button
                                type="button"
                                className="task-flow-btn task-flow-btn--outline"
                                disabled={taskStatusSubmitting}
                                onClick={handleTaskCancel}
                              >
                                Cancel
                              </button>
                            )}
                            {showOnTheWay && (
                              <button
                                type="button"
                                className="task-flow-btn task-flow-btn--on-way"
                                disabled={taskStatusSubmitting}
                                onClick={handleOnTheWay}
                              >
                                On the Way
                              </button>
                            )}
                            {showInProgress && (
                              <button
                                type="button"
                                className="task-flow-btn task-flow-btn--start-job"
                                disabled={taskStatusSubmitting}
                                onClick={handleInProgress}
                              >
                                In Progress
                              </button>
                            )}
                            {showJobDone && (
                              <>
                                <button
                                  type="button"
                                  className="task-flow-btn task-flow-btn--primary"
                                  disabled={taskStatusSubmitting}
                                  onClick={handleTaskJobDone}
                                >
                                  Job Done
                                </button>
                                <button
                                  type="button"
                                  className="task-flow-btn task-flow-btn--outline-primary"
                                  onClick={() => navigate("/my-task")}
                                >
                                  View history
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                  {canRaiseTaskDispute && (
                    <button
                      type="button"
                      className="task-dispute-link-btn"
                      onClick={handleOpenDisputeModal}
                    >
                      Having an issue? <span>Raise Dispute</span>
                    </button>
                  )}
                </div>
              </div>
            </Col>
          </Row>
          {hasTaskDisputes && (
            <Row className="mt-3">
              <Col lg={12}>
                <section className="booking-status-sec task-dispute-details-card">
                  <div className="booking-status-txt pt-0 pb-0">
                    <div className="booking-status-left-txt">
                      <div className="task-dispute-details-header">
                        <h2>Dispute details</h2>
                        {taskDisputes.length > 3 && (
                          <button
                            type="button"
                            className="task-dispute-details-toggle"
                            onClick={() =>
                              setShowAllTaskDisputes((prev) => !prev)
                            }
                          >
                            {showAllTaskDisputes
                              ? "View less"
                              : `View all (${taskDisputes.length})`}
                          </button>
                        )}
                      </div>
                      <ul className="task-dispute-details-list">
                        {visibleTaskDisputes.map((dispute) => (
                          <li
                            key={dispute?._id || dispute?.id}
                            className="task-dispute-details-item"
                          >
                            <div className="task-dispute-details-item__header">
                              <span className="task-dispute-details-item__reason">
                                {dispute?.reason || "Dispute"}
                              </span>
                              <div className="task-dispute-details-item__meta">
                                <span className="task-dispute-details-item__status">
                                  {dispute?.status || "open"}
                                </span>
                                <span
                                  className={`task-dispute-details-item__raisedby-badge ${getTaskDisputeRaisedByClass(
                                    dispute
                                  )}`}
                                >
                                  Raised by: {getTaskDisputeRaisedByName(dispute)}
                                </span>
                              </div>
                            </div>
                            {dispute?.description ? (
                              <div className="task-dispute-details-item__message">
                                <span className="task-dispute-details-item__label">
                                  Dispute message
                                </span>
                                <p className="task-dispute-details-item__description">
                                  {dispute.description}
                                </p>
                              </div>
                            ) : null}
                            {dispute?.adminRemark ? (
                              <div className="task-dispute-details-item__admin">
                                <span className="task-dispute-details-item__label">
                                  Admin
                                </span>
                                <p className="task-dispute-details-item__remark">
                                  {dispute.adminRemark}
                                </p>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </Col>
            </Row>
          )}

          {status === "task" && (
            <Row>
              <Col lg={12}>
                <section className="booking-status-sec mt-3">
                  <div className="requests-completed-main  task-detail-map-container">
                    <div className="booking-status-txt pt-0 pb-0">
                      <div className="booking-status-left-txt">
                        <h2>Status</h2>
                        {(() => {
                          const flow = getTaskFlowStepperState(task?.status);
                          const headline =
                            flow.variant !== "default"
                              ? flow.terminalLabel || "Status"
                              : JOB_FLOW_STEP_LABELS[flow.activeStep] ||
                                "Status";
                          return (
                            <>
                              <h3 className={getStatusColor(task?.status)}>
                                {headline}
                              </h3>
                              <JobFlowStepper
                                mode="task"
                                status={task?.status}
                              />
                              <p>{getTaskFlowDescription(task?.status)}</p>
                              <h5>
                                {task?.task_time},{" "}
                                {formatTaskWhenDoneDisplay(task?.when_done)}
                              </h5>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {(() => {
                      const s = Number(task?.status);
                      const shouldShowMap =
                        mapLat != null &&
                        mapLng != null &&
                        (s === taskStatus.ON_THE_WAY ||
                          s === taskStatus.IN_PROGRESS ||
                          s === taskStatus.COMPLETED);
                      if (!shouldShowMap) return null;
                      return (
                        <div className="requests-completed-map">
                          <h2>Live Location</h2>
                          <iframe
                            title="Provider Task Map"
                            src={routeEmbedUrl}
                            width="100%"
                            height="260"
                            style={{ border: 0, borderRadius: "8px" }}
                            loading="lazy"
                          />
                          <div className="book-service-action-btn d-flex gap-2 mt-3 requests-completed-map-actions">
                            <button
                              type="button"
                              className="booking-job-done-btn"
                              onClick={() => window.open(routeShareUrl, "_blank")}
                            >
                              Open in Maps
                            </button>
                            <button
                              type="button"
                              className="booking-job-done-btn"
                              onClick={async () => {
                                if (navigator.share) {
                                  await navigator.share({
                                    title: "Task Route",
                                    text: "Task to provider route",
                                    url: routeShareUrl,
                                  });
                                  return;
                                }
                                if (navigator.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(
                                    routeShareUrl
                                  );
                                  toast.success("Location copied.");
                                }
                              }}
                            >
                              Share Location
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </section>
              </Col>
            </Row>
          )}
        </Container>
      </section>

      {status !== "task" && (
      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <h2>Quotations</h2>
            </div>
            {quotations?.length === 0 ? (
              <>
                <div className="no-upcoming-bookings">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    fill="none"
                  >
                    <path
                      d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                      fill="#CCCCCC"
                    />
                    <path
                      d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                      fill="#CCCCCC"
                    />
                  </svg>
                  <h3>No Quotations Yet</h3>
                  <p>Currently you don’t have any offers</p>
                </div>
              </>
            ) : (
              <div>
                {/* {    <p>Your Quotations</p>}
                  {quotations?.map((quotation, index) => (
                    <div className="quotation" key={index}>
                      <div>
                        <div className="quotation-txt-show  d-flex justify-space-between">
                          <div
                            className="profile-side cursor-pointer"
                            onClick={() => navigate("/quotations-detail")}
                          >
                            <img
                              className="point-cursor"
                              src={`${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`}
                              alt="categories-img"
                            />
                            <div>
                              <h5>{quotation?.service_provider?.full_name}</h5>
                              <p>{quotation?.service_provider?.address}</p>
                              <div className="rating-stars">
                                <ul>
                                  {[...Array(5)].map((_, i) => (
                                    <li key={i}>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                      >
                                        <path
                                          d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                          fill="#FFC107"
                                        />
                                      </svg>
                                    </li>
                                  ))}
                                </ul>
                                <p>(0 reviews)</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            {status !== "task" && (
                              <div
                                className="chat-btn-card"
                                style={{ position: "relative" }}
                                ref={(el) =>
                                  (dropdownRefs.current[quotation._id] = el)
                                }
                              >
                                <button
                                  className="btn"
                                  onClick={() =>
                                    handleButtonClick(quotation?._id)
                                  }
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="35"
                                    viewBox="0 0 32 35"
                                    fill="none"
                                  >
                                    <path
                                      d="M16.0001 11.084C16.8838 11.084 17.6001 10.3005 17.6001 9.33398C17.6001 8.36749 16.8838 7.58398 16.0001 7.58398C15.1165 7.58398 14.4001 8.36749 14.4001 9.33398C14.4001 10.3005 15.1165 11.084 16.0001 11.084Z"
                                      fill="#545454"
                                    />
                                    <path
                                      d="M16.0001 19.25C16.8838 19.25 17.6001 18.4665 17.6001 17.5C17.6001 16.5335 16.8838 15.75 16.0001 15.75C15.1165 15.75 14.4001 16.5335 14.4001 17.5C14.4001 18.4665 15.1165 19.25 16.0001 19.25Z"
                                      fill="#545454"
                                    />
                                    <path
                                      d="M16.0001 27.418C16.8838 27.418 17.6001 26.6345 17.6001 25.668C17.6001 24.7015 16.8838 23.918 16.0001 23.918C15.1165 23.918 14.4001 24.7015 14.4001 25.668C14.4001 26.6345 15.1165 27.418 16.0001 27.418Z"
                                      fill="#545454"
                                    />
                                  </svg>
                                </button>
                                {dropdownStates[quotation._id] && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: "0",
                                      background: "#fff",
                                      border: "1px solid #ccc",
                                      borderRadius: "5px",
                                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                      padding: "5px 0",
                                      zIndex: 10,
                                      minWidth: "100px",
                                    }}
                                  >
                                    <button
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "5px 10px",
                                        textAlign: "left",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        handleShowEditQuotation(quotation)
                                      }
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <h5>${quotation?.offer_price}</h5>
                            <p>Offer Price</p>
                          </div>
                        </div>

                        <p>{quotation?.description}</p>
                      </div>
                    </div>
                  ))} */}

                <div>
                  {/* Your Quotations */}
                  {quotations?.filter(
                    (quotation) =>
                      localStorage.getItem("userId") ===
                      quotation?.service_provider?._id
                  )?.length > 0 && <p>Your Quotations</p>}
                  {quotations
                    ?.filter(
                      (quotation) =>
                        localStorage.getItem("userId") ===
                        quotation?.service_provider?._id
                    )
                    ?.map((quotation, index) => (
                      <div className="quotation" key={index}>
                        <div>
                          <div className="quotation-txt-show d-flex justify-space-between">
                            <div className="profile-side cursor-pointer">
                              <img
                                className="point-cursor"
                                src={`${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`}
                                alt="categories-img"
                              />
                              <div>
                                <h5>
                                  {quotation?.service_provider?.full_name}
                                </h5>
                                <p>
                                  {quotation?.service_provider?.address ===
                                  "undefined"
                                    ? "-"
                                    : quotation?.service_provider?.address}
                                </p>
                                <div className="rating-stars">
                                  <ul>
                                    {" "}
                                    <StarRating
                                      averageRating={quotation?.averageRating}
                                    />
                                  </ul>
                                </div>
                              </div>
                            </div>
                            <div>
                              {status !== "task" && (
                                <div
                                  className="chat-btn-card mb-3"
                                  style={{ position: "relative" }}
                                  ref={(el) =>
                                    (dropdownRefs.current[quotation._id] = el)
                                  }
                                >
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      handleButtonClick(quotation?._id)
                                    }
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="32"
                                      height="35"
                                      viewBox=" _

0 32 35"
                                      fill="none"
                                    >
                                      <path
                                        d="M16.0001 11.084C16.8838 11.084 17.6001 10.3005 17.6001 9.33398C17.6001 8.36749 16.8838 7.58398 16.0001 7.58398C15.1165 7.58398 14.4001 8.36749 14.4001 9.33398C14.4001 10.3005 15.1165 11.084 16.0001 11.084Z"
                                        fill="#545454"
                                      />
                                      <path
                                        d="M16.0001 19.25C16.8838 19.25 17.6001 18.4665 17.6001 17.5C17.6001 16.5335 16.8838 15.75 16.0001 15.75C15.1165 15.75 14.4001 16.5335 14.4001 17.5C14.4001 18.4665 15.1165 19.25 16.0001 19.25Z"
                                        fill="#545454"
                                      />
                                      <path
                                        d="M16.0001 27.418C16.8838 27.418 17.6001 26.6345 17.6001 25.668C17.6001 24.7015 16.8838 23.918 16.0001 23.918C15.1165 23.918 14.4001 24.7015 14.4001 25.668C14.4001 26.6345 15.1165 27.418 16.0001 27.418Z"
                                        fill="#545454"
                                      />
                                    </svg>
                                  </button>
                                  {dropdownStates[quotation._id] && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: "0",
                                        background: "#fff",
                                        border: "1px solid #ccc",
                                        borderRadius: "5px",
                                        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                        padding: "5px 0",
                                        zIndex: 10,
                                        minWidth: "100px",
                                      }}
                                    >
                                      <button
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          padding: "5px 10px",
                                          textAlign: "left",
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          handleShowEditQuotation(quotation)
                                        }
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <h5>${quotation?.offer_price}</h5>
                              <p>Offer Price</p>
                            </div>
                          </div>
                          <p>{quotation?.description}</p>
                        </div>
                        {quotation?.corporateSuggestion?.length > 0 && (
                          <div className="suggested-caproate">
                            <h5>Suggested Corporate</h5>
                            <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                              {quotation.corporateSuggestion.map(
                                (item, index) => {
                                  const corp = item?.corporateIds;
                                  if (!corp) return null;

                                  return (
                                    <div
                                      key={item._id || index}
                                      className="corporate-item d-flex align-items-center py-2"
                                      style={{ gap: "10px" }}
                                    >
                                      {corp.profile_image ? (
                                        <img
                                          src={
                                            `${process.env.REACT_APP_API_URL}/${corp.profile_image}` ||
                                            defaultImage
                                          }
                                          alt={corp.full_name}
                                          className="rounded-circle"
                                          width={40}
                                          height={40}
                                        />
                                      ) : (
                                        <div
                                          className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                                          style={{
                                            width: 40,
                                            height: 40,
                                            fontWeight: "bold",
                                            fontSize: 18,
                                          }}
                                        >
                                          {corp.full_name?.[0]?.toUpperCase() ||
                                            "?"}
                                        </div>
                                      )}
                                      <div className="flex-grow-1">
                                        <div className="fw-bold d-flex align-items-center gap-2">
                                          {corp.full_name}
                                          {Number(item?.userStatus) === 1 && (
                                            <span className="badge bg-success">
                                              Selected
                                            </span>
                                          )}
                                        </div>

                                        <div className="text-muted small">
                                          {corp.shop_name}
                                        </div>
                                        <div className="text-muted small">
                                          {corp.email}
                                        </div>
                                      </div>
                                      {/* {Number(item?.userStatus) === 1  &&
                                         <div className="quotation-inner d-flex justify-content-center gap-4 mb-0">
                                        <div
                                          className="action-button-wrap"
                                          onClick={() =>
                                            navigate(
                                              `/messages?userID=${corp._id}`
                                            )
                                          }
                                        >
                                          <div className="icon-circle green">
                                            <img src={ChatIcon} alt="Chat" />
                                          </div>
                                          <span>Direct Chat</span>
                                        </div>
                                      </div> } */}
                                   
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Others Quotations */}
                  {quotations?.filter(
                    (quotation) =>
                      localStorage.getItem("userId") !==
                      quotation?.service_provider?._id
                  )?.length > 0 && <p>Others Quotations</p>}
                  {quotations
                    ?.filter(
                      (quotation) =>
                        localStorage.getItem("userId") !==
                        quotation?.service_provider?._id
                    )
                    ?.map((quotation, index) => (
                      <div className="quotation" key={index}>
                        <div>
                          <div className="quotation-txt-show d-flex justify-space-between">
                            <div
                              className="profile-side cursor-pointer"
                              // onClick={() => navigate("/quotations-detail")}
                            >
                              <img
                                className="point-cursor"
                                src={`${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`}
                                alt="categories-img"
                              />
                              <div>
                                <h5>
                                  {quotation?.service_provider?.full_name}
                                </h5>
                                <p>{quotation?.service_provider?.address}</p>
                                <div className="rating-stars">
                                  <ul>
                                    {" "}
                                    <StarRating
                                      averageRating={quotation?.averageRating}
                                    />
                                  </ul>
                                </div>
                              </div>
                            </div>
                            <div>
                              {status !== "task" && (
                                <div
                                  className="chat-btn-card"
                                  style={{ position: "relative" }}
                                  ref={(el) =>
                                    (dropdownRefs.current[quotation._id] = el)
                                  }
                                >
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      handleButtonClick(quotation?._id)
                                    }
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="32"
                                      height="35"
                                      viewBox="0 0 32 35"
                                      fill="none"
                                    >
                                      <path
                                        d="M16.0001 11.084C16.8838 11.084 17.6001 10.3005 17.6001 9.33398C17.6001 8.36749 16.8838 7.58398 16.0001 7.58398C15.1165 7.58398 14.4001 8.36749 14.4001 9.33398C14.4001 10.3005 15.1165 11.084 16.0001 11.084Z"
                                        fill="#545454"
                                      />
                                      <path
                                        d="M16.0001 19.25C16.8838 19.25 17.6001 18.4665 17.6001 17.5C17.6001 16.5335 16.8838 15.75 16.0001 15.75C15.1165 15.75 14.4001 16.5335 14.4001 17.5C14.4001 18.4665 15.1165 19.25 16.0001 19.25Z"
                                        fill="#545454"
                                      />
                                      <path
                                        d="M16.0001 27.418C16.8838 27.418 17.6001 26.6345 17.6001 25.668C17.6001 24.7015 16.8838 23.918 16.0001 23.918C15.1165 23.918 14.4001 24.7015 14.4001 25.668C14.4001 26.6345 15.1165 27.418 16.0001 27.418Z"
                                        fill="#545454"
                                      />
                                    </svg>
                                  </button>
                                  {dropdownStates[quotation._id] && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: "0",
                                        background: "#fff",
                                        border: "1px solid #ccc",
                                        borderRadius: "5px",
                                        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                        padding: "5px 0",
                                        zIndex: 10,
                                        minWidth: "100px",
                                      }}
                                    >
                                      <button
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          padding: "5px 10px",
                                          textAlign: "left",
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          handleShowEditQuotation(quotation)
                                        }
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <h5>${quotation?.offer_price}</h5>
                              <p>Offer Price</p>
                            </div>
                          </div>
                          <p>{quotation?.description}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>
      )}

      <AddQuotationModal
        show={showQutation}
        handleClose={handleCloseQuotation}
        task={task}
        onSubmit={handleQuotationSubmit}
      />

      <AddQuotationModal
        show={showEditQuotation}
        handleClose={handleCloseEditQuotation}
        task={task}
        onSubmit={handleQuotationSubmit}
        quatation={selectedQuotation}
      />

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Edit Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="book-service-view">
            <img
              src={
                task?.images?.length > 0
                  ? `${process.env.REACT_APP_API_URL}/${task.images[0]}`
                  : require("../Assets/Images/living-room-cleaning.png")
              }
              alt={task?.need_done || "Task"}
            />
            <p>{task?.need_done || "Task"}</p>
          </div>
          <div className="book-service-select">
            <h3>Select Date</h3>
            <ul>
              <li>
                <p>Fri</p>
                <h5>07</h5>
              </li>
              <li>
                <p>SAT</p>
                <h5>07</h5>
              </li>
              <li>
                <p>SUN</p>
                <h5>07</h5>
              </li>
              <li>
                <p>MON</p>
                <h5>07</h5>
              </li>
              <li>
                <p>TUE</p>
                <h5>07</h5>
              </li>
              <li>
                <p>WED</p>
                <h5>07</h5>
              </li>
              <li>
                <p>THR</p>
                <h5>07</h5>
              </li>
            </ul>
          </div>
          <div className="book-service-select">
            <h3>Select Time</h3>
            <ul>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
            </ul>
          </div>
          <div className="">
            <Form>
              <Form.Group controlId="exampleForm.ControlTextarea1">
                <Form.Label>Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter your message"
                  defaultValue={task?.details}
                />
              </Form.Group>
            </Form>
          </div>
          <div className="book-service-action">
            <button onClick={handleClose}>Cancel</button>
            <button onClick={handleClose}>Save</button>
          </div>
        </Modal.Body>
      </Modal>
      <Modal show={showDisputeModal} onHide={handleCloseDisputeModal} centered>
        <Modal.Header closeButton className="border-0 pb-0">
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
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 dispute-modal-footer">
          <button
            type="button"
            className="btn btn-light border dispute-modal-btn"
            onClick={handleCloseDisputeModal}
            disabled={disputeSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="booking-job-done-btn dispute-modal-btn"
            onClick={handleSubmitDispute}
            disabled={disputeSubmitting}
          >
            {disputeSubmitting ? "Please wait..." : "Submit"}
          </button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showCreatorRatingsModal}
        onHide={handleCloseCreatorRatingsModal}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>{taskCreatorNameFromRatings} Ratings</Modal.Title>
        </Modal.Header>
        <Modal.Body className="task-creator-ratings-modal-body">
          {creatorRatingsLoading ? (
            <p className="mb-0">Loading ratings...</p>
          ) : (
            <>
              <div className="task-creator-ratings-summary">
                <StarRating
                  averageRating={Number.isFinite(creatorRatingsAverage) ? creatorRatingsAverage : 0}
                  reviewCount={Number.isFinite(creatorRatingsCount) ? creatorRatingsCount : 0}
                />
              </div>
              {creatorRatingsList.length > 0 ? (
                <div className="task-creator-ratings-list">
                  {creatorRatingsList.map((rating, index) => {
                    const reviewText =
                      rating?.feedback ||
                      rating?.review ||
                      rating?.message ||
                      rating?.description ||
                      "No comment";
                    const reviewDate =
                      rating?.createdAt || rating?.updatedAt || null;
                    const reviewerName =
                      rating?.reviewerProviderId?.full_name || "Provider";
                    const reviewerImage = rating?.reviewerProviderId?.profile_image;
                    const ratedSeekerName =
                      rating?.ratedSeekerId?.full_name || taskCreatorNameFromRatings;
                    const ratedSeekerImage = rating?.ratedSeekerId?.profile_image;
                    const reviewTypeLabel =
                      Number(rating?.type) === 1
                        ? "Booking"
                        : Number(rating?.type) === 2
                        ? "Task"
                        : "-";
                    return (
                      <div
                        className="task-creator-rating-item"
                        key={rating?._id || index}
                      >
                        <div className="task-creator-rating-item-top">
                          <StarRating
                            averageRating={Number(rating?.rating || 0)}
                            type="noreview"
                          />
                          {reviewDate && (
                            <span className="task-creator-rating-item-date">
                              {new Date(reviewDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="task-rating-reviewer">
                          {reviewerImage && (
                            <img
                              src={`${process.env.REACT_APP_API_URL}${reviewerImage}`}
                              alt={reviewerName}
                              className="task-rating-reviewer-avatar"
                              onLoad={(e) => {
                                e.currentTarget.style.display = "inline-block";
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback =
                                  e.currentTarget.nextElementSibling;
                                if (fallback) fallback.style.display = "inline-flex";
                              }}
                            />
                          )}
                          <div
                            className="task-rating-reviewer-avatar task-rating-reviewer-avatar-fallback"
                            style={{ display: reviewerImage ? "none" : "inline-flex" }}
                          >
                            {reviewerName?.[0]?.toUpperCase() || "P"}
                          </div>
                          <span className="task-rating-reviewer-name">
                            Reviewed by {reviewerName}
                          </span>
                        </div>
                        <div className="task-rating-reviewer">
                          {ratedSeekerImage && (
                            <img
                              src={`${process.env.REACT_APP_API_URL}${ratedSeekerImage}`}
                              alt={ratedSeekerName}
                              className="task-rating-reviewer-avatar"
                              onLoad={(e) => {
                                e.currentTarget.style.display = "inline-block";
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const fallback =
                                  e.currentTarget.nextElementSibling;
                                if (fallback) fallback.style.display = "inline-flex";
                              }}
                            />
                          )}
                          <div
                            className="task-rating-reviewer-avatar task-rating-reviewer-avatar-fallback"
                            style={{
                              display: ratedSeekerImage ? "none" : "inline-flex",
                            }}
                          >
                            {ratedSeekerName?.[0]?.toUpperCase() || "U"}
                          </div>
                          <span className="task-rating-reviewer-name">
                            Rated user {ratedSeekerName}
                          </span>
                        </div>
                        <div className="task-rating-meta-grid">
                          <span>
                            <strong>Type:</strong> {reviewTypeLabel}
                          </span>
                        </div>
                        <p className="mb-0">{reviewText}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mb-0 text-muted">No ratings available.</p>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
