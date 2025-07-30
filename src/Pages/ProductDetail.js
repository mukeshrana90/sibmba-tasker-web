import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import moment from "moment";
import PaymentModal from "../CommanComponents/Modals/PaymentModal";

export default function ProductDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const postTaskDetails = useSelector(
    (state) => state.UserSlice.postTaskDetail
  );
  const [paymentshow, setPaymentShow] = useState(false);
  const [boookingId, setBookingId] = useState(null);
  const [selectedBoooking, setSelectedBoooking] = useState(null);

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
  const handlePaymentOpen = (id) => {
    setPaymentShow(true);
    setBookingId(id);
  };
  const handlePaymentClose = (id) => {
    setPaymentShow(false);
    setBookingId("");
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
                    src={require("../Assets/Images/living-room-cleaning.png")}
                    alt="Default"
                  />
                )}
                <div>
                  <h3>{task?.need_done || "Task"}</h3>
                  <p>{task?.address|| "-"}</p>
                  <h5>
                    {task?.task_time},{" "}
                    {task?.when_done
                      ? moment(task.when_done).format("DD MMM yy")
                      : "N/A"}
                  </h5>
                  <p>{task?.details || "No description provided."}</p>
                  <p>Budget:${task?.budget || "-"}</p>
                  <div className="book-service-action-btn leads-btn d-flex gap-2"></div>
                  {task?.payment?.status === "pending" && (
                    <div className="mt-3 text-center">
                      <button
                        className="primaryBtn"
                        onClick={() => {
                          handlePaymentOpen(task?._id);
                          setSelectedBoooking(task);
                        }}
                      >
                        Pay Now
                      </button>
                    </div>
                  )}
                </div>

                <PaymentModal
                  paymentshow={paymentshow}
                  handlePaymentClose={handlePaymentClose}
                  boookingId={boookingId}
                  data={selectedBoooking}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
