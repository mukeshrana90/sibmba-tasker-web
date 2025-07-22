import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Tab, Nav } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../../../Components/Layout/Layout";
import CustomerActions from "../../../Redux/Actions/CustomerActions";
import ProductActions from "../../../Redux/Actions/ProductActions";

export default function CorporateProducts() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const dropdownRefs = useRef({});

    const [dropdownStates, setDropdownStates] = useState({});
  const { items: myProducts, loading, error } = useSelector((state) => state.products);
console.log(myProducts, 'myProducts');

useEffect(() => {
  dispatch(ProductActions.fetchProducts()); 
}, [dispatch]);
    const handleServiceClick = (serviceId) => {
        navigate(`/service-details/${serviceId}`);
    };

    const handleAddService = () => {
        navigate("/corporate/products/add");
    };

    const handleButtonClick = (id) => {
      setDropdownStates((prev) => ({
        ...prev,
        [id]: !prev[id], 
      }));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            let shouldCloseAll = true;
            Object.values(dropdownRefs.current).forEach((ref) => {
                if (ref && ref.contains(event.target)) {
                    shouldCloseAll = false;
                }
            });
            if (shouldCloseAll) {
                setDropdownStates((prev) => {
                    let newStates = { ...prev };
                    Object.keys(newStates).forEach((key) => {
                        newStates[key] = false;
                    });
                    return newStates;
                });
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
      <Layout>
        <section className="search-results-sec">
          <Container>
            <Row>
              <Col lg={12}>
                <div className="search-results-contain">
                  <div className="services-secs d-flex justify-content-between align-items-center mb-3 px-1">
                    <h2 className="mb-1">Products</h2>
                    <button className="service-btn mt-5" onClick={handleAddService}>
                      + Add Product
                    </button>
                  </div>

                  <div className="bookings-tabs">
                    <Tab.Container
                      id="left-tabs-example"
                      defaultActiveKey="first"
                    >
                      <Row>
                        <Col sm={12}>
                          <Tab.Content>
                            <Tab.Pane eventKey="first">
                              {error && <p className="text-danger">{error}</p>}
                              {!loading &&
                                !error &&
                                myProducts?.length === 0 && (
                                  <p>No services available.</p>
                                )}
                              {!loading && myProducts?.length > 0 && (
                                <div className="bookings-cards">
                                  <ul className="list-unstyled">
                                    {myProducts?.map((item) => (
                                      <li key={item._id}>
                                        <div className="bookings-card-item">
                                          <img
                                            src={
                                              item.images?.length
                                                ? `${process.env.REACT_APP_API_URL}/${item?.images[0]}`
                                                : ""
                                            }
                                            alt={""}
                                            onClick={() =>
                                              handleServiceClick(item?._id)
                                            }
                                            style={{
                                              cursor: "pointer",
                                              maxWidth: "200px",
                                            }}
                                          />
                                          <div className="bookings-card-data my-task-ad-card">
                                            <div>
                                              <h3 className="text-capitalize">
                                                {item.name ||
                                                  "N/A"}
                                              </h3>
                                              <p>
                                                {" "}
                                                {item?.category.service_category_name
                                                   ||
                                                  "N/A"}{" "}
                                              </p>
                                              <span>
                                                {item.description ||
                                                  "No description available."}
                                              </span>
                                            </div>
                                            <div
                                              className="chat-btn-card"
                                              style={{ position: "relative" }}
                                              ref={(el) =>
                                                (dropdownRefs.current[
                                                  item._id
                                                ] = el)
                                              }
                                            >
                                              <button
                                                className="btn"
                                                onClick={() =>
                                                  handleButtonClick(
                                                    item?._id
                                                  )
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
                                              {dropdownStates[item._id] && (
                                                <div
                                                  style={{
                                                    position: "absolute",
                                                    top: "100%",
                                                    left: "0",
                                                    background: "#fff",
                                                    border: "1px solid #ccc",
                                                    borderRadius: "5px",
                                                    boxShadow:
                                                      "0 2px 5px rgba(0,0,0,0.2)",
                                                    padding: "5px 0",
                                                    zIndex: 10,
                                                    maxWidth: "48px",
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
                                                    onClick={() => {
                                                      navigate(
                                                        `/corporate/products/edit?id=${item?._id}`
                                                      );
                                                    }}
                                                  >
                                                    Edit Product
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </Tab.Pane>
                          </Tab.Content>
                        </Col>
                      </Row>
                    </Tab.Container>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </section>
      </Layout>
    );
}