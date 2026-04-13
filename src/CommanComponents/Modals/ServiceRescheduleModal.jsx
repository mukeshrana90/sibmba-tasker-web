import React, { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { Col, Row } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import {  convertDateToStringNew } from "../../utils/CommonFunction";
import ServiceActions from "../../Redux/Actions/ServiceActions";
import BookingConfirmationModal from "./BookingConfirmationModal";

const ServiceRescheduleModal = ({ show, setShow, service_id, data }) => {
  const bookingReqDetail = useSelector((e) => e.service.getBookingRequestList);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [msgState, setMsgState] = useState("");
  const [timeState, setTimeState] = useState();
  const [isRequestModal, setIsRequestModal] = useState(false);
  const [errors, setErrors] = useState({
    date: "",
    time: "",
    message: ""
  });

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      date: "",
      time: "",
      message: ""
    };

    if (!selectedDate) {
      newErrors.date = "Please select a date";
      valid = false;
    }

    if (!timeState) {
      newErrors.time = "Please select a time slot";
      valid = false;
    }

    if (!msgState.trim()) {
      newErrors.message = "Message is required";
      valid = false;
    } else if (msgState.trim().length > 500) {
      newErrors.message = "Message should not exceed 500 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleBooking = async () => {
    if (!validateForm()) {
      return;
    }

    let payload = {
      date: convertDateToStringNew(selectedDate),
      bookingId: bookingReqDetail?._id,
      slotTime: timeState,
      message: msgState.trim(),
    };
    
    const apiRes = await dispatch(ServiceActions.rescheduleBooking(payload));

    if (!apiRes?.payload?.success) {
      toast.error(apiRes?.payload?.message);
      return;
    }

    const acceptRes = await dispatch(
      ServiceActions.updateBookingStatus({
        booking_id: bookingReqDetail?._id,
        status: 2,
      })
    );

    if (!acceptRes?.payload?.success) {
      toast.error(acceptRes?.payload?.message || "Could not auto-accept booking.");
      return;
    }

    toast.success(apiRes?.payload?.message || "Booking rescheduled successfully.");
    dispatch(ServiceActions.getBookingReqDetailById({ id: service_id }));
    setShow(false);
    navigate("/requests?tab=approved");
  };

  useEffect(() => {
    dispatch(CustomerActions.getServiceDetail({ service_id }));
  }, []);

  useEffect(() => {
    if (data) {
      setTimeState(data?.slotTime[0]);
      if (data?.date) {
        const date = new Date(data.date);
        // Normalize to midnight in local timezone
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        setSelectedDate(normalizedDate);
      }
      setMsgState(data?.message);
    }
  }, [data]);

  const isDateAvailable = (date) => {
    if (!date) return false;
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const availability = bookingReqDetail?.serviceSubCategory?.availability;
    if (!Array.isArray(availability) || availability.length === 0) {
      return true;
    }

    return availability.some((slot) => {
      if (!slot?.day) return false;
      if (Array.isArray(slot.day)) {
        return slot.day.some((d) => String(d).toLowerCase() === dayName);
      }
      if (typeof slot.day === "string") {
        return slot.day.toLowerCase() === dayName;
      }
      return false;
    });
  };


  return (
    <>
      <Modal size="lg" show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Reschedule Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col xs={4}>
              <div className="book-service-select">
                <h3>Select Date</h3>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setErrors({...errors, date: ""});
                  }}
                  filterDate={isDateAvailable}
                  minDate={new Date()}
                  inline
                />
                {errors.date && (
                  <div className="text-danger mt-2">{errors.date}</div>
                )}
              </div>
            </Col>
            <Col xs={8}>
              <div className="book-service-select">
                <h3>Select Time</h3>
                <ul>
                  {Array.isArray(bookingReqDetail?.serviceSubCategory?.availability[0]?.timeArr) &&
                    bookingReqDetail?.serviceSubCategory?.availability[0].timeArr.map((res, index) => {
                      return (
                        <li
                          key={index}
                          className={timeState == res ? `active-list-book` : ``}
                        >
                          <p 
                            className="mb-0" 
                            onClick={() => {
                              setTimeState(res);
                              setErrors({...errors, time: ""});
                            }}
                          >
                            {res}
                          </p>
                        </li>
                      );
                    })}
                </ul>
                {errors.time && (
                  <div className="text-danger mt-2">{errors.time}</div>
                )}
              </div>

              <div className="mt-3">
                <Form.Group controlId="exampleForm.ControlTextarea1">
                  <Form.Label>Message</Form.Label>
                  <Form.Control
                    as="textarea"
                    onChange={(e) => {
                      setMsgState(e.target.value);
                      setErrors({...errors, message: ""});
                    }}
                    value={msgState}
                    rows={3}
                    placeholder="Enter your message"
                    isInvalid={!!errors.message}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.message}
                  </Form.Control.Feedback>
                  <div className="text-end">
                    <small>{msgState.length}/500 characters</small>
                  </div>
                </Form.Group>
              </div>
            </Col>
          </Row>
          <div className="book-service-action mt-4">
            <button onClick={() => setShow(false)}>Cancel</button>
            <button onClick={handleBooking}>Reschedule</button>
          </div>
        </Modal.Body>
      </Modal>
      <BookingConfirmationModal
        isRequestModal={isRequestModal}
        setIsRequestModal={setIsRequestModal}
        request={bookingReqDetail}
      />
    </>
  );
};

export default ServiceRescheduleModal;

