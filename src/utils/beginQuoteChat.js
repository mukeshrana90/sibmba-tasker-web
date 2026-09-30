import { toast } from "react-toastify";
import {
  messagesPath,
  persistReceiverId,
  normalizeMongoId,
} from "./normalizeMongoId";
import {
  canStartQuoteChat,
  isLogisticsSupplyRole,
} from "./chatAccess";
import { getActiveModule } from "./Roles";
import { buildPublicAssetUrl } from "./ImagePath";

function shortPlace(address) {
  if (!address) return "";
  const part = String(address).split(",")[0];
  return part.trim() || String(address);
}

function jobImageForChat(path) {
  if (!path) return null;
  let normalized = String(path).replace(/\\/g, "/").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (normalized.startsWith("http") || normalized.startsWith("blob:")) {
    return normalized;
  }
  const absPublic = normalized.indexOf("/public/");
  if (absPublic !== -1) {
    normalized = normalized.slice(absPublic + "/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return buildPublicAssetUrl(normalized) || null;
}

/** Build the first chat card payload for a logistics job thread. */
export function buildLogisticsJobChatCard(job) {
  if (!job) return null;
  const pickup = shortPlace(job.pickup?.address) || "Pickup";
  const dropoff = shortPlace(job.dropoff?.address) || "Dropoff";
  const route = `${pickup} → ${dropoff}`;
  const weight =
    job.load_weight?.value != null
      ? `${job.load_weight.value} ${job.load_weight.unit || "tons"}`
      : null;
  const budget =
    job.assigned?.amount?.value != null
      ? `${job.assigned.amount.currency || "USD"} ${job.assigned.amount.value}`
      : job.budget?.amount != null
        ? `Budget ${job.budget.currency || "USD"} ${job.budget.amount}`
        : "—";
  const parts = [
    job.load_type || "Transport",
    weight,
    job.hub_category ||
      (job.job_type === "equipment_hire" ? "Equipment" : "Logistic"),
  ].filter(Boolean);
  const image =
    jobImageForChat(job.images?.[0]) ||
    "/Assets/Images/dark-logo.png";

  return {
    kind: "logistics_job",
    image,
    name: route,
    description: parts.join(" · "),
    price: budget,
    id: String(job._id || ""),
    when: job.when_needed || null,
    notes: job.special_notes || "",
  };
}

/**
 * Open Messages for a logistics job.
 * - Customer: may start anytime (quote or accepted).
 * - Supply: only after quote accepted (status >= 1); reply needs subscription in MainChat.
 * First message is the job card (preload); typed messages follow.
 */
export function openLogisticsJobChat({
  peerId,
  peerName,
  // Optional peer details (photo, email, company) so the chat list / header
  // show the right person before any message exists
  peer = null,
  job,
  navigate,
  role,
  activeModule,
  asSupply = false,
} = {}) {
  const id = normalizeMongoId(peerId);
  if (!id) {
    toast.error("No contact available");
    return false;
  }

  const me = normalizeMongoId(localStorage.getItem("userId"));
  if (me && id === me) {
    toast.info("You cannot chat with yourself");
    return false;
  }

  const mod = activeModule || getActiveModule() || "tasker";
  const r = role != null ? Number(role) : Number(localStorage.getItem("role"));
  const supply =
    asSupply || isLogisticsSupplyRole({ role: r, activeModule: mod });
  const status = Number(job?.status);

  if (supply) {
    if (!(status >= 1 && status <= 5)) {
      toast.info(
        "Customers start the conversation until a quote is accepted. After accept you can open chat here — your fleet owner's paid plan is required to reply."
      );
      return false;
    }
  } else if (status === 6) {
    // Customer cancelled (status 6) — no new chat from quotes / job
    toast.info("This job was cancelled — chat is closed from quotes");
    return false;
  } else if (!canStartQuoteChat({ role: r, activeModule: mod })) {
    toast.info("You cannot start this chat from here");
    return false;
  }

  // Unpaid supply may open the thread to read, but must not seed the job card
  // (MainChat re-checks with the fresh /logistics/me flag before sending).
  const supplyPaid =
    !supply ||
    (job?.fleet_is_subscribed != null
      ? Number(job.fleet_is_subscribed) === 1
      : Number(localStorage.getItem("isSubscribed")) === 1);

  const card = supplyPaid ? buildLogisticsJobChatCard(job) : null;
  if (!card) {
    localStorage.removeItem("preloadTaskMessage");
    localStorage.removeItem("preloadJobChatKey");
  }
  if (card) {
    try {
      localStorage.setItem("preloadTaskMessage", JSON.stringify(card));
      localStorage.setItem("preloadJobChatKey", `logistics:${card.id}:${id}`);
    } catch {
      /* ignore */
    }
  }

  persistReceiverId(id);
  if (peerName) {
    try {
      sessionStorage.setItem(
        "chatPeerHint",
        JSON.stringify({
          _id: id,
          full_name: peerName,
          name: peerName,
          ...(peer?.profile_image ? { profile_image: peer.profile_image } : {}),
          ...(peer?.email ? { email: peer.email } : {}),
          ...(peer?.company_name ? { company_name: peer.company_name } : {}),
        })
      );
    } catch {
      /* ignore */
    }
  }

  if (typeof navigate === "function") {
    navigate(messagesPath(id));
  }
  return true;
}

/** Customer quote-card helper (same as openLogisticsJobChat). */
export function beginQuoteChat(opts) {
  return openLogisticsJobChat({ ...opts, asSupply: false });
}

export function telHref(phone, countryCode) {
  if (!phone) return null;
  const raw = String(phone).replace(/[^\d+]/g, "");
  if (!raw) return null;
  if (raw.startsWith("+")) return `tel:${raw}`;
  const cc = String(countryCode || "").replace(/[^\d+]/g, "");
  if (cc) return `tel:${cc}${raw.replace(/^\+/, "")}`;
  return `tel:${raw}`;
}
