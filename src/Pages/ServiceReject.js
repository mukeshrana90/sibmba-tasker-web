import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import moment from "moment";
import ServiceRescheduleModal from "../CommanComponents/Modals/ServiceRescheduleModal";
import BookingConfirmationModal from "../CommanComponents/Modals/BookingConfirmationModal";
import {
  handleCategoryImageError,
  serviceImageUrl,
} from "../utils/landingUtils";
import { normalizeMongoId } from "../utils/normalizeMongoId";

export default function ServiceReject() {

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

    const dispatch = useDispatch()
    const { id: routeId } = useParams()
    const bookingId = normalizeMongoId(routeId)

    const [show, setShow] = useState(false);
    const [showReschedule, setShowReschedule] = useState(false);
    const [isRequestModal, setIsRequestModal] = useState(false);

    const bookingReqDetail = useSelector((e) => e.service.getBookingRequestList)

    const handleClose = () => setShow(false);

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
        if (!bookingId) return;
        dispatch(ServiceActions.getBookingReqDetailById({ id: bookingId }))
    }, [dispatch, bookingId])


    return (
        <Layout>
            <section className="service-detail-sec">
                <Container>
                    <Row>
                        <Col lg={12}>
                            <div className="heading">
                                <h2>Service Rejected</h2>
                            </div>
                            <div className="sr-detail-card">
                                <Slider {...sliderSettings}>
                                    {bookingReqDetail?.serviceSubCategory?.images?.length > 0 && (
                                        bookingReqDetail?.serviceSubCategory?.images?.map((image, index) => (
                                            <div className="card-box">
                                                <img
                                                    src={serviceImageUrl(image)}
                                                    onError={handleCategoryImageError}
                                                    alt={``}
                                                // style={{ cursor: "pointer", maxWidth: "200px", margin: "0 auto" }}
                                                />
                                            </div>
                                        ))
                                    )}
                                </Slider>
                                <div>
                                    {/* <div className="rating-stars">
                                        <ul> <StarRating averageRating={bookingReqDetail?.averageRating} /></ul>
                                    </div> */}
                                    <div className="d-flex justify-content-between">
                                        <h3>{bookingReqDetail?.serviceSubCategory?.serviceSubCategoryName}</h3>
                                    </div>
                                    {/* <h4>{bookingReqDetail?.serviceSubCategory?.serviceSubCategoryName || ""}</h4> */}
                                    <span>{`${bookingReqDetail?.slotTime[0]}, ${moment(bookingReqDetail?.date).format("DD MMM")}`}</span>
                                    <p>
                                        {bookingReqDetail?.desc}
                                        <span>{bookingReqDetail?.address}</span>
                                    </p>

                                </div>

                                <div >
                                </div>
                            </div>
                        </Col>

                        <Col lg={12}>
                            <div>
                                <div style={{ marginBottom: "10px", fontWeight: "bold" }}>Message</div>
                                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                                    <p>{bookingReqDetail?.serviceSubCategory?.desc}</p>
                                </div>
                            </div>
                        </Col>

                        <section className="booking-status-sec ">
                            <div className="booking-status-txt pt-0">
                                <div className="booking-status-left-txt">
                                    <h2>Status</h2>
                                    <h3 className={getStatusColor(bookingReqDetail?.status)}>
                                        Booking Rejected
                                    </h3>
                                    <p>Booking request is rejected by service provide.</p>
                                    <h4>{`${bookingReqDetail?.slotTime[0]}, ${moment(bookingReqDetail?.date).format("DD MMM")}`}</h4>
                                </div>
                            </div>
                        </section>

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
            />

            <ServiceRescheduleModal
                show={showReschedule}
                setShow={setShowReschedule}
                service_id={bookingId}
            />
        </Layout>
    );
}
