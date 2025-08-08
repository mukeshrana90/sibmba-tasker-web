import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { Container, Row, Col } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useParams } from "react-router-dom";
import ServiceActions from "../Redux/Actions/ServiceActions";
import defaultImage from "../Assets/Images/placeholder.jpg";
import Loader from "../CommanComponents/Loader";
import Form from "react-bootstrap/Form";
import PaginationComponent from "../CommanComponents/PaginationComponent";

export default function CorporateListForUser() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(false);
  const corporateSuggestions1 = useSelector(
    (state) => state.service.corporateSuggestions?.data
  );
  const [corporateSuggestions, setCorporateSuggestions] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const latitude = localStorage.getItem("latitude");
        const longitude = localStorage.getItem("longitude");

        if (latitude && longitude) {
          setLoading(true);

          const payload = {
            lat: latitude,
            lng: longitude,
            page,
            limit,
          };

          const resultAction = await dispatch(
            ServiceActions.getNearbyCorporateUserList(payload)
          );
          const response = resultAction.payload;
          setCorporateSuggestions(response?.data);
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
  }, [dispatch, page, limit]);

  const filteredList = (corporateSuggestions || []).filter((item) =>
    (item.full_name + " " + item.shop_name)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>All Corporates</h2>
                <p>Home / Corporates</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            {/* Sort Button */}
            <div className="sort-by-filter">
              <div className="modal-search-fixed">
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <img
                      src={require("../Assets/Images/search-icon.svg").default}
                      alt="Search"
                      width="16"
                      height="16"
                    />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-start-0"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <Loader />
            ) : Array.isArray(filteredList) && filteredList.length > 0 ? (
              <div className="services-list">
                {filteredList.map((ele) => (
                  <div key={ele._id} className="service-card">
                    <img
                      className="point-cursor"
                      src={
                        ele.profile_image
                          ? `${process.env.REACT_APP_API_URL}${ele.profile_image}`
                          : defaultImage
                      }
                      alt={ele.full_name}
                      onClick={() => navigate(`/get-corporate/${ele?._id}`)}
                    />
                    <h3>{ele.full_name || "No Name Provided"}</h3>
                    <div className="rate-stars gap-1">
                      <span className="rating-score">
                        {ele?.feedbackCount > 0
                          ? ele?.feedbackAvg?.toFixed(1)
                          : "0.0"}
                      </span>

                      {ele?.feedbackCount > 0 ? (
                        // Filled Star SVG
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                            fill="#FFC107"
                          />
                        </svg>
                      ) : (
                        // Empty Star SVG
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="gray"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2" />
                        </svg>
                      )}
                      <span className="review-count">
                        ({ele?.feedbackCount || 0} reviews)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
                <h5 className="mt-3 ">No corporates Details Found</h5>
              </div>
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
        </Container>
      </section>
    </Layout>
  );
}
