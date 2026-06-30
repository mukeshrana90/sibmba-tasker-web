import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";

export default function MySubscription() {
  var settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
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
      {
        breakpoint: 480,
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
              <div class="bookings-details-title">
                <h2>My Subscription</h2>
              </div>
              <div className="my-subscription-cantain">
                <div className="left-part-view">
                  <div className="best-value-label">Best Value</div>
                  <Slider {...settings}>
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>{" "}
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>{" "}
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>
                  </Slider>
                  <div className="subscription-offer mt-5">
                    <h3>Important Note!</h3>
                    <p>
                      Subscription Details Once a Membership has been purchased,
                      payment will be charged to your iTunes google play
                      account. Your subscription will automatically renew unless
                      auto-renewal is tuned off at least 48 hours before the end
                      of the current subscription period. your account will be
                      charged for renewal within 48 hours prior to the end of
                      the current subscription period. please read our terms of
                      service and privacy policy for more information.
                    </p>
                    <Link to="">Terms & Conditions</Link>
                    <Link to="">Privacy policy</Link>
                    <button>Grab Offer</button>
                  </div>
                </div>
                <div className="right-part-view">
                  <div className="active-Plan">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="168"
                      height="168"
                      viewBox="0 0 168 168"
                      fill="none"
                    >
                      <circle cx="82" cy="87" r="63" fill="#0f5c4c" />
                      <circle cx="82" cy="76" r="22" fill="white" />
                      <g filter="url(#filter0_d_3224_26106)">
                        <path
                          d="M80.5308 62.8825C80.6806 62.614 80.8951 62.3912 81.153 62.2363C81.4109 62.0815 81.7031 62 82.0005 62C82.2979 62 82.5902 62.0815 82.848 62.2363C83.1059 62.3912 83.3204 62.614 83.4702 62.8825L87.2737 69.7052L94.6602 71.3774C94.9507 71.4434 95.2197 71.5878 95.4402 71.7962C95.6606 72.0047 95.825 72.2699 95.9168 72.5654C96.0087 72.8609 96.0248 73.1764 95.9635 73.4804C95.9023 73.7844 95.7659 74.0664 95.5678 74.2981L90.5328 80.1865L91.2949 88.043C91.3249 88.3523 91.2768 88.6645 91.1553 88.9483C91.0338 89.2322 90.8431 89.4778 90.6024 89.6605C90.3617 89.8433 90.0792 89.9569 89.7834 89.9899C89.4875 90.023 89.1885 89.9743 88.9162 89.8489L82.0005 86.6636L75.0848 89.8489C74.8126 89.9743 74.5136 90.023 74.2177 89.9899C73.9218 89.9569 73.6394 89.8433 73.3986 89.6605C73.1579 89.4778 72.9672 89.2322 72.8457 88.9483C72.7242 88.6645 72.6761 88.3523 72.7061 88.043L73.4682 80.1865L68.4332 74.2996C68.2348 74.0678 68.0981 73.7858 68.0366 73.4815C67.9752 73.1773 67.9912 72.8616 68.0831 72.5658C68.1749 72.2701 68.3394 72.0047 68.5601 71.7962C68.7808 71.5876 69.05 71.4432 69.3408 71.3774L76.7273 69.7052L80.5308 62.8825Z"
                          fill="#0f5c4c"
                        />
                      </g>
                      <path
                        d="M81.242 67.5673C81.3405 67.3947 81.4816 67.2515 81.6512 67.1519C81.8208 67.0524 82.013 67 82.2087 67C82.4043 67 82.5965 67.0524 82.7661 67.1519C82.9357 67.2515 83.0768 67.3947 83.1753 67.5673L85.677 71.9533L90.5354 73.0283C90.7265 73.0707 90.9034 73.1636 91.0484 73.2976C91.1935 73.4316 91.3016 73.602 91.362 73.792C91.4224 73.982 91.433 74.1848 91.3927 74.3803C91.3524 74.5757 91.2627 74.757 91.1324 74.906L87.8207 78.6913L88.3219 83.7419C88.3417 83.9408 88.3101 84.1415 88.2301 84.3239C88.1502 84.5064 88.0248 84.6643 87.8665 84.7818C87.7081 84.8993 87.5224 84.9723 87.3277 84.9935C87.1331 85.0148 86.9365 84.9835 86.7574 84.9028L82.2087 82.8552L77.66 84.9028C77.4809 84.9835 77.2842 85.0148 77.0896 84.9935C76.895 84.9723 76.7092 84.8993 76.5509 84.7818C76.3925 84.6643 76.2671 84.5064 76.1872 84.3239C76.1073 84.1415 76.0756 83.9408 76.0954 83.7419L76.5966 78.6913L73.2849 74.9069C73.1544 74.7579 73.0645 74.5766 73.0241 74.381C72.9837 74.1854 72.9942 73.9824 73.0547 73.7923C73.1151 73.6022 73.2233 73.4316 73.3684 73.2975C73.5136 73.1635 73.6906 73.0707 73.8819 73.0283L78.7403 71.9533L81.242 67.5673Z"
                        fill="white"
                      />
                      <path
                        d="M93.947 101.368C93.2971 99.3648 90.2574 100.332 88.2549 100.984C84.2301 102.294 79.8803 102.292 75.8544 100.984C73.8501 100.334 70.9114 99.3592 70.0843 101.297C70.0294 101.426 70 101.56 70 101.698V118.864C70 119.172 70.1364 119.429 70.3561 119.627C70.4838 119.743 70.6542 119.837 70.8528 119.902C71.0513 119.967 71.272 120 71.4958 120C71.9248 120 72.3816 119.88 72.8033 119.653L81.06 115.245C81.315 115.108 81.6812 115.03 82.0621 115.03C82.4428 115.03 82.8083 115.108 83.0641 115.246L91.2931 119.653C91.7164 119.88 92.1417 120 92.5699 120C93.2941 120 94 119.649 94 118.864V101.698C94 101.585 93.9818 101.475 93.947 101.368Z"
                        fill="white"
                      />
                      <defs>
                        <filter
                          id="filter0_d_3224_26106"
                          x="0"
                          y="0"
                          width="168"
                          height="168"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dx="2" dy="8" />
                          <feGaussianBlur stdDeviation="35" />
                          <feComposite in2="hardAlpha" operator="out" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="BackgroundImageFix"
                            result="effect1_dropShadow_3224_26106"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="effect1_dropShadow_3224_26106"
                            result="shape"
                          />
                        </filter>
                      </defs>
                    </svg>
                    <span>Active Plan</span>
                    <h3>Silver Package</h3>
                    <p>
                      Your Premium Plan will expire on <br />
                      March 22, 2024, 05.30 PM
                    </p>
                    <div>
                      <div>
                        <p>Upgrade Plan</p>
                      </div>
                      <hr />
                    </div>
                  </div>
                  <Slider {...settings}>
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>{" "}
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>{" "}
                    <div>
                      <div className="subscription-offer">
                        <p className="title-sub">BRONZE PACKAGE</p>
                        <h1>
                          £49<span>/ month</span>
                        </h1>
                        <p>
                          Lorem ipsum dolor sit amet consectetur. Non at
                          fermentum nibh mauris mauris.
                        </p>
                        <hr />
                        <ul>
                          <li>3 Service Listings</li>
                          <li>Instant Messaging</li>
                          <li>Reviews and comment</li>
                        </ul>
                      </div>
                    </div>
                  </Slider>
                  <div className="subscription-offer mt-5">
                    <h3>Important Note!</h3>
                    <p>
                      Subscription Details Once a Membership has been purchased,
                      payment will be charged to your iTunes google play
                      account. Your subscription will automatically renew unless
                      auto-renewal is tuned off at least 48 hours before the end
                      of the current subscription period. your account will be
                      charged for renewal within 48 hours prior to the end of
                      the current subscription period. please read our terms of
                      service and privacy policy for more information.
                    </p>
                    <Link to="">Terms & Conditions</Link>
                    <Link to="">Privacy policy</Link>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
