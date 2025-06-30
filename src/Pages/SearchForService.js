import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import TwoThumbSlider from "../CommanComponents/TwoThumbSlider";
import RatingSlider from "../CommanComponents/RatingSlider";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useQuery } from "../utils/CommonFunction";
import StarRating from "../CommanComponents/StarRating";

export default function SearchForService() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [kmValues, setKmValues] = useState([0, 100]);
  const [ratingvalue, setRatingValue] = useState([0]);
  const getQueryURL = useQuery();
  const searchValFromUrl = getQueryURL.get("search");
  const lat = localStorage.getItem("latitude");
  const lng = localStorage.getItem("longitude");

  const allUserCategories = useSelector(
    (state) => state.UserSlice.allUserCategories
  );

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        await dispatch(CustomerActions.getAllCategories());
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch]);

  const getSubCategories = useSelector(
    (state) => state.UserSlice.getSubCategories
  );

  useEffect(() => {
    const fetchSubCategoryAndServices = async () => {
      setLoading(true);
      try {

        let rawParams = {
          serviceCategoryName: searchValFromUrl,
          lng: lng,
          lat: lat,
          // rating: ratingvalue,
          minDistance: kmValues[0],
          maxDistance: kmValues[1],
        }

        const params = Object.fromEntries(
          Object.entries(rawParams).filter(([v, value]) => value != null)
        );

        await dispatch(CustomerActions.getFilteredSubCategories(params));
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubCategoryAndServices();
  }, [dispatch, searchValFromUrl, lng, lat, ratingvalue, kmValues]);

  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain">
                <h2>Search results for “{searchValFromUrl}”</h2>
                <div className="search-results-filter">
                  <div className="search-filter-side">
                    <div className="label-btn-txt">
                      <h3>Filters</h3>
                      <button>Clear</button>
                    </div>
                    <ul>
                      <li>
                        <label>Distance</label>
                      </li>
                    </ul>
                    <TwoThumbSlider
                      kmValues={kmValues}
                      setKmValues={setKmValues}
                    />
                    {/* <div className="label-btn-txt">
                      <h3>Price Range</h3>
                      <button>Clear</button>
                    </div> */}
                    <div className="label-btn-txt">
                      <h3>Rating</h3>
                    </div>

                    <RatingSlider
                      ratingvalue={ratingvalue}
                      setRatingValue={setRatingValue}
                    />
                    <div className="label-btn-txt">
                      <h3>Categories</h3>
                    </div>
                    <div className="search-filtration">
                      <ul>
                        {Array.isArray(allUserCategories?.allCat) &&
                          allUserCategories?.allCat?.length > 0 && (
                            <>
                              {allUserCategories?.allCat.map((ele, index) => (
                                <li key={index} className="d-flex">
                                  <input
                                    type="checkbox"
                                    checked={
                                      ele?.service_category_name
                                        ?.replace(/\s*,\s*/g, ",")
                                        ?.trim() === searchValFromUrl?.replace(/\s*,\s*/g, ",")
                                          ?.trim()
                                    }
                                    onChange={() => {
                                      const encodedSearch = encodeURIComponent(
                                        ele?.service_category_name?.replace(/\s*,\s*/g, ",")?.trim()
                                      );
                                      Navigate(
                                        `/search-for-service?search=${encodedSearch}&id=${ele?._id}`
                                      );
                                    }}
                                  />
                                  <label>{ele?.service_category_name}</label>
                                </li>
                              ))}
                            </>
                          )}
                      </ul>
                    </div>
                  </div>
                  <div className="search-results-side">
                    <ul>
                      {Array.isArray(getSubCategories) &&
                        getSubCategories.length > 0 ? (
                        <>
                          {Array.isArray(getSubCategories) &&
                            getSubCategories.length > 0 &&
                            getSubCategories.map((ele, index) => {
                              return (
                                <li className="mb-4">
                                  <div
                                    className="search-results-card"
                                    onClick={() => Navigate(`/customer-service-detail?service_id=${ele?._id}`)}
                                  >
                                    {Array.isArray(ele?.images) &&
                                      ele.images.length > 0 && (
                                        <img
                                          className="point-cursor"
                                          src={`${process.env.REACT_APP_API_URL}/user/${ele?.images[0]}`}
                                          alt="categories-img"
                                        />
                                      )}
                                    <div>
                                      <div className="rating-stars">
                                        <StarRating averageRating={ele?.averageRating} />
                                      </div>
                                      <h3>{ele?.serviceSubCategoryName}</h3>
                                      <p>{ele.desc}</p>
                                      <h4>${ele?.price}</h4>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                        </>
                      ) : (
                        <>
                          <h2> No Data Found </h2>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
