import { createAsyncThunk } from "@reduxjs/toolkit";
import Api from "../../Services/api";
import { constructQueryString } from "../../utils/CommonFunction";

const CustomerActions = {
  // MARK: - Create Customer
  createCustomer: createAsyncThunk(
    "/customer/auth/register",
    async (customerData) => {
      const response = await Api.post("/customer/auth/register", customerData);
      return response.data;
    }
  ),

  // MARK: - All Categories
  getAllCategories: createAsyncThunk(
    "/customer/allCategoriesForWeb",
    async (payload) => {
      const queryString = constructQueryString(payload);
      const response = await Api.get(
        `/customer/allCategoriesForWeb?${queryString}`
      );
      return response.data;
    }
  ),

  // MARK: - GET Categories
  getCategories: createAsyncThunk(
    "/customer/categories_web",
    async (payload) => {
      const queryString = constructQueryString(payload);
      const response = await Api.get(`/customer/categories_web?${queryString}`);
      return response.data;
    }
  ),

  // MARK: -  Get Best Services
  getBestServices: createAsyncThunk("/customer/getBestServices", async () => {
    const response = await Api.get("/customer/getBestServices");
    return response.data;
  }),

  // MARK: - All Services
  getAllServices: createAsyncThunk(
    "/customer/getAllServices",
    async (payload) => {
      const queryString = constructQueryString(payload);
      const response = await Api.get(`/customer/getAllServices?${queryString}`);
      return response.data;
    }
  ),

  // MARK: - get Sub Category By Id ///
  getSubCategoryById: createAsyncThunk(
    "/customer/getSubCategoryByIdforweb",
    async (reqBody) => {
      const queryString = constructQueryString(reqBody);
      const response = await Api.get(
        `/customer/getSubCategoryByIdforweb?${queryString}`
      );
      return response.data;
    }
  ),

  // MARK: - get filterd sub Category By Id ///
  getFilteredSubCategories: createAsyncThunk(
    "/customer/getFilteredSubCategories",
    async (reqBody) => {
      const queryString = constructQueryString(reqBody);
      const response = await Api.get(
        `/customer/getFilteredSubCategories?${queryString}`
      );
      return response.data;
    }
  ),

  // MARK: - All Services Detail
  getServiceDetail: createAsyncThunk(
    "/customer/getServicewith_reviews",
    async (reqBody) => {
      const queryString = constructQueryString(reqBody);
      const response = await Api.get(
        `/customer/getServicewith_reviews?${queryString}`
      );
      return response.data;
    }
  ),

  // MARK: - Near By Services
  getNearByServices: createAsyncThunk(
    "/customer/NearByServices",
    async (payload) => {
      const queryString = constructQueryString(payload);
      const response = await Api.get(`/customer/NearByServices?${queryString}`);
      return response.data;
    }
  ),
  // MARK: - RESEND OTP
  resendOtp: createAsyncThunk(
    "/customer/auth/resendOtp",
    async (customerData) => {
      const response = await Api.post("/customer/auth/resendOtp", customerData);
      return response.data;
    }
  ),

  // MARK: - VERIFY OTP
  verifyOtp: createAsyncThunk(
    "/customer/auth/verifyOtp",
    async (customerData) => {
      const response = await Api.post("/customer/auth/verifyOtp", customerData);
      return response.data;
    }
  ),

  // MARK: - LOGIN
  loginCustomer: createAsyncThunk(
    "/customer/auth/login",
    async (customerData) => {
      const response = await Api.post("/customer/auth/login", customerData);
      return response.data;
    }
  ),

  // MARK: - GET CUSTOMER
  getProfile: createAsyncThunk("/customer/getProfile", async (reqBody) => {
    const response = await Api.get(`/customer/getProfile`);
    return response.data;
  }),

  getProfileWithSuscription: createAsyncThunk("/service/getProfile", async (reqBody) => {
    const response = await Api.get(`/service/getProfile`);
    return response.data;
  }),

  // MARK: - GET CUSTOMER By Id
  getCustomerbyId: createAsyncThunk("/user/getProfile", async (reqBody) => {
    const queryString = constructQueryString(reqBody);
    const response = await Api.get(`/user/getOtherProfile?${queryString}`);
    return response.data;
  }),

  // MARK: - FORGOT PASSWORD
  forgotPassword: createAsyncThunk(
    "/customer/auth/forgotPass",
    async (customerData) => {
      const response = await Api.post(
        "/customer/auth/forgotPass",
        customerData
      );
      return response.data;
    }
  ),

  // MARK: - RESET PASSWORD
  resetPassword: createAsyncThunk(
    "/customer/auth/resetPass",
    async (customerData) => {
      const response = await Api.post("/customer/auth/resetPass", customerData);
      return response.data;
    }
  ),

  // MARK: - CREATE PROFILE
  createProfile: createAsyncThunk(
    "/customer/createProfile",
    async (customerData) => {
      const response = await Api.post("/customer/createProfile", customerData);
      return response.data;
    }
  ),

  // MARK: - LOG OUT
  logOut: createAsyncThunk("/user/logOut", async () => {
    const response = await Api.patch("/user/logOut");
    return response.data;
  }),

  // MARK: - DELETE ACCOUNT
  deleteAccount: createAsyncThunk(
    "/customer/deleteAccount",
    async (reqBody) => {
      const response = await Api.delete(`/customer/deleteAccount`);
      return response.data;
    }
  ),

  // MARK: - CHANGE PASSWORD
  changePassword: createAsyncThunk(
    "/customer/changePassword",
    async (customerData) => {
      const response = await Api.post("/customer/changePassword", customerData);
      return response.data;
    }
  ),

  // MARK: - GET ALL PRODUCTS
  getAllProducts: createAsyncThunk("/user/customerHome", async () => {
    const response = await Api.get("/user/customerHome");
    return response?.data;
  }),

  // MARK: - GET PRODUCT DETAILS
  getProductDetails: createAsyncThunk("/user/getProductById", async (id) => {
    const response = await Api.get(`user/getProductById?productId=${id}`);
    return response.data;
  }),

  // MARK :- addToCar
  addToCart: createAsyncThunk("/user/addToCart ", async (customerData) => {
    const response = await Api.post("/user/addToCart", customerData);
    return response.data;
  }),

  // MARK :- GET CART
  getCart: createAsyncThunk("/user/getCart", async () => {
    const response = await Api.get(`user/getCart`);
    return response.data;
  }),

  // MARK: - CREATE BOOKING
  createBooking: createAsyncThunk(
    "/customer/createBooking  ",
    async (customerData) => {
      const response = await Api.post("/customer/createBooking", customerData);
      return response.data;
    }
  ),

  // MARK: - EDIT BOOKING
  editBooking: createAsyncThunk(
    "/customer/updatebooking ",
    async (customerData) => {
      const { booking_id, ...dataWithoutId } = customerData;
      const response = await Api.put(
        `/customer/updatebooking/${booking_id}`,
        dataWithoutId
      );
      return response.data;
    }
  ),

  // MARK: - ALL BOOKING LIST
  getAllBookingList: createAsyncThunk(
    "/customer/bookinglist",
    async (payload = {}) => {
      const { status } = payload;

      const url =
        status !== null && status !== undefined
          ? `/customer/Bookinglist_user?status=${status}`
          : `/customer/Bookinglist_user`;

      const response = await Api.get(url);
      return response.data;
    }
  ),
  // MARK: - BOOKING DETAILS BY ID
  // getBookingById: createAsyncThunk(
  //   "/customer/booking",
  //   async (reqBody) => {
  //     const route =
  //     type === "task"
  //       ? `/customer/task-booking-detail/${id}`
  //       : `/customer/booking-detail/${id}`;
  //     const response = await Api.get(`/customer/booking/${reqBody?.id}`);
  //     return response.data;
  //   }
  // ),

  getBookingById: createAsyncThunk(
    "customer/getBookingById",
    async ({ id, type }) => {
      const bookingId = typeof id === "object" ? id._id || id.id : id;

      const route =
        type === "task"
          ? `/customer/get_task_by_id/${bookingId}`
          : `/customer/booking/${bookingId}`;

      const response = await Api.get(route);
      return response.data;
    }
  ),
  createPost: createAsyncThunk(
    "/customer/post_tasks  ",
    async (customerData) => {
      const response = await Api.post("/customer/post_tasks", customerData);
      return response.data;
    }
  ),

  payBooking: createAsyncThunk(
    "/customer/initiate_payment ",
    async (payload) => {
      const response = await Api.post("/customer/initiate_payment", payload);
      return response.data;
    }
  ),
    payTask: createAsyncThunk(
    "/customer/initiate_payment_task ",
    async (payload) => {
      const response = await Api.post("/customer/initiate_payment_task", payload);
      return response.data;
    }
  ),

  // get post list user side
  getPostList: createAsyncThunk("/customer/post_task_listing", async () => {
    const response = await Api.get(`customer/post_task_listing`);
    return response.data;
  }),

  // get task detail
  getPostTaskDetail: createAsyncThunk(
    "/customer/get_task_by_id",
    async (id) => {
      const response = await Api.get(`customer/get_task_by_id/${id}`);
      return response.data;
    }
  ),

  updatePost: createAsyncThunk(
    "/customer/update_task ",
    async (customerData) => {
      const response = await Api.post("/customer/update_task", customerData);
      return response.data;
    }
  ),

  // accept, reject post tasks
  acceptRejectTaskStatus: createAsyncThunk(
    "/customer/accept_reject_task ",
    async (customerData) => {
      const response = await Api.post(
        "/customer/accept_reject_task",
        customerData
      );
      return response.data;
    }
  ),
  // accept, reject post tasks
  acceptRejectTaskCorporateSuggestion: createAsyncThunk(
    "/customer/accept-reject-corporate-suggestion",
    async (customerData) => {
      const response = await Api.post(
        "/customer/accept-reject-corporate-suggestion",
        customerData
      );
      return response.data;
    }
  ),

  // delete tasks
  deleteTasks: createAsyncThunk("customer/remove_task", async (id) => {
    const response = await Api.delete(`/customer/remove_task/${id}`);
    return response.data;
  }),

  // get my quotations
  getMyQuotationsList: createAsyncThunk(
    "customer/my_quatations",
    async (id) => {
      const response = await Api.get(`/customer/my_quatations`);
      return response.data;
    }
  ),

  // get my quotations
  getQuotationDataById: createAsyncThunk(
    "customer/getquatation_by_id",
    async (id) => {
      const response = await Api.get(`/customer/getquatation_by_id/${id}`);
      return response.data;
    }
  ),

  getFilterSearch: createAsyncThunk("customer/filtered_task", async (data) => {
    const response = await Api.get(`/customer/filtered_task`, {
      params: {
        need_done: data.need_done,
        budget: data.budget,
        date: data.date,
        time: data.time,
      },
    });
    return response.data;
  }),

  getCommunity: createAsyncThunk("customer/getCommunities", async (id) => {
    const response = await Api.get(`/customer/getCommunities`);
    return response.data;
  }),

  getCommunityById: createAsyncThunk(
    "customer/getCommunityById",
    async (id) => {
      const response = await Api.get(`/customer/getCommunityById`, {
        params: {
          communityId: id,
        },
      });
      return response.data;
    }
  ),

  // feedback api
  feedbackActions: createAsyncThunk(
    "customer/Give_feedback",
    async (customerData) => {
      const response = await Api.post("/customer/Give_feedback", customerData);
      return response.data;
    }
  ),

  faqsListingAction: createAsyncThunk(
    "customer/faqs_listing",
    async (customerData) => {
      const response = await Api.get("/customer/faqs_listing");
      return response.data;
    }
  ),

  trainingListing: createAsyncThunk(
    "customer/training_list",
    async (customerData) => {
      const response = await Api.get("/customer/training_list");
      return response.data;
    }
  ),

  statsListing: createAsyncThunk("customer/get_stats", async (customerData) => {
    const response = await Api.get("/customer/get_stats");
    return response.data;
  }),

  notificationListing: createAsyncThunk(
    "customer/Notificationlist_user",
    async (customerData) => {
      const response = await Api.get("/customer/Notificationlist_user");
      return response.data;
    }
  ),

  // notificatio toggle api
  notificationToggler: createAsyncThunk(
    "customer/updateNotificationStatus",
    async (customerData) => {
      const response = await Api.post(
        "/customer/updateNotificationStatus",
        customerData
      );
      return response.data;
    }
  ),

  getServiceDetailReview: createAsyncThunk(
    "/getServiceDetailReview/getServicewith_reviews",
    async (reqBody) => {
      const response = await Api.get(`/customer/getServicewith_reviews`, {
        params: {
          service_id: reqBody.id,
        },
      });
      return response.data;
    }
  ),
  // corporate/product

  getMyProductList: createAsyncThunk(
    "/corporate/product",
    async (customerData) => {
      const response = await Api.get("/corporate/product", customerData);
      return response.data;
    }
  ),
  CreateProduct: createAsyncThunk(
    "/corporate/product",
    async (customerData) => {
      const response = await Api.post("/corporate/product", customerData);
      return response.data;
    }
  ),
  updateProduct: createAsyncThunk("corporate/product", async (customerData) => {
    const response = await Api.post("corporate/product", customerData);
    return response.data;
  }),
  createCorporateSuggestionsForTask: createAsyncThunk(
    "/service/createCorporateSuggestion ",
    async (customerData) => {
      const response = await Api.post(
        "/service/createCorporateSuggestion",
        customerData
      );
      return response.data;
    }
  ),
  corpoInfoProductListUser: createAsyncThunk(
    "/customer/list-product",
    async (customerData) => {
      if (customerData && customerData.productId) {
        const response = await Api.get(
          `/customer/list-product/${customerData?.productId}`
        );
        return response;
      } else {
        const queryParams = new URLSearchParams(customerData).toString();
        const response = await Api.get(`/customer/list-product?${queryParams}`);
        return response;
      }
    }
  ),
   // Buy Product
  buyProducts: createAsyncThunk("/customer/initiate_payment_for_product ",
    async (customerData) => {
      const response = await Api.post("/customer/initiate_payment_for_product", customerData);
      return response.data;
    }
  ),
  getPurchaseProducts: createAsyncThunk(
    "/customer/list-purchase-products",
    async (customerData) => {
      const response = await Api.get("/customer/list-purchase-products", customerData);
      return response.data;
    }
  ),
};

export default CustomerActions;
