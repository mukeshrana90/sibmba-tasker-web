import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import AddQuotationModal from "../CommanComponents/Modals/AddQuotationModal";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";
import {
  getStatusPillMeta,
  ProviderQuotationCard,
  ProviderTaskDetailHero,
  ProviderTaskDetailPageShell,
  ProviderTaskDetailStatusCard,
  QuotationsEmptyState,
} from "../CommanComponents/TaskDetail/SimbaTaskDetailParts";
import {
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import {
  getProviderTaskDetailActionVisibility,
  canMessageOnActiveTask,
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
      [
        taskStatus.ACCEPTED,
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
    const disputeRefId =
      task?.referenceId ??
      acceptedQuotationForMap?.referenceId ??
      task?.reference_id ??
      null;
    if (!disputeRefId) {
      toast.error("Task reference not found.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      const res = await dispatch(
        CustomerActions.raiseDispute({
          referenceId: disputeRefId,
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
  const currentUserId = localStorage.getItem("userId");
  const myQuotations =
    quotations?.filter(
      (quotation) => currentUserId === quotation?.service_provider?._id
    ) ?? [];
  const otherQuotations =
    quotations?.filter(
      (quotation) => currentUserId !== quotation?.service_provider?._id
    ) ?? [];
  const {
    showCancel,
    showOnTheWay,
    showInProgress,
    showJobDone,
  } = getProviderTaskDetailActionVisibility(task?.status);
  const statePill = getStatusPillMeta(Number(task?.status), false);
  const scheduleText = formatTaskWhenDoneDisplay(task?.when_done);
  const isTaskMode = status === "task";
  const canMessageTaskCreator =
    isTaskMode &&
    canMessageOnActiveTask(task?.status) &&
    Boolean(taskCreatorUserId);
  const handleMessageTaskCreator = () => {
    if (!taskCreatorUserId) return;
    localStorage.setItem("reciverID", taskCreatorUserId);
    navigate(`/messages?userID=${taskCreatorUserId}`);
  };
  const shouldShowMap = (() => {
    const s = Number(task?.status);
    return (
      mapLat != null &&
      mapLng != null &&
      (s === taskStatus.ON_THE_WAY ||
        s === taskStatus.IN_PROGRESS ||
        s === taskStatus.COMPLETED)
    );
  })();

  return (
    <Layout footerVariant="marketing">
      <ProviderTaskDetailPageShell fromTab={fromTab}>
        {task && (
          <ProviderTaskDetailHero
            task={task}
            scheduleText={scheduleText}
            statePill={statePill}
            isTaskMode={isTaskMode}
            taskCreatorName={taskCreatorName}
            taskCreatorAverageRating={taskCreatorAverageRating}
            taskCreatorReviewCount={taskCreatorReviewCount}
            creatorRatingsLoading={creatorRatingsLoading}
            taskCreatorUserId={taskCreatorUserId}
            onViewCreatorRatings={handleOpenCreatorRatingsModal}
            showMessageCreator={canMessageTaskCreator}
            onMessageCreator={handleMessageTaskCreator}
            showCancel={showCancel}
            showOnTheWay={showOnTheWay}
            showInProgress={showInProgress}
            showJobDone={showJobDone}
            taskStatusSubmitting={taskStatusSubmitting}
            quotationsLength={quotations?.length ?? 0}
            canRaiseTaskDispute={canRaiseTaskDispute}
            onAddQuotation={handleShowQuotation}
            onCancel={handleTaskCancel}
            onOnTheWay={handleOnTheWay}
            onInProgress={handleInProgress}
            onJobDone={handleTaskJobDone}
            onViewHistory={() => navigate("/my-task")}
            onRaiseDispute={handleOpenDisputeModal}
          />
        )}

        {hasTaskDisputes && (
          <div className="card">
            <div className="card-h">
              <h3>Dispute details</h3>
              {taskDisputes.length > 3 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAllTaskDisputes((prev) => !prev)}
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
                    </div>
                  </div>
                  <div className="task-dispute-details-item__message">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="task-dispute-details-item__label">
                        Dispute message
                      </span>
                      <span
                        className={`task-dispute-details-item__raisedby-badge ${getTaskDisputeRaisedByClass(
                          dispute
                        )}`}
                      >
                        Raised by: {getTaskDisputeRaisedByName(dispute)}
                      </span>
                    </div>
                    {dispute?.description ? (
                      <p className="task-dispute-details-item__description">
                        {dispute.description}
                      </p>
                    ) : null}
                  </div>
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
        )}

        {isTaskMode && task && (
          <ProviderTaskDetailStatusCard status={task?.status} />
        )}

        <div className="card">
          <div className="card-h">
            <h3>Quotations</h3>
          </div>
          <p className="state-note">
            Offers submitted for this task by you and other providers.
          </p>
          {quotations?.length === 0 ? (
            <QuotationsEmptyState />
          ) : (
            <div className="quotes">
              {myQuotations.length > 0 && (
                <p className="qsection-label">Your Quotations</p>
              )}
              {myQuotations.map((quotation, index) => (
                <ProviderQuotationCard
                  key={quotation._id || `mine-${index}`}
                  quotation={quotation}
                  index={index}
                  isOwn
                  showEditMenu={Number(task?.status) === taskStatus.PENDING}
                  onEdit={() => handleShowEditQuotation(quotation)}
                />
              ))}
              {otherQuotations.length > 0 && (
                <p className="qsection-label">Other Quotations</p>
              )}
              {otherQuotations.map((quotation, index) => (
                <ProviderQuotationCard
                  key={quotation._id || `other-${index}`}
                  quotation={quotation}
                  index={index}
                  isOwn={false}
                  showEditMenu={false}
                  menuOpen={false}
                  menuRef={null}
                  onToggleMenu={() => {}}
                  onEdit={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        {isTaskMode && shouldShowMap && (
          <div className="card map-card">
            <div className="card-h">
              <h3>Live Location</h3>
            </div>
            <iframe
              title="Provider Task Map"
              src={routeEmbedUrl}
              loading="lazy"
            />
            <div className="map-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.open(routeShareUrl, "_blank")}
              >
                Open in Maps
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "Task Route",
                        text: "Task to provider route",
                        url: routeShareUrl,
                      });
                      return;
                    }
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(routeShareUrl);
                      toast.success("Location copied.");
                    }
                  } catch {}
                }}
              >
                Share Location
              </button>
            </div>
          </div>
        )}
      </ProviderTaskDetailPageShell>

      <AddQuotationModal
        show={showQutation}
        handleClose={handleCloseQuotation}
        task={task}
        onSubmit={handleQuotationSubmit}
        fallbackCoords={currentLocation}
      />

      <AddQuotationModal
        show={showEditQuotation}
        handleClose={handleCloseEditQuotation}
        task={task}
        onSubmit={handleQuotationSubmit}
        quatation={selectedQuotation}
        fallbackCoords={currentLocation}
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
                  ? taskImageUrl(task.images[0])
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
                              src={userImageUrl(reviewerImage)}
                              alt={reviewerName}
                              className="task-rating-reviewer-avatar"
                              onLoad={(e) => {
                                e.currentTarget.style.display = "inline-block";
                              }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
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
                              src={userImageUrl(ratedSeekerImage)}
                              alt={ratedSeekerName}
                              className="task-rating-reviewer-avatar"
                              onLoad={(e) => {
                                e.currentTarget.style.display = "inline-block";
                              }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
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
