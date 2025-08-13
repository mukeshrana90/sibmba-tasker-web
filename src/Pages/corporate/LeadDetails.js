import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Layout from "../../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import moment from "moment";
import StarRating from "../../CommanComponents/StarRating";
import ChatIcon from "../../Assets/Images/chat.svg";
import mapIcon from "../../Assets/Images/map.svg";
import { Modal } from "react-bootstrap";
import MapComponent from "../../CommanComponents/MapComponent";
import CorporateActions from "../../Redux/Actions/corporateActions";
import { toast } from "react-toastify";

export default function LeadDetails() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");

  const [showMapModal, setShowMapModal] = useState(false);
  const [jobStatus, setJobStatus] = useState("");

  const postTaskDetails = useSelector(
    (state) => state.UserSlice.postTaskDetail
  );
  const [bookingState, setBookingState] = useState();

  const getStatusLabel = (status) => {
    const statusMap = {
      1: "Pending",
      2: "Confirmed",
      3: "Canceled",
      4: "Completed",
      5: "Rejected",
    };

    return statusMap[status] || "N/A";
  };

  const getStatusColor = (status) => {
    const statusMap = {
      1: "pending",
      2: "cancelled",
      3: "completed",
      4: "in-progress",
      5: "cancelled",
    };

    return statusMap[status] || "N/A";
  };
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
    if (type === "service") {
      dispatch(CustomerActions.getBookingById({ id })).then((res) => {
        if (res?.payload?.success) {
          setBookingState(res?.payload?.data);
        }
      });
    } else {
      dispatch(CustomerActions.getPostTaskDetail(id));
    }
  }, [dispatch, id]);
  const task = postTaskDetails?.data?.task;
  const quotations = postTaskDetails?.data?.quotations;

  const handleAccept = (data, status) => {
    const payload = {
      status: status,
    };

    let matchedItem = null;

    if (type === "task") {
      // For task: iterate over quotations and extract corporateSuggestion
      const allSuggestions = quotations.flatMap((q) =>
        q.corporateSuggestion.map((s) => ({
          corporateStatus: s.corporateStatus,
          userStatus: s.userStatus,
          taskId: s.taskId,
        }))
      );

      matchedItem = allSuggestions.find(
        (item) => item.corporateStatus === 1 && item.userStatus === 1
      );

      if (matchedItem) {
        payload.taskId = matchedItem.taskId;
      }
    } else {
      // For service: data.corporateSuggestions is directly accessible
      const result = data.corporateSuggestions.map((i) => ({
        corporateStatus: i.corporateStatus,
        userStatus: i.userStatus,
        bookingId: i.bookingId,
      }));

      matchedItem = result.find(
        (item) => item.corporateStatus === 1 && item.userStatus === 1
      );

      if (matchedItem) {
        setJobStatus(matchedItem);
        payload.bookingId = matchedItem.bookingId;
      }
    }
    // Dispatch action
    dispatch(CorporateActions.acceptRejectCorporateSuggestion(payload))
      .then((res) => {
        if (res?.payload) {
          toast.success(
            status === 3 ? "Accepted successfully." : "Rejected successfully."
          );
          navigate("/corporate/leads?page=leads");
        }
      })
      .catch(() => {
        toast.error("An error occurred. Please try again.");
      });
  };

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
                <h2 className="mt-0">
                  {" "}
                  {bookingState ? "Booking Details" : "Task Detsils"}
                </h2>
              </div>
              {bookingState ? (
                <>
                  <div className="service-detail-card pt-3">
                    {bookingState?.images?.length > 0 ? (
                      <Slider {...sliderSettings}>
                        {bookingState.images.map((image, index) => (
                          <div key={index} className="card-box task-details">
                            <img
                              src={`${process.env.REACT_APP_API_URLL}${image}`}
                              alt={bookingState.need_done}
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
                      <h3>{bookingState?.message || "-"}</h3>
                      <h5>{bookingState?.date}</h5>
                      <p>Slots:{bookingState?.slotTime || "-"}</p>
                      <p>
                        {bookingState?.address || "No description provided."}
                      </p>
                      <div className="book-now-product mb-0">
                            {bookingState?.corporateSuggestions?.some(
                              (cs) => cs.corporateStatus === 3
                            ) ? (
                              <h5 className="text-success">Job Done By You!</h5>
                            ) : (
                              <button
                                className="primaryBtn"
                                onClick={() => handleAccept(bookingState, 3)}
                              >
                                Job Done
                              </button>
                            )}
                          </div>

                    </div>
                  </div>
                  <section className="category-services-sec pt-0 mt-5">
                    <Container>
                      <div className="category-services-lists">
                        <h5>About Service Provider</h5>
                        <div className="quotation-requests-wrap">
                          {bookingState?.serviceProvider ? (
                            <>
                              <div className="quotation-txt-show">
                                <div className="profile-side cursor-pointer">
                                  <img
                                    className="point-cursor"
                                    src={`${process.env.REACT_APP_API_URL}${bookingState?.serviceProvider?.profile_image}`}
                                    alt="categories-img"
                                  />
                                  <div>
                                    <h5>
                                      {bookingState?.serviceProvider?.full_name}
                                    </h5>
                                    <p>
                                      {bookingState?.serviceProvider?.email}
                                    </p>
                                    <p>
                                      {bookingState?.serviceProvider?.address}
                                    </p>
                                    <p className="text-muted mt-1">
                                      Company Name:{" "}
                                      {
                                        bookingState?.serviceProvider
                                          ?.company_name
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <p>{bookingState.serviceProvider?.description}</p>

                              <div className="flex mt-3">
                                Status:{" "}
                                <h3
                                  className={`corporate_inner ${getStatusColor(
                                    bookingState.serviceProvider.status
                                  )}`}
                                >
                                  Booking{" "}
                                  {getStatusLabel(
                                    bookingState.serviceProvider.status
                                  )}
                                </h3>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted mt-3">
                              No service provider details available.
                            </p>
                          )}

                          {bookingState.corporateSuggestions?.length > 0 && (
                            <div className="quotation-wrapper">
                              <div className="suggested-caproate">
                                <h5>Suggested Corporate</h5>
                                <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                                  {bookingState.corporateSuggestions.map(
                                    (item, idx) => (
                                      <div
                                        key={item._id || idx}
                                        className="corporate-item d-flex align-items-center py-2"
                                        style={{ gap: "10px" }}
                                      >
                                        <img
                                          src={`${process.env.REACT_APP_API_URL}/${item.corporateIds?.profile_image}`}
                                          alt={item.corporateIds?.full_name}
                                          className="rounded-circle"
                                          width={40}
                                          height={40}
                                        />
                                        <div className="flex-grow-1">
                                          <div className="fw-bold">
                                            {item.corporateIds?.full_name}
                                          </div>
                                          <div className="text-muted small">
                                            {item.corporateIds?.shop_name}
                                          </div>
                                          <div className="text-muted small">
                                            {item.corporateIds?.email}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                              <div>
                                {bookingState?.corporateSuggestions
                                  ?.filter((item) => item.status !== "rejected")
                                  .map((item, index) => (
                                    <div
                                      key={item._id || index}
                                      className="quotation-inner d-flex justify-content-center gap-4 mt-3"
                                    >
                                      <button
                                        onClick={() => {
                                          navigate(
                                            `/messages?userID=${bookingState?.bookBy?._id}`
                                          );
                                          localStorage.setItem(
                                            "reciverID",
                                            bookingState?.bookBy?._id
                                          );
                                        }}
                                      >
                                        <img src={ChatIcon} alt="" /> Chat
                                      </button>

                                      <button
                                        onClick={() => setShowMapModal(item)}
                                      >
                                        <img src={mapIcon} alt="" /> Map
                                      </button>

                                      <Modal
                                        show={showMapModal === item}
                                        onHide={() => setShowMapModal(false)}
                                        centered
                                        size="lg"
                                      >
                                        <Modal.Header
                                          closeButton
                                          className="border-none pb-0"
                                        >
                                          <Modal.Title>
                                            Service Location
                                          </Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                          <div className="comman-small-pop text-center">
                                            <MapComponent
                                              coordinates={
                                                bookingState?.bookBy?.location
                                                  ?.coordinates
                                              }
                                              address={
                                                bookingState?.bookBy
                                                  ?.street_address
                                              }
                                            />
                                          </div>
                                        </Modal.Body>
                                      </Modal>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Container>
                  </section>
                </>
              ) : (
                <>
                  {/* task */}
                  <div className="service-detail-card pt-3">
                    {task?.images?.length > 0 ? (
                      <Slider {...sliderSettings}>
                        {task.images.map((image, index) => (
                          <div key={index} className="card-box task-details">
                            <img
                              src={`${process.env.REACT_APP_API_URLL}${image}`}
                              alt={task.need_done}
                              style={{ maxWidth: "200px", margin: "2px  auto" }}
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
                      <div className="book-now-product mb-0">
                        {quotations?.length > 0 ? (
                          quotations.some(
                            (q) =>
                              Array.isArray(q.corporateSuggestion) &&
                              q.corporateSuggestion.some(
                                (cs) => cs.corporateStatus === 3
                              )
                          ) ? (
                            <h5 className="text-success">Job Done By You!</h5>
                          ) : (
                            <button
                              className="primaryBtn"
                              onClick={() => handleAccept(bookingState, 3)}
                            >
                              Job Done
                            </button>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <section className="category-services-sec pt-0 mt-5">
                    <Container>
                      <div className="category-services-lists">
                        <div className="list-title">
                          <h2 className="mb-0">Quotations</h2>
                        </div>
                        <p className="mt-0">About Service Provider</p>

                        {quotations?.length === 0 ? (
                          <div className="no-upcoming-bookings">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="80"
                              height="80"
                              viewBox="0 0 80 80"
                              fill="none"
                            >
                              {/* SVG paths omitted for brevity */}
                            </svg>
                            <h3>No Quotations Yet</h3>
                            <p>Currently you don’t have any offers</p>
                          </div>
                        ) : (
                          <div>
                            {quotations?.map((quotation, index) => {
                              const suggestion =
                                quotation?.corporateSuggestion?.[index];
                              const status = suggestion?.corporateStatus;
                              const userStatus = suggestion?.userStatus;
                              let currentStatus;

                              if (status === 3 && userStatus === 1) {
                                currentStatus = {
                                  label: "In Progress",
                                  className: "in-progress",
                                };
                              } else {
                                const statusMap = {
                                  0: {
                                    label: "Pending Booking",
                                    className: "pending",
                                  },
                                  1: {
                                    label: "Accepted",
                                    className: "completed",
                                  },
                                  2: {
                                    label: "Rejected",
                                    className: "rejected",
                                  },
                                  3: {
                                    label: "Completed",
                                    className: "completed",
                                  },
                                };
                                currentStatus = statusMap[status] || {
                                  label: "Unknown",
                                  className: "unknown",
                                };
                              }
                              return (
                                <div
                                  className="quotation-requests-wrap"
                                  key={index}
                                >
                                  <div className="quotation-requests quotation-requests-inner">
                                    <div>
                                      <div className="quotation-txt-show">
                                        <div
                                          className="profile-side cursor-pointer"
                                          onClick={() =>
                                            navigate(
                                              `/quotations-detail/${quotation?._id}`
                                            )
                                          }
                                        >
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
                                                  ?.email
                                              }
                                            </p>
                                            <p>
                                              {
                                                quotation?.service_provider
                                                  ?.address
                                              }
                                            </p>
                                            <div className="rating-stars">
                                              <ul>
                                                <StarRating
                                                  averageRating={
                                                    quotation.averageRating
                                                  }
                                                />
                                              </ul>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <p>{quotation?.description}</p>
                                      <div className="d-flex gap-2 mt-2">
                                        {" "}
                                        Status:
                                        <span
                                          className={`corporate_inner ${currentStatus.className}`}
                                        >
                                          {currentStatus?.label}
                                        </span>
                                      </div>
                                      <p>
                                        {task?.task_time},{" "}
                                        {task?.when_done
                                          ? moment(task.when_done).format(
                                              "DD MMM YY"
                                            )
                                          : "N/A"}
                                      </p>
                                    </div>
                                    <div className="quotation-requests-task-btns">
                                      <div>
                                        <h5>${quotation?.offer_price}</h5>
                                        <p>Offer Price</p>
                                      </div>
                                    </div>
                                  </div>

                                  {quotation?.corporateSuggestion?.length >
                                    0 && (
                                    <div className="quotation-wrapper">
                                      <div className="suggested-caproate">
                                        <h5>Suggested Corporate</h5>
                                        <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                                          {quotation.corporateSuggestion.map(
                                            (item, idx) => (
                                              <div
                                                key={item._id || idx}
                                                className="corporate-item d-flex align-items-center py-2"
                                                style={{ gap: "10px" }}
                                              >
                                                <img
                                                  src={`${process.env.REACT_APP_API_URL}/${item?.corporateIds?.profile_image}`}
                                                  alt={
                                                    item.corporateIds?.full_name
                                                  }
                                                  className="rounded-circle"
                                                  width={40}
                                                  height={40}
                                                />
                                                <div className="flex-grow-1">
                                                  <div className="fw-bold">
                                                    {
                                                      item.corporateIds
                                                        ?.full_name
                                                    }
                                                  </div>
                                                  <div className="text-muted small">
                                                    {
                                                      item.corporateIds
                                                        ?.shop_name
                                                    }
                                                  </div>
                                                  <div className="text-muted small">
                                                    {item.corporateIds?.email}
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="quotation-inner d-flex justify-content-center gap-4 mt-3">
                                    {quotation?.corporateSuggestion?.some(
                                      (s, index) => s.status !== "rejected"
                                    ) && (
                                      <>
                                        <button
                                          onClick={() => {
                                            navigate(
                                              `/messages?userID=${task?.user_id}`
                                            );
                                            localStorage.setItem(
                                              "reciverID",
                                              task?.user_id
                                            );
                                          }}
                                        >
                                          <img src={ChatIcon} alt="" /> Chat
                                        </button>
                                        <button
                                          onClick={() => setShowMapModal(true)}
                                        >
                                          <img src={mapIcon} alt="" /> Map
                                        </button>
                                      </>
                                    )}
                                    <Modal
                                      show={showMapModal}
                                      onHide={() => setShowMapModal(false)}
                                      centered
                                      size="lg"
                                    >
                                      <Modal.Header
                                        closeButton
                                        className="border-none pb-0"
                                      >
                                        <Modal.Title>
                                          Service Location
                                        </Modal.Title>
                                      </Modal.Header>
                                      <Modal.Body>
                                        <div className="comman-small-pop text-center">
                                          <MapComponent
                                            coordinates={
                                              quotation?.service_provider
                                                .location?.coordinates
                                            }
                                            address={
                                              quotation?.service_provider
                                                ?.street_address
                                            }
                                          />
                                        </div>
                                      </Modal.Body>
                                    </Modal>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Container>
                  </section>
                </>
              )}
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
