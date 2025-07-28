import { createSlice } from "@reduxjs/toolkit";
import CorporateActions from "../Actions/corporateActions";

const corporateSlice = createSlice({
  name: "corporate",
   initialState: {
    items: [],
    loading: false,
    leads:null,
    error: null,
    corporateDashboard:null,
    upcomingtask:null
  },
  reducers: {},
  extraReducers: (builder) => {
    // start lead
   builder.addCase(CorporateActions.getCorporateLeads.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(CorporateActions.getCorporateLeads.fulfilled, (state, action) => {
      state.loading = false;
      state.leads = action.payload.data; 
    });
    builder.addCase(CorporateActions.getCorporateLeads.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error;
    });
   // end lead

      builder.addCase(CorporateActions.getCorporateDashboard.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(CorporateActions.getCorporateDashboard.fulfilled, (state, action) => {
      state.loading = false;
      state.corporateDashboard = action.payload.data; 
    });
    builder.addCase(CorporateActions.getCorporateDashboard.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error;
    });

    builder.addCase(CorporateActions.getUpcomingCorporateLeads.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(CorporateActions.getUpcomingCorporateLeads.fulfilled, (state, action) => {
      state.loading = false;
      state.upcomingtask = action.payload.data; 
    });
    builder.addCase(CorporateActions.getUpcomingCorporateLeads.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error;
    });

  },
});

export default corporateSlice.reducer;
