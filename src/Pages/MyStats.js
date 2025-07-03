import { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import EarningsIcon from '../Assets/Images/stats/Earnings.svg';
import RejectedBookingsIcon  from '../Assets/Images/stats/RejectedBookings.svg';
import TotalFeedbackIcon  from '../Assets/Images/stats/TotalFeedback.svg';
import TotalBookingsIcon  from '../Assets/Images/stats/TotalBookings.svg';
import CompletedBookingsIcon  from '../Assets/Images/stats/CompletedBookings.svg';
import PublishedIcon  from '../Assets/Images/stats/Published.svg';

export default function MyStats() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const statsDetail = useSelector((e) => e.UserSlice.statsListData) || {
    bookingsCount: 27,
    completeBookingsCount: 5,
    rejectBookingsCount: 8,
    totalFeedbacksCount: 4,
    totalFeedbacksPublishedCount: 3,
    myearnings: 0
  };

  useEffect(() => {
    dispatch(CustomerActions.statsListing());
  }, [dispatch]);


  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title">
                <h2>My Stats</h2>
              </div>
              <div className="my-stats-cards">
                <div className="my-stats-item">
                  <div>
                    <h3>Total Bookings</h3>
                   <div className="stats-icon">
                     <img src={TotalBookingsIcon}></img>
                   </div>
                  </div>
                  <h4>{statsDetail.bookingsCount}</h4>
                  <p>Total Bookings</p>
                </div>
                <div className="my-stats-item">
                  <div>
                    <h3>Completed Bookings</h3>
                     <div className="stats-icon">
                     <img src={CompletedBookingsIcon}></img>
                   </div>
                  </div>
                  <h4>{statsDetail.completeBookingsCount}</h4>
                  <p>Completed Bookings</p>
                </div>
                <div className="my-stats-item">
                  <div>
                    <h3>Rejected Bookings</h3>
                    <div className="stats-icon">
                    <img src={RejectedBookingsIcon}></img>
                    </div>
                  </div>
                  <h4>{statsDetail.rejectBookingsCount}</h4>
                  <p>Rejected Bookings</p>
                </div>
                <div className="my-stats-item">
                  <div>
                    <h3>Total Feedback</h3>
                    <div className="stats-icon">
                     <img src={TotalFeedbackIcon}></img>
                   </div>
                  </div>
                  <h4>{statsDetail.totalFeedbacksCount}</h4>
                  <p>Total Feedback</p>
                </div>
                <div className="my-stats-item">
                  <div>
                    <h3>Published Feedback</h3>
                    <div className="stats-icon">
                     <img src={PublishedIcon}></img>
                   </div>
                  </div>
                  <h4>{statsDetail.totalFeedbacksPublishedCount}</h4>
                  <p>Published Feedback</p>
                </div>
                <div className="my-stats-item">
                  <div>
                    <h3>My Earnings</h3>
                  <div className="stats-icon">
                    <img src={EarningsIcon}></img>
                    </div>
                  </div>
                  <h4>${statsDetail.myearnings}</h4>
                  <p>My Earnings</p>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}