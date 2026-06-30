import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";
import { corpoTaskStatus } from "../utils/Roles";
import {
  handleUserImageError,
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import {
  hasAcceptedQuotationForTask,
  getPosterTaskDetailStepperStatus,
  getQuotationPosterDecisionState,
  mergeQuotationWithOptimisticStatus,
  mergeQuotationWithParentTaskForStatus,
} from "../utils/quotationPosterDecision";
import ChatIcon from "../Assets/Images/chatIcon2.svg";
import {
  canMessageOnActiveTask,
  seekerShouldHideTaskCancellationActions,
  taskStatus,
} from "../utils/jobFlowStatus";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import { isSeekerConfirmedTaskData } from "../utils/seekerCompletion";
import PaymentModal from "../CommanComponents/Modals/PaymentModal";
import {
  getStatusPillMeta,
  TaskDetailHero,
  TaskDetailPageShell,
  TaskDetailStatusCard,
} from "../CommanComponents/TaskDetail/SimbaTaskDetailParts";

export default function TaskDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const postTaskDetails = useSelector(
    (state) => state.UserSlice.postTaskDetail
  );
  const [selectedCorporateByQuotationId, setSelectedCorporateByQuotationId] =
    useState({});
  /** After accept/reject, hide buttons even if GET task detail lags or omits `status`. */
  const [optimisticQuotationStatusById, setOptimisticQuotationStatusById] =
    useState(() => ({}));
  const optimisticQuotationRef = useRef({});
  optimisticQuotationRef.current = optimisticQuotationStatusById;
  const quotationSubmittingIdsRef = useRef(new Set());
  const [quotationSubmittingById, setQuotationSubmittingById] = useState({});
  const [paymentshow, setPaymentShow] = useState(false);
  const [paymentTaskId, setPaymentTaskId] = useState(null);
  const [seekerTaskConfirmed, setSeekerTaskConfirmed] = useState(false);
  const [jobDoneSubmitting, setJobDoneSubmitting] = useState(false);
  const [showJobDoneConfirmModal, setShowJobDoneConfirmModal] = useState(false);
  const [deletePostSubmitting, setDeletePostSubmitting] = useState(false);
  const deletePostInFlightRef = useRef(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [showAllTaskDisputes, setShowAllTaskDisputes] = useState(false);
  const [, setCurrentLocation] = useState(null);
  const previousTaskStatusRef = useRef(null);

  const beginQuotationAction = (quotationId) => {
    if (!quotationId || quotationSubmittingIdsRef.current.has(quotationId)) {
      return false;
    }
    quotationSubmittingIdsRef.current.add(quotationId);
    setQuotationSubmittingById((s) => ({ ...s, [quotationId]: true }));
    return true;
  };

  const endQuotationAction = (quotationId) => {
    if (!quotationId) return;
    quotationSubmittingIdsRef.current.delete(quotationId);
    setQuotationSubmittingById((s) => {
      const next = { ...s };
      delete next[quotationId];
      return next;
    });
  };

  useEffect(() => {
    setOptimisticQuotationStatusById({});
    quotationSubmittingIdsRef.current = new Set();
    setQuotationSubmittingById({});
    setSeekerTaskConfirmed(false);
    setShowAllTaskDisputes(false);
    setPaymentShow(false);
    setPaymentTaskId(null);
    dispatch(CustomerActions.getPostTaskDetail(id));
  }, [dispatch, id]);
  useEffect(() => {
    if (!id) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      dispatch(CustomerActions.getPostTaskDetail(id));
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [dispatch, id]);
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
  const selectedQuotationId =
    task?.quatation_id ?? task?.quotation_id ?? task?.quote_id;
  const canRaiseTaskDispute = Boolean(task?.referenceId && selectedQuotationId);
  const selectedQuotation = quotations?.find(
    (q) => String(q?._id) === String(selectedQuotationId)
  );
  const taskProviderName =
    selectedQuotation?.service_provider?.full_name ||
    quotations?.find(
      (q) => String(q?.service_provider?._id) === String(task?.serviceProviderId)
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
  const taskCoordinates = Array.isArray(task?.location?.coordinates)
    ? task.location.coordinates
    : null;
  const providerCoordinatesFromSelectedQuotation = Array.isArray(
    selectedQuotation?.service_provider?.location?.coordinates
  )
    ? selectedQuotation.service_provider.location.coordinates
    : null;
  const providerCoordinatesFromTaskProvider = Array.isArray(
    quotations?.find(
      (q) => String(q?.service_provider?._id) === String(task?.serviceProviderId)
    )?.service_provider?.location?.coordinates
  )
    ? quotations.find(
        (q) => String(q?.service_provider?._id) === String(task?.serviceProviderId)
      ).service_provider.location.coordinates
    : null;
  const providerCoordinates =
    providerCoordinatesFromSelectedQuotation || providerCoordinatesFromTaskProvider;
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

  const taskSeekerOk =
    task && (isSeekerConfirmedTaskData(task) || seekerTaskConfirmed);
  /** Unpaid: explicit `pending` or no payment object yet after provider completes */
  const taskPaymentPending =
    task &&
    (task.payment == null ||
      String(task?.payment?.status || "").toLowerCase() === "pending");
  const taskShowSeekerJobDoneBtn =
    task &&
    Number(task.status) === taskStatus.COMPLETED &&
    taskPaymentPending &&
    !taskSeekerOk;
  const taskShowSeekerPayBtn =
    task &&
    Number(task.status) === taskStatus.COMPLETED &&
    taskPaymentPending &&
    taskSeekerOk;

  /** Show next to Job Done / Pay when task is completed or has quotation flow */
  const showTaskDetailViewHistory =
    Boolean(quotations?.length > 0) ||
    (task != null && Number(task.status) === taskStatus.COMPLETED);

  const paymentModalPayload = useMemo(
    () => ({ task, quotations }),
    [task, quotations]
  );

  const handlePaymentOpen = (taskId) => {
    setPaymentTaskId(taskId);
    setPaymentShow(true);
  };

  const handlePaymentClose = () => {
    setPaymentShow(false);
    setPaymentTaskId(null);
  };

  const handleSeekerConfirmTask = async () => {
    if (!task?._id) return false;
    setJobDoneSubmitting(true);
    try {
      const res = await dispatch(
        CustomerActions.seekerConfirmTaskComplete({ task_id: task._id })
      );
      const ok =
        Boolean(res?.payload?.success) || res?.payload?.status_code === 200;
      if (ok) {
        toast.success(
          res?.payload?.message || "You confirmed the task is complete."
        );
        setSeekerTaskConfirmed(true);
        dispatch(CustomerActions.getPostTaskDetail(id));
      } else {
        toast.error(
          res?.payload?.message || "Could not confirm. Please try again."
        );
      }
      return ok;
    } catch {
      toast.error("Could not confirm. Please try again.");
      return false;
    } finally {
      setJobDoneSubmitting(false);
    }
  };

  const closeJobDoneConfirmModal = () => {
    if (jobDoneSubmitting) return;
    setShowJobDoneConfirmModal(false);
  };

  const handleConfirmJobDoneInModal = async () => {
    const ok = await handleSeekerConfirmTask();
    if (ok) {
      setShowJobDoneConfirmModal(false);
    }
  };

  /** Aligns stepper with quotation badges when `task.status` lags or legacy coerce would wrong-map `1`. */
  const posterStepperStatus = useMemo(
    () =>
      getPosterTaskDetailStepperStatus(
        task,
        quotations,
        optimisticQuotationStatusById
      ),
    [task, quotations, optimisticQuotationStatusById]
  );
  const hasAcceptedQuotation = useMemo(
    () =>
      hasAcceptedQuotationForTask(
        quotations,
        task,
        optimisticQuotationStatusById
      ),
    [quotations, task, optimisticQuotationStatusById]
  );
  const hasProviderCancelledQuotation = useMemo(
    () => {
      if (!Array.isArray(quotations) || !task) return false;
      const taskSelectedQuotationId =
        task?.quatation_id ?? task?.quotation_id ?? task?.quote_id;
      if (taskSelectedQuotationId == null) return false;
      const selected = quotations.find(
        (q) => String(q?._id) === String(taskSelectedQuotationId)
      );
      if (!selected) return false;
      const merged = mergeQuotationWithParentTaskForStatus(
        mergeQuotationWithOptimisticStatus(
          selected,
          optimisticQuotationStatusById
        ),
        task
      );
      return getQuotationPosterDecisionState(merged).badge === "cancelled";
    },
    [quotations, task, optimisticQuotationStatusById]
  );
  const shouldTreatRejectedAsProviderCancelled = useMemo(() => {
    if (posterStepperStatus !== taskStatus.REJECTED) return false;
    if (!Array.isArray(quotations) || quotations.length === 0) return false;
    if (hasProviderCancelledQuotation) return true;
    const hasActionableQuotation = quotations.some((q) => {
      const merged = mergeQuotationWithParentTaskForStatus(
        mergeQuotationWithOptimisticStatus(q, optimisticQuotationStatusById),
        task
      );
      return getQuotationPosterDecisionState(merged).showActions;
    });
    return hasActionableQuotation;
  }, [
    posterStepperStatus,
    quotations,
    hasProviderCancelledQuotation,
    optimisticQuotationStatusById,
    task,
  ]);
  const providerCancelledWithoutQuotations = useMemo(() => {
    if (!task) return false;
    const selectedQid = task?.quatation_id ?? task?.quotation_id ?? task?.quote_id;
    const selectedProviderId =
      task?.serviceProviderId ??
      task?.service_provider_id ??
      task?.service_provider?._id;
    const hasSelectionMarkers = Boolean(selectedQid && selectedProviderId);
    const noQuotations = !Array.isArray(quotations) || quotations.length === 0;
    return hasSelectionMarkers && noQuotations;
  }, [task, quotations]);
  const shouldShowProviderCancelledState =
    shouldTreatRejectedAsProviderCancelled || providerCancelledWithoutQuotations;
  const displayStepperStatus = shouldShowProviderCancelledState
    ? taskStatus.PENDING
    : posterStepperStatus;
  const shouldShowTaskMap =
    Number(task?.status) === taskStatus.ON_THE_WAY ||
    Number(task?.status) === taskStatus.IN_PROGRESS ||
    Number(task?.status) === taskStatus.COMPLETED ||
    Number(posterStepperStatus) === taskStatus.ON_THE_WAY ||
    Number(posterStepperStatus) === taskStatus.IN_PROGRESS ||
    Number(posterStepperStatus) === taskStatus.COMPLETED ||
    Number(displayStepperStatus) === taskStatus.ON_THE_WAY ||
    Number(displayStepperStatus) === taskStatus.IN_PROGRESS ||
    Number(displayStepperStatus) === taskStatus.COMPLETED;

  useEffect(() => {
    const currentStatus = Number(task?.status);
    if (Number.isNaN(currentStatus)) return;
    const previousStatus = previousTaskStatusRef.current;
    if (previousStatus === null) {
      previousTaskStatusRef.current = currentStatus;
      return;
    }
    if (previousStatus === currentStatus) return;
    previousTaskStatusRef.current = currentStatus;

    const toastId = `task-status-${task?._id}-${currentStatus}`;
    if (currentStatus === taskStatus.ON_THE_WAY) {
      toast.info("Provider is on the way for your task.", { toastId });
      return;
    }
    if (currentStatus === taskStatus.IN_PROGRESS) {
      toast.info("Provider started working on your task.", { toastId });
      return;
    }
    if (currentStatus === taskStatus.COMPLETED) {
      toast.success("Provider marked your task as completed.", { toastId });
    }
  }, [task?._id, task?.status]);

  const handleAccept = async (data, type, corporateIds) => {
    const qid = data?._id;

    if (type === 3) {
      if (!beginQuotationAction(qid)) return;
      const acceptedCorporate = data?.corporateSuggestion?.find(
        (cs) => Number(cs?.userStatus) === corpoTaskStatus.ACCEPT
      );
      const corporateId =
        corporateIds ||
        acceptedCorporate?.corporateIds?._id ||
        acceptedCorporate?.corporateIds?.id;
      const taskStatusPayload = {
        quatation_id: data?._id,
        task_id: id,
        service_provider_id: data?.service_provider?._id,
        status: 3,
      };
      const suggestionStatusPayload = {
        taskId: id,
        status: 3,
        corporateId: corporateId || undefined,
      };
      try {
        const resTask = await dispatch(
          CustomerActions.acceptRejectTaskStatus(taskStatusPayload)
        );
        if (!resTask?.payload?.success) {
          toast.error(
            resTask?.payload?.message || "Could not update task status."
          );
          return;
        }
        if (corporateId) {
          await dispatch(
            CustomerActions.acceptRejectTaskCorporateSuggestion(
              suggestionStatusPayload
            )
          );
        }
        toast.success("Job marked as done.");
        dispatch(CustomerActions.getPostTaskDetail(id));
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        endQuotationAction(qid);
      }
      return;
    }

    if (type !== "accept" && type !== "reject") {
      return;
    }

    if (!qid) return;

    const merged = mergeQuotationWithParentTaskForStatus(
      mergeQuotationWithOptimisticStatus(data, optimisticQuotationRef.current),
      task
    );
    if (!getQuotationPosterDecisionState(merged).showActions) {
      return;
    }

    if (!beginQuotationAction(qid)) return;

    const statusValueAcceptReject = type === "accept" ? 1 : 2;
    const providerName = data?.service_provider?.full_name?.trim() || "Provider";

    const taskStatusPayload = {
      quatation_id: data?._id,
      task_id: id,
      service_provider_id: data?.service_provider?._id,
      status: statusValueAcceptReject,
    };

    try {
      const resTask = await dispatch(
        CustomerActions.acceptRejectTaskStatus(taskStatusPayload)
      );
      if (!resTask?.payload?.success) {
        toast.error(
          resTask?.payload?.message || "Could not update quotation status."
        );
        return;
      }

      setOptimisticQuotationStatusById((prev) => ({
        ...prev,
        [qid]: statusValueAcceptReject,
      }));

      toast.success(
        type === "accept"
          ? `You accepted ${providerName}'s quotation.`
          : `You rejected ${providerName}'s quotation.`
      );
      dispatch(CustomerActions.getPostTaskDetail(id));
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      endQuotationAction(qid);
    }
  };

  const handleCorporateSuggestion = async (quotationId, corporateId, status) => {
    if (!corporateId) {
      toast.error("Please select a corporate suggestion.");
      return;
    }
    const actionKey = `corp-${quotationId}`;
    if (!beginQuotationAction(actionKey)) return;

    try {
      const res = await dispatch(
        CustomerActions.acceptRejectTaskCorporateSuggestion({
          taskId: id,
          status,
          corporateId,
        })
      );
      const suggestion = res?.payload?.data;
      if (suggestion) {
        toast.success(
          status === corpoTaskStatus.ACCEPT
            ? "Corporate suggestion accepted. The corporate partner will receive this lead."
            : "Corporate suggestion rejected."
        );
        setSelectedCorporateByQuotationId((prev) => {
          const next = { ...prev };
          delete next[quotationId];
          return next;
        });
        dispatch(CustomerActions.getPostTaskDetail(id));
      } else {
        toast.error(
          res?.payload?.message ||
            res?.payload?.error ||
            "Could not update corporate suggestion."
        );
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      endQuotationAction(actionKey);
    }
  };

  const handleDeletePost = (id) => {
    if (!id || deletePostInFlightRef.current) return;
    deletePostInFlightRef.current = true;
    setDeletePostSubmitting(true);
    dispatch(CustomerActions.deleteTasks(id))
      .then((res) => {
        if (res?.payload?.success) {
          toast.success(res?.payload?.message || "Task deleted successfully.");
          navigate("/my-task");
          return;
        }
        toast.error(res?.payload?.message || "Could not delete task.");
      })
      .catch(() => {
        toast.error("Could not delete task.");
      })
      .finally(() => {
        deletePostInFlightRef.current = false;
        setDeletePostSubmitting(false);
      });
  };
  const toggleSelect = (quotationId, corpId) => {
    setSelectedCorporateByQuotationId((prev) => ({
      ...prev,
      [quotationId]: prev[quotationId] === corpId ? null : corpId,
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

  const statePill = getStatusPillMeta(
    displayStepperStatus,
    shouldShowProviderCancelledState
  );
  const scheduleText = formatTaskWhenDoneDisplay(task?.when_done);
  const acceptedProviderId =
    selectedQuotation?.service_provider?._id ??
    selectedQuotation?.service_provider_id ??
    task?.serviceProviderId ??
    task?.service_provider_id ??
    task?.service_provider?._id ??
    null;
  const canMessageAcceptedProvider =
    canMessageOnActiveTask(task?.status) && Boolean(acceptedProviderId);
  const handleMessageProvider = () => {
    if (!acceptedProviderId) return;
    localStorage.setItem("reciverID", acceptedProviderId);
    navigate(`/messages?userID=${acceptedProviderId}`);
  };

  return (
    <Layout footerVariant="marketing">
      <TaskDetailPageShell>
        {task && (
          <TaskDetailHero
            task={task}
            scheduleText={scheduleText}
            statePill={statePill}
            showTaskDetailViewHistory={showTaskDetailViewHistory}
            taskShowSeekerJobDoneBtn={taskShowSeekerJobDoneBtn}
            taskShowSeekerPayBtn={taskShowSeekerPayBtn}
            jobDoneSubmitting={jobDoneSubmitting}
            deletePostSubmitting={deletePostSubmitting}
            quotationsLength={quotations?.length ?? 0}
            providerCancelledWithoutQuotations={providerCancelledWithoutQuotations}
            canRaiseTaskDispute={canRaiseTaskDispute}
            onNavigateBookings={() => navigate("/bookings")}
            onNavigateEditTask={() => navigate(`/edit-task/${task?._id}`)}
            onDeletePost={() => handleDeletePost(task?._id)}
            onJobDone={() => setShowJobDoneConfirmModal(true)}
            onPayNow={() => handlePaymentOpen(task._id)}
            onRaiseDispute={handleOpenDisputeModal}
            seekerShouldHideTaskCancellationActions={
              seekerShouldHideTaskCancellationActions
            }
            showMessageProvider={canMessageAcceptedProvider}
            onMessageProvider={handleMessageProvider}
            acceptedProviderName={taskProviderName}
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
                  {dispute?.description ? (
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
        )}

        {task && (
          <TaskDetailStatusCard
            displayStepperStatus={displayStepperStatus}
            posterStepperStatus={posterStepperStatus}
            shouldShowProviderCancelledState={shouldShowProviderCancelledState}
            statePill={statePill}
          />
        )}

        {!providerCancelledWithoutQuotations && (
          <div className="card">
            <div className="card-h">
              <h3>Quotations</h3>
            </div>
            <p className="state-note">
              Providers who&apos;ve sent you an offer for this task.
            </p>
            {quotations?.length === 0 ? (
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
                <p>Currently you don&apos;t have any offers</p>
              </div>
            ) : (
              <div className="quotes">
                {quotations?.map((quotation, index) => {
                  const quotationForUi = mergeQuotationWithParentTaskForStatus(
                    mergeQuotationWithOptimisticStatus(
                      quotation,
                      optimisticQuotationStatusById
                    ),
                    task
                  );
                  const posterState =
                    getQuotationPosterDecisionState(quotationForUi);
                  const taskLevelSelectedQuotationId =
                    task?.quatation_id ?? task?.quotation_id ?? task?.quote_id;
                  const taskLevelSelectedProviderId =
                    task?.serviceProviderId ?? task?.service_provider_id ?? null;
                  const qProviderId =
                    quotation?.service_provider?._id ??
                    quotation?.service_provider_id ??
                    null;
                  const taskInPostAcceptFlow = [
                    taskStatus.COMPLETED,
                    taskStatus.ON_THE_WAY,
                    taskStatus.IN_PROGRESS,
                  ].includes(Number(task?.status));
                  const selectionIdsMatch =
                    taskLevelSelectedQuotationId != null &&
                    String(taskLevelSelectedQuotationId) ===
                      String(quotation?._id) &&
                    (taskLevelSelectedProviderId == null ||
                      (qProviderId != null &&
                        String(taskLevelSelectedProviderId) ===
                          String(qProviderId)));
                  const hasTaskLevelAcceptedDecision =
                    taskLevelSelectedQuotationId != null &&
                    (Number(task?.status) === taskStatus.ACCEPTED ||
                      taskInPostAcceptFlow);
                  const isTaskLevelSelectedQuotation =
                    hasTaskLevelAcceptedDecision && selectionIdsMatch;
                  const isTaskLevelOtherQuotation =
                    hasTaskLevelAcceptedDecision && !isTaskLevelSelectedQuotation;
                  const isTaskLevelRejectedSelectedQuotation =
                    Number(task?.status) === taskStatus.REJECTED &&
                    taskLevelSelectedQuotationId != null &&
                    String(taskLevelSelectedQuotationId) ===
                      String(quotation?._id);
                  const resolvedPosterState = isTaskLevelSelectedQuotation
                    ? { showActions: false, badge: "accepted" }
                    : isTaskLevelRejectedSelectedQuotation
                    ? {
                        showActions: false,
                        badge: posterState.badge || "rejected",
                      }
                    : posterState;
                  const showActionButtons = isTaskLevelOtherQuotation
                    ? true
                    : resolvedPosterState.showActions;
                  const disableActionButtons =
                    isTaskLevelOtherQuotation ||
                    (resolvedPosterState.showActions && hasAcceptedQuotation);
                  const isSelectedRejectedQuotation =
                    isTaskLevelRejectedSelectedQuotation;
                  const effectiveBadge =
                    resolvedPosterState.badge === "rejected" &&
                    isSelectedRejectedQuotation &&
                    shouldTreatRejectedAsProviderCancelled
                      ? "cancelled"
                      : resolvedPosterState.badge;
                  const firstCs = quotation?.corporateSuggestion?.[0];
                  const showJobDone =
                    effectiveBadge === "accepted" &&
                    firstCs &&
                    Number(firstCs.corporateStatus) ===
                      corpoTaskStatus.COMPLETED &&
                    Number(firstCs.userStatus) !== corpoTaskStatus.ACCEPT;

                  const submittingThis =
                    !!quotationSubmittingById[quotation._id];
                  const providerName =
                    quotation?.service_provider?.full_name || "Provider";
                  const providerAddress =
                    quotation?.service_provider?.address !== "undefined"
                      ? quotation?.service_provider?.address
                      : "-";
                  const avatarColors = ["#0F5C4C", "#C2682B", "#2B4FB8", "#7A4B9E"];
                  const avatarColor =
                    avatarColors[index % avatarColors.length];
                  const providerInitials = providerName
                    .slice(0, 2)
                    .toUpperCase();
                  const isAcceptedProviderQuotation =
                    isTaskLevelSelectedQuotation ||
                    resolvedPosterState.badge === "accepted";
                  const showCorporateSection =
                    quotation?.corporateSuggestion?.length > 0 &&
                    (isAcceptedProviderQuotation ||
                      (!hasAcceptedQuotation && showActionButtons));
                  const showCorporateDecisionUi =
                    isAcceptedProviderQuotation &&
                    !quotation.corporateSuggestion.some(
                      (cs) => Number(cs?.userStatus) === corpoTaskStatus.ACCEPT
                    );
                  const selectedCorporateId =
                    selectedCorporateByQuotationId[quotation._id] || null;
                  const corporateSubmitting =
                    !!quotationSubmittingById[`corp-${quotation._id}`];

                  return (
                    <div key={quotation._id || index} className="qcard-stack">
                      <div
                        className={`qcard${
                          effectiveBadge === "accepted" ? " accepted" : ""
                        }${disableActionButtons ? " qcard--locked" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/quotations-detail/${quotation?._id}`)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigate(`/quotations-detail/${quotation?._id}`);
                          }
                        }}
                      >
                        <div
                          className="qav"
                          style={{
                            background: `linear-gradient(145deg,${avatarColor},${avatarColor}99)`,
                          }}
                        >
                          <img
                            src={userImageUrl(quotation?.service_provider)}
                            alt={providerName}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.parentElement.textContent =
                                providerInitials;
                            }}
                          />
                        </div>
                        <div className="qinfo">
                          <b>{providerName}</b>
                          <div className="qloc">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            {providerAddress}
                          </div>
                          <div className="qstars">
                            <StarRating averageRating={quotation.averageRating} />
                            {quotation?.description ? (
                              <span className="note">
                                &quot;{quotation.description}&quot;
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className="qright"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="qprice">
                            <b>${quotation?.offer_price}</b>
                            <small>Offer price</small>
                          </div>
                          {effectiveBadge === "accepted" ? (
                            <span className="accepted-badge">
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m20 6-11 11-5-5" />
                              </svg>
                              Accepted
                            </span>
                          ) : effectiveBadge === "rejected" ||
                            effectiveBadge === "cancelled" ? (
                            <span className="rejected-badge">
                              {effectiveBadge === "cancelled"
                                ? "Cancelled by provider"
                                : "Rejected"}
                            </span>
                          ) : showActionButtons ? (
                            <div className="qactions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={submittingThis || disableActionButtons}
                                onClick={() => handleAccept(quotation, "accept")}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={submittingThis || disableActionButtons}
                                onClick={() => handleAccept(quotation, "reject")}
                              >
                                Reject
                              </button>
                            </div>
                          ) : showJobDone ? (
                            <div className="qactions">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={submittingThis}
                                onClick={() => handleAccept(quotation, 3)}
                              >
                                Job Done
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {showCorporateSection && (
                        <div className="qcard-corporate">
                          <h5>Suggested Corporate</h5>
                          {!isAcceptedProviderQuotation && (
                            <p className="state-note px-4 pt-1 mb-0">
                              Accept this provider&apos;s quotation to choose a
                              corporate partner.
                            </p>
                          )}
                          <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                            {quotation.corporateSuggestion.map(
                              (item, corpIndex) => {
                                const corp = item?.corporateIds;
                                const status =
                                  Number(item?.userStatus) ===
                                  corpoTaskStatus.ACCEPT;
                                if (!corp) return null;
                                const isSelected =
                                  selectedCorporateId === corp._id;

                                return (
                                  <div
                                    key={item._id || corpIndex}
                                    className="corporate-item d-flex align-items-center py-2"
                                    style={{ gap: "10px" }}
                                  >
                                    {showCorporateDecisionUi && (
                                      <Form.Check
                                        type="checkbox"
                                        className="me-2"
                                        checked={isSelected}
                                        onChange={() =>
                                          toggleSelect(quotation._id, corp._id)
                                        }
                                      />
                                    )}

                                    <img
                                      src={userImageUrl(corp)}
                                      onError={handleUserImageError}
                                      alt={corp.full_name}
                                      className="rounded-circle"
                                      width={40}
                                      height={40}
                                      onClick={() =>
                                        navigate(`/get-corporate/${corp._id}`)
                                      }
                                    />
                                    <div className="flex-grow-1">
                                      <div className="fw-bold d-flex">
                                        {corp.full_name}
                                        {status && (
                                          <span className="badge bg-success ms-2 mb-0">
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
                                    {status &&
                                      Number(item?.userStatus) ===
                                        corpoTaskStatus.ACCEPT && (
                                        <div className="quotation-inner d-flex justify-content-center gap-4 mb-0">
                                          <div
                                            className="action-button-wrap"
                                            onClick={() => {
                                              localStorage.setItem(
                                                "reciverID",
                                                corp._id
                                              );
                                              navigate(
                                                `/messages?userID=${corp._id}`
                                              );
                                            }}
                                          >
                                            <div className="icon-circle green">
                                              <img src={ChatIcon} alt="Chat" />
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {showCorporateDecisionUi && (
                            <div className="px-4 pb-3 pt-2 d-flex gap-3 justify-content-center flex-wrap">
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={
                                  !selectedCorporateId || corporateSubmitting
                                }
                                onClick={() =>
                                  handleCorporateSuggestion(
                                    quotation._id,
                                    selectedCorporateId,
                                    corpoTaskStatus.ACCEPT
                                  )
                                }
                              >
                                Accept Corporate
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={
                                  !selectedCorporateId || corporateSubmitting
                                }
                                onClick={() =>
                                  handleCorporateSuggestion(
                                    quotation._id,
                                    selectedCorporateId,
                                    corpoTaskStatus.REJECT
                                  )
                                }
                              >
                                Reject Corporate
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {task && shouldShowTaskMap && mapLat != null && mapLng != null && (
          <div className="card">
            <div className="card-h">
              <h3>Live Location</h3>
            </div>
            <iframe
              title="Task Map"
              src={routeEmbedUrl}
              width="100%"
              height="260"
              style={{ border: 0, borderRadius: "8px" }}
              loading="lazy"
            />
            <div className="hero-actions mt-3">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => window.open(routeShareUrl, "_blank")}
              >
                Open in Maps
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
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
      </TaskDetailPageShell>

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

      <Modal
        show={showJobDoneConfirmModal}
        onHide={closeJobDoneConfirmModal}
        centered
        backdrop={jobDoneSubmitting ? "static" : true}
        keyboard={!jobDoneSubmitting}
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>Confirm job complete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 text-secondary">
            Are you sure you want to mark this job as done? After you confirm,
            the <strong className="text-dark">Pay Now</strong> option will
            appear so you can complete payment.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 job-done-confirm-modal-footer">
          <button
            type="button"
            className="btn btn-light border job-done-confirm-modal-btn"
            onClick={closeJobDoneConfirmModal}
            disabled={jobDoneSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="booking-job-done-btn job-done-confirm-modal-btn"
            onClick={handleConfirmJobDoneInModal}
            disabled={jobDoneSubmitting}
          >
            {jobDoneSubmitting ? "Please wait…" : "Yes, job done"}
          </button>
        </Modal.Footer>
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

      <PaymentModal
        paymentshow={paymentshow}
        handlePaymentClose={handlePaymentClose}
        id={paymentTaskId}
        type="task"
        data={paymentModalPayload}
      />
    </Layout>
  );
}
