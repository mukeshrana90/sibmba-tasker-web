import { createAsyncThunk } from "@reduxjs/toolkit";
import Api from "../../Services/api";

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
    async ({ page = 1, limit = 1000 } = {}) => {
      const response = await Api.get("service/corporate-category", {
        params: { page, limit },
      });
      return response.data;
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
        },
      });
      return response.data;
    }
  ),

  // get post task list service side
  createQuotation: createAsyncThunk(
    "customer/create_quatation",
    async (customerData) => {
      const response = await Api.post(
        `customer/create_quatation`,
        customerData
      );
      return response.data;
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
