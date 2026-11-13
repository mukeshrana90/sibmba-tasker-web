import axios from "axios";
import { toast } from "react-toastify";
import { prepareFormData } from "../utils/shrinkImage";

const Api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

const isUnauthorizedPayload = (data) =>
  data?.status_code === 401 ||
  data?.status === 401 ||
  data?.message === "Token Expired";

// Backend errorRes replies HTTP 200 with { status_code: 501 } when the account
// was deleted by an admin (userMiddleware / optionalUserMiddleware).
const isAccountGonePayload = (data) =>
  data?.status_code === 501 || data?.status === 501;

const ACCOUNT_GONE_MESSAGE =
  "Your account is no longer active. Please contact support if you think this is a mistake.";

// Several requests can fail together — toast + redirect only once.
let redirecting = false;

const redirectToLoginOnAuthFailure = (message) => {
  if (redirecting) return;
  const hadSession =
    localStorage.getItem("token") || localStorage.getItem("temptoken");
  localStorage.removeItem("token");
  localStorage.removeItem("temptoken");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("expiresAt");
  localStorage.removeItem("owner_id");
  localStorage.removeItem("activeModule");
  try {
    sessionStorage.removeItem("sp_has_service");
  } catch {
    /* ignore */
  }
  // Visitors browsing public pages should not be forced to login on 401.
  if (!hadSession) return;
  redirecting = true;
  if (message) {
    toast.error(message);
  }
  window.location.href = "/login";
};

/** Friendly text when the request got no readable reply from the server. */
const networkFailureMessage = (error) => {
  if (error?.code === "FILE_UNREADABLE") return error.message;
  const upload = error?.config?.data instanceof FormData;
  if (error?.code === "ECONNABORTED" || /timeout/i.test(error?.message || "")) {
    return upload
      ? "The upload took too long. Try again with fewer or smaller photos."
      : "The server took too long to answer. Please try again.";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "You're offline. Check your connection and try again.";
  }
  return upload
    ? "Couldn't send your files. Check your connection and try again — if it keeps failing, try fewer or smaller photos."
    : "Couldn't reach Simba Tasker. Check your connection and try again.";
};

Api.interceptors.request.use(
  async (config) => {
    // Smaller photos + files read up front (see utils/shrinkImage.js)
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.data = await prepareFormData(config.data);
    }
    if (config.skipAuth) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }
    const token =
      localStorage.getItem("token") || localStorage.getItem("temptoken");
    // Guests send no Authorization at all — the backend's optional auth treats
    // any non-empty header as a token and rejects it (public logistics pages).
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = token;
    } else if (config.headers) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

Api.interceptors.response.use(
  (response) => {
    if (isAccountGonePayload(response?.data)) {
      if (!response?.config?.skipAuthRedirect) {
        redirectToLoginOnAuthFailure(ACCOUNT_GONE_MESSAGE);
      }
    } else if (isUnauthorizedPayload(response?.data)) {
      if (!response?.config?.skipAuthRedirect) {
        redirectToLoginOnAuthFailure(
          response?.data?.message || "Session expired. Please login again."
        );
      }
    }

    return response;
  },
  (error) => {
    console.log(error, "error");
    if (isAccountGonePayload(error?.response?.data)) {
      if (!error?.config?.skipAuthRedirect) {
        redirectToLoginOnAuthFailure(ACCOUNT_GONE_MESSAGE);
      }
    } else if (
      error?.response?.status === 401 ||
      isUnauthorizedPayload(error?.response?.data)
    ) {
      if (!error?.config?.skipAuthRedirect) {
        redirectToLoginOnAuthFailure(
          error?.response?.data?.message ||
            "Session expired. Please login again."
        );
      }
    } else {
      if (error?.response?.data?.message === "No Quatations found for this user.") {
        return error.response;
      }
      // No reply at all (timeout, dropped connection, or a server error page
      // without CORS headers): one friendly toast; payload code NETWORK_ERROR
      // tells pages not to toast the same failure again.
      if (!error?.response) {
        if (!error?.config?.skipErrorToast) {
          toast.error(networkFailureMessage(error), { toastId: "network-error" });
        }
      } else {
        const msg = error?.response?.data?.message || error?.message;
        if (msg && !error?.config?.skipErrorToast) {
          toast.error(msg);
        }
      }
    }
    // Never return undefined — callers do response.data
    return (
      error.response || {
        data: {
          success: false,
          status_code: 0,
          code: "NETWORK_ERROR",
          message: networkFailureMessage(error),
        },
        status: 0,
        config: error.config,
      }
    );
  }
);

export default Api;
