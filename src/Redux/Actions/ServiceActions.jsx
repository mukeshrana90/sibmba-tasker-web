import { createAsyncThunk } from "@reduxjs/toolkit";
import Api from "../../Services/api";
import { toast } from "react-toastify";

const ServiceActions = {
  // MARK: - CREATE PROFILE
  createProfile: createAsyncThunk(
    "service/createProfile",
    async (customerData) => {
      const response = await Api.post("service/createProfile", customerData);
      return response.data;
    }
  ),

  // MARK: - CREATE SERVICE
  createServices: createAsyncThunk(
    "service/createService",
    async (customerData) => {
      const response = await Api.post("service/createService", customerData);
      return response.data;
    }
  ),

  getCategoryList: createAsyncThunk(
    "service/GETCategoryListing",
    async (customerData) => {
      const response = await Api.get(
        "service/GETCategoryListing",
        customerData
      );
      return response.data;
    }
  ),

  getCorporateCategoryList: createAsyncThunk(
    "service/corporate-category",
    async ({ page = 1, limit = 10, search } = {}) => {
      const params = { page, limit };
      if (search) params.search = search;
      const response = await Api.get("service/corporate-category", {
        params,
      });
      return response.data;
    }
  ),

  // Every active corporate category for select boxes. The API is paged, so walk
  // all pages (pagination.pages) — new categories always show, whatever the count.
  getAllCorporateCategories: createAsyncThunk(
    "service/corporate-category/all",
    async () => {
      const limit = 100;
      const first = (
        await Api.get("service/corporate-category", { params: { page: 1, limit } })
      ).data;
      const pages = Math.min(Number(first?.pagination?.pages) || 1, 50);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          Api.get("service/corporate-category", {
            params: { page: i + 2, limit },
          }).then((r) => r.data?.data || [])
        )
      );
      const seen = new Set();
      const data = [...(first?.data || []), ...rest.flat()].filter((c) => {
        if (!c?._id || seen.has(c._id)) return false;
        seen.add(c._id);
        return true;
      });
      return { ...first, data, pagination: { ...first?.pagination, page: 1, pages: 1, limit: data.length } };
    }
  ),

  getIdentificationList: createAsyncThunk(
    "service/getIdentifyYourSelf",
    async (customerData) => {
      const response = await Api.get(
        "service/getIdentifyYourSelf",
        customerData
      );
      return response.data;
    }
  ),

  // get my services
  getMyServicesList: createAsyncThunk(
    "service/getMyServices",
    async (customerData) => {
      const response = await Api.get("service/getMyServices", customerData);
      return response.data;
    }
  ),

  // get my services by Id
  getMyServiceDetailById: createAsyncThunk(
    "service/getServiceById",
    async (customerData) => {
      const response = await Api.get("service/getServiceById", {
        params: {
          service_id: customerData.id,
        },
      });
      return response.data;
    }
  ),

  // delete services
  deleteMyServices: createAsyncThunk(
    "service/deleteServicefor_web",
    async (customerData) => {
      const response = await Api.post(
        `service/deleteServicefor_web`,
        customerData
      );
      return response.data;
    }
  ),

  // MARK: - update service
  updateServices: createAsyncThunk(
    "service/updateService",
    async (customerData) => {
      const response = await Api.post("service/updateService", customerData);
      return response.data;
    }
  ),

  // refernce update
  updateReference: createAsyncThunk(
    "service/updateReferenceDetail",
    async (customerData) => {
      const response = await Api.post(
        "service/updateReferenceDetail",
        customerData
      );
      return response.data;
    }
  ),

  // get request
  getRequestList: createAsyncThunk(
    "service/getBookings",
    async (customerData) => {
      const response = await Api.get("service/getBookings", customerData);
      return response.data;
    }
  ),

  // updateBookingStatus
  updateBookingStatus: createAsyncThunk(
    "customer/updateBookingStatus",
    async (customerData) => {
      const response = await Api.post(
        "customer/updateBookingStatus",
        customerData
      );
      return response.data;
    }
  ),

  getBookingReqDetailById: createAsyncThunk(
    "service/booking",
    async (customerData) => {
      const response = await Api.get(`customer/booking/${customerData.id}`);
      return response.data;
    }
  ),

  // reschedule
  rescheduleBooking: createAsyncThunk(
    "/customer/rescheduleBooking",
    async (reqBody) => {
      const response = await Api.post(`/customer/rescheduleBooking`, reqBody);
      return response.data;
    }
  ),

  // get post task list service side
  getPostTaskList: createAsyncThunk(
    "customer/unified_task_listing",
    async (data) => {
      // const response = await Api.get(`customer/task_listing_spside`);
      const response = await Api.get(`customer/unified_task_listing`, {
        params: {
          need_done: data.need_done,
          budget: data.budget,
          when_done: data.date,
          task_time: data.time,
          type: data.type,
          page: data.page,
          limit: data.limit,
        },
      });
      return response.data;
    }
  ),

  // get post task list service side
  // createQuotation: createAsyncThunk(
  //   "customer/create_quatation",
  //   async (customerData) => {
  //     const response = await Api.post(
  //       `customer/create_quatation`,
  //       customerData
  //     );
  //     return response.data;
  //   }
  // ),
  createQuotation: createAsyncThunk(
    "customer/create_quatation",
    async (customerData, { rejectWithValue }) => {
      try {
        const response = await Api.post(`customer/create_quatation`, customerData);
        if (response.data?.success === false) {
          toast.error(response.data?.message || "Failed to create quotation");
          return rejectWithValue(response.data);
        }
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data || { message: "Server error" }
        );
      }
    }
  ),

  // edit quotation.js
  editQuotation: createAsyncThunk("customer/edit_quatation", async (data) => {
    const response = await Api.post(`/customer/edit_quatation`, data);
    return response.data;
  }),

  getCustomerReviews: createAsyncThunk(
    "customer/feedback_listing_spside",
    async (data) => {
      const response = await Api.get(`/customer/feedback_listing_spside`);
      return response.data;
    }
  ),

  updateReviewStatus: createAsyncThunk(
    "customer/update_feedback_status",
    async (data) => {
      const response = await Api.post(`/customer/update_feedback_status`, data);
      return response.data;
    }
  ),

  getServiceSubCatById: createAsyncThunk(
    "service/getServiceSubCat",
    async (customerData) => {
      const response = await Api.get("service/getServiceSubCat", {
        params: {
          id: customerData.id,
        },
      });
      return response.data;
    }
  ),

  getMyWallets: createAsyncThunk("customer/Mywallet", async (data) => {
    const response = await Api.get(`/customer/Mywallet`);
    return response.data;
  }),

  getServiceProviderByCategory: createAsyncThunk(
    "customer/fetchServiceProvidersByCategory",
    async (data) => {
      const response = await Api.post(
        `/customer/fetchServiceProvidersByCategory`,
        data
      );
      return response.data;
    }
  ),

  getServiceCategoryDetailId: createAsyncThunk(
    "customer/getServicewith_reviews",
    async (customerData) => {
      const response = await Api.get(`customer/getServicewith_reviews`, {
        params: {
          service_id: customerData.id,
        },
      });
      return response.data;
    }
  ),

  // get post suggestion list
  getNearbyCorporateUser: createAsyncThunk(
    "service/getNearbyCorporate",
    async (data) => {
      const params = {
        lat: data.lat,
        lng: data.lng,
        category_id: data.category_id,
      };

      if (data.page !== undefined && data.limit !== undefined) {
        params.page = data.page;
        params.limit = data.limit;
      }

      const response = await Api.get("/service/getNearbyCorporate", { params });
      return response.data;
    }
  ),

  getNearbyCorporateUserList: createAsyncThunk(
    "service/getNearbyCorporateUser",
    async (data, { rejectWithValue }) => {
      try {
        const params = {
          lat: data.lat,
          lng: data.lng,
        };
        if (data.page) params.page = data.page;
        if (data.limit) params.limit = data.limit;
        const response = await Api.get("/service/getNearbyCorporate", {
          params,
        });
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data || error.message);
      }
    }
  ),

  getNearbyCorporateWithCategory: createAsyncThunk(
    "service/getNearbyCorporateWithCategory",
    async (data, { rejectWithValue }) => {
      try {
        const params = {};

        if (data?.lat) params.lat = data.lat;
        if (data?.lng) params.lng = data.lng;
        if (data?.page) params.page = data.page;
        if (data?.limit) params.limit = data.limit;
        if (data?.category_id) params.category_id = data.category_id;
        if (data?.search) params.search = data.search;

        const response = await Api.get(
          "/service/getNearbyCorporateWithCategory",
          { params }
        );
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data || error.message);
      }
    }
  ),
};

export default ServiceActions;