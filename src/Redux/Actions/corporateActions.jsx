import { createAsyncThunk } from "@reduxjs/toolkit";
import Api from "../../Services/api";
import { constructQueryString } from "../../utils/CommonFunction";

const CorporateActions = {
  getCorporateLeads: createAsyncThunk(
    "/corporate/get-corporate-leads",
    async (payload) => {
      const queryString = constructQueryString(payload);
      const response = await Api.get(
        `/corporate/get-corporate-leads?${queryString}`
      );
      return response.data;
    }
  ),
  acceptRejectCorporateSuggestion: createAsyncThunk(
    "/corporate/accept-reject-corporate-suggestion",
    async (customerData) => {
      const response = await Api.post(
        "/corporate/accept-reject-corporate-suggestion",
        customerData
      );
      return response.data;
    }
  ),
    acceptRejectCorporateSuggestionFromUser: createAsyncThunk(
    "/customer/accept-reject-corporate-suggestion",
    async (customerData) => {
      const response = await Api.post(
        "/customer/accept-reject-corporate-suggestion",
        customerData
      );
      return response.data;
    }
  ),
  getCorporateDashboard: createAsyncThunk("/corporate/dashboard", async () => {
    const response = await Api.get(`/corporate/dashboard`);
    return response.data;
  }),

  getUpcomingCorporateLeads: createAsyncThunk("corporate/get-upcoming-corporate-leads", async () => {
  const response = await Api.get(`/corporate/get-upcoming-corporate-leads`);
  return response.data;
}),
    getNearbyCorporatPro: createAsyncThunk(
    "corporate/getNearbyCorporateWithCategory",
    async (data, { rejectWithValue }) => {
      try {
        const params = {};

        if (data?.lat) params.lat = data.lat;
        if (data?.lng) params.lng = data.lng;
        if (data?.page) params.page = data.page;
        if (data?.limit) params.limit = data.limit;
        if (data?.category_id) params.category_id = data.category_id;

        const response = await Api.get(
          "/corporate/getNearbyCorporateWithCategory",
          { params }
        );
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data || error.message);
      }
    }
  ),
};

export default CorporateActions;
