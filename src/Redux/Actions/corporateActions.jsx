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
  getCorporateDashboard: createAsyncThunk("/corporate/dashboard", async () => {
    const response = await Api.get(`/corporate/dashboard`);
    return response.data;
  }),
};

export default CorporateActions;
