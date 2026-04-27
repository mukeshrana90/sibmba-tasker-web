import React, { useEffect, useState } from "react";
import { Container, Row, Col, Nav, Tab } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import Layout from "../Components/Layout/Layout";
import CustomerActions from "../Redux/Actions/CustomerActions";
import BookingListCard from "../CommanComponents/BookingListCard";
import CustomerBookServiceModal from "../CommanComponents/Modals/CustomerBookServiceModal";
import moment from "moment";
import imageDefault from "../Assets/Images/placeholder.jpg";
import {
  getBookingFlowDescription,
  bookingStatus,
  taskStatus,
} from "../utils/jobFlowStatus";

export default function Bookings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookingList, setBookingList] = useState([]);
  const [bookingTypeView, setBookingTypeView] = useState("service");
  const [show, setShow] = useState(false);
  const [boookingId, setBookingId] = useState(null);
  const [selectedBoooking, setSelectedBoooking] = useState(null);
  const getStatusColor = (status) => {
    const statusMap = {
      1: "pending",
      2: "cancelled",
      3: "completed",
      4: "in-progress",
      5: "cancelled",
    };

    return statusMap[status] || "N/A";
  };
  useEffect(() => {
    const status = activeTab === "past" ? 4 : null;

    dispatch(CustomerActions.getAllBookingList({ status })).then((res) => {
      if (res?.payload?.success) {
        setBookingList(res.payload.data || []);
      }
    });
  }, [activeTab, show, dispatch]);

  useEffect(() => {
    setBookingTypeView("service");
  }, [activeTab]);

  const handleOpen = (id, bookingData) => {
    setShow(true);
    setBookingId(id);
    setSelectedBoooking(bookingData);
  };

  const handleClose = () => {
    setShow(false);
    setBookingId(null);
    setSelectedBoooking(null);
  };
  const getStatusLabel = (status) => {
    switch (status) {
      case 1:
        return "Pending";
      case 2:
        return "Cancelled";
      case 3:
        return "Completed";
      case 4:
        return "In Progress";
      case 5:
        return "Cancelled";
      default:
        return "Unknown";
    }
  };


  const renderBookingList = (list) => {
    if (!list.length) {
      return (
        <div className="no-upcoming-bookings text-center">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* SVG omitted for brevity */}
          </svg>
          <h3>
            No{" "}
            {activeTab === "upcoming"
              ? "Upcoming"
              : "Past"}{" "}
            Bookings
          </h3>
          <p>
            You don’t have any{" "}
            {activeTab === "upcoming"
              ? "upcoming"
              : "past"}{" "}
            booking.
            <br /> Place & Track your bookings here.
          </p>
          <button onClick={() => navigate("/services")}>
            View all services
          </button>
        </div>
      );
    }

    const byLatest = (a, b) => {
      const aTime = new Date(a?.createdAt || a?.updatedAt || a?.date || 0).getTime();
      const bTime = new Date(b?.createdAt || b?.updatedAt || b?.date || 0).getTime();
      return bTime - aTime;
    };

    const serviceBookings = list
      .filter((item) => item.type === "booking")
      .sort(byLatest);
    const taskBookings = list
      .filter((item) => item.type === "task")
      .sort(byLatest);

    const hasServiceBookings = serviceBookings.length > 0;
    const hasTaskBookings = taskBookings.length > 0;

    const selectedView = bookingTypeView;

    return (
      <>
        {(hasServiceBookings || hasTaskBookings) && (
          <div className="bookings-type-toggle-row">
            <div className="bookings-type-toggle" role="tablist" aria-label="Booking type view">
              <button
                type="button"
                className={`bookings-type-toggle-btn ${
                  selectedView === "service" ? "active" : ""
                }`}
                onClick={() => setBookingTypeView("service")}
              >
                Service Bookings
              </button>
              <button
                type="button"
                className={`bookings-type-toggle-btn ${
                  selectedView === "task" ? "active" : ""
                }`}
                onClick={() => setBookingTypeView("task")}
              >
                Task Bookings
              </button>
            </div>
          </div>
        )}

        {selectedView === "service" && (
          <>
            <h5 className="mb-3 mt-3">Service Bookings</h5>
            {hasServiceBookings ? (
              <ul>
                {serviceBookings.map((res) => (
                  <BookingListCard
                    key={res.id}
                    data={res}
                    handleOpen={() => handleOpen(res.id, res)}
                    setSelectedBoooking={setSelectedBoooking}
                  />
                ))}
              </ul>
            ) : (
              <p className="mb-3">No Service Bookings</p>
            )}
          </>
        )}

        {selectedView === "task" && (
          <>
            <h5 className="mb-3 mt-4">Task Bookings</h5>
            {hasTaskBookings ? (
              <ul className="task-booking-list">
                {taskBookings.map((data) => {
                const provider =
                  data.serviceProvider || data.serviceProviderId || {};
                const imgBase = process.env.REACT_APP_API_URL || "";
                const taskNumericStatus = Number(data?.status);
                const showTaskEditButton =
                  taskNumericStatus === taskStatus.PENDING ||
                  taskNumericStatus === taskStatus.ACCEPTED;
                const isTaskEditable = taskNumericStatus === taskStatus.PENDING;

                return (
                  <li key={data._id} className="task-card">
                    <div
                      className="bookings-card-item"
                      onClick={() =>
                        navigate(`/user-booking-detail/${data._id}`, {
                          state: { type: data.type }, 
                        })
                      }
                    >
                      { (
                        <img
                          src={Array.isArray(data?.images) && data.images[0]
                              ? `${process.env.REACT_APP_API_URLL}${data.images[0]}`
                              : imageDefault
                          }
                          alt="task-img-0"
                          className="task-thumb"
                        />
                      )}
                      <div className="bookings-card-data">
                        <div>
                          <div className="">
                            <h3 className="text-transform">{data.need_done || "N/A"}</h3>
                            <p>
                              {`${data.task_time}, ${moment(data?.date).format(
                                "DD MMM"
                              )}`}
                            </p>
                          </div>
                          {/* Pending/Accepted: accepted shows disabled edit */}
                          {showTaskEditButton && (
                            <div className="bookings-card-edit">
                              <button
                                type="button"
                                disabled={!isTaskEditable}
                                title={
                                  isTaskEditable
                                    ? "Edit task"
                                    : "Task already accepted, editing disabled"
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isTaskEditable) return;
                                  navigate(`/edit-task/${data?._id}`);
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                          {/* confirmed */}
                          {(data?.status === 2 || data?.status === 3) && (
                            <div
                              className="provider-view-pro"
                              // onClick={() => navigate("/service-provider")}
                            >
                              <img
                                src={data?.serviceProvider?.profile_image ? `${process.env.REACT_APP_API_URL}/${data?.serviceProvider?.profile_image}` : imageDefault}
                                alt="categories-img"
                              />
                              <div>
                                <h5>{data?.serviceProvider?.full_name}</h5>
                                <p>{data?.serviceProvider?.suburbs !== 'undefined' ? data?.serviceProvider?.suburbs : '-'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div>
                          <span className={`corporate_inner ${getStatusColor(data?.status)}`}>
                            {getStatusLabel(data?.status)}
                          </span>
                        </div>

                        {(data?.status === 2 || data?.status === 3) && (
                          <div className="chat-btn-card mt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const receiverId =
                                  data?.serviceProvider?._id ||
                                  data?.serviceProviderId?._id;
                                if (!receiverId) return;
                                localStorage.setItem("reciverID", receiverId);
                                navigate(`/messages?userID=${receiverId}`);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="40"
                                height="40"
                                viewBox="0 0 40 40"
                                fill="none"
                              >
                                <path
                                  d="M13.8089 0.0330579C16.6576 -0.155486 19.5652 0.463174 22.0556 1.87136C26.3494 4.30476 29.2569 9.03015 29.5036 13.9735C29.7503 18.9169 27.3303 23.9075 23.3009 26.7651C19.2715 29.6227 13.7677 30.2414 9.2097 28.3559C8.59296 28.1026 7.91747 27.8021 7.29485 28.0319C6.97179 28.1497 6.71922 28.4031 6.4549 28.6211C4.92185 29.8938 2.71919 30.318 0.82196 29.7052C1.55618 27.8728 2.09069 25.9166 1.96734 23.9487C1.90273 22.9412 1.67365 21.9513 1.39171 20.9791C1.10977 19.9952 0.77497 19.0289 0.504776 18.039C0.240457 17.0845 0.0290018 16.1006 0.00550674 15.1048C-0.0062408 14.6335 -0.0121151 14.0973 0.128855 13.6436C0.187593 13.4433 0.187593 13.2135 0.211088 13.0014C0.240457 12.7775 0.269823 12.5536 0.305066 12.3356C0.45191 11.4459 0.686861 10.5739 0.998171 9.7313C1.30948 8.88874 1.69715 8.06976 2.14943 7.29201C2.60171 6.51427 3.12448 5.77777 3.71185 5.09429C4.29336 4.41082 4.93947 3.77448 5.63257 3.20885C6.32568 2.64322 7.07752 2.1365 7.88223 1.70639C9.7031 0.728315 11.7413 0.168574 13.8089 0.0330579ZM24.7928 14.7749C24.7987 13.6024 23.8413 12.6302 22.6724 12.6243C21.5035 12.6184 20.5343 13.5788 20.5226 14.7454C20.5108 15.9061 21.48 16.8901 22.643 16.896C23.8119 16.9137 24.7869 15.9474 24.7928 14.7749ZM16.9337 14.7749C16.9396 13.5906 15.9998 12.6302 14.825 12.6243C13.6503 12.6184 12.6928 13.5611 12.687 14.7454C12.6752 15.9238 13.6268 16.8901 14.7957 16.896C15.9645 16.9137 16.9278 15.9533 16.9337 14.7749ZM4.83374 14.7454C4.82787 15.9238 5.76767 16.8901 6.94243 16.9019C8.11131 16.9137 9.0746 15.9592 9.08048 14.7808C9.09223 13.6024 8.14655 12.6361 6.97179 12.6302C5.79704 12.6184 4.83961 13.567 4.83374 14.7454Z"
                                  fill="#252525"
                                />
                                <path
                                  d="M40 25.4453C39.8825 26.1995 39.812 26.9713 39.6299 27.7137C39.3304 28.9392 38.931 30.1353 38.6079 31.355C37.8796 34.0948 38.0734 36.7697 39.207 39.374C39.2482 39.4683 39.2834 39.5625 39.3304 39.7039C38.5198 39.9868 37.7034 40.0516 36.8751 39.9632C35.4889 39.8159 34.2731 39.2738 33.251 38.3193C32.7165 37.8185 32.1526 37.789 31.4948 38.0895C25.3508 40.8882 18.2906 39.2797 13.9557 34.083C13.4329 33.4584 12.9924 32.7691 12.4579 32.0267C18.361 32.5923 23.4066 30.972 27.436 26.7121C31.4595 22.458 32.8164 17.332 31.9588 11.5343C32.0763 11.5814 32.1703 11.605 32.2525 11.6521C36.5169 14.0148 39.0778 17.5853 39.8473 22.4286C39.8943 22.735 39.9413 23.0413 39.9882 23.3477C40 24.0371 40 24.7441 40 25.4453Z"
                                  fill="#252525"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
                })}
              </ul>
            ) : (
              <p className="mb-3">No Task Bookings</p>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain">
                <h2>Bookings</h2>
                <Tab.Container
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                >
                  <Nav variant="pills" className="bookings-tab-nav mb-4">
                    <Nav.Item>
                      <Nav.Link eventKey="upcoming">Upcoming</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="past">History</Nav.Link>
                    </Nav.Item>
                  </Nav>

                  <Tab.Content>
                    <Tab.Pane eventKey="upcoming">
                      <div className="bookings-cards">
                        {renderBookingList(bookingList)}
                      </div>
                    </Tab.Pane>
                    <Tab.Pane eventKey="past">
                      <div className="bookings-cards">
                        {renderBookingList(bookingList)}
                      </div>
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <CustomerBookServiceModal
        show={show}
        setShow={handleClose}
        service_id={boookingId}
        data={selectedBoooking}
      />
    </Layout>
  );
}
