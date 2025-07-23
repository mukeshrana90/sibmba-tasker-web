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
];

const corporateRoutes = [
  { label: "Home", path: "/" },
  { label: "Product", path: "/corporate/products" },
  { label: "Bookings", path: "/corporate/bookings" },
];

const clientRoutes = [
  { label: "Home", path: "/" },
  { label: "Service", path: "/services" },
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
  const currentPath = location.pathname;

  const notificationDetail = useSelector((e) => e.UserSlice.notificationData);
  const role = localStorage.getItem("role");

  const hideNavbarCollapse = location.pathname === "/provider";
  const hideSearchbarCollapse =
    location.pathname === "/requests" || role === Roles.SERVICE_PROVIDER;

  const getProfileApiCall = async () => {
    let apiRes = await dispatch(CustomerActions.getProfile());
    if (apiRes?.payload?.success) {
      dispatch(setCustomer(apiRes?.payload?.data));
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
    setShowLogoutModal(false);
    toast.success("Log out successfully");
    localStorage.clear();
    Navigate(`/`);
    window.location.reload();
  };

  const getNavRoutes = () => {
    if (role == Roles.SERVICE_PROVIDER) return serviceProviderRoutes;
    if (role == Roles.CORPORATE) return corporateRoutes;
    return clientRoutes;
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
                  {token && !hideSearchbarCollapse && (
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
                                      role == Roles.SERVICE_PROVIDER
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
                                    <Link
                                      className={
                                        currentPath === "/corporate/bookings" ? "nav-link active" : "nav-link"
                                      }
                                      to="/corporate/bookings"
                                    >
                                      Booking
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={currentPath === "/community" ? "nav-link active" : "nav-link"}
                                      to="/community"
                                    >
                                      Community
                                    </Link>
                                    <Dropdown.Divider />
                                    <Link
                                      className={currentPath === "/corporate/products" ? "nav-link active" : "nav-link"}
                                      to="/corporate/products"
                                    >
                                      My Products
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
                                  </>
                                ) : (
                                  <>
                                    <Link
                                      className={
                                        currentPath ===
                                        (role == Roles.CORPORATE
                                          ? "/corporate/bookings"
                                          : "/bookings")
                                          ? "nav-link active"
                                          : "nav-link"
                                      }
                                      to={
                                        role == Roles.CORPORATE
                                          ? "/corporate/bookings"
                                          : "/bookings"
                                      }
                                    >
                                      Bookings
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
    </>
  );
}
