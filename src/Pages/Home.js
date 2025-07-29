import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Accordion from "react-bootstrap/Accordion";
import Slider from "react-slick";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useDispatch, useSelector } from "react-redux";
import ReadMore from "../CommanComponents/ReadMore";
import banner5 from "../Assets/Images/image.png"
import banner4 from "../Assets/Images/ban2.png"
import banner3 from "../Assets/Images/ban3.png"
import banner1 from "../Assets/Images/banner1.png"
import banner2 from "../Assets/Images/banner2.png"

export default function Home() {
  const Navigate = useNavigate();
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const categories = useSelector((e) => e.UserSlice.categories)
  const bestservices = useSelector((e) => e.UserSlice.bestservices)
  const nearByServices = useSelector((e) => e.UserSlice.nearByServices)

  const lat = localStorage.getItem("latitude");
  const long = localStorage.getItem("longitude");

  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);


  var settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 5,
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


  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        const [categoryResponse, servicesResponse, NearByServicesResponse] = await Promise.all([
          dispatch(CustomerActions.getCategories()),
          dispatch(CustomerActions.getBestServices()),
          dispatch(CustomerActions.getNearByServices({ lat, long })),

        ]);

        // setCategories(categoryResponse?.payload?.data || []);
        // setBestsetServices(servicesResponse?.payload?.data || []);
        // setNearByServices(NearByServicesResponse?.payload?.data || [])
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch, lat, long]);


  const handleProfiles = (type, id) => {
    if (token) {
      if (type == "services") {
        Navigate(`/customer-service-detail?service_id=${id}`)
      } else {
        Navigate(`/customer-category-detail?categoryId=${id}`)
      }
    } else {
      Navigate("/login")
    }
  }

  const faqsList = useSelector((e) => e.UserSlice.getFaqListing)

  useEffect(() => {
    dispatch(CustomerActions.faqsListingAction())
  }, [dispatch])

  const uniqueFaqs = faqsList?.reduce((acc, current) => {
    const x = acc.find(item => item.question === current.question);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  const handleNavigate = () => {

    if (token) {
      Navigate("/post-task")
    } else {
      Navigate("/login")
    }
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const banners = [
    banner5,
    banner1,
    banner2,
    banner3,
    banner4,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);


  return (
    <Layout>

      {/* <section className="home-banner-sec">
        <Container>
          <Row>
            <Col lg={6}>
              <div className="banner-left-text">
                <p className="mb-2">Quality cleaning at a fair price.</p>
                <h1>Specialized, efficient, and thorough cleaning services</h1>
                <p>
                  We provide Performing cleaning tasks using the least amount of
                  time, energy, and money.
                </p>
                <div>
                  <button onClick={() => Navigate("/category")}>Explore</button>
                  <button onClick={() => Navigate("/services")}>
                    View all Services
                  </button>
                </div>
              </div>
            </Col>
            <Col lg={6}></Col>
          </Row>
        </Container>
      </section> */}



      <section className="home-banner-sec">
        <div className="banner-slider">
          {banners.map((banner, index) => (
            <img
              key={index}
              src={banner}
              alt={`Banner ${index + 1}`}
              className={`banner-image ${index === activeIndex ? 'active' : ''}`}
              loading="lazy"
            />
          ))}
        </div>
        <Container>
          <Row>
            <Col xs={12} lg={6}>
              <div className="banner-left-text">
                <p className="mb-2">Need a Pro? Simba Tasker’s got you.</p>
                <h1>From major builds to quick fixes — fast, trusted help.</h1>
                <p>
                  Tap in. Get it done.
                </p>
              </div>
            </Col>
            <Col lg={6}></Col>
          </Row>
        </Container>
      </section>

      <section className="feature-card-sec">
        <Container>
          <div className="feature-card-contain">
            <div className="feature-card-item">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="31"
                  height="30"
                  viewBox="0 0 31 30"
                  fill="none"
                >
                  <g clip-path="url(#clip0_3224_478)">
                    <path
                      d="M13.3639 16.2234L18.9889 20.4422C19.0874 20.5161 19.1994 20.5698 19.3187 20.6004C19.438 20.6309 19.5621 20.6377 19.6839 20.6203C19.8058 20.6029 19.9231 20.5616 20.029 20.4989C20.135 20.4362 20.2275 20.3532 20.3014 20.2547C20.3752 20.1562 20.429 20.0441 20.4595 19.9249C20.4901 19.8056 20.4969 19.6815 20.4794 19.5596C20.462 19.4377 20.4208 19.3205 20.3581 19.2145C20.2953 19.1086 20.2124 19.0161 20.1139 18.9422L14.9061 15V7.03125C14.9061 6.78261 14.8073 6.54415 14.6315 6.36834C14.4556 6.19252 14.2172 6.09375 13.9686 6.09375C13.7199 6.09375 13.4815 6.19252 13.3056 6.36834C13.1298 6.54415 13.0311 6.78261 13.0311 7.03125V15.4688C13.0311 15.78 13.1614 16.0603 13.3639 16.2234Z"
                      fill="white"
                    />
                    <path
                      d="M14.5613 0.9375C21.4234 0.9375 27.2832 5.89031 28.4269 12.6562L28.7832 12.1266C28.9224 11.9202 29.138 11.7776 29.3823 11.7301C29.6267 11.6826 29.88 11.7342 30.0863 11.8734C30.2927 12.0127 30.4353 12.2282 30.4828 12.4726C30.5302 12.717 30.4787 12.9702 30.3395 13.1766L28.4644 15.9891C28.3883 16.1049 28.2874 16.2023 28.1691 16.2745C28.0508 16.3466 27.9179 16.3916 27.7801 16.4062H27.6863C27.5634 16.4058 27.4417 16.3812 27.3283 16.3337C27.2149 16.2863 27.112 16.2169 27.0254 16.1297L24.6816 13.7859C24.5143 13.6083 24.4227 13.3725 24.4263 13.1284C24.43 12.8844 24.5285 12.6514 24.7011 12.4788C24.8737 12.3063 25.1067 12.2077 25.3507 12.2041C25.5947 12.2004 25.8306 12.292 26.0082 12.4594L26.5895 13.0453C25.5099 6.40125 19.2488 1.89094 12.6052 2.97047C5.96164 4.05 1.45039 10.3106 2.52992 16.9547C3.48851 22.8544 8.58429 27.1884 14.5613 27.1875C16.4188 27.2212 18.2568 26.8057 19.9193 25.9766C21.5817 25.1474 23.0193 23.929 24.1098 22.425C24.1812 22.3247 24.2716 22.2394 24.376 22.174C24.4804 22.1086 24.5966 22.0644 24.718 22.044C24.8395 22.0235 24.9638 22.0272 25.0838 22.0548C25.2038 22.0823 25.3172 22.1333 25.4176 22.2047C25.5179 22.2761 25.6032 22.3666 25.6686 22.4709C25.734 22.5753 25.7781 22.6915 25.7986 22.813C25.819 22.9344 25.8154 23.0587 25.7878 23.1787C25.7602 23.2987 25.7093 23.4122 25.6379 23.5125C24.3751 25.2612 22.7085 26.6791 20.78 27.6454C18.8515 28.6117 16.7181 29.0978 14.5613 29.0625C6.79461 29.0625 0.498823 22.7667 0.498823 15C0.498823 7.23328 6.79461 0.9375 14.5613 0.9375Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_3224_478">
                      <rect
                        width="30"
                        height="30"
                        fill="white"
                        transform="translate(0.5)"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <h2>Flexible Scheduling</h2>
              <p>
                Need a plumber at 7 AM or an electrician at 9 PM? Your time is
                valuable, that’s why we let you choose when our professionals
                arrive.
              </p>
            </div>
            <div className="feature-card-item">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="31"
                  height="30"
                  viewBox="0 0 31 30"
                  fill="none"
                >
                  <path
                    d="M15.5 13.4365C12.2263 13.4365 9.56375 10.774 9.56375 7.50021C9.56375 4.22646 12.2263 1.56396 15.5 1.56396C18.7738 1.56396 21.4363 4.22646 21.4363 7.50021C21.4363 10.774 18.7738 13.4365 15.5 13.4365ZM15.5 3.43896C13.2613 3.43896 11.4388 5.26146 11.4388 7.50021C11.4388 9.73896 13.2613 11.5615 15.5 11.5615C17.7388 11.5615 19.5613 9.73896 19.5613 7.50021C19.5613 5.26146 17.7388 3.43896 15.5 3.43896ZM15.5 28.4365C10.6175 28.4365 7.7375 27.8627 6.15875 26.5802C5.4275 25.984 4.96625 25.2302 4.745 24.2777C4.565 23.5015 4.565 22.6727 4.565 21.8777C4.565 20.0215 5.77625 18.319 7.97 17.0815C9.995 15.9415 12.6725 15.3152 15.5 15.3152C18.3313 15.3152 21.005 15.9415 23.03 17.0815C25.2275 18.319 26.435 20.0215 26.435 21.8777C26.435 22.6765 26.435 23.5015 26.255 24.2777C26.0338 25.234 25.5687 25.984 24.8412 26.5802C23.2625 27.8665 20.3825 28.4365 15.5 28.4365ZM15.5 17.1865C12.9875 17.1865 10.64 17.7302 8.88875 18.7127C7.31 19.6015 6.43625 20.7227 6.43625 21.874C6.43625 23.479 6.4775 24.424 7.34 25.1252C8.52875 26.0927 11.195 26.5615 15.4963 26.5615C19.7975 26.5615 22.4675 26.0927 23.6525 25.1252C24.515 24.424 24.5562 23.479 24.5562 21.874C24.5562 20.7265 23.6863 19.6015 22.1038 18.7127C20.36 17.7302 18.0125 17.1865 15.5 17.1865Z"
                    fill="white"
                  />
                </svg>
              </div>
              <h2>Professional Staff</h2>
              <p>
                Our service experts are thoroughly vetted, professionally
                trained, and committed to delivering quality with every task
              </p>
            </div>
            <div className="feature-card-item">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="31"
                  height="30"
                  viewBox="0 0 31 30"
                  fill="none"
                >
                  <path
                    d="M28.625 15.9376V23.4376C28.625 23.6862 28.5262 23.9247 28.3504 24.1005C28.1746 24.2763 27.9361 24.3751 27.6875 24.3751H20.1875C19.9389 24.3751 19.7004 24.2763 19.5246 24.1005C19.3488 23.9247 19.25 23.6862 19.25 23.4376C19.25 23.1889 19.3488 22.9505 19.5246 22.7746C19.7004 22.5988 19.9389 22.5001 20.1875 22.5001H25.4246L16.4375 13.513L12.4133 17.5384C12.3263 17.6256 12.2229 17.6948 12.109 17.742C11.9952 17.7892 11.8732 17.8135 11.75 17.8135C11.6268 17.8135 11.5048 17.7892 11.391 17.742C11.2771 17.6948 11.1737 17.6256 11.0867 17.5384L2.6492 9.10086C2.47328 8.92494 2.37445 8.68635 2.37445 8.43756C2.37445 8.18877 2.47328 7.95018 2.6492 7.77426C2.82512 7.59834 3.06371 7.49951 3.3125 7.49951C3.56128 7.49951 3.79988 7.59834 3.9758 7.77426L11.75 15.5497L15.7742 11.5243C15.8613 11.4371 15.9647 11.3679 16.0785 11.3208C16.1923 11.2736 16.3143 11.2493 16.4375 11.2493C16.5607 11.2493 16.6827 11.2736 16.7965 11.3208C16.9103 11.3679 17.0137 11.4371 17.1008 11.5243L26.75 21.1747V15.9376C26.75 15.6889 26.8488 15.4505 27.0246 15.2746C27.2004 15.0988 27.4389 15.0001 27.6875 15.0001C27.9361 15.0001 28.1746 15.0988 28.3504 15.2746C28.5262 15.4505 28.625 15.6889 28.625 15.9376Z"
                    fill="white"
                    stroke="white"
                    stroke-width="0.5"
                  />
                </svg>
              </div>
              <h2>Competitive Pricing</h2>
              <p>
                Get top-quality service without the premium price tag. We offer
                fair, upfront rates, no hidden charges and no surprises
              </p>
            </div>
          </div>
        </Container>
      </section>

      {Array.isArray(categories?.allCat) && categories?.allCat.length > 0 && (
        <section className="category-services-sec pt-0">
          <Container>
            <div className="category-services-lists">
              <div className="list-title">
                <h2>Browse by Category</h2>
                <Link to="/browse-category">
                  Explore More
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="21"
                    viewBox="0 0 20 21"
                    fill="none"
                  >
                    <path
                      d="M7.5 15.5L12.5 10.5L7.5 5.5"
                      stroke="#545454"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </Link>
              </div>

              <div className="category-list">
                {Array.isArray(categories?.allCat) &&
                  categories?.allCat.length > 0 &&
                  categories?.allCat.slice(0, 6)?.map((ele) => {
                    return (
                      <div key={ele._id}>
                        <>
                          <img
                            onClick={() => handleProfiles("category", ele._id)}
                            className="point-cursor"
                            src={`${process.env.REACT_APP_API_URL}/${ele?.image}`}
                            alt="categories-img"
                          />
                        </>
                        <p>{ele?.service_category_name}</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </Container>
        </section>
      )}
      {Array.isArray(nearByServices?.allCat) &&
        nearByServices?.allCat.length > 0 && (
          <section className="category-services-sec pt-0">
            <Container>
              <div className="category-services-lists">
                <div className="list-title">
                  <h2>Nearby Services</h2>
                  <Link to="/near-by-services">
                    Explore More
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                    >
                      <path
                        d="M7.5 15.5L12.5 10.5L7.5 5.5"
                        stroke="#545454"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
                <div className="services-list">
                  {Array.isArray(nearByServices?.allCat) &&
                    nearByServices?.allCat.length > 0 &&
                    nearByServices?.allCat.slice(0, 5).map((ele, index) => {
                      return (
                        <div key={index}>
                          {Array.isArray(ele?.images) &&
                            ele.images.length > 0 && (
                              <img
                                onClick={() =>
                                  handleProfiles("services", ele._id)
                                }
                                className="point-cursor"
                                src={`${process.env.REACT_APP_API_URL}/user/${ele?.images[0]}`}
                                alt="categories-img"
                              />
                            )}
                          <h3>{ele?.serviceSubCategoryName}</h3>
                          {/* <p>{ele?.desc}</p> */}
                          <ReadMore desc={ele?.desc} />
                        </div>
                      );
                    })}
                </div>
              </div>
            </Container>
          </section>
        )}

      <section className="get-started-sec">
        <Container>
          <div className="get-started-contain">
            <div className="left-side">
              <h2>Post a Task, Get It Done Quickly and Easily</h2>
              <p>
                Have a job that needs attention? Simply post your task, and let
                verified service providers come to you with their best quotes
              </p>
              <button onClick={() => handleNavigate()}>
                Post a Task
              </button>
            </div>
            <div className="right-side">
              <img src={require("../Assets/Images/get-started-img.png")} />
            </div>
          </div>
        </Container>
      </section>

      {Array.isArray(bestservices) && bestservices.length > 0 && (
        <section className="category-services-sec pt-0">
          <Container>
            <div className="category-services-lists">
              <div className="list-title">
                <h2>Most booked services</h2>
              </div>
              <div className="booked-services-slide">
                {bestservices.length > 5 ? (
                  <Slider {...settings}>
                    {bestservices.map((ele, index) => (
                      <div key={index}>
                        {Array.isArray(ele?.images) &&
                          ele.images.length > 0 && (
                            <img
                              onClick={() =>
                                handleProfiles("services", ele._id)
                              }
                              className="point-cursor"
                              src={`${process.env.REACT_APP_API_URL}/user/${ele?.images[0]}`}
                              alt="categories-img"
                            />
                          )}
                        <h3>{ele?.serviceSubCategoryName}</h3>
                        <p>{ele?.desc}</p>
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <div className="services-list">
                    {bestservices.map((ele, index) => (
                      <div key={index}>
                        {Array.isArray(ele?.images) &&
                          ele.images.length > 0 && (
                            <img
                              onClick={() =>
                                handleProfiles("services", ele._id)
                              }
                              className="point-cursor"
                              src={`${process.env.REACT_APP_API_URL}/user/${ele?.images[0]}`}
                              alt="categories-img"
                            />
                          )}
                        <h3>{ele?.serviceSubCategoryName}</h3>
                        <p>
                           <ReadMore desc={ele?.desc} />
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}

      <section className="category-services-sec pt-0">
        <Container>
          <div className="category-services-lists">
            <div className="list-title">
              <h2>Frequently Asked Questions</h2>
            </div>
            <div className="faq-sec-set">
              <Accordion defaultActiveKey="0">
                {uniqueFaqs?.map((faq, index) => (
                  <Accordion.Item eventKey={index.toString()} key={faq._id}>
                    <Accordion.Header>{faq.question}</Accordion.Header>
                    <Accordion.Body>
                      <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          </div>
        </Container>
      </section>
    </Layout>
  );
}
