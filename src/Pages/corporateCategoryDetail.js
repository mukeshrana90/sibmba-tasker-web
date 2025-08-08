import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import Loader from "../CommanComponents/Loader";
import PaginationComponent from "../CommanComponents/PaginationComponent";
import defaultImage from "../Assets/Images/placeholder.jpg";

export default function CorporateCategoryDetail() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [page, setPage] = useState(1);
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  // const categoryid = searchParams.get("category_id");
  const { categoryId } = useParams();
  const [corporateDetail, setCorporateDetail] = useState("");

  useEffect(() => {
    const latitude = localStorage.getItem("latitude");
    const longitude = localStorage.getItem("longitude");
    const fetchData = async () => {
      try {
        if (categoryId) {
          setLoading(true);
          const payload = {
            page,
            limit,
            category_id: categoryId,
            lat: latitude,
            lng: longitude,
          };

          const resultAction = await dispatch(
            ServiceActions.getNearbyCorporateWithCategory(payload)
          ).unwrap();
          const response = resultAction.data;
          setCorporateDetail(response);
          if (response?.totalPages) {
            setTotalPages(response.totalPages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch nearby corporate users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch, page, limit, categoryId]);


  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>
                  {corporateDetail?.[0]?.corporateCategoryId?.name ||
                    "Corporate Category"}
                </h2>
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
          {loading ? (
            <Loader />
          ) : (
            <div className="category-services-lists">
              {Array.isArray(corporateDetail) && corporateDetail.length > 0 ? (
                <div className="services-list">
                  {corporateDetail.map((ele, index) => (
                    <div key={index} className="cursor-pointer">
                      <img
                       onClick={() => Navigate(`/get-corporate/${ele?._id}`)}
                        className="point-cursor"
                        src={
                          ele?.profile_image
                            ? `${process.env.REACT_APP_API_URL}${ele.profile_image}`
                            : defaultImage
                        }
                        alt="corporate-img"
                      />
                      <h3>{ele?.full_name}</h3>
                      <p>{ele?.address}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <h1>No Data Found</h1>
              )}
              {totalPages > 1 && (
                <div className="pagination-flexs mt-5 d-flex  justify-content-end ">
                  <PaginationComponent
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                  />
                </div>
              )}
            </div>
          )}
        </Container>
      </section>
    </Layout>
  );
}
