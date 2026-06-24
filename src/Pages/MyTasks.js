import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Layout from "../Components/Layout/Layout";
import StarRating from "../CommanComponents/StarRating";
import SimbaPageBanner from "../CommanComponents/SimbaPageBanner";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import {
  formatDisplayTitle,
  handleCategoryImageError,
  handleUserImageError,
  providerDisplayName,
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import {
  getAcceptedQuotationTaskIds,
  getQuotationPosterDecisionState,
  mergeQuotationWithOptimisticStatus,
  mergeQuotationWithParentTaskForStatus,
  resolveParentTaskForQuotationMerge,
} from "../utils/quotationPosterDecision";
import { taskStatus } from "../utils/jobFlowStatus";

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PlaceholderThumbIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty">
      <svg
        width="54"
        height="54"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}

function getTaskBadge(post, providerCancelledFallback) {
  if (
    providerCancelledFallback ||
    Number(post?.status) === taskStatus.REJECTED
  ) {
    return { label: "Rejected", className: "" };
  }
  if (Number(post?.status) === taskStatus.COMPLETED) {
    return { label: "Completed", className: "completed" };
  }
  if (
    [
      taskStatus.ACCEPTED,
      taskStatus.ON_THE_WAY,
      taskStatus.IN_PROGRESS,
    ].includes(Number(post?.status))
  ) {
    return { label: "In progress", className: "posted" };
  }
  return { label: "Posted", className: "posted" };
}

function TaskCard({ post, taskIdsWithQuotations }) {
  const selectedQid =
    post?.quatation_id ?? post?.quotation_id ?? post?.quote_id;
  const selectedProviderId =
    post?.serviceProviderId ??
    post?.service_provider_id ??
    post?.service_provider?._id;
  const noQuotationForTask =
    post?._id != null && !taskIdsWithQuotations.has(String(post._id));
  const providerCancelledFallback = Boolean(
    selectedQid && selectedProviderId && noQuotationForTask
  );
  const badge = getTaskBadge(post, providerCancelledFallback);
  const imageSrc = post?.images?.length ? post.images[0] : null;

  return (
    <Link to={`/task-detail/${post._id}`} className="tcard">
      <div className={`tthumb${imageSrc ? " tthumb--photo" : ""}`}>
        {imageSrc ? (
          <img
            src={taskImageUrl(imageSrc)}
            alt={formatDisplayTitle(post.need_done, "Task")}
            onError={handleCategoryImageError}
          />
        ) : (
          <PlaceholderThumbIcon />
        )}
      </div>
      <div className="tinfo">
        <h3>{formatDisplayTitle(post.need_done)}</h3>
        <div className="tsched">
          <ClockIcon />
          {post.task_time}, {formatTaskWhenDoneDisplay(post.when_done)}
        </div>
        <div className="tdesc">{formatDisplayTitle(post.details)}</div>
      </div>
      <div className="tside">
        <span className={`tbadge ${badge.className}`.trim()}>{badge.label}</span>
        <span className="tprice">${post.budget}</span>
        <span className="tarrow">
          View <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

function QuotationCard({
  quotation,
  allMyPosts,
  allMyQuotations,
  optimisticQuotationStatusById,
  acceptedQuotationTaskIds,
  quotationSubmittingById,
  onAccept,
  onNavigate,
}) {
  const parentTask = resolveParentTaskForQuotationMerge(
    quotation,
    allMyPosts
  );
  const quotationForUi = mergeQuotationWithParentTaskForStatus(
    mergeQuotationWithOptimisticStatus(
      quotation,
      optimisticQuotationStatusById
    ),
    parentTask
  );
  const posterState = getQuotationPosterDecisionState(quotationForUi);
  const submittingThis = !!quotationSubmittingById[quotation._id];
  const taskId = quotation?.task_id?._id ?? quotation?.task_id;
  const taskHasAcceptedQuotation =
    taskId != null && acceptedQuotationTaskIds.has(String(taskId));
  const parentSelectedQuotationId =
    parentTask?.quatation_id ??
    parentTask?.quotation_id ??
    parentTask?.quote_id;
  const parentAcceptedOtherQuotation =
    Number(parentTask?.status) === taskStatus.ACCEPTED &&
    parentSelectedQuotationId != null &&
    String(parentSelectedQuotationId) !== String(quotation?._id);
  const shouldTreatAsProviderCancelled =
    Number(parentTask?.status) === taskStatus.REJECTED &&
    parentSelectedQuotationId != null &&
    String(parentSelectedQuotationId) === String(quotation?._id) &&
    allMyQuotations?.some((q) => {
      const qTaskId = q?.task_id?._id ?? q?.task_id;
      if (
        qTaskId == null ||
        taskId == null ||
        String(qTaskId) !== String(taskId)
      ) {
        return false;
      }
      if (String(q?._id) === String(parentSelectedQuotationId)) {
        return false;
      }
      const qParentTask = resolveParentTaskForQuotationMerge(q, allMyPosts);
      const qForUi = mergeQuotationWithParentTaskForStatus(
        mergeQuotationWithOptimisticStatus(q, optimisticQuotationStatusById),
        qParentTask
      );
      return getQuotationPosterDecisionState(qForUi).showActions;
    });
  const isTaskLevelRejectedSelectedQuotation =
    Number(parentTask?.status) === taskStatus.REJECTED &&
    parentSelectedQuotationId != null &&
    String(parentSelectedQuotationId) === String(quotation?._id);
  const showActionButtons = isTaskLevelRejectedSelectedQuotation
    ? false
    : posterState.showActions;
  const disableActionButtons =
    !isTaskLevelRejectedSelectedQuotation &&
    posterState.showActions &&
    (taskHasAcceptedQuotation || parentAcceptedOtherQuotation);
  const baseBadge =
    isTaskLevelRejectedSelectedQuotation && !posterState.badge
      ? "rejected"
      : posterState.badge;
  const effectiveBadge =
    baseBadge === "rejected" && shouldTreatAsProviderCancelled
      ? "cancelled"
      : baseBadge;

  const badgeLabel =
    effectiveBadge === "accepted"
      ? "Accepted"
      : effectiveBadge === "cancelled"
        ? "Cancelled"
        : effectiveBadge === "rejected"
          ? "Rejected"
          : null;

  const badgeClass =
    effectiveBadge === "accepted"
      ? "completed"
      : effectiveBadge === "cancelled" || effectiveBadge === "rejected"
        ? ""
        : "posted";

  const providerAddress =
    quotation?.service_provider?.address !== "undefined"
      ? quotation?.service_provider?.address
      : "-";

  const taskFromQuote =
    quotation?.task_id && typeof quotation.task_id === "object"
      ? quotation.task_id
      : null;
  const linkedTask = parentTask || taskFromQuote;
  const taskTitle = linkedTask?.need_done;
  const taskScheduleParts = [
    linkedTask?.task_time,
    linkedTask?.when_done
      ? formatTaskWhenDoneDisplay(linkedTask.when_done)
      : null,
  ].filter(Boolean);

  return (
    <div
      className={`qcard-wrap${
        disableActionButtons ? " qcard-wrap--locked" : ""
      }`}
    >
      {(taskTitle || taskId) && (
        <div className="qcard-task-ref">
          <div className="qcard-task-ref__body">
            <span className="qcard-task-ref__label">For task</span>
            {taskTitle ? (
              <strong>{formatDisplayTitle(taskTitle, "Untitled task")}</strong>
            ) : (
              <strong>Untitled task</strong>
            )}
            {taskScheduleParts.length > 0 && (
              <div className="qcard-task-ref__when">
                <ClockIcon />
                {taskScheduleParts.join(", ")}
              </div>
            )}
          </div>
          {taskId && (
            <Link to={`/task-detail/${taskId}`} className="qcard-task-ref__link">
              View task <ArrowIcon />
            </Link>
          )}
        </div>
      )}
      <div className="quotation-card">
        <div className="tthumb tthumb--photo">
          <img
            src={userImageUrl(quotation?.service_provider)}
            alt={providerDisplayName(quotation?.service_provider)}
            onError={handleUserImageError}
          />
        </div>
        <div className="tinfo">
          <h3>{providerDisplayName(quotation?.service_provider)}</h3>
          <div className="tsched">{providerAddress}</div>
          <div className="rating-stars qcard-rating">
            <StarRating averageRating={quotation?.averageRating} />
          </div>
          <div className="tdesc tdesc--wrap">
            {formatDisplayTitle(quotation?.description)}
          </div>
        </div>
        <div className="tside">
          {badgeLabel && (
            <span className={`tbadge ${badgeClass}`.trim()}>{badgeLabel}</span>
          )}
          <span className="tprice">${quotation?.offer_price}</span>
          {showActionButtons ? (
            <div className="qcard-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={submittingThis || disableActionButtons}
                onClick={() => onAccept(quotation, "accept")}
              >
                Accept
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={submittingThis || disableActionButtons}
                onClick={() => onAccept(quotation, "reject")}
              >
                Reject
              </button>
            </div>
          ) : (
            <span className="tarrow">
              Offer <ArrowIcon />
            </span>
          )}
        </div>
      </div>

      {quotation?.corporateSuggestion?.length > 0 && (
        <div className="qcard-corporate">
          <h5>Suggested Corporate</h5>
          <ul>
            {quotation.corporateSuggestion.map((item, index) => {
              const corp = item?.corporateIds;
              if (!corp) return null;
              return (
                <li key={item._id || index}>
                  <button
                    type="button"
                    className="qcard-corp-item"
                    onClick={() => onNavigate(`/get-corporate/${corp._id}`)}
                  >
                    <img
                      src={userImageUrl(corp)}
                      alt={providerDisplayName(corp)}
                      onError={handleUserImageError}
                    />
                    <div>
                      <strong>
                        {providerDisplayName(corp)}
                        {Number(item?.userStatus) === 1 && (
                          <span className="qcard-selected">Selected</span>
                        )}
                      </strong>
                      <span>{formatDisplayTitle(corp.shop_name)}</span>
                      <span>{corp.email}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MyTasks() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("mine");
  const [optimisticQuotationStatusById, setOptimisticQuotationStatusById] =
    useState(() => ({}));
  const optimisticQuotationRef = useRef({});
  optimisticQuotationRef.current = optimisticQuotationStatusById;
  const quotationSubmittingIdsRef = useRef(new Set());
  const [quotationSubmittingById, setQuotationSubmittingById] = useState({});

  const allMyPosts = useSelector((state) => state.UserSlice.postlist) || [];
  const allMyQuotations = useSelector((state) => state.UserSlice.myQuotations) || [];

  useEffect(() => {
    dispatch(CustomerActions.getPostList());
    dispatch(CustomerActions.getMyQuotationsList());
  }, [dispatch]);

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

  const acceptedQuotationTaskIds = useMemo(
    () =>
      getAcceptedQuotationTaskIds(
        allMyQuotations,
        optimisticQuotationStatusById
      ),
    [allMyQuotations, optimisticQuotationStatusById]
  );

  const taskIdsWithQuotations = useMemo(() => {
    const ids = new Set();
    allMyQuotations.forEach((q) => {
      const taskId = q?.task_id?._id ?? q?.task_id;
      if (taskId != null) ids.add(String(taskId));
    });
    return ids;
  }, [allMyQuotations]);

  const handleAccept = async (data, type) => {
    const qid = data?._id;
    if (!qid) return;

    const parentTask = resolveParentTaskForQuotationMerge(data, allMyPosts);
    const merged = mergeQuotationWithParentTaskForStatus(
      mergeQuotationWithOptimisticStatus(data, optimisticQuotationRef.current),
      parentTask
    );
    if (!getQuotationPosterDecisionState(merged).showActions) {
      return;
    }

    if (!beginQuotationAction(qid)) return;

    const obj = {
      quatation_id: data?._id,
      task_id: data?.task_id?._id ?? data?.task_id,
      service_provider_id: data?.service_provider?._id,
      status: type === "accept" ? 1 : 2,
    };

    const providerName = providerDisplayName(data?.service_provider);
    const statusValue = type === "accept" ? 1 : 2;

    try {
      const res = await dispatch(CustomerActions.acceptRejectTaskStatus(obj));
      if (res?.payload?.success) {
        setOptimisticQuotationStatusById((prev) => ({
          ...prev,
          [qid]: statusValue,
        }));
        toast.success(
          type === "accept"
            ? `You accepted ${providerName}'s quotation.`
            : `You rejected ${providerName}'s quotation.`
        );
        dispatch(CustomerActions.getMyQuotationsList());
        dispatch(CustomerActions.getPostList());
      } else {
        toast.error(res?.payload?.message || "Could not update quotation.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      endQuotationAction(qid);
    }
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-mytasks">
        <SimbaPageBanner title="My Tasks" crumbLabel="My Tasks" />

        <main className="page">
          <div className="wrap">
            <div className="head-row">
              <div className="tabs">
                <button
                  type="button"
                  className={`tab${activeTab === "mine" ? " active" : ""}`}
                  onClick={() => setActiveTab("mine")}
                >
                  My Tasks
                </button>
                <button
                  type="button"
                  className={`tab${activeTab === "quotes" ? " active" : ""}`}
                  onClick={() => setActiveTab("quotes")}
                >
                  Quotation requests
                </button>
              </div>
              <Link to="/post-task" className="btn btn-primary post-btn">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Post a task
              </Link>
            </div>

            <div className="tasklist">
              {activeTab === "mine" ? (
                allMyPosts?.length > 0 ? (
                  allMyPosts.map((post) => (
                    <TaskCard
                      key={post._id}
                      post={post}
                      taskIdsWithQuotations={taskIdsWithQuotations}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="Nothing here yet"
                    message="Post a task to get quotes from trusted providers."
                  />
                )
              ) : allMyQuotations?.length > 0 ? (
                allMyQuotations.map((quotation) => (
                  <QuotationCard
                    key={quotation._id}
                    quotation={quotation}
                    allMyPosts={allMyPosts}
                    allMyQuotations={allMyQuotations}
                    optimisticQuotationStatusById={optimisticQuotationStatusById}
                    acceptedQuotationTaskIds={acceptedQuotationTaskIds}
                    quotationSubmittingById={quotationSubmittingById}
                    onAccept={handleAccept}
                    onNavigate={navigate}
                  />
                ))
              ) : (
                <EmptyState
                  title="No quotations yet"
                  message="When providers send offers on your tasks, they will appear here."
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
