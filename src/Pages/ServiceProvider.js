import React, { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import ServiceActions from "../Redux/Actions/ServiceActions";
import CustomerActions from "../Redux/Actions/CustomerActions";
import StarRating from "../CommanComponents/StarRating";
import { formatDate } from "fullcalendar/index.js";
import { chunk } from "lodash";
import defaultImage from "../Assets/Images/placeholder.jpg"

export default function ServiceProvider() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  // const serviceSubCatDetail = useSelector((e) => e.UserSlice.serviceSubCatList);
  const serviceSubCatDetail = useSelector((e) => e.UserSlice.detailService);


  useEffect(() => {
    // dispatch(ServiceActions.getServiceSubCatById({ id: id }));
    dispatch(CustomerActions.getServiceDetailReview({ id: id }));
  }, []);


  const feedbackCount = serviceSubCatDetail?.feedbacks?.length || 0;
  const slidesToScrollValue = feedbackCount < 3 ? 1 : 3;

  const settings = {
    dots: true,
    infinite: feedbackCount > 3,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const groupedFeedbacks = chunk(serviceSubCatDetail?.feedbacks || [], 3); // chunks of 3

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <section className="category-services-sec pb-0 ">
                <Container>
                  <div className="category-services-lists">
                    <div className="list-title">
                      <h2>Service Provider</h2>
                    </div>
                    <div className="provider-pro-view">
                      <div>
                        <img
                          src={
                            serviceSubCatDetail?.serviceProviderId?.profile_image
                              ? `${process.env.REACT_APP_API_URL}${serviceSubCatDetail?.serviceProviderId?.profile_image}`
                              : defaultImage
                          }
                          alt={""}
                          style={{
                            cursor: "pointer",
                            maxWidth: "200px",
                            borderRadius: "50%",
                          }}
                        />
                        <div>
                          <h5>{serviceSubCatDetail?.serviceProviderId?.company_name !=='undefined' ? serviceSubCatDetail?.serviceProviderId?.company_name  : '-' || '-'}</h5>
                          <p>
                            {serviceSubCatDetail?.serviceProviderId?.street_address ==='undefined' ? '-' : serviceSubCatDetail?.serviceProviderId?.street_address ||
                              "Service Provider"}
                          </p>

                          <div className="rating-stars">
                            <StarRating
                              averageRating={serviceSubCatDetail?.averageRating}
                            />
                          </div>
                        </div>
                      </div>
                     {serviceSubCatDetail?.serviceProviderId !==null && serviceSubCatDetail?.serviceProviderId?._id && (
                       <button
                        onClick={() => {
                          navigate(
                            `/messages?userID=${serviceSubCatDetail?.serviceProviderId?._id}`
                          );
                          localStorage.setItem(
                            "reciverID",
                            serviceSubCatDetail?.serviceProviderId?._id
                          );
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="25"
                          viewBox="0 0 24 25"
                          fill="none"
                        >
                          <path
                            d="M21.4859 11.0015C21.8494 10.9788 22.1767 11.2207 22.2617 11.5749C22.3659 12.0084 22.4344 12.4557 22.4643 12.9134C22.512 13.645 22.512 14.4016 22.4643 15.1333C22.3682 16.6066 21.7212 17.9294 21.0096 18.9949C20.8323 19.3418 20.9143 19.8954 21.3068 20.6324L21.3272 20.6705C21.4584 20.9167 21.5926 21.1686 21.6709 21.3857C21.7545 21.6176 21.8516 22.0142 21.6178 22.409C21.4051 22.7683 21.0669 22.8957 20.8084 22.9453C20.5968 22.9858 20.3401 22.9919 20.1105 22.9973L20.0686 22.9983C18.8373 23.028 17.9638 22.6749 17.2713 22.169C17.165 22.0914 17.0866 22.0343 17.0256 21.9913C16.9331 22.0265 16.811 22.0762 16.641 22.1455C16.1692 22.338 15.635 22.4528 15.1444 22.4851C13.901 22.567 12.6017 22.5672 11.3558 22.4851C9.85327 22.3862 8.46648 21.8651 7.31325 21.0388C7.02544 20.8326 6.92104 20.4532 7.06284 20.1287C7.20464 19.8043 7.55401 19.6233 7.90084 19.6944C9.79994 20.0842 12.8355 20.1543 15.4813 19.0777C18.0693 18.0247 20.3172 15.8699 20.7871 11.6667C20.8276 11.3047 21.1223 11.0241 21.4859 11.0015Z"
                            fill="#252525"
                          />
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M12.1443 1.56147C10.8984 1.47942 9.59906 1.4796 8.35571 1.56147C4.42185 1.82054 1.29316 4.96804 1.03579 8.91335C0.98807 9.64497 0.98807 10.4016 1.03579 11.1333C1.13191 12.6066 1.77884 13.9294 2.49047 14.9949C2.66772 15.3418 2.58576 15.8954 2.19322 16.6324L2.17291 16.6705C2.04166 16.9167 1.90744 17.1685 1.82916 17.3857C1.74552 17.6176 1.64847 18.0142 1.88225 18.409C1.96127 18.5425 2.07112 18.6704 2.22404 18.7719C2.37081 18.8692 2.52248 18.9189 2.65415 18.947C2.88549 18.9964 3.16753 18.9984 3.44071 18.9985C4.6671 19.0262 5.53802 18.6736 6.22877 18.169C6.33506 18.0913 6.41347 18.0342 6.47449 17.9913C6.56698 18.0265 6.68915 18.0762 6.85908 18.1455C7.33095 18.338 7.86507 18.4528 8.35571 18.4851C9.59905 18.567 10.8984 18.5672 12.1443 18.4851C16.0781 18.2261 19.2069 15.0785 19.4642 11.1332C19.5119 10.4016 19.5119 9.64493 19.4642 8.91334C19.2068 4.96803 16.0781 1.82054 12.1443 1.56147ZM6.75 7.5C6.33579 7.5 6 7.83579 6 8.25C6 8.66421 6.33579 9 6.75 9H10.75C11.1642 9 11.5 8.66421 11.5 8.25C11.5 7.83579 11.1642 7.5 10.75 7.5H6.75ZM6.75 13H13.75C14.1642 13 14.5 12.6642 14.5 12.25C14.5 11.8358 14.1642 11.5 13.75 11.5H6.75C6.33579 11.5 6 11.8358 6 12.25C6 12.6642 6.33579 13 6.75 13Z"
                            fill="#252525"
                          />
                        </svg>
                      </button>
                     )}
                    </div>
                  </div>
                </Container>
              </section>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <h2>Reviews</h2>
            </div>

            <div className="booked-services-slide">
              {feedbackCount > 0 ? (
                <Slider {...settings}>
                  {groupedFeedbacks?.map((group, index) => (
                    <div key={index} className="review-slide-group">
                      <div className="d-flex gap-4">
                        {group.map((feedback, i) => (
                          <div
                            key={i}
                            className="review-slide-card"
                            style={{ flex: 1 }}
                          >
                            <div>
                              <div className="review-img">
                                <img
                                  src={`${process.env.REACT_APP_API_URL}/${feedback?.user_id?.profile_image}`}
                                  alt=""
                                />
                              </div>
                              <div className="rv-section">
                                <h4>{feedback?.user_id?.full_name}</h4>
                                <div className="rate-stars">
                                  <ul>
                                    <StarRating
                                      averageRating={feedback?.rating}
                                      type="noreview"
                                    />
                                  </ul>
                                </div>
                              </div>
                              <div className="rv-date">
                                <p>{formatDate(feedback?.createdAt)}</p>
                              </div>
                            </div>
                            <p>{feedback?.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </Slider>
              ) : (
                <p>No Reviews</p>
              )}
            </div>
          </div>
        </Container>
      </section>
    </Layout>
  );
}
