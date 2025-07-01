import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";
 
export default function Category() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const allUserCategories = useSelector((e) => e.UserSlice.allUserCategories);
  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const [getAllCategories] = await Promise.all([
          dispatch(CustomerActions.getAllCategories({ page, limit })),
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
        Navigate(`/customer-category-detail?categoryId=${id}`);
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
                <h2>All Category</h2>
                <p>Home / Category</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            {Array.isArray(allUserCategories?.allCat) &&
            allUserCategories?.allCat.length > 0 ? (
              <div>
                <div className="services-list">
                  {Array.isArray(allUserCategories?.allCat) &&
                    allUserCategories?.allCat.length > 0 &&
                    allUserCategories?.allCat.map((ele, index) => {
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
                          {/* <p>{ele?.desc}</p> */}
                        </div>
                      );
                    })}
                </div>
                {Array.isArray(allUserCategories?.allCat) &&
                  allUserCategories?.totalCount > 10 && (
                    <div className="pagination-flexs">
                      <div></div>
                      <div className="mt-5">
                        <PaginationComponent
                          page={page}
                          setPage={setPage}
                          totalPages={allUserCategories?.totalPages}
                        />
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
