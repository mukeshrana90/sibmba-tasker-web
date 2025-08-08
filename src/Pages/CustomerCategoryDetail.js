import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";

export default function CustomerCategoryDetail() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryId = searchParams.get("categoryId");

  const categoriesDetail = useSelector((e) => e.UserSlice.categoriesDetail);

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const [getSubCategoryById] = await Promise.all([
          dispatch(CustomerActions.getSubCategoryById({ categoryId })),
        ]);
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch, page]);

  const handleProfiles = (type, id) => {
    if (token) {
      if (type == "services") {
        Navigate(`/customer-service-detail?service_id=${id}`);
      } else {
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
                <h2>{categoriesDetail?.category?.service_category_name}</h2>
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
                  / Customer Category
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            {Array.isArray(categoriesDetail?.subcategories) &&
            categoriesDetail?.subcategories.length > 0 ? (
              <div>
                <div className="services-list">
                  {Array.isArray(categoriesDetail?.subcategories) &&
                    categoriesDetail?.subcategories.length > 0 &&
                    categoriesDetail?.subcategories.map((ele, index) => {
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
                          <p>{ele?.desc}</p>
                        </div>
                      );
                    })}
                </div>
                {Array.isArray(categoriesDetail?.subcategories) &&
                  categoriesDetail?.totalCount > 10 && (
                    <div className="pagination-flexs">
                      <div></div>
                      <div className="mt-5">
                        {/* <PaginationComponent page={page} setPage={setPage} totalPages={allUserCategories?.totalPages} /> */}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <>
                <h1> No Data Found </h1>
              </>
            )}
          </div>
        </Container>
      </section>
    </Layout>
  );
}
