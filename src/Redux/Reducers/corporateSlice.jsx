import { createSlice } from "@reduxjs/toolkit";
import CorporateActions from "../Actions/corporateActions";

const corporateSlice = createSlice({
  name: "corporate",
   initialState: {
    items: [],
    loading: false,
    leads:null,
    error: null,
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
  },
});

export default corporateSlice.reducer;
