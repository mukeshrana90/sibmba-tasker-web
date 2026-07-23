import axios from "axios";
import { toast } from "react-toastify";

const Api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

const isUnauthorizedPayload = (data) =>
  data?.status_code === 401 ||
  data?.status === 401 ||
  data?.message === "Token Expired";

const redirectToLoginOnAuthFailure = (message) => {
  const hadSession =
    localStorage.getItem("token") || localStorage.getItem("temptoken");
  localStorage.removeItem("token");
  localStorage.removeItem("temptoken");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("expiresAt");
  try {
    sessionStorage.removeItem("sp_has_service");
  } catch {
    /* ignore */
  }
  // Visitors browsing public pages should not be forced to login on 401.
  if (!hadSession) return;
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
    if (response?.data?.status === 501) {
      localStorage.clear();
      toast.error(response?.data?.message);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    }

    if (isUnauthorizedPayload(response?.data)) {
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
    if (error?.response?.data?.status === 501) {
      localStorage.clear();
      toast.error(error?.response?.data?.message);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
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
        return;
      }
      toast.error(error?.response?.data?.message);
    }
    return error.response;
  }
);

export default Api;
