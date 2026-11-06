/**
 * v2.7.61 owner-operator rule: an owner can run any of their own units while no
 * operator is using it (live, or on an active job on that unit). Pure helpers —
 * every field is optional so the UI keeps working on an API without them.
 */

/** True for a signed-in fleet owner (role 4 with nobody above them). */
export function isFleetOwnerUser() {
  return String(localStorage.getItem("role")) === "4" && !localStorage.getItem("owner_id");
}

const LIVE_STATES = ["available_now", "returning_empty", "scheduled"];

/** Occupancy from the API; older responses fall back to assigned operators' live state. */
export function unitOccupancy(asset) {
  const occ = asset?.occupancy;
  if (occ && typeof occ === "object") {
    return {
      busy: Boolean(occ.busy),
      by: occ.by || null,
      reason: occ.reason || null,
      operator: occ.operator || null,
      job_id: occ.job_id || null,
    };
  }
  const live = (asset?.assigned_operators || []).find((op) => {
    const av = op?.logistics_availability || {};
    return String(av.active_asset_id || "") === String(asset?._id) && LIVE_STATES.includes(av.state);
  });
  if (live) {
    return {
      busy: true,
      by: "operator",
      reason: "live",
      operator: { id: live._id, name: live.full_name },
      job_id: null,
    };
  }
  return { busy: false, by: null, reason: null, operator: null, job_id: null };
}

/** Is someone other than `myId` holding this unit? */
export function unitHeldByOther(asset, myId) {
  const occ = unitOccupancy(asset);
  if (!occ.busy) return false;
  if (occ.by === "owner") return !isFleetOwnerUser();
  return String(occ.operator?.id || "") !== String(myId || "");
}

/** "In use by Tariro" / "In use by Tariro — on a job". */
export function occupancyLabel(asset) {
  const occ = unitOccupancy(asset);
  if (!occ.busy) return "";
  const who = occ.by === "owner" ? "the owner" : occ.operator?.name || "an operator";
  return `In use by ${who}${occ.reason === "on_job" ? " — on a job" : ""}`;
}

/** Error code from a logistics response ({ code } or { data: { code } }). */
export function apiErrorCode(payload) {
  return payload?.code || payload?.data?.code || payload?.error_code || null;
}

/** Clear wording for each v2.7.61 error code; other responses keep the server's message. */
export function apiErrorMessage(payload, fallback = "Something went wrong — try again") {
  const code = apiErrorCode(payload);
  const d = payload?.data || payload || {};
  switch (code) {
    case "UNIT_IN_USE_BY_OPERATOR":
      return `${d.operator?.name || "An operator"} is ${
        d.reason === "on_job" ? "on a job on" : "live on"
      } this unit. You can use it once they go offline${
        d.reason === "on_job" ? " and the job is finished or reassigned" : " or you unassign them"
      }.`;
    case "UNIT_IN_USE_BY_OWNER":
      return "Your fleet owner is using this unit right now. Pick another unit, or try again when they have stopped.";
    case "OWNER_NOT_ELIGIBLE": {
      const blocks = (d.blocks || []).map((b) => b?.message).filter(Boolean);
      return blocks.length
        ? `You can't operate units yet: ${blocks.join(" ")}`
        : "You can't operate units yet: your licence, face photo and owner ID must be verified by Simba.";
    }
    case "COMPANY_NOT_APPROVED":
      return "Your company must be approved by Simba before you can operate a unit.";
    case "ACTIVE_JOB":
      return "You have an active job on this unit. Finish or reassign it before you stop using the unit.";
    case "OPERATOR_ON_ACTIVE_JOB":
      return "This operator is on an active job. Wait until it finishes, or reassign the job first.";
    case "REASON_REQUIRED":
      return "Pick a reason, and add a note if you chose Other.";
    case "WA_CHAT_NOT_ALLOWED":
      return "You can't start a WhatsApp chat for this job or unit.";
    case "WA_CHAT_NO_PHONE":
      return "This person has no WhatsApp number on file. Use the in-app chat or call instead.";
    case "WA_CHAT_PLAN_REQUIRED":
      return "WhatsApp chat is available during the 60-day free period or on the Paid plan.";
    default:
      return payload?.message || fallback;
  }
}

/** True when a thunk result is a refusal (the API answers HTTP 200 with success:false). */
export function isApiFailure(res) {
  return res?.meta?.requestStatus === "rejected" || res?.payload?.success === false;
}

/** Item 40: one sentence wherever the old "paid only" text was. */
export const WHATSAPP_PACK_TEXT = "Essentials free, full pack free for 60 days from company approval";

/** "Paid benefits free: 12 days left" (item 37, v2.7.64); "" when the API doesn't report it. */
export function whatsappExtrasLabel(wa) {
  if (!wa) return "";
  if (wa.source === "paid") return "WhatsApp extras: included in your plan";
  if (wa.source === "trial" && wa.extras_active) {
    const n = Number(wa.trial_days_left);
    if (Number.isFinite(n)) return `Paid benefits free: ${n} day${n === 1 ? "" : "s"} left`;
    return "Paid benefits free: free period active";
  }
  if (wa.trial_status === "not_started") return "Paid benefits free for 60 days once Simba approves your company";
  return "WhatsApp extras: free period ended. Essentials stay free.";
}
