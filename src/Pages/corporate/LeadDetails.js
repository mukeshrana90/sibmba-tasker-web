import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import moment from "moment";
import StarRating from "../../CommanComponents/StarRating";
import ChatIcon from "../../Assets/Images/chat.svg";
import mapIcon from "../../Assets/Images/map.svg";

export default function LeadDetails() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const postTaskDetails = useSelector(
    (state) => state.UserSlice.postTaskDetail
  );
  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: postTaskDetails?.data?.task?.images?.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          arrows: false,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
        },
      },
    ],
  };

  useEffect(() => {
    dispatch(CustomerActions.getPostTaskDetail(id));
  }, [dispatch, id]);

  const task = postTaskDetails?.data?.task;
  const quotations = postTaskDetails?.data?.quotations;

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title lead-details-wrapper d-flex align-items-center gap-2">
                  <Link onClick={() => navigate(-1)} className="d-flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="42"
                    viewBox="0 0 40 42"
                    fill="none"
                  >
                    <path
                      d="M10 21L8.91379 22.0345L7.92857 21L8.91379 19.9655L10 21ZM30 19.5C30.8284 19.5 31.5 20.1716 31.5 21C31.5 21.8284 30.8284 22.5 30 22.5V19.5ZM15.5805 29.0345L8.91379 22.0345L11.0862 19.9655L17.7529 26.9655L15.5805 29.0345ZM8.91379 19.9655L15.5805 12.9655L17.7529 15.0345L11.0862 22.0345L8.91379 19.9655ZM10 19.5H30V22.5L10 22.5L10 19.5Z"
                      fill="#40413A"
                    />
                  </svg>
                </Link>
                    <h2 className="mt-0">Task Details</h2>
                  </div>

              <div className="service-detail-card pt-3">
                {task?.images?.length > 0 ? (
                  <Slider {...sliderSettings}>
                    {task.images.map((image, index) => (
                      <div key={index} className="card-box task-details">
                        <img
                          src={`${process.env.REACT_APP_API_URLL}/${image}`}
                          alt={task.need_done}
                          style={{ maxWidth: "200px", margin: "0 auto" }}
                        />
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <img
                    src={require("../../Assets/Images/living-room-cleaning.png")}
                    alt="Default"
                  />
                )}
                <div>
                  <h3>{task?.need_done || "Task"}</h3>
                  <h5>
                    {task?.task_time},{" "}
                    {task?.when_done
                      ? moment(task.when_done).format("DD MMM")
                      : "N/A"}
                  </h5>
                  <p>{task?.details || "No description provided."}</p>
                   <p>Budget:${task?.budget || "-"}</p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      <section className="category-services-sec pt-0 mt-5">
       <Container>
    <div className="category-services-lists">
    <div className="list-title">
      <h2 className="mb-0">Quotations</h2>
    </div>
      <p className="mt-0">About Service Provider</p>

    {quotations?.length === 0 ? (
      <div className="no-upcoming-bookings">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80" fill="none">
          {/* SVG paths omitted for brevity */}
        </svg>
        <h3>No Quotations Yet</h3>
        <p>Currently you don’t have any offers</p>
      </div>
    ) : (
      <div>
        {quotations?.map((quotation, index) => (
          <div className="quotation-requests-wrap" key={index}>
            <div className="quotation-requests quotation-requests-inner">
              <div>
                <div className="quotation-txt-show">
                  <div
                    className="profile-side cursor-pointer"
                    onClick={() => navigate(`/quotations-detail/${quotation?._id}`)}
                  >
                    <img
                      className="point-cursor"
                      src={`${process.env.REACT_APP_API_URL}/${quotation?.service_provider?.profile_image}`}
                      alt="categories-img"
                    />
                    <div>
                      <h5>{quotation?.service_provider?.full_name}</h5>
                      <p>{quotation?.service_provider?.email}</p>
                      <p>{quotation?.service_provider?.address}</p>
                      <div className="rating-stars">
                        <ul>
                          <StarRating averageRating={quotation.averageRating} />
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <p>{quotation?.description}</p>
              </div>
              <div className="quotation-requests-task-btns">
                <div>
                  <h5>${quotation?.offer_price}</h5>
                  <p>Offer Price</p>
                </div>
              </div>
            </div>

            {quotation?.corporateSuggestion?.length > 0 && (
              <div className="quotation-wrapper">
                <div className="suggested-caproate">
                  <h5>Suggested Corporate</h5>
                  <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                    {quotation.corporateSuggestion.map((item, idx) => (
                      <div
                        key={item._id || idx}
                        className="corporate-item d-flex align-items-center py-2"
                        style={{ gap: "10px" }}
                      >
                        <img
                          src={`${process.env.REACT_APP_API_URL}/${item?.corporateIds?.profile_image}`}
                          alt={item.corporateIds?.full_name}
                          className="rounded-circle"
                          width={40}
                          height={40}
                        />
                        <div className="flex-grow-1">
                          <div className="fw-bold">{item.corporateIds?.full_name}</div>
                          <div className="text-muted small">{item.corporateIds?.shop_name}</div>
                          <div className="text-muted small">{item.corporateIds?.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

           <div className="quotation-inner d-flex justify-content-center gap-4 mt-3">
            {quotation?.corporateSuggestion?.some(s => s.status !== 'rejected') && (
              <>
                <button onClick={() => navigate(`/messages`)}>
                  <img src={ChatIcon} alt="" /> Chat
                </button>
                <button>
                  <img src={mapIcon} alt="" /> Map
                </button>
              </>
              
            )}
          </div>

          </div>
        ))}
      </div>
    )}
  </div>
      </Container>

      </section>
    </Layout>
  );
}
