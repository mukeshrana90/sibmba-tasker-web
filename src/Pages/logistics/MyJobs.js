import { useEffect, useState } from "react";
import LogisticsReasonModal from "../../CommanComponents/LogisticsReasonModal";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsJobRoutePanel, {
  placeShortLabel,
} from "../../CommanComponents/LogisticsJobRoutePanel";
import LogisticsEquipmentRoutePanel from "../../CommanComponents/LogisticsEquipmentRoutePanel";
import {
  hubCategoryLabel,
  isCabJob,
  isEquipmentJob,
  jobCategoryKey,
  jobSite,
} from "../../utils/jobKind";
import { CategoryGlyph } from "../../CommanComponents/LogisticsFormIcons";
import {
  JobCategoryBadge,
  JobCategorySelect,
} from "../../CommanComponents/LogisticsJobCategory";
import QuoteChatIconButton from "../../Components/QuoteChatIconButton";
import { openLogisticsJobChat, telHref } from "../../utils/beginQuoteChat";
import { buildPublicAssetUrl, defaultImage } from "../../utils/ImagePath";
import "./logistics.css";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const STATUS_LABEL = {
  0: "Pending quotes",
  1: "Accepted",
  2: "En route to pickup",
  3: "At pickup",
  4: "In transit",
  5: "Delivered",
  6: "Cancelled",
  7: "Rejected",
};

// Cab rides: passenger wording for the same status numbers
const RIDE_STATUS_LABEL = {
  0: "Finding driver",
  1: "Driver assigned",
  2: "Driver on the way",
  3: "Driver arrived",
  4: "Trip started",
  5: "Completed",
  6: "Cancelled",
  7: "Rejected",
};

const EQUIPMENT_STATUS_LABEL = {
  0: "Pending quotes",
  1: "Accepted",
  4: "Transit / on hire",
  5: "Done",
  6: "Cancelled",
  7: "Rejected",
};

const CUSTOMER_TRACK_TRANSPORT = [
  { key: "1", status: 1, label: "Accepted" },
  { key: "2", status: 2, label: "Collect" },
  { key: "3", status: 3, label: "Loaded" },
  { key: "4", status: 4, label: "Transit" },
  { key: "5", status: 5, label: "Done" },
];

const CUSTOMER_TRACK_RIDE = [
  { key: "1", status: 1, label: "Accepted" },
  { key: "2", status: 2, label: "On the way" },
  { key: "3", status: 3, label: "Arrived" },
  { key: "4", status: 4, label: "Trip started" },
  { key: "5", status: 5, label: "Completed" },
];

const CUSTOMER_TRACK_EQUIPMENT = [
  { key: "1", status: 1, label: "Accepted" },
  { key: "4", status: 4, label: "Transit" },
  { key: "5", status: 5, label: "Done" },
];

const CUSTOMER_TRACK_EQUIPMENT_NON_PROPELLED = [
  { key: "1", status: 1, label: "Accepted" },
  { key: "4", status: 4, label: "Transit" },
  { key: "collect", status: "collect", label: "Come collect" },
  { key: "5", status: 5, label: "Done" },
];

function formatStatusAt(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function latestStatusAt(history, status) {
  if (!Array.isArray(history) || !history.length) return null;
  const n = Number(status);
  let latest = null;
  for (const entry of history) {
    if (Number(entry?.status) === n && entry?.at) latest = entry.at;
  }
  return latest;
}

/** Resolve logistics job image paths under REACT_APP_API_URL (.../public). */
export function jobImageUrl(path) {
  if (!path) return null;
  let normalized = String(path).replace(/\\/g, "/").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (normalized.startsWith("http") || normalized.startsWith("blob:")) {
    return normalized;
  }

  // Absolute disk paths → keep from /public/ onward
  const absPublic = normalized.indexOf("/public/");
  if (absPublic !== -1) {
    normalized = normalized.slice(absPublic + "/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  } else if (normalized.startsWith("/public/")) {
    normalized = normalized.slice("/public".length);
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  return buildPublicAssetUrl(normalized);
}

function formatJobWeight(loadWeight) {
  if (!loadWeight || loadWeight.value == null || loadWeight.value === "") {
    return null;
  }
  const value = Number(loadWeight.value);
  if (!Number.isFinite(value)) return null;
  const unit = loadWeight.unit || "tons";
  return `${value} ${unit}`;
}

function formatMoney(budget) {
  if (!budget || budget.amount == null || budget.amount === "") return null;
  const amount = Number(budget.amount);
  if (!Number.isFinite(amount)) return null;
  const rate =
    budget.rate_unit === "hour"
      ? " / hour"
      : budget.rate_unit === "day"
        ? " / day"
        : "";
  return `${budget.currency || "USD"} ${amount}${rate}`;
}

function formatWhen(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LogisticsMyJobs() {
  const dispatch = useDispatch();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({
    q: "",
    status: "all",
    category: "all",
    from: "",
    to: "",
  });


  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const showPagination = total > pageSize;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
      };
      if (applied.q) params.q = applied.q;
      if (applied.status !== "all") params.status = applied.status;
      if (applied.category !== "all") params.category = applied.category;
      if (applied.from) params.from = applied.from;
      if (applied.to) params.to = applied.to;

      const res = await dispatch(LogisticsActions.listMyJobs(params));
      if (cancelled) return;
      setJobs(res?.payload?.data?.data || []);
      setTotal(Number(res?.payload?.data?.total) || 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, page, applied]);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    if (from && to && new Date(to) < new Date(from)) {
      toast.error("End date must be on or after start date");
      return;
    }
    setPage(1);
    setApplied({
      q: String(q || "").trim(),
      status,
      category,
      from,
      to,
    });
  };

  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setCategory("all");
    setFrom("");
    setTo("");
    setPage(1);
    setApplied({ q: "", status: "all", category: "all", from: "", to: "" });
  };

  const hasFilters = Boolean(
    applied.q ||
      applied.from ||
      applied.to ||
      applied.status !== "all" ||
      applied.category !== "all"
  );

  return (
    <LogisticsPageShell title="My jobs" crumbLabel="My jobs">
      <form
        className="log-jobs-toolbar log-jobs-toolbar--wrap"
        onSubmit={applyFilters}
      >
        <label className="log-jobs-toolbar__search">
          <span className="log-fl">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Job no., load, pickup, or delivery…"
            aria-label="Search jobs"
          />
        </label>
        <label>
          <span className="log-fl">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="0">Pending quotes</option>
            <option value="1">Accepted</option>
            {/* <option value="2">En route to pickup</option> */}
            {/* <option value="3">At pickup</option> */}
            <option value="4">In transit</option>
            <option value="5">Delivered</option>
            <option value="6">Cancelled</option>
            <option value="7">Rejected</option>
          </select>
        </label>
        <JobCategorySelect
          value={category}
          onChange={setCategory}
          appliedValue={applied.category}
        />
        <label className="log-jobs-toolbar__date">
          <span className="log-fl">From</span>
          <LogisticsDateInput
            className="log-date-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="log-jobs-toolbar__date">
          <span className="log-fl">To</span>
          <LogisticsDateInput
            className="log-date-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="log-jobs-toolbar__actions">
          <button
            type="submit"
            className="logistics-cta logistics-cta--primary"
          >
            Apply
          </button>
          {hasFilters || q || from || to || status !== "all" || category !== "all" ? (
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={clearFilters}
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      <div className="log-jobs-meta">
        {loading
          ? "Loading jobs…"
          : total
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                total
              )} of ${total} job${total === 1 ? "" : "s"}`
            : hasFilters
              ? "No jobs match these filters"
              : "No jobs yet"}
      </div>

      <ul className="log-result-list log-jobs-list log-jl">
        {jobs.map((job) => {
          const thumb = jobImageUrl(job.images?.[0]);
          const weight = formatJobWeight(job.load_weight);
          const posted = formatWhen(job.createdAt);
          const when = formatWhen(job.when_needed);
          const budget = formatMoney(job.budget);
          const status =
            (isCabJob(job) ? RIDE_STATUS_LABEL : STATUS_LABEL)[job.status] ??
            `status ${job.status}`;
          const statusTone =
            Number(job.status) === 0
              ? "pending"
              : Number(job.status) === 5
                ? "done"
                : Number(job.status) === 6 || Number(job.status) === 7
                  ? "closed"
                  : Number(job.status) >= 1 && Number(job.status) <= 4
                    ? "progress"
                    : "pending";
          const plant = isEquipmentJob(job);
          const siteLabel = placeShortLabel(job.pickup?.address);
          const catKey = jobCategoryKey(job);
          const catLabel =
            catKey === "cab" ? "Cab" : plant ? hubCategoryLabel(catKey) : "Logistic";
          const ride = isCabJob(job);
          const distance =
            !plant && job.route?.distance_km != null
              ? `~${Math.round(job.route.distance_km)} km`
              : null;
          const detail = ride
            ? [job.ride?.cab_class ? job.ride.cab_class.charAt(0).toUpperCase() + job.ride.cab_class.slice(1) : null,
               job.ride?.passengers ? `${job.ride.passengers} passenger${job.ride.passengers === 1 ? "" : "s"}` : null]
                .filter(Boolean)
                .join(" · ")
            : plant
              ? job.budget?.rate_unit === "hour"
                ? "Paid by hour"
                : job.budget?.rate_unit === "day"
                  ? "Paid by day"
                  : "Equipment hire"
              : weight;
          return (
            <li key={job._id}>
              <Link
                to={`/logistics/jobs/${job._id}`}
                className={`log-jl-card log-jl-card--${catKey}`}
              >
                <span className="log-jl-card__media" aria-hidden="true">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = defaultImage;
                      }}
                    />
                  ) : (
                    <CategoryGlyph type={catKey} size={26} />
                  )}
                </span>

                <span className="log-jl-card__body">
                  <span className="log-jl-card__top">
                    <span className="log-jl-card__cat">{catLabel}</span>
                    <span className={`log-jd-status log-jd-status--${statusTone} log-jl-card__status`}>
                      <i aria-hidden="true" />
                      {status}
                    </span>
                    {job.priority ? <span className="log-jl-card__flag">Priority</span> : null}
                  </span>
                  <b className="log-jl-card__title">{job.load_type || "Transport"}</b>
                  <span className="log-jl-card__route">
                    {plant ? (
                      <span className="log-jl-card__stop">
                        <em aria-hidden="true" />
                        {siteLabel || job.pickup?.address || "—"}
                      </span>
                    ) : (
                      <>
                        <span className="log-jl-card__stop">
                          <em aria-hidden="true" />
                          {placeShortLabel(job.pickup?.address) || job.pickup?.address || "—"}
                        </span>
                        <span className="log-jl-card__arrow" aria-hidden="true">→</span>
                        <span className="log-jl-card__stop log-jl-card__stop--to">
                          <em aria-hidden="true" />
                          {placeShortLabel(job.dropoff?.address) || job.dropoff?.address || "—"}
                        </span>
                      </>
                    )}
                  </span>
                  <span className="log-jl-card__meta">
                    {when ? <span title="When needed">📅 {when}</span> : null}
                    {detail ? <span>{detail}</span> : null}
                    {distance ? <span>{distance}</span> : null}
                    {job.job_number ? <span className="log-jl-card__ref">#{job.job_number}</span> : null}
                    {posted ? <span className="log-jl-card__posted">Posted {posted}</span> : null}
                  </span>
                </span>

                <span className="log-jl-card__side">
                  {budget ? <strong className="log-jl-card__price">{budget}</strong> : null}
                  {job.budget?.amount != null ? (
                    <small>{job.budget?.negotiable ? "Negotiable" : "Fixed"}</small>
                  ) : null}
                  <span className="log-jl-card__end">
                    <JobCategoryBadge job={job} compact />
                    <span className="log-jl-card__open" aria-hidden="true">›</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {!loading && !jobs.length && (
          <li className="logistics-empty log-results__empty">
            {hasFilters ? "No jobs match these filters" : "No jobs yet"}
          </li>
        )}
      </ul>

      {showPagination ? (
        <div className="log-jobs-pager" role="navigation" aria-label="Pages">
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="log-jobs-pager__pages">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </LogisticsPageShell>
  );
}

export function LogisticsJobDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [requestingCollect, setRequestingCollect] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewMessage, setReviewMessage] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [resolvingReportId, setResolvingReportId] = useState(null);
  const [resolveNote, setResolveNote] = useState("");

  const reloadJob = async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    try {
      const res = await dispatch(LogisticsActions.getJob(id));
      const next = res?.payload?.data?.job || null;
      setJob(next);
      setQuotes(res?.payload?.data?.quotations || []);
      if (!next) {
        setLoadError(
          res?.payload?.message ||
            "Could not load this job. It may be a direct booking you cannot open, or it was removed."
        );
      } else {
        setLoadError("");
      }
    } catch (err) {
      setJob(null);
      setQuotes([]);
      setLoadError(err?.message || "Could not load this job");
    } finally {
      if (!soft) setLoading(false);
    }
  };

  useEffect(() => {
    reloadJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") reloadJob({ soft: true });
    };
    const onLogisticsNotif = (evt) => {
      const detail = evt?.detail || {};
      if (detail.job_id && String(detail.job_id) === String(id)) {
        reloadJob({ soft: true });
      }
      if (
        detail.type === "logistics_delivery_otp" ||
        detail.type === "logistics_ride_pin" ||
        detail.type === "logistics_reject_otp" ||
        detail.type === "logistics_job_delivered" ||
        detail.type === "logistics_job_rejected" ||
        detail.type === "logistics_job_cancelled" ||
        detail.type === "logistics_hire_collect_requested" ||
        detail.type === "logistics_job_transit"
      ) {
        reloadJob({ soft: true });
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    window.addEventListener("simba:logistics_notification", onLogisticsNotif);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(
        "simba:logistics_notification",
        onLogisticsNotif
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const accept = async (quotation_id) => {
    const res = await dispatch(
      LogisticsActions.acceptQuote({ jobId: id, quotation_id })
    );
    if (res?.meta?.requestStatus === "rejected") {
      toast.error(res?.payload?.message || "Could not accept quote");
      return;
    }
    toast.success("Quote accepted");
    await reloadJob();
  };

  const reject = async (quotation_id) => {
    if (!window.confirm("Reject this quote?")) return;
    const res = await dispatch(
      LogisticsActions.rejectQuote({ jobId: id, quotation_id })
    );
    if (res?.meta?.requestStatus === "rejected") {
      toast.error(res?.payload?.message || "Could not reject quote");
      return;
    }
    toast.success("Quote rejected");
    await reloadJob();
  };

  const myUserId = localStorage.getItem("userId") || "";

  const chatWithQuoter = (driver) => {
    if (Number(job?.status) === 6) {
      toast.info("This job was cancelled — chat is closed from quotes");
      return;
    }
    if (driver?._id && String(driver._id) === String(myUserId)) {
      toast.info("You cannot chat with yourself");
      return;
    }
    openLogisticsJobChat({
      peerId: driver?._id,
      peerName: driver?.full_name || driver?.company_name || driver?.name,
      peer: driver,
      job,
      navigate,
      role: localStorage.getItem("role"),
    });
  };

  const assignedPeer = (() => {
    const d = job?.assigned?.driver_id;
    const o = job?.assigned?.owner_id;
    const peer = (typeof d === "object" && d?._id ? d : null) ||
      (typeof o === "object" && o?._id ? o : null);
    if (peer) return peer;
    const idOnly = d?._id || d || o?._id || o;
    if (!idOnly) return null;
    return { _id: idOnly, full_name: "Operator" };
  })();

  const assignedTel = telHref(
    assignedPeer?.phone_number,
    assignedPeer?.country_code
  );
  const showAssignedContact =
    Number(job?.status) >= 1 &&
    Number(job?.status) <= 5 &&
    assignedPeer?._id &&
    String(assignedPeer._id) !== String(myUserId);

  const canEditOrRemove =
    job && Number(job.status) === 0 && quotes.length === 0;

  const removeJob = async () => {
    if (!canEditOrRemove) return;
    if (
      !window.confirm(
        "Remove this job? You can only remove it while no quotes have been submitted."
      )
    ) {
      return;
    }
    setRemoving(true);
    try {
      const res = await dispatch(LogisticsActions.deleteJob(id));
      if (res?.payload?.success) {
        toast.success("Job removed");
        navigate("/logistics/jobs");
      } else {
        toast.error(res?.payload?.message || "Could not remove job");
      }
    } finally {
      setRemoving(false);
    }
  };

  const cancelAssignedJob = () => setCancelModalOpen(true);

  const submitCancelAssignedJob = async (reason) => {
    setCancelling(true);
    try {
      const res = await dispatch(
        LogisticsActions.cancelJob({ jobId: id, reason: String(reason).trim() })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not cancel job");
        return;
      }
      setCancelModalOpen(false);
      toast.success("Job cancelled");
      await reloadJob();
    } finally {
      setCancelling(false);
    }
  };

  const requestComeCollect = async () => {
    if (
      !window.confirm(
        "Confirm that your equipment requirement is finished? The owner will be notified to come and collect the equipment."
      )
    ) {
      return;
    }
    setRequestingCollect(true);
    try {
      const res = await dispatch(LogisticsActions.requestCollection({ jobId: id }));
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not request collection");
        return;
      }
      toast.success("Owner notified — come and collect requested");
      await reloadJob();
    } finally {
      setRequestingCollect(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!(reviewRating >= 1 && reviewRating <= 5)) {
      toast.error("Pick a rating from 1 to 5");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await dispatch(
        LogisticsActions.submitJobReview({
          jobId: id,
          rating: reviewRating,
          message: reviewMessage,
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not submit review");
        return;
      }
      toast.success("Thanks for your review");
      setReviewMessage("");
      await reloadJob();
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportMessage.trim()) {
      toast.error("Please describe what happened");
      return;
    }
    setSubmittingReport(true);
    try {
      const res = await dispatch(
        LogisticsActions.createJobReport({
          jobId: id,
          message: reportMessage.trim(),
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not submit report");
        return;
      }
      toast.success("Report sent to the fleet owner");
      setReportMessage("");
      setReportOpen(false);
      await reloadJob();
    } finally {
      setSubmittingReport(false);
    }
  };

  const markReportResolved = async (reportId) => {
    setResolvingReportId(reportId);
    try {
      const res = await dispatch(
        LogisticsActions.resolveJobReport({
          reportId,
          note: resolveNote.trim(),
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not resolve report");
        return;
      }
      toast.success("Report marked resolved");
      setResolveNote("");
      await reloadJob();
    } finally {
      setResolvingReportId(null);
    }
  };

  if (!job) {
    return (
      <LogisticsPageShell title="Job detail" crumbLabel="Job">
        <p className="logistics-empty">
          {loading
            ? "Loading…"
            : loadError || "Job not found"}
        </p>
        {!loading ? (
          <p style={{ textAlign: "center", marginTop: 12 }}>
            <Link to="/logistics/jobs" className="logistics-cta logistics-cta--ghost">
              Back to My jobs
            </Link>
          </p>
        ) : null}
      </LogisticsPageShell>
    );
  }

  const images = (job.images || []).map(jobImageUrl).filter(Boolean);
  const returnImages = (job.return_trip?.images || [])
    .map(jobImageUrl)
    .filter(Boolean);
  const weight = formatJobWeight(job.load_weight);
  const budget = formatMoney(job.budget);
  const when = formatWhen(job.when_needed);
  const plantJob = isEquipmentJob(job);
  const site = jobSite(job);
  const statusLabel = plantJob
    ? EQUIPMENT_STATUS_LABEL[job.status] ??
      STATUS_LABEL[job.status] ??
      String(job.status)
    : isCabJob(job)
      ? RIDE_STATUS_LABEL[job.status] ?? String(job.status)
      : STATUS_LABEL[job.status] ?? String(job.status);
  const returnWeight = formatJobWeight(job.return_trip?.weight);
  const statusTone =
    Number(job.status) === 0
      ? "pending"
      : Number(job.status) === 5
        ? "done"
        : Number(job.status) === 6 || Number(job.status) === 7
          ? "closed"
          : Number(job.status) >= 1 && Number(job.status) <= 4
            ? "progress"
            : "pending";
  const pickupShort = placeShortLabel(job.pickup?.address);
  const dropoffShort = placeShortLabel(job.dropoff?.address);
  const distanceKm = job.route?.distance_km;
  const jobStatus = Number(job.status);
  const otpPending =
    Boolean(job.delivery_otp_pending) &&
    jobStatus === 4 &&
    Boolean(job.delivery_otp);
  const rejectOtpPending =
    Boolean(job.reject_otp_pending) && Boolean(job.reject_otp);
  const canCancelJob = jobStatus === 0 || jobStatus === 1;
  const isNonPropelled = Boolean(job.assigned_asset?.is_non_propelled);
  const hireCollectRequested = Boolean(job.hire_collect_requested);
  const canRequestCollect =
    plantJob &&
    isNonPropelled &&
    jobStatus === 4 &&
    !hireCollectRequested &&
    !otpPending &&
    !rejectOtpPending;
  const showCustomerTrack = jobStatus >= 1 && jobStatus <= 5;
  const customerTrackSteps = plantJob
    ? isNonPropelled
      ? CUSTOMER_TRACK_EQUIPMENT_NON_PROPELLED
      : CUSTOMER_TRACK_EQUIPMENT
    : isCabJob(job)
      ? CUSTOMER_TRACK_RIDE
      : CUSTOMER_TRACK_TRANSPORT;
  const canReview =
    jobStatus === 5 && !job.customer_review?.rating;
  const existingReview = job.customer_review?.rating
    ? job.customer_review
    : null;
  const reports = Array.isArray(job.reports) ? job.reports : [];
  const openReport = job.open_report || reports.find((r) => r.status === "open");
  const jobAccepted =
    Boolean(job.assigned?.owner_id) && jobStatus >= 1 && jobStatus <= 5;
  const canReport = jobAccepted && !openReport;
  const catKey = jobCategoryKey(job);
  const catLabel = catKey === "cab" ? "Cab ride" : plantJob ? `${hubCategoryLabel(catKey)} hire` : "Logistic";
  const cabRide = isCabJob(job);
  const assignedAsset = job.assigned_asset || null;
  const assetLine = assignedAsset
    ? [assignedAsset.name, [assignedAsset.make, assignedAsset.model].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(" · ")
    : "";
  const factTiles = [
    when
      ? { k: "when", label: cabRide ? "Booked" : plantJob ? "Hire from" : "Needed", value: when, sub: job.flexible_dates ? "Flexible dates" : null }
      : null,
    budget
      ? {
          k: "price",
          label: cabRide ? "Fare" : plantJob ? "Budget" : "Price",
          value: budget,
          sub: [
            job.budget?.rate_unit === "hour" ? "per hour" : job.budget?.rate_unit === "day" ? "per day" : null,
            job.budget?.negotiable ? "Negotiable" : "Fixed",
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : null,
    !plantJob && distanceKm != null
      ? { k: "distance", label: "Distance", value: `~${Math.round(distanceKm)} km`, sub: cabRide ? "Estimated" : null }
      : null,
    cabRide && job.ride?.passengers
      ? {
          k: "pax",
          label: "Passengers",
          value: String(job.ride.passengers),
          sub: job.ride?.cab_class ? job.ride.cab_class.charAt(0).toUpperCase() + job.ride.cab_class.slice(1) : null,
        }
      : weight
        ? { k: "weight", label: "Load", value: weight, sub: null }
        : null,
  ].filter(Boolean);

  return (
    <LogisticsPageShell title="Job detail" crumbLabel="Job">
      <div className={`log-form-card log-job-detail log-job-detail--v2 log-jd--${catKey}`}>
        {canEditOrRemove ? (
          <div className="log-detail-actions">
            <Link
              className="logistics-cta logistics-cta--ghost"
              to={`/logistics/post?edit=${id}`}
            >
              Edit
            </Link>
            <button
              type="button"
              className="logistics-cta logistics-cta--danger"
              disabled={removing}
              onClick={removeJob}
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        ) : canCancelJob ? (
          <div className="log-detail-actions">
            <button
              type="button"
              className="logistics-cta logistics-cta--danger"
              disabled={cancelling}
              onClick={cancelAssignedJob}
            >
              {cancelling ? "Cancelling…" : "Cancel job"}
            </button>
            <p className="log-hint" style={{ margin: 0 }}>
              {plantJob
                ? "You can cancel until the hire starts (Transit)."
                : isCabJob(job)
                  ? "You can cancel until the driver is on the way."
                  : "You can cancel until the operator starts Collect."}
            </p>
          </div>
        ) : null}

        <header className="log-jd-hero">
          <div className="log-jd-hero__band">
            <span className="log-jd-hero__cat">
              <span className="log-jd-hero__cat-icon" aria-hidden="true">
                <CategoryGlyph type={catKey} size={26} />
              </span>
              <span className="log-jd-hero__cat-text">
                <small>{catLabel}</small>
                <b>{job.load_type || "Transport job"}</b>
              </span>
            </span>
            <span className="log-jd-hero__badges">
              <span className={`log-jd-status log-jd-status--${statusTone}`}>
                <i aria-hidden="true" />
                {statusLabel}
              </span>
              {job.job_number ? (
                <span className="log-jd-ref" title="Share this job reference">
                  Ref <b>{job.job_number}</b>
                </span>
              ) : null}
            </span>
          </div>

          <div className="log-jd-hero__body">
            <ol className="log-jd-route" aria-label="Route">
              <li className="log-jd-route__stop log-jd-route__stop--from">
                <em aria-hidden="true" />
                <span>
                  <small>{plantJob ? "Work site" : cabRide ? "Pickup" : "From"}</small>
                  <b>{pickupShort || job.pickup?.address || "—"}</b>
                  {job.pickup?.address && job.pickup.address !== pickupShort ? (
                    <span className="log-jd-route__full">{job.pickup.address}</span>
                  ) : null}
                </span>
              </li>
              {!plantJob ? (
                <li className="log-jd-route__stop log-jd-route__stop--to">
                  <em aria-hidden="true" />
                  <span>
                    <small>{cabRide ? "Drop-off" : "To"}</small>
                    <b>{dropoffShort || job.dropoff?.address || "—"}</b>
                    {job.dropoff?.address && job.dropoff.address !== dropoffShort ? (
                      <span className="log-jd-route__full">{job.dropoff.address}</span>
                    ) : null}
                  </span>
                </li>
              ) : null}
            </ol>

            {job.expires_at && Number(job.status) === 0 ? (
              <p className="log-jd-expiry">
                ⚡ Now — open until{" "}
                {new Date(job.expires_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </div>

          <dl className="log-jd-facts">
            {factTiles.map((f) => (
              <div key={f.k} className={`log-jd-fact log-jd-fact--${f.k}`}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
                {f.sub ? <span>{f.sub}</span> : null}
              </div>
            ))}
          </dl>

          {job.special_notes ? (
            <p className="log-jd-note">
              <span aria-hidden="true">“</span>
              {job.special_notes}
            </p>
          ) : null}
        </header>

        {showAssignedContact ? (
          <section className="log-jd-party" aria-label={cabRide ? "Your driver" : "Your operator"}>
            <div className="log-jd-party__who">
              {assignedPeer.profile_image ? (
                <img
                  className="log-jd-party__avatar"
                  src={jobImageUrl(assignedPeer.profile_image) || defaultImage}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultImage;
                  }}
                />
              ) : (
                <span className="log-jd-party__avatar log-jd-party__avatar--initials">
                  {(assignedPeer.full_name || "O").slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="log-jd-party__meta">
                <small>{cabRide ? "Your driver" : plantJob ? "Your operator / owner" : "Your operator"}</small>
                <b>{assignedPeer.full_name || "Operator"}</b>
                {assetLine ? (
                  <span className="log-jd-party__vehicle">
                    <CategoryGlyph type={catKey} size={14} />
                    {assetLine}
                  </span>
                ) : null}
                <span className="log-jd-party__contact">
                  {assignedPeer.phone_number
                    ? [assignedPeer.country_code, assignedPeer.phone_number]
                        .filter(Boolean)
                        .join(" ")
                    : "No phone on file"}
                  {assignedPeer.email ? (
                    <>
                      {" · "}
                      <a href={`mailto:${assignedPeer.email}`}>{assignedPeer.email}</a>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
            <div className="log-jd-party__actions">
              <QuoteChatIconButton
                title={`Chat with ${assignedPeer.full_name || "operator"}`}
                onClick={() => chatWithQuoter(assignedPeer)}
              />
              {assignedTel ? (
                <a
                  className="log-quote-call-btn"
                  href={assignedTel}
                  title={`Call ${assignedPeer.full_name || "operator"}`}
                  aria-label={`Call ${assignedPeer.full_name || "operator"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
                  </svg>
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {showCustomerTrack ? (
          <div className="log-op-track-card">
            <div className="log-op-track-head">
              <b>{plantJob ? "Hire progress" : "Job progress"}</b>
            </div>
            <ol className="log-op-track">
              {customerTrackSteps.map((step) => {
                let cls = "";
                if (step.status === "collect") {
                  if (jobStatus === 5 || hireCollectRequested) cls = "done";
                  else if (jobStatus === 4) cls = "now";
                } else if (
                  jobStatus > step.status ||
                  (jobStatus === 5 && step.status === 5)
                ) {
                  cls = "done";
                } else if (jobStatus === step.status) {
                  if (
                    step.status === 4 &&
                    hireCollectRequested &&
                    isNonPropelled
                  ) {
                    cls = "done";
                  } else {
                    cls = "now";
                  }
                }
                const atRaw =
                  step.status === "collect"
                    ? job.hire_collect_requested_at
                    : latestStatusAt(job.status_history, step.status);
                const at = formatStatusAt(atRaw);
                return (
                  <li key={step.key} className={cls}>
                    <em />
                    <span>{step.label}</span>
                    {at && atRaw ? (
                      <time dateTime={new Date(atRaw).toISOString()}>{at}</time>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {canRequestCollect ? (
              <div className="log-op-actions">
                <button
                  type="button"
                  className="logistics-cta logistics-cta--primary"
                  disabled={requestingCollect}
                  onClick={requestComeCollect}
                >
                  {requestingCollect
                    ? "Notifying…"
                    : "Requirement finished — come collect equipment"}
                </button>
                <p className="log-op-reassign-note">
                  Non-propelled equipment stays on site until the owner collects
                  it. This notifies the fleet owner.
                </p>
              </div>
            ) : null}
            {hireCollectRequested && jobStatus === 4 && !otpPending ? (
              <p className="log-op-collect-banner" role="status">
                Come-collect requested
                {job.hire_collect_requested_at
                  ? ` on ${formatStatusAt(job.hire_collect_requested_at)}`
                  : ""}
                . Waiting for the owner to collect and complete the hire.
              </p>
            ) : null}
          </div>
        ) : null}

        {isCabJob(job) && job.ride_pin ? (
          <div className="log-delivery-otp-banner log-ride-pin-banner" role="status">
            <h2 className="log-sect">
              {jobStatus === 3 ? "Your driver has arrived — share your ride PIN" : "Your ride PIN"}
            </h2>
            <p>
              Share this PIN with the driver only once you are in the cab and it
              matches the booked vehicle. The trip can't start without it.
            </p>
            <div className="log-delivery-otp-banner__code" aria-live="polite">
              {job.ride_pin}
            </div>
          </div>
        ) : null}

        {otpPending ? (
          <div className="log-delivery-otp-banner" role="status">
            <h2 className="log-sect">
              {plantJob ? "Hire completion OTP" : "Delivery confirmation OTP"}
            </h2>
            <p>
              {plantJob
                ? "Share this code with your operator/owner so they can mark the hire complete."
                : "Share this code with your operator so they can mark the job delivered."}
            </p>
            {plantJob && job.completion_amount?.value > 0 ? (
              <p className="log-delivery-otp-banner__amount">
                Amount to pay:{" "}
                <strong>
                  {job.completion_amount.currency || "USD"}{" "}
                  {job.completion_amount.value}
                </strong>
              </p>
            ) : null}
            <div className="log-delivery-otp-banner__code" aria-live="polite">
              {job.delivery_otp}
            </div>
          </div>
        ) : null}

        {rejectOtpPending ? (
          <div className="log-delivery-otp-banner" role="status">
            <h2 className="log-sect">Rejection confirmation OTP</h2>
            <p>
              Due to some reason the fleet owner needs to reject this job
              {job.reject_reason ? ` (${job.reject_reason})` : ""}. Share this
              code with the owner to confirm the rejection.
            </p>
            <div className="log-delivery-otp-banner__code" aria-live="polite">
              {job.reject_otp}
            </div>
          </div>
        ) : null}

        {canReview ? (
          <form className="log-job-review" onSubmit={submitReview}>
            <h2 className="log-sect">
              {plantJob ? "Rate this hire" : isCabJob(job) ? "Rate this ride" : "Rate this delivery"}
            </h2>
            <p className="log-op-lead">
              How was this job? Your rating helps other customers choose
              operators.
            </p>
            <div className="log-job-review__stars" role="group" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n <= reviewRating ? "on" : ""}
                  onClick={() => setReviewRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="log-job-review__msg"
              rows={3}
              maxLength={1000}
              placeholder="Optional review message"
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="logistics-cta logistics-cta--primary"
              disabled={submittingReview}
            >
              {submittingReview ? "Submitting…" : "Submit review"}
            </button>
          </form>
        ) : null}

        {existingReview ? (
          <div className="log-job-review log-job-review--done">
            <h2 className="log-sect">Your review</h2>
            <p className="log-job-review__stars-static" aria-label={`${existingReview.rating} of 5`}>
              {"★".repeat(existingReview.rating)}
              <span>{"☆".repeat(5 - existingReview.rating)}</span>
            </p>
            {existingReview.message ? (
              <p className="log-job-review__msg-static">{existingReview.message}</p>
            ) : null}
          </div>
        ) : null}

        {canReport || reports.length > 0 ? (
          <div className="log-job-report">
            <h2 className="log-sect">Report an issue</h2>
            <p className="log-op-lead">
              Tell the fleet owner (and Simba admin) about anything that went
              wrong — behaviour, charges, equipment, mishandling, or any other
              concern. You can mark it resolved when it is fixed.
            </p>

            {reports.map((r) => (
              <div
                key={r._id}
                className={`log-job-report__card${
                  r.status === "open" ? " is-open" : " is-resolved"
                }`}
              >
                <div className="log-job-report__meta">
                  <span
                    className={`log-job-report__badge log-job-report__badge--${r.status}`}
                  >
                    {r.status === "open" ? "Open" : "Resolved"}
                  </span>
                  <time dateTime={r.createdAt}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : ""}
                  </time>
                </div>
                <p className="log-job-report__msg">{r.message}</p>
                {r.status === "resolved" ? (
                  <p className="log-job-report__resolve-note">
                    Resolved
                    {r.resolved_by_role ? ` by ${r.resolved_by_role}` : ""}
                    {r.resolve_note ? ` — ${r.resolve_note}` : ""}
                  </p>
                ) : (
                  <div className="log-job-report__resolve">
                    <input
                      type="text"
                      className="log-field-input"
                      placeholder="Optional note when resolving"
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                    />
                    <button
                      type="button"
                      className="logistics-cta"
                      disabled={resolvingReportId === r._id}
                      onClick={() => markReportResolved(r._id)}
                    >
                      {resolvingReportId === r._id
                        ? "Saving…"
                        : "Mark resolved"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {canReport ? (
              reportOpen ? (
                <form className="log-job-report__form" onSubmit={submitReport}>
                  <textarea
                    className="log-job-review__msg"
                    rows={3}
                    maxLength={2000}
                    required
                    placeholder="Describe what you want to report…"
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                  />
                  <div className="log-job-report__actions">
                    <button
                      type="submit"
                      className="logistics-cta logistics-cta--primary"
                      disabled={submittingReport}
                    >
                      {submittingReport ? "Sending…" : "Submit report"}
                    </button>
                    <button
                      type="button"
                      className="logistics-cta"
                      onClick={() => {
                        setReportOpen(false);
                        setReportMessage("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="logistics-cta log-job-report__trigger"
                  onClick={() => setReportOpen(true)}
                >
                  Report
                </button>
              )
            ) : null}
          </div>
        ) : null}

        <h2 className="log-sect log-jd-sect">{plantJob ? "Work site" : "Route"}</h2>
        {plantJob ? (
          <LogisticsEquipmentRoutePanel
            site={site}
            viewer="customer"
            height={320}
          />
        ) : (
          <LogisticsJobRoutePanel
            pickup={job.pickup}
            dropoff={job.dropoff}
            distanceKm={distanceKm}
          />
        )}

        {job.return_trip && !plantJob ? (
          <div className="log-return-panel">
            <p>
              <strong>Return trip</strong>
              {job.return_trip.goods ? ` — ${job.return_trip.goods}` : ""}
              {returnWeight ? ` · ${returnWeight}` : ""}
            </p>
            {returnImages.length > 0 ? (
              <div className="log-job-gallery log-job-gallery--return">
                <h3 className="log-sect">Return load photos</h3>
                <div className="log-job-gallery__grid">
                  {returnImages.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer">
                      <img
                        src={src}
                        alt="Return load"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultImage;
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {images.length > 0 && (
          <div className="log-job-gallery">
            <h2 className="log-sect">Load photos</h2>
            <div className="log-job-gallery__grid">
              {images.map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer">
                  <img
                    src={src}
                    alt="Load"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultImage;
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <section className="log-qx" aria-labelledby="job-quotes-title">
          <div className="log-qx__head">
            <h2 id="job-quotes-title" className="log-sect">
              Quotes <span className="log-jd-count">{quotes.length}</span>
            </h2>
            {quotes.length > 1 && Number(job.status) === 0 ? (
              <span className="log-qx__hint">Sorted by price — lowest first</span>
            ) : null}
          </div>

          {!quotes.length ? (
            <div className="log-qx__empty">
              <span aria-hidden="true">⏳</span>
              <b>No quotes yet</b>
              <small>
                {Number(job.status) === 0
                  ? "Nearby fleets are being notified — quotes will appear here."
                  : "No quotes on this job."}
              </small>
            </div>
          ) : (
            <ul className="log-qx__list">
              {(() => {
                const rank = { accepted: 0, pending: 1, declined: 2, withdrawn: 3 };
                const sorted = [...quotes].sort(
                  (a, b) =>
                    (rank[a.status] ?? 4) - (rank[b.status] ?? 4) ||
                    Number(a.amount?.value || 0) - Number(b.amount?.value || 0)
                );
                const pendingVals = quotes
                  .filter((q) => q.status === "pending")
                  .map((q) => Number(q.amount?.value || 0));
                const lowest = pendingVals.length > 1 ? Math.min(...pendingVals) : null;
                const offered = Number(job.budget?.amount);
                return sorted.map((q) => {
                  const driver = q.driver || {};
                  const owner = q.owner || {};
                  const displayName =
                    (q.owner_driven
                      ? owner.full_name || owner.company_name || driver.full_name || driver.company_name
                      : driver.full_name || driver.company_name || owner.full_name || owner.company_name) ||
                    "Operator";
                  const opPhoto = jobImageUrl(
                    (q.owner_driven
                      ? owner.profile_image || driver.profile_image || driver.profile_photo
                      : driver.profile_image || driver.profile_photo || owner.profile_image) || null
                  );
                  const chatPeer = {
                    _id: driver._id || owner._id,
                    full_name: displayName,
                    company_name: owner.company_name || driver.company_name,
                    email: driver.email || owner.email,
                    profile_image:
                      (q.owner_driven
                        ? owner.profile_image || driver.profile_image
                        : driver.profile_image || owner.profile_image) || undefined,
                  };
                  const asset = q.asset || {};
                  const vehiclePhoto = (asset.photos || []).map(jobImageUrl).filter(Boolean)[0];
                  const specs = [
                    [asset.make, asset.model].filter(Boolean).join(" "),
                    asset.registration,
                    asset.cab_class
                      ? `${asset.cab_class.charAt(0).toUpperCase() + asset.cab_class.slice(1)}${asset.seats ? ` · ${asset.seats} seats` : ""}`
                      : asset.capacity?.value != null
                        ? `${asset.capacity.value} ${asset.capacity.unit || "tons"}`
                        : null,
                  ].filter(Boolean);
                  const rating = asset.rating?.count ? asset.rating : null;
                  const amount = Number(q.amount?.value || 0);
                  const currency = q.amount?.currency || "USD";
                  const diff = Number.isFinite(offered) && offered > 0 ? amount - offered : null;
                  const jobCancelledByCustomer = Number(job.status) === 6;
                  const canQuoteChat =
                    chatPeer._id && String(chatPeer._id) !== String(myUserId) && !jobCancelledByCustomer;
                  const tel = q.status === "accepted" ? telHref(driver.phone_number, driver.country_code) : null;
                  const isLowest = lowest != null && q.status === "pending" && amount === lowest;
                  const canDecide = q.status === "pending" && Number(job.status) === 0;
                  return (
                    <li
                      key={q._id}
                      className={`log-qx-card log-qx-card--${q.status || "pending"}${isLowest ? " is-lowest" : ""}`}
                    >
                      {q.status === "accepted" ? (
                        <span className="log-qx-card__ribbon">✓ Selected</span>
                      ) : isLowest ? (
                        <span className="log-qx-card__ribbon is-lowest">Lowest price</span>
                      ) : null}

                      <div className="log-qx-card__top">
                        <div className="log-qx-card__who">
                          {opPhoto ? (
                            <img
                              className="log-qx-card__avatar"
                              src={opPhoto}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultImage;
                              }}
                            />
                          ) : (
                            <span className="log-qx-card__avatar log-qx-card__avatar--initials">
                              {displayName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="log-qx-card__id">
                            <b>{displayName}</b>
                            <span className="log-qx-card__tags">
                              {rating ? (
                                <span className="log-qx-card__rating">
                                  ★ {rating.average.toFixed(1)} <small>({rating.count})</small>
                                </span>
                              ) : (
                                <span className="log-qx-card__rating is-new">New</span>
                              )}
                              <span className="log-qx-card__role">
                                {q.owner_driven ? "Owner drives" : "Fleet operator"}
                              </span>
                              {asset.completed_jobs ? (
                                <span className="log-qx-card__role">
                                  {asset.completed_jobs} job{asset.completed_jobs === 1 ? "" : "s"} done
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                        <div className="log-qx-card__price">
                          <strong>
                            {currency} {amount.toFixed(2).replace(/\.00$/, "")}
                          </strong>
                          {diff != null && diff !== 0 ? (
                            <small className={diff < 0 ? "is-below" : "is-above"}>
                              {diff < 0 ? "▼" : "▲"} {currency} {Math.abs(diff).toFixed(2).replace(/\.00$/, "")}{" "}
                              {diff < 0 ? "below" : "above"} your offer
                            </small>
                          ) : diff === 0 ? (
                            <small className="is-match">Matches your offer</small>
                          ) : null}
                          <span className={`log-chip log-chip--${q.status || "pending"}`}>
                            {q.status || "pending"}
                          </span>
                        </div>
                      </div>

                      <div className="log-qx-card__vehicle">
                        <span className="log-qx-card__vphoto">
                          {vehiclePhoto ? (
                            <img
                              src={vehiclePhoto}
                              alt={asset.name || "Vehicle"}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultImage;
                              }}
                            />
                          ) : (
                            <CategoryGlyph type={jobCategoryKey(job)} size={26} />
                          )}
                        </span>
                        <span className="log-qx-card__vtext">
                          <b>{asset.name || "Vehicle"}</b>
                          {specs.length ? <small>{specs.join(" · ")}</small> : null}
                        </span>
                      </div>

                      {q.message ? <p className="log-qx-card__msg">{q.message}</p> : null}

                      {q.status === "accepted" && (driver.email || driver.phone_number) ? (
                        <p className="log-qx-card__contact">
                          {driver.phone_number ? (
                            <span>📞 {[driver.country_code, driver.phone_number].filter(Boolean).join(" ")}</span>
                          ) : null}
                          {driver.email ? (
                            <a href={`mailto:${driver.email}`}>✉ {driver.email}</a>
                          ) : null}
                        </p>
                      ) : null}

                      <div className="log-qx-card__foot">
                        <span className="log-qx-card__talk">
                          {canQuoteChat ? (
                            <QuoteChatIconButton
                              title={`Chat with ${displayName}`}
                              onClick={() => chatWithQuoter(chatPeer)}
                            />
                          ) : null}
                          {tel ? (
                            <a
                              className="log-quote-call-btn"
                              href={tel}
                              title={`Call ${displayName}`}
                              aria-label={`Call ${displayName}`}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
                              </svg>
                            </a>
                          ) : null}
                          {q.createdAt ? (
                            <small className="log-qx-card__when">Quoted {formatWhen(q.createdAt)}</small>
                          ) : null}
                        </span>
                        {canDecide ? (
                          <span className="log-qx-card__decide">
                            <button
                              className="logistics-cta logistics-cta--ghost"
                              type="button"
                              onClick={() => reject(q._id)}
                            >
                              Reject
                            </button>
                            <button
                              className="logistics-cta logistics-cta--primary"
                              type="button"
                              onClick={() => accept(q._id)}
                            >
                              Accept {currency} {amount.toFixed(2).replace(/\.00$/, "")}
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </section>
      </div>
      <LogisticsReasonModal
        open={cancelModalOpen}
        title={isEquipmentJob(job) ? "Cancel this hire?" : "Cancel this job?"}
        message={
          isEquipmentJob(job)
            ? "You can cancel only before Transit starts."
            : isCabJob(job)
              ? "You can cancel only before the driver is on the way."
              : "You can cancel only before Collect."
        }
        placeholder="Optional — let the provider know why"
        confirmLabel={isEquipmentJob(job) ? "Cancel hire" : "Cancel job"}
        cancelLabel="Keep job"
        busy={cancelling}
        onCancel={() => setCancelModalOpen(false)}
        onConfirm={submitCancelAssignedJob}
      />
    </LogisticsPageShell>
  );
}
