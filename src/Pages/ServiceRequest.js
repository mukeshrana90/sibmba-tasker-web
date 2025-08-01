import React, { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { toast } from "react-toastify";
import moment from "moment";
import ServiceRescheduleModal from "../CommanComponents/Modals/ServiceRescheduleModal";
import BookingConfirmationModal from "../CommanComponents/Modals/BookingConfirmationModal";
import BookingCancelled from "../CommanComponents/Modals/BookingCancelled";
import SuggestCorporateModal from "../CommanComponents/Modals/SuggestCorporateModal";
import CustomerActions from "../Redux/Actions/CustomerActions";

export default function ServiceRequest() {
  const getStatusColor = (status) => {
    const statusMap = {
      1: "yellow",
      2: "green",
      3: "red",
      4: "green",
      5: "red",
    };

    return statusMap[status] || "N/A";
  };
  const dropdownRefs = useRef({});
  const Navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [dropdownStates, setDropdownStates] = useState({});
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const servicetype = searchParams.get("service");
  const [show, setShow] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [isRequestModal, setIsRequestModal] = useState(false);
  const [isCancelModal, setIsCancelModal] = useState(false);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");

  const bookingReqDetail = useSelector((e) => e.service.getBookingRequestList);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleCloseReschedule = () => setShowReschedule(false);
  const handleShowReschedule = () => setShowReschedule(true);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [selectedCorporate, setSelectedCorporate] = useState(null);

  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: bookingReqDetail?.images?.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
          arrows: false,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
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
    dispatch(ServiceActions.getBookingReqDetailById({ id: id }));
  }, []);

  const handleButtonClick = (id) => {
    setDropdownStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const handleAccept = () => {
    // First: Accept the booking
    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: id,
        status: 2, // Accepted
      })
    )
      .then((e) => {
        if (e?.payload?.success) {
          // Second: Create corporate suggestion
          dispatch(
            CustomerActions.createCorporateSuggestionsForTask({
              bookingId: id,
              corporateIds: [selectedCorporate?._id],
            })
          );
          // Show success modal
          setIsRequestModal(true);
          // Redirect after 3 seconds
          setTimeout(() => {
            Navigate("/requests");
          }, 3000);
        }
      })
      .catch(() => {
        toast.error("An error occurred. Please try again.");
      });
  };

  const handleJobDone = () => {
    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: id,
        status: 4, // Accepted
      })
    ).then((res) => {
      if (res?.payload?.success) {
        toast.success("Success");
        Navigate("/requests");
      }
    });
  };

  const handleShowCancelBooking = () => {
    if (cancelReason === "" && cancelNotes === "") {
      toast.info("Please mention the reason before cancelling.");
      return;
    }

    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: id,
        status: 3, // Rejected
        reasonForCancel: cancelReason,
        message: cancelNotes,
      })
    )
      .then((e) => {
        if (e?.payload?.success) {
          setIsCancelModal(true); // Show the BookingCancelled modal
        }
      })
      .catch(() => {
        toast.error("Failed to reject booking.");
      });
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="heading">
                {servicetype == "approved" ? (
                  <h2>Service Approved</h2>
                ) : (
                  <h2>Cancel Request</h2>
                )}
              </div>
              <div className="service-approved-detail-card">
                <Slider {...sliderSettings}>
                  {bookingReqDetail?.serviceSubCategory?.images?.length > 0 &&
                    bookingReqDetail?.serviceSubCategory?.images?.map(
                      (image, index) => (
                        <div className="card-box">
                          <img
                            src={`${process.env.REACT_APP_API_URL}/user/${image}`}
                            alt={``}
                          />
                        </div>
                      )
                    )}
                </Slider>
                <div>
                  <div className="rating-stars"></div>
                  <div className="d-flex justify-content-between">
                    <h3>
                      {
                        bookingReqDetail?.serviceSubCategory
                          ?.serviceSubCategoryName
                      }
                    </h3>
                    {servicetype !== "reject" && (
                      <div
                        className="chat-btn-card"
                        style={{ position: "relative" }}
                        ref={(el) =>
                          (dropdownRefs.current[bookingReqDetail?._id] = el)
                        }
                      >
                        <button
                          className="btn"
                          onClick={() =>
                            handleButtonClick(bookingReqDetail?._id)
                          }
                        >
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
                        {dropdownStates[bookingReqDetail?._id] && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              right: "0",
                              background: "#fff",
                              border: "1px solid #ccc",
                              borderRadius: "5px",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                              padding: "5px 0",
                              zIndex: 10,
                              minWidth: "120px",
                            }}
                          >
                            <button
                              style={{
                                borderRadius: "15px",
                                border: "1px solid black",
                                display: "block",
                                width: "100%",
                                padding: "8px 6px",
                                textAlign: "left",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                              }}
                              onClick={() => {
                                handleButtonClick(bookingReqDetail?._id);
                                Navigate(
                                  `/requestdetail/${bookingReqDetail?._id}?service=reject`
                                );
                              }}
                            >
                              Cancel Booking
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <span>{`${bookingReqDetail?.slotTime[0]}, ${moment(
                    bookingReqDetail?.date
                  ).format("DD MMM")}`}</span>
                  <p>
                    {bookingReqDetail?.desc}
                    <span>{bookingReqDetail?.address}</span>
                  </p>
                </div>

                <div></div>
              </div>
            </Col>

            <Col lg={12}>
              <div>
                <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                  Message
                </div>
                <div
                  style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
                >
                  <p className="text-muted">{bookingReqDetail?.message}</p>
                </div>
              </div>
            </Col>
            <Col lg={12}>
             {bookingReqDetail?.corporateSuggestions.length > 0 || servicetype !== "approved" && servicetype !== "reject" && (
               <div className="d-block">
                <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                  Suggest Corporate
                </div>
              </div>
             )}
                {bookingReqDetail?.corporateSuggestions.length > 0 && (
                <div className="selected-corporate p-3 border rounded d-flex justify-content-between align-items-center mb-5">
                  <div className="d-flex align-items-center">
                    <img
                      src={`${process.env.REACT_APP_API_URL}/${bookingReqDetail?.corporateSuggestions[0].corporateIds.profile_image}`}
                      alt={bookingReqDetail?.corporateSuggestions[0].corporateIds?.full_name}
                      width={40}
                      height={40}
                      className="rounded-circle me-2"
                    />
                    <div>
                      <div className="fw-bold">
                        {bookingReqDetail?.corporateSuggestions[0].corporateIds?.full_name}
                      </div>
                      <div className="text-muted small">
                        {bookingReqDetail?.corporateSuggestions[0].corporateIds?.email}
                      </div>
                    </div>
                  </div>
                </div>
              ) }

              {selectedCorporate ? (
                <div className="selected-corporate p-3 border rounded d-flex justify-content-between align-items-center mb-5">
                  <div className="d-flex align-items-center">
                    <img
                      src={`${process.env.REACT_APP_API_URL}/${selectedCorporate.profile_image}`}
                      alt={selectedCorporate.full_name}
                      width={40}
                      height={40}
                      className="rounded-circle me-2"
                    />
                    <div>
                      <div className="fw-bold">
                        {selectedCorporate.full_name}
                      </div>
                      <div className="text-muted small">
                        {selectedCorporate.shop_name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedCorporate(null)}
                  />
                </div>
              ) : (
                <>
                  {servicetype !== "approved" && servicetype !== "reject" ? (
                    <div className="text-center mt-5 mb-5">
                      <button
                        type="button"
                        className="quotation-btn text-success"
                        onClick={() => setShowSuggestModal(true)}
                      >
                        <span className="icon">+</span> Add Corporate
                      </button>
                    </div>
                  ) : null}
                </>
              )}
              <SuggestCorporateModal
                show={showSuggestModal}
                onClose={() => setShowSuggestModal(false)}
                onSave={(corp) => {
                  setSelectedCorporate(corp);
                  setShowSuggestModal(false);
                  toast.success(`You selected ${corp.full_name}`);
                }}
                customerData={bookingReqDetail}
              />
            </Col>
            <Col>
              <div className="requestBookingBtn">
                {servicetype !== "reject" ? (
                  servicetype === "approved" ? (
                    <>
                      <div className="book-service-action">
                        <button onClick={handleJobDone}>Job Done</button>
                      </div>
                    </>
                  ) : (
                    <div className="book-service-action-btnn">
                      <button onClick={handleShowReschedule}>Reschedule</button>
                      <button onClick={handleAccept}>Accept</button>
                    </div>
                  )
                ) : (
                  <div className="quotation-requests-btns w-25">
                    <button onClick={handleShowCancelBooking}>
                      Cancel Now
                    </button>
                  </div>
                )}
              </div>
            </Col>
            {servicetype === "reject" && (
              <Col lg={12}>
                <div
                  className="cancel-form"
                  style={{
                    marginTop: "20px",
                    padding: "20px",
                    border: "1px solid #ddd",
                    borderRadius: "5px",
                  }}
                >
                  <h4 style={{ marginBottom: "15px" }}>
                    Reason for Cancellation
                  </h4>
                  <Form>
                    <Form.Check
                      type="radio"
                      label="Already booked or unavailable during the customer's requested slot."
                      name="cancelReason"
                      value="already_booked"
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{ marginBottom: "10px" }}
                    />
                    <Form.Check
                      type="radio"
                      label="A sudden emergency or unforeseen circumstance."
                      name="cancelReason"
                      value="emergency"
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{ marginBottom: "10px" }}
                    />
                    <Form.Check
                      type="radio"
                      label="Lacks the necessary resources to handle the specific request."
                      name="cancelReason"
                      value="lacks_resources"
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{ marginBottom: "20px" }}
                    />
                    <Form.Control
                      as="textarea"
                      placeholder="Type here"
                      onChange={(e) => setCancelNotes(e.target.value)}
                      style={{ marginTop: "20px", minHeight: "100px" }}
                    />
                  </Form>
                </div>
              </Col>
            )}
            {servicetype === "approved" && (
              <section className="booking-status-sec ">
                <div className="booking-status-txt pt-0">
                  <div className="booking-status-left-txt">
                    <h2>Status</h2>
                    <h3 className={getStatusColor(bookingReqDetail?.status)}>
                      Scheduled to work
                    </h3>
                    <p>Service provider need to start work on scheduled day.</p>
                    <h4>{`${bookingReqDetail?.slotTime[0]}, ${moment(
                      bookingReqDetail?.date
                    ).format("DD MMM")}`}</h4>
                  </div>
                </div>
              </section>
            )}
          </Row>
        </Container>
      </section>

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Book Service</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="book-service-view">
            <img src={require("../Assets/Images/living-room-cleaning.png")} />
            <p>Living Room Cleaning</p>
          </div>
          <div className="book-service-select">
            <h3>Select Date</h3>
            <ul>
              <li>
                <p>Fri</p>
                <h5>07</h5>
              </li>
              <li>
                <p>SAT</p>
                <h5>07</h5>
              </li>
              <li>
                <p>SUN</p>
                <h5>07</h5>
              </li>
              <li>
                <p>MON</p>
                <h5>07</h5>
              </li>
              <li>
                <p>TUE</p>
                <h5>07</h5>
              </li>
              <li>
                <p>WED</p>
                <h5>07</h5>
              </li>
              <li>
                <p>THR</p>
                <h5>07</h5>
              </li>
            </ul>
          </div>
          <div className="book-service-select">
            <h3>Select Time</h3>
            <ul>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
              <li>
                <p className="mb-0">08 - 09 AM</p>
              </li>
            </ul>
          </div>

          <div className="">
            <Form>
              <Form.Group controlId="exampleForm.ControlTextarea1">
                <Form.Label>Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter your message"
                />
              </Form.Group>
            </Form>
          </div>
          <div className="book-service-action">
            <button onClick={handleClose}>Cancel</button>
            <button onClick={handleClose}>Book </button>
          </div>
        </Modal.Body>
      </Modal>

      <BookingConfirmationModal
        isRequestModal={isRequestModal}
        setIsRequestModal={setIsRequestModal}
        type={"accept"}
      />

      <ServiceRescheduleModal
        show={showReschedule}
        setShow={setShowReschedule}
        service_id={id}
      />

      <BookingCancelled
        isRequestModal={isCancelModal}
        setIsRequestModal={setIsCancelModal}
        request={bookingReqDetail}
      />
    </Layout>
  );
}
