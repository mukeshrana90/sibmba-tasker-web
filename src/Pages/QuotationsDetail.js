import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../Components/Layout/Layout";
import Loader from "../CommanComponents/Loader";
import StarRating from "../CommanComponents/StarRating";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import {
  getQuotationPosterDecisionState,
  mergeQuotationWithParentTaskForStatus,
} from "../utils/quotationPosterDecision";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";
import { Roles } from "../utils/Roles";
import {
  serviceProviderPath,
  taskDetailPath,
} from "../utils/normalizeMongoId";
import {
  handleCategoryImageError,
  handleUserImageError,
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";

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

export default function QuotationsDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const quotationDetailState = useSelector(
    (state) => state.UserSlice.quotationDetail
  );
  const quotationDetailById = quotationDetailState?.quotation;

  const role = localStorage.getItem("role");
  const isCustomerPoster = String(role) === String(Roles.CUSTOMER);

  const backLink = useMemo(() => {
    if (String(role) === String(Roles.SERVICE_PROVIDER)) {
      return "/taskslist?tab=second";
    }
    if (String(role) === String(Roles.CORPORATE)) {
      return "/corporate/leads";
    }
    return "/my-task";
  }, [role]);

  const backLabel = useMemo(() => {
    if (String(role) === String(Roles.SERVICE_PROVIDER)) return "Tasks";
    if (String(role) === String(Roles.CORPORATE)) return "Leads";
    return "My Tasks";
  }, [role]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    dispatch(CustomerActions.getQuotationDataById(id)).finally(() =>
      setLoading(false)
    );
  }, [dispatch, id]);

  const task =
    quotationDetailById?.task_id &&
    typeof quotationDetailById.task_id === "object"
      ? quotationDetailById.task_id
      : null;

  const mergedQuotationForUi = quotationDetailById
    ? mergeQuotationWithParentTaskForStatus(quotationDetailById, task)
    : null;

  const posterState = mergedQuotationForUi
    ? getQuotationPosterDecisionState(mergedQuotationForUi)
    : { showActions: true, badge: null };

  const provider = quotationDetailById?.service_provider;
  const providerName = provider?.full_name?.trim() || "Provider";
  const providerAddress =
    provider?.address && provider.address !== "undefined"
      ? provider.address
      : "-";
  const companyName =
    provider?.company_name && provider.company_name !== "undefined"
      ? provider.company_name
      : null;
  const providerInitials = providerName.slice(0, 2).toUpperCase();
  const avatarColor = "#0F5C4C";

  const corporateSuggestions = useMemo(() => {
    const fromQuotation = quotationDetailById?.corporateSuggestion;
    const fromProvider = provider?.corporateSuggestions;
    if (Array.isArray(fromQuotation) && fromQuotation.length > 0) {
      return fromQuotation;
    }
    if (Array.isArray(fromProvider) && fromProvider.length > 0) {
      return fromProvider;
    }
    return [];
  }, [quotationDetailById, provider]);

  const handleAccept = (data, type) => {
    if (submitting) return;
    const obj = {
      quatation_id: data?._id,
      task_id: data?.task_id?._id ?? data?.task_id,
      service_provider_id: data?.service_provider?._id,
      status: type === "accept" ? 1 : 2,
    };
    const name = data?.service_provider?.full_name?.trim() || "Provider";

    setSubmitting(true);
    dispatch(CustomerActions.acceptRejectTaskStatus(obj))
      .then((res) => {
        if (res?.payload?.success) {
          toast.success(
            type === "accept"
              ? `You accepted ${name}'s quotation.`
              : `You rejected ${name}'s quotation.`
          );
          dispatch(CustomerActions.getQuotationDataById(id));
          dispatch(CustomerActions.getMyQuotationsList());
          dispatch(CustomerActions.getPostList());
        } else {
          toast.error(res?.payload?.message || "Could not update quotation.");
        }
      })
      .finally(() => setSubmitting(false));
  };

  const statusBadge =
    posterState.badge === "accepted" ? (
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
    ) : posterState.badge === "rejected" || posterState.badge === "cancelled" ? (
      <span className="rejected-badge">
        {posterState.badge === "cancelled" ? "Cancelled" : "Rejected"}
      </span>
    ) : null;

  const taskImage =
    task?.images?.length > 0 ? taskImageUrl(task.images[0]) : null;
  const scheduleText = task ? formatTaskWhenDoneDisplay(task.when_done) : null;

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-taskstatus p-quotation-detail">
        <main className="page">
          <div className="wrap">
            <div className="crumbs">
              <Link to={backLink}>{backLabel}</Link>
              <span>/</span>
              <span style={{ color: "var(--ink)", opacity: 1 }}>
                Quotation Details
              </span>
            </div>
            <h1 className="page-title">Quotation Details</h1>

            {loading &&
            (!quotationDetailById ||
              Object.keys(quotationDetailById).length === 0) ? (
              <div className="qdetail-loading">
                <Loader />
              </div>
            ) : quotationDetailById ? (
              <>
                <div className="card">
                  <div className="card-h">
                    <h3>Provider offer</h3>
                    {statusBadge}
                  </div>
                  <div className="qcard qcard--detail">
                    <div
                      className="qav"
                      style={{
                        background: `linear-gradient(145deg,${avatarColor},${avatarColor}99)`,
                      }}
                    >
                      <img
                        src={userImageUrl(provider)}
                        alt={providerName}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.textContent =
                              providerInitials;
                          }
                        }}
                      />
                    </div>
                    <div className="qinfo">
                      <b>{providerName}</b>
                      {companyName ? (
                        <div className="qdetail-company">{companyName}</div>
                      ) : null}
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
                        <StarRating
                          averageRating={quotationDetailById?.averageRating}
                        />
                      </div>
                    </div>
                    <div className="qright">
                      <div className="qprice">
                        <b>${quotationDetailById?.offer_price || "0"}</b>
                        <small>Offer price</small>
                      </div>
                      {provider?._id && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            navigate(serviceProviderPath(provider._id))
                          }
                        >
                          View profile
                        </button>
                      )}
                    </div>
                  </div>
                  {quotationDetailById?.description ? (
                    <p className="qdetail-message">
                      &quot;{quotationDetailById.description}&quot;
                    </p>
                  ) : (
                    <p className="qdetail-message qdetail-message--muted">
                      No message provided with this offer.
                    </p>
                  )}
                </div>

                {task && (
                  <div className="card">
                    <div className="card-h">
                      <h3>Related task</h3>
                      {task?._id && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (isCustomerPoster) {
                              navigate(taskDetailPath(task._id));
                            } else if (
                              String(role) === String(Roles.SERVICE_PROVIDER)
                            ) {
                              navigate(`/servicetasksdetails/${task._id}`);
                            }
                          }}
                        >
                          View task
                        </button>
                      )}
                    </div>
                    <div className="qdetail-task">
                      <div className="qdetail-task-thumb">
                        {taskImage ? (
                          <img
                            src={taskImage}
                            alt={task.need_done || "Task"}
                            onError={handleCategoryImageError}
                          />
                        ) : (
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.5-3.5L9 20" />
                          </svg>
                        )}
                      </div>
                      <div className="qdetail-task-body">
                        <h4>{task.need_done || "Task"}</h4>
                        {task.task_time && scheduleText && (
                          <div className="hero-sched">
                            <ClockIcon />
                            {task.task_time}, {scheduleText}
                          </div>
                        )}
                        <p>{task.details || "No description provided."}</p>
                        <div className="qdetail-task-budget">
                          <b>${task.budget ?? "N/A"}</b>
                          <span>Budget</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {corporateSuggestions.length > 0 && (
                  <div className="card">
                    <div className="card-h">
                      <h3>Suggested corporate</h3>
                    </div>
                    <div className="corp-suggest-list">
                      {corporateSuggestions.map((item, index) => {
                        const corp = item?.corporateIds;
                        if (!corp) return null;
                        return (
                          <div
                            key={item._id || index}
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
                                  <span className="corp-suggest-badge">
                                    Selected
                                  </span>
                                )}
                              </div>
                              {corp.shop_name ? (
                                <div className="corp-suggest-meta">
                                  {corp.shop_name}
                                </div>
                              ) : null}
                              {corp.email ? (
                                <div className="corp-suggest-meta">
                                  {corp.email}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isCustomerPoster && posterState.showActions && (
                  <div className="qdetail-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={submitting}
                      onClick={() =>
                        handleAccept(quotationDetailById, "accept")
                      }
                    >
                      Accept quotation
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={submitting}
                      onClick={() =>
                        handleAccept(quotationDetailById, "reject")
                      }
                    >
                      Reject
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty">
                <h3>Quotation not found</h3>
                <p>This quotation may have been removed or is unavailable.</p>
                <Link to={backLink} className="btn btn-primary">
                  Back to {backLabel.toLowerCase()}
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
