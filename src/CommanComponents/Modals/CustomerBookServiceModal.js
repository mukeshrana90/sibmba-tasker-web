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
import { convertDateToStringNew } from "../../utils/CommonFunction";
import RequestSentByUser from "./RequestSentByUser";

const CustomerBookServiceModal = ({ show, setShow, service_id, data }) => {
  const serviceDetail = useSelector((e) => e.UserSlice.serviceDetail);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);
  const [msgState, setMsgState] = useState("");
  const [timeState, setTimeState] = useState();
  const [isRequestModal, setIsRequestModal] = useState(false);

  // const isDateAvailable = (date) => {
  //   // const dayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][date.getDay()]
  //   return serviceDetail?.availability?.[0]?.day.includes(dayName);
  // };

  const isDateAvailable1 = (date) => {
    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][date.getDay()].toLowerCase(); // Convert to lowercase
    return serviceDetail?.availability?.[0]?.day.includes(dayName);
  };
  const isDateAvailable = (date) => {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    if (serviceDetail?.availability?.length) {
      return serviceDetail?.availability?.some((slot) =>
        slot.day.includes(dayName.toLowerCase())
      );
    } else {
      return data?.serviceSubCategory.availability?.some((slot) =>
        slot.day.includes(dayName.toLowerCase())
      );
    }
  };

  const handleBooking = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (!timeState) {
      toast.error("Please select a time slot.");
      return;
    }
    if (!msgState.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    const finalDate = selectedDate
      ? convertDateToStringNew(selectedDate)
      : convertDateToStringNew(new Date());

    let payload;
    let apiRes;
    if (data) {
      payload = {
        date: finalDate,
        serviceSubCategory: serviceDetail?._id,
        serviceCategory: serviceDetail?.serviceCategoryId?._id,
        serviceProvider: serviceDetail?.serviceProviderId?._id,
        slotTime: timeState,
        message: msgState,
        booking_id: data?._id,
      };
      apiRes = await dispatch(CustomerActions.editBooking(payload));
    } else {
      payload = {
        date: finalDate,
        serviceSubCategory: serviceDetail?._id,
        serviceCategory: serviceDetail?.serviceCategoryId?._id,
        serviceProvider: serviceDetail?.serviceProviderId?._id,
        slotTime: timeState,
        message: msgState,
      };
      apiRes = await dispatch(CustomerActions.createBooking(payload));
    }
    if (apiRes?.payload.success) {
      if (data) {
        toast.success(apiRes?.payload?.message);
        setShow(false);
      } else {
        toast.success(apiRes?.payload?.message);
        setShow(false);
        setIsRequestModal(true);
      }
    } else {
      toast.error(apiRes?.payload?.message);
    }
  };

  useEffect(() => {
    dispatch(CustomerActions.getServiceDetail({ service_id }));
  }, [service_id]);

  useEffect(() => {
    if (data) {
      setTimeState(data?.slotTime[0]);
      setSelectedDate(data?.date);
      setMsgState(data?.message);
    }
  }, [data]);

  return (
    <>
      <Modal size="lg" show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton className="border-none pb-0">
          {data ? (
            <Modal.Title>Edit Service</Modal.Title>
          ) : (
            <Modal.Title>Book Service</Modal.Title>
          )}
        </Modal.Header>
        <Modal.Body>
          <div className="book-service-view">
            <img
              src={
                Array.isArray(serviceDetail?.images) &&
                serviceDetail.images.length > 0
                  ? `${process.env.REACT_APP_API_URL}/user/${serviceDetail.images[0]}`
                  : Array.isArray(data?.serviceSubCategory?.images) &&
                    data.serviceSubCategory.images.length > 0
                  ? `${process.env.REACT_APP_API_URL}/user/${data.serviceSubCategory.images[0]}`
                  : require("../../Assets/Images/living-room-cleaning.png")
              }
            />

            <p>
              {serviceDetail?.serviceSubCategoryName ||
                data?.serviceSubCategory?.serviceSubCategoryName ||
                "N/A"}
            </p>
          </div>

          <Row>
            <Col md={4} xs={12}>
              <div className="book-service-select">
                <h3>Select Date</h3>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  minDate={new Date()}
                  filterDate={isDateAvailable}
                  inline
                />
              </div>
            </Col>
            <Col md={8} xs={12}>
              <div className="book-service-select">
                <h3>Select Time</h3>
                <ul>
                  {Array.isArray(serviceDetail?.availability) &&
                    serviceDetail.availability.length > 0 &&
                    Array.isArray(serviceDetail.availability[0]?.timeArr) &&
                    serviceDetail.availability[0].timeArr.map((res, index) => (
                      <li
                        key={index}
                        className={timeState === res ? `active-list-book` : ``}
                      >
                        <p className="mb-0" onClick={() => setTimeState(res)}>
                          {res}
                        </p>
                      </li>
                    ))}

                  {Array.isArray(data?.serviceSubCategory?.availability) &&
                    data.serviceSubCategory.availability.length > 0 &&
                    Array.isArray(
                      data.serviceSubCategory.availability[0]?.timeArr
                    ) &&
                    data.serviceSubCategory.availability[0].timeArr.map(
                      (res, index) => (
                        <li
                          key={index}
                          className={
                            timeState === res ? `active-list-book` : ``
                          }
                        >
                          <p className="mb-0" onClick={() => setTimeState(res)}>
                            {res}
                          </p>
                        </li>
                      )
                    )}
                </ul>
              </div>

              <div className="">
                <Form.Group controlId="exampleForm.ControlTextarea1">
                  <Form.Label>Message</Form.Label>
                  <Form.Control
                    as="textarea"
                    onChange={(e) => setMsgState(e.target.value)}
                    value={msgState}
                    rows={3}
                    placeholder="Enter your message"
                  />
                </Form.Group>
              </div>
            </Col>
          </Row>
          <div className="book-service-action mt-3">
            <button onClick={() => setShow(false)}>Cancel</button>
            <button onClick={() => handleBooking()}>Book</button>
          </div>
        </Modal.Body>
      </Modal>
      <RequestSentByUser
        isRequestModal={isRequestModal}
        setIsRequestModal={setIsRequestModal}
      />
    </>
  );
};

export default CustomerBookServiceModal;
