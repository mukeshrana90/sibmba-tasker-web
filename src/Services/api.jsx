import axios from "axios";
import { toast } from "react-toastify";

const Api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
});

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
    }
    else {
    toast.error(error?.response?.data?.message);
    }
    return error.response;
  }
);

export default Api;
