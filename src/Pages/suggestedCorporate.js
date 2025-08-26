import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { Tab, Nav, Container, Row, Col, Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useParams } from "react-router-dom";
import PaginationComponent from "../CommanComponents/PaginationComponent";
import StarRating from "../CommanComponents/StarRating";
import ChatIcon from "../Assets/Images/chat.svg";
import { formatDate } from "fullcalendar/index.js";
import Loader from "../CommanComponents/Loader";
import mapIcon from "../Assets/Images/map.svg";
import MapComponent from "../CommanComponents/MapComponent";
import defaultImage from "../Assets/Images/placeholder.jpg";
import { setCustomer } from "../Redux/Reducers/LoginSlice";

export default function SuggestedCorporatePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showMapModal, setShowMapModal] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [leadFilter, setLeadFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchParams] = useSearchParams();
  const { id: userId } = useParams();

  const [activeTab, setActiveTab] = useState(
    searchParams.get("page") || "business-details"
  );

  const [corpoProfile, setCorpoProfile] = useState(null);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(false);
  const [getreview, setReview] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [packageDetails, setPackageDetails] = useState("");
  const [role, setRole] = useState("");

  const data = useSelector((state) => state.service?.getCorporateList);
  useEffect(() => {
    const fetchCorporateInfo = async () => {
      setLoading(true);
      const customerId = localStorage.getItem("userId");
      try {
        const response = await dispatch(
          CustomerActions.corpoInfoProductListUser({
            userId,
            page,
            limit,
            status: leadFilter,
            search: searchText,
            customerId: customerId,
          })
        );

        if (response?.payload) {
          setCorpoProfile(response.payload?.data?.corporateUser);
          setProductList(response.payload?.data?.data || []);
          setReview(response.payload?.data?.feedback || []);
          setTotalPages(response?.payload.data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchCorporateInfo();
    }
    getProfileApiCall();
  }, [dispatch, userId, page, limit, leadFilter, searchText]);

  const getProfileApiCall = async () => {
    try {
      const apiRes = await dispatch(
        CustomerActions.getProfileWithSuscription()
      );
      if (apiRes?.payload?.success) {
        dispatch(setCustomer(apiRes?.payload?.data.user));
      }
      const user = apiRes?.payload?.data?.subscriptionDetail;
      setRole(apiRes?.payload?.data.user?.role);
      setPackageDetails(user);
    } catch (error) {
      console.error("Subscription check failed:", error);
    }
  };
  const isSubscriptionExpired = (packageDetails) => {
    if (!packageDetails || Object.keys(packageDetails).length === 0) {
      return true;
    }

    const endDate = new Date(packageDetails.endDate);
    const today = new Date();

    if (packageDetails.status === "inactive") {
      return true;
    }

    if (endDate < today) {
      return true;
    }

    return false;
  };

  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain mt-5">
                <div className="p-3 d-flex align-items-center justify-content-between  mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <Link onClick={() => navigate(-1)} className="d-flex">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="40"
                        height="42"
                        viewBox="0 0 40 42"
                        fill="none"
                      >
                        <path
                          d="M10 21L8.91379 22.0345L7.92857 21L8.91379 19.9655L10 21ZM30 19.5C30.8284 19.5 31.5 20.1716 31.5 21C31.5 21.8284 30.8284 22.5 30 22.5V19.5ZM15.5805 29.0345L8.91379 22.0345L11.0862 19.9655L17.7529 26.9655L15.5805 29.0345ZM8.91379 19.9655L15.5805 12.9655L17.7529 15.0345L11.0862 22.0345L8.91379 19.9655ZM10 19.5H30V22.5L10 22.5L10 19.5Z"
                          fill="#40413A"
                        />
                      </svg>
                    </Link>

                    <div className="d-flex align-items-center gap-3">
                      <div className="">
                        {corpoProfile?.profile_image ? (
                          <img
                            className="point-cursor avatar-circle"
                            style={{ width: 50, height: 50 }}
                            src={
                              `${process.env.REACT_APP_API_URL}${corpoProfile.profile_image}` ||
                              defaultImage
                            }
                            alt="profile-img"
                          />
                        ) : (
                          <div
                            className="point-cursor avatar-circle bg-secondary text-white d-flex align-items-center justify-content-center  text-transform"
                            style={{
                              width: 50,
                              height: 50,
                              fontWeight: "bold",
                              fontSize: 20,
                            }}
                          >
                            {corpoProfile?.full_name?.[0]?.toUpperCase() || "-"}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="fw-bold">{corpoProfile?.full_name}</div>
                        <div className="text-muted small">
                          {data?.corporateUser?.corporateCategoryId?.name ||
                            "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bookings-tabs">
                  <Tab.Container
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    defaultActiveKey="tasks"
                  >
                    <Row>
                      <Col sm={12}>
                        <Nav variant="pills" className="bookings-tab-nav mb-4">
                          <Nav.Item>
                            <Nav.Link eventKey="business-details">
                              Business Details
                            </Nav.Link>
                          </Nav.Item>

                          {role !==2 && 
                            <Nav.Item>
                            <Nav.Link eventKey="products">Products</Nav.Link>
                          </Nav.Item>
                          }
                          <Nav.Item>
                            <Nav.Link eventKey="reviews">
                              Customer Reviews
                            </Nav.Link>
                          </Nav.Item>
                        </Nav>
                      </Col>

                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="business-details">
                            <div className="bookings-cards">
                              {loading ? (
                                <Loader />
                              ) : corpoProfile && productList ? (
                                <ul className="list-unstyled">
                                  <li
                                    key={data.corporateUser._id}
                                    className="mb-3"
                                  >
                                    <div className="booking-card p-3">
                                      <div className="row align-items-start g-4">
                                        <div className="col-md-2 text-center">
                                          <img
                                            src={
                                              `${process.env.REACT_APP_API_URL}${data.corporateUser.profile_image}` ||
                                              defaultImage
                                            }
                                            alt="Profile"
                                            className="profile-image-business"
                                          />
                                        </div>

                                        <div className="col-md-5">
                                          <h5 className="fw-semibold mb-2">
                                            {data.corporateUser.full_name ||
                                              "N/A"}
                                          </h5>
                                          <p className="mb-1">
                                            <strong>Email:</strong>{" "}
                                            {data.corporateUser.email || "N/A"}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Phone:</strong>{" "}
                                            {data.corporateUser.phone_number ||
                                              "N/A"}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Address:</strong>{" "}
                                            {`${
                                              data.corporateUser.house_number ||
                                              ""
                                            }, ${
                                              data.corporateUser
                                                .street_address || ""
                                            }`}
                                          </p>
                                        </div>

                                        <div className="col-md-5">
                                          <p className="mb-1">
                                            <strong>Company Address:</strong>{" "}
                                            {data.corporateUser.address ||
                                              "N/A"}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Profession Type:</strong>{" "}
                                            {data?.corporateUser
                                              ?.corporateCategoryId?.name ||
                                              "N/A"}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Verified:</strong>{" "}
                                            {data.corporateUser.email_verified
                                              ? "Yes"
                                              : "No"}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Status:</strong>{" "}
                                            {data.corporateUser.status === 1
                                              ? "Active"
                                              : "Inactive"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="d-flex justify-content-center align-items-center book-service-action-btn gap-3 mt-3">
                                        <button
                                          className="view-more-btn"
                                          onClick={() => {
                                            if (role === 2) {
                                              if (
                                                isSubscriptionExpired(
                                                  packageDetails
                                                )
                                              ) {
                                                setShowPlanModal(true);
                                              } else {
                                                navigate(
                                                  `/messages?userID=${data?._id}`
                                                );
                                                  localStorage.setItem("reciverID", data?._id );
                                              }
                                            } else {
                                              navigate(
                                                `/messages?userID=${data?.corporateUser._id}`
                                              );
                                            localStorage.setItem("reciverID", data?.corporateUser._id);
                                            }
                                          }}
                                        >
                                          <img src={ChatIcon} alt="Chat" />{" "}
                                          Direct Chat
                                        </button>
                                        <div className="d-flex justify-content-center align-items-center book-service-action-btn gap-3">
                                          <button
                                            className="primaryBtn"
                                            style={{
                                              fontSize: "15px",
                                              fontWeight: "400",
                                            }}
                                            onClick={() => {
                                              if (role === 2) {
                                                if (
                                                  isSubscriptionExpired(
                                                    packageDetails
                                                  )
                                                ) {
                                                  setShowPlanModal(true);
                                                } else {
                                                  window.location.href = `tel:${data?.corporateUser.phone_number}`;
                                                }
                                              } else {
                                                window.location.href = `tel:${data?.corporateUser.phone_number}`;
                                              }
                                            }}
                                          >
                                            Call Now
                                          </button>
                                        </div>

                                        <div className="d-flex justify-content-center align-items-center book-service-action-btn gap-3">
                                          <button
                                            className="view-more-btn d-flex align-items-center gap-2"
                                            onClick={() => {
                                              if (role === 2) {
                                                if (
                                                  isSubscriptionExpired(
                                                    packageDetails
                                                  )
                                                ) {
                                                  setShowPlanModal(true);
                                                } else {
                                                  setShowMapModal(
                                                    data?.corporateUser
                                                  );
                                                }
                                              } else {
                                                setShowMapModal(
                                                  data?.corporateUser
                                                );
                                              }
                                            }}
                                          >
                                            <img
                                              src={mapIcon}
                                              alt="Map"
                                              width={20}
                                              height={20}
                                            />
                                            Map
                                          </button>
                                        </div>
                                      </div>
                                      <Modal
                                        show={
                                          showMapModal === data?.corporateUser
                                        }
                                        onHide={() => setShowMapModal(false)}
                                        centered
                                        size="lg"
                                      >
                                        <Modal.Header
                                          closeButton
                                          className="border-none pb-0"
                                        >
                                          <Modal.Title>
                                            Service Location
                                          </Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                          <div className="comman-small-pop text-center">
                                            <MapComponent
                                              coordinates={
                                                data?.corporateUser?.location
                                                  ?.coordinates
                                              }
                                              address={
                                                data?.corporateUser
                                                  ?.street_address
                                              }
                                            />
                                          </div>
                                        </Modal.Body>
                                      </Modal>
                                    </div>
                                  </li>
                                </ul>
                              ) : (
                                <div className="no-upcoming-bookings text-center py-5">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="80"
                                    height="80"
                                    viewBox="0 0 80 80"
                                    fill="none"
                                  ></svg>
                                  <h5 className="mt-3 fw-semibold">
                                    No Business Details Found
                                  </h5>
                                  <p className="text-muted small">
                                    Currently you don’t have any business
                                    details.
                                  </p>
                                </div>
                              )}
                            </div>
                          </Tab.Pane>

                          <Tab.Pane eventKey="products">
                            <div className="product-gallery">
                              {productList?.length > 0 ? (
                                <div className="row g-3">
                                  {productList.map((product, index) => (
                                    <div
                                      className="col-6 col-md-4 col-lg-3"
                                      key={product._id}
                                    >
                                      <div className="product-card shadow-sm h-100">
                                        <div
                                          className="product-img-wrapper cursor-pointer"
                                          onClick={() =>
                                            navigate(
                                              `/product-detail/${product?._id}`
                                            )
                                          }
                                        >
                                          <img
                                            src={`${
                                              process.env.REACT_APP_API_URL
                                            }/products/${
                                              product.images[0] || ""
                                            }`}
                                            alt={product?.name}
                                            className="img-fluid product-img"
                                          />
                                        </div>
                                        <div className="product-body p-2">
                                          <h6 className="mb-1 text-truncate">
                                            {product?.name}
                                          </h6>
                                          <p className="mb-0 text-muted">
                                            Description: {product?.description}
                                          </p>
                                          <p className="mb-0 text-success fw-semibold">
                                            Price: ${product?.price}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="no-upcoming-bookings text-center py-5">
                                  <h5 className="fw-semibold">
                                    No Products Found
                                  </h5>
                                  <p className="text-muted small">
                                    Currently there are no products.
                                  </p>
                                </div>
                              )}
                            </div>
                            {totalPages > 10 && (
                              <div className="pagination-flexs mt-5">
                                <PaginationComponent
                                  page={page}
                                  setPage={setPage}
                                  totalPages={totalPages}
                                />
                              </div>
                            )}
                          </Tab.Pane>

                          <Tab.Pane eventKey="reviews">
                            <div className="product-gallery">
                              {getreview?.length > 0 ? (
                                getreview.map((review) => (
                                  <Col
                                    key={review._id}
                                    md={12}
                                    className="mb-4"
                                  >
                                    <div className="review-section">
                                      <div>
                                        <div className="review-content">
                                          <div className=" review-main d-flex align-items-center">
                                            <img
                                              src={`${process.env.REACT_APP_API_URL}/${review.user_id?.profile_image}`}
                                              alt={""}
                                              style={{
                                                width: "60px",
                                                height: "60px",
                                                objectFit: "cover",
                                              }}
                                            />
                                            <div>
                                              <h3>
                                                {review.user_id?.full_name ||
                                                  ""}
                                              </h3>
                                              <StarRating
                                                averageRating={review?.rating}
                                                type={"noreview"}
                                              />{" "}
                                              {formatDate(review?.createdAt)}
                                            </div>
                                          </div>
                                          <p>{review.message || ""}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </Col>
                                ))
                              ) : (
                                <div className="no-upcoming-bookings text-center py-5">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="80"
                                    height="80"
                                    viewBox="0 0 80 80"
                                    fill="none"
                                  >
                                    <path
                                      d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                      fill="#CCCCCC"
                                    />
                                    <path
                                      d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                      fill="#CCCCCC"
                                    />
                                  </svg>
                                  <h5 className="fw-semibold">
                                    No Reviews Yet
                                  </h5>
                                  <p className="text-muted small">
                                    Currently you don’t have any reviews.
                                  </p>
                                </div>
                              )}
                            </div>
                            {totalPages > 10 && (
                              <div className="pagination-flexs mt-5">
                                <PaginationComponent
                                  page={page}
                                  setPage={setPage}
                                  totalPages={totalPages}
                                />
                              </div>
                            )}
                          </Tab.Pane>
                        </Tab.Content>
                      </Col>
                    </Row>
                  </Tab.Container>
                  <Modal
                    show={showPlanModal}
                    onHide={() => setShowPlanModal(false)}
                    centered
                    backdrop="static"
                    keyboard={false}
                  >
                    <Modal.Body>
                      <div className="comman-small-pop">
                        <h3>Upgrade Plan</h3>
                        <div className="d-flex justify-content-center download-app-section mt-2">
                          Please subscribe to our plan to access this feature
                        </div>
                        <div className="d-flex justify-content-center mt-3">
                          <button
                            className="primaryBtn"
                            onClick={() =>
                              navigate(`/payment`)
                            }
                          >
                            Upgrade Plan
                          </button>
                        </div>
                      </div>
                    </Modal.Body>
                  </Modal>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
