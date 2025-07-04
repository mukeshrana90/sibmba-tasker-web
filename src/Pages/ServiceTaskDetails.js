import React, { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import moment from "moment";
import AddQuotationModal from "../CommanComponents/Modals/AddQuotationModal";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";

export default function ServiceTaskDetails() {

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
  const [dropdownStates, setDropdownStates] = useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const status = searchParams.get("status");

  const [show, setShow] = useState(false);
  const [showQutation, setShowQuotation] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleCloseQuotation = () => setShowQuotation(false);
  const handleShowQuotation = () => setShowQuotation(true);

  const [showEditQuotation, setShowEditQuotation] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const handleCloseEditQuotation = () => {
    setShowEditQuotation(false);
    setSelectedQuotation(null);
  };

  const handleShowEditQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setShowEditQuotation(true);
  };

  const postTaskDetails = useSelector((state) => state.UserSlice.postTaskDetail);

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

  // const handleAddQuotation = ({ offer_price, description, task_id }) => {
  //     dispatch(ServiceActions.createQuotation({ task_id, offer_price, description }))
  //         .then((res) => {
  //             if (res?.payload?.success) {
  //                 dispatch(CustomerActions.getPostTaskDetail(id));
  //             } else {
  //                 //   alert("Failed to add quotation.");
  //             }
  //         })
  //         .catch(() => {
  //             // alert("Error adding quotation.");
  //         });
  // };


  const handleQuotationSubmit = ({ offer_price, description, task_id, quatation_id }) => {
    if (quatation_id) {
      // Edit quotation
      dispatch(ServiceActions.editQuotation({
        quatation_id,
        // task_id,
        offer_price,
        description
      }))
        .then((res) => {
          if (res?.payload?.success) {
            toast.success("Quotation updated successfully");
            dispatch(CustomerActions.getPostTaskDetail(id));
            setDropdownStates((prev) => ({
              ...prev,
              [quatation_id]: false,
            }));
          } else {
            toast.error(res?.payload?.message || "Failed to update quotation");
          }
        })
        .catch(() => {
          toast.error("Error updating quotation");
        });
    } else {
      // Add new quotation
      dispatch(ServiceActions.createQuotation({ task_id, offer_price, description }))
        .then((res) => {
          if (res?.payload?.success) {
            toast.success("Quotation added successfully");
            dispatch(CustomerActions.getPostTaskDetail(id));
          } else {
            toast.error(res?.payload?.message || "Failed to add quotation");
          }
        })
        .catch(() => {
          toast.error("Error adding quotation");
        });
    }
  };



  const handleTaskFunc = (data, type) => {

    let obj = {
      // quatation_id: id,
      task_id: id,
      // service_provider_id: data?.service_provider?._id,
      status: type == "cancel" ? 2 : 3
    }
    if (type == "cancel") {
      dispatch(CustomerActions.acceptRejectTaskStatus(obj)).then((res) => {
        if (res?.payload?.success) {
          toast.success("Cancelled")
          navigate("/taskslist")
        } else {
          toast.error(res?.payload?.message)
        }
      })
    } else {
      dispatch(CustomerActions.acceptRejectTaskStatus(obj)).then((res) => {
        if (res?.payload?.success) {
          toast.success("Success")
          navigate("/taskslist")
        } else {
          toast.error(res?.payload?.message)
        }
      })
    }
  }

  const handleButtonClick = (id) => {
    setDropdownStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title task-details-title">
                <h2>Task Details</h2>
              </div>
              <div className="service-detail-card pt-3">
                {task?.images?.length > 0 ? (
                  <Slider {...sliderSettings}>
                    {task.images.map((image, index) => (
                      <div key={index} className="card-box">
                        <img
                          src={`${process.env.REACT_APP_API_URLL}${image}`}
                          alt={task.need_done}
                          style={{ maxWidth: "200px", margin: "0 auto" }}
                        />
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <img
                    src={require("../Assets/Images/placeholder.jpg")}
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
                  <div className="book-service-action-btn">
                    <h4>${task?.budget || "N/A"}</h4>
                    {status !== "task" ? (
                      <button onClick={handleShowQuotation}>
                        Add Quotation
                      </button>
                    ) : (
                      <div className="book-service-action">
                        <button
                          onClick={() => handleTaskFunc(task, "cancel")}
                        >
                          Cancel
                        </button>
                        <button onClick={() => handleTaskFunc(task, "job")}>
                          Job Done{" "}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          {status === "task" && (
            <Row>
              <Col lg={12}>
                <section className="booking-status-sec mt-3">
                  <div className="booking-status-txt pt-0">
                    <div className="booking-status-left-txt">
                      <h2>Status</h2>
                      <h3 className={getStatusColor(task?.status)}>
                        Scheduled to work
                      </h3>
                      <p>
                        Service provider need to start work on scheduled day.
                      </p>
                      <h5>
                        {task?.task_time},{" "}
                        {task?.when_done
                          ? moment(task?.when_done).format("DD MMM")
                          : "N/A"}
                      </h5>
                    </div>
                  </div>
                </section>
              </Col>
            </Row>
          )}
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <h2>Quotations</h2>
            </div>
            {quotations?.length === 0 ? (
              <>
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
                  <h3>No Quotations Yet</h3>
                  <p>Currently you don’t have any offers</p>
                </div>
              </>
            ) : (
              <div>
                {/* {    <p>Your Quotations</p>}
                  {quotations?.map((quotation, index) => (
                    <div className="quotation" key={index}>
                      <div>
                        <div className="quotation-txt-show  d-flex justify-space-between">
                          <div
                            className="profile-side cursor-pointer"
                            onClick={() => navigate("/quotations-detail")}
                          >
                            <img
                              className="point-cursor"
                              src={`${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`}
                              alt="categories-img"
                            />
                            <div>
                              <h5>{quotation?.service_provider?.full_name}</h5>
                              <p>{quotation?.service_provider?.address}</p>
                              <div className="rating-stars">
                                <ul>
                                  {[...Array(5)].map((_, i) => (
                                    <li key={i}>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 14 14"
                                        fill="none"
                                      >
                                        <path
                                          d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                          fill="#FFC107"
                                        />
                                      </svg>
                                    </li>
                                  ))}
                                </ul>
                                <p>(0 reviews)</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            {status !== "task" && (
                              <div
                                className="chat-btn-card"
                                style={{ position: "relative" }}
                                ref={(el) =>
                                  (dropdownRefs.current[quotation._id] = el)
                                }
                              >
                                <button
                                  className="btn"
                                  onClick={() =>
                                    handleButtonClick(quotation?._id)
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
                                {dropdownStates[quotation._id] && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: "0",
                                      background: "#fff",
                                      border: "1px solid #ccc",
                                      borderRadius: "5px",
                                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                      padding: "5px 0",
                                      zIndex: 10,
                                      minWidth: "100px",
                                    }}
                                  >
                                    <button
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "5px 10px",
                                        textAlign: "left",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        handleShowEditQuotation(quotation)
                                      }
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <h5>${quotation?.offer_price}</h5>
                            <p>Offer Price</p>
                          </div>
                        </div>

                        <p>{quotation?.description}</p>
                      </div>
                    </div>
                  ))} */}

                <div>
                  {/* Your Quotations */}
                  {quotations?.filter(quotation =>
                    localStorage.getItem('userId') === quotation?.service_provider?._id
                  )?.length > 0 && <p>Your Quotations</p>}
                  {quotations?.filter(quotation =>
                    localStorage.getItem('userId') === quotation?.service_provider?._id
                  )?.map((quotation, index) => (
                    <div className="quotation" key={index}>
                      <div>
                        <div className="quotation-txt-show d-flex justify-space-between">
                          <div
                            className="profile-side cursor-pointer"
                          // onClick={() => navigate("/quotations-detail")}
                          >
                            <img
                              className="point-cursor"
                              src={`${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`}
                              alt="categories-img"
                            />
                            <div>
                              <h5>{quotation?.service_provider?.full_name}</h5>
                              <p>{quotation?.service_provider?.address}</p>
                              <div className="rating-stars">
                                <ul> <StarRating averageRating={quotation?.averageRating} /></ul>
                              </div>
                            </div>
                          </div>
                          <div>
                            {status !== "task" && (
                              <div
                                className="chat-btn-card mb-3"
                                style={{ position: "relative" }}
                                ref={(el) => (dropdownRefs.current[quotation._id] = el)}
                              >
                                <button
                                  className="btn"
                                  onClick={() => handleButtonClick(quotation?._id)}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="35"
                                    viewBox=" _

0 32 35"
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
                                {dropdownStates[quotation._id] && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: "0",
                                      background: "#fff",
                                      border: "1px solid #ccc",
                                      borderRadius: "5px",
                                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                      padding: "5px 0",
                                      zIndex: 10,
                                      minWidth: "100px",
                                    }}
                                  >
                                    <button
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "5px 10px",
                                        textAlign: "left",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleShowEditQuotation(quotation)}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <h5>${quotation?.offer_price}</h5>
                            <p>Offer Price</p>
                          </div>
                        </div>
                        <p>{quotation?.description}</p>
                      </div>
                    </div>
                  ))}

                  {/* Others Quotations */}
                  {quotations?.filter(quotation => localStorage.getItem('userId') !== quotation?.service_provider?._id)?.length > 0 && <p>Others Quotations</p>}
                  {quotations?.filter(quotation => localStorage.getItem('userId') !== quotation?.service_provider?._id)?.map((quotation, index) => (
                    <div className="quotation" key={index}>
                      <div>
                        <div className="quotation-txt-show d-flex justify-space-between">
                          <div
                            className="profile-side cursor-pointer"
                          // onClick={() => navigate("/quotations-detail")}
                          >
                            <img
                              className="point-cursor"
                              src={`${process.env.REACT_APP_API_URL}${quotation?.service_provider?.profile_image}`}
                              alt="categories-img"
                            />
                            <div>
                              <h5>{quotation?.service_provider?.full_name}</h5>
                              <p>{quotation?.service_provider?.address}</p>
                              <div className="rating-stars">
                                <ul> <StarRating averageRating={quotation?.averageRating} /></ul>
                              </div>
                            </div>
                          </div>
                          <div>
                            {status !== "task" && (
                              <div
                                className="chat-btn-card"
                                style={{ position: "relative" }}
                                ref={(el) => (dropdownRefs.current[quotation._id] = el)}
                              >
                                <button
                                  className="btn"
                                  onClick={() => handleButtonClick(quotation?._id)}
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
                                {dropdownStates[quotation._id] && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      left: "0",
                                      background: "#fff",
                                      border: "1px solid #ccc",
                                      borderRadius: "5px",
                                      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                                      padding: "5px 0",
                                      zIndex: 10,
                                      minWidth: "100px",
                                    }}
                                  >
                                    <button
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "5px 10px",
                                        textAlign: "left",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleShowEditQuotation(quotation)}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <h5>${quotation?.offer_price}</h5>
                            <p>Offer Price</p>
                          </div>
                        </div>
                        <p>{quotation?.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      <AddQuotationModal
        show={showQutation}
        handleClose={handleCloseQuotation}
        task={task}
        onSubmit={handleQuotationSubmit}
      />

      <AddQuotationModal
        show={showEditQuotation}
        handleClose={handleCloseEditQuotation}
        task={task}
        onSubmit={handleQuotationSubmit}
        quatation={selectedQuotation}
      />

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Edit Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="book-service-view">
            <img
              src={
                task?.images?.length > 0
                  ? `${process.env.REACT_APP_API_URL}/${task.images[0]}`
                  : require("../Assets/Images/living-room-cleaning.png")
              }
              alt={task?.need_done || "Task"}
            />
            <p>{task?.need_done || "Task"}</p>
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
                  defaultValue={task?.details}
                />
              </Form.Group>
            </Form>
          </div>
          <div className="book-service-action">
            <button onClick={handleClose}>Cancel</button>
            <button onClick={handleClose}>Save</button>
          </div>
        </Modal.Body>
      </Modal>
    </Layout>
  );
}