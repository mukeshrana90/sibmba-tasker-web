import React, { useEffect, useMemo, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from "react-bootstrap/Modal";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import CustomerActions from "../Redux/Actions/CustomerActions";
import StarRating from "../CommanComponents/StarRating";
import MapComponent from "../CommanComponents/MapComponent";
import { formatDate } from "fullcalendar/index.js";
import { chunk } from "lodash";
import defaultImage from "../Assets/Images/placeholder.jpg";
import Loader from "../CommanComponents/Loader";

function buildPublicImageUrl(path) {
  if (!path) return null;
  const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  const p = String(path).replace(/^\//, "");
  return `${base}/${p}`;
}

export default function ServiceProvider() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  const profile = useSelector((e) => e.UserSlice.serviceProviderProfile);
  const loading = useSelector((e) => e.UserSlice.loading);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapData, setMapData] = useState({ coordinates: null, address: "" });

  const provider = profile?.provider;
  const services = profile?.services || [];
  const feedbacks = profile?.feedbacks || [];
  const averageRating = profile?.averageRating ?? 0;
  const completedJobsCount = profile?.completedJobsCount ?? 0;
  const distanceKm = profile?.distanceKm;

  useEffect(() => {
    if (!id) return;
    const lat = localStorage.getItem("latitude");
    const long = localStorage.getItem("longitude");
    dispatch(
      CustomerActions.getServiceProviderProfile({
        providerId: id,
        lat: lat || undefined,
        long: long || undefined,
      })
    );
  }, [id, dispatch]);

  const feedbackCount = feedbacks.length;

  const settings = useMemo(
    () => ({
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
    }),
    [feedbackCount]
  );

  const groupedFeedbacks = chunk(feedbacks, 3);

  const profileImageSrc =
    buildPublicImageUrl(provider?.profile_image) || defaultImage;

  const displayName =
    provider?.company_name && provider.company_name !== "undefined"
      ? provider.company_name
      : provider?.full_name || "-";

  const safeVal = (v) => (!v || v === "undefined" ? null : v);

  const street =
    safeVal(provider?.street_address) ||
    safeVal(provider?.suburbs) ||
    null;

  if (loading && !profile) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  if (!loading && !provider) {
    return (
      <Layout>
        <section className="service-detail-sec">
          <Container>
            <Row>
              <Col lg={12}>
                <p className="px-3">Service provider not found.</p>
              </Col>
            </Row>
          </Container>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <div className="breadcrumb-nav-contain">
            <h2>Service Provider</h2>
            <p>
              <span
                style={{ color: "#038654", cursor: "pointer" }}
                onClick={() => navigate("/near-by-services")}
              >
                Nearby Services
              </span>{" "}
              / Service Provider
            </p>
          </div>
        </Container>
      </section>

      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <section className="category-services-sec pb-0 ">
                <Container>
                  <div className="category-services-lists">
                    <div className="list-title">
                      <h2>Service Provider</h2>
                    </div>
                    <div className="provider-pro-view provider-pro-view--profile">
                      <div className="provider-pro-view__top">
                        <div className="provider-pro-view__main">
                          <img
                            className="provider-pro-view__photo"
                            src={profileImageSrc}
                            alt={displayName}
                          />
                          <div className="provider-pro-view__info">
                            <h5>{displayName}</h5>
                            <p className="provider-pro-view__location">
                              {street ||
                                safeVal(provider?.suburbs) ||
                                "Service Provider"}
                            </p>
                            <div className="provider-stats-row">
                              <span className="provider-stat-pill">
                                <strong>{completedJobsCount}</strong> completed
                                jobs
                              </span>
                              {distanceKm != null && (
                                <span className="provider-stat-pill">
                                  <strong>{distanceKm} km</strong> from you
                                </span>
                              )}
                            </div>
                            <div className="provider-rating-row">
                              <StarRating
                                averageRating={averageRating}
                                reviewCount={feedbackCount}
                              />
                            </div>
                          </div>
                        </div>
                        {provider?._id && (
                          <div className="provider-pro-view__icon-btns">
                            {/* Chat */}
                            <button
                              type="button"
                              title="Send message"
                              onClick={() => {
                                navigate(`/messages?userID=${provider._id}`);
                                localStorage.setItem("reciverID", provider._id);
                              }}
                            >
                              <svg width="44" height="45" viewBox="0 0 44 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0.5" y="1" width="43" height="43" rx="21.5" stroke="#E5E5E5"/>
                                <path d="M31.25 12H13.25C12.0095 12 11 13.0095 11 14.25V26.25C11 27.4905 12.0095 28.5 13.25 28.5H15.5V32.25C15.5002 32.3912 15.5403 32.5295 15.6156 32.6489C15.6908 32.7684 15.7983 32.8642 15.9255 32.9254C16.0528 32.9865 16.1947 33.0106 16.335 32.9947C16.4754 32.9789 16.6083 32.9238 16.7188 32.8358L22.1383 28.5H31.25C32.4905 28.5 33.5 27.4905 33.5 26.25V14.25C33.5 13.0095 32.4905 12 31.25 12ZM22.25 22.5H16.25C16.0511 22.5 15.8603 22.421 15.7197 22.2803C15.579 22.1397 15.5 21.9489 15.5 21.75C15.5 21.5511 15.579 21.3603 15.7197 21.2197C15.8603 21.079 16.0511 21 16.25 21H22.25C22.4489 21 22.6397 21.079 22.7803 21.2197C22.921 21.3603 23 21.5511 23 21.75C23 21.9489 22.921 22.1397 22.7803 22.2803C22.6397 22.421 22.4489 22.5 22.25 22.5ZM28.25 19.5H16.25C16.0511 19.5 15.8603 19.421 15.7197 19.2803C15.579 19.1397 15.5 18.9489 15.5 18.75C15.5 18.5511 15.579 18.3603 15.7197 18.2197C15.8603 18.079 16.0511 18 16.25 18H28.25C28.4489 18 28.6397 18.079 28.7803 18.2197C28.921 18.3603 29 18.7511 29 18.75C29 18.9489 28.921 19.1397 28.7803 19.2803C28.6397 19.421 28.4489 19.5 28.25 19.5Z" fill="#252525"/>
                              </svg>
                            </button>
                            {/* Map */}
                            {provider?.location?.coordinates && (
                              <button
                                type="button"
                                title="View on map"
                                onClick={() => {
                                  setMapData({
                                    coordinates: provider.location.coordinates,
                                    address: street || displayName,
                                  });
                                  setShowMapModal(true);
                                }}
                              >
                                <svg width="44" height="45" viewBox="0 0 44 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="0.5" y="1" width="43" height="43" rx="21.5" stroke="#E5E5E5"/>
                                  <path d="M10 33.6088C10.1242 33.3324 10.2421 33.0529 10.3787 32.7858C10.4284 32.6896 10.5122 32.5902 10.6053 32.5436C12.5516 31.5406 14.5041 30.5469 16.4535 29.55C16.5529 29.5004 16.6367 29.4258 16.7577 29.55C18.3005 31.0996 19.8464 32.643 21.3922 34.1864C21.414 34.2081 21.4295 34.2329 21.4543 34.2671C21.3333 34.3478 21.2215 34.4224 21.1098 34.5C17.5772 34.5 14.0447 34.5 10.5153 34.5C10.2825 34.3882 10.1117 34.2143 10 33.9845C10 33.8603 10 33.7361 10 33.6088Z" fill="#252525"/>
                                  <path d="M24.158 34.5C24.6795 34.2205 25.1948 33.9379 25.7194 33.6647C27.8986 32.5343 30.0777 31.4039 32.2568 30.2767C32.3313 30.2394 32.4089 30.2022 32.502 30.1556C32.7317 30.6897 32.9552 31.2114 33.1787 31.7331C33.4053 32.2641 33.635 32.792 33.8616 33.3231C34.1162 33.9193 34.0355 34.1708 33.486 34.5C30.3788 34.5 27.2684 34.5 24.158 34.5Z" fill="#252525"/>
                                  <path d="M15.6371 17.2807C15.6713 15.8554 15.9507 14.4921 16.7515 13.2934C18.1298 11.2284 20.1071 10.3402 22.5501 10.5234C25.3563 10.7346 27.7309 12.7531 28.2493 15.992C28.5411 17.8024 28.1438 19.4793 27.4174 21.1159C26.4737 23.243 25.1979 25.1653 23.7918 27.0067C23.3944 27.5284 22.9785 28.0377 22.5563 28.5377C22.2428 28.9103 21.7647 28.9228 21.4574 28.5594C19.5887 26.3329 17.9063 23.9821 16.677 21.3301C16.2052 20.3147 15.8358 19.2619 15.6961 18.144C15.662 17.8583 15.6558 17.5695 15.6371 17.2807ZM22.0007 18.9452C23.1709 18.9452 24.1146 18.0043 24.1146 16.8367C24.1146 15.669 23.1678 14.7219 22.0007 14.7188C20.8366 14.7188 19.8867 15.669 19.8867 16.8335C19.8867 18.0043 20.8304 18.9421 22.0007 18.9452Z" fill="#252525"/>
                                  <path d="M17.9839 28.7706C18.4216 28.547 18.8313 28.3389 19.2411 28.1309C19.598 28.5656 19.9395 28.9911 20.2903 29.4103C21.2557 30.5717 22.7488 30.5686 23.7204 29.4103C25.2942 27.5315 26.7097 25.5441 27.8923 23.3952C27.9544 23.2803 28.0227 23.2213 28.1624 23.2244C28.4666 23.2368 28.7708 23.2275 29.075 23.2337C29.3792 23.2399 29.5965 23.3921 29.7145 23.6685C30.4564 25.3888 31.1921 27.1092 31.9402 28.8451C31.8719 28.8855 31.8067 28.929 31.7415 28.9631C28.8267 30.4754 25.9119 31.9878 22.9971 33.5001C22.8791 33.5622 22.7953 33.5994 22.6743 33.4752C21.1532 31.9474 19.626 30.4258 18.0987 28.901C18.0646 28.8669 18.0367 28.8296 17.9839 28.7706Z" fill="#252525"/>
                                  <path d="M18.3781 26.985C16.0407 28.1806 13.7126 29.3699 11.3317 30.5841C11.3782 30.4599 11.4 30.3885 11.431 30.3202C12.3623 28.1495 13.2997 25.9789 14.2217 23.8051C14.3924 23.3983 14.6593 23.1996 15.1001 23.2213C15.3485 23.2337 15.5999 23.212 15.8482 23.2306C15.932 23.2368 16.0407 23.2927 16.0841 23.361C16.8385 24.5349 17.5834 25.718 18.3284 26.8949C18.344 26.9136 18.3533 26.9353 18.3781 26.985Z" fill="#252525"/>
                                  <path d="M22.0038 17.5323C21.6157 17.5323 21.3022 17.2248 21.2991 16.8398C21.296 16.4516 21.6251 16.1193 22.0131 16.1255C22.3918 16.1317 22.7084 16.4547 22.7084 16.8367C22.7022 17.2248 22.3918 17.5323 22.0038 17.5323Z" fill="#252525"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Container>
              </section>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <div>
                <h2>Services offered</h2>
                <p className="list-subtitle">
                  Browse what this provider offers and typical pricing.
                </p>
              </div>
            </div>
            {services.length > 0 ? (
              <Row className="provider-services-grid g-4">
                {services.map((svc) => {
                  const catName =
                    svc.serviceCategoryId?.service_category_name || "";
                  const thumb =
                    Array.isArray(svc.images) && svc.images.length > 0
                      ? buildPublicImageUrl("/user/" + svc.images[0])
                      : null;
                  const initial = (
                    svc.serviceSubCategoryName || "S"
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase();
                  const openServiceDetail = () => {
                    if (!svc._id) return;
                    navigate(
                      `/customer-service-detail?service_id=${svc._id}`
                    );
                  };

                  return (
                    <Col key={svc._id} xs={12} sm={6} lg={4}>
                      <article
                        className="provider-service-card"
                        role="button"
                        tabIndex={0}
                        aria-label={`Open service: ${svc.serviceSubCategoryName || "service"}`}
                        onClick={openServiceDetail}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openServiceDetail();
                          }
                        }}
                      >
                        <div className="provider-service-card__media">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={svc.serviceSubCategoryName || ""}
                            />
                          ) : (
                            <div
                              className="provider-service-card__placeholder"
                              aria-hidden
                            >
                              {initial}
                            </div>
                          )}
                        </div>
                        <div className="provider-service-card__body">
                          <h3 className="provider-service-card__title">
                            {svc.serviceSubCategoryName || "Service"}
                          </h3>
                          <p className="provider-service-card__category">
                            {catName || "General service"}
                          </p>
                          {svc.price ? (
                            <span className="provider-service-card__price">
                              From ${Number(svc.price).toFixed(2)}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <div className="provider-services-empty">
                No services listed for this provider yet.
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <h2>Ratings and reviews</h2>
            </div>

            <div className="booked-services-slide">
              {feedbackCount > 0 ? (
                <Slider {...settings}>
                  {groupedFeedbacks?.map((group, index) => (
                    <div key={index} className="review-slide-group">
                      <div className="d-flex gap-4">
                        {group.map((feedback, i) => {
                          const reviewerImg =
                            buildPublicImageUrl(
                              feedback?.user_id?.profile_image
                            ) || defaultImage;
                          return (
                            <div
                              key={feedback._id || i}
                              className="review-slide-card"
                              style={{ flex: 1 }}
                            >
                              <div>
                                <div className="review-img">
                                  <img src={reviewerImg} alt="" />
                                </div>
                                <div className="rv-section">
                                  <h4>{feedback?.user_id?.full_name}</h4>
                                  <div className="rate-stars">
                                    <ul>
                                      <StarRating
                                        averageRating={feedback?.rating}
                                        type="noreview"
                                      />
                                    </ul>
                                  </div>
                                </div>
                                <div className="rv-date">
                                  <p>{formatDate(feedback?.createdAt)}</p>
                                </div>
                              </div>
                              <p>{feedback?.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Slider>
              ) : (
                <p>No Reviews</p>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Modal show={showMapModal} onHide={() => setShowMapModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Provider Location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="comman-small-pop text-center">
            <MapComponent coordinates={mapData.coordinates} address={mapData.address} />
          </div>
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
