import axios from "axios";
import { toast } from "react-toastify";

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

Api.interceptors.request.use(
  (config) => {
    if (config.skipAuth) {
      if (config.headers) {
        delete config.headers.Authorization;
      }
      return config;
    }
    const token =
      localStorage.getItem("token") || localStorage.getItem("temptoken");
    if (token) {
      config.headers.Authorization = token;
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
      const msg =
        error?.response?.data?.message ||
        (error?.message === "Network Error"
          ? "Network error — check API URL / HTTPS mixed content"
          : error?.message);
      if (msg && !error?.config?.skipErrorToast) {
        toast.error(msg);
      }
    }
    // Never return undefined — callers do response.data
    return (
      error.response || {
        data: {
          success: false,
          status_code: 0,
          message:
            error?.message === "Network Error"
              ? "Network error — HTTPS pages cannot call HTTP APIs. Use the same host scheme as the API, or open the invite over HTTP."
              : error?.message || "Request failed",
        },
        status: 0,
        config: error.config,
      }
    );
  }
);

export default Api;
