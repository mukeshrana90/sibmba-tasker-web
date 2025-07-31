import { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import Layout from "../Components/Layout/Layout";
import ChatIcon from "../Assets/Images/chat.svg";
import { toast } from "react-toastify";
export default function CorporateProductDetailPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
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
        settings: { slidesToShow: 1, slidesToScroll: 1, infinite: true },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  useEffect(() => {
    if (id) {
      dispatch(CustomerActions.corpoInfoProductListUser({ productId: id }));
    }
  }, [dispatch, id]);

  const handleCopyURL = () => {
    const fullURL = `${window.location.origin}/product-detail/${id}`;
    navigator.clipboard.writeText(fullURL).then(() => {
      toast.success("Product URL copied to clipboard!");
    });
  };

  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <div className="bookings-details-title mt-5">
            <h2>Product Details</h2>
          </div>
          <Row className="quotation-requests-wrap mt-3">
            <Col lg={12}>
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
                <div className ="book-now-product d-flex">
              </div>
              </div>
              </div>
            </Col>
            <Col>
            <div className="d-flex justify-content-center align-items-center book-service-action-btn gap-3">
              <button
                className="view-more-btn"
                onClick={() => {
                  const product = {
                    image:
                      productDetails?.images?.[0]
                        ? `${process.env.REACT_APP_API_URL}/products/${productDetails.images[0]}`
                        : "/Assets/Images/default-task.png",
                    name: productDetails?.name || "-",
                    description:
                      productDetails?.description || "No description available.",
                    price: `$${productDetails?.price || "0"}`,
                    id: productDetails?._id || "Flexible",
                  };

                  localStorage.setItem("preloadTaskMessage", JSON.stringify(product));
                  localStorage.setItem("reciverID", productDetails?.user_id); 
                  navigate("/messages");
                }}
              >
                <img src={ChatIcon} alt="Chat"/> Direct Chat
              </button>

              <button className="primaryBtn">Buy Now</button>
            </div>
          </Col>

          </Row>
        </Container>
      </section>
    </Layout>
  );
}
