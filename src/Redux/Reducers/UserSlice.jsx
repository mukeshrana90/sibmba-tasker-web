import { createSlice } from "@reduxjs/toolkit";
import CustomerActions from "../Actions/CustomerActions";
import { normalizeCategoryResponseData } from "../../utils/normalizeCategory";

const UserSlice = createSlice({
  name: "service",
  initialState: {
    AllUserServices: null,
    allUserCategories: null,
    categories: null,
    bestservices: null,
    nearByServices: null,
    nearByServiceProviders: null,
    payBookingStatus: false,
    serviceDetail: null,
    categoriesDetail: null,
    getSubCategories: null,
    postlist: null,
    postTaskDetail: null,
    myQuotations: null,
    quotationDetail: null,
    communityDetail: null,
    communityDetailById: null,
    getFaqListing: null,
    trainingListData: null,
    statsListData: null,
    notificationData: null,
    detailService: null,
    serviceProviderProfile: null,
    customerSearchResults: null,
    topRatedServices: null,
    searchProvidersResults: null,
    searchProvidersLoading: false,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {


    //////////////////////////////////  Get sub category Detail  ////////
    builder.addCase(CustomerActions.getFilteredSubCategories.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getFilteredSubCategories.fulfilled,
      (state, action) => {
        state.loading = false;
        state.getSubCategories = action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getFilteredSubCategories.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    ////////////////////////////////// category Detail  ////////
    builder.addCase(CustomerActions.getSubCategoryById.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getSubCategoryById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.categoriesDetail = action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getSubCategoryById.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////// all user services  ////////
    builder.addCase(CustomerActions.getAllServices.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getAllServices.fulfilled,
      (state, action) => {
        state.loading = false;
        state.AllUserServices = action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getAllServices.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////// all user Categories  ////////
    builder.addCase(CustomerActions.getAllCategories.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getAllCategories.fulfilled,
      (state, action) => {
        state.loading = false;
        state.allUserCategories = normalizeCategoryResponseData(
          action.payload?.data
        );
      }
    );

    builder.addCase(
      CustomerActions.getAllCategories.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////// get browser Categories home //////////
    builder.addCase(CustomerActions.getCategories.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getCategories.fulfilled,
      (state, action) => {
        state.loading = false;
        state.categories = normalizeCategoryResponseData(action.payload?.data);
      }
    );

    builder.addCase(
      CustomerActions.getCategories.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////// get Best service //////////
    builder.addCase(CustomerActions.getBestServices.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getBestServices.fulfilled,
      (state, action) => {
        state.loading = false;
        state.bestservices = action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getBestServices.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    ////////////////////////////////// get near by service //////////
    builder.addCase(CustomerActions.getNearByServices.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getNearByServices.fulfilled,
      (state, action) => {
        state.loading = false;
        state.nearByServices = action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getNearByServices.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////// get nearby service providers by category //////////
    builder.addCase(CustomerActions.getNearbyServiceProvider.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getNearbyServiceProvider.fulfilled,
      (state, action) => {
        state.loading = false;
        state.nearByServiceProviders = action.payload?.data?.data
          ? action.payload.data
          : action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getNearbyServiceProvider.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );



    ////////////////////////////////// payBooking //////////
    builder.addCase(CustomerActions.payBooking.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.payBooking.fulfilled,
      (state, action) => {
        state.loading = false;
        state.payBookingStatus = true
      }
    );

    builder.addCase(
      CustomerActions.payBooking.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    ////////////////////////////////// get Service detail //////////
    builder.addCase(CustomerActions.getServiceDetail.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getServiceDetail.fulfilled,
      (state, action) => {
        state.loading = false;
        state.serviceDetail = action.payload;
      }
    );

    builder.addCase(
      CustomerActions.getServiceDetail.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    ///////////////////////////////
    builder.addCase(CustomerActions.getPostList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getPostList.fulfilled,
      (state, action) => {
        state.loading = false;
        state.postlist = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.getPostList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////////////
    builder.addCase(CustomerActions.getPostTaskDetail.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getPostTaskDetail.fulfilled,
      (state, action) => {
        state.loading = false;
        state.postTaskDetail = action.payload;
      }
    );

    builder.addCase(
      CustomerActions.getPostTaskDetail.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////////////// 
    builder.addCase(CustomerActions.getMyQuotationsList.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getMyQuotationsList.fulfilled,
      (state, action) => {
        state.loading = false;
        const data = action.payload?.data;
        state.myQuotations = Array.isArray(data)
          ? data
          : Array.isArray(data?.quotations)
            ? data.quotations
            : [];
      }
    );

    builder.addCase(
      CustomerActions.getMyQuotationsList.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );


    //////////////////////////////////////////////  
    builder.addCase(CustomerActions.getQuotationDataById.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getQuotationDataById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.quotationDetail = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.getQuotationDataById.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////////////////////
    builder.addCase(CustomerActions.getCommunity.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getCommunity.fulfilled,
      (state, action) => {
        state.loading = false;
        state.communityDetail = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.getCommunity.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    //////////////////////////////////////////////////////////////
    builder.addCase(CustomerActions.getCommunityById.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getCommunityById.fulfilled,
      (state, action) => {
        state.loading = false;
        state.communityDetailById = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.getCommunityById.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ////////////////////////////////////////////////////////////////  
    builder.addCase(CustomerActions.faqsListingAction.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.faqsListingAction.fulfilled,
      (state, action) => {
        state.loading = false;
        state.getFaqListing = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.faqsListingAction.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    ///////////////////////////////////////////////////////////////// 
    builder.addCase(CustomerActions.trainingListing.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.trainingListing.fulfilled,
      (state, action) => {
        state.loading = false;
        state.trainingListData = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.trainingListing.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    )

    ///////////////////////////////////////////////////////////////// 
    builder.addCase(CustomerActions.statsListing.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.statsListing.fulfilled,
      (state, action) => {
        state.loading = false;
        state.statsListData = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.statsListing.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    )

    ///////////////////////////////////////////////////////////////// 
    builder.addCase(CustomerActions.notificationListing.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.notificationListing.fulfilled,
      (state, action) => {
        state.loading = false;
        state.notificationData = action.payload.data;
      }
    );

    builder.addCase(
      CustomerActions.notificationListing.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    )


    ///////////////////////////////////////////////////////////////// 
    builder.addCase(CustomerActions.getServiceDetailReview.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getServiceDetailReview.fulfilled,
      (state, action) => {
        state.loading = false;
        state.detailService = action.payload;
      }
    );

    builder.addCase(
      CustomerActions.getServiceDetailReview.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    builder.addCase(CustomerActions.getServiceProviderProfile.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getServiceProviderProfile.fulfilled,
      (state, action) => {
        state.loading = false;
        state.serviceProviderProfile = action.payload;
      }
    );

    builder.addCase(
      CustomerActions.getServiceProviderProfile.rejected,
      (state) => {
        state.loading = false;
        state.serviceProviderProfile = null;
      }
    );

    builder.addCase(CustomerActions.customerSearch.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(CustomerActions.customerSearch.fulfilled, (state, action) => {
      state.loading = false;
      state.customerSearchResults = action.payload?.data;
    });

    builder.addCase(CustomerActions.customerSearch.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    builder.addCase(CustomerActions.getTopRatedServices.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(
      CustomerActions.getTopRatedServices.fulfilled,
      (state, action) => {
        state.loading = false;
        state.topRatedServices = action.payload?.data;
      }
    );

    builder.addCase(
      CustomerActions.getTopRatedServices.rejected,
      (state, action) => {
        state.loading = false;
        state.error = action.payload;
      }
    );

    builder.addCase(CustomerActions.searchProviders.pending, (state) => {
      state.searchProvidersLoading = true;
    });

    builder.addCase(
      CustomerActions.searchProviders.fulfilled,
      (state, action) => {
        state.searchProvidersLoading = false;
        state.searchProvidersResults = action.payload?.data;
      }
    );

    builder.addCase(CustomerActions.searchProviders.rejected, (state, action) => {
      state.searchProvidersLoading = false;
      state.error = action.payload;
    });
  },

});

export default UserSlice.reducer;