import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { Tab, Nav, Container, Row, Col } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useParams } from "react-router-dom";
import PaginationComponent from "../CommanComponents/PaginationComponent";

export default function SuggestedCorporatePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  const data = useSelector((state) => state.service?.getCorporateList);
  useEffect(() => {
    const fetchCorporateInfo = async () => {
      setLoading(true);
      try {
        const result = await dispatch(
          CustomerActions.corpoInfoProductListUser({
            userId,
            page,
            limit,
            status: leadFilter,
            search: searchText,
          })
        );

        if (result?.payload) {
          setCorpoProfile(result.payload?.data?.corporateUser);
          setProductList(result.payload?.data?.data || []);
          setTotalPages(result?.payload.data);
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
  }, [dispatch, userId, page, limit, leadFilter, searchText]);

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
                        <img
                          className="point-cursor avatar-circle"
                          style={{ width: 50, height: 50 }}
                          src={`${process.env.REACT_APP_API_URL}${corpoProfile?.profile_image}`}
                          alt="categories-img"
                        />
                      </div>

                      <div>
                        <div className="fw-bold">{corpoProfile?.full_name}</div>
                        <div className="text-muted small">
                          {corpoProfile?.shop_name}
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
                          <Nav.Item>
                            <Nav.Link eventKey="products">Products</Nav.Link>
                          </Nav.Item>
                          {/* <Nav.Item>
                            <Nav.Link eventKey="reviews">
                              Customer Reviews
                            </Nav.Link>
                          </Nav.Item> */}
                        </Nav>
                      </Col>

                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="business-details">
                            <div className="bookings-cards">
                              {corpoProfile ? (
                                <ul className="list-unstyled">
                                  <li
                                    key={data.corporateUser._id}
                                    className="mb-3"
                                  >
                                    <div className="booking-card p-3">
                                      <div className="row align-items-start g-4">
                                        <div className="col-md-2 text-center">
                                          <img
                                            src={`${process.env.REACT_APP_API_URL}${data.corporateUser.profile_image}`}
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
                                          <small className="text-muted">
                                            Profile Created:{" "}
                                            {new Date(
                                              data.corporateUser.createdAt
                                            ).toLocaleDateString()}
                                          </small>
                                        </div>

                                        <div className="col-md-5">
                                          <p className="mb-1">
                                            <strong>Company Address:</strong>{" "}
                                            {data.corporateUser.address ||
                                              "N/A"}
                                          </p>
                                          <p className="mb-1">
                                            <strong>Profession:</strong>{" "}
                                            {data.corporateUser
                                              .identify_yourself || "N/A"}
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
                                              process.env.REACT_APP_API_URL}/products/${
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
                        </Tab.Content>
                      </Col>
                    </Row>
                  </Tab.Container>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
