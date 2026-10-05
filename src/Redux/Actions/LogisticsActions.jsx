import { createAsyncThunk } from "@reduxjs/toolkit";
import Api from "../../Services/api";

const LogisticsActions = {
  getSession: createAsyncThunk("/logistics/session", async (_, { rejectWithValue }) => {
    try {
      const response = await Api.get("/logistics/session");
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  // Equipment owner plan (Free / Paid)
  getSubscription: createAsyncThunk("/logistics/subscription", async (_, { rejectWithValue }) => {
    try {
      const response = await Api.get("/logistics/subscription");
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  /** plan id, or { plan, keep_asset_ids } to pick which units stay active on a smaller plan */
  choosePlan: createAsyncThunk("/logistics/subscription/plan", async (arg, { rejectWithValue }) => {
    try {
      const body = typeof arg === "string" ? { plan: arg } : arg;
      const response = await Api.post("/logistics/subscription/plan", body);
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  /** Units per bucket + which stay active on `plan` (default: current plan) */
  getPlanUnits: createAsyncThunk("/logistics/subscription/units", async (plan, { rejectWithValue }) => {
    try {
      const response = await Api.get("/logistics/subscription/units", {
        params: plan ? { plan } : {},
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  /** Owner picks which units stay active on the current plan */
  setActivePlanUnits: createAsyncThunk(
    "/logistics/subscription/active-units",
    async (asset_ids, { rejectWithValue }) => {
      try {
        const response = await Api.post("/logistics/subscription/active-units", { asset_ids });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  setActiveModule: createAsyncThunk(
    "/logistics/session/active-module",
    async (activeModule, { rejectWithValue }) => {
      try {
        const response = await Api.patch("/logistics/session/active-module", {
          activeModule,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  register: createAsyncThunk("/logistics/auth/register", async (payload, { rejectWithValue }) => {
    try {
      const response = await Api.post("/logistics/auth/register", payload, {
        skipAuth: true,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  verifyOtp: createAsyncThunk("/logistics/auth/verifyOtp", async (payload, { rejectWithValue }) => {
    try {
      const response = await Api.post("/logistics/auth/verifyOtp", payload, {
        skipAuth: true,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  resendOtp: createAsyncThunk("/logistics/auth/resendOtp", async (payload, { rejectWithValue }) => {
    try {
      const response = await Api.post("/logistics/auth/resendOtp", payload, {
        skipAuth: true,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  login: createAsyncThunk("/logistics/auth/login", async (payload, { rejectWithValue }) => {
    try {
      const response = await Api.post("/logistics/auth/login", payload, {
        skipAuth: true,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  getCategories: createAsyncThunk("/logistics/categories", async (kind) => {
    const q = kind ? `?kind=${kind}` : "";
    const response = await Api.get(`/logistics/categories${q}`);
    return response.data;
  }),

  /** Plant Equipment type + Sub type tree (Agricultural|Construction|Industrial). */
  getEquipmentTaxonomy: createAsyncThunk(
    "/logistics/equipment-taxonomy",
    async (hubCategory, { rejectWithValue }) => {
      try {
        const path = hubCategory
          ? `/logistics/equipment-taxonomy/${hubCategory}`
          : "/logistics/equipment-taxonomy";
        const response = await Api.get(path, { skipAuth: true });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  searchAssets: createAsyncThunk("/logistics/assets/search", async (params = {}) => {
    const response = await Api.get("/logistics/assets/search", { params });
    return response.data;
  }),

  getHubSpotlight: createAsyncThunk("/logistics/hub/spotlight", async (params = {}) => {
    const response = await Api.get("/logistics/hub/spotlight", { params });
    return response.data;
  }),

  createJob: createAsyncThunk("/logistics/job", async (payload, { rejectWithValue }) => {
    try {
      const isForm = typeof FormData !== "undefined" && payload instanceof FormData;
      const response = await Api.post("/logistics/job", payload, isForm ? {} : undefined);
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  uploadJobImages: createAsyncThunk(
    "/logistics/job/images",
    async ({ jobId, files, returnFiles }, { rejectWithValue }) => {
      try {
        const fd = new FormData();
        (files || []).forEach((file) => fd.append("images", file));
        (returnFiles || []).forEach((file) => fd.append("return_images", file));
        const response = await Api.post(`/logistics/job/${jobId}/images`, fd);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  updateJob: createAsyncThunk(
    "/logistics/job/patch",
    async ({ jobId, payload }, { rejectWithValue }) => {
      try {
        const response = await Api.patch(`/logistics/job/${jobId}`, payload);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  deleteJob: createAsyncThunk(
    "/logistics/job/delete",
    async (jobId, { rejectWithValue }) => {
      try {
        const response = await Api.delete(`/logistics/job/${jobId}`);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  listMyJobs: createAsyncThunk("/logistics/jobs/mine", async (params = {}) => {
    const response = await Api.get("/logistics/jobs/mine", { params });
    return response.data;
  }),

  getJob: createAsyncThunk("/logistics/job/:id", async (id) => {
    const response = await Api.get(`/logistics/job/${id}`);
    return response.data;
  }),

  acceptQuote: createAsyncThunk(
    "/logistics/job/accept-quote",
    async ({ jobId, quotation_id }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/accept-quote`, {
          quotation_id,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  rejectQuote: createAsyncThunk(
    "/logistics/job/reject-quote",
    async ({ jobId, quotation_id }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/reject-quote`, {
          quotation_id,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  getDashboard: createAsyncThunk("/logistics/dashboard", async () => {
    const response = await Api.get("/logistics/dashboard");
    return response.data;
  }),

  getOperatorDashboard: createAsyncThunk("/logistics/operator-dashboard", async () => {
    const response = await Api.get("/logistics/operator-dashboard");
    return response.data;
  }),

  getMe: createAsyncThunk("/logistics/me", async () => {
    const response = await Api.get("/logistics/me");
    const user = response?.data?.data?.user;
    if (user) {
      const paid =
        Number(user.isSubscribed) === 1 || user.isSubscribed === true ? "1" : "0";
      localStorage.setItem("isSubscribed", paid);
      if (user.subscription_holder) {
        localStorage.setItem(
          "logisticsSubscriptionHolder",
          String(user.subscription_holder)
        );
      }
      if (user.owner_id) {
        localStorage.setItem("owner_id", String(user.owner_id));
      }
    }
    return response.data;
  }),

  patchMyAvailability: createAsyncThunk(
    "/logistics/me/availability",
    async (payload, { rejectWithValue }) => {
      try {
        // Backend errorRes uses HTTP 200 + success:false — must not treat as OK
        const response = await Api.patch(
          "/logistics/me/availability",
          payload,
          { skipErrorToast: true }
        );
        const data = response?.data;
        if (
          data?.success === false ||
          (Number(data?.status_code) >= 400 && data?.success !== true)
        ) {
          return rejectWithValue(
            data || { message: "Could not update availability" }
          );
        }
        return data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  listAssets: createAsyncThunk("/logistics/assets", async (params = {}) => {
    const response = await Api.get("/logistics/assets", { params });
    return response.data;
  }),

  createAsset: createAsyncThunk("/logistics/asset", async (payload, { rejectWithValue }) => {
    try {
      const response = await Api.post("/logistics/asset", payload);
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  getAsset: createAsyncThunk("/logistics/asset/get", async (id, { rejectWithValue }) => {
    try {
      const response = await Api.get(`/logistics/asset/${id}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  patchAsset: createAsyncThunk(
    "/logistics/asset/patch",
    async ({ id, payload }, { rejectWithValue }) => {
      try {
        const response = await Api.patch(`/logistics/asset/${id}`, payload);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  /** Paid owners: pin (featured:true) / unpin one logistic truck for Hub "Top logistics providers" */
  featureAsset: createAsyncThunk(
    "/logistics/asset/feature",
    async ({ id, featured = true }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/asset/${id}/feature`, {
          featured,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  /** Customer answers a suspicious cab drop-off: verdict "no_issue" | "issue" */
  respondDropCheck: createAsyncThunk(
    "/logistics/job/drop-check",
    async ({ jobId, verdict, message }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/drop-check`, {
          verdict,
          ...(message ? { message } : {}),
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  patchAssetAvailability: createAsyncThunk(
    "/logistics/asset/availability",
    async (
      { id, state, available_from, note, lat, lng, location_label, address },
      { rejectWithValue }
    ) => {
      try {
        const body = {};
        if (state !== undefined) body.state = state;
        if (available_from !== undefined) body.available_from = available_from;
        if (note !== undefined) body.note = note;
        if (lat !== undefined) body.lat = lat;
        if (lng !== undefined) body.lng = lng;
        if (location_label !== undefined) body.location_label = location_label;
        if (address !== undefined) body.address = address;
        const response = await Api.patch(
          `/logistics/asset/${id}/availability`,
          body
        );
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  checkAssetIdentity: createAsyncThunk(
    "/logistics/assets/check-identity",
    async (params = {}, { rejectWithValue }) => {
      try {
        const response = await Api.get("/logistics/assets/check-identity", {
          params,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  listSubUsers: createAsyncThunk("/logistics/sub-users", async (_, { rejectWithValue }) => {
    try {
      const response = await Api.get("/logistics/sub-users");
      return response.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err.message });
    }
  }),

  createSubUser: createAsyncThunk(
    "/logistics/sub-user",
    async (payload, { rejectWithValue }) => {
      try {
        const response = await Api.post("/logistics/sub-user", payload);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  patchSubUser: createAsyncThunk(
    "/logistics/sub-user/patch",
    async ({ id, formData }, { rejectWithValue }) => {
      try {
        const response = await Api.patch(`/logistics/sub-user/${id}`, formData);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  resendSubUserInvite: createAsyncThunk(
    "/logistics/sub-user/resend",
    async (id, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/sub-user/${id}/resend-invite`);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  deleteSubUser: createAsyncThunk(
    "/logistics/sub-user/delete",
    async (id, { rejectWithValue }) => {
      try {
        const response = await Api.delete(`/logistics/sub-user/${id}`);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  assignOperator: createAsyncThunk(
    "/logistics/asset/assign",
    async ({ id, sub_user_id }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/asset/${id}/assign`, {
          sub_user_id,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  unassignOperator: createAsyncThunk(
    "/logistics/asset/unassign",
    async ({ id, sub_user_id }, { rejectWithValue }) => {
      try {
        const response = await Api.delete(`/logistics/asset/${id}/assign`, {
          params: sub_user_id ? { sub_user_id } : undefined,
          data: sub_user_id ? { sub_user_id } : undefined,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  availableWork: createAsyncThunk("/logistics/available-work", async (params = {}) => {
    const response = await Api.get("/logistics/available-work", { params });
    return response.data;
  }),

  listAssignedJobs: createAsyncThunk("/logistics/jobs/assigned", async (params = {}) => {
    const response = await Api.get("/logistics/jobs/assigned", { params });
    return response.data;
  }),

  listMyQuotes: createAsyncThunk(
    "/logistics/quotes/mine",
    async (params = {}, { rejectWithValue }) => {
      try {
        const response = await Api.get("/logistics/quotes/mine", { params });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  createQuote: createAsyncThunk(
    "/logistics/job/quote",
    async ({ jobId, asset_id, amount, currency, message }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/quote`, {
          asset_id,
          amount,
          currency,
          message,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  updateJobStatus: createAsyncThunk(
    "/logistics/job/status",
    async ({ jobId, status, amount, currency, otp, lat, lng }, { rejectWithValue }) => {
      try {
        const body = { status };
        // Cab ride completion: driver GPS for the drop-off geofence (when enabled)
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          body.lat = lat;
          body.lng = lng;
        }
        // Cab ride: rider's start PIN for Arrived → Trip started
        if (otp) body.otp = String(otp);
        if (amount != null && amount !== "") body.amount = Number(amount);
        if (currency) body.currency = currency;
        const response = await Api.post(`/logistics/job/${jobId}/status`, body);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  requestCollection: createAsyncThunk(
    "/logistics/job/request-collection",
    async ({ jobId }, { rejectWithValue }) => {
      try {
        const response = await Api.post(
          `/logistics/job/${jobId}/request-collection`
        );
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  cancelJob: createAsyncThunk(
    "/logistics/job/cancel",
    async ({ jobId, reason }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/cancel`, {
          reason: reason || "",
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  rejectJob: createAsyncThunk(
    "/logistics/job/reject",
    async ({ jobId, reason }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/reject`, {
          reason,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  confirmReject: createAsyncThunk(
    "/logistics/job/confirm-reject",
    async ({ jobId, otp }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/confirm-reject`, {
          otp,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  confirmDelivery: createAsyncThunk(
    "/logistics/job/confirm-delivery",
    async ({ jobId, otp }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/confirm-delivery`, {
          otp,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  submitJobReview: createAsyncThunk(
    "/logistics/job/review",
    async ({ jobId, rating, message }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/review`, {
          rating,
          message,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  createJobReport: createAsyncThunk(
    "/logistics/job/report",
    async ({ jobId, message }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/job/${jobId}/report`, {
          message,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  listOwnerReports: createAsyncThunk(
    "/logistics/reports",
    async (params = {}, { rejectWithValue }) => {
      try {
        const response = await Api.get("/logistics/reports", { params });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  resolveJobReport: createAsyncThunk(
    "/logistics/reports/resolve",
    async ({ reportId, note }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/reports/${reportId}/resolve`, {
          note: note || "",
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  driverEarnings: createAsyncThunk("/logistics/driver-earnings", async (params = {}) => {
    const response = await Api.get("/logistics/driver-earnings", { params });
    return response.data;
  }),

  listMultiTransits: createAsyncThunk(
    "/logistics/multi-transits",
    async (params = {}, { rejectWithValue }) => {
      try {
        const response = await Api.get("/logistics/multi-transits", { params });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  listMultiTransitEligible: createAsyncThunk(
    "/logistics/multi-transits/eligible",
    async (_, { rejectWithValue }) => {
      try {
        const response = await Api.get("/logistics/multi-transits/eligible");
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  getMultiTransit: createAsyncThunk(
    "/logistics/multi-transits/get",
    async (id, { rejectWithValue }) => {
      try {
        const response = await Api.get(`/logistics/multi-transits/${id}`);
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  createMultiTransit: createAsyncThunk(
    "/logistics/multi-transits/create",
    async ({ job_ids }, { rejectWithValue }) => {
      try {
        const response = await Api.post("/logistics/multi-transits", { job_ids });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  addMultiTransitJob: createAsyncThunk(
    "/logistics/multi-transits/add-job",
    async ({ id, job_id }, { rejectWithValue }) => {
      try {
        const response = await Api.post(`/logistics/multi-transits/${id}/jobs`, {
          job_id,
        });
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  removeMultiTransitJob: createAsyncThunk(
    "/logistics/multi-transits/remove-job",
    async ({ id, jobId }, { rejectWithValue }) => {
      try {
        const response = await Api.delete(
          `/logistics/multi-transits/${id}/jobs/${jobId}`
        );
        return response.data;
      } catch (err) {
        return rejectWithValue(err?.response?.data || { message: err.message });
      }
    }
  ),

  analytics: createAsyncThunk("/logistics/analytics", async (params = {}) => {
    const response = await Api.get("/logistics/analytics", { params });
    return response.data;
  }),

  estimate: createAsyncThunk("/logistics/estimate", async (payload) => {
    const response = await Api.post("/logistics/estimate", payload);
    return response.data;
  }),

  verifyInvite: createAsyncThunk(
    "/logistics/invite/verify",
    async (token, { rejectWithValue }) => {
      try {
        const response = await Api.post(
          "/logistics/invite/verify",
          { token },
          { skipAuth: true, skipAuthRedirect: true, skipErrorToast: true }
        );
        if (!response?.data) {
          return rejectWithValue({
            success: false,
            message:
              "Could not reach API to verify invite (network / mixed content).",
          });
        }
        return response.data;
      } catch (err) {
        return rejectWithValue(
          err?.response?.data || {
            success: false,
            message: err?.message || "Could not verify invite",
          }
        );
      }
    }
  ),

  activateInvite: createAsyncThunk(
    "/logistics/invite/activate",
    async (payload, { rejectWithValue }) => {
      try {
        const response = await Api.post("/logistics/invite/activate", payload, {
          skipAuth: true,
          skipAuthRedirect: true,
          skipErrorToast: true,
        });
        if (!response?.data) {
          return rejectWithValue({
            success: false,
            message:
              "Could not reach API to activate invite (network / mixed content).",
          });
        }
        return response.data;
      } catch (err) {
        return rejectWithValue(
          err?.response?.data || {
            success: false,
            message: err?.message || "Activation failed",
          }
        );
      }
    }
  ),
};

export default LogisticsActions;
