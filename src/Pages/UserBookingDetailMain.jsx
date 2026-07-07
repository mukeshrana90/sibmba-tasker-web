import { Link } from "react-router-dom";
import moment from "moment";
import { Form } from "react-bootstrap";
import JobFlowStepper from "../CommanComponents/JobFlowStepper";
import ChatIcon from "../Assets/Images/chatIcon2.svg";
import {
  bookingStatus,
  bookingSeekerShouldHideCancellationActions,
  canMessageOnActiveBooking,
  canMessageOnActiveTask,
  getBookingFlowDescription,
  getBookingFlowStepperState,
  getSeekerTaskFlowDescription,
  JOB_FLOW_STEP_LABELS,
  seekerShouldHideTaskCancellationActions,
  taskStatus,
} from "../utils/jobFlowStatus";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import {
  formatDisplayTitle,
  handleUserImageError,
  serviceImageUrl,
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import {
  BookingDetailGallery,
  BookingDetailPageShell,
  BookingInfoCard,
  BookingStatusCard,
  getServiceStatusMeta,
  getTaskBookingStatusMeta,
  NeedHelpCard,
  PaymentSummaryCard,
  ProviderBlockCard,
} from "../CommanComponents/BookingDetail/SimbaBookingDetailParts";
import { customerServiceDetailPath } from "../utils/normalizeMongoId";

export default function UserBookingDetailMain({
  task,
  bookingState,
  taskbooking,
  selectedQuotation,
  posterTaskStepperStatus,
  isReschedulePendingForUser,
  bookingShowJobDoneBtn,
  bookingShowPayBtn,
  taskShowJobDoneBtn,
  taskShowPayBtn,
  jobDoneSubmitting,
  rescheduleAcceptSubmitting,
  canRaiseBookingDispute,
  canRaiseTaskDispute,
  hasSubmittedFeedback,
  bookingDisputes,
  visibleBookingDisputes,
  showAllBookingDisputes,
  setShowAllBookingDisputes,
  taskDisputes,
  visibleTaskDisputes,
  showAllTaskDisputes,
  setShowAllTaskDisputes,
  getBookingDisputeRaisedByName,
  getBookingDisputeRaisedByClass,
  getTaskDisputeRaisedByName,
  getTaskDisputeRaisedByClass,
  corporateSuggestions,
  selectedCorporateIds,
  toggleSelect,
  shouldShowOnWayMap,
  routeEmbedUrl,
  mapLat,
  mapLng,
  openMapAt,
  shareMapAt,
  renderExistingFeedback,
  navigate,
  handleEditOpen,
  setSelectedBoooking,
  handleAcceptRescheduledBooking,
  openJobDoneConfirmModal,
  handlePaymentOpen,
  handleShow,
  handleFeedbackOpen,
  handleOpenDisputeModal,
  handleAccept,
  handleAcceptCrop,
  setCorporateProfile,
}) {
  const isTask = Boolean(task);
  const rebookServiceUrl = bookingState?.serviceSubCategory?._id
    ? customerServiceDetailPath(bookingState.serviceSubCategory._id, {
        openBooking: 1,
      })
    : null;

  const renderSidebarActions = () => {
    if (bookingState) {
      const paid = bookingState.payment?.status === "paid";
      const unpaid = !paid && ![3, 5].includes(bookingState.status);

      return (
        <>
          {unpaid && (
            <>
              {[1].includes(bookingState.status) && !isReschedulePendingForUser && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => {
                    handleEditOpen(bookingState.serviceSubCategory?._id);
                    setSelectedBoooking(bookingState);
                  }}
                >
                  Edit booking
                </button>
              )}
              {isReschedulePendingForUser && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={rescheduleAcceptSubmitting}
                  onClick={handleAcceptRescheduledBooking}
                >
                  {rescheduleAcceptSubmitting ? "Please wait..." : "Accept reschedule"}
                </button>
              )}
              {canMessageOnActiveBooking(bookingState.status) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => {
                    navigate(`/messages?userID=${bookingState.serviceProvider?._id}`);
                    localStorage.setItem("reciverID", bookingState.serviceProvider?._id);
                  }}
                >
                  Message provider
                </button>
              )}
              {[4, 6, 7].includes(Number(bookingState.status)) && bookingShowJobDoneBtn && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={jobDoneSubmitting}
                  onClick={() => openJobDoneConfirmModal("booking")}
                >
                  Job done
                </button>
              )}
              {[4].includes(bookingState.status) && bookingShowPayBtn && (
                <button
                  type="button"
                  className="btn btn-gold btn-block"
                  onClick={() => {
                    handlePaymentOpen(bookingState._id);
                    setSelectedBoooking(bookingState);
                  }}
                >
                  Pay now
                </button>
              )}
              {[1, 2].includes(bookingState.status) &&
                !bookingSeekerShouldHideCancellationActions(bookingState.status) &&
                Number(bookingState.status) !== bookingStatus.ON_THE_WAY &&
                Number(bookingState.status) !== bookingStatus.IN_PROGRESS &&
                Number(bookingState.status) !== bookingStatus.COMPLETED && (
                  <button type="button" className="btn btn-ghost btn-block" onClick={handleShow}>
                    Cancel booking
                  </button>
                )}
            </>
          )}
          {paid && (
            <>
              <button
                type="button"
                className="btn btn-gold btn-block"
                onClick={handleFeedbackOpen}
                disabled={hasSubmittedFeedback}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
                </svg>
                {hasSubmittedFeedback ? "Feedback submitted" : "Leave feedback"}
              </button>
              {rebookServiceUrl && (
                <Link to={rebookServiceUrl} className="btn btn-ghost btn-block">
                  Book again
                </Link>
              )}
            </>
          )}
          <Link to="/bookings" className="btn btn-ghost btn-block">
            Back to bookings
          </Link>
        </>
      );
    }

    if (task) {
      return (
        <>
          {canMessageOnActiveTask(task?.status) && provider?._id && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                navigate(`/messages?userID=${provider._id}`);
                localStorage.setItem("reciverID", provider._id);
              }}
            >
              Message provider
            </button>
          )}
          {taskShowJobDoneBtn && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={jobDoneSubmitting}
              onClick={() => openJobDoneConfirmModal("task")}
            >
              Job done
            </button>
          )}
          {taskShowPayBtn && (
            <button
              type="button"
              className="btn btn-gold btn-block"
              onClick={() => {
                handlePaymentOpen(task._id);
                setSelectedBoooking(taskbooking);
              }}
            >
              Pay now
            </button>
          )}
          {task?.status !== 1 && task?.status !== 2 && (
            <button
              type="button"
              className="btn btn-gold btn-block"
              onClick={handleFeedbackOpen}
              disabled={hasSubmittedFeedback}
            >
              {hasSubmittedFeedback ? "Feedback submitted" : "Leave feedback"}
            </button>
          )}
          {task?.status === 1 &&
            !seekerShouldHideTaskCancellationActions(task?.status) && (
              <>
                <button type="button" className="btn btn-ghost btn-block" onClick={handleShow}>
                  Cancel booking
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={Number(task?.status) >= taskStatus.ACCEPTED}
                  onClick={() => {
                    if (Number(task?.status) >= taskStatus.ACCEPTED) return;
                    navigate(`/edit-task/${task._id}`);
                  }}
                >
                  Edit task
                </button>
              </>
            )}
          <Link to="/bookings" className="btn btn-ghost btn-block">
            Back to bookings
          </Link>
        </>
      );
    }

    return null;
  };

  const renderCorporateSuggestions = (suggestions, isTaskCorporate) => {
    if (!suggestions?.length) return null;
    return (
      <div className="card">
        <h2>Suggested Corporate</h2>
        <div className="modal-scrollable-list pt-2">
          {suggestions.map((corp, idx) => {
            const corpId = corp?.corporateIds?._id;
            const isSelected = selectedCorporateIds?.corporateIds?._id === corpId;
            const corpData = corp.corporateIds || corp;
            return (
              <div key={corp._id || idx} className="d-flex align-items-center gap-3 mb-3">
                {!suggestions.some((cs) => cs.userStatus === 1) && !isTaskCorporate && (
                  <Form.Check
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(corp)}
                  />
                )}
                <div
                  className="d-flex align-items-center gap-3 flex-grow-1"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/get-corporate/${corpId}`)}
                >
                  <img
                    src={corpData?.profile_image ? userImageUrl(corpData) : "/Assets/Images/default-user.png"}
                    className="rounded-circle"
                    style={{ width: 50, height: 50, objectFit: "cover" }}
                    alt=""
                    onError={handleUserImageError}
                  />
                  <div>
                    <div className="fw-bold d-flex align-items-center gap-2">
                      {corpData?.full_name || "N/A"}
                      {corp.userStatus === 1 && (
                        <span className="badge bg-success">Selected</span>
                      )}
                    </div>
                    <small style={{ color: "var(--muted)" }}>
                      {corpData?.shop_name || corpData?.email}
                    </small>
                  </div>
                </div>
                {isTaskCorporate && itemActions(corp, corpData)}
              </div>
            );
          })}
          {!isTaskCorporate &&
            !suggestions.some((cs) => cs.userStatus === 1) && (
              <div className="d-flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleAccept(2, selectedCorporateIds)}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleAccept(1, selectedCorporateIds)}
                >
                  Accept
                </button>
              </div>
            )}
        </div>
      </div>
    );
  };

  const itemActions = (item, corp) => {
    if (item.status === "in-progress") {
      return (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              localStorage.setItem("reciverID", corp._id);
              navigate(`/messages?userID=${corp._id}`);
            }}
          >
            <img src={ChatIcon} alt="Chat" width={18} />
          </button>
          {item.userStatus === 1 && item.corporateStatus === 3 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleAcceptCrop(task._id, 3, corp)}
            >
              Job done
            </button>
          )}
        </div>
      );
    }
    if (item.status === "completed") {
      return (
        <button
          type="button"
          className="btn btn-gold btn-sm"
          onClick={() => {
            handleFeedbackOpen();
            setCorporateProfile(corp);
          }}
          disabled={hasSubmittedFeedback}
        >
          Feedback
        </button>
      );
    }
    return null;
  };

  if (!task && !bookingState) return null;

  const statusMeta = isTask
    ? getTaskBookingStatusMeta(task?.status)
    : getServiceStatusMeta(bookingState?.status);

  const galleryImages = isTask
    ? task?.images
    : bookingState?.serviceSubCategory?.images;

  const getImageUrl = isTask ? taskImageUrl : serviceImageUrl;

  const title = isTask
    ? formatDisplayTitle(task?.need_done)
    : formatDisplayTitle(bookingState?.serviceSubCategory?.serviceSubCategoryName);

  const subtitle = isTask
    ? `${formatDisplayTitle(task?.category_id?.service_category_name, "Task")} · Task booking`
    : `${formatDisplayTitle(bookingState?.serviceCategory?.service_category_name, "Service")} · Service booking`;

  const location = isTask ? task?.address : bookingState?.address;

  const scheduled = isTask
    ? `${task?.task_time || "N/A"}, ${formatTaskWhenDoneDisplay(task?.when_done, "DD MMMM YYYY")}`
    : `${bookingState?.slotTime?.[0] || "N/A"}, ${moment(bookingState?.date).format("DD MMMM YYYY")}`;

  const bookingId = isTask
    ? task?.referenceId
    : bookingState?.referenceId || (bookingState?._id ? `#${String(bookingState._id).slice(-8).toUpperCase()}` : null);

  const price =
    bookingState?.payment?.amount ??
    bookingState?.serviceSubCategory?.price ??
    task?.budget ??
    selectedQuotation?.offer_price;

  const paid = isTask
    ? task?.payment?.status === "paid"
    : bookingState?.payment?.status === "paid";

  const provider = isTask
    ? selectedQuotation?.service_provider
    : bookingState?.serviceProvider;

  const onMessage =
    provider?._id &&
    ((isTask && canMessageOnActiveTask(task?.status)) ||
      (bookingState && canMessageOnActiveBooking(bookingState?.status)))
      ? () => {
          navigate(`/messages?userID=${provider._id}`);
          localStorage.setItem("reciverID", provider._id);
        }
      : null;

  const bookingStatusDescription = isTask
    ? getSeekerTaskFlowDescription(posterTaskStepperStatus)
    : isReschedulePendingForUser
    ? "Service provider has rescheduled your booking. Please accept the new schedule."
    : getBookingFlowDescription(bookingState?.status) ||
      (bookingState?.status === 3
        ? "Service provider has canceled your booking."
        : bookingState?.payment?.status === "paid"
        ? "Service provider has completed this service."
        : `Service provider has ${
            bookingState?.status === 1 ? "not accepted" : "completed"
          } your booking.`);

  const showDoneBanner = isTask
    ? task?.status === 3 && task?.payment?.status === "paid"
    : bookingState?.status === 4 && bookingState?.payment?.status === "paid";

  return (
    <BookingDetailPageShell
      isTask={isTask}
      headAction={
        isTask ? (
          <Link to="/post-task" className="btn btn-ghost">
            + Post another task
          </Link>
        ) : rebookServiceUrl ? (
          <Link to={rebookServiceUrl} className="btn btn-ghost">
            Book another
          </Link>
        ) : null
      }
    >
      <div className="tgrid">
        <div className="main">
          <BookingDetailGallery
            images={galleryImages}
            getImageUrl={getImageUrl}
            statusMeta={statusMeta}
          />

          <BookingInfoCard
            title={title}
            subtitle={subtitle}
            location={location}
            scheduled={scheduled}
            bookingId={bookingId}
          />

          {bookingState?.message && (
            <div className="card">
              <h2>Message</h2>
              <p style={{ color: "var(--muted)", marginBottom: 0 }}>
                {bookingState.message}
              </p>
            </div>
          )}

          {provider && (
            <ProviderBlockCard
              provider={provider}
              onMessage={onMessage}
              showCall
            />
          )}

          <BookingStatusCard
            description={bookingStatusDescription}
            showDoneBanner={showDoneBanner}
            scheduledLine={scheduled}
          >
            {!isTask && (
              <>
                {(() => {
                  const flow = getBookingFlowStepperState(bookingState?.status);
                  const headline = isReschedulePendingForUser
                    ? "Booking Rescheduled"
                    : flow.variant !== "default"
                    ? flow.terminalLabel || "Status"
                    : JOB_FLOW_STEP_LABELS[flow.activeStep] || "Status";
                  return !isReschedulePendingForUser ? (
                    <JobFlowStepper
                      mode="booking"
                      status={bookingState?.status}
                      className={
                        Number(bookingState?.status) === bookingStatus.CANCELLED
                          ? "job-flow-stepper--hide-banner"
                          : ""
                      }
                    />
                  ) : (
                    <p style={{ fontWeight: 700, color: "var(--primary)" }}>{headline}</p>
                  );
                })()}
                {bookingState?.status === 3 && bookingState?.reasonForCancel && (
                  <div className="mt-3">
                    <b>Reason for cancellation</b>
                    <p style={{ color: "var(--muted)" }}>{bookingState.reasonForCancel}</p>
                  </div>
                )}
                {bookingState?.rescheduledBy && (
                  <div className="mt-3">
                    <b>Rescheduled schedule</b>
                    <p style={{ color: "var(--muted)" }}>
                      {bookingState.slotTime?.[0]}, {moment(bookingState.date).format("DD MMM")}
                    </p>
                    {bookingState.message && (
                      <p style={{ color: "var(--muted)" }}>{bookingState.message}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </BookingStatusCard>

          {isTask &&
            renderDisputesWrapper(
              taskDisputes,
              visibleTaskDisputes,
              showAllTaskDisputes,
              setShowAllTaskDisputes,
              getTaskDisputeRaisedByName,
              getTaskDisputeRaisedByClass
            )}

          {!isTask &&
            renderDisputesWrapper(
              bookingDisputes,
              visibleBookingDisputes,
              showAllBookingDisputes,
              setShowAllBookingDisputes,
              getBookingDisputeRaisedByName,
              getBookingDisputeRaisedByClass
            )}

          {isTask &&
            selectedQuotation?.corporateSuggestion?.length > 0 &&
            renderCorporateSuggestions(selectedQuotation.corporateSuggestion, true)}

          {!isTask && renderCorporateSuggestions(corporateSuggestions, false)}

          {shouldShowOnWayMap && mapLat != null && mapLng != null && (
            <div className="card">
              <h2>Live location</h2>
              <iframe
                title="On The Way Map"
                src={routeEmbedUrl}
                width="100%"
                height="260"
                style={{ border: 0, borderRadius: 8 }}
                loading="lazy"
              />
              <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openMapAt(mapLat, mapLng)}>
                  Open in Maps
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => shareMapAt(mapLat, mapLng)}>
                  Share location
                </button>
              </div>
            </div>
          )}

          {renderExistingFeedback()}
        </div>

        <aside className="side">
          <PaymentSummaryCard price={price} paid={paid}>
            {renderSidebarActions()}
          </PaymentSummaryCard>
          <NeedHelpCard
            onDispute={
              canRaiseBookingDispute || canRaiseTaskDispute
                ? handleOpenDisputeModal
                : undefined
            }
          />
        </aside>
      </div>
    </BookingDetailPageShell>
  );
}

function renderDisputesWrapper(
  disputes,
  visibleDisputes,
  showAll,
  setShowAll,
  getRaisedByName,
  getRaisedByClass
) {
  if (!disputes.length) return null;
  return (
    <div className="card task-dispute-details-card">
      <div className="task-dispute-details-header">
        <h2>Dispute details</h2>
        {disputes.length > 3 && (
          <button
            type="button"
            className="task-dispute-details-toggle"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "View less" : `View all (${disputes.length})`}
          </button>
        )}
      </div>
      <ul className="task-dispute-details-list">
        {visibleDisputes.map((dispute) => (
          <li key={dispute?._id || dispute?.id} className="task-dispute-details-item">
            <div className="task-dispute-details-item__header">
              <span className="task-dispute-details-item__reason">
                {dispute?.reason || "Dispute"}
              </span>
              <span className="task-dispute-details-item__status">
                {dispute?.status || "open"}
              </span>
            </div>
            {dispute?.description && (
              <div className="task-dispute-details-item__message">
                <span
                  className={`task-dispute-details-item__raisedby-badge ${getRaisedByClass(
                    dispute
                  )}`}
                >
                  Raised by: {getRaisedByName(dispute)}
                </span>
                <p className="task-dispute-details-item__description">
                  {dispute.description}
                </p>
              </div>
            )}
            {dispute?.adminRemark && (
              <p className="task-dispute-details-item__remark">{dispute.adminRemark}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
