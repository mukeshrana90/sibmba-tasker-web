import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";

export default function CustomerReviews() {
  const Navigate = useNavigate();
  const dispatch = useDispatch();
  const reviewList = useSelector((e) => e.service.getReviewList);

  useEffect(() => {
    dispatch(ServiceActions.getCustomerReviews({}));
  }, [dispatch]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const filteredReviews = (tab) => {
    const list = Array.isArray(reviewList) ? reviewList : [];
    if (tab === "all") {
      return list;
    }
    if (tab === "published") {
      return list.filter((review) => Number(review.status) === 1);
    }
    if (tab === "rejected") {
      return list.filter((review) => Number(review.status) === 2);
    }
    return [];
  };

  const getReviewStatusNum = (review) => Number(review?.status);
  const isReviewPending = (review) => {
    const s = getReviewStatusNum(review);
    return s !== 1 && s !== 2;
  };

  const handleReviewAction = (id, action) => {
    if (action === "publish") {
      let data = {
        feedback_id: id,
        status: 1,
      };
      dispatch(ServiceActions.updateReviewStatus(data)).then((res) => {
        if (res?.payload?.success) {
          toast.success("Review Published Successfully");
          dispatch(ServiceActions.getCustomerReviews({}));
        }
      });
    } else {
      let data = {
        feedback_id: id,
        status: 2,
      };
      dispatch(ServiceActions.updateReviewStatus(data)).then((res) => {
        if (res?.payload?.success) {
          toast.success("Review Rejected Successfully");
          dispatch(ServiceActions.getCustomerReviews({}));
        }
      });
    }
  };

  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain">
                <h2>Customer Reviews</h2>
                <div className="bookings-tabs">
                  <Tab.Container
                    id="left-tabs-example"
                    defaultActiveKey="all"
                  >
                    <Row>
                      <Col sm={12}>
                        <div className="task-post-action mb-4">
                          <Nav variant="pills" className="bookings-tab-nav">
                            <Nav.Item>
                              <Nav.Link eventKey="all">All</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                              <Nav.Link eventKey="published">
                                Published
                              </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                              <Nav.Link eventKey="rejected">Rejected</Nav.Link>
                            </Nav.Item>
                          </Nav>
                        </div>
                      </Col>
                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="all">
                            {filteredReviews("all")?.length > 0 ? (
                              <Row>
                                {filteredReviews("all").map((review, index) => (
                                  <Col
                                    key={review._id}
                                    sm={12}
                                    md={6}
                                    className="mb-4"
                                  >
                                    <div
                                      className={`review-section${
                                        !isReviewPending(review)
                                          ? " review-section--with-corner-badge"
                                          : ""
                                      }`}
                                    >
                                      {!isReviewPending(review) && (
                                        <span
                                          className={
                                            getReviewStatusNum(review) === 1
                                              ? "review-status-corner-badge review-status-corner-badge--published"
                                              : "review-status-corner-badge review-status-corner-badge--rejected"
                                          }
                                        >
                                          {getReviewStatusNum(review) === 1
                                            ? "Published"
                                            : "Rejected"}
                                        </span>
                                      )}
                                      <div className="review-section-main">
                                        <div className="review-content">
                                          <div className=" review-main d-flex align-items-center">
                                            <img
                                              src={`${process.env.REACT_APP_API_URL}/${review.user_id?.profile_image}`}
                                              alt={""}
                                              style={{
                                                width: "60px",
                                                height: "60px",
                                                objectFit: "cover",
                                              }}
                                            />
                                            <div>
                                              <h3>
                                                {review.user_id?.full_name ||
                                                  ""}
                                              </h3>

                                              <StarRating
                                                averageRating={review?.rating}
                                                type={"noreview"}
                                              />{" "}
                                              {formatDate(review?.createdAt)}
                                            </div>
                                          </div>
                                          <p>{review.message || ""}</p>
                                        </div>
                                      </div>
                                      {isReviewPending(review) && (
                                        <div className="review-btn">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleReviewAction(
                                                review?._id,
                                                "publish"
                                              )
                                            }
                                          >
                                            Publish
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleReviewAction(
                                                review?._id,
                                                "reject"
                                              )
                                            }
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            ) : (
                              <div className="no-upcoming-bookings">
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
                                <h3>No Reviews Yet</h3>
                                <p>Currently you don’t have any reviews.</p>
                              </div>
                            )}
                          </Tab.Pane>
                          <Tab.Pane eventKey="published">
                            {filteredReviews("published")?.length > 0 ? (
                              <Row>
                                {filteredReviews("published").map(
                                  (review, index) => (
                                    <Col
                                      key={review._id}
                                      sm={12}
                                      md={4}
                                      className="mb-4"
                                    >
                                      <div className="review-section2">
                                        <div>
                                          <div className=" review-content2">
                                            <div className=" review-main2 d-flex align-items-center">
                                              <img
                                                src={`${process.env.REACT_APP_API_URL}/${review.user_id?.profile_image}`}
                                                alt={""}
                                                style={{
                                                  width: "60px",
                                                  height: "60px",
                                                  objectFit: "cover",
                                                }}
                                              />
                                              <div>
                                                <h3>
                                                  {review.user_id?.full_name ||
                                                    ""}
                                                </h3>
                                                <p>
                                                  <StarRating averageRating={review?.rating} type={"noreview"}/>
                                                </p>
                                              </div>
                                            </div>
                                            <div className="date-sec">
                                              {formatDate(
                                                review.createdAt || new Date()
                                              )}
                                            </div>
                                          </div>
                                          <div className="review-msgs">
                                            <p>{review.message || ""}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </Col>
                                  )
                                )}
                              </Row>
                            ) : (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="114"
                                  height="114"
                                  viewBox="0 0 114 114"
                                  fill="none"
                                >
                                  <g opacity="0.3">
                                    <path
                                      d="M57 57C70.8 57 82 45.8 82 32C82 18.2 70.8 7 57 7C43.2 7 32 18.2 32 32C32 45.8 43.2 57 57 57Z"
                                      fill="#888888"
                                    />
                                  </g>
                                </svg>
                                <h3>No Published Reviews Yet</h3>
                                <p>
                                  Currently you don’t have any published
                                  reviews.
                                </p>
                              </div>
                            )}
                          </Tab.Pane>
                          <Tab.Pane eventKey="rejected">
                            {filteredReviews("rejected")?.length > 0 ? (
                              <Row>
                                {filteredReviews("rejected").map(
                                  (review, index) => (
                                    <Col
                                      key={review._id}
                                      sm={12}
                                      md={4}
                                      className="mb-4"
                                    >
                                      <div className="review-section2">
                                        <div>
                                          <div className="review-content2">
                                            <div className="review-main2 d-flex align-items-center">
                                              <img
                                                src={`${process.env.REACT_APP_API_URL}/${review.user_id?.profile_image}`}
                                                alt={""}
                                                style={{
                                                  width: "60px",
                                                  height: "60px",
                                                  objectFit: "cover",
                                                }}
                                              />
                                              <div>
                                                <h3>
                                                  {review.user_id?.full_name ||
                                                    ""}
                                                </h3>
                                                <p>
                                                  <StarRating averageRating={review?.rating} type={"noreview"}/>
                                                </p>
                                              </div>
                                            </div>
                                            <div className="date-sec">
                                              {formatDate(
                                                review.createdAt || new Date()
                                              )}
                                            </div>
                                          </div>
                                          <div className="review-msgs">
                                            <p>{review.message || ""}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </Col>
                                  )
                                )}
                              </Row>
                            ) : (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="114"
                                  height="114"
                                  viewBox="0 0 114 114"
                                  fill="none"
                                >
                                  <g opacity="0.3">
                                    <path
                                      d="M57 57C70.8 57 82 45.8 82 32C82 18.2 70.8 7 57 7C43.2 7 32 18.2 32 32C32 45.8 43.2 57 57 57Z"
                                      fill="#888888"
                                    />
                                  </g>
                                </svg>
                                <h3>No Rejected Reviews Yet</h3>
                                <p>
                                  Currently you don’t have any rejected reviews.
                                </p>
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
