import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../../../Components/Layout/Layout";
import ProductActions from "../../../Redux/Actions/ProductActions";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Slider from "react-slick";
import DeleteConfirmation from "../../../CommanComponents/Modals/DeleteConfirmation";
import { toast } from "react-toastify";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const productDetail = useSelector((state) => state.products.productDetail);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(ProductActions.getProductById({ id }));
    }
  }, [id, dispatch]);

  const handleDelete = () => {
    if (productDetail?._id) {
      setIsDeleting(true);
      dispatch(ProductActions.deleteProduct(productDetail._id))
        .then((res) => {
          if (res?.status_code === 200) {
            toast.success("Product deleted successfully!");
            navigate("/corporate/products");
          } else {
            toast.error("Failed to delete product.");
          }
        })
        .finally(() => {
          setIsDeleting(false);
          setShowDeleteModal(false);
        });
    }
  };

  const sliderSettings = {
    dots: true,
    infinite: productDetail?.images?.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="service-detail-card3">
                <Slider {...sliderSettings}>
                  {productDetail?.images?.map((image, index) => (
                    <div key={index} className="card-box">
                      <img
                        src={`${process.env.REACT_APP_API_URL}/products/${image}`}
                        alt={`Product Image ${index + 1}`}
                      />
                    </div>
                  ))}
                </Slider>
                <div>
                  <h3 className="text-capitalize">{productDetail?.name || ""}</h3>
                  <h4>{productDetail?.categoryId?.service_category_name}</h4>
                  <p>{productDetail?.description}</p>
                  <div className="book-service-action-btn">
                    <button onClick={() => setShowDeleteModal(true)}>Delete</button>
                    <button
                      onClick={() =>
                        navigate(`/corporate/products/edit/${productDetail?._id}`)
                      }
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>

        <DeleteConfirmation
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Product"
          message="Are you sure you want to delete this product?"
          confirmText="Delete"
          isLoading={isDeleting}
        />
      </section>
    </Layout>
  );
}