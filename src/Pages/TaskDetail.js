import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import moment from "moment";
import { toast } from "react-toastify";
import StarRating from "../CommanComponents/StarRating";
import { corpoTaskStatus } from "../utils/Roles";

export default function TaskDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
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

  const handleAccept = (data, type) => {
    const statusValue = type === "accept" ? 1 : 2;

    const taskStatusPayload = {
      quatation_id: data?._id,
      task_id: id,
      service_provider_id: data?.service_provider?._id,
      status: statusValue,
    };

    const suggestionStatusPayload = {
      taskId: id,
      status: statusValue,
    };

    const handleDispatch = (action, successMessage, errorMessage) => {
      return dispatch(action).then((res) => {
        if (res?.payload?.success) {
          toast.success(successMessage);
          navigate("/my-task");
        }
      });
    };

    handleDispatch(
      CustomerActions.acceptRejectTaskStatus(taskStatusPayload),
      type === "accept" ? "Accepted." : "Rejected.",
      "Failed to update task status"
    );

    handleDispatch(
      CustomerActions.acceptRejectTaskCorporateSuggestion(
        suggestionStatusPayload
      ),
      type === "accept" ? "Accepted." : "Rejected.",
      "Failed to update suggestion status"
    );
  };

  const handleDeletePost = (id) => {
    dispatch(CustomerActions.deleteTasks(id)).then((res) => {
      if (res && res?.payload) {
        toast.success(res?.payload?.message);
        navigate("/my-task");
      }
    });
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title">
                <h2>Task Details</h2>
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
                    src={require("../Assets/Images/living-room-cleaning.png")}
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
                    {quotations?.length === 0 ? (
                      <button
                        onClick={() => navigate(`/edit-task/${task?._id}`)}
                      >
                        Edit Post
                      </button>
                    ) : (
                      <button onClick={() => handleDeletePost(task?._id)}>
                        Delete Post
                      </button>
                    )}
                  </div>
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
              <h2>Quotations</h2>
            </div>
            {quotations?.length === 0 ? (
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
            ) : (
              <div>
                {quotations?.map((quotation, index) => (
                  <div className="quotation-requests-wrap">
                    <div
                      className="quotation-requests quotation-requests-inner"
                      key={index}
                    >
                      <div className="quotation-requests-inner">
                        <div className="quotation-txt-show">
                          <div
                            className="profile-side cursor-pointer"
                            onClick={() =>
                              navigate(`/quotations-detail/${quotation?._id}`)
                            }
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
                                  {" "}
                                  <StarRating
                                    averageRating={quotation.averageRating}
                                  />
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
                        {quotation[index]?.corporateSuggestion?.[index]
                          ?.corporateStatus !== corpoTaskStatus.COMPLETED &&
                        quotation[index]?.corporateSuggestion?.[index]
                          ?.userStatus === corpoTaskStatus.ACCEPT ? (
                          <div className="btn-price">
                            <button
                              onClick={() => handleAccept(quotation, "accept")}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleAccept(quotation, "reject")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="btn-price">
                            <button
                              className="primaryBtn"
                              onClick={() => handleAccept(quotation, 3)}
                            >
                              Job Done
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="quotation-wrapper">
                      {quotation?.corporateSuggestion?.length > 0 && (
                        <div className="suggested-caproate cursor-pointer">
                          <h5>Suggested Corporate</h5>
                          <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                            {quotation.corporateSuggestion.map(
                              (item, index) => {
                                const corp = item?.corporateIds;
                                if (!corp) return null;

                                return (
                                  <div
                                    key={item._id || index}
                                    onClick={() =>
                                      navigate(
                                        `/get-corporate/${item?.corporateIds?._id}`
                                      )
                                    }
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
                                      <div className="fw-bold">
                                        {corp.full_name}
                                      </div>
                                      <div className="text-muted small">
                                        {corp.shop_name}
                                      </div>
                                      <div className="text-muted small">
                                        {corp.email}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

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
