import { useEffect, useMemo, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";
import { corpoTaskStatus } from "../utils/Roles";
import defaultImage from "../Assets/Images/placeholder.jpg";
import {
  getPosterTaskDetailStepperStatus,
  getQuotationPosterDecisionState,
  mergeQuotationWithOptimisticStatus,
  mergeQuotationWithParentTaskForStatus,
} from "../utils/quotationPosterDecision";
import ChatIcon from "../Assets/Images/chatIcon2.svg";
import JobFlowStepper from "../CommanComponents/JobFlowStepper";
import {
  getSeekerTaskFlowDescription,
  getTaskFlowStepperState,
  JOB_FLOW_STEP_LABELS,
  seekerShouldHideTaskCancellationActions,
  taskStatus,
} from "../utils/jobFlowStatus";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import { isSeekerConfirmedTaskData } from "../utils/seekerCompletion";
import PaymentModal from "../CommanComponents/Modals/PaymentModal";

export default function TaskDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const postTaskDetails = useSelector(
    (state) => state.UserSlice.postTaskDetail
  );
  const [selectedCorporateIds, setSelectedCorporateIds] = useState("");
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
    setOptimisticQuotationStatusById({});
    quotationSubmittingIdsRef.current = new Set();
    setQuotationSubmittingById({});
    setSeekerTaskConfirmed(false);
    setPaymentShow(false);
    setPaymentTaskId(null);
    dispatch(CustomerActions.getPostTaskDetail(id));
  }, [dispatch, id]);

  const task = postTaskDetails?.data?.task;
  const quotations = postTaskDetails?.data?.quotations;

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

  const getPosterTaskStatusColor = (st) => {
    const s = Number(st);
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

  const handleAccept = async (data, type, corporateIds) => {
    const qid = data?._id;

    if (type === 3) {
      if (!beginQuotationAction(qid)) return;
      const taskStatusPayload = {
        quatation_id: data?._id,
        task_id: id,
        service_provider_id: data?.service_provider?._id,
        status: 3,
      };
      const suggestionStatusPayload = {
        taskId: id,
        status: 3,
        corporateId: corporateIds || undefined,
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
        await dispatch(
          CustomerActions.acceptRejectTaskCorporateSuggestion(
            suggestionStatusPayload
          )
        );
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

    const suggestionStatusPayload = {
      taskId: id,
      status: statusValueAcceptReject,
      corporateId: corporateIds || undefined,
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

      await dispatch(
        CustomerActions.acceptRejectTaskCorporateSuggestion(
          suggestionStatusPayload
        )
      );

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

  const handleDeletePost = (id) => {
    dispatch(CustomerActions.deleteTasks(id)).then((res) => {
      if (res && res?.payload) {
        toast.success(res?.payload?.message);
        navigate("/my-task");
      }
    });
  };
  const toggleSelect = (id) => {
    setSelectedCorporateIds((prev) => (prev === id ? null : id));
  };

  const handleCorporateAddSave = (taskId, selectedIds) => {
    console.log(selectedIds, "selectedIds");
    console.log(taskId, "taskId");
  };

  const handleCorporateReject = (taskId, selectedIds) => {
    console.log(selectedIds, "selectedIds");
    console.log(taskId, "taskId");
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title">
                <h2>Task Details</h2>
              </div>
              <div className="service-detail-card pt-3">
                {task?.images?.length > 0 ? (
                  <Slider {...sliderSettings}>
                    {task.images.map((image, index) => (
                      <div key={index} className="card-box task-details">
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
                    src={require("../Assets/Images/living-room-cleaning.png")}
                    alt="Default"
                  />
                )}
                <div>
                  <h3>{task?.need_done || "Task"}</h3>
                  <h5>
                    {task?.task_time},{" "}
                    {formatTaskWhenDoneDisplay(task?.when_done)}
                  </h5>
                  <p>{task?.details || "No description provided."}</p>
                  <div className="book-service-action-btn task-detail-price-actions">
                    <h4>${task?.budget || "N/A"}</h4>
                    <div className="task-detail-primary-actions">
                      {taskShowSeekerJobDoneBtn && (
                        <button
                          type="button"
                          className="booking-job-done-btn"
                          onClick={() => setShowJobDoneConfirmModal(true)}
                          disabled={jobDoneSubmitting}
                        >
                          Job Done
                        </button>
                      )}
                      {taskShowSeekerPayBtn && (
                        <button
                          type="button"
                          className="task-detail-view-history-btn"
                          onClick={() => handlePaymentOpen(task._id)}
                        >
                          Pay Now
                        </button>
                      )}
                      {showTaskDetailViewHistory && (
                        <button
                          type="button"
                          className="task-detail-view-history-btn"
                          onClick={() => navigate("/bookings")}
                        >
                          View history
                        </button>
                      )}
                    </div>
                    {quotations?.length === 0 ? (
                      <button
                        onClick={() => navigate(`/edit-task/${task?._id}`)}
                      >
                        Edit Post
                      </button>
                    ) : !seekerShouldHideTaskCancellationActions(
                        task?.status
                      ) ? (
                      <button onClick={() => handleDeletePost(task?._id)}>
                        Delete Post
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
          {quotations?.length > 0 && (
            <Row>
              <Col lg={12}>
                <section className="booking-status-sec mt-3">
                  <div className="booking-status-txt pt-0">
                    <div className="booking-status-left-txt">
                      <h2>Status</h2>
                      {(() => {
                        const flow =
                          getTaskFlowStepperState(posterStepperStatus);
                        const headline =
                          flow.variant !== "default"
                            ? flow.terminalLabel || "Status"
                            : JOB_FLOW_STEP_LABELS[flow.activeStep] ||
                              "Status";
                        return (
                          <>
                            <h3
                              className={getPosterTaskStatusColor(
                                posterStepperStatus
                              )}
                            >
                              {headline}
                            </h3>
                            <JobFlowStepper
                              mode="task"
                              status={posterStepperStatus}
                            />
                            <p>
                              {getSeekerTaskFlowDescription(
                                posterStepperStatus
                              )}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </section>
              </Col>
            </Row>
          )}
        </Container>
      </section>
      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <h2>Quotations</h2>
            </div>
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
                <p>Currently you don’t have any offers</p>
              </div>
            ) : (
              <div>
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
                  const firstCs = quotation?.corporateSuggestion?.[0];
                  const showJobDone =
                    posterState.badge === "accepted" &&
                    firstCs &&
                    Number(firstCs.corporateStatus) ===
                      corpoTaskStatus.COMPLETED &&
                    Number(firstCs.userStatus) !== corpoTaskStatus.ACCEPT;

                  const submittingThis =
                    !!quotationSubmittingById[quotation._id];

                  return (
                  <div
                    className={`quotation-requests-wrap quotation-poster-card${
                      posterState.badge
                        ? " quotation-poster-card--with-badge"
                        : ""
                    }`}
                    key={quotation._id || index}
                  >
                    {!posterState.showActions && posterState.badge && (
                      <span
                        className={
                          posterState.badge === "accepted"
                            ? "review-status-corner-badge review-status-corner-badge--published"
                            : "review-status-corner-badge review-status-corner-badge--rejected"
                        }
                      >
                        {posterState.badge === "accepted"
                          ? "Accepted"
                          : "Rejected"}
                      </span>
                    )}
                    <div className="quotation-requests quotation-requests-inner">
                      <div className="quotation-requests-inner">
                        <div className="quotation-txt-show">
                          <div
                            className="profile-side cursor-pointer"
                            onClick={() =>
                              navigate(`/quotations-detail/${quotation?._id}`)
                            }
                          >
                            <img
                              className="point-cursor"
                              src={quotation?.service_provider?.profile_image ? `${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`  : defaultImage}
                              alt="categories-img"
                            />
                            <div>
                              <h5>{quotation?.service_provider?.full_name}</h5>
                              <p>{quotation?.service_provider?.address}</p>
                              <div className="rating-stars">
                                <ul>
                                  {" "}
                                  <StarRating
                                    averageRating={quotation.averageRating}
                                  />
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p>{quotation?.description}</p>
                      </div>
                      <div className="quotation-requests-task-btns">
                        <div>
                          <h5>${quotation?.offer_price}</h5>
                          <p>Offer Price</p>
                        </div>
                        {posterState.showActions ? (
                          <div className="btn-price">
                            <button
                              type="button"
                              disabled={submittingThis}
                              onClick={() =>
                                handleAccept(
                                  quotation,
                                  "accept",
                                  selectedCorporateIds
                                )
                              }
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={submittingThis}
                              onClick={() =>
                                handleAccept(
                                  quotation,
                                  "reject",
                                  selectedCorporateIds
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : showJobDone ? (
                          <div className="btn-price">
                            <button
                              type="button"
                              className="primaryBtn"
                              disabled={submittingThis}
                              onClick={() => handleAccept(quotation, 3)}
                            >
                              Job Done
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="quotation-wrapper">
                      {quotation?.corporateSuggestion?.length > 0 && (
                        <div className="suggested-caproate cursor-pointer">
                          <h5>Suggested Corporate</h5>
                          <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                            {quotation.corporateSuggestion.map(
                              (item, index) => {
                                const corp = item?.corporateIds;
                                const status = item?.userStatus === 1;
                                if (!corp) return null;
                                const isSelected =selectedCorporateIds === corp._id;

                                return (
                                  <div
                                    key={item._id || index}
                                    className="corporate-item d-flex align-items-center py-2"
                                    style={{ gap: "10px" }}
                                  >
                                   {!quotation.corporateSuggestion.some(
                                    (cs) => cs.userStatus === 1
                                  ) && (
                                      <Form.Check
                                        type="checkbox"
                                        className="me-2"
                                        checked={isSelected}
                                        onChange={() => toggleSelect(corp._id)}
                                      />
                                    )}

                                    <img
                                      src={`${process.env.REACT_APP_API_URL}/${corp.profile_image}`}
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
                                    {status && Number(item?.userStatus) === 1  &&
                                         <div className="quotation-inner d-flex justify-content-center gap-4 mb-0">
                                        <div
                                          className="action-button-wrap"
                                          onClick={() =>{
                                              localStorage.setItem("reciverID", corp._id);
                                            navigate(
                                              `/messages?userID=${corp._id}`
                                            )
                                          }
                                          }
                                        >
                                          <div className="icon-circle green">
                                            <img src={ChatIcon} alt="Chat" />
                                          </div>
                                        </div>
                                      </div> } 
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {!quotation.corporateSuggestion.some(
                            (cs) => cs.userStatus === 1
                          ) && (
                            <div className="px-4 pb-3 pt-2 d-flex gap-5 justify-content-center">
                              <button
                                className="primaryBtn w-25"
                                disabled={!selectedCorporateIds}
                                onClick={() =>
                                  handleCorporateAddSave(task?._id, [
                                    selectedCorporateIds,
                                  ])
                                }
                              >
                                Accept Corporate
                              </button>
                              <button
                                className="view-more-btn w-25"
                                disabled={!selectedCorporateIds}
                                onClick={() =>
                                  handleCorporateReject(task?._id, [
                                    selectedCorporateIds,
                                  ])
                                }
                              >
                                Reject Corporate
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </Container>
      </section>

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
