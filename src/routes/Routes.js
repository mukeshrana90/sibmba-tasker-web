import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
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
const Bookings = lazy(() => import("../Pages/Bookings"));
const BookingsDetail = lazy(() => import("../Pages/BookingsDetail"));
const PostTask = lazy(() => import("../Pages/PostTask"));
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

const RoutesPage = () => {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/terms-and-conditions" element={<TermsConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/error" element={<Error />} />
          <Route path="/otp-varification" element={<OtpVarification />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/provider" element={<ProviderProfile />} />

          <Route path="/category" element={<Category />} />
          <Route path="/near-by-services" element={<NearByServices />} />
          <Route path="/services" element={<Services />} />
          <Route path="/browse-category" element={<BrowseCategory />} />

          <Route element={<ProtectHome />}>
            <Route path="/" element={<Home />} />
          </Route>
          <Route element={<PrivateService />}>
            <Route path="/requests" element={<Requests />} />
          </Route>

          {/* Private Routes */}
          <Route element={<PrivateRoute />}>

            {/* User Routes */}
            <Route path="/edit-profile" element={<EditProfileUser />} />

            {/* Comapny Routes */}
            <Route path="/edit-profile-company" element={<EditProfileCompany />} />

            <Route path="/allmyservices" element={<MyServices />} />
            <Route path="/search-for-service" element={<SearchForService />} />
            <Route path="/service/:type" element={<AddServices />} />
            <Route path="/customer-service-detail" element={<CustomerServiceDetail />} />
            <Route path="/customer-category-detail" element={<CustomerCategoryDetail />} />
            <Route path="/service-details/:id" element={<ServiceDetails />} />

            <Route path="/service-detail" element={<ServiceDetail />} />
            <Route path="/service-provider/:id" element={<ServiceProvider />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/booking-detail" element={<BookingsDetail />} />
            <Route path="/user-booking-detail/:id" element={<UserBookingDetails />} />
            <Route path="/post-task" element={<PostTask />} />
            <Route path="/my-task" element={<MyTasks />} />
            <Route path="/edit-task/:id" element={<EditTask />} />
            <Route path="/task-detail/:id" element={<TaskDetail />} />
            <Route path="/quotations-detail/:id" element={<QuotationsDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/community" element={<Community />} />
            <Route path="/customerreviews" element={<CustomerReviews />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/servicetasksdetails/:id" element={<ServiceTaskDetails />} />

            <Route path="/requestreject/:id" element={<ServiceReject />} />
            <Route path="/requestdetail/:id" element={<ServiceRequest />} />

            <Route path="/taskslist" element={<ServiceTasks />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/service-pro" element={<ServicePro />} />
            <Route path="/serviceprocategory/:id" element={<ServiceProCategory />} />
            <Route path="/serviceprocategorydetail/:id" element={<ServiceProCategoryDetail />} />

            <Route path="/wallet" element={<Wallet />} />
            <Route path="/training-material" element={<TrainingMaterial />} />
            <Route path="/my-stats" element={<MyStats />} />
            <Route path="/my-subscription" element={<MySubscription />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default RoutesPage;
