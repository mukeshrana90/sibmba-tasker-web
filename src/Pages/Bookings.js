import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Accordion from "react-bootstrap/Accordion";
import Slider from "react-slick";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import BookingListCard from "../CommanComponents/BookingListCard";
import CustomerBookServiceModal from "../CommanComponents/Modals/CustomerBookServiceModal";

export default function Bookings() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [boookingId, setBookingId] = useState(null);
  const [selectedBoooking, setSelectedBoooking] = useState(null);
  const dispatch = useDispatch();
  const [bookingList, setBookingList] = useState([]);

  useEffect(() => {
    dispatch(CustomerActions.getAllBookingList({ status: 1 })).then((res) => {
      if (res?.payload?.success) {
        setBookingList(res?.payload?.data);
      }
    });
  }, [show]);

  console.log("bookingList", bookingList);

console.log(bookingList, "bookingList")


  const handleOpen = (id) => {
    setShow(true)
    setBookingId(id)
  }
  const handleClose = (id) => {
    setShow(false)
    setBookingId("")
  }




  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain">
                <h2>Bookings</h2>
                <div className="bookings-tabs">
                  <Tab.Container
                    id="left-tabs-example"
                    defaultActiveKey="first"
                  >
                    <Row>
                      <Col sm={12}>
                        <Nav variant="pills" className="bookings-tab-nav mb-4">
                          <Nav.Item>
                            <Nav.Link eventKey="first" className="">
                              Upcoming
                            </Nav.Link>
                          </Nav.Item>
                          <Nav.Item>
                            <Nav.Link eventKey="second">History</Nav.Link>
                          </Nav.Item>
                        </Nav>
                      </Col>
                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="first">
                            <div className="bookings-cards">
                              <ul>
                                {Array.isArray(bookingList) &&
                                 [...bookingList]?.reverse()?.map((res) => {
                                    return (
                                      <>
                                        <BookingListCard data={res} handleOpen={handleOpen} setSelectedBoooking={setSelectedBoooking} />
                                      </>
                                    );
                                  })}
                              </ul>
                            </div>

                            {bookingList?.length === 0 && (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  fill="none"
                                >
                                  <path
                                    d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                    fill="#CCCCCC"
                                  />
                                  <path
                                    d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                    fill="#CCCCCC"
                                  />
                                </svg>
                                <h3>No Upcoming Bookings</h3>
                                <p>
                                  You don’t have any upcoming booking.
                                  <br /> Place & Track your bookings here.
                                </p>
                                <button onClick={() => navigate("/services")}>
                                  View all services
                                </button>
                              </div>
                            )}
                          </Tab.Pane>
                          <Tab.Pane eventKey="second">
                            <div className="bookings-cards">
                              <ul>
                                {Array.isArray(bookingList) &&
                                  [...bookingList]?.reverse()?.filter((res) => res.status === 4)?.map((res) => (
                                      <BookingListCard
                                        key={res.id} // add a unique key here if available
                                        data={res}
                                        handleOpen={handleOpen}
                                        setSelectedBoooking={setSelectedBoooking}
                                      />
                                    ))}
                              </ul>

                            </div>
                            { [...bookingList]?.reverse()?.filter((res) => res.status === 4)?.length === 0 &&
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  fill="none"
                                >
                                  <path
                                    d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                    fill="#CCCCCC"
                                  />
                                  <path
                                    d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                    fill="#CCCCCC"
                                  />
                                </svg>
                                <h3>No Past Bookings</h3>
                                <p>
                                  You don’t have any past booking.
                                  <br /> Place & Track your bookings here.
                                </p>
                                <button onClick={() => navigate("/services")}>
                                  View all services
                                </button>
                              </div>}
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
      <CustomerBookServiceModal
        show={show}
        setShow={handleClose}
        service_id={boookingId}
        data={selectedBoooking}

      />
    </Layout>
  );
}
