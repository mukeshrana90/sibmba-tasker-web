import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";

export default function BrowseCategory() {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const Navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const categories = useSelector((e) => e.UserSlice.categories);

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const [categoryResponse] = await Promise.all([
          dispatch(CustomerActions.getCategories({ page, limit })),
        ]);
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch, page]);

  // const handleProfiles = (type) => {
  //   if (token) {
  //     if (type == "services") {
  //       Navigate("/services");
  //     } else {
  //       Navigate("/category");
  //     }
  //   } else {
  //     Navigate("/login");
  //   }
  // };

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
                <p>Home / Category</p>
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
                  {Array.isArray(categories?.allCat) &&
                    categories?.allCat?.length > 0 &&
                    categories?.allCat.map((ele, index) => {
                      return (
                        <div key={index}>
                          <>
                            <img
                              onClick={() => handleProfiles("category", ele?._id)}
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
                {Array.isArray(categories?.allCat) &&
                  categories?.totalCount > 10 && (
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
    </Layout>
  );
}
