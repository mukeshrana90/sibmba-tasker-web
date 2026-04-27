import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";
import defaultImage from "../Assets/Images/placeholder.jpg";

export default function BrowseCategory() {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const Navigate = useNavigate();
  const token = localStorage.getItem("token");
  const lat = localStorage.getItem("latitude");
  const long = localStorage.getItem("longitude");
  const [loading, setLoading] = useState(true);
  const categories = useSelector((e) => e.UserSlice.categories);
  const nearByServices = useSelector((e) => e.UserSlice.nearByServices);

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const promises = [
          dispatch(CustomerActions.getCategories({ page, limit })),
        ];
        if (lat && long) {
          promises.push(
            dispatch(CustomerActions.getNearByServices({ lat, long, page, limit }))
          );
        }
        await Promise.all(promises);
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch, page, lat, long]);

  const handleProfiles = (type, id) => {
    if (token) {
      if (type == "services") {
        Navigate(`/customer-service-detail?service_id=${id}`)
      } else {
        Navigate(`/customer-category-detail?categoryId=${id}`)
      }
    } else {
      Navigate("/login")
    }
  }

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>Browse by Category</h2>
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
                  / Category
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            {Array.isArray(categories?.allCat) &&
            categories?.allCat.length > 0 ? (
              <>
                <div className="services-list-browse">
                  {categories?.allCat.map((ele, index) => {
                    return (
                      <div key={index}>
                        <>
                          <img
                            onClick={() =>
                              handleProfiles("category", ele?._id)
                            }
                            className="point-cursor"
                            src={`${process.env.REACT_APP_API_URL}${ele?.image}`}
                            alt="categories-img"
                          />
                        </>
                        <h3>{ele?.service_category_name}</h3>
                      </div>
                    );
                  })}
                </div>
                {categories?.totalCount > 10 && (
                  <div className="pagination-flexs">
                    <div></div>
                    <div className="mt-5">
                      <PaginationComponent
                        page={page}
                        setPage={setPage}
                        totalPages={categories?.totalPages}
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

      {Array.isArray(nearByServices?.data) &&
        nearByServices?.data.length > 0 && (
          <section className="category-services-sec pt-0">
            <Container>
              <div className="category-services-lists">
                <div className="list-title">
                  <h2>Nearby Providers</h2>
                </div>
                <div className="services-list">
                  {nearByServices.data.map((ele, index) => {
                    const imgSrc = ele?.image
                      ? `${process.env.REACT_APP_API_URL}${ele.image}`
                      : defaultImage;
                    const count = ele?.providerNearbyCount ?? null;
                    return (
                      <div key={ele?._id || index}>
                        <img
                          onClick={() => handleProfiles("category", ele._id)}
                          className="point-cursor"
                          src={imgSrc}
                          alt="categories-img"
                        />
                        <h3>{count !== null ? `${count} ` : ""}{ele?.service_category_name}</h3>
                        <p>near you</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Container>
          </section>
        )}
    </Layout>
  );
}
