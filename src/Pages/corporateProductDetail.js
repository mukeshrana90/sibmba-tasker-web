import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import Layout from "../Components/Layout/Layout";
import StarRating from "../CommanComponents/StarRating";
import ChatIcon from "../Assets/Images/chat.svg";
import mapIcon from "../Assets/Images/map.svg";
export default function CorporateProductDetailPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [show, setShow] = useState(false);
  const productDetails = useSelector(
    (state) => state.service.getCorporateList?.data
  );
  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: productDetails?.images?.length > 1,
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
    dispatch(CustomerActions.corpoInfoProductListUser({ productId: id }));
  }, [dispatch, { productId: id }]);

  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <div className="bookings-details-title mt-5">
            <h2>Product Details</h2>
          </div>
          <Row className="quotation-requests-wrap mt-3">
            <Col lg={12} className="">
              <div className="service-detail-card pt-3">
                {productDetails?.images?.length > 0 ? (
                  <Slider {...sliderSettings}>
                    {productDetails.images.map((image, index) => (
                      <div key={index} className="card-box task-details">
                        <img
                          src={`${process.env.REACT_APP_API_URL}/products/${image}`}
                          alt={productDetails.name}
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
                  <h3>{productDetails?.name}</h3>
                  <p>
                    Description:{" "}
                    {productDetails?.description || "No description provided."}
                  </p>
                  <div className="book-service-action-btn">
                    <h4>Price: ${productDetails?.price || "N/A"}</h4>
                  </div>
                </div>
              </div>
            </Col>
            <Col>
              <div className="quotation-inner d-flex justify-content-center gap-3 mt-3 mb-0">
                <button onClick={() => navigate(`/messages`)}>
                  <img className="icons" src={ChatIcon} alt="" /> Chat
                </button>
                <button>
                  <img src={mapIcon} alt="" /> Map
                </button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
