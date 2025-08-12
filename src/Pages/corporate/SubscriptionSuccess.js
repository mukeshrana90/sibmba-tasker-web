import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Navigate, useParams } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { Card, Col, Container, Row } from "react-bootstrap";
import successLogo from "../../Assets/Images/dark-logo.png";

const SubscriptionSuccess = () => {
  const { transactionId } = useParams();
  const dispatch = useDispatch();
  const [planData, setPlanData] = useState({});

  useEffect(() => {
    if (transactionId) {
      handleStatusChange();
    }
  }, [transactionId]);

  const handleStatusChange = async () => {
    try {
      let res = await dispatch(
        CustomerActions.updateSubscriptionPaymentStatus(transactionId)
      );
      if (res && res.payload) {
        setPlanData(res.payload?.data);
        setTimeout(() => Navigate("/"), 8000);
      }
    } catch (error) {}
  };

  return (
    <section className="payment-success-section py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card className="text-center shadow-sm p-4 success-card">
              <div className="success-icon-wrap mb-3">
                <img
                  src={successLogo}
                  alt="Payment Success"
                  className="success-icon"
                />
              </div>

              <div className="main-container mt-3">
                <h3>Thank You</h3>
                <h5>Payment Successfully </h5>
                <div className="payment-sucess-img">
                  <svg
                    width="128"
                    height="128"
                    viewBox="0 0 128 128"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="64" cy="64" r="64" fill="#3BAD45" />
                    <path
                      d="M88.4425 51.9474C88.0443 52.5826 87.5125 53.1293 86.9657 53.6756C77.9935 62.6399 69.032 71.615 60.0738 80.5935C59.1151 81.5544 58.0163 82.1026 56.6313 81.984C55.6277 81.8981 54.7975 81.4545 54.0991 80.7563C49.4816 76.1406 44.8538 71.5353 40.2623 66.8939C38.2003 64.8095 38.7434 61.658 41.3166 60.3968C42.8437 59.6483 44.622 60.0191 45.9905 61.387C49.5141 64.9092 53.0339 68.435 56.5519 71.9626C56.6889 72.0999 56.7923 72.2708 56.9327 72.4538C57.1479 72.2502 57.2877 72.1244 57.4206 71.9915C65.6135 63.7905 73.8076 55.5906 81.996 47.3851C82.8875 46.4919 83.9068 45.9481 85.2018 46.0039C86.9143 46.0778 88.3408 47.1828 88.8319 48.8314C89.1454 49.8786 89.023 51.0215 88.4425 51.9474Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>
              <hr />
              <p className="small text-muted">
                You have successfully subscribed to the{" "}
                <strong>{planData?.subscriptionPlan}</strong>.
              </p>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default SubscriptionSuccess;
