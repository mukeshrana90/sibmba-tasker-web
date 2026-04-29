import axios from "axios";
import { toast } from "react-toastify";

const Api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

const redirectToLoginOnAuthFailure = (message) => {
  const hadSession =
    localStorage.getItem("token") || localStorage.getItem("temptoken");
  localStorage.removeItem("token");
  localStorage.removeItem("temptoken");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("expiresAt");
  if (message && hadSession) {
    toast.error(message);
  }
  window.location.href = "/login";
};

Api.interceptors.request.use(
  (config) => {
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
    if (response?.data?.status == 501) {
      localStorage.clear();
      toast.error(response?.data?.message);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    }

    if (
      response?.data?.status_code === 401 ||
      response?.data?.status === 401 ||
      response?.data?.message === "Token Expired"
    ) {
      redirectToLoginOnAuthFailure(
        response?.data?.message || "Session expired. Please login again."
      );
    }

    return response;
  },
  (error) => {
    console.log(error, "error");
    if (error?.response?.data?.status == 501) {
      localStorage.clear();
      toast.error(error?.response?.data?.message);
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } else if (
      error?.response?.status === 401 ||
      error?.response?.data?.status_code === 401 ||
      error?.response?.data?.status === 401 ||
      error?.response?.data?.message === "Token Expired"
    ) {
      redirectToLoginOnAuthFailure(
        error?.response?.data?.message || "Session expired. Please login again."
      );
    } else {
      if (error?.response?.data?.message == "No Quatations found for this user.") {
        return;
      }
      toast.error(error?.response?.data?.message);
    }
    return error.response;
  }
);

export default Api;
