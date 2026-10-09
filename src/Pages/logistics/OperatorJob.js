import { useEffect, useMemo, useState } from "react";
import LogisticsMoneyInput from "../../CommanComponents/LogisticsMoneyInput";
import LogisticsReasonModal from "../../CommanComponents/LogisticsReasonModal";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  isDirectBookJob,
  isEquipmentJob,
  jobCategoryKey,
  jobSite,
  parseJobLoadSpec,
} from "../../utils/jobKind";
import { CategoryGlyph } from "../../CommanComponents/LogisticsFormIcons";
import QuoteChatIconButton from "../../Components/QuoteChatIconButton";
import {
  openLogisticsJobChat,
  telHref,
} from "../../utils/beginQuoteChat";
import { jobImageUrl } from "./MyJobs";
import { defaultImage } from "../../utils/ImagePath";
import {
  formatMoneyInputValue,
  parseLogisticsMoney,
} from "../../utils/logisticsMoney";
import { useLogisticsConfig } from "../../CommanComponents/useLogisticsConfig";
import "./logistics.css";
import {
  LogisticsDetailSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import { readDeviceGps } from "../../utils/deviceGps";
import { truckTooSmallForJob } from "../../utils/logisticVehicleWeight";
import { LogisticsSosJobBar } from "../../CommanComponents/LogisticsSosButton";

// Cab rides: passenger wording for the same status numbers
const RIDE_STATUS_LABEL = {
  0: "Finding operator",
  1: "Accepted",
  2: "On the way",
  3: "Arrived",
  4: "Trip started",
  5: "Completed",
  6: "Cancelled",
  7: "Rejected",
};

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

const TRACK_STEPS_TRANSPORT = [
  { status: 1, label: "Accepted" },
  { status: 2, label: "Collect" },
  { status: 3, label: "Loaded" },
  { status: 4, label: "Transit" },
  { status: 5, label: "Done" },
];

const TRACK_STEPS_EQUIPMENT = [
  { status: 1, label: "Accepted" },
  { status: 4, label: "Transit" },
  { status: 5, label: "Done" },
];

// Cab ride: same status numbers as transport, passenger wording
const TRACK_STEPS_RIDE = [
  { status: 1, label: "Accepted" },
  { status: 2, label: "On the way" },
  { status: 3, label: "Arrived" },
  { status: 4, label: "Trip started" },
  { status: 5, label: "Completed" },
];

const NEXT_ACTION_RIDE = {
  1: { status: 2, label: "On the way to pickup" },
  2: { status: 3, label: "Arrived at pickup" },
  3: { status: 4, label: "Start trip" },
  4: { status: 5, label: "Complete trip" },
};

const NEXT_ACTION_TRANSPORT = {
  1: { status: 2, label: "Confirm en route to pickup" },
  2: { status: 3, label: "Confirm arrival at pickup" },
  3: { status: 4, label: "Start delivery" },
  4: { status: 5, label: "Confirm delivered" },
};

const NEXT_ACTION_EQUIPMENT = {
  1: { status: 4, label: "Confirm transit / on hire" },
  4: { status: 5, label: "Confirm hire complete" },
};

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

/** Compact timestamp for status tracker steps. */
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

function formatWeight(loadWeight) {
  if (!loadWeight || loadWeight.value == null || loadWeight.value === "") return null;
  const value = Number(loadWeight.value);
  if (!Number.isFinite(value)) return null;
  return `${value} ${loadWeight.unit || "tons"}`;
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

function requiredAssetKind(job) {
  if (!job) return "vehicle";
  if (job.required_asset_kind) return job.required_asset_kind;
  const hub = String(job.hub_category || "").toLowerCase();
  if (hub === "cab" || job.job_type === "ride") return "cab";
  if (hub === "logistic" || hub === "logistics") return "vehicle";
  if (hub) return "equipment";
  if (job.job_type === "equipment_hire") return "equipment";
  if (job.budget?.rate_unit) return "equipment";
  return "vehicle";
}

function assetOptionLabel(a) {
  const parts = [
    a.name || a.registration || a._id,
    a.make && a.model ? `${a.make} ${a.model}` : a.make || a.model,
    a.capacity?.value != null
      ? `${a.capacity.value}${a.capacity.unit || "t"}`
      : null,
    a.kind === "equipment" ? "equipment" : null,
    a.kind === "cab" ? `cab · ${a.cab_class || ""} · ${a.seats || "?"} seats` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function assetAssignedOps(asset) {
  return (
    asset?.assigned_operators ||
    (asset?.assigned_sub_user_ids || []).filter(
      (op) => op && typeof op === "object"
    ) ||
    []
  );
}

/** True when an assigned operator has this asset as their active live unit. */
function isOperatorLiveOnAsset(asset) {
  return assetAssignedOps(asset).some((op) => {
    const av = op.logistics_availability || {};
    if (String(av.active_asset_id || "") !== String(asset._id)) return false;
    const state = av.state || "";
    return (
      state === "available_now" ||
      state === "returning_empty" ||
      state === "scheduled"
    );
  });
}

function hasAssignedOperator(asset) {
  return assetAssignedOps(asset).length > 0;
}

/**
 * Owner quoting: a truck is busy (not free) when an operator is live on it or
 * it is on another job. Owners can't quote on an operator's behalf — they may
 * only quote with a free truck (owner-driven, full earnings to the owner).
 */
function isTruckBusyForOwner(asset) {
  if (asset?.kind === "equipment") return false;
  return (
    isOperatorLiveOnAsset(asset) || asset?.availability?.state === "on_job"
  );
}

function ownerAssetSelectLabel(asset) {
  const base = assetOptionLabel(asset);
  if (isOperatorLiveOnAsset(asset)) return `${base} · live`;
  if (!hasAssignedOperator(asset)) return `${base} · no operator`;
  if ((asset.availability?.state || "offline") === "offline") {
    return `${base} · offline`;
  }
  return `${base} · ${String(asset.availability.state).replace(/_/g, " ")}`;
}

function pickPreferredOwnerAsset(rows) {
  if (!rows?.length) return "";
  const withGps = rows.find(
    (a) =>
      Number.isFinite(Number(a.live_location?.lat)) &&
      Number.isFinite(Number(a.live_location?.lng))
  );
  if (withGps) return String(withGps._id);
  return String(rows[0]._id);
}


export default function LogisticsOperatorJob() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwnerShell = location.pathname.startsWith("/logistics/owner");
  const homeTo = isOwnerShell ? "/logistics/owner" : "/logistics/driver";
  const midLabel = isOwnerShell ? "Owner" : "Operator";
  const [job, setJob] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [activeAssetId, setActiveAssetId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const { config: logisticsConfig } = useLogisticsConfig();
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [ridePin, setRidePin] = useState("");
  const [completionAmount, setCompletionAmount] = useState("");
  const [completionCurrency, setCompletionCurrency] = useState("USD");
  const [rejectOtp, setRejectOtp] = useState("");
  // Owner: reassign an active job to another operator
  const [teamOperators, setTeamOperators] = useState([]);
  const [reassignTo, setReassignTo] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [quotePrefillDone, setQuotePrefillDone] = useState(false);
  const [resolveNotes, setResolveNotes] = useState({});
  const [resolvingReportId, setResolvingReportId] = useState(null);

  const myUserId = localStorage.getItem("userId") || "";
  const isOperator = Boolean(localStorage.getItem("owner_id")) && !isOwnerShell;

  const reload = async () => {
    const res = await dispatch(LogisticsActions.getJob(id));
    setJob(res?.payload?.data?.job || null);
    setQuotations(res?.payload?.data?.quotations || []);
    setQuotePrefillDone(false);
  };

  useEffect(() => {
    (async () => {
      await reload();

      let activeId = "";
      if (!isOwnerShell) {
        const dash = await dispatch(LogisticsActions.getOperatorDashboard());
        activeId = String(
          dash?.payload?.data?.active_asset?._id ||
            dash?.payload?.data?.availability?.active_asset_id ||
            ""
        );
        setActiveAssetId(activeId);
      }

      const assetsRes = await dispatch(LogisticsActions.listAssets());
      const rows = assetsRes?.payload?.data?.assets || [];
      const mine = rows.filter((a) => {
        if (!myUserId) return true;
        const ids = (a.assigned_sub_user_ids || []).map((x) =>
          String(x?._id || x)
        );
        const isOwnerOperator = !localStorage.getItem("owner_id");
        return isOwnerOperator || ids.includes(String(myUserId));
      });
      const pool = mine.length ? mine : rows;
      setAssets(pool);
      if (isOwnerShell) {
        const subs = await dispatch(LogisticsActions.listSubUsers());
        setTeamOperators(subs?.payload?.data?.drivers || []);
      }
      if (activeId) setAssetId(activeId);
      else if (isOwnerShell) setAssetId(pickPreferredOwnerAsset(pool));
      else if (pool[0]?._id) setAssetId(String(pool[0]._id));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") reload();
    };
    const onLogisticsNotif = (evt) => {
      const detail = evt?.detail || {};
      if (detail.job_id && String(detail.job_id) === String(id)) {
        reload();
      }
      if (detail.type === "logistics_hire_collect_requested") {
        reload();
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

  const fixedBudget = job?.budget?.negotiable === false;
  const fixedBudgetAmount =
    job?.budget?.amount != null ? Number(job.budget.amount) : null;

  useEffect(() => {
    if (job?.budget?.amount == null) return;
    if (fixedBudget) {
      setAmount(formatMoneyInputValue(job.budget.amount));
      if (job.budget.currency) setCurrency(job.budget.currency);
      return;
    }
    if (amount === "" && !quotePrefillDone) {
      setAmount(formatMoneyInputValue(job.budget.amount));
      if (job.budget.currency) setCurrency(job.budget.currency);
    }
  }, [job, amount, quotePrefillDone, fixedBudget]);

  const myQuote = useMemo(() => {
    if (!myUserId) return null;
    return (
      quotations.find((q) => String(q.driver?._id || q.driver_id) === String(myUserId)) ||
      null
    );
  }, [quotations, myUserId]);

  useEffect(() => {
    if (!myQuote || quotePrefillDone) return;
    if (myQuote.amount?.value != null && !fixedBudget) {
      setAmount(formatMoneyInputValue(myQuote.amount.value));
    }
    if (myQuote.amount?.currency && !fixedBudget) {
      setCurrency(myQuote.amount.currency);
    }
    if (myQuote.message != null) setMessage(String(myQuote.message));
    if (myQuote.asset?._id) setAssetId(String(myQuote.asset._id));
    setQuotePrefillDone(true);
  }, [myQuote, quotePrefillDone, fixedBudget]);

  const needKind = requiredAssetKind(job);
  const plantJobEarly = isEquipmentJob(job) || needKind === "equipment";
  const myQuoteStatus = myQuote?.status || null;
  const editingPending = myQuoteStatus === "pending";
  const canReQuoteAfterReject =
    myQuoteStatus === "declined" || myQuoteStatus === "withdrawn";
  const quoteAccepted = myQuoteStatus === "accepted";

  const equipmentLocation = useMemo(() => {
    if (!job || !plantJobEarly) return null;
    const assigned = job.assigned_asset;
    if (
      assigned?.live_location &&
      Number.isFinite(Number(assigned.live_location.lat)) &&
      Number.isFinite(Number(assigned.live_location.lng))
    ) {
      return {
        ...assigned.live_location,
        name: assigned.name || "Assigned equipment",
      };
    }
    const selectedId = assetId || activeAssetId;
    if (selectedId) {
      const fromFleet = (assets || []).find(
        (a) => String(a._id) === String(selectedId)
      );
      if (
        fromFleet?.live_location &&
        Number.isFinite(Number(fromFleet.live_location.lat)) &&
        Number.isFinite(Number(fromFleet.live_location.lng))
      ) {
        return {
          ...fromFleet.live_location,
          name: fromFleet.name || "Equipment",
        };
      }
    }
    const accepted = (quotations || []).find((q) => q.status === "accepted");
    if (
      accepted?.asset?.live_location &&
      Number.isFinite(Number(accepted.asset.live_location.lat)) &&
      Number.isFinite(Number(accepted.asset.live_location.lng))
    ) {
      return {
        ...accepted.asset.live_location,
        name: accepted.asset.name || "Equipment",
      };
    }
    const withGps = (assets || []).find(
      (a) =>
        a.kind === "equipment" &&
        Number.isFinite(Number(a.live_location?.lat)) &&
        Number.isFinite(Number(a.live_location?.lng))
    );
    if (withGps) {
      return {
        ...withGps.live_location,
        name: withGps.name || "Equipment",
      };
    }
    return null;
  }, [job, plantJobEarly, assetId, activeAssetId, assets, quotations]);

  const kindAssets = useMemo(() => {
    return (assets || []).filter((a) => {
      if (String(a.kind || "vehicle") !== needKind) return false;
      // Cab ride: same cab type and enough seats
      if (needKind === "cab") {
        const want = job?.ride?.cab_class;
        if (want && a.cab_class !== want) return false;
        if (Number(a.seats || 0) < Number(job?.ride?.passengers || 1)) return false;
      }
      return true;
    });
  }, [assets, needKind, job]);

  const assetsQuotedByOthers = useMemo(() => {
    return new Set(
      (quotations || [])
        .filter(
          (q) =>
            (q.status === "pending" || q.status === "accepted") &&
            String(q.driver?._id || "") !== String(myUserId) &&
            q.asset?._id
        )
        .map((q) => String(q.asset._id))
    );
  }, [quotations, myUserId]);

  // v2.7.34: live truck must carry the job's goods (server: TRUCK_TOO_SMALL)
  const truckTooSmall = useMemo(() => {
    if (isOwnerShell || needKind !== "vehicle" || !activeAssetId || !job) return null;
    const active = kindAssets.find((a) => String(a._id) === String(activeAssetId));
    return active ? truckTooSmallForJob(job, active, kindAssets) : null;
  }, [isOwnerShell, needKind, activeAssetId, job, kindAssets]);

  const quoteEligibleAssets = useMemo(() => {
    const free = kindAssets.filter((a) => {
      const aid = String(a._id);
      if (editingPending && String(myQuote?.asset?._id) === aid) return true;
      return !assetsQuotedByOthers.has(aid);
    });

    // Owner: free trucks only (no live operator, not on another job)
    if (isOwnerShell || !isOperator) {
      return free.filter((a) => !isTruckBusyForOwner(a));
    }
    if (!activeAssetId || truckTooSmall) return [];
    return free.filter(
      (a) =>
        String(a._id) === String(activeAssetId) &&
        // Now (local) jobs: not with a truck that is on another job
        !(job?.job_class === "local" && a.availability?.state === "on_job")
    );
  }, [
    kindAssets,
    assetsQuotedByOthers,
    editingPending,
    myQuote,
    isOwnerShell,
    isOperator,
    activeAssetId,
    job?.job_class,
    truckTooSmall,
  ]);

  useEffect(() => {
    if (!quoteEligibleAssets.length) {
      setAssetId("");
      return;
    }
    const stillOk = quoteEligibleAssets.some(
      (a) => String(a._id) === String(assetId)
    );
    if (!stillOk) {
      setAssetId(
        isOwnerShell
          ? pickPreferredOwnerAsset(quoteEligibleAssets)
          : String(quoteEligibleAssets[0]._id)
      );
    }
  }, [quoteEligibleAssets, assetId, isOwnerShell]);

  // Only the assigned operator runs a job (v2.7.30). The fleet owner sees
  // progress, can reassign or reject, but can't advance status / OTP / PIN —
  // except an older owner-driven job (driver_id = owner) already in flight.
  const { isRunner, isFleetOwnerView } = useMemo(() => {
    if (!job?.assigned) return { isRunner: false, isFleetOwnerView: false };
    const driverRaw = job.assigned.driver_id;
    const ownerRaw = job.assigned.owner_id;
    const driverId = String(
      (typeof driverRaw === "object" && driverRaw?._id) || driverRaw || ""
    );
    const ownerId = String(
      (typeof ownerRaw === "object" && ownerRaw?._id) || ownerRaw || ""
    );
    return {
      isRunner: Boolean(driverId && driverId === myUserId),
      isFleetOwnerView: Boolean(isOwnerShell && ownerId && ownerId === myUserId),
    };
  }, [job, myUserId, isOwnerShell]);
  const isAssignedToMe = isRunner || isFleetOwnerView;

  const status = Number(job?.status);
  const canTrack = isAssignedToMe && status >= 1 && status <= 5;
  const canRun = isRunner && status >= 1 && status <= 5;
  const otpPending =
    Boolean(job?.delivery_otp_pending) && status === 4;
  const rejectOtpPending = Boolean(job?.reject_otp_pending);
  const canRejectImmediate = canTrack && status === 1 && !rejectOtpPending;
  const canOwnerStartRejectOtp =
    isOwnerShell &&
    canTrack &&
    !rejectOtpPending &&
    (plantJobEarly ? status === 4 : status >= 2 && status <= 4);
  const showCustomerContact = canTrack;

  const customerPeer = useMemo(() => {
    const r = job?.requester_id;
    if (!r) return null;
    if (typeof r === "object") {
      return {
        _id: r._id,
        full_name: r.full_name || r.company_name || "Customer",
        no_longer_active: Boolean(r.no_longer_active),
        email: r.email,
        phone_number: r.phone_number,
        country_code: r.country_code,
        profile_image: r.profile_image,
      };
    }
    return { _id: r, full_name: "Customer" };
  }, [job]);

  const fleetSubscribed =
    Number(job?.fleet_is_subscribed) === 1 ||
    Number(localStorage.getItem("isSubscribed")) === 1;

  const customerTel =
    fleetSubscribed &&
    telHref(customerPeer?.phone_number, customerPeer?.country_code);

  const chatWithCustomer = () => {
    openLogisticsJobChat({
      peerId: customerPeer?._id,
      peerName: customerPeer?.full_name,
      peer: customerPeer,
      job,
      navigate,
      role: localStorage.getItem("role"),
      asSupply: true,
    });
  };

  const operatorCanQuote =
    !isOperator ||
    (Boolean(activeAssetId) &&
      quoteEligibleAssets.some(
        (a) => String(a._id) === String(activeAssetId)
      ));

  const ownerUnquotedCount = kindAssets.filter(
    (a) => !assetsQuotedByOthers.has(String(a._id))
  ).length;
  const ownerBlockedAllQuoted =
    isOwnerShell &&
    kindAssets.length > 0 &&
    ownerUnquotedCount === 0 &&
    !editingPending;
  const ownerAllTrucksBusy =
    isOwnerShell &&
    !ownerBlockedAllQuoted &&
    kindAssets.length > 0 &&
    quoteEligibleAssets.length === 0;

  // Owners don't quote — their operators do
  const canQuoteForm =
    status === 0 &&
    !quoteAccepted &&
    !isOwnerShell &&
    operatorCanQuote &&
    (!myQuoteStatus || editingPending || canReQuoteAfterReject);

  const quoteBlockedReason = useMemo(() => {
    if (status !== 0) return null;
    if (quoteAccepted) return "Your quote was accepted for this job.";
    if (isOwnerShell) {
      if (kindAssets.length) {
        return "Your operators quote and run jobs. Operators live on a matching unit can quote this one — you'll see their quotes under Quotes.";
      }
      if (!kindAssets.length) {
        return needKind === "vehicle"
          ? "No logistic trucks in your fleet for this job. Non-logistic equipment cannot quote here."
          : needKind === "cab"
            ? "No cab of this type (with enough seats) in your fleet for this ride."
            : "No matching equipment in your fleet for this plant job.";
      }
      if (ownerBlockedAllQuoted) {
        return "Your operator(s) already quoted every matching vehicle on this job. You cannot quote on their behalf — wait for the customer, or ask them to withdraw/reject so they can edit.";
      }
      if (ownerAllTrucksBusy) {
        return "No free truck right now — every truck has an operator live on it or is on another job. Live operators quote their own truck; you can quote only with a free truck (no live operator, not on a job).";
      }
      return null;
    }
    if (!activeAssetId) {
      return "Set your current vehicle on Dashboard / Availability before you can quote.";
    }
    if (truckTooSmall) return truckTooSmall.message;
    if (job?.job_class === "local") {
      const active = assets.find((a) => String(a._id) === String(activeAssetId));
      if (active?.availability?.state === "on_job") {
        return "Your truck is on another job — Now jobs need a free truck. Finish your current job first.";
      }
    }
    if (!quoteEligibleAssets.length) {
      if (assetsQuotedByOthers.has(String(activeAssetId))) {
        return "This vehicle already has a quote on this job from another operator.";
      }
      return needKind === "vehicle"
        ? "Your active vehicle is not a logistic truck — switch active vehicle to a truck that matches this job."
        : needKind === "cab"
          ? "Your active vehicle is not a cab of this type — switch to a matching cab."
          : "Your active vehicle does not match this equipment job category.";
    }
    return null;
  }, [
    status,
    quoteAccepted,
    isOwnerShell,
    kindAssets.length,
    needKind,
    ownerBlockedAllQuoted,
    ownerAllTrucksBusy,
    activeAssetId,
    assets,
    job?.job_class,
    quoteEligibleAssets.length,
    assetsQuotedByOthers,
    truckTooSmall,
  ]);

  const next = plantJobEarly
    ? NEXT_ACTION_EQUIPMENT[status]
    : isCabJob(job)
      ? NEXT_ACTION_RIDE[status]
      : NEXT_ACTION_TRANSPORT[status];

  const sendQuote = async (e) => {
    e.preventDefault();
    if (!assetId) {
      toast.error("Select equipment to quote with");
      return;
    }
    const value = fixedBudget && fixedBudgetAmount > 0
      ? fixedBudgetAmount
      : Number(amount);
    const moneyCheck = parseLogisticsMoney(value, { field: "Quote amount" });
    if (!moneyCheck.ok) {
      toast.error(moneyCheck.message);
      return;
    }
    const quoteValue = moneyCheck.value;
    if (
      fixedBudget &&
      fixedBudgetAmount > 0 &&
      Math.round(quoteValue * 100) !== Math.round(fixedBudgetAmount * 100)
    ) {
      toast.error("This job has a fixed price — quote the customer amount or leave");
      return;
    }
    const note = String(message || "").trim();
    if (!note) {
      toast.error("Add a message for the customer");
      return;
    }
    setSubmitting(true);
    try {
      const res = await dispatch(
        LogisticsActions.createQuote({
          jobId: id,
          asset_id: assetId,
          amount: quoteValue,
          currency: fixedBudget
            ? job?.budget?.currency === "ZWG"
              ? "ZWG"
              : "USD"
            : currency,
          message: note,
        })
      );
      if (res?.payload?.success === false || res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not send quote");
        return;
      }
      const ownerDriven = Boolean(res?.payload?.data?.quote?.owner_driven);
      toast.success(
        editingPending
          ? ownerDriven
            ? "Quote updated (owner-driven — full earnings to you if accepted)"
            : "Quote updated"
          : canReQuoteAfterReject
            ? "Quote sent again"
            : ownerDriven
              ? "Quote sent (owner-driven — full earnings to you if accepted)"
              : "Quote sent"
      );
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!job || !plantJobEarly) return;
    const pending = job.completion_amount?.value;
    const assigned = job.assigned?.amount?.value;
    const budget = job.budget?.amount;
    const seed =
      pending != null && Number(pending) > 0
        ? pending
        : assigned != null && Number(assigned) > 0
          ? assigned
          : budget != null && Number(budget) > 0
            ? budget
            : "";
    if (seed !== "" && completionAmount === "") {
      setCompletionAmount(formatMoneyInputValue(seed));
    }
    const cur =
      job.completion_amount?.currency ||
      job.assigned?.amount?.currency ||
      job.budget?.currency ||
      "USD";
    setCompletionCurrency(cur === "ZWG" ? "ZWG" : "USD");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?._id, job?.completion_amount?.value, job?.assigned?.amount?.value, plantJobEarly]);

  // Operators assigned to this job's unit (other than the current one)
  const reassignOptions = useMemo(() => {
    if (!isFleetOwnerView) return [];
    const assetRaw = job?.assigned?.asset_id;
    const jobAssetId = String((typeof assetRaw === "object" && assetRaw?._id) || assetRaw || "");
    const unit = assets.find((a) => String(a._id) === jobAssetId);
    const onUnit = new Set(
      (unit?.assigned_sub_user_ids || []).map((x) => String(x?._id || x))
    );
    const driverRaw = job?.assigned?.driver_id;
    const current = String((typeof driverRaw === "object" && driverRaw?._id) || driverRaw || "");
    return teamOperators.filter(
      (op) => onUnit.has(String(op._id)) && String(op._id) !== current
    );
  }, [isFleetOwnerView, job, assets, teamOperators]);

  const reassignJob = async () => {
    if (!reassignTo) return;
    setReassigning(true);
    try {
      const res = await dispatch(
        LogisticsActions.reassignJob({ id, sub_user_id: reassignTo })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Job reassigned — the operator and customer were notified");
        setReassignTo("");
        await reload();
      } else {
        toast.error(res?.payload?.message || "Could not reassign");
      }
    } finally {
      setReassigning(false);
    }
  };

  const advance = async () => {
    if (!next) return;
    // Cab ride end: send the driver's GPS for the drop-off geofence (server-flagged)
    const rideEnd = isCabJob(job) && next.status === 5;
    let dropGps = null;
    if (rideEnd && logisticsConfig.cab_drop_verification_enabled) {
      setAdvancing(true);
      dropGps = await readDeviceGps();
      setAdvancing(false);
    }
    let finalAmount = null;
    if (plantJobEarly && next.status === 5) {
      const moneyCheck = parseLogisticsMoney(completionAmount, {
        field: "Final hire amount",
      });
      if (!moneyCheck.ok) {
        toast.error(moneyCheck.message);
        return;
      }
      finalAmount = moneyCheck.value;
    }
    // Cab ride: starting the trip needs the rider's 4-digit PIN
    const rideStart = isCabJob(job) && next.status === 4;
    if (rideStart && !/^\d{4}$/.test(ridePin)) {
      toast.error("Enter the rider's 4-digit ride PIN");
      return;
    }
    setAdvancing(true);
    try {
      const payload = { jobId: id, status: next.status };
      if (plantJobEarly && next.status === 5) {
        payload.amount = finalAmount;
        payload.currency = completionCurrency;
      }
      if (rideStart) payload.otp = ridePin;
      if (dropGps) {
        payload.lat = dropGps.lat;
        payload.lng = dropGps.lng;
      }
      const res = await dispatch(LogisticsActions.updateJobStatus(payload));
      if (res?.payload?.success === false || res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not update status");
        if (rideStart) setRidePin("");
        return;
      }
      if (rideStart) {
        setRidePin("");
        toast.success("PIN verified — trip started");
        await reload();
        return;
      }
      if (isCabJob(job) && next.status === 5) {
        const dv = res?.payload?.data?.drop_verification;
        if (dv && dv.ok === false) {
          toast.warning(
            dv.reason === "no_location"
              ? "Ride completed — your location couldn't be verified, so the rider will be asked to confirm the drop-off."
              : `Ride completed ${dv.distance_km} km from the drop-off (allowed ${dv.radius_km} km). The rider will be asked to confirm.`,
            { autoClose: 8000 }
          );
        } else {
          toast.success("Ride completed");
        }
        await reload();
        return;
      }
      if (res?.payload?.data?.needs_otp || res?.payload?.data?.delivery_otp_pending) {
        toast.success(
          plantJobEarly
            ? "OTP sent with final amount — enter customer OTP to finish"
            : "OTP sent to customer — enter it below to finish"
        );
        setDeliveryOtp("");
      } else {
        toast.success(STATUS_LABEL[next.status] || "Status updated");
      }
      await reload();
    } finally {
      setAdvancing(false);
    }
  };

  const submitDeliveryOtp = async (e) => {
    e.preventDefault();
    const otp = String(deliveryOtp || "").trim();
    if (!/^\d{4}$/.test(otp)) {
      toast.error("Enter the 4-digit OTP from the customer");
      return;
    }
    setConfirmingOtp(true);
    try {
      const res = await dispatch(
        LogisticsActions.confirmDelivery({ jobId: id, otp })
      );
      if (res?.payload?.success === false || res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not confirm delivery");
        return;
      }
      toast.success(plantJobEarly ? "Hire complete" : "Delivery confirmed");
      setDeliveryOtp("");
      await reload();
    } finally {
      setConfirmingOtp(false);
    }
  };

  const rejectPromptText = plantJobEarly
    ? status === 4 && isOwnerShell
      ? "Rejecting while on site sends the customer an OTP to confirm."
      : "You can reject this hire only before Transit."
    : status >= 2 && isOwnerShell
      ? "Rejecting after Collect sends the customer an OTP to confirm."
      : "You can reject this job only before Collect.";

  const rejectAssignedJob = () => setRejectModalOpen(true);

  const submitRejectAssignedJob = async (reason) => {
    setRejecting(true);
    try {
      const res = await dispatch(
        LogisticsActions.rejectJob({
          jobId: id,
          reason: String(reason).trim(),
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not reject job");
        return;
      }
      setRejectModalOpen(false);
      if (res?.payload?.data?.needs_otp || res?.payload?.data?.reject_otp_pending) {
        toast.success(
          "OTP sent to customer — enter it below to confirm rejection"
        );
        setRejectOtp("");
      } else {
        toast.success("Job rejected");
      }
      await reload();
    } finally {
      setRejecting(false);
    }
  };

  const submitRejectOtp = async (e) => {
    e.preventDefault();
    const otp = String(rejectOtp || "").trim();
    if (!/^\d{4}$/.test(otp)) {
      toast.error("Enter the 4-digit OTP from the customer");
      return;
    }
    setConfirmingReject(true);
    try {
      const res = await dispatch(
        LogisticsActions.confirmReject({ jobId: id, otp })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not confirm rejection");
        return;
      }
      toast.success("Rejection confirmed");
      setRejectOtp("");
      await reload();
    } finally {
      setConfirmingReject(false);
    }
  };

  const markReportResolved = async (reportId) => {
    setResolvingReportId(reportId);
    try {
      const res = await dispatch(
        LogisticsActions.resolveJobReport({
          reportId,
          note: resolveNotes[reportId] || "",
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
      await reload();
    } finally {
      setResolvingReportId(null);
    }
  };

  if (!job) {
    return (
      <LogisticsPageShell
        title="Job"
        crumbLabel="Job"
        midCrumb={{ to: homeTo, label: midLabel }}
        homeTo={homeTo}
      >
        <LogisticsDetailSkeleton label="Loading job" />
      </LogisticsPageShell>
    );
  }

  const pickupShort = placeShortLabel(job.pickup?.address);
  const dropoffShort = placeShortLabel(job.dropoff?.address);
  const plantJob = isEquipmentJob(job) || needKind === "equipment";
  const site = jobSite(job);
  const loadSpec = parseJobLoadSpec(job);
  const categoryName = hubCategoryLabel(job);
  const directBook = isDirectBookJob(job);
  const cabJob = isCabJob(job);
  const trackSteps = plantJob
    ? TRACK_STEPS_EQUIPMENT
    : cabJob
      ? TRACK_STEPS_RIDE
      : TRACK_STEPS_TRANSPORT;
  const hireCollectRequested = Boolean(job.hire_collect_requested);
  const routeTitle = plantJob
    ? pickupShort || job.load_type || "Equipment hire"
    : `${pickupShort} → ${dropoffShort}`;
  const weight = formatWeight(job.load_weight);
  const budget = formatMoney(job.budget);
  const when = formatWhen(job.when_needed);
  const images = (job.images || []).map(jobImageUrl).filter(Boolean);
  const returnImages = (job.return_trip?.images || [])
    .map(jobImageUrl)
    .filter(Boolean);
  const ownerReports = isOwnerShell
    ? Array.isArray(job.reports)
      ? job.reports
      : []
    : [];
  const mapsUrl =
    job.pickup?.coordinates?.lat != null && job.pickup?.coordinates?.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${job.pickup.coordinates.lat},${job.pickup.coordinates.lng}`
      : job.pickup?.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.pickup.address)}`
        : null;
  // Header (v2 design, shared with the customer job page)
  const catKey = jobCategoryKey(job);
  const catLabel = cabJob ? "Cab ride" : plantJob ? `${categoryName} hire` : "Logistic";
  const statusText = (cabJob ? RIDE_STATUS_LABEL : STATUS_LABEL)[status] ?? status;
  const statusTone =
    status === 0 ? "pending" : status === 5 ? "done" : status >= 6 ? "closed" : "progress";
  const isNowJob = job.job_class === "local" && Boolean(job.expires_at);
  const distanceKm = job.route?.distance_km;
  const agreed =
    job.assigned?.amount?.value != null
      ? `${job.assigned.amount.currency || "USD"} ${job.assigned.amount.value}`
      : null;
  const factTiles = [
    when ? { k: "when", label: cabJob ? "Booked" : plantJob ? "Hire from" : "Needed", value: when, sub: job.flexible_dates ? "Flexible dates" : null } : null,
    agreed
      ? { k: "price", label: "Agreed price", value: agreed, sub: budget ? `Customer offered ${budget}` : null }
      : budget
        ? {
            k: "price",
            label: cabJob ? "Fare offered" : "Budget",
            value: budget,
            sub: [
              job.budget?.rate_unit === "hour" ? "per hour" : job.budget?.rate_unit === "day" ? "per day" : null,
              job.budget?.negotiable ? "Negotiable" : "Fixed",
            ].filter(Boolean).join(" · "),
          }
        : null,
    !plantJob && distanceKm != null ? { k: "distance", label: "Distance", value: `~${Math.round(distanceKm)} km`, sub: null } : null,
    cabJob
      ? { k: "pax", label: "Passengers", value: String(job.ride?.passengers || 1), sub: job.ride?.cab_class ? job.ride.cab_class.charAt(0).toUpperCase() + job.ride.cab_class.slice(1) : null }
      : plantJob
        ? { k: "equip", label: "Equipment", value: loadSpec.equipment || "—", sub: loadSpec.subtype || null }
        : { k: "weight", label: "Load", value: loadSpec.load_type || "Transport", sub: [weight, job.return_trip ? "Round trip" : null].filter(Boolean).join(" · ") || null },
    {
      k: "type",
      label: "Type",
      value: plantJob ? "Equipment hire" : isNowJob || cabJob ? "Now" : "Scheduled",
      sub: job.priority ? "Priority" : plantJob ? null : job.job_class === "local" ? "Local" : "Corridor",
    },
  ].filter(Boolean);

  const showNavigate =
    canRun &&
    Boolean(mapsUrl) &&
    status >= 1 &&
    (plantJob ? status === 1 : status <= 3);

  return (
    <LogisticsPageShell
      title={
        canQuoteForm
          ? editingPending
            ? "Edit quote"
            : "Send quote"
          : "My job"
      }
      crumbLabel="Job"
      midCrumb={{ to: homeTo, label: midLabel }}
      homeTo={homeTo}
    >
      <div className={`log-form-card log-job-detail log-op-job log-job-detail--v2 log-jd--${catKey}`}>
        <header className="log-jd-hero">
          <div className="log-jd-hero__band">
            <span className="log-jd-hero__cat">
              <span className="log-jd-hero__cat-icon" aria-hidden="true">
                <CategoryGlyph type={catKey} size={26} />
              </span>
              <span className="log-jd-hero__cat-text">
                <small>{catLabel}</small>
                <b>{job.load_type || routeTitle}</b>
              </span>
            </span>
            <span className="log-jd-hero__badges">
              <span className={`log-jd-status log-jd-status--${statusTone}`}>
                <i aria-hidden="true" />
                {statusText}
              </span>
              {job.job_number ? (
                <span className="log-jd-ref" title="Job reference">
                  Ref <b>{job.job_number}</b>
                </span>
              ) : null}
              <span
                className={`log-jd-ref log-jd-visibility${directBook ? " is-direct" : ""}`}
                title={
                  directBook
                    ? "Customer booked this unit directly — only your fleet was notified"
                    : "Open marketplace task — other fleets may also quote"
                }
              >
                {directBook ? "★ Sent only to you" : "Open task"}
              </span>
            </span>
          </div>

          <div className="log-jd-hero__body">
            <ol className="log-jd-route" aria-label="Route">
              <li className="log-jd-route__stop log-jd-route__stop--from">
                <em aria-hidden="true" />
                <span>
                  <small>{plantJob ? "Work site" : cabJob ? "Pickup" : "From"}</small>
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
                    <small>{cabJob ? "Drop-off" : "To"}</small>
                    <b>{dropoffShort || job.dropoff?.address || "—"}</b>
                    {job.dropoff?.address && job.dropoff.address !== dropoffShort ? (
                      <span className="log-jd-route__full">{job.dropoff.address}</span>
                    ) : null}
                  </span>
                </li>
              ) : null}
            </ol>
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

        {showCustomerContact && customerPeer?._id ? (
          <section className="log-jd-party" aria-label={cabJob ? "Your rider" : "Customer"}>
            <div className="log-jd-party__who">
              {customerPeer.profile_image ? (
                <img
                  className="log-jd-party__avatar"
                  src={jobImageUrl(customerPeer.profile_image) || defaultImage}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = defaultImage;
                  }}
                />
              ) : (
                <span className="log-jd-party__avatar log-jd-party__avatar--initials">
                  {(customerPeer.full_name || "C").slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="log-jd-party__meta">
                <small>{cabJob ? "Your rider" : "Customer"}</small>
                <b>{customerPeer.full_name}</b>
                <span className="log-jd-party__contact">
                  {fleetSubscribed && customerPeer.phone_number
                    ? [customerPeer.country_code, customerPeer.phone_number]
                        .filter(Boolean)
                        .join(" ")
                    : fleetSubscribed
                      ? "No phone on file"
                      : "Phone on a paid fleet plan"}
                  {customerPeer.email ? (
                    <>
                      {" · "}
                      <a href={`mailto:${customerPeer.email}`}>{customerPeer.email}</a>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
            {customerPeer.no_longer_active ? null : (
            <div className="log-jd-party__actions">
              <QuoteChatIconButton
                title={`Chat with ${customerPeer.full_name}`}
                onClick={chatWithCustomer}
              />
              {customerTel ? (
                <a
                  className="log-quote-call-btn"
                  href={customerTel}
                  title={`Call ${customerPeer.full_name}`}
                  aria-label={`Call ${customerPeer.full_name}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
                  </svg>
                </a>
              ) : null}
            </div>
            )}
          </section>
        ) : null}

        {canRun && status <= 4 ? (
          <LogisticsSosJobBar jobId={job._id} jobRef={job.job_number}>
            In danger or had an incident? Hold SOS to alert your fleet owner,
            Simba and your emergency contacts. The customer on this job is not
            told.
          </LogisticsSosJobBar>
        ) : null}

        {canTrack && (
          <div className="log-op-track-card">
            <div className="log-op-track-head">
              <b>{cabJob ? "Ride progress" : plantJob ? "Hire progress" : "Job progress"}</b>
              {job.assigned?.amount?.value != null ? (
                <span className="log-op-price">
                  {job.assigned.amount.currency || "USD"} {job.assigned.amount.value}
                </span>
              ) : null}
            </div>
            <ol className="log-op-track">
              {trackSteps.map((step) => {
                let cls = "";
                if (status > step.status || (status === 5 && step.status === 5)) {
                  cls = "done";
                } else if (status === step.status) {
                  cls = "now";
                }
                const atRaw = latestStatusAt(job.status_history, step.status);
                const at = formatStatusAt(atRaw);
                return (
                  <li key={step.status} className={cls} aria-current={cls === "now" ? "step" : undefined}>
                    <em />
                    <span>{step.label}</span>
                    {at && atRaw ? (
                      <time dateTime={new Date(atRaw).toISOString()}>
                        {cls === "now" ? `Started ${at}` : at}
                      </time>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {hireCollectRequested && status === 4 ? (
              <p className="log-op-collect-banner" role="status">
                Customer finished the hire — come and collect your equipment
                {job.hire_collect_requested_at
                  ? ` (requested ${formatStatusAt(job.hire_collect_requested_at)})`
                  : ""}
                .
              </p>
            ) : null}

            <div className="log-op-actions">
              {showNavigate ? (
                <a
                  className="logistics-cta logistics-cta--ghost"
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {plantJob ? "Navigate to site" : "Navigate to pickup"}
                </a>
              ) : null}
              {isFleetOwnerView && !isRunner && status >= 1 && status <= 4 ? (
                <p className="log-op-done-note">
                  Your operator updates this job&apos;s progress
                  {otpPending ? " and enters the customer's OTP" : ""}. You can
                  follow along here, reassign it or reject it.
                </p>
              ) : null}
              {otpPending && canRun ? (
                <form className="log-delivery-otp" onSubmit={submitDeliveryOtp}>
                  <p className="log-delivery-otp__lead">
                    Ask the customer for the{" "}
                    {plantJob ? "hire completion" : "delivery"} OTP shown on
                    their job page, then enter it here to mark the job done.
                    {plantJob && job.completion_amount?.value > 0 ? (
                      <>
                        {" "}
                        Final amount:{" "}
                        <strong>
                          {job.completion_amount.currency || "USD"}{" "}
                          {job.completion_amount.value}
                        </strong>
                        .
                      </>
                    ) : null}
                  </p>
                  <div className="log-delivery-otp__row">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      pattern="\d{4}"
                      placeholder="4-digit OTP"
                      value={deliveryOtp}
                      onChange={(e) =>
                        setDeliveryOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      aria-label={plantJob ? "Hire completion OTP" : "Delivery OTP"}
                    />
                    <button
                      type="submit"
                      className="logistics-cta logistics-cta--primary"
                      disabled={confirmingOtp || deliveryOtp.length !== 4}
                    >
                      {confirmingOtp
                        ? "Confirming…"
                        : plantJob
                          ? "Confirm hire complete"
                          : "Confirm delivery"}
                    </button>
                  </div>
                </form>
              ) : null}
              {rejectOtpPending && isOwnerShell ? (
                <form className="log-delivery-otp" onSubmit={submitRejectOtp}>
                  <p className="log-delivery-otp__lead">
                    Customer has a rejection OTP
                    {job.reject_reason ? ` (reason: ${job.reject_reason})` : ""}
                    . Enter it here to confirm the rejection.
                  </p>
                  <div className="log-delivery-otp__row">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      pattern="\d{4}"
                      placeholder="4-digit OTP"
                      value={rejectOtp}
                      onChange={(e) =>
                        setRejectOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      aria-label="Rejection OTP"
                    />
                    <button
                      type="submit"
                      className="logistics-cta logistics-cta--danger"
                      disabled={confirmingReject || rejectOtp.length !== 4}
                    >
                      {confirmingReject ? "Confirming…" : "Confirm rejection"}
                    </button>
                  </div>
                </form>
              ) : null}
              {canRun &&
              next &&
              status < 5 &&
              !otpPending &&
              !rejectOtpPending &&
              plantJob &&
              next.status === 5 ? (
                <div className="log-hire-complete-amount">
                  <p className="log-delivery-otp__lead">
                    Enter the final negotiated hire amount (by hour/day or
                    agreed total). The customer will see this with the OTP
                    before the job is marked Done.
                  </p>
                  <div className="log-hire-complete-amount__row">
                    <select
                      value={completionCurrency}
                      onChange={(e) => setCompletionCurrency(e.target.value)}
                      aria-label="Currency"
                    >
                      <option value="USD">USD</option>
                      <option value="ZWG">ZWG</option>
                    </select>
                    <LogisticsMoneyInput
                      value={completionAmount}
                      onChange={setCompletionAmount}
                      aria-label="Final hire amount"
                    />
                    <button
                      type="button"
                      className="logistics-cta logistics-cta--primary"
                      disabled={advancing || !(Number(completionAmount) > 0)}
                      onClick={advance}
                    >
                      {advancing ? "Sending…" : "Send completion OTP"}
                    </button>
                  </div>
                </div>
              ) : null}
              {canRun && next && cabJob && next.status === 4 && !rejectOtpPending ? (
                <form
                  className="log-delivery-otp log-ride-pin"
                  onSubmit={(e) => {
                    e.preventDefault();
                    advance();
                  }}
                >
                  <p className="log-delivery-otp__lead">
                    <b>Ride PIN</b> — ask the rider for the 4-digit PIN shown in
                    their app once they are in the cab. The trip starts only
                    with the right PIN.
                  </p>
                  <div className="log-delivery-otp__row">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      pattern="\d{4}"
                      placeholder="4-digit ride PIN"
                      value={ridePin}
                      onChange={(e) =>
                        setRidePin(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      aria-label="Ride PIN"
                    />
                    <button
                      type="submit"
                      className="logistics-cta logistics-cta--primary"
                      disabled={advancing || ridePin.length !== 4}
                    >
                      {advancing ? "Verifying…" : "Verify & start trip"}
                    </button>
                  </div>
                </form>
              ) : null}
              {canRun &&
              next &&
              status < 5 &&
              !otpPending &&
              !rejectOtpPending &&
              !(plantJob && next.status === 5) &&
              !(cabJob && next.status === 4) ? (
                <button
                  type="button"
                  className="logistics-cta logistics-cta--primary"
                  disabled={advancing}
                  onClick={advance}
                >
                  {advancing ? "Updating…" : next.label}
                </button>
              ) : null}
              {canRejectImmediate || canOwnerStartRejectOtp ? (
                <button
                  type="button"
                  className="logistics-cta logistics-cta--danger"
                  disabled={rejecting}
                  onClick={rejectAssignedJob}
                >
                  {rejecting
                    ? "Rejecting…"
                    : canOwnerStartRejectOtp
                      ? "Reject job (OTP)"
                      : "Reject job"}
                </button>
              ) : null}
              {status === 5 ? (
                <p className="log-op-done-note">
                  {plantJob
                    ? "Hire complete. Earnings appear under Earnings."
                    : cabJob
                      ? "Ride completed. Earnings appear under Earnings."
                      : "Delivered. Earnings appear under Earnings."}
                </p>
              ) : null}
              {status === 7 ? (
                <p className="log-op-done-note">
                  Rejected{job.reject_reason ? `: ${job.reject_reason}` : ""}.
                </p>
              ) : null}
              {status === 6 ? (
                <p className="log-op-done-note">Cancelled by customer.</p>
              ) : null}
            </div>
            {isFleetOwnerView && status >= 1 && status <= 4 && !rejectOtpPending ? (
              <div className="log-owner-assign" style={{ marginTop: 12 }}>
                <label className="log-field" style={{ margin: 0, flex: 1 }}>
                  <span className="log-fl">Reassign to operator</span>
                  <select
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                    disabled={reassigning || !reassignOptions.length}
                  >
                    <option value="">
                      {reassignOptions.length
                        ? "Select operator on this unit…"
                        : "No other operator on this unit — assign one in Fleet first"}
                    </option>
                    {reassignOptions.map((op) => (
                      <option key={op._id} value={op._id}>
                        {op.full_name || op.email}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="logistics-cta logistics-cta--primary"
                  disabled={reassigning || !reassignTo}
                  onClick={reassignJob}
                >
                  {reassigning ? "Reassigning…" : "Reassign"}
                </button>
              </div>
            ) : null}
            <p className="log-op-reassign-note">
              {plantJob
                ? status === 1
                  ? "Reject is only available before Transit. While on hire, only the fleet owner can reject (customer OTP required)."
                  : "There is no “give the job back” button — the owner reassigns it, or rejects with OTP while on hire."
                : status === 1
                  ? "Reject is only available before Collect. After Collect, only the fleet owner can reject (customer OTP required)."
                  : "There is no “give the job back” button — the owner reassigns it, or rejects with OTP after Collect."}
            </p>
          </div>
        )}

        <h2 className="log-sect log-jd-sect">{plantJob ? "Work site" : "Route"}</h2>
        {plantJob ? (
          <LogisticsEquipmentRoutePanel
            site={site}
            equipmentLocation={equipmentLocation}
            viewer="supply"
            height={360}
          />
        ) : (
          <LogisticsJobRoutePanel
            pickup={job.pickup}
            dropoff={job.dropoff}
            distanceKm={job.route?.distance_km}
          />
        )}

        {job.return_trip && !plantJob ? (
          <div className="log-return-panel">
            <p>
              <strong>Return trip</strong>
              {job.return_trip.goods ? ` — ${job.return_trip.goods}` : ""}
              {formatWeight(job.return_trip?.weight)
                ? ` · ${formatWeight(job.return_trip.weight)}`
                : ""}
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


        {isOwnerShell && ownerReports.length > 0 ? (
          <div className="log-job-report">
            <h2 className="log-sect">Customer reports</h2>
            <p className="log-op-lead">
              Issues the customer filed on this job. Fix the problem, then mark
              resolved (or the customer may resolve it).
            </p>
            {ownerReports.map((r) => (
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
                  {r.kind === "suspicious_dropoff" ? (
                    <span className="log-job-report__badge log-job-report__badge--dropoff">
                      Suspicious drop-off
                    </span>
                  ) : null}
                  <time dateTime={r.createdAt}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : ""}
                  </time>
                </div>
                <p className="log-job-report__msg">{r.message}</p>
                {r.kind === "suspicious_dropoff" ? (
                  <p className="log-job-report__resolve-note">
                    {r.customer_verdict === "no_issue"
                      ? "Customer confirmed no issue."
                      : r.customer_verdict === "issue"
                        ? `Customer reported a problem${r.customer_message ? `: “${r.customer_message}”` : ""}. Sent to admin.`
                        : r.escalated_at
                          ? "No answer from the customer — sent to admin."
                          : "Waiting for the customer to confirm."}
                  </p>
                ) : null}
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
                      value={resolveNotes[r._id] || ""}
                      onChange={(e) =>
                        setResolveNotes((prev) => ({
                          ...prev,
                          [r._id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="logistics-cta logistics-cta--primary"
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
            <p className="log-op-lead">
              <Link to="/logistics/owner/reports">All customer reports →</Link>
            </p>
          </div>
        ) : null}

        {canQuoteForm && (
          <form className="log-op-quote log-op-quote--compact" onSubmit={sendQuote}>
            <h2 className="log-sect">
              {editingPending
                ? "Edit your quote"
                : canReQuoteAfterReject
                  ? "Quote again"
                  : "My price"}
            </h2>
            <p className="log-op-lead">
              {editingPending
                ? fixedBudget
                  ? "Your quote is still pending. Amount is fixed by the customer — you can update the message only."
                  : "Your quote is still pending. Update the amount or message — you cannot submit a second quote."
                : canReQuoteAfterReject
                  ? fixedBudget
                    ? `The customer rejected your last quote. You can quote again only at the fixed amount${
                        budget ? ` (${budget})` : ""
                      }, or leave this job.`
                    : "The customer rejected your last quote. You can submit a new one."
                  : fixedBudget
                    ? `Customer set a fixed price${
                        budget ? ` (${budget})` : ""
                      }. Quote amount is locked — accept that amount or leave this job${
                        job.return_trip ? " (total for both legs)" : ""
                      }.`
                    : `Their budget is negotiable${
                        budget ? ` (around ${budget})` : ""
                      }. Quote what the trip is worth to you${
                        job.return_trip ? " for both legs" : ""
                      }.`}
              {" "}
              {needKind === "vehicle"
                ? "Logistic jobs accept trucks only."
                : needKind === "cab"
                  ? "Rides accept cabs of the requested type only."
                  : "This job accepts matching equipment only."}
            </p>

            {!quoteEligibleAssets.length ? (
              <p className="logistics-empty">
                {quoteBlockedReason || "No matching assets available to quote."}
              </p>
            ) : (
              <>
                <div className="log-op-quote-row">
                  <div className="log-op-quote-vehicle">
                    <span className="log-fl">
                      {needKind === "vehicle"
                        ? "Vehicle"
                        : needKind === "cab"
                          ? "Cab"
                          : "Equipment"}
                    </span>
                    {isOwnerShell && quoteEligibleAssets.length > 1 ? (
                      <select
                        className="log-op-quote-vehicle__select"
                        value={assetId}
                        onChange={(e) => setAssetId(e.target.value)}
                      >
                        {quoteEligibleAssets.map((a) => (
                          <option key={a._id} value={a._id}>
                            {ownerAssetSelectLabel(a)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        className="log-op-quote-vehicle__value"
                        title={assetOptionLabel(
                          quoteEligibleAssets.find(
                            (a) => String(a._id) === String(assetId)
                          ) || quoteEligibleAssets[0]
                        )}
                      >
                        {assetOptionLabel(
                          quoteEligibleAssets.find(
                            (a) => String(a._id) === String(assetId)
                          ) || quoteEligibleAssets[0]
                        )}
                      </div>
                    )}
                  </div>
                  <label className="log-field log-op-quote-amount">
                    <span className="log-fl">
                      Quote amount ({currency || "USD"})
                      {fixedBudget ? " · fixed" : ""}
                    </span>
                    <div className="log-op-quote-amount__inputs">
                      <LogisticsMoneyInput
                        value={amount}
                        onChange={setAmount}
                        aria-label="Quote amount"
                        required
                        disabled={fixedBudget}
                        readOnly={fixedBudget}
                        title={
                          fixedBudget
                            ? "Customer set a fixed price — amount cannot be changed"
                            : undefined
                        }
                      />
                    </div>
                  </label>
                </div>
                {isOwnerShell ? (
                  (() => {
                    const selected =
                      quoteEligibleAssets.find(
                        (a) => String(a._id) === String(assetId)
                      ) || quoteEligibleAssets[0];
                    if (!selected) return null;
                    if (selected.kind === "equipment") return null;
                    return (
                      <p className="log-hint" style={{ marginTop: 0 }}>
                        Only <strong>free trucks</strong> are listed (no operator
                        live on them, not on another job). You quote as the
                        driver — owner-driven, full job earnings go to you when
                        accepted and completed. Trucks with a live operator are
                        quoted by that operator.
                        {job?.job_class === "local"
                          ? " Now job: the truck's last known location must be within the local radius of pickup."
                          : ""}{" "}
                        <Link to="/logistics/owner/operators">Manage operators</Link>
                      </p>
                    );
                  })()
                ) : null}

                <label className="log-field">
                  <span className="log-fl">Message *</span>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. Can collect from 7am…"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="logistics-cta logistics-cta--primary"
                  disabled={submitting || !assetId || !String(message || "").trim()}
                >
                  {submitting
                    ? "Saving…"
                    : editingPending
                      ? "Update quote"
                      : canReQuoteAfterReject
                        ? "Send new quote"
                        : "Send my quote"}
                </button>
              </>
            )}
          </form>
        )}

        {quoteAccepted && status === 0 ? (
          <p className="log-hint">Your quote was accepted. Wait for job assignment updates.</p>
        ) : null}

        {quotations.length ? (
          <div className="log-job-quotes-board">
            <h2 className="log-sect">Quotes on this job</h2>
            <p className="log-hint">
              See other operators’ offers on the same job. Yours is marked.
              Chat is customer-only — operators cannot message each other from quotes.
            </p>
            <ul className="log-quote-list">
              {quotations.map((q) => {
                const mine =
                  String(q.driver?._id || "") === String(myUserId);
                const opPhoto = jobImageUrl(
                  q.driver?.profile_image || q.driver?.profile_photo
                );
                const capacity =
                  q.asset?.capacity?.value != null
                    ? `${q.asset.capacity.value} ${
                        q.asset.capacity.unit || "tons"
                      }`
                    : null;
                return (
                  <li
                    key={q._id}
                    className={`log-quote-card${mine ? " is-mine" : ""}`}
                  >
                    <div className="log-quote-card__main">
                      <div className="log-quote-card__people">
                        {opPhoto ? (
                          <img
                            className="log-quote-card__avatar"
                            src={opPhoto}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = defaultImage;
                            }}
                          />
                        ) : (
                          <span className="log-quote-card__avatar log-quote-card__avatar--initials">
                            {(q.driver?.full_name || "O")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                        <div>
                          <b>
                            {q.driver?.full_name || "Operator"}
                            {mine ? " (you)" : ""}
                          </b>
                          <p>
                            {q.asset?.name || "Vehicle"}
                            {q.asset?.make || q.asset?.model
                              ? ` · ${[q.asset.make, q.asset.model]
                                  .filter(Boolean)
                                  .join(" ")}`
                              : ""}
                            {capacity ? ` · ${capacity}` : ""}
                          </p>
                          {q.message ? (
                            <p className="log-quote-card__msg">{q.message}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="log-quote-card__side">
                      <strong className="log-quote-card__amount">
                        {q.amount?.value} {q.amount?.currency || "USD"}
                      </strong>
                      <span className={`log-chip log-chip--${q.status || "pending"}`}>
                        {q.status || "pending"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!canQuoteForm && !canTrack && status === 0 && quoteBlockedReason ? (
          <div className="log-form-card" style={{ marginTop: 12 }}>
            <p className="log-hint" style={{ margin: 0 }}>
              {quoteBlockedReason}
            </p>
            {!isOwnerShell ? (
              <Link
                className="logistics-cta logistics-cta--ghost"
                style={{ marginTop: 12, display: "inline-flex" }}
                to="/logistics/driver"
              >
                Open dashboard
              </Link>
            ) : null}
          </div>
        ) : null}

        {!canQuoteForm && !canTrack && status !== 0 && (
          <p className="logistics-empty">
            This job is not open for quotes and is not assigned to you.{" "}
            <Link to={isOwnerShell ? "/logistics/owner/opportunities" : "/logistics/driver/work"}>Back to available work</Link>
          </p>
        )}
      </div>
      <LogisticsReasonModal
        open={rejectModalOpen}
        title={plantJobEarly ? "Reject this hire?" : "Reject this job?"}
        message={rejectPromptText}
        required
        placeholder="e.g. Truck broke down, can't reach pickup in time…"
        confirmLabel={plantJobEarly ? "Reject hire" : "Reject job"}
        busy={rejecting}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={submitRejectAssignedJob}
      />
    </LogisticsPageShell>
  );
}
