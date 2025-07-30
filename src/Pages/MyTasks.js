import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import moment from "moment";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";

export default function MyTasks() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("first");

  const allMyPosts = useSelector((state) => state.UserSlice.postlist);
  const allMyQuotations = useSelector((state) => state.UserSlice.myQuotations);

  useEffect(() => {
    dispatch(CustomerActions.getPostList());
    dispatch(CustomerActions.getMyQuotationsList());
  }, [dispatch]);

  const handleAccept = (data, type) => {
    let obj = {
      quatation_id: data?._id,
      task_id: data?.task_id?._id,
      service_provider_id: data?.service_provider?._id,
      status: type === "accept" ? 1 : 2,
    };

    dispatch(CustomerActions.acceptRejectTaskStatus(obj)).then((res) => {
      if (res?.payload?.success) {
        toast.success(type === "accept" ? "Accepted." : "Rejected.");
        setActiveTab("first");
        dispatch(CustomerActions.getPostList());
      } else {
        toast.error(res?.payload?.message);
      }
    });
  };

  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain mt-3">
                {/* <h2>Bookings</h2> */}
                <div className="bookings-tabs">
                  <Tab.Container
                    id="left-tabs-example"
                    defaultActiveKey="first"
                    activeKey={activeTab}
                    onSelect={(key) => setActiveTab(key)}
                  >
                    <Row>
                      <Col sm={12}>
                        <div className="task-post-action mt-5 mb-4">
                          <Nav variant="pills" className="bookings-tab-nav">
                            <Nav.Item>
                              <Nav.Link eventKey="first">My Tasks</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                              <Nav.Link eventKey="second">
                                Quotation requests
                              </Nav.Link>
                            </Nav.Item>
                          </Nav>
                          <button className="mb-2" onClick={() => navigate("/post-task")}>
                            Post
                          </button>
                        </div>
                      </Col>
                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="first">
                            {allMyPosts && allMyPosts?.length > 0 ? (
                              <div className="bookings-cards">
                                <ul>
                                  {allMyPosts?.map((post) => (
                                    <li key={post._id}>
                                      <div className="bookings-card-item">
                                        <img
                                          className="my-task"
                                          src={
                                            post?.images?.length
                                              ? `${process.env.REACT_APP_API_URLL}/${post?.images[0]}`
                                              : ""
                                          }
                                          alt={post.need_done}
                                          onClick={() =>
                                            navigate(
                                              `/task-detail/${post?._id}`
                                            )
                                          }
                                          style={{
                                            cursor: "pointer",
                                            maxWidth: "100px",
                                          }}
                                        />
                                        <div className="bookings-card-data my-task-ad-card">
                                          <div>
                                            <div>
                                              <h3>{post.need_done}</h3>
                                              <p>
                                                {post.task_time},{" "}
                                                {`${moment(
                                                  post.when_done
                                                ).format("DD MMM")}`}
                                              </p>
                                              <span>{post.details}</span>
                                              <h5>${post.budget}</h5>
                                            </div>
                                          </div>
                                          <div>
                                            {/* <div className="chat-btn-card">
                                              <button>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="32"
                                                  height="35"
                                                  viewBox="0 0 32 35"
                                                  fill="none"
                                                >
                                                  <path
                                                    d="M16.0001 11.084C16.8838 11.084 17.6001 10.3005 17.6001 9.33398C17.6001 8.36749 16.8838 7.58398 16.0001 7.58398C15.1165 7.58398 14.4001 8.36749 14.4001 9.33398C14.4001 10.3005 15.1165 11.084 16.0001 11.084Z"
                                                    fill="#545454"
                                                  />
                                                  <path
                                                    d="M16.0001 19.25C16.8838 19.25 17.6001 18.4665 17.6001 17.5C17.6001 16.5335 16.8838 15.75 16.0001 15.75C15.1165 15.75 14.4001 16.5335 14.4001 17.5C14.4001 18.4665 15.1165 19.25 16.0001 19.25Z"
                                                    fill="#545454"
                                                  />
                                                  <path
                                                    d="M16.0001 27.418C16.8838 27.418 17.6001 26.6345 17.6001 25.668C17.6001 24.7015 16.8838 23.918 16.0001 23.918C15.1165 23.918 14.4001 24.7015 14.4001 25.668C14.4001 26.6345 15.1165 27.418 16.0001 27.418Z"
                                                    fill="#545454"
                                                  />
                                                </svg>
                                              </button>
                                            </div> */}
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
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
                                <h3>No Tasks</h3>
                                <p>
                                  You don’t have any Tasks.
                                  {/* <br /> Place & Track your bookings here. */}
                                </p>
                                {/* <button onClick={() => navigate("/services")}>
                                  View all services
                                </button> */}
                              </div>
                            )}
                          </Tab.Pane>
                          <Tab.Pane eventKey="second">
                            <div>
                              {allMyQuotations?.length > 0 ?
                                allMyQuotations?.map((quotation, i) => (
                                  <div className="quotation-requests-wrap">
                                  <div className="quotation-requests quotation-requests-inner">
                                    <div className="quotation-requests-inner">
                                      <div className="quotation-txt-show">
                                        <div className="profile-side">
                                          <img
                                            className="point-cursor"
                                            src={`${process.env.REACT_APP_API_URL}/${quotation?.service_provider?.profile_image}`}
                                            alt="categories-img"
                                          />
                                          <div>
                                            <h5>
                                              {
                                                quotation?.service_provider
                                                  ?.full_name
                                              }
                                            </h5>
                                            <p>
                                              {
                                                quotation?.service_provider
                                                  ?.address
                                              }
                                            </p>
                                            <div className="rating-stars">
                                              <ul> <StarRating averageRating={quotation?.averageRating} /></ul>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <p>{quotation?.description}</p>
                                    </div>
                                    <div className="tasks-requests-btns">
                                      <div className="quotation-price">
                                        <h5>${quotation?.offer_price}</h5>
                                        <p>Offer Price</p>
                                      </div>
                                      <div className="tasks-btn">
                                        <button
                                          onClick={() =>
                                            handleAccept(quotation, "accept")
                                          }
                                        >
                                          Accept
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleAccept(quotation, "reject")
                                          }
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                   <div className="quotation-wrapper">
                                       {quotation?.corporateSuggestion?.length > 0 && (
                                        <div className="suggested-caproate">
                                          <h5>Suggested Corporate</h5>
                                          <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                                            {quotation.corporateSuggestion.map((item, index) => {
                                              const corp = item?.corporateIds;
                                              if (!corp) return null;

                                              return (
                                                <div
                                                  key={item._id || index}
                                                  className="corporate-item d-flex align-items-center py-2"
                                                  style={{ gap: "10px" }}
                                                >
                                                  <img
                                                    src={`${process.env.REACT_APP_API_URL}/${corp.profile_image}`}
                                                    alt={corp.full_name}
                                                    className="rounded-circle"
                                                    width={40}
                                                    height={40}
                                                  />
                                                  <div className="flex-grow-1">
                                                    <div className="fw-bold">{corp.full_name}</div>
                                                    <div className="text-muted small">{corp.shop_name}</div>
                                                    <div className="text-muted small">{corp.email}</div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )) : (
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
                                    <h3>No Quotations</h3>
                                    <p>
                                      You don’t have any Quotations.
                                      {/* <br /> Place & Track your bookings here. */}
                                    </p>
                                    {/* <button onClick={() => navigate("/services")}>
                                  View all services
                                </button> */}
                                  </div>
                                )}
                            </div>
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
