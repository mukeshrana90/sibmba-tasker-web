import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Tab } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Layout from "../Components/Layout/Layout";
import ServiceActions from "../Redux/Actions/ServiceActions";
import {
  formatDisplayTitle,
  handleCategoryImageError,
  serviceImageUrl,
} from "../utils/landingUtils";

export default function ServiceProCategory() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const dropdownRefs = useRef({});

    const [, setDropdownStates] = useState({});

    const { id } = useParams()

    const myservices = useSelector((e) => e.service.getServiceProviderCategory)

    useEffect(() => {
        dispatch(ServiceActions.getServiceProviderByCategory({ categoryId: id }))
    }, [dispatch, id])

    const handleServiceClick = (id) => {
        navigate(`/serviceprocategorydetail/${id}`);
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
                  <div className=" services-secs d-flex justify-content-between align-items-center mb-3 px-1">
                    <h2 className="mb-1">{myservices?.length > 0 ? formatDisplayTitle(myservices[0]?.serviceCategoryId?.service_category_name) : "No Services Found"}</h2>
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
          
                              {
                                
                                myservices?.length === 0 && (
                                  <p>No Data Found</p>
                                )}
                              { myservices?.length > 0 && (
                                <div className="bookings-cards">
                                  <ul className="list-unstyled">
                                    {myservices?.map((service) => (
                                      <li key={service._id}>
                                        <div className="bookings-card-item">
                                          <img
                                            src={
                                              service?.images?.length
                                                ? serviceImageUrl(service?.images[0])
                                                : ""
                                            }
                                            alt={""}
                                            onError={handleCategoryImageError}
                                            onClick={() =>
                                              handleServiceClick(service?._id)
                                            }
                                            style={{
                                              cursor: "pointer",
                                              maxWidth: "200px",
                                            }}
                                          />
                                          <div className="bookings-card-data my-task-ad-card">
                                            <div>
                                              <h3>
                                                {service?.serviceProviderId?.company_name !== 'undefined' ? service?.serviceProviderId?.company_name  : '-' ||
                                                  "N/A"}
                                              </h3>
                                              <p>
                                                {" "}
                                                {service?.serviceProviderId
                                                  ?.full_name ||
                                                  "N/A"}{" "}
                                              </p>
                                              <span>
                                                {service.desc ||
                                                  "No description available."}
                                              </span>
                                            </div>
                                            <div
                                              className="chat-btn-card"
                                              style={{ position: "relative" }}
                                              ref={(el) =>
                                                (dropdownRefs.current[
                                                  service._id
                                                ] = el)
                                              }
                                            >
                                        
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