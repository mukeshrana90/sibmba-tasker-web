import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import ServiceActions from "../Actions/ServiceActions";
import CustomerActions from "../Actions/CustomerActions";

const serviceSlice = createSlice({
  name: "service",
  initialState: {
    category: null,
    identificationList: null,
    myservices: null,
    myProducts: null,
    serviceDetail: null,
    getServiceRequestList: null,
    getBookingRequestList: null,
    getPostTaskService: null,
    getReviewList: null,
    serviceSubCatList: null,
    walletDetail: null,
    getServiceProviderCategory: null,
    categoryData: null,
    loading: false,
    error: null,
    corporateSuggestions:null,
    getLeads:null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(ServiceActions.getCategoryList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getCategoryList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.category = action.payload;
      }
    );
    builder.addCase(
      ServiceActions.getCategoryList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////


    builder.addCase(ServiceActions.getIdentificationList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getIdentificationList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.identificationList = action.payload;
      }
    );
    builder.addCase(
      ServiceActions.getIdentificationList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    //////////////////////////////////

    builder.addCase(ServiceActions.getMyServicesList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getMyServicesList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.myservices = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getMyServicesList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );
    // Products

    builder.addCase(CustomerActions.getMyProductList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      CustomerActions.getMyProductList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.myProducts = action.payload.data;
      }
    );
    builder.addCase(
      CustomerActions.getMyProductList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    //////////////////////////////////

    builder.addCase(ServiceActions.getMyServiceDetailById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getMyServiceDetailById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.serviceDetail = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getMyServiceDetailById.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ///////////////////////////////////// 

    builder.addCase(ServiceActions.getRequestList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getRequestList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.getServiceRequestList = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getRequestList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    //////////////////////////////////////
    builder.addCase(ServiceActions.getBookingReqDetailById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getBookingReqDetailById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.getBookingRequestList = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getBookingReqDetailById.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );
    ////////////////////////////////////////////////////

    builder.addCase(ServiceActions.getPostTaskList.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getPostTaskList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.getPostTaskService = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getPostTaskList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    //////////////////////////////////////////////////////////


    builder.addCase(ServiceActions.getCustomerReviews.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getCustomerReviews.fulfilled,
      (state, action) => {
        state.loading = false;
        state.getReviewList = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getCustomerReviews.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////////////////////////////////   

    builder.addCase(ServiceActions.getServiceSubCatById.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getServiceSubCatById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.serviceSubCatList = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getServiceSubCatById.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    /////////////////////////////////////////////////////////////

    builder.addCase(ServiceActions.getMyWallets.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getMyWallets.fulfilled, (state, action) => {
        state.loading = false;
        state.walletDetail = action.payload;
      }
    );
    builder.addCase(
      ServiceActions.getMyWallets.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    /////////////////////////////////////////////////////////////
    builder.addCase(ServiceActions.getServiceProviderByCategory.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getServiceProviderByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.getServiceProviderCategory = action.payload.data;
      }
    );
    builder.addCase(
      ServiceActions.getServiceProviderByCategory.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


        /////////////////////////////////////////////////////////////
    builder.addCase(ServiceActions.getServiceCategoryDetailId.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      ServiceActions.getServiceCategoryDetailId.fulfilled, (state, action) => {
        state.loading = false;
        state.categoryData = action.payload;
      }
    );
    builder.addCase(
      ServiceActions.getServiceCategoryDetailId.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );
    // start suggestion
    builder.addCase(ServiceActions.getNearbyCorporateUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(ServiceActions.getNearbyCorporateUser.fulfilled, (state, action) => {
      state.loading = false;
      state.corporateSuggestions = action.payload.data; 
    });
    builder.addCase(ServiceActions.getNearbyCorporateUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error;
    });
    // end suggestion
  },
});

export default serviceSlice.reducer;
