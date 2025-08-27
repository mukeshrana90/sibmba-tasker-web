import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Dropdown from "react-bootstrap/Dropdown";
import DeleteAccountModal from "../../CommanComponents/Modals/DeleteAccountModal";
import { toast } from "react-toastify";
import Search from "../../CommanComponents/Search";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { setCustomer } from "../../Redux/Reducers/LoginSlice";
import { ImagePathCustomer } from "../../utils/ImagePath";
import { Modal } from "react-bootstrap";
import { Roles } from "../../utils/Roles";

const serviceProviderRoutes = [
  { label: "Home", path: "/requests" },
  { label: "Service", path: "/allmyservices" },
  { label: "Tasks", path: "/taskslist" },
  { label: "Service Pro", path: "/service-pro" },
  // { label: "Corporate Pro", path: "/browse-corporate-category" },
];

const corporateRoutes = [
  { label: "Home", path: "/" },
  { label: "Product", path: "/corporate/products" },
  { label: "Leads", path: "/corporate/leads" },
  { label: "Corporate Pro", path: "/corporate/corporate-pro" },
];

const clientRoutes = [
  { label: "Home", path: "/" },
  { label: "Service", path: "/services" },
  { label: "Corporate", path: "/corporate-list" },
  { label: "Bookings", path: "/bookings" },
  { label: "My Tasks", path: "/my-task" },
];
export default function Header() {
  const dispatch = useDispatch();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const Navigate = useNavigate();
  const [isDeleteModal, setIsDeleteModal] = useState(false);
  const { customerDetails } = useSelector((state) => state.login);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPlanModalMessage, setShowPlanModalMessage] = useState("");
  const currentPath = location.pathname;

  const notificationDetail = useSelector((e) => e.UserSlice.notificationData);
  const role = localStorage.getItem("role");

  const hideNavbarCollapse = location.pathname === "/provider";
  const hideSearchbarCollapse =
    location.pathname === "/requests" || role === Roles.SERVICE_PROVIDER;

  const getProfileApiCall = async () => {
    if (role === "3") {
      expiredSubscriptionPopup();
    } else {
      let apiRes = await dispatch(CustomerActions.getProfile());
      if (apiRes?.payload && apiRes?.payload?.success) {
         const profileData = apiRes?.payload?.data;
        localStorage.setItem('ServiceLimit',  JSON.stringify(profileData))
        dispatch(setCustomer(apiRes?.payload?.data));
      }
    }
  };

  useEffect(() => {
    if (token) {
      getProfileApiCall();
    }
  }, [token]);

  useEffect(() => {
    dispatch(CustomerActions.notificationListing());
  }, []);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // dispatch(CustomerActions.notificationToggler())

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(
    customerDetails?.notification_visibility === 1
  );

  useEffect(() => {
    if (customerDetails) {
      setIsNotificationsEnabled(customerDetails?.notification_visibility == 1);
    }
  }, [customerDetails]);

  const handleToggleChange = async (e) => {
    const enabled = e.target.checked;
    setIsNotificationsEnabled(enabled);

    dispatch(CustomerActions.notificationToggler());
  };

  const handleLogout = () => {
    setShowPlanModal(false);
    setShowLogoutModal(false);
    toast.success("Log out successfully");
    localStorage.clear();
    Navigate(`/`);
    window.location.reload();
  };

 const handleStripe = () => {
  setShowPlanModal(false);
  if (location.pathname !== '/corporate/subscription-plan' && location.pathname !== 'corporate/subscription-plan') {
    Navigate('/corporate/subscription-plan');
  }
};
  const getNavRoutes = () => {
    if (role == Roles.SERVICE_PROVIDER) return serviceProviderRoutes;
    if (role == Roles.CORPORATE) return corporateRoutes;
    return clientRoutes;
  };

  const expiredSubscriptionPopup = async () => {
    try {
      const apiRes = await dispatch(
        CustomerActions.getProfileWithSuscription()
      );
      if (apiRes?.payload?.success) {
        dispatch(setCustomer(apiRes?.payload?.data.user));
      }
      const user = apiRes?.payload?.data;
      const totalLeadResponse = user?.totalLeadResponse || 0;

      const currentDate = new Date();

      const plans = [
        { name: "Bronze Package", lead: 300 },
        { name: "Silver Package", lead: 700 },
        { name: "Gold Package", lead: "unlimited" },
        { name: "Bronze Package (Simba Tasker)", lead: 300 },
        { name: "Silver Package (Simba Tasker)", lead: 700 },
        { name: "Gold Package (Simba Tasker)", lead: "unlimited" },
      ];
      const freeSubscriptionLead = 15;

      if (
        user?.subscriptionDetail &&
        Object.keys(user.subscriptionDetail).length > 0
      ) {
        const endDate = new Date(user.subscriptionDetail.endDate);
        const packageName = user.subscriptionDetail?.subscriptionPlan;

        if (user.subscriptionDetail.status === "inactive" && currentDate > endDate) {
          setShowPlanModalMessage(
            "Your subscription has expired. Please renew to continue using the app."
          );
          setShowPlanModal(true);
        }
        const currentPlan = plans.find((plan) => plan.name === packageName);
        if (
          currentPlan?.lead !== "unlimited" &&
          totalLeadResponse >= currentPlan?.lead
        ) {
          setShowPlanModalMessage(
            `You have reached the lead limit for your ${currentPlan.name}. Please upgrade your plan.`
          );
          setShowPlanModal(true);
        }
      } else {
        const createdAt = new Date(user?.user?.createdAt);
        const diffInMs = currentDate - createdAt;
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays >= 90) {
          setShowPlanModalMessage(
            "Your 90-day free trial has ended. Please subscribe to continue."
          );
          setShowPlanModal(true);
        }

        if (totalLeadResponse >= freeSubscriptionLead) {
          setShowPlanModalMessage(
            `You have used all ${freeSubscriptionLead} free leads. Please subscribe.`
          );
          setShowPlanModal(true);
        }
      }
      if(location.pathname.startsWith("/corporate/subscription-plan")) {
        setShowPlanModal(false);
      }
    } catch (error) {
      console.error("Subscription check failed:", error);
    }
  };
  return (
    <>
      <div className="header-commn">
        <Container>
          <Navbar expand="lg">
            <Container fluid>
              <Navbar.Brand
                as={Link}
                to={role == Roles.SERVICE_PROVIDER ? "/requests" : "/"}
              >
                <img src={require("../../Assets/Images/dark-logo.png")} />
              </Navbar.Brand>
              <Navbar.Toggle aria-controls="navbarScroll" />

              {!hideNavbarCollapse && (
                <Navbar.Collapse id="navbarScroll">
                  {token &&
                    !hideSearchbarCollapse &&
                    !(role == Roles.CORPORATE) && (
                      <div className="nav-serch-bar ms-0 mt-2 mt-md-0 ms-md-5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="15"
                          viewBox="0 0 14 15"
                          fill="none"
                        >
                          <path d="..." fill="#545454" fillOpacity="0.5" />
                        </svg>
                        <Search />
                      </div>
                    )}

                  <Nav className="ms-auto my-2 my-lg-0 me-3" navbarScroll>
                    {token &&
                      getNavRoutes().map((route) => (
                        <Link
                          key={route.path}
                          to={route.path}
                          className={
                            currentPath === route.path
                              ? "nav-link active"
                              : "nav-link"
                          }
                        >
                          {route.label}
                        </Link>
                      ))}

                    {!token && (
                      <>
                        <button
                          className="sv-btn"
                          onClick={() => Navigate("/sign-up?role=2")}
                        >
                          Join as Service Provider
                        </button>
                        <button
                          className="sv-btn corporate-btn"
                          onClick={() => Navigate("/sign-up?role=3")}
                        >
                          Join as Corporate
                        </button>
                      </>
                    )}
                  </Nav>

                  {!token && (
                    <Form className="d-flex">
                      <button
                        className="login-btn-nav"
                        type="button"
                        onClick={() => Navigate(`/sign-up`)}
                      >
                        I’m in need of a service
                      </button>
                    </Form>
                  )}

                  {token && (
                    <>
                      <div className="after-login-action">
                        <div>
                          <Link
                            className={`icon-button ${
                              currentPath === "/messages" ? "active" : ""
                            }`}
                            to="/messages"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="25"
                              height="26"
                              viewBox="0 0 25 26"
                              fill="none"
                            >
                              <path
                                d="M21.875 2.0625H3.125C1.83281 2.0625 0.78125 3.11406 0.78125 4.40625V16.9062C0.78125 18.1984 1.83281 19.25 3.125 19.25H5.46875V23.1562C5.469 23.3033 5.51072 23.4474 5.58913 23.5718C5.66754 23.6962 5.77945 23.7961 5.91202 23.8598C6.04459 23.9235 6.19243 23.9485 6.33859 23.932C6.48474 23.9155 6.62327 23.8581 6.73828 23.7664L12.3836 19.25H21.875C23.1672 19.25 24.2188 18.1984 24.2188 16.9062V4.40625C24.2188 3.11406 23.1672 2.0625 21.875 2.0625ZM12.5 13H6.25C6.0428 13 5.84409 12.9177 5.69757 12.7712C5.55106 12.6247 5.46875 12.426 5.46875 12.2187C5.46875 12.0115 5.55106 11.8128 5.69757 11.6663C5.84409 11.5198 6.0428 11.4375 6.25 11.4375H12.5C12.7072 11.4375 12.9059 11.5198 13.0524 11.6663C13.1989 11.8128 13.2812 12.0115 13.2812 12.2187C13.2812 12.426 13.1989 12.6247 13.0524 12.7712C12.9059 12.9177 12.7072 13 12.5 13ZM18.75 9.875H6.25C6.0428 9.875 5.84409 9.79269 5.69757 9.64618C5.55106 9.49966 5.46875 9.30095 5.46875 9.09375C5.46875 8.88655 5.55106 8.68784 5.69757 8.54132C5.84409 8.39481 6.0428 8.3125 6.25 8.3125H18.75C18.9572 8.3125 19.1559 8.39481 19.3024 8.54132C19.4489 8.68784 19.5312 8.88655 19.5312 9.09375C19.5312 9.30095 19.4489 9.49966 19.3024 9.64618C19.1559 9.79269 18.9572 9.875 18.75 9.875Z"
                                fill="#545454"
                              />
                            </svg>
                          </Link>
                        </div>

                        <div className="notify-icon-top">
                          <Dropdown>
                            <Dropdown.Toggle
                              variant="success"
                              id="dropdown-basic"
                              className={`icon-button ${
                                currentPath === "/notifications" ? "active" : ""
                              }`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="21"
                                height="26"
                                viewBox="0 0 21 26"
                                fill="none"
                              >
                                <path
                                  d="M10.7407 0.533036C10.9321 0.580711 11.1105 0.678977 11.2464 0.821152C11.5771 1.16734 11.6295 1.69679 11.5519 2.16751C11.5268 2.32004 11.4971 2.49803 11.6034 2.61098C11.6736 2.68553 11.7826 2.70642 11.8837 2.72548C14.808 3.2771 17.2583 5.76233 17.7492 8.67445C18.092 10.7083 17.5604 12.8497 18.1463 14.8281C18.4611 15.8911 19.0885 16.8475 19.8669 17.6421C20.2443 18.0273 20.6694 18.3939 20.8778 18.8897C21.1996 19.6549 20.8629 20.6329 20.1365 21.0431C19.6173 21.3363 18.9889 21.3439 18.3913 21.3439C13.1279 21.3433 7.86446 21.3427 2.60104 21.3421C2.00206 21.3421 1.37153 21.334 0.852597 21.0372C0.175092 20.6496 -0.165535 19.7649 0.0791525 19.028C0.287922 18.3993 0.835279 17.9541 1.29158 17.471C2.11798 16.5962 2.70144 15.4979 2.9616 14.3272C3.25217 13.0198 3.14275 11.6631 3.14845 10.3243C3.14892 10.215 3.1503 10.1058 3.15277 9.99648C3.15528 9.88617 3.15893 9.7759 3.16401 9.66573C3.16909 9.55532 3.17554 9.44496 3.18361 9.33474C3.19167 9.22456 3.2014 9.11448 3.21302 9.00459C3.2246 8.89494 3.23808 8.78547 3.25369 8.67633C3.26925 8.56757 3.28695 8.45909 3.30706 8.35104C3.32709 8.24345 3.34953 8.13629 3.37463 8.02974C3.39964 7.92367 3.42725 7.8182 3.45781 7.71353C3.48827 7.60924 3.52158 7.5058 3.55806 7.40349C3.59446 7.30136 3.63398 7.20027 3.67687 7.10064C3.71976 7.00091 3.76598 6.9026 3.81566 6.80603C3.86552 6.70903 3.9189 6.61383 3.97584 6.52074C3.98832 6.50031 4.00288 6.48059 4.00877 6.45711C4.01408 6.43607 4.02054 6.41828 4.03116 6.39913C4.05479 6.35649 4.0789 6.31408 4.10343 6.27192C4.15249 6.18767 4.2033 6.10442 4.25578 6.02225C4.30826 5.94013 4.36249 5.85904 4.41834 5.77908C4.47418 5.69912 4.53164 5.62034 4.59067 5.54269C4.64969 5.46503 4.71033 5.3886 4.77244 5.31335C4.83455 5.2381 4.89822 5.16407 4.96327 5.09131C5.02837 5.01855 5.09489 4.94706 5.16284 4.87689C5.23078 4.80672 5.3001 4.73782 5.37075 4.67034C5.4414 4.6028 5.51338 4.53668 5.58664 4.47192C5.6599 4.40716 5.73439 4.34382 5.81012 4.28188C5.88585 4.22 5.96276 4.15952 6.04086 4.10055C6.11891 4.04158 6.19815 3.98412 6.27848 3.92816C6.35876 3.87221 6.44018 3.81785 6.52259 3.765C6.60501 3.71219 6.68842 3.66094 6.77283 3.61134C6.85724 3.56174 6.9426 3.51378 7.02886 3.46747C7.11512 3.42116 7.20228 3.37655 7.2903 3.33362C7.37831 3.2907 7.46718 3.24952 7.55681 3.21009C7.64644 3.17065 7.73687 3.133 7.82802 3.09714C7.91917 3.06127 8.01103 3.02725 8.10355 2.99506C8.19607 2.96287 8.28926 2.93251 8.38302 2.90409C8.47682 2.87566 8.5712 2.84912 8.66609 2.8245C8.76103 2.79989 8.8565 2.77725 8.95234 2.75659C8.95856 2.75523 8.96482 2.75391 8.97104 2.75259C9.07632 2.73024 9.18531 2.70882 9.27437 2.64882C9.60935 2.4232 9.42729 1.91573 9.43612 1.51419C9.44513 1.1048 9.72204 0.713615 10.1072 0.566168C10.3082 0.489221 10.5321 0.481032 10.7407 0.533036Z"
                                  fill="#545454"
                                />
                                <path
                                  d="M6.66659 22.3833C9.23412 22.3833 11.7833 22.3833 14.3338 22.3833C14.1522 23.7238 12.7879 25.4002 10.6932 25.4957C8.47952 25.5966 6.90487 23.9132 6.66659 22.3833Z"
                                  fill="#545454"
                                />
                              </svg>
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <div className="notify-data-viwe">
                                <div className="mb-4">
                                  <h3 className="text-xl font-bold text-gray-400">
                                    Notifications
                                  </h3>
                                </div>
                                <ul className="overflow-y-auto">
                                  {notificationDetail?.map((notification) => (
                                    <li
                                      key={notification?._id}
                                      className="mb-1 pb-1 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex justify-between items-center">
                                        <h4 className="text-lg font-semibold text-gray-700">
                                          {notification?.title}
                                        </h4>
                                        <span className="text-sm text-gray-500">
                                          {formatTime(notification?.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-gray-600 mt-1">
                                        {notification?.message}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>

                        <div className="user-img-top">
                          <Dropdown>
                            <Dropdown.Toggle
                              variant="success"
                              id="dropdown-basic"
                            >
                              <div className="drop-pro-view ">
                                <img
                                  src={
                                    customerDetails?.profile_image
                                      ? ImagePathCustomer(
                                          customerDetails?.profile_image
                                        )
                                      : require("../../Assets/Images/my-profile.svg")
                                          .default
                                  }
                                />
                              </div>
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <div className="drop-profile-viwe">
                                <img
                                  src={
                                    customerDetails?.profile_image
                                      ? ImagePathCustomer(
                                          customerDetails?.profile_image
                                        )
                                      : require("../../Assets/Images/my-profile.svg")
                                          .default
                                  }
                                />
                                <div>
                                  <h2>{customerDetails?.full_name || "N/A"}</h2>
                                  <p
                                    onClick={() =>
                                      role == Roles.SERVICE_PROVIDER ||  role == Roles.CORPORATE  
                                        ? Navigate(`/edit-profile-company`)
                                        : Navigate(`/edit-profile`)
                                    }
                                    style={{ cursor: "pointer" }}
                                  >
                                    Edit Profile
                                  </p>
                                </div>
                              </div>
                              <div className="nav-profile-menu">
                                {/* ======================== Role = 2 ( Service ) */}
                                {role == Roles.SERVICE_PROVIDER ? (
                                  <>
                                    <div>
                                      <div className="avail-toggle">
                                        Notification
                                        <Form.Check
                                          type="switch"
                                          checked={isNotificationsEnabled}
                                          onChange={handleToggleChange}
                                          // disabled={isTokenLoading}
                                          // label={isTokenLoading ? "Loading..." : ""}
                                        />
                                      </div>
                                    </div>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/training-material"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/training-material"
                                    >
                                      Training Material
                                    </Link>
                                    <Dropdown.Divider />

                                    <Link
                                      className={
                                        currentPath === "/community"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/community"
                                    >
                                      Community
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/my-stats"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/my-stats"
                                    >
                                      My Stats
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/payment"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/payment"
                                    >
                                      Payment / Subscription
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/wallet"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/wallet"
                                    >
                                      My Wallet
                                    </Link>
                                    <Dropdown.Divider />

                                    <Link
                                      className={
                                        currentPath === "/customerreviews"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/customerreviews"
                                    >
                                      Customer Reviews
                                    </Link>
                                    <Dropdown.Divider />
                                    {/* <button
                                                   // onClick={() => Navigate("/change-password")}
                                                   >
                                                     Language
                                                   </button>
                                                   <Dropdown.Divider />  */}
                                  </>
                                ) : role == Roles.CORPORATE ? (
                                  <>
                                    <div>
                                      <div className="avail-toggle">
                                        Notification
                                        <Form.Check
                                          type="switch"
                                          checked={isNotificationsEnabled}
                                          onChange={handleToggleChange}
                                          // disabled={isTokenLoading}
                                          // label={isTokenLoading ? "Loading..." : ""}
                                        />
                                      </div>
                                    </div>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/training-material"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/training-material"
                                    >
                                      Training Material
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/my-stats"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/my-stats"
                                    >
                                      My Stats
                                    </Link>
                                    <Dropdown.Divider />

                                    <Link
                                      className={
                                        currentPath === "/community"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/community"
                                    >
                                      Community
                                    </Link>

                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/customerreviews"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/customerreviews"
                                    >
                                      Customer Reviews
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/corporate/subscription-plan"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/corporate/subscription-plan"
                                    >
                                      Payment / Subscription
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/wallet"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/wallet"
                                    >
                                      My Wallet
                                    </Link>
                                    <Dropdown.Divider />
                                  </>
                                ) : (
                                  <>
                                    <Link
                                      className={
                                        currentPath ===
                                        (role == Roles.CORPORATE
                                          ? "/corporate/leads"
                                          : "/bookings")
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to={
                                        role == Roles.CORPORATE
                                          ? "/corporate/leads"
                                          : "/bookings"
                                      }
                                    >
                                      {role === Roles.CORPORATE
                                        ? "Leads"
                                        : "Bookings"}
                                    </Link>

                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/community"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/community"
                                    >
                                      Community
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={
                                        currentPath === "/my-task"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/my-task"
                                    >
                                      My Tasks
                                    </Link>
                                    <Dropdown.Divider />
                                  </>
                                )}
                                {/* =============================================== */}
                                {role == Roles.CUSTOMER && (
                                  <>
                                    <Link
                                      className={
                                        currentPath === "/change-password"
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to="/product-history"
                                    >
                                      Product History
                                    </Link>
                                    <Dropdown.Divider />
                                  </>
                                )}

                                <Link
                                  className={
                                    currentPath === "/change-password"
                                      ? "nav-link active"
                                      : "nav-link"
                                  }
                                  to="/change-password"
                                >
                                  Change Password
                                </Link>
                                <Dropdown.Divider />
                                <button onClick={() => setIsDeleteModal(true)}>
                                  Delete account
                                </button>
                                <Dropdown.Divider />
                                <button
                                  type="button"
                                  onClick={() => setShowLogoutModal(true)}
                                >
                                  <div style={{ color: "#FF2121" }}>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="20"
                                      height="20"
                                      viewBox="0 0 20 20"
                                      fill="none"
                                    >
                                      <path
                                        d="M1.66732 18.3346C1.20708 18.3346 0.833984 17.9616 0.833984 17.5013V2.5013C0.833984 2.04107 1.20708 1.66797 1.66732 1.66797H13.334C13.7942 1.66797 14.1673 2.04107 14.1673 2.5013V5.0013H12.5007V3.33464H2.50065V16.668H12.5007V15.0013H14.1673V17.5013C14.1673 17.9616 13.7942 18.3346 13.334 18.3346H1.66732Z"
                                        fill="#FF2121"
                                      />
                                      <path
                                        d="M12.5013 10.8346V13.3346L16.668 10.0013L12.5013 6.66797V9.16797H6.66797V10.8346H12.5013Z"
                                        fill="#FF2121"
                                      />
                                    </svg>
                                    Log out
                                  </div>
                                </button>
                              </div>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </div>
                    </>
                  )}
                </Navbar.Collapse>
              )}
            </Container>
          </Navbar>
        </Container>
      </div>

      {/* Delete Account start  */}

      <DeleteAccountModal
        isDeleteModal={isDeleteModal}
        setIsDeleteModal={setIsDeleteModal}
      />

      {/* Log Out start  */}

      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        centered
      >
        <Modal.Body>
          <div className="comman-small-pop">
            <div className="center-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="60"
                height="60"
                viewBox="0 0 60 60"
                fill="none"
              >
                <path
                  d="M5.00195 55.0039C3.62125 55.0039 2.50195 53.8847 2.50195 52.5039V7.50391C2.50195 6.12321 3.62125 5.00391 5.00195 5.00391H40.002C41.3827 5.00391 42.502 6.12321 42.502 7.50391V15.0039H37.502V10.0039H7.50195V50.0039H37.502V45.0039H42.502V52.5039C42.502 53.8847 41.3827 55.0039 40.002 55.0039H5.00195Z"
                  fill="#C10C00"
                />
                <path
                  d="M37.5039 32.5039V40.0039L50.0039 30.0039L37.5039 20.0039V27.5039H20.0039V32.5039H37.5039Z"
                  fill="#C10C00"
                />
              </svg>
            </div>
            <h3 className="mb-2">Log Out</h3>
            <p>Are you sure to Log Out? </p>
            <div className="comman-pop-action-double logout-action">
              <button className="btn-fill-danger" onClick={handleLogout}>
                Log Out
              </button>
              <button
                className="btn-outline"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Log Out end  */}

      {/* stripe */}
      <Modal
        show={showPlanModal}
        onHide={() => setShowPlanModal(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body>
          <div className="comman-small-pop">
            <h2 className="mb-2">Upgrade Plan</h2>
            <p style={{ color: "#d17f00" }}>{showPlanModalMessage} </p>

            <div className="download-app-section mt-5">
              <h3>Download our app</h3>
              <ul className="feature-list">
                <li>
                  <span className="checkmark">
                    <svg
                      width="22"
                      height="23"
                      viewBox="0 0 22 23"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M0.25 11.5C0.25 17.4371 5.06294 22.25 11 22.25C16.9371 22.25 21.75 17.4371 21.75 11.5C21.75 5.56294 16.9371 0.75 11 0.75C5.06294 0.75 0.25 5.56294 0.25 11.5ZM15.6757 7.76285C16.0828 8.13604 16.1103 8.76861 15.7372 9.17573L10.2372 15.1757C10.0528 15.3768 9.7944 15.4938 9.5217 15.4998C9.249 15.5057 8.98576 15.4 8.79289 15.2071L6.29289 12.7071C5.90237 12.3166 5.90237 11.6834 6.29289 11.2929C6.68342 10.9024 7.31658 10.9024 7.70711 11.2929L9.4686 13.0544L14.2628 7.82428C14.636 7.41716 15.2686 7.38966 15.6757 7.76285Z"
                        fill="black"
                      />
                    </svg>
                  </span>{" "}
                  Unlock exclusive features and enjoy access by subscribing to a
                  plan that fits your needs.
                </li>
                <li>
                  <span className="checkmark">
                    <svg
                      width="22"
                      height="23"
                      viewBox="0 0 22 23"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M0.25 11.5C0.25 17.4371 5.06294 22.25 11 22.25C16.9371 22.25 21.75 17.4371 21.75 11.5C21.75 5.56294 16.9371 0.75 11 0.75C5.06294 0.75 0.25 5.56294 0.25 11.5ZM15.6757 7.76285C16.0828 8.13604 16.1103 8.76861 15.7372 9.17573L10.2372 15.1757C10.0528 15.3768 9.7944 15.4938 9.5217 15.4998C9.249 15.5057 8.98576 15.4 8.79289 15.2071L6.29289 12.7071C5.90237 12.3166 5.90237 11.6834 6.29289 11.2929C6.68342 10.9024 7.31658 10.9024 7.70711 11.2929L9.4686 13.0544L14.2628 7.82428C14.636 7.41716 15.2686 7.38966 15.6757 7.76285Z"
                        fill="black"
                      />
                    </svg>
                  </span>{" "}
                  Our secure, quick, and hassle-free payment process ensures a
                  smooth experience to users every time.
                </li>
                <li>
                  <span className="checkmark">
                    <svg
                      width="22"
                      height="23"
                      viewBox="0 0 22 23"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M0.25 11.5C0.25 17.4371 5.06294 22.25 11 22.25C16.9371 22.25 21.75 17.4371 21.75 11.5C21.75 5.56294 16.9371 0.75 11 0.75C5.06294 0.75 0.25 5.56294 0.25 11.5ZM15.6757 7.76285C16.0828 8.13604 16.1103 8.76861 15.7372 9.17573L10.2372 15.1757C10.0528 15.3768 9.7944 15.4938 9.5217 15.4998C9.249 15.5057 8.98576 15.4 8.79289 15.2071L6.29289 12.7071C5.90237 12.3166 5.90237 11.6834 6.29289 11.2929C6.68342 10.9024 7.31658 10.9024 7.70711 11.2929L9.4686 13.0544L14.2628 7.82428C14.636 7.41716 15.2686 7.38966 15.6757 7.76285Z"
                        fill="black"
                      />
                    </svg>
                  </span>{" "}
                  Choose from flexible subscription options and enhance the way
                  you use our platform.
                </li>
                <li>
                  <span className="checkmark">
                    <svg
                      width="22"
                      height="23"
                      viewBox="0 0 22 23"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M0.25 11.5C0.25 17.4371 5.06294 22.25 11 22.25C16.9371 22.25 21.75 17.4371 21.75 11.5C21.75 5.56294 16.9371 0.75 11 0.75C5.06294 0.75 0.25 5.56294 0.25 11.5ZM15.6757 7.76285C16.0828 8.13604 16.1103 8.76861 15.7372 9.17573L10.2372 15.1757C10.0528 15.3768 9.7944 15.4938 9.5217 15.4998C9.249 15.5057 8.98576 15.4 8.79289 15.2071L6.29289 12.7071C5.90237 12.3166 5.90237 11.6834 6.29289 11.2929C6.68342 10.9024 7.31658 10.9024 7.70711 11.2929L9.4686 13.0544L14.2628 7.82428C14.636 7.41716 15.2686 7.38966 15.6757 7.76285Z"
                        fill="black"
                      />
                    </svg>
                  </span>{" "}
                  Download the Simba Tracker App now! Enjoy uninterrupted,
                  high-quality services—anytime, anywhere.
                </li>
              </ul>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div className="app-store-buttons mt-5">
                  <a
                    href="https://apps.apple.com/in/app/simbatasker/id6736746247"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      width="156"
                      height="53"
                      viewBox="0 0 156 53"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M143.175 0.500169H12.3951C11.9184 0.500169 11.4474 0.500169 10.9719 0.502769C10.5739 0.505369 10.1791 0.512922 9.7773 0.519279C8.90437 0.529551 8.03349 0.606348 7.17223 0.749002C6.31218 0.894761 5.47907 1.16956 4.70109 1.5641C3.92405 1.96198 3.21405 2.47899 2.59684 3.09636C1.97639 3.712 1.4592 4.42359 1.06516 5.20378C0.67002 5.98241 0.396033 6.81679 0.252655 7.67809C0.107914 8.53831 0.0300279 9.40845 0.019695 10.2807C0.007631 10.6793 0.006357 11.0792 0 11.4778V41.5263C0.006357 41.93 0.007631 42.321 0.019695 42.7248C0.0300311 43.597 0.107917 44.4671 0.252655 45.3273C0.395637 46.1891 0.669641 47.024 1.06516 47.8029C1.45902 48.5805 1.97629 49.2893 2.59684 49.9015C3.21171 50.5216 3.92217 51.0389 4.70109 51.4338C5.47907 51.8294 6.31209 52.1058 7.17223 52.2538C8.03364 52.3953 8.90442 52.4722 9.7773 52.4837C10.1791 52.4925 10.5739 52.4976 10.9719 52.4976C11.4474 52.5002 11.9184 52.5002 12.3951 52.5002H143.175C143.642 52.5002 144.117 52.5002 144.584 52.4976C144.981 52.4976 145.387 52.4925 145.783 52.4837C146.654 52.4728 147.523 52.3959 148.383 52.2538C149.246 52.1048 150.082 51.8284 150.864 51.4338C151.642 51.0387 152.352 50.5214 152.966 49.9015C153.585 49.2869 154.103 48.5787 154.502 47.8029C154.895 47.0234 155.166 46.1886 155.307 45.3273C155.452 44.467 155.532 43.5971 155.548 42.7248C155.553 42.321 155.553 41.93 155.553 41.5263C155.563 41.0541 155.563 40.5844 155.563 40.1044V12.8971C155.563 12.4211 155.563 11.9488 155.553 11.4778C155.553 11.0792 155.553 10.6793 155.548 10.2806C155.532 9.40832 155.452 8.53837 155.307 7.67804C155.166 6.81723 154.894 5.98292 154.502 5.20372C153.7 3.63992 152.427 2.367 150.864 1.56398C150.082 1.17041 149.246 0.895682 148.383 0.748885C147.523 0.605603 146.654 0.528779 145.783 0.519097C145.387 0.512753 144.981 0.505135 144.584 0.5026C144.117 0.5 143.642 0.5 143.175 0.5V0.500169Z"
                        fill="#A6A6A6"
                      />
                      <path
                        d="M10.9801 51.3617C10.584 51.3617 10.1975 51.3566 9.80451 51.3478C8.99042 51.3372 8.17824 51.2663 7.37463 51.1358C6.62529 51.0067 5.89939 50.7667 5.22086 50.4235C4.54856 50.0832 3.93536 49.637 3.40476 49.1019C2.86649 48.5732 2.41835 47.9599 2.0781 47.2865C1.73411 46.6086 1.49604 45.8821 1.3722 45.1321C1.23846 44.3263 1.1661 43.5114 1.15575 42.6946C1.14751 42.4204 1.13672 41.5076 1.13672 41.5076V11.4769C1.13672 11.4769 1.14821 10.578 1.15582 10.314C1.16573 9.49845 1.23767 8.68487 1.371 7.88027C1.49508 7.12824 1.73332 6.39959 2.0775 5.71954C2.4165 5.04655 2.86215 4.43284 3.39718 3.9022C3.93162 3.36653 4.54678 2.918 5.22023 2.57299C5.89719 2.23094 6.62172 1.99257 7.36954 1.86587C8.1758 1.73401 8.9908 1.66271 9.80771 1.65259L10.9807 1.63672H144.58L145.767 1.65323C146.576 1.66285 147.384 1.7335 148.183 1.8646C148.938 1.99289 149.67 2.23292 150.355 2.5768C151.704 3.2721 152.802 4.37213 153.494 5.72271C153.833 6.39807 154.068 7.12078 154.19 7.86631C154.325 8.67751 154.401 9.49748 154.416 10.3197C154.42 10.6878 154.42 11.0833 154.42 11.4769C154.43 11.9644 154.43 12.4284 154.43 12.8962V40.1035C154.43 40.5757 154.43 41.0366 154.42 41.5012C154.42 41.924 154.42 42.3112 154.415 42.7098C154.4 43.5174 154.325 44.3227 154.193 45.1194C154.071 45.8748 153.835 46.607 153.491 47.2904C153.148 47.9565 152.702 48.5645 152.17 49.0918C151.639 49.6297 151.025 50.0785 150.351 50.421C149.668 50.7668 148.937 51.0078 148.183 51.1358C147.379 51.267 146.567 51.3379 145.753 51.3478C145.372 51.3566 144.973 51.3617 144.586 51.3617L143.177 51.3643L10.9801 51.3617Z"
                        fill="black"
                      />
                      <path
                        d="M32.2014 26.89C32.2153 25.805 32.5035 24.7411 33.0392 23.7973C33.5748 22.8536 34.3405 22.0607 35.2649 21.4924C34.6776 20.6537 33.9029 19.9634 33.0022 19.4765C32.1015 18.9896 31.0997 18.7194 30.0764 18.6874C27.8934 18.4582 25.777 19.9937 24.6646 19.9937C23.5307 19.9937 21.8179 18.7101 19.9735 18.7481C18.7806 18.7866 17.6179 19.1335 16.5989 19.755C15.5798 20.3765 14.7392 21.2513 14.1588 22.2943C11.6446 26.6472 13.5199 33.0446 15.9283 36.5632C17.1333 38.2862 18.5415 40.2107 20.3842 40.1425C22.1874 40.0677 22.8609 38.9927 25.0375 38.9927C27.1938 38.9927 27.8257 40.1425 29.7058 40.0991C31.6406 40.0677 32.8597 38.3685 34.0224 36.6292C34.8882 35.4016 35.5544 34.0447 35.9964 32.609C34.8722 32.1335 33.9129 31.3377 33.2381 30.3207C32.5632 29.3037 32.2027 28.1106 32.2014 26.89Z"
                        fill="white"
                      />
                      <path
                        d="M28.6502 16.3737C29.7052 15.1073 30.2249 13.4794 30.0991 11.8359C28.4873 12.0052 26.9985 12.7756 25.9292 13.9934C25.4064 14.5884 25.0061 15.2806 24.7509 16.0304C24.4958 16.7802 24.391 17.5729 24.4424 18.3632C25.2486 18.3715 26.0461 18.1968 26.775 17.8522C27.5039 17.5076 28.145 17.0021 28.6502 16.3737Z"
                        fill="white"
                      />
                      <path
                        d="M54.9953 35.782H48.8419L47.3642 40.1454H44.7578L50.5862 24.002H53.2941L59.1226 40.1454H56.4718L54.9953 35.782ZM49.4792 33.7685H54.3568L51.9523 26.687H51.885L49.4792 33.7685Z"
                        fill="white"
                      />
                      <path
                        d="M71.7119 34.2609C71.7119 37.9184 69.7542 40.2683 66.8 40.2683C66.0517 40.3074 65.3074 40.1351 64.6525 39.7709C63.9976 39.4067 63.4584 38.8654 63.0968 38.2091H63.0409V44.0388H60.625V28.3753H62.9635V30.3329H63.008C63.3862 29.6797 63.9344 29.1413 64.5944 28.7749C65.2543 28.4085 66.0012 28.2278 66.7556 28.2522C69.7428 28.2522 71.7119 30.6135 71.7119 34.2609ZM69.2286 34.2609C69.2286 31.878 67.9972 30.3114 66.1183 30.3114C64.2724 30.3114 63.0308 31.911 63.0308 34.2609C63.0308 36.6324 64.2724 38.2205 66.1183 38.2205C67.9972 38.2205 69.2286 36.6654 69.2286 34.2609Z"
                        fill="white"
                      />
                      <path
                        d="M84.665 34.2609C84.665 37.9184 82.7074 40.2683 79.7532 40.2683C79.0048 40.3074 78.2606 40.135 77.6056 39.7709C76.9507 39.4067 76.4116 38.8654 76.0499 38.2091H75.994V44.0388H73.5781V28.3753H75.9166V30.3329H75.961C76.3393 29.6797 76.8875 29.1413 77.5474 28.7749C78.2074 28.4085 78.9543 28.2278 79.7087 28.2522C82.6959 28.2522 84.665 30.6135 84.665 34.2609ZM82.1818 34.2609C82.1818 31.878 80.9503 30.3113 79.0714 30.3113C77.2255 30.3113 75.9839 31.911 75.9839 34.2609C75.9839 36.6323 77.2255 38.2205 79.0714 38.2205C80.9503 38.2205 82.1818 36.6654 82.1818 34.2609H82.1818Z"
                        fill="white"
                      />
                      <path
                        d="M93.227 35.647C93.406 37.2479 94.9612 38.299 97.0864 38.299C99.1227 38.299 100.588 37.2479 100.588 35.8044C100.588 34.5514 99.7041 33.8011 97.612 33.2869L95.5198 32.7829C92.5554 32.0669 91.1792 30.6806 91.1792 28.431C91.1792 25.6456 93.6066 23.7324 97.0534 23.7324C100.465 23.7324 102.803 25.6456 102.882 28.431H100.443C100.297 26.8199 98.9652 25.8475 97.0191 25.8475C95.0729 25.8475 93.7411 26.8314 93.7411 28.2634C93.7411 29.4047 94.5917 30.0763 96.6725 30.5904L98.4511 31.0271C101.763 31.8104 103.139 33.1409 103.139 35.5022C103.139 38.5224 100.734 40.414 96.9073 40.414C93.3272 40.414 90.9101 38.5669 90.7539 35.6469L93.227 35.647Z"
                        fill="white"
                      />
                      <path
                        d="M108.354 25.5898V28.3752H110.592V30.2884H108.354V36.777C108.354 37.785 108.802 38.2547 109.786 38.2547C110.051 38.2501 110.317 38.2314 110.58 38.1988V40.1005C110.138 40.1832 109.688 40.2206 109.238 40.2123C106.855 40.2123 105.926 39.3172 105.926 37.0346V30.2884H104.215V28.3752H105.926V25.5898H108.354Z"
                        fill="white"
                      />
                      <path
                        d="M111.887 34.2607C111.887 30.5575 114.068 28.2305 117.469 28.2305C120.881 28.2305 123.052 30.5575 123.052 34.2607C123.052 37.9741 120.893 40.291 117.469 40.291C114.046 40.291 111.887 37.9741 111.887 34.2607ZM120.591 34.2607C120.591 31.7204 119.426 30.2211 117.469 30.2211C115.511 30.2211 114.348 31.7318 114.348 34.2607C114.348 36.8112 115.511 38.2991 117.469 38.2991C119.426 38.2991 120.591 36.8112 120.591 34.2607H120.591Z"
                        fill="white"
                      />
                      <path
                        d="M125.043 28.3752H127.347V30.3785H127.403C127.559 29.7528 127.926 29.1999 128.441 28.8127C128.957 28.4254 129.59 28.2274 130.234 28.252C130.513 28.2511 130.79 28.2813 131.062 28.3422V30.602C130.71 30.4946 130.344 30.4452 129.976 30.456C129.625 30.4417 129.276 30.5036 128.951 30.6374C128.626 30.7711 128.334 30.9736 128.095 31.2308C127.856 31.4881 127.675 31.794 127.565 32.1277C127.455 32.4614 127.419 32.8149 127.459 33.1639V40.145H125.043L125.043 28.3752Z"
                        fill="white"
                      />
                      <path
                        d="M142.203 36.6881C141.878 38.8247 139.797 40.291 137.135 40.291C133.711 40.291 131.586 37.997 131.586 34.3166C131.586 30.6248 133.723 28.2305 137.033 28.2305C140.29 28.2305 142.338 30.4674 142.338 34.036V34.8638H134.025V35.0098C133.986 35.4429 134.041 35.8793 134.184 36.2899C134.327 36.7005 134.556 37.0759 134.855 37.3912C135.155 37.7065 135.518 37.9545 135.921 38.1187C136.323 38.2829 136.756 38.3595 137.191 38.3435C137.762 38.397 138.335 38.2648 138.824 37.9665C139.314 37.6683 139.695 37.2199 139.909 36.6881L142.203 36.6881ZM134.036 33.1753H139.92C139.942 32.7858 139.883 32.3961 139.747 32.0305C139.611 31.6649 139.401 31.3314 139.13 31.0509C138.859 30.7704 138.532 30.549 138.172 30.4005C137.811 30.252 137.423 30.1797 137.033 30.1881C136.64 30.1857 136.25 30.2613 135.886 30.4105C135.522 30.5597 135.191 30.7794 134.912 31.0572C134.634 31.3349 134.413 31.6651 134.262 32.0286C134.112 32.3921 134.035 32.7819 134.036 33.1753V33.1753Z"
                        fill="white"
                      />
                      <path
                        d="M49.1729 11.8506C49.6794 11.8143 50.1877 11.8908 50.661 12.0746C51.1344 12.2585 51.561 12.5451 51.9102 12.9138C52.2593 13.2825 52.5223 13.7242 52.6801 14.2068C52.838 14.6895 52.8867 15.2011 52.8228 15.7049C52.8228 18.183 51.4835 19.6075 49.1729 19.6075H46.3711V11.8506H49.1729ZM47.5759 18.5105H49.0384C49.4003 18.5321 49.7625 18.4728 50.0986 18.3368C50.4347 18.2008 50.7362 17.9916 50.9813 17.7243C51.2263 17.4571 51.4087 17.1386 51.5151 16.792C51.6215 16.4454 51.6493 16.0794 51.5965 15.7207C51.6455 15.3634 51.6149 14.9997 51.5068 14.6556C51.3988 14.3116 51.216 13.9957 50.9715 13.7306C50.727 13.4655 50.4269 13.2577 50.0927 13.1222C49.7585 12.9867 49.3984 12.9268 49.0384 12.9468H47.5759V18.5105Z"
                        fill="white"
                      />
                      <path
                        d="M54.1849 16.6779C54.1481 16.2932 54.1921 15.9051 54.3141 15.5384C54.4361 15.1717 54.6334 14.8346 54.8933 14.5486C55.1533 14.2626 55.4701 14.0341 55.8235 13.8778C56.1769 13.7214 56.5591 13.6406 56.9455 13.6406C57.332 13.6406 57.7142 13.7214 58.0676 13.8778C58.421 14.0341 58.7378 14.2626 58.9977 14.5486C59.2577 14.8346 59.4549 15.1717 59.5769 15.5384C59.6989 15.9051 59.7429 16.2932 59.7061 16.6779C59.7436 17.063 59.7001 17.4517 59.5785 17.819C59.4568 18.1862 59.2596 18.524 58.9996 18.8105C58.7397 19.0971 58.4226 19.3261 58.0688 19.4828C57.7151 19.6395 57.3324 19.7204 56.9455 19.7204C56.5586 19.7204 56.176 19.6395 55.8222 19.4828C55.4685 19.3261 55.1514 19.0971 54.8914 18.8105C54.6314 18.524 54.4343 18.1862 54.3126 17.819C54.1909 17.4517 54.1474 17.063 54.1849 16.6779ZM58.5178 16.6779C58.5178 15.409 57.9478 14.667 56.9474 14.667C55.9432 14.667 55.3783 15.409 55.3783 16.6779C55.3783 17.957 55.9433 18.6933 56.9474 18.6933C57.9478 18.6933 58.5178 17.9519 58.5178 16.6779H58.5178Z"
                        fill="white"
                      />
                      <path
                        d="M67.0441 19.6077H65.8457L64.6358 15.2964H64.5444L63.3397 19.6077H62.1526L60.5391 13.7539H61.7108L62.7595 18.2207H62.8458L64.0493 13.7539H65.1576L66.3611 18.2207H66.4525L67.4961 13.7539H68.6514L67.0441 19.6077Z"
                        fill="white"
                      />
                      <path
                        d="M70.0078 13.7535H71.1199V14.6835H71.2063C71.3527 14.3495 71.5997 14.0695 71.9128 13.8825C72.226 13.6956 72.5896 13.611 72.9531 13.6405C73.238 13.6191 73.524 13.6621 73.7899 13.7662C74.0559 13.8703 74.2951 14.0329 74.4896 14.242C74.6842 14.4511 74.8293 14.7013 74.914 14.9741C74.9988 15.2469 75.0211 15.5352 74.9793 15.8178V19.6073H73.824V16.1079C73.824 15.1672 73.4152 14.6993 72.5608 14.6993C72.3675 14.6903 72.1744 14.7232 71.9949 14.7958C71.8155 14.8684 71.6538 14.9789 71.521 15.1198C71.3883 15.2607 71.2876 15.4287 71.2258 15.6121C71.164 15.7956 71.1426 15.9903 71.1631 16.1828V19.6073H70.0078L70.0078 13.7535Z"
                        fill="white"
                      />
                      <path
                        d="M76.8203 11.4688H77.9756V19.6077H76.8203V11.4688Z"
                        fill="white"
                      />
                      <path
                        d="M79.5833 16.678C79.5466 16.2933 79.5906 15.9051 79.7126 15.5384C79.8346 15.1717 80.032 14.8346 80.2919 14.5486C80.5519 14.2626 80.8687 14.0341 81.2221 13.8778C81.5756 13.7214 81.9578 13.6406 82.3443 13.6406C82.7307 13.6406 83.1129 13.7214 83.4664 13.8778C83.8198 14.0341 84.1366 14.2626 84.3966 14.5486C84.6565 14.8346 84.8539 15.1717 84.9759 15.5384C85.0979 15.9051 85.1419 16.2933 85.1052 16.678C85.1426 17.0631 85.0991 17.4518 84.9774 17.8191C84.8557 18.1864 84.6585 18.5241 84.3985 18.8107C84.1384 19.0972 83.8214 19.3262 83.4676 19.4828C83.1138 19.6395 82.7312 19.7205 82.3443 19.7205C81.9573 19.7205 81.5747 19.6395 81.2209 19.4828C80.8671 19.3262 80.5501 19.0972 80.29 18.8107C80.03 18.5241 79.8328 18.1864 79.7111 17.8191C79.5894 17.4518 79.5459 17.0631 79.5833 16.678ZM83.9162 16.678C83.9162 15.4091 83.3462 14.6671 82.3458 14.6671C81.3416 14.6671 80.7767 15.4091 80.7767 16.678C80.7767 17.9571 81.3417 18.6934 82.3458 18.6934C83.3462 18.6934 83.9162 17.952 83.9162 16.678H83.9162Z"
                        fill="white"
                      />
                      <path
                        d="M86.3203 17.9519C86.3203 16.8982 87.1049 16.2908 88.4975 16.2044L90.0832 16.113V15.6078C90.0832 14.9895 89.6744 14.6404 88.8848 14.6404C88.2398 14.6404 87.793 14.8771 87.6647 15.291H86.5463C86.6644 14.2855 87.6102 13.6406 88.9381 13.6406C90.4057 13.6406 91.2334 14.3712 91.2334 15.6078V19.6074H90.1213V18.7848H90.0299C89.8444 19.0799 89.5838 19.3204 89.2749 19.4819C88.966 19.6434 88.6198 19.72 88.2716 19.7039C88.0258 19.7294 87.7775 19.7032 87.5425 19.6269C87.3075 19.5506 87.0911 19.4259 86.9073 19.2608C86.7234 19.0958 86.5762 18.894 86.4751 18.6686C86.374 18.4431 86.3213 18.199 86.3203 17.9519ZM90.0832 17.4517V16.9623L88.6537 17.0538C87.8476 17.1077 87.4819 17.3819 87.4819 17.898C87.4819 18.4248 87.939 18.7314 88.5674 18.7314C88.7516 18.7501 88.9376 18.7315 89.1144 18.6768C89.2912 18.622 89.4552 18.5323 89.5966 18.4129C89.738 18.2935 89.854 18.1469 89.9376 17.9818C90.0212 17.8167 90.0707 17.6364 90.0832 17.4517Z"
                        fill="white"
                      />
                      <path
                        d="M92.75 16.6783C92.75 14.8286 93.7009 13.6568 95.1799 13.6568C95.5457 13.6399 95.9088 13.7276 96.2267 13.9094C96.5446 14.0913 96.8041 14.3599 96.975 14.6838H97.0613V11.4688H98.2166V19.6077H97.1096V18.6829H97.0182C96.8341 19.0046 96.5655 19.2698 96.2415 19.4499C95.9174 19.6299 95.5503 19.7178 95.1799 19.7042C93.6907 19.7042 92.75 18.5324 92.75 16.6783ZM93.9434 16.6783C93.9434 17.9199 94.5287 18.667 95.5075 18.667C96.4812 18.667 97.083 17.9091 97.083 16.6834C97.083 15.4634 96.4749 14.6946 95.5075 14.6946C94.535 14.6946 93.9434 15.4468 93.9434 16.6783H93.9434Z"
                        fill="white"
                      />
                      <path
                        d="M102.997 16.6779C102.961 16.2932 103.005 15.9051 103.127 15.5384C103.249 15.1717 103.446 14.8346 103.706 14.5486C103.966 14.2626 104.283 14.0341 104.636 13.8778C104.989 13.7214 105.372 13.6406 105.758 13.6406C106.144 13.6406 106.527 13.7214 106.88 13.8778C107.233 14.0341 107.55 14.2626 107.81 14.5486C108.07 14.8346 108.267 15.1717 108.389 15.5384C108.511 15.9051 108.555 16.2932 108.519 16.6779C108.556 17.063 108.513 17.4517 108.391 17.819C108.269 18.1862 108.072 18.524 107.812 18.8105C107.552 19.0971 107.235 19.3261 106.881 19.4828C106.528 19.6395 106.145 19.7204 105.758 19.7204C105.371 19.7204 104.988 19.6395 104.635 19.4828C104.281 19.3261 103.964 19.0971 103.704 18.8105C103.444 18.524 103.247 18.1862 103.125 17.819C103.003 17.4517 102.96 17.063 102.997 16.6779ZM107.33 16.6779C107.33 15.409 106.76 14.667 105.76 14.667C104.756 14.667 104.191 15.409 104.191 16.6779C104.191 17.957 104.756 18.6933 105.76 18.6933C106.76 18.6933 107.33 17.9519 107.33 16.6779Z"
                        fill="white"
                      />
                      <path
                        d="M110.07 13.7535H111.182V14.6835H111.269C111.415 14.3495 111.662 14.0695 111.975 13.8825C112.288 13.6956 112.652 13.611 113.016 13.6405C113.3 13.6191 113.586 13.6621 113.852 13.7662C114.118 13.8703 114.358 14.0329 114.552 14.242C114.747 14.4511 114.892 14.7013 114.977 14.9741C115.061 15.2469 115.084 15.5352 115.042 15.8178V19.6073H113.887V16.1079C113.887 15.1672 113.478 14.6993 112.623 14.6993C112.43 14.6903 112.237 14.7232 112.057 14.7958C111.878 14.8684 111.716 14.9789 111.584 15.1198C111.451 15.2607 111.35 15.4287 111.288 15.6121C111.226 15.7956 111.205 15.9903 111.226 16.1828V19.6073H110.07V13.7535Z"
                        fill="white"
                      />
                      <path
                        d="M121.57 12.2969V13.781H122.838V14.7541H121.57V17.7641C121.57 18.3773 121.823 18.6458 122.398 18.6458C122.545 18.6453 122.692 18.6364 122.838 18.6191V19.5814C122.631 19.6186 122.421 19.6383 122.21 19.6405C120.925 19.6405 120.414 19.1885 120.414 18.0599V14.754H119.484V13.7809H120.414V12.2969H121.57Z"
                        fill="white"
                      />
                      <path
                        d="M124.414 11.4688H125.559V14.6946H125.651C125.804 14.3575 126.058 14.0759 126.377 13.8883C126.697 13.7006 127.066 13.616 127.435 13.646C127.719 13.6306 128.002 13.6779 128.265 13.7845C128.528 13.8912 128.764 14.0546 128.957 14.263C129.149 14.4715 129.293 14.7198 129.379 14.9904C129.465 15.261 129.489 15.5471 129.451 15.8283V19.6077H128.295V16.1133C128.295 15.1783 127.86 14.7048 127.043 14.7048C126.845 14.6885 126.645 14.7158 126.458 14.7848C126.271 14.8537 126.102 14.9627 125.961 15.1041C125.821 15.2454 125.713 15.4157 125.645 15.6031C125.578 15.7905 125.552 15.9904 125.569 16.1889V19.6077H124.414L124.414 11.4688Z"
                        fill="white"
                      />
                      <path
                        d="M136.187 18.0269C136.031 18.562 135.69 19.0247 135.227 19.3343C134.763 19.6439 134.205 19.7806 133.651 19.7205C133.265 19.7307 132.882 19.6568 132.528 19.504C132.174 19.3512 131.857 19.1232 131.599 18.8357C131.342 18.5482 131.151 18.2082 131.038 17.8392C130.925 17.4703 130.894 17.0812 130.947 16.699C130.895 16.3157 130.927 15.9258 131.04 15.5557C131.152 15.1856 131.343 14.844 131.599 14.554C131.854 14.264 132.17 14.0324 132.523 13.8748C132.876 13.7173 133.259 13.6374 133.646 13.6407C135.275 13.6407 136.257 14.7535 136.257 16.5917V16.9948H132.124V17.0596C132.106 17.2744 132.133 17.4906 132.203 17.6944C132.273 17.8982 132.385 18.085 132.532 18.2429C132.679 18.4008 132.857 18.5263 133.055 18.6113C133.253 18.6963 133.467 18.739 133.683 18.7366C133.959 18.7698 134.239 18.72 134.487 18.5936C134.735 18.4673 134.94 18.27 135.075 18.0269L136.187 18.0269ZM132.124 16.1404H135.08C135.095 15.944 135.068 15.7466 135.002 15.5611C134.936 15.3756 134.831 15.2059 134.696 15.0631C134.56 14.9203 134.396 14.8075 134.214 14.7318C134.032 14.6562 133.836 14.6195 133.639 14.624C133.44 14.6215 133.241 14.659 133.056 14.7343C132.871 14.8096 132.703 14.9213 132.562 15.0626C132.421 15.2039 132.309 15.3721 132.234 15.5572C132.159 15.7423 132.121 15.9406 132.124 16.1404H132.124Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.simbatasker.app&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      width="181"
                      height="53"
                      viewBox="0 0 181 53"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M173.896 52.5H7.22917C3.56417 52.5 0.5625 49.5734 0.5625 46V7C0.5625 3.42663 3.56417 0.500003 7.22917 0.500003H173.896C177.561 0.500003 180.562 3.42663 180.562 7V46C180.562 49.5734 177.561 52.5 173.896 52.5Z"
                        fill="black"
                      />
                      <path
                        d="M173.896 1.54162C176.982 1.54162 179.494 3.9905 179.494 7V46C179.494 49.0095 176.982 51.4584 173.896 51.4584H7.22917C4.1425 51.4584 1.63083 49.0095 1.63083 46V7C1.63083 3.9905 4.1425 1.54162 7.22917 1.54162H173.896ZM173.896 0.500003H7.22917C3.56417 0.500003 0.5625 3.42663 0.5625 7V46C0.5625 49.5734 3.56417 52.5 7.22917 52.5H173.896C177.561 52.5 180.562 49.5734 180.562 46V7C180.562 3.42663 177.561 0.500003 173.896 0.500003Z"
                        fill="#A6A6A6"
                      />
                      <path
                        d="M63.7859 13.8182C63.7859 14.9037 63.4526 15.773 62.7959 16.4214C62.0409 17.19 61.0576 17.5768 59.8526 17.5768C58.7009 17.5768 57.7175 17.1835 56.9109 16.4084C56.1025 15.6219 55.6992 14.6567 55.6992 13.5013C55.6992 12.3459 56.1025 11.3807 56.9109 10.6007C57.7175 9.81903 58.7009 9.42578 59.8526 9.42578C60.4259 9.42578 60.9725 9.54116 61.4942 9.75566C62.0142 9.97178 62.4375 10.2643 62.7442 10.625L62.0476 11.3108C61.5125 10.6949 60.7842 10.391 59.8526 10.391C59.0126 10.391 58.2842 10.677 57.6659 11.2539C57.0542 11.8324 56.7475 12.5815 56.7475 13.5013C56.7475 14.421 57.0542 15.1767 57.6659 15.7552C58.2842 16.3255 59.0126 16.618 59.8526 16.618C60.7442 16.618 61.4942 16.3255 62.0859 15.7487C62.4759 15.3668 62.6976 14.8403 62.7559 14.1675H59.8526V13.2283H63.7259C63.7726 13.4314 63.7859 13.628 63.7859 13.8182Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M69.9301 10.5606H66.2917V13.0306H69.5717V13.9699H66.2917V16.4399H69.9301V17.397H65.2617V9.60352H69.9301V10.5606Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M74.2656 17.397H73.2356V10.5606H71.0039V9.60352H76.4989V10.5606H74.2656V17.397Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M80.4766 17.397V9.60352H81.5049V17.397H80.4766Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M86.0624 17.397H85.0408V10.5606H82.8008V9.60352H88.3024V10.5606H86.0624V17.397Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M98.7091 16.3954C97.9207 17.1835 96.9441 17.5768 95.7791 17.5768C94.6074 17.5768 93.6307 17.1835 92.8424 16.3954C92.0557 15.6089 91.6641 14.6437 91.6641 13.5013C91.6641 12.3589 92.0557 11.3937 92.8424 10.6072C93.6307 9.81903 94.6074 9.42578 95.7791 9.42578C96.9374 9.42578 97.9141 9.81903 98.7024 10.6137C99.4957 11.4067 99.8874 12.3654 99.8874 13.5013C99.8874 14.6437 99.4957 15.6089 98.7091 16.3954ZM93.6041 15.7422C94.1974 16.3255 94.9191 16.618 95.7791 16.618C96.6324 16.618 97.3607 16.3255 97.9474 15.7422C98.5391 15.1588 98.8391 14.4097 98.8391 13.5013C98.8391 12.5929 98.5391 11.8438 97.9474 11.2604C97.3607 10.677 96.6324 10.3845 95.7791 10.3845C94.9191 10.3845 94.1974 10.677 93.6041 11.2604C93.0124 11.8438 92.7124 12.5929 92.7124 13.5013C92.7124 14.4097 93.0124 15.1588 93.6041 15.7422Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M101.332 17.397V9.60352H102.582L106.469 15.6648H106.514L106.469 14.1665V9.60352H107.497V17.397H106.424L102.354 11.0368H102.309L102.354 12.5415V17.397H101.332Z"
                        fill="white"
                        stroke="white"
                        stroke-width="0.16"
                        stroke-miterlimit="10"
                      />
                      <path
                        d="M35.4379 33.4102L19.4073 42.3958L19.3571 42.4201C18.7885 42.7532 18.1195 42.9401 17.4087 42.9401C15.6276 42.9401 14.1307 41.7621 13.6959 40.1697C13.6903 40.1643 13.6875 40.1616 13.6875 40.1616L27.9369 25.4727L35.4379 33.4102Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M44.3507 26.2526C44.3507 27.6744 43.5312 28.9174 42.3187 29.5511L35.4365 33.4102L27.6094 25.8057L35.4114 19.0625L42.327 22.9622L42.3438 22.9703C43.5396 23.604 44.3507 24.8389 44.3507 26.2526Z"
                        fill="#FBBC04"
                      />
                      <path
                        d="M28.4223 25.847L13.6879 40.1622C13.6043 39.8535 13.5625 39.5366 13.5625 39.2035V13.2461C13.5625 12.913 13.6043 12.588 13.6879 12.2793L28.4223 25.847Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M13.6875 12.2785C14.1307 10.678 15.6276 9.5 17.4087 9.5C18.1362 9.5 18.8136 9.70311 19.399 10.0362L35.4128 19.0624L28.0372 26.22L13.6875 12.2785Z"
                        fill="#34A853"
                      />
                      <path
                        d="M91.4079 28.7783C88.2762 28.7783 85.7179 31.102 85.7179 34.3082C85.7179 37.4883 88.2762 39.8364 91.4079 39.8364C94.5462 39.8364 97.1046 37.4883 97.1046 34.3082C97.1046 31.102 94.5462 28.7783 91.4079 28.7783ZM91.4079 37.6589C89.6896 37.6589 88.2112 36.276 88.2112 34.3082C88.2112 32.3143 89.6896 30.9558 91.4079 30.9558C93.1262 30.9558 94.6112 32.3143 94.6112 34.3082C94.6112 36.276 93.1262 37.6589 91.4079 37.6589ZM78.9929 28.7783C75.8546 28.7783 73.3029 31.102 73.3029 34.3082C73.3029 37.4883 75.8546 39.8364 78.9929 39.8364C82.1296 39.8364 84.6829 37.4883 84.6829 34.3082C84.6829 31.102 82.1296 28.7783 78.9929 28.7783ZM78.9929 37.6589C77.2729 37.6589 75.7896 36.276 75.7896 34.3082C75.7896 32.3143 77.2729 30.9558 78.9929 30.9558C80.7112 30.9558 82.1896 32.3143 82.1896 34.3082C82.1896 36.276 80.7112 37.6589 78.9929 37.6589ZM64.2196 30.4732V32.8229H69.9746C69.8062 34.1359 69.3562 35.1012 68.6662 35.7739C67.8262 36.5864 66.5179 37.4883 64.2196 37.4883C60.6779 37.4883 57.9046 34.7014 57.9046 31.2483C57.9046 27.7952 60.6779 25.0083 64.2196 25.0083C66.1346 25.0083 67.5279 25.7379 68.5562 26.6837L70.2546 25.0278C68.8162 23.6888 66.9029 22.6602 64.2196 22.6602C59.3629 22.6602 55.2812 26.513 55.2812 31.2483C55.2812 35.9835 59.3629 39.8364 64.2196 39.8364C66.8446 39.8364 68.8162 38.9979 70.3662 37.4249C71.9546 35.8763 72.4496 33.6988 72.4496 31.9405C72.4496 31.3945 72.4029 30.8924 72.3196 30.4732H64.2196ZM124.63 32.2948C124.161 31.0582 122.716 28.7783 119.773 28.7783C116.856 28.7783 114.428 31.0192 114.428 34.3082C114.428 37.4054 116.831 39.8364 120.053 39.8364C122.658 39.8364 124.161 38.2878 124.78 37.3859L122.846 36.1298C122.201 37.0495 121.323 37.6589 120.053 37.6589C118.791 37.6589 117.886 37.095 117.306 35.9835L124.891 32.9237L124.63 32.2948ZM116.896 34.1359C116.831 32.0039 118.595 30.9119 119.858 30.9119C120.848 30.9119 121.688 31.3945 121.968 32.0852L116.896 34.1359ZM110.731 39.5H113.225V23.25H110.731V39.5ZM106.648 30.01H106.565C106.005 29.3633 104.936 28.7783 103.583 28.7783C100.743 28.7783 98.1462 31.2093 98.1462 34.326C98.1462 37.4249 100.743 39.8364 103.583 39.8364C104.936 39.8364 106.005 39.2465 106.565 38.5803H106.648V39.3733C106.648 41.4874 105.49 42.6233 103.621 42.6233C102.098 42.6233 101.153 41.5508 100.763 40.6489L98.5946 41.5313C99.2196 42.997 100.875 44.8008 103.621 44.8008C106.545 44.8008 109.011 43.1238 109.011 39.0434V29.1147H106.648V30.01ZM103.796 37.6589C102.078 37.6589 100.64 36.2565 100.64 34.326C100.64 32.3777 102.078 30.9558 103.796 30.9558C105.49 30.9558 106.825 32.3777 106.825 34.326C106.825 36.2565 105.49 37.6589 103.796 37.6589ZM136.303 23.25H130.34V39.5H132.826V33.3429H136.303C139.065 33.3429 141.773 31.3945 141.773 28.2957C141.773 25.1984 139.058 23.25 136.303 23.25ZM136.368 31.0825H132.826V25.5104H136.368C138.225 25.5104 139.285 27.0135 139.285 28.2957C139.285 29.5534 138.225 31.0825 136.368 31.0825ZM151.74 28.7474C149.943 28.7474 148.075 29.5209 147.306 31.2353L149.513 32.1372C149.988 31.2353 150.861 30.9428 151.785 30.9428C153.075 30.9428 154.383 31.6984 154.403 33.0325V33.2032C153.953 32.9497 152.99 32.5743 151.805 32.5743C149.428 32.5743 147.006 33.8499 147.006 36.2305C147.006 38.408 148.953 39.8104 151.141 39.8104C152.815 39.8104 153.738 39.0743 154.318 38.2179H154.403V39.474H156.805V33.2405C156.805 30.3594 154.598 28.7474 151.74 28.7474ZM151.44 37.6524C150.626 37.6524 149.493 37.2592 149.493 36.276C149.493 35.0183 150.906 34.5357 152.13 34.5357C153.225 34.5357 153.738 34.7713 154.403 35.0817C154.208 36.5864 152.88 37.6524 151.44 37.6524ZM165.555 29.1033L162.696 36.1477H162.611L159.656 29.1033H156.975L161.415 38.9475L158.881 44.4254H161.48L168.321 29.1033H165.555ZM143.14 39.5H145.633V23.25H143.14V39.5Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="comman-pop-action-double mt-4 w-25">
                <button
                  className="btn-fill"
                  onClick={handleStripe}
                  style={{ width: 100 }}
                >
                  Stripe Pay
                </button>
              </div>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Log Out end  */}
    </>
  );
}
