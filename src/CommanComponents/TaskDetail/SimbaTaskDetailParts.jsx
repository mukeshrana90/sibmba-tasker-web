import { Link } from "react-router-dom";
import StarRating from "../StarRating";
import {
  getTaskFlowDescription,
  getTaskFlowStepperState,
  getSeekerTaskFlowDescription,
  JOB_FLOW_STEP_LABELS,
  taskStatus,
} from "../../utils/jobFlowStatus";
import {
  formatDisplayTitle,
  handleCategoryImageError,
  handleUserImageError,
  taskImageUrl,
  userImageUrl,
} from "../../utils/landingUtils";

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 7v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function getStatusPillMeta(
  displayStepperStatus,
  shouldShowProviderCancelled
) {
  if (shouldShowProviderCancelled) {
    return { label: "Posted", className: "posted" };
  }
  const s = Number(displayStepperStatus);
  if (s === taskStatus.COMPLETED) {
    return { label: "Completed", className: "completed" };
  }
  if (s === taskStatus.ACCEPTED) {
    return { label: "Accepted", className: "completed" };
  }
  if (s === taskStatus.ON_THE_WAY) {
    return { label: "On the Way", className: "posted" };
  }
  if (s === taskStatus.IN_PROGRESS) {
    return { label: "In Progress", className: "posted" };
  }
  if (s === taskStatus.REJECTED) {
    return { label: "Rejected", className: "posted" };
  }
  return { label: "Posted", className: "posted" };
}

export function SimbaTaskTimeline({ status }) {
  const model = getTaskFlowStepperState(status);
  const { activeStep, variant } = model;
  const isTerminal = variant === "rejected" || variant === "cancelled";
  const lastIndex = JOB_FLOW_STEP_LABELS.length - 1;
  const allDone = !isTerminal && activeStep === lastIndex;
  const pct =
    isTerminal || activeStep < 0
      ? 0
      : ((allDone ? lastIndex : activeStep) / lastIndex) * 100;

  return (
    <div className="timeline">
      <div className="tl-line">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
      {JOB_FLOW_STEP_LABELS.map((label, index) => {
        let stepClass = "";
        if (!isTerminal && activeStep >= 0) {
          if (allDone || index < activeStep) stepClass = "done";
          else if (index === activeStep) stepClass = "current";
        }
        return (
          <div key={label} className={`tl-step ${stepClass}`.trim()}>
            <div className="tl-dot">
              {stepClass === "done" ? (
                <CheckIcon />
              ) : stepClass === "current" ? (
                <span className="tl-dot-current" />
              ) : (
                <span className="tl-dot-future" />
              )}
            </div>
            <b>{label}</b>
          </div>
        );
      })}
    </div>
  );
}

export function TaskDetailHero({
  task,
  scheduleText,
  statePill,
  showTaskDetailViewHistory,
  taskShowSeekerJobDoneBtn,
  taskShowSeekerPayBtn,
  jobDoneSubmitting,
  deletePostSubmitting,
  quotationsLength,
  providerCancelledWithoutQuotations,
  canRaiseTaskDispute,
  onNavigateBookings,
  onNavigateEditTask,
  onDeletePost,
  onJobDone,
  onPayNow,
  onRaiseDispute,
  seekerShouldHideTaskCancellationActions,
  showMessageProvider,
  onMessageProvider,
  acceptedProviderName,
}) {
  const heroImage =
    task?.images?.length > 0 ? taskImageUrl(task.images[0]) : null;

  return (
    <div className="hero-card">
      <div className="hero-img">
        {heroImage ? (
          <img
            src={heroImage}
            alt={task?.need_done || "Task"}
            onError={handleCategoryImageError}
          />
        ) : (
          <svg
            width="48"
            height="48"
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
        )}
        <div className="imgbadge">
          <span className={`state-pill ${statePill.className}`}>
            {statePill.label}
          </span>
        </div>
      </div>
      <div className="hero-body">
        <h2>{formatDisplayTitle(task?.need_done, "Task")}</h2>
        <div className="hero-sched">
          <ClockIcon />
          {task?.task_time}, {scheduleText}
        </div>
        <div className="hero-desc">{task?.details || "No description provided."}</div>
        <div className="hero-price">
          <b>${task?.budget ?? "N/A"}</b>
          <span>Budget</span>
        </div>
        {showMessageProvider && (
          <div className="creator-meta">
            <div className="creator-meta-info">
              <span className="creator-meta-label">Service Provider</span>
              <b>{acceptedProviderName || "Service Provider"}</b>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onMessageProvider}
            >
              Message
            </button>
          </div>
        )}
        <div className="hero-actions">
          {taskShowSeekerJobDoneBtn && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onJobDone}
              disabled={jobDoneSubmitting}
            >
              Job done
            </button>
          )}
          {taskShowSeekerPayBtn && (
            <button type="button" className="btn btn-primary" onClick={onPayNow}>
              Pay Now
            </button>
          )}
          {showTaskDetailViewHistory && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onNavigateBookings}
            >
              View history
            </button>
          )}
          {!providerCancelledWithoutQuotations &&
            quotationsLength === 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onNavigateEditTask}
              >
                Edit post
              </button>
            )}
          {!providerCancelledWithoutQuotations &&
            quotationsLength > 0 &&
            !seekerShouldHideTaskCancellationActions(task?.status) && (
              <button
                type="button"
                className="btn btn-danger"
                disabled={deletePostSubmitting}
                onClick={onDeletePost}
              >
                Delete post
              </button>
            )}
        </div>
        {canRaiseTaskDispute && !providerCancelledWithoutQuotations && (
          <div className="dispute-line">
            Having an issue?{" "}
            <button type="button" onClick={onRaiseDispute}>
              Raise a dispute
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskDetailStatusCard({
  displayStepperStatus,
  posterStepperStatus,
  shouldShowProviderCancelledState,
  statePill,
}) {
  const flow = getTaskFlowStepperState(posterStepperStatus);
  const description = shouldShowProviderCancelledState
    ? "This task has been rejected."
    : getSeekerTaskFlowDescription(posterStepperStatus);
  const showDescription =
    !shouldShowProviderCancelledState &&
    flow.variant === "default" &&
    Boolean(description);

  return (
    <div className="card">
      <div className="card-h">
        <h3>Status</h3>
        <span className={`state-pill ${statePill.className}`}>
          {shouldShowProviderCancelledState ? "Rejected" : statePill.label}
        </span>
      </div>
      {showDescription && <p className="state-note">{description}</p>}
      {shouldShowProviderCancelledState && (
        <p className="state-note">{description}</p>
      )}
      <SimbaTaskTimeline status={displayStepperStatus} />
    </div>
  );
}

export function TaskDetailPageShell({ children }) {
  return (
    <div className="simba-page p-taskstatus">
      <main className="page">
        <div className="wrap">
          <div className="crumbs">
            <Link to="/my-task">My Tasks</Link>
            <span>/</span>
            <span style={{ color: "var(--ink)", opacity: 1 }}>
              Task Details
            </span>
          </div>
          <h1 className="page-title">Task Details</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

function MenuDotsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 32 35"
      fill="none"
    >
      <path
        d="M16.0001 11.084C16.8838 11.084 17.6001 10.3005 17.6001 9.33398C17.6001 8.36749 16.8838 7.58398 16.0001 7.58398C15.1165 7.58398 14.4001 8.36749 14.4001 9.33398C14.4001 10.3005 15.1165 11.084 16.0001 11.084Z"
        fill="currentColor"
      />
      <path
        d="M16.0001 19.25C16.8838 19.25 17.6001 18.4665 17.6001 17.5C17.6001 16.5335 16.8838 15.75 16.0001 15.75C15.1165 15.75 14.4001 16.5335 14.4001 17.5C14.4001 18.4665 15.1165 19.25 16.0001 19.25Z"
        fill="currentColor"
      />
      <path
        d="M16.0001 27.418C16.8838 27.418 17.6001 26.6345 17.6001 25.668C17.6001 24.7015 16.8838 23.918 16.0001 23.918C15.1165 23.918 14.4001 24.7015 14.4001 25.668C14.4001 26.6345 15.1165 27.418 16.0001 27.418Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProviderTaskDetailPageShell({ children, fromTab }) {
  const tasksLink = fromTab ? `/taskslist?tab=${fromTab}` : "/taskslist";
  return (
    <div className="simba-page p-taskstatus p-sp-taskdetail">
      <main className="page">
        <div className="wrap">
          <div className="crumbs">
            <Link to={tasksLink}>Tasks</Link>
            <span>/</span>
            <span style={{ color: "var(--ink)", opacity: 1 }}>
              Task Details
            </span>
          </div>
          <h1 className="page-title">Task Details</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

export function ProviderTaskDetailHero({
  task,
  scheduleText,
  statePill,
  isTaskMode,
  taskCreatorName,
  taskCreatorAverageRating,
  taskCreatorReviewCount,
  creatorRatingsLoading,
  taskCreatorUserId,
  onViewCreatorRatings,
  showMessageCreator,
  onMessageCreator,
  showCancel,
  showOnTheWay,
  showInProgress,
  showJobDone,
  taskStatusSubmitting,
  quotationsLength,
  canRaiseTaskDispute,
  onAddQuotation,
  onCancel,
  onOnTheWay,
  onInProgress,
  onJobDone,
  onViewHistory,
  onRaiseDispute,
}) {
  const heroImage =
    task?.images?.length > 0 ? taskImageUrl(task.images[0]) : null;

  return (
    <div className="hero-card">
      <div className="hero-img">
        {heroImage ? (
          <img
            src={heroImage}
            alt={task?.need_done || "Task"}
            onError={handleCategoryImageError}
          />
        ) : (
          <svg
            width="48"
            height="48"
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
        )}
        {statePill && (
          <div className="imgbadge">
            <span className={`state-pill ${statePill.className}`}>
              {statePill.label}
            </span>
          </div>
        )}
      </div>
      <div className="hero-body">
        <h2>{formatDisplayTitle(task?.need_done, "Task")}</h2>
        <div className="hero-sched">
          <ClockIcon />
          {task?.task_time}, {scheduleText}
        </div>
        {task?.category?.name || task?.category_name ? (
          <div className="hero-cat">
            {task?.category?.name || task?.category_name}
          </div>
        ) : null}
        <div className="hero-desc">
          {task?.details || "No description provided."}
        </div>
        <div className="hero-price">
          <b>${task?.budget ?? "N/A"}</b>
          <span>Budget</span>
        </div>
        <div className="creator-meta">
          <div className="creator-meta-info">
            <span className="creator-meta-label">Task Creator</span>
            <b>{taskCreatorName}</b>
            <StarRating
              averageRating={taskCreatorAverageRating}
              reviewCount={taskCreatorReviewCount}
            />
          </div>
          <div className="creator-meta-actions">
            {showMessageCreator && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onMessageCreator}
              >
                Message
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onViewCreatorRatings}
              disabled={creatorRatingsLoading || !taskCreatorUserId}
            >
              {creatorRatingsLoading ? "Loading..." : "View ratings"}
            </button>
          </div>
        </div>
        <div className="hero-actions">
          {!isTaskMode ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddQuotation}
              disabled={quotationsLength > 0}
            >
              Add Quotation
            </button>
          ) : (
            <>
              {showCancel && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={taskStatusSubmitting}
                  onClick={onCancel}
                >
                  Cancel
                </button>
              )}
              {showOnTheWay && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={taskStatusSubmitting}
                  onClick={onOnTheWay}
                >
                  On the Way
                </button>
              )}
              {showInProgress && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={taskStatusSubmitting}
                  onClick={onInProgress}
                >
                  In Progress
                </button>
              )}
              {showJobDone && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={taskStatusSubmitting}
                    onClick={onJobDone}
                  >
                    Job Done
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onViewHistory}
                  >
                    View history
                  </button>
                </>
              )}
            </>
          )}
        </div>
        {canRaiseTaskDispute && (
          <div className="dispute-line">
            Having an issue?{" "}
            <button type="button" onClick={onRaiseDispute}>
              Raise a dispute
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProviderTaskDetailStatusCard({ status }) {
  const statePill = getStatusPillMeta(status, false);
  const flow = getTaskFlowStepperState(status);
  const description =
    flow.variant === "default" ? getTaskFlowDescription(status) : flow.terminalLabel;
  const showDescription = Boolean(description);

  return (
    <div className="card">
      <div className="card-h">
        <h3>Status</h3>
        <span className={`state-pill ${statePill.className}`}>
          {statePill.label}
        </span>
      </div>
      {showDescription && <p className="state-note">{description}</p>}
      <SimbaTaskTimeline status={status} />
    </div>
  );
}

export function QuotationsEmptyState() {
  return (
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
  );
}

export function ProviderQuotationCard({
  quotation,
  index,
  isOwn,
  showEditMenu,
  menuOpen,
  menuRef,
  onToggleMenu,
  onEdit,
}) {
  const providerName = quotation?.service_provider?.full_name || "Provider";
  const providerAddress =
    quotation?.service_provider?.address !== "undefined"
      ? quotation?.service_provider?.address
      : "-";
  const avatarColors = ["#0F5C4C", "#C2682B", "#2B4FB8", "#7A4B9E"];
  const avatarColor = avatarColors[index % avatarColors.length];
  const providerInitials = providerName.slice(0, 2).toUpperCase();

  return (
    <div className="qcard-stack">
      <div className={`qcard${isOwn ? " accepted" : ""}`}>
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
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.textContent = providerInitials;
              }
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
            <StarRating averageRating={quotation?.averageRating} />
            {quotation?.description ? (
              <span className="note">&quot;{quotation.description}&quot;</span>
            ) : null}
          </div>
        </div>
        <div className="qright" onClick={(e) => e.stopPropagation()}>
          <div className="qprice">
            <b>${quotation?.offer_price}</b>
            <small>Offer price</small>
          </div>
          {isOwn && (
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
              Your offer
            </span>
          )}
          {showEditMenu && isOwn && (
            <div className="q-menu" ref={menuRef}>
              <button
                type="button"
                className="q-menu-btn"
                aria-label="Quotation options"
                onClick={onToggleMenu}
              >
                <MenuDotsIcon />
              </button>
              {menuOpen && (
                <div className="q-menu-drop">
                  <button type="button" onClick={onEdit}>
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {quotation?.corporateSuggestion?.length > 0 && (
        <div className="qcard-corporate">
          <h5>Suggested Corporate</h5>
          <div className="corp-suggest-list">
            {quotation.corporateSuggestion.map((item, corpIndex) => {
              const corp = item?.corporateIds;
              if (!corp) return null;
              return (
                <div
                  key={item._id || corpIndex}
                  className="corp-suggest-item"
                >
                  {corp.profile_image ? (
                    <img
                      src={userImageUrl(corp)}
                      alt={corp.full_name}
                      onError={handleUserImageError}
                    />
                  ) : (
                    <div className="corp-suggest-avatar">
                      {corp.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="corp-suggest-body">
                    <div className="corp-suggest-name">
                      {corp.full_name}
                      {Number(item?.userStatus) === 1 && (
                        <span className="corp-suggest-badge">Selected</span>
                      )}
                    </div>
                    {corp.shop_name ? (
                      <div className="corp-suggest-meta">{corp.shop_name}</div>
                    ) : null}
                    {corp.email ? (
                      <div className="corp-suggest-meta">{corp.email}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
