import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ScrollToTop from "../Hooks/ScrollToTop";
import PrivateRoute from "./PrivateRoute";
import Loader from "../CommanComponents/Loader";
import AddServices from "../Pages/AddServices";
import ServiceDetails from "../Pages/ServiceDetails";
import Category from "../Pages/Category";
import EditProfileUser from "../Pages/EditProfileUser";
import CustomerServiceDetail from "../Pages/CustomerServiceDetail";
import CustomerCategoryDetail from "../Pages/CustomerCategoryDetail";
import EditProfileCompany from "../Pages/EditProfileCompany";
import BrowseCategory from "../Pages/BrowseCategory";
import NearByServices from "../Pages/NearByServices";
import UserBookingDetails from "../Pages/UserBookingDetails";
import ServiceRequest from "../Pages/ServiceRequest";
import ServiceReject from "../Pages/ServiceReject";
import ServiceTasks from "../Pages/ServiceTasks";
import ProtectHome from "./ProtectHome";
import PrivateService from "./PrivateService";
import EditTask from "../Pages/EditTask";
import ServiceTaskDetails from "../Pages/ServiceTaskDetails";
import CustomerReviews from "../Pages/CustomerReviews";
import Payment from "../Pages/Payment";
import ServicePro from "../Pages/ServicePro";
import ServiceProCategory from "../Pages/ServiceProCategory";
import ServiceProCategoryDetail from "../Pages/ServiceProCategoryDetail";
import PrivacyPolicy from "../Pages/PrivacyPolicy";
import TermsConditions from "../Pages/TermsConditions";
import PrivateCorporate from "./PrivateCorporate";
import PrivateLogisticsHub from "./PrivateLogisticsHub";
import PrivateLogisticsOwner from "./PrivateLogisticsOwner";
import PrivateLogisticsDriver from "./PrivateLogisticsDriver";
import CorporateLeeds from "../Pages/corporate/leads";
import CorporateDashboard from "../Pages/corporate";
import CorporateAddProduct from "../Pages/corporate/products/addForm";
import CorporateEditProduct from "../Pages/corporate/products/editForm";
import CorporateProducts from "../Pages/corporate/products/list";
import ProductDetailsPage from "../Pages/corporate/products/details";
import MyLeadDetails from "../Pages/corporate/LeadDetails";
import SuggestedCorporatePage from "../Pages/suggestedCorporate";
import CorporateProductDetailPage from "../Pages/corporateProductDetail";
import ProductDetail from "../Pages/ProductDetail";
import PaymentStatus from "../Pages/PaymentStatus";
import CorporateListSection from "../Pages/corporateListForUser";
import CorporateCategoryDetail from "../Pages/corporateCategoryDetail";
import BrowseCorporateCategory from "../Pages/BrowseCorporatecategory";
import ProductHistory from "../Pages/ProductHistory";
import NearByCorporate from "../Pages/NearByCorporate";
import NearByServiceProviderDetail from "../Pages/NearByServiceProviderDetail";
import SubscriptionPlan from "../Pages/corporate/SubscriptionPlan";
import SubscriptionCancel from "../Pages/corporate/SubscriptionCancel";
import SubscriptionSuccess from "../Pages/corporate/SubscriptionSuccess";
import CorporatePro from "../Pages/corporate/corporatePro";
import CorporateProDetails from "../Pages/corporate/corporateProDetails";
import CorporateBusinessPage from "../Pages/corporate/corporateBussiness";
import LogisticsHubHome from "../Pages/logistics/HubHome";
import LogisticsPostJob from "../Pages/logistics/PostJob";
import LogisticsSearch from "../Pages/logistics/Search";
import LogisticsMyJobs, { LogisticsJobDetail } from "../Pages/logistics/MyJobs";
import LogisticsAssetDetail from "../Pages/logistics/AssetDetail";
import LogisticsOwnerAsset from "../Pages/logistics/OwnerAsset";
import LogisticsOwnerDashboard from "../Pages/logistics/OwnerDashboard";
import LogisticsOwnerEarnings from "../Pages/logistics/OwnerEarnings";
import LogisticsOwnerAnalytics from "../Pages/logistics/OwnerAnalytics";
import LogisticsOperatorAnalytics from "../Pages/logistics/OperatorAnalytics";
import OwnerReports from "../Pages/logistics/OwnerReports";
import LogisticsOwnerSubscription from "../Pages/logistics/OwnerSubscription";
import LogisticsFleet from "../Pages/logistics/Fleet";
import LogisticsOperators from "../Pages/logistics/Operators";
import LogisticsDriverHome from "../Pages/logistics/DriverHome";
import LogisticsOperatorJob from "../Pages/logistics/OperatorJob";
import LogisticsInviteActivate from "../Pages/logistics/InviteActivate";
import LogisticsSupplyPlaceholder from "../Pages/logistics/SupplyPlaceholder";
import LogisticsSupport from "../Pages/logistics/LogisticsSupport";
import OwnerAvailability from "../Pages/logistics/OwnerAvailability";
import OwnerEquipment from "../Pages/logistics/OwnerEquipment";
import LogisticsQuotesList from "../Pages/logistics/QuotesList";
import MultiTransitMode from "../Pages/logistics/MultiTransitMode";
import {
  LogisticsOwnerOpportunities,
  LogisticsOperatorOpportunities,
  LogisticsOperatorMyJobs,
  LogisticsOwnerMyJobs,
} from "../Pages/logistics/SupplyPages";

const lazyWithChunkRetry = (importer, retryKey) =>
  lazy(async () => {
    const alreadyRefreshed = sessionStorage.getItem(retryKey) === "1";
    try {
      const module = await importer();
      sessionStorage.removeItem(retryKey);
      return module;
    } catch (error) {
      const message = String(error?.message || "");
      const isChunkLoadError =
        message.includes("ChunkLoadError") ||
        message.includes("Loading chunk");
      if (isChunkLoadError && !alreadyRefreshed) {
        sessionStorage.setItem(retryKey, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });


const Login = lazy(() => import("../Pages/Login"));
const ResetPassword = lazy(() => import("../Pages/ResetPassword"));
const Error = lazy(() => import("../Pages/Error"));
const OtpVarification = lazy(() => import("../Pages/OtpVarification"));
const SignUp = lazy(() => import("../Pages/SignUp"));
const ForgotPassword = lazy(() => import("../Pages/ForgotPassword"));
const CompleteProfile = lazy(() => import("../Pages/CompleteProfile"));
const Home = lazy(() => import("../Pages/Home"));
const Services = lazy(() => import("../Pages/Services"));
const SearchForService = lazy(() => import("../Pages/SearchForService"));
const ServiceDetail = lazy(() => import("../Pages/ServiceDetail"));
const ServiceProvider = lazy(() => import("../Pages/ServiceProvider"));
const Bookings = lazyWithChunkRetry(
  () => import("../Pages/Bookings"),
  "bookings_chunk_retry_once"
);
const BookingsDetail = lazy(() => import("../Pages/BookingsDetail"));
const PostTask = lazyWithChunkRetry(
  () => import("../Pages/PostTask"),
  "post_task_chunk_retry_once"
);
const MyTasks = lazy(() => import("../Pages/MyTasks"));
const TaskDetail = lazy(() => import("../Pages/TaskDetail"));
const QuotationsDetail = lazy(() => import("../Pages/QuotationsDetail"));
const Messages = lazy(() => import("../Pages/Messages"));
const Community = lazy(() => import("../Pages/Community"));
const ContactUs = lazy(() => import("../Pages/ContactUs"));
const ChangePassword = lazy(() => import("../Pages/ChangePassword"));
const ProviderProfile = lazy(() => import("../Pages/ProviderProfile"));
const Requests = lazy(() => import("../Pages/Requests"));
const Wallet = lazy(() => import("../Pages/Wallet"));
const TrainingMaterial = lazy(() => import("../Pages/TrainingMaterial"));
const MyStats = lazy(() => import("../Pages/MyStats"));
const MySubscription = lazy(() => import("../Pages/MySubscription"));
const MyServices = lazy(() => import("../Pages/MyServices"));
const SearchProvidersPage = lazy(() => import("../Pages/SearchProvidersPage"));

const RoutesPage = () => {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/terms-and-conditions" element={<TermsConditions />} />
          <Route path="/payment-status/:purchaseproductid" element={<PaymentStatus />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/error" element={<Error />} />
          <Route path="/otp-varification" element={<OtpVarification />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/provider" element={<ProviderProfile />} />
          <Route path="/logistics/invite" element={<LogisticsInviteActivate />} />
          <Route
            path="/logistics/invite/:token"
            element={<LogisticsInviteActivate />}
          />

          <Route path="/category" element={<Category />} />
          <Route path="/near-by-services" element={<NearByServices />} />
          <Route path="/services" element={<Services />} />
          <Route path="/browse-category" element={<BrowseCategory />} />
          <Route path="/browse-corporate-category" element={<BrowseCorporateCategory />} />
          <Route path="/near-by-corporate" element={<NearByCorporate />} />
          <Route path="/near-by-service-provider" element={<NearByServiceProviderDetail />} />
          <Route path="/service-provider/:id" element={<ServiceProvider />} />
          <Route
            path="/customer-service-detail"
            element={<CustomerServiceDetail />}
          />
          <Route
            path="/customer-category-detail"
            element={<CustomerCategoryDetail />}
          />
          <Route path="/post-task" element={<PostTask />} />
          <Route
            path="/search-providers"
            element={<SearchProvidersPage variant="visitor" />}
          />

          <Route element={<ProtectHome />}>
            <Route path="/" element={<Home />} />
          </Route>
          <Route element={<PrivateService />}>
            <Route path="/requests" element={<Requests />} />
          </Route>

          <Route path="/corporate" element={<PrivateCorporate />}>
            <Route index element={<CorporateDashboard />} />
            <Route path="products" element={<CorporateProducts />} />
            <Route path="products/add" element={<CorporateAddProduct />} />
            <Route
              path="products/edit/:id"
              element={<CorporateEditProduct />}
            />
           <Route path="/corporate/products/details/:id" element={<ProductDetailsPage />} />
            <Route path="/corporate/corporate-pro" element={<CorporatePro />} />
            <Route path="leads" element={<CorporateLeeds />} />
            <Route path="/corporate/lead-details/:id" element={<MyLeadDetails />} />
            <Route path="/corporate/subscription-plan" element={<SubscriptionPlan />} />
            <Route path="/corporate/subscription-success/:transactionId" element={<SubscriptionSuccess />} />
            <Route path="/corporate/subscription-cancel/:transactionId" element={<SubscriptionCancel />} />
            <Route path="/corporate/corporate-pro-detail/:categoryId" element={<CorporateProDetails />} />
            <Route path="/corporate/corporate-business/:id" element={<CorporateBusinessPage />} />
          </Route>

          <Route path="/logistics" element={<PrivateLogisticsHub />}>
            <Route index element={<LogisticsHubHome />} />
            <Route path="post" element={<LogisticsPostJob />} />
            <Route path="search" element={<LogisticsSearch />} />
            <Route path="asset/:id" element={<LogisticsAssetDetail />} />
            <Route path="jobs" element={<LogisticsMyJobs />} />
            <Route path="jobs/:id" element={<LogisticsJobDetail />} />
            <Route path="jobs/:id/quotes" element={<LogisticsJobDetail />} />
          </Route>

          <Route path="/logistics/owner" element={<PrivateLogisticsOwner />}>
            <Route index element={<LogisticsOwnerDashboard />} />
            <Route path="fleet" element={<LogisticsFleet />} />
            <Route path="fleet/add" element={<LogisticsFleet />} />
            <Route path="fleet/:id" element={<LogisticsOwnerAsset />} />
            <Route path="operators" element={<LogisticsOperators />} />
            <Route path="operators/add" element={<LogisticsOperators />} />
            <Route
              path="drivers"
              element={<Navigate to="/logistics/owner/operators" replace />}
            />
            <Route path="opportunities" element={<LogisticsOwnerOpportunities />} />
            <Route path="quotes" element={<LogisticsQuotesList />} />
            <Route path="job/:id" element={<LogisticsOperatorJob />} />
            <Route path="jobs" element={<LogisticsOwnerMyJobs />} />
            <Route path="earnings" element={<LogisticsOwnerEarnings />} />
            <Route path="equipment" element={<OwnerEquipment />} />
            <Route path="availability" element={<OwnerAvailability />} />
            <Route path="analytics" element={<LogisticsOwnerAnalytics />} />
            <Route path="reports" element={<OwnerReports />} />
            <Route path="subscription" element={<LogisticsOwnerSubscription />} />
            <Route
              path="support"
              element={
                <LogisticsSupport homeTo="/logistics/owner" midLabel="Owner" />
              }
            />
          </Route>

          <Route path="/logistics/driver" element={<PrivateLogisticsDriver />}>
            <Route index element={<LogisticsDriverHome />} />
            <Route path="work" element={<LogisticsOperatorOpportunities />} />
            <Route path="jobs" element={<LogisticsOperatorMyJobs />} />
            <Route path="multi-transit/:id" element={<MultiTransitMode />} />
            <Route path="quotes" element={<LogisticsQuotesList />} />
            <Route path="job/:id" element={<LogisticsOperatorJob />} />
            <Route path="earnings" element={<LogisticsDriverHome />} />
            <Route
              path="availability"
              element={<Navigate to="/logistics/driver" replace />}
            />
            <Route path="analytics" element={<LogisticsOperatorAnalytics />} />
            <Route
              path="support"
              element={
                <LogisticsSupport
                  homeTo="/logistics/driver"
                  midLabel="Operator"
                />
              }
            />
          </Route>

          {/* Private Routes */}
          <Route element={<PrivateRoute />}>
            {/* User Routes */}
            <Route path="/edit-profile" element={<EditProfileUser />} />

            {/* Comapny Routes */}
            <Route
              path="/edit-profile-company"
              element={<EditProfileCompany />}
            />

            <Route path="/allmyservices" element={<MyServices />} />
            <Route path="/search-for-service" element={<SearchForService />} />
            <Route
              path="/customer-search-providers"
              element={<SearchProvidersPage variant="customer" />}
            />
            <Route path="/service/:type" element={<AddServices />} />
            <Route
              path="/customer-service-detail"
              element={<CustomerServiceDetail />}
            />
            <Route
              path="/customer-category-detail"
              element={<CustomerCategoryDetail />}
            />
            <Route
              path="/corporate-category-detail/:categoryId"
              element={<CorporateCategoryDetail />}
            />
             <Route
              path="/product-details/:id"
              element={<ProductDetail/>}
            />
            <Route path="/service-details/:id" element={<ServiceDetails />} />

            <Route path="/service-detail" element={<ServiceDetail />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/booking-detail" element={<BookingsDetail />} />
            <Route
              path="/user-booking-detail/:id"
              element={<UserBookingDetails />}
            />
            <Route path="/my-task" element={<MyTasks />} />
            <Route path="/edit-task/:id" element={<EditTask />} />
            <Route path="/task-detail/:id" element={<TaskDetail />} />
            <Route
              path="/quotations-detail/:id"
              element={<QuotationsDetail />}
            />
            <Route path="/get-corporate/:id" element={<SuggestedCorporatePage/>} />
            <Route path="/corporate-list" element={<CorporateListSection/>} />
            <Route path="/product-detail/:id" element={<CorporateProductDetailPage/>} />
            
            <Route path="/messages" element={<Messages />} />
            <Route path="/community" element={<Community />} />
            <Route path="/customerreviews" element={<CustomerReviews />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route
              path="/servicetasksdetails/:id"
              element={<ServiceTaskDetails />}
            />

            <Route path="/requestreject/:id" element={<ServiceReject />} />
            <Route path="/requestdetail/:id" element={<ServiceRequest />} />

            <Route path="/taskslist" element={<ServiceTasks />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/service-pro" element={<ServicePro />} />
            <Route
              path="/serviceprocategory/:id"
              element={<ServiceProCategory />}
            />
            <Route
              path="/serviceprocategorydetail/:id"
              element={<ServiceProCategoryDetail />}
            />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/training-material" element={<TrainingMaterial />} />
            <Route path="/my-stats" element={<MyStats />} />
            <Route path="/my-subscription" element={<MySubscription />} />
            <Route path="/product-history" element={<ProductHistory />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default RoutesPage;
