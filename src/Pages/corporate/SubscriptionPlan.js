import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import Layout from "../../Components/Layout/Layout";
import checkIcon from "../../Assets/Images/status-check.svg";
import darkCheckIcon from "../../Assets/Images/dark-status-check.svg";
import { useDispatch } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";

function SubscriptionPlan() {
  const [activePlan, setActivePlan] = useState(null);
  const dispatch = useDispatch();

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

  const handlePay = async (item) => {
    try {
      const payload = {
        title: item.name,
        amount: item.price,
      };
      let res = await dispatch(CustomerActions.createCheckoutSession(payload));
      if (res && res.payload) {
        window.open(res.payload.url, "_blank");
      }
    } catch (error) {}
  };

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
                    activePlan === plan.id ? "highlight" : ""
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
                          <img
                            src={
                              activePlan === plan.id ? darkCheckIcon : checkIcon
                            }
                            className="check-icon"
                          ></img>
                          <i className="bi bi-check-circle-fill"></i> {feature}
                        </li>
                      ))}
                    </div>
                  </ul>
                  <button
                    type="button" 
                    onClick={() => handlePay(plan)}
                    className={`cursor-pointer ${
                      activePlan === plan.id ? "view-more-btn" : "primaryBtn"
                    }`}
                  >
                    Select Plan
                  </button>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>
    </Layout>
  );
}

export default SubscriptionPlan;
