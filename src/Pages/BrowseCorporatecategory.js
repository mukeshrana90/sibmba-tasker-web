import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import defaultImage from "../Assets/Images/placeholder.jpg";
import ReadMore from "../CommanComponents/ReadMore";
import Loader from "../CommanComponents/Loader";
import PaginationComponent from "../CommanComponents/PaginationComponent";

export default function BrowseCorporateCategory() {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(false);
  const Navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const corporateSuggestions = useSelector((e) => e.service.corporateCategory);
  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const [categoryResponse] = await Promise.all([
          dispatch(ServiceActions.getCorporateCategoryList({ page, limit })),
          setTotalPages(corporateSuggestions?.pagination?.total),
        ]);
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch, page]);

  const handleProfiles = (id) => {
    if (token) {
      Navigate(`/corporate-category-detail/${id}`);
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
                <h2>Browse Corporate By Category</h2>
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
                  / Corporate Category
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            {loading ? (
              <Loader />
            ) : Array.isArray(corporateSuggestions?.data) &&
              corporateSuggestions?.data.length > 0 ? (
              <>
                <div className="services-list-browse">
                  {corporateSuggestions.data.map((ele, index) => (
                    <div key={index}>
                      <img
                        onClick={() => handleProfiles(ele?._id)}
                        className="point-cursor"
                        src={
                          ele?.image
                            ? `${process.env.REACT_APP_API_URL}/corporate-category/${ele.image}`
                            : defaultImage
                        }
                        alt="categories-img"
                      />
                      <h3>{ele?.name}</h3>
                      <ReadMore desc={ele?.description} />
                    </div>
                  ))}
                </div>

                {/* Pagination (optional) */}
                {totalPages > 10 && (
                  <div className="pagination-flexs">
                    <div className="mt-5">
                      <PaginationComponent
                        page={page}
                        setPage={setPage}
                        totalPages={totalPages}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ height: "300px" }}>
                <h3 className="text-center mt-5">No Data Found</h3>
              </div>
            )}
          </div>
        </Container>
      </section>
    </Layout>
  );
}
