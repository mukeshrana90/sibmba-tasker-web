import { getFirebaseTokenWithMeta } from "./fireBaseConfig";

const FALLBACK_KEY = "web_device_token_fallback";

export function normalizeWebDeviceToken(value) {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s || s === "null" || s === "undefined") return "";
  return s;
}

function createFallbackWebToken() {
  const id =
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return `web-${id}`;
}

/** Stable non-FCM token so login always has a device_token on web. */
export function ensureWebFallbackDeviceToken() {
  let existing = normalizeWebDeviceToken(localStorage.getItem(FALLBACK_KEY));
  if (!existing) {
    existing = createFallbackWebToken();
    localStorage.setItem(FALLBACK_KEY, existing);
  }
  return existing;
}

/** Resolve FCM only. Does not invent fake tokens for the API. */
export async function resolveWebDeviceTokenDetailed(fcmTokenState) {
  const tryFresh = async () => {
    try {
      return await getFirebaseTokenWithMeta();
    } catch (error) {
      return { token: "", reason: error?.message || "resolve_threw" };
    }
  };

  let meta = await tryFresh();
  if (!normalizeWebDeviceToken(meta.token)) {
    await new Promise((r) => setTimeout(r, 350));
    meta = await tryFresh();
  }

  let token = normalizeWebDeviceToken(meta.token);
  let reason = meta.reason || "";

  if (!token) {
    const stored = normalizeWebDeviceToken(localStorage.getItem("device_token"));
    if (stored && !stored.startsWith("web-")) {
      token = stored;
    }
  }

  if (!token) {
    const fromState = normalizeWebDeviceToken(fcmTokenState);
    if (fromState && !fromState.startsWith("web-")) {
      token = fromState;
    }
  }

  if (token && !token.startsWith("web-")) {
    localStorage.setItem("device_token", token);
    return { token, isFcm: true, reason: "" };
  }

  return {
    token: "",
    isFcm: false,
    reason: reason || "fcm_unavailable",
  };
}

/** @returns {Promise<string>} FCM token or empty string */
export async function resolveWebDeviceToken(fcmTokenState) {
  const { token, isFcm } = await resolveWebDeviceTokenDetailed(fcmTokenState);
  return isFcm ? token : "";
}
