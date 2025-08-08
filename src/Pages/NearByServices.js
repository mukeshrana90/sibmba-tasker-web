import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";
import ReadMore from "../CommanComponents/ReadMore";

export default function NearByServices() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const nearByServices = useSelector((e) => e.UserSlice.nearByServices);

  const lat = localStorage.getItem("latitude");
  const long = localStorage.getItem("longitude");

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const [NearByServicesResponse] = await Promise.all([
          dispatch(
            CustomerActions.getNearByServices({ lat, long, page, limit })
          ),
        ]);
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch, lat, long, page]);

  const handleProfiles = (type, id) => {
    if (token) {
      if (type == "services") {
        Navigate(`/customer-service-detail?service_id=${id}`);
      } else {
        Navigate("/category");
      }
    } else {
      Navigate("/login");
    }
  };

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>Nearby Services</h2>
                <p>
                  <span
                    style={{
                      color: "#038654",
                      cursor: "pointer",
                    }}
                    onClick={() => Navigate("/")}
                  >
                    Home
                  </span>{" "}
                  / Services
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="sort-by-filter">
              <button>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="17"
                  viewBox="0 0 16 17"
                  fill="none"
                >
                  <path
                    d="M6.33854 15.1654C5.93854 15.1654 5.67188 14.8987 5.67188 14.4987V2.4987C5.67188 2.0987 5.93854 1.83203 6.33854 1.83203C6.73854 1.83203 7.00521 2.0987 7.00521 2.4987V14.4987C7.00521 14.8987 6.73854 15.1654 6.33854 15.1654Z"
                    fill="#252525"
                  />
                  <path
                    d="M2.33854 7.16536C2.13854 7.16536 2.00521 7.0987 1.87188 6.96536C1.60521 6.6987 1.60521 6.2987 1.87188 6.03203L5.87188 2.03203C6.13854 1.76536 6.53854 1.76536 6.80521 2.03203C7.07188 2.2987 7.07188 2.6987 6.80521 2.96536L2.80521 6.96536C2.67187 7.0987 2.53854 7.16536 2.33854 7.16536ZM9.67188 15.1654C9.27188 15.1654 9.00521 14.8987 9.00521 14.4987V2.4987C9.00521 2.0987 9.27188 1.83203 9.67188 1.83203C10.0719 1.83203 10.3385 2.0987 10.3385 2.4987V14.4987C10.3385 14.8987 10.0719 15.1654 9.67188 15.1654Z"
                    fill="#252525"
                  />
                  <path
                    d="M9.67448 15.1654C9.47448 15.1654 9.34115 15.0987 9.20781 14.9654C8.94115 14.6987 8.94115 14.2987 9.20781 14.032L13.2078 10.032C13.4745 9.76536 13.8745 9.76536 14.1411 10.032C14.4078 10.2987 14.4078 10.6987 14.1411 10.9654L10.1411 14.9654C10.0078 15.1654 9.87448 15.1654 9.67448 15.1654Z"
                    fill="#252525"
                  />
                </svg>
                Sort by
              </button>
            </div>

            {Array.isArray(nearByServices?.allCat) &&
            nearByServices?.allCat.length > 0 ? (
              <>
                <div className="services-list">
                  {Array.isArray(nearByServices?.allCat) &&
                    nearByServices?.allCat.length > 0 &&
                    nearByServices?.allCat.map((ele, index) => {
                      return (
                        <div key={index}>
                          {Array.isArray(ele?.images) &&
                            ele.images.length > 0 && (
                              <img
                                onClick={() =>
                                  handleProfiles("services", ele?._id)
                                }
                                className="point-cursor"
                                src={`${process.env.REACT_APP_API_URL}/user/${ele?.images[0]}`}
                                alt="categories-img"
                              />
                            )}
                          <h3>{ele?.serviceSubCategoryName}</h3>
                          {/* <p>{ele?.desc}</p> */}
                          <ReadMore desc={ele?.desc} />
                        </div>
                      );
                    })}
                </div>

                {Array.isArray(nearByServices?.allCat) &&
                  nearByServices?.totalCount > 10 && (
                    <div className="pagination-flexs">
                      <div></div>
                      <div className="mt-5">
                        <PaginationComponent
                          page={page}
                          setPage={setPage}
                          totalPages={nearByServices?.totalPages}
                        />
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <>
                <div style={{ height: "300px" }}>
                  <h3 className="text-center mt-5"> No Data Found </h3>
                </div>
              </>
            )}
          </div>
        </Container>
      </section>
    </Layout>
  );
}
