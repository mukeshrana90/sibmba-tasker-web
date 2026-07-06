import React, { useEffect, useMemo, useRef, useState } from "react";
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
import JobFlowStepper from "../CommanComponents/JobFlowStepper";
import {
  handleCategoryImageError,
  handleUserImageError,
  serviceImageUrl,
  userImageUrl,
} from "../utils/landingUtils";
import {
  bookingStatus,
  canMessageOnActiveBooking,
  getBookingFlowStepperState,
  getBookingFlowDescription,
  JOB_FLOW_STEP_LABELS,
} from "../utils/jobFlowStatus";
import {
  bookingDetailPath,
  normalizeMongoId,
} from "../utils/normalizeMongoId";

export default function ServiceRequest() {
  const SERVICE_REQUEST_STATUS_TOAST_ID = "service-request-status-update";
  const showSingleStatusToast = (message) => {
    toast.dismiss();
    toast.clearWaitingQueue?.();
    setTimeout(() => {
      toast.success(message, {
        toastId: SERVICE_REQUEST_STATUS_TOAST_ID,
      });
    }, 0);
  };
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
  const { id: routeId } = useParams();
  const bookingId = useMemo(() => normalizeMongoId(routeId), [routeId]);
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
  const [jobDoneSubmitting, setJobDoneSubmitting] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [showJobDoneConfirmModal, setShowJobDoneConfirmModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const bookingReqDetail = useSelector((e) => e.service.getBookingRequestList);
  const bookingCurrentStatus = Number(bookingReqDetail?.status);
  const isRequestedFlow = bookingCurrentStatus === bookingStatus.REQUESTED;
  const isApprovedFlow = [
    bookingStatus.ACCEPTED,
    bookingStatus.ON_THE_WAY,
    bookingStatus.IN_PROGRESS,
    bookingStatus.COMPLETED,
  ].includes(bookingCurrentStatus);
  const isRejectedFlow = [bookingStatus.CANCELLED, bookingStatus.REJECTED].includes(
    bookingCurrentStatus
  );
  const canRaiseBookingDispute = Boolean(
    bookingReqDetail?.referenceId &&
      [2, 4, 6, 7].includes(Number(bookingReqDetail?.status))
  );

  const handleClose = () => setShow(false);

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
    if (!bookingId) {
      toast.error("Invalid booking link.");
      Navigate("/requests");
      return;
    }
    dispatch(ServiceActions.getBookingReqDetailById({ id: bookingId }));
  }, [dispatch, bookingId, Navigate]);
  useEffect(() => {
    if (!bookingId) return;
    const pollable = [
      bookingStatus.ACCEPTED,
      bookingStatus.ON_THE_WAY,
      bookingStatus.IN_PROGRESS,
    ];
    if (!pollable.includes(bookingCurrentStatus)) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      dispatch(ServiceActions.getBookingReqDetailById({ id: bookingId }));
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [dispatch, bookingId, bookingCurrentStatus]);
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => {}
    );
  }, []);

  const handleButtonClick = (id) => {
    setDropdownStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  const handleAccept = () => {
    console.log(selectedCorporate);
  
    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: bookingId,
        status: 2,
      })
    )
      .then((e) => {
        if (e?.payload?.success) {
  
          // Only call this if corporate exists (optional optimization)
          if (selectedCorporate && selectedCorporate.length > 0) {
            dispatch(
              CustomerActions.createCorporateSuggestionsForTask({
                bookingId: bookingId,
                corporateIds: selectedCorporate.map((corp) =>
                  normalizeMongoId(corp?._id)
                ),
              })
            );
          }
  
          setIsRequestModal(true);
  
          setTimeout(() => {
            Navigate("/requests");
          }, 3000);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleJobDone = (targetStatus = 4) => {
    if (jobDoneSubmitting) return;
    setJobDoneSubmitting(true);
    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: bookingId,
        status: targetStatus,
      })
    ).then((res) => {
      if (res?.payload?.success) {
        const msg =
          Number(targetStatus) === bookingStatus.ON_THE_WAY
            ? "Marked as on the way."
            : Number(targetStatus) === bookingStatus.IN_PROGRESS
            ? "Marked as in progress."
            : "Job marked as done.";
        showSingleStatusToast(msg);
        dispatch(ServiceActions.getBookingReqDetailById({ id: bookingId }));
      }
    }).finally(() => {
      setJobDoneSubmitting(false);
    });
  };
  const handleCancelBooking = () => {
    if (cancelSubmitting) return;
    setCancelSubmitting(true);
    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: bookingId,
        status: bookingStatus.CANCELLED,
      })
    ).then((res) => {
      if (res?.payload?.success) {
        showSingleStatusToast("Booking cancelled successfully.");
        dispatch(ServiceActions.getBookingReqDetailById({ id: bookingId }));
      } else {
        toast.error(res?.payload?.message || "Could not cancel booking.");
      }
    }).finally(() => {
      setCancelSubmitting(false);
    });
  };

  const providerNextStatusMap = {
    [bookingStatus.ACCEPTED]: bookingStatus.ON_THE_WAY,
    [bookingStatus.ON_THE_WAY]: bookingStatus.IN_PROGRESS,
    [bookingStatus.IN_PROGRESS]: bookingStatus.COMPLETED,
  };
  const providerButtonLabelMap = {
    [bookingStatus.ACCEPTED]: "On the Way",
    [bookingStatus.ON_THE_WAY]: "In Progress",
    [bookingStatus.IN_PROGRESS]: "Job Done",
  };
  const providerCurrentStatus = Number(bookingReqDetail?.status);
  const providerNextStatus = providerNextStatusMap[providerCurrentStatus];
  const providerProgressBtnLabel = providerButtonLabelMap[providerCurrentStatus];
  const showProviderJobDoneBtn = isApprovedFlow && Boolean(providerNextStatus);
  const canProviderCancelBooking = [bookingStatus.REQUESTED, bookingStatus.ACCEPTED].includes(
    providerCurrentStatus
  );
  const handleOpenJobDoneConfirm = () => setShowJobDoneConfirmModal(true);
  const handleCloseJobDoneConfirm = () => {
    if (jobDoneSubmitting) return;
    setShowJobDoneConfirmModal(false);
  };
  const handleConfirmJobDone = async () => {
    await handleJobDone(bookingStatus.COMPLETED);
    setShowJobDoneConfirmModal(false);
  };

  const handleShowCancelBooking = () => {
    if (cancelReason === "" && cancelNotes === "") {
      toast.info("Please mention the reason before cancelling.");
      return;
    }

    dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: bookingId,
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
  const bookingCoordinates = Array.isArray(bookingReqDetail?.location?.coordinates)
    ? bookingReqDetail.location.coordinates
    : null;
  const customer = bookingReqDetail?.bookBy;
  const customerId = customer?._id;
  const customerName = customer?.full_name || "Customer";
  const customerEmail = customer?.email || "";
  const customerAddress =
    bookingReqDetail?.address ||
    [customer?.street_address, customer?.suburbs, customer?.city]
      .filter(Boolean)
      .join(", ") ||
    "";
  const canMessageCustomer =
    Boolean(customerId) && canMessageOnActiveBooking(bookingCurrentStatus);
  const handleMessageCustomer = () => {
    if (!customerId) return;
    localStorage.setItem("reciverID", customerId);
    Navigate(`/messages?userID=${customerId}`);
  };
  const customerCoordinates = Array.isArray(
    bookingReqDetail?.bookBy?.location?.coordinates
  )
    ? bookingReqDetail.bookBy.location.coordinates
    : null;
  const mapLat = bookingCoordinates?.[1] ?? customerCoordinates?.[1] ?? null;
  const mapLng = bookingCoordinates?.[0] ?? customerCoordinates?.[0] ?? null;
  const hasRouteCoordinates =
    currentLocation?.lat != null &&
    currentLocation?.lng != null &&
    mapLat != null &&
    mapLng != null;
  const routeEmbedUrl = hasRouteCoordinates
    ? `https://maps.google.com/maps?saddr=${currentLocation.lat},${currentLocation.lng}&daddr=${mapLat},${mapLng}&output=embed`
    : `https://maps.google.com/maps?q=${mapLat},${mapLng}&z=14&output=embed`;
  const routeShareUrl = hasRouteCoordinates
    ? `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${mapLat},${mapLng}&travelmode=driving`
    : `https://maps.google.com/?q=${mapLat},${mapLng}`;
  const handleOpenDisputeModal = () => setShowDisputeModal(true);
  const handleCloseDisputeModal = () => {
    if (disputeSubmitting) return;
    setShowDisputeModal(false);
    setDisputeTitle("");
    setDisputeDescription("");
  };
  const handleSubmitDispute = async () => {
    if (!disputeTitle.trim() || !disputeDescription.trim()) {
      toast.error("Please enter title and message.");
      return;
    }
    if (!bookingReqDetail?.referenceId) {
      toast.error("Booking reference not found.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      const res = await dispatch(
        CustomerActions.raiseDispute({
          referenceId: bookingReqDetail.referenceId,
          reason: disputeTitle.trim(),
          description: disputeDescription.trim(),
        })
      );
      if (res?.payload?.success) {
        toast.success(res?.payload?.message || "Dispute submitted successfully.");
        handleCloseDisputeModal();
      } else {
        toast.error(res?.payload?.message || "Could not submit dispute.");
      }
    } catch {
      toast.error("Could not submit dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="heading">
                {isApprovedFlow ? (
                  <h2>Service Approved</h2>
                ) : servicetype === "reject" || isRejectedFlow ? (
                  <h2>Cancel Request</h2>
                ) : (
                  <h2>Request Detail</h2>
                )}
              </div>
              <div className="service-approved-detail-card">
                <Slider {...sliderSettings}>
                  {bookingReqDetail?.serviceSubCategory?.images?.length > 0 &&
                    bookingReqDetail?.serviceSubCategory?.images?.map(
                      (image, index) => (
                        <div className="card-box">
                          <img
                            src={serviceImageUrl(image)}
                            alt={``}
                            onError={handleCategoryImageError}
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
                    {servicetype !== "reject" && canProviderCancelBooking && (
                      <div
                        className="chat-btn-card"
                        style={{ position: "relative" }}
                        ref={(el) =>
                          (dropdownRefs.current[bookingId] = el)
                        }
                      >
                        <button
                          className="btn"
                          onClick={() =>
                            handleButtonClick(bookingId)
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
                        {dropdownStates[bookingId] && (
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
                                handleButtonClick(bookingId);
                                Navigate(
                                  bookingDetailPath(bookingId, "service=reject")
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

                  <span>{`${bookingReqDetail?.slotTime?.[0] || "Not specified"}, ${moment(
                    bookingReqDetail?.date
                  ).format("DD MMM")}`}</span>
                  <p>
                    {bookingReqDetail?.desc}
                    <span>{bookingReqDetail?.address}</span>
                  </p>
                  {showProviderJobDoneBtn && (
                    <div className="book-service-action mt-3">
                      {canProviderCancelBooking && (
                        <button
                          type="button"
                          className="task-flow-btn task-flow-btn--outline"
                          disabled={cancelSubmitting || jobDoneSubmitting}
                          onClick={handleCancelBooking}
                        >
                          {cancelSubmitting ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                      <button
                        disabled={jobDoneSubmitting || cancelSubmitting}
                        onClick={() => {
                          if (providerNextStatus === bookingStatus.COMPLETED) {
                            handleOpenJobDoneConfirm();
                            return;
                          }
                          handleJobDone(providerNextStatus);
                        }}
                      >
                        {providerProgressBtnLabel}
                      </button>
                    </div>
                  )}
                </div>

                <div></div>
              </div>
            </Col>

            {customer && (
              <Col lg={12}>
                <div className="booking-customer-card">
                  <div className="booking-customer-card__head">
                    <h4>Customer details</h4>
                    {canMessageCustomer && (
                      <button
                        type="button"
                        className="booking-customer-card__msg-btn"
                        onClick={handleMessageCustomer}
                      >
                        Message customer
                      </button>
                    )}
                  </div>
                  <div className="booking-customer-card__body">
                    <img
                      className="booking-customer-card__avatar"
                      src={userImageUrl(customer)}
                      onError={handleUserImageError}
                      alt={customerName}
                    />
                    <div className="booking-customer-card__info">
                      <div className="booking-customer-card__name">{customerName}</div>
                      {customerEmail ? (
                        <div className="booking-customer-card__meta">{customerEmail}</div>
                      ) : null}
                      {customerAddress ? (
                        <div className="booking-customer-card__meta">{customerAddress}</div>
                      ) : null}
                      {bookingReqDetail?.referenceId ? (
                        <div className="booking-customer-card__meta">
                          Booking ref: {bookingReqDetail.referenceId}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Col>
            )}

            <Col lg={12} className="booking-message-section">
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
             {(bookingReqDetail?.corporateSuggestions.length > 0 && !isApprovedFlow) ||(servicetype !== "reject" && (
               <div className="d-block">
                <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                  Suggest Corporate
                </div>
              </div>
              ))}
              {bookingReqDetail?.corporateSuggestions?.length > 0 && (
                <div className="selected-corporate-list mb-5">
          {bookingReqDetail.corporateSuggestions.map(
            (corpItem, index) => {
              const corp = corpItem?.corporateIds;
              if (!corp) return null;

              return (
                <div
                  key={corpItem._id || index}
                  className="selected-corporate p-3 border rounded d-flex justify-content-between align-items-center mb-2"
                >
                  <div className="d-flex align-items-center">
                    <img
                      src={userImageUrl(corp)}
                      onError={handleUserImageError}
                      alt={corp.full_name}
                      width={40}
                      height={40}
                      className="rounded-circle me-2"
                    />
                    <div>
                      <div className="fw-bold d-flex align-items-center gap-2">
                        {corp.full_name}
                        {Number(corpItem?.userStatus) === 1 && (
                          <span className="badge bg-success">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="text-muted small">
                        {corp.email}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

              {selectedCorporate ? (
            <>
              {selectedCorporate.map((corp, index) => (
                <div
                  key={corp._id || index}
                  className="selected-corporate p-2 border rounded d-flex justify-content-between align-items-center mb-2"
                >
                <div className="d-flex align-items-center">
                  {corp.profile_image ? (
                    <img
                      src={userImageUrl(corp)}
                      alt={corp.full_name}
                      width={40}
                      onError={handleUserImageError}
                      height={40}
                      className="rounded-circle me-2"
                    />
                  ) : (
                    <div
                      className="rounded-circle me-2 bg-secondary text-white d-flex align-items-center justify-content-center"
                      style={{
                        width: 40,
                        height: 40,
                        fontWeight: "bold",
                      }}
                    >
                      {corp.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div>
                    <div className="fw-bold">{corp.full_name}</div>
                      <div className="text-muted small">
                        {corp.shop_name}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setSelectedCorporate((prev) =>  prev.filter((c) => c._id !== corp._id))}
                  />
                </div>
              ))}
            </>
              ) : (
                <>
                  {isRequestedFlow && servicetype !== "reject" ? (
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
                }}
                customerData={bookingReqDetail}
                fallbackCoords={
                  currentLocation ||
                  (mapLat != null && mapLng != null
                    ? { lat: mapLat, lng: mapLng }
                    : null)
                }
              />
            </Col>
            <Col>
              <div
                className={`requestBookingBtn ${
                  isApprovedFlow ? "requestBookingBtn--approved" : ""
                }`}
              >
                {servicetype !== "reject" ? (
                  !isRequestedFlow ? null : (
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
              {canRaiseBookingDispute && (
                <button
                  type="button"
                  className="task-dispute-link-btn"
                  onClick={handleOpenDisputeModal}
                >
                  Having an issue? <span>Raise Dispute</span>
                </button>
              )}
            </Col>
            {servicetype === "reject" && (
              <Col lg={12}>
                <div
                  className="cancel-form mb-5"
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
            {isApprovedFlow && (
              <section className="booking-status-sec ">
                <div className="requests-completed-main task-detail-map-container">
                  <div className="booking-status-txt pt-0 pb-0">
                    <div className="booking-status-left-txt">
                      <h2>Status</h2>
                      {(() => {
                        const flow = getBookingFlowStepperState(bookingReqDetail?.status);
                        const headline =
                          flow.variant !== "default"
                            ? flow.terminalLabel || "Status"
                            : JOB_FLOW_STEP_LABELS[flow.activeStep] || "Scheduled to work";
                        const description = getBookingFlowDescription(bookingReqDetail?.status) ||
                          "Service provider need to start work on scheduled day.";
                        return (
                          <>
                            <h3 className={getStatusColor(bookingReqDetail?.status)}>
                              {headline}
                            </h3>
                            <JobFlowStepper mode="booking" status={bookingReqDetail?.status} />
                            <p>{description}</p>
                            <h4>{`${bookingReqDetail?.slotTime?.[0] || "Not specified"}, ${moment(
                              bookingReqDetail?.date
                            ).format("DD MMM")}`}</h4>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {[bookingStatus.ON_THE_WAY, bookingStatus.IN_PROGRESS, bookingStatus.COMPLETED].includes(
                    Number(bookingReqDetail?.status)
                  ) &&
                    mapLat != null &&
                    mapLng != null && (
                      <div className="requests-completed-map">
                        <h2>Live Location</h2>
                        <iframe
                          title="Provider Booking Map"
                          src={routeEmbedUrl}
                          width="100%"
                          height="260"
                          style={{ border: 0, borderRadius: "8px" }}
                          loading="lazy"
                        />
                        <div className="book-service-action-btn d-flex gap-2 mt-3 requests-completed-map-actions">
                          <button
                            type="button"
                            className="booking-job-done-btn"
                            onClick={() => window.open(routeShareUrl, "_blank")}
                          >
                            Open in Maps
                          </button>
                          <button
                            type="button"
                            className="booking-job-done-btn"
                            onClick={async () => {
                              try {
                                if (navigator.share) {
                                  await navigator.share({ title: "Location", url: routeShareUrl });
                                  return;
                                }
                                if (navigator.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(routeShareUrl);
                                  toast.success("Location copied.");
                                }
                              } catch {}
                            }}
                          >
                            Share Location
                          </button>
                        </div>
                      </div>
                    )}
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
            <img
              src={require("../Assets/Images/living-room-cleaning.png")}
              alt="Living room cleaning"
            />
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
        request={bookingReqDetail}
      />

      <ServiceRescheduleModal
        show={showReschedule}
        setShow={setShowReschedule}
        service_id={bookingId}
      />

      <BookingCancelled
        isRequestModal={isCancelModal}
        setIsRequestModal={setIsCancelModal}
        request={bookingReqDetail}
      />
      <Modal show={showDisputeModal} onHide={handleCloseDisputeModal} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>Raise Dispute</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              placeholder="Dispute title"
              value={disputeTitle}
              onChange={(e) => setDisputeTitle(e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="Describe the issue..."
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 dispute-modal-footer">
          <button
            type="button"
            className="btn btn-light border dispute-modal-btn"
            onClick={handleCloseDisputeModal}
            disabled={disputeSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="booking-job-done-btn dispute-modal-btn"
            onClick={handleSubmitDispute}
            disabled={disputeSubmitting}
          >
            {disputeSubmitting ? "Please wait..." : "Submit"}
          </button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showJobDoneConfirmModal}
        onHide={handleCloseJobDoneConfirm}
        centered
        backdrop={jobDoneSubmitting ? "static" : true}
        keyboard={!jobDoneSubmitting}
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title>Confirm job complete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 text-secondary">
            Are you sure you want to mark this booking as done? After this,
            customer can proceed with payment.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 job-done-confirm-modal-footer">
          <button
            type="button"
            className="btn btn-light border job-done-confirm-modal-btn"
            onClick={handleCloseJobDoneConfirm}
            disabled={jobDoneSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="booking-job-done-btn job-done-confirm-modal-btn"
            onClick={handleConfirmJobDone}
            disabled={jobDoneSubmitting}
          >
            {jobDoneSubmitting ? "Please wait..." : "Yes, job done"}
          </button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
}
