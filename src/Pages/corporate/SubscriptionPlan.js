import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import Layout from "../../Components/Layout/Layout";
import checkIcon from "../../Assets/Images/status-check.svg";

function SubscriptionPlan() {
  const [activePlan, setActivePlan] = useState(null);

  const plans = [
    {
      id: "bronze",
      name: "Bronze plan",
      price: 50,
      details: ["300 Leads Responses", "No online shop linking"],
    },
    {
      id: "silver",
      name: "Silver plan",
      price: 100,
      details: ["700 Leads Responses", "Unlimited online shopping link"],
      popular: true,
    },
    {
      id: "gold",
      name: "Gold plan",
      price: 150,
      details: ["Unlimited Leads Responses", "Unlimited online shop linking"],
    },
  ];

  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <div className="bookings-details-title mb-4">
            <h2>Choose Your Plan</h2>
          </div>

          <Row className="g-4">
            {plans.map((plan) => (
              <Col md={4} key={plan.id}>
                <div
                  className={`plan-card ${
                    activePlan === plan.id
                      ? "active"
                      : plan.id === "silver"
                      ? "highlight"
                      : ""
                  }`}
                  onClick={() => setActivePlan(plan.id)}
                >
                  {plan.popular && <div className="popular-badge">Popular</div>}
                  <h6 className="plan-name">{plan.name}</h6>
                  <div className="plan-price">
                    <span className="currency">$</span>
                    <span className="amount">{plan.price}</span>
                    <span className="duration">/month</span>
                  </div>
                  <ul className="plan-features">
                  <div className="list-wrap">
                      {plan.details.map((feature, idx) => (
                      <li key={idx}>
                        <img src={checkIcon} className="check-icon"></img>
                        <i className="bi bi-check-circle-fill"></i> {feature}
                      </li>
                    ))}
                  </div>
                  </ul>
                  <button className="primaryBtn">Select Plan</button>
                </div>
              </Col>
            ))}
          </Row>
          {/* <div className="important-note card shadow-sm p-4 mt-5">
            <h5 className="fw-bold text-dark">Important Note!</h5>
            <p className="fw-semibold mb-2">Subscription Details</p>
            <ul className="mb-3">
              <li>
                <img src={checkIcon} alt="check" className="check-icon" />
                Once a Membership has been purchased, payment will be charged to
                your iTunes or Google Play account.
              </li>
              <li>
                <img src={checkIcon} alt="check" className="check-icon" />
                Your subscription will automatically renew unless auto-renewal
                is turned off at least 48 hours before the end of the current
                subscription period.
              </li>
              <li>
                <img src={checkIcon} alt="check" className="check-icon" />
                Your account will be charged for renewal within 48 hours prior
                to the end of the current subscription period.
              </li>
            </ul>
            <p>
              Please read our{" "}
              <a href="/terms-and-conditions" className="text-success fw-bold">
                Terms & Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy-policy" className="text-success fw-bold">
                Privacy Policy
              </a>{" "}
              for more information.
            </p>
          </div> */}
        </Container>
      </section>
    </Layout>
  );
}

export default SubscriptionPlan;
