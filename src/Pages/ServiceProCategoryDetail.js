// import React, { useEffect, useRef, useState } from "react";
// import Container from "react-bootstrap/Container";
// import Row from "react-bootstrap/Row";
// import Col from "react-bootstrap/Col";
// import { useLocation, useNavigate, useParams } from "react-router-dom";
// import Layout from "../Components/Layout/Layout";
// import Slider from "react-slick";
// import Form from "react-bootstrap/Form";
// import Modal from "react-bootstrap/Modal";
// import { useDispatch, useSelector } from "react-redux";
// import ServiceActions from "../Redux/Actions/ServiceActions";
// import { Button } from "react-bootstrap";
// import CustomerActions from "../Redux/Actions/CustomerActions";
// import CustomerBookServiceModal from "../CommanComponents/Modals/CustomerBookServiceModal";
// import StarRating from "../CommanComponents/StarRating";
// import { formatDate } from "fullcalendar/index.js";
// import { chunk } from "lodash";
// import MapComponent from "../CommanComponents/MapComponent";

// var settings = {
//   dots: false,
//   infinite: true,
//   speed: 500,
//   slidesToShow: 3,
//   slidesToScroll: 1,
//   arrows: true,
//   responsive: [
//     {
//       breakpoint: 1024,
//       settings: {
//         slidesToShow: 3,
//         slidesToScroll: 1,
//         infinite: true,
//       },
//     },
//     {
//       breakpoint: 768,
//       settings: {
//         slidesToShow: 2,
//         slidesToScroll: 1,
//       },
//     },
//     {
//       breakpoint: 480,
//       settings: {
//         slidesToShow: 1,
//         slidesToScroll: 1,
//       },
//     },
//   ],
// };

// export default function ServiceProCategoryDetail() {
//   const Navigate = useNavigate();
//   const dispatch = useDispatch();
//   const location = useLocation();
//   const {id} = useParams()
//   const searchParams = new URLSearchParams(location.search);
//   const service_id = searchParams.get("service_id");

//   const [show, setShow] = useState(false);

//   const categoryDetail = useSelector((e) => e.service.categoryData);

//   const handleClose = () => setShow(false);
//   const handleShow = () => setShow(true);

//   const [showMapModal, setShowMapModal] = useState(false); // State for map modal

//   useEffect(() => {
//     dispatch(ServiceActions.getServiceCategoryDetailId({ id }));
//   }, []);

//   const sliderSettings = {
//     dots: true,
//     infinite: categoryDetail?.images?.length > 1,
//     speed: 500,
//     slidesToShow: 1,
//     slidesToScroll: 1,
//     responsive: [
//       {
//         breakpoint: 1024,
//         settings: {
//           slidesToShow: 3,
//           slidesToScroll: 1,
//           infinite: true,
//         },
//       },
//       {
//         breakpoint: 768,
//         settings: {
//           slidesToShow: 2,
//           slidesToScroll: 1,
//         },
//       },
//       {
//         breakpoint: 480,
//         settings: {
//           slidesToShow: 1,
//           slidesToScroll: 1,
//         },
//       },
//     ],
//   };


//   const feedbackCount = categoryDetail?.feedbacks?.length || 0;
//   const slidesToScrollValue = feedbackCount < 3 ? 1 : 3;

//   const settings = {
//     dots: true,
//     infinite: feedbackCount > 3,
//     speed: 500,
//     slidesToShow: 1,
//     slidesToScroll: 1,
//     arrows: true,
//     responsive: [
//       {
//         breakpoint: 1024,
//         settings: {
//           slidesToShow: 1,
//           slidesToScroll: 1,
//           infinite: true,
//         },
//       },
//       {
//         breakpoint: 768,
//         settings: {
//           slidesToShow: 1,
//           slidesToScroll: 1,
//         },
//       },
//     ],
//   };

//   const groupedFeedbacks = chunk(categoryDetail?.feedbacks || [], 3); // chunks of 3


//   const modalRef = useRef();

//   const openModal = () => {
//     const modal = new window.bootstrap.Modal(modalRef.current);
//     modal.show();
//   };

//   return (
//     <Layout>
//       <section className="service-detail-sec">
//         <Container>
//           <Row>
//             <Col lg={12}>
//               <div className="service-detail-card2">

//                 <Slider {...sliderSettings}>
//                   {categoryDetail?.images?.length > 0 &&
//                     categoryDetail?.images?.map((image, index) => (
//                       <div key={index} className="card-box">
//                         <img
//                           src={`${process.env.REACT_APP_API_URL}/user/${image}`}
//                           alt={``}
//                         />
//                       </div>
//                     ))}
//                 </Slider>
//                 <div>
//                   <h3>
//                     {categoryDetail?.serviceSubCategoryName ||
//                       "N/A"}
//                   </h3>
//                   <p>{categoryDetail?.desc || "N/A"}</p>
//                   <div className="d-flex">
//                     <div className="book-service-action-btn">
//                       <h4></h4>
//                       {categoryDetail?.is_booked === 0 && (
//                         <button type="button" onClick={handleShow}>
//                          Chat
//                         </button>
//                       )}
//                     </div>
//                     <div >
//                       <div className="chat-btns ">
//                         <div className="chat-process"   >
//                           <button onClick={() => {
//                             Navigate(`/messages?userID=${categoryDetail?.serviceProviderId?._id}`)
//                             localStorage.setItem("reciverID", categoryDetail?.serviceProviderId?._id);
//                           }}>

//                           </button>
//                         </div>

//                       </div>
//                     </div>
//                   </div>


//                 </div>


//               </div>
//             </Col>

//           </Row>
//         </Container>
//       </section>

//       <section className="category-services-sec pt-0">
//         <Container>
//           <div className="category-services-lists">
//             <div className="list-title">
//               <h2>Service Provider</h2>
//             </div>
//             <div
//               className="provider-view-pro"
//             // onClick={() => Navigate(`/service-provider/${categoryDetail?.serviceProviderId?._id}`)}
//             >
//               <img
//                 src={`${process.env.REACT_APP_API_URL}/${categoryDetail?.serviceProviderId?.profile_image}`}
//                 alt={""}
//               />
//               <div>
//                 <h5>{categoryDetail?.serviceProviderId?.company_name}</h5>
//                 <p>{categoryDetail?.serviceProviderId?.street_address}</p>
//               </div>
//             </div>
//           </div>
//         </Container>
//       </section>

//     </Layout>
//   );
// }



import  { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { chunk } from "lodash";

var settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
        {
            breakpoint: 1024,
            settings: {
                slidesToShow: 3,
                slidesToScroll: 1,
                infinite: true,
            },
        },
        {
            breakpoint: 768,
            settings: {
                slidesToShow: 2,
                slidesToScroll: 1,
            },
        },
        {
            breakpoint: 480,
            settings: {
                slidesToShow: 1,
                slidesToScroll: 1,
            },
        },
    ],
};

export default function ServiceProCategoryDetail() {
    const Navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const { id } = useParams();
    const searchParams = new URLSearchParams(location.search);
    const service_id = searchParams.get("service_id");

    const [show, setShow] = useState(false);
    const categoryDetail = useSelector((e) => e.service.categoryData);
    useEffect(() => {
        dispatch(ServiceActions.getServiceCategoryDetailId({ id }));
    }, []);

    const sliderSettings = {
        dots: true,
        infinite: categoryDetail?.images?.length > 1,
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
                },
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                },
            },
        ],
    };

    const feedbackCount = categoryDetail?.feedbacks?.length || 0;
    const slidesToScrollValue = feedbackCount < 3 ? 1 : 3;

    const settings = {
        dots: true,
        infinite: feedbackCount > 3,
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

    const groupedFeedbacks = chunk(categoryDetail?.feedbacks || [], 3);

    const modalRef = useRef();

    const openModal = () => {
        const modal = new window.bootstrap.Modal(modalRef.current);
        modal.show();
    };

    return (
      <Layout>
        <section className="service-detail-sec">
          <Container>
            <Row>
              <Col lg={12}>
                <div className="chat-detail-card">
                  <Slider {...sliderSettings}>
                    {categoryDetail?.images?.length > 0 &&
                      categoryDetail?.images?.map((image, index) => (
                        <div key={index} className="card-box">
                          <img
                            src={`${process.env.REACT_APP_API_URL}/user/${image}`}
                            alt={``}
                          />
                        </div>
                      ))}
                  </Slider>
                  <div>
                    <h3>
                      {categoryDetail?.serviceProviderId?.full_name || "N/A"}
                    </h3>
                    <p>
                      {categoryDetail?.serviceProviderId?.company_name || "N/A"}
                    </p>
                    <div className="d-flex">
                      <div className="chat-process-sec">
                        <h2></h2>
                        <button
                          type="button"
                          onClick={() => {
                            Navigate(
                              `/messages?userID=${categoryDetail?.serviceProviderId?._id}`
                            );
                            localStorage.setItem(
                              "reciverID",
                              categoryDetail?.serviceProviderId?._id
                            );
                          }}
                        >
                          Chat
                        </button>
                      </div>
                      <div>
                        <div className="chat-btns">
                          <div className="chat-process">
                            <button></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        <section className="category-services-sec mt-5 pt-0">
          <Container>
            <div className="category-services-lists">
              {/* New Section to Match the Image Layout */}
              <Row className="mt-4">
                <Col md={4}>
                  <div className="info-box-head">
                    <h6>Contact Information</h6>
                  </div>
                  <div className="info-box">
                    <p>
                      <strong>Email:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.email || "N/A"}
                    </p>
                    <p>
                      <strong>Phone:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.country_code || ""}
                      {categoryDetail?.serviceProviderId?.phone_number || "N/A"}
                    </p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="info-box-head">
                    <h6>Address</h6>
                  </div>
                  <div className="info-box">
                    <p>
                      <strong>Street:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.street_address ||
                        "N/A"}
                    </p>
                    <p>
                      <strong>House:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.house_number || "N/A"}
                    </p>
                    <p>
                      <strong>Suburb:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.suburbs || "N/A"}
                    </p>
                    <p>
                      <strong>Post Code:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.post_code || "N/A"}
                    </p>
                    <p>
                      <strong>Country:</strong>{" "}
                      {categoryDetail?.serviceProviderId?.country || "N/A"}
                    </p>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="info-box-head">
                    <h6>Verification Status</h6>
                  </div>
                  <div className="info-box">
                    <p className="info-box-item">
                      <strong>Account Verified:</strong>{" "}
                      <span
                        className={
                          categoryDetail?.serviceProviderId?.account_verified
                            ? "badge badge-success"
                            : "badge badge-danger"
                        }
                      >
                        {categoryDetail?.serviceProviderId?.account_verified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </p>
                    <p className="info-box-item">
                      <strong>Email Verified:</strong>{" "}
                      <span
                        className={
                          categoryDetail?.serviceProviderId?.email_verified
                            ? "badge badge-success"
                            : "badge badge-danger"
                        }
                      >
                        {categoryDetail?.serviceProviderId?.email_verified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </p>
                    <p className="info-box-item">
                      <strong>Phone Verified:</strong>{" "}
                      <span
                        className={
                          categoryDetail?.serviceProviderId?.phone_verified
                            ? "badge badge-success"
                            : "badge badge-danger"
                        }
                      >
                        {categoryDetail?.serviceProviderId?.phone_verified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </p>
                  </div>
                </Col>
              </Row>
            </div>
          </Container>
        </section>
      </Layout>
    );
}