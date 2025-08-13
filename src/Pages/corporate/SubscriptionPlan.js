import React, { useEffect, useState } from "react";
import { Container, Row, Col, Modal } from "react-bootstrap";
import Layout from "../../Components/Layout/Layout";
import checkIcon from "../../Assets/Images/status-check.svg";
import darkCheckIcon from "../../Assets/Images/dark-status-check.svg";
import { useDispatch } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { setCustomer } from "../../Redux/Reducers/LoginSlice";
import Loader from "../../CommanComponents/Loader";
function SubscriptionPlan() {
  const [activePlan, setActivePlan] = useState(null);
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoader, setLoader] = useState(false);

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
    setLoader(true);
    try {
      const payload = {
        title: item.name,
        amount: item.price,
      };
      let res = await dispatch(CustomerActions.createCheckoutSession(payload));
      if (res && res.payload) {
        window.open(res.payload.url, "_blank");
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        const apiRes = await dispatch(
          CustomerActions.getProfileWithSuscription()
        );
        if (apiRes?.payload?.success) {
          dispatch(setCustomer(apiRes?.payload?.data.user));
          const profileData = apiRes?.payload?.data;
          setActivePlan(profileData?.subscriptionDetail);
        }
      }
    };

    fetchProfile();
  }, [token, dispatch]);

  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <div className="bookings-details-title mb-4">
            <h2>Choose Your Plan</h2>
          </div>
        {isLoader ? (
          <Loader />
        ) : (
          <Row className="g-4">
            {plans.map((plan) => {
              const isActivePlan =
                activePlan?.subscriptionPlan?.split(" ")[0]?.toLowerCase() ===
                plan?.name?.split(" ")[0]?.toLowerCase();
              return (
                <Col md={4} key={plan.id}>
                  <div
                    className={`plan-card ${
                      isActivePlan && activePlan?.status === "active"
                        ? "highlight"
                        : ""
                    }`}
                  >
                    {plan.popular && (
                      <div className="popular-badge">Popular</div>
                    )}
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
                                isActivePlan &&
                                activePlan?.status === "active"
                                  ? darkCheckIcon
                                  : checkIcon
                              }
                              className="check-icon"
                            />
                            <i className="bi bi-check-circle-fill"></i>
                            {feature}
                          </li>
                        ))}
                      </div>
                    </ul>

                    {(!isActivePlan || activePlan?.status !== "active") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlan(plan);
                          if (activePlan?.status !== "active") {
                            handlePay(plan);
                          } else {
                            setShowPlanModal(true);
                          }
                        }}
                        className="cursor-pointer primaryBtn"
                      >
                        Purchase
                      </button>
                    )}
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
          <Modal
            show={showPlanModal}
            onHide={() => setShowPlanModal(false)}
            centered
          >
            <Modal.Body>
              <div className="comman-small-pop">
                <h3 className="mb-3">Are you sure?</h3>

                <p>
                  You are about to purchase the{" "}
                  <strong>{selectedPlan?.name}</strong> plan for $
                  {selectedPlan?.price}/month.
                </p>

                {activePlan?.subscriptionPlan && (
                  <p className="mt-2 text-warning">
                    Your current plan is{" "}
                    <strong>{activePlan.subscriptionPlan}</strong>. Purchasing a
                    new plan will expire your current package.
                  </p>
                )}

                <div className="comman-pop-action-double logout-action mt-3">
                  <button
                    className="primaryBtn"
                    onClick={() => {
                      if (selectedPlan) handlePay(selectedPlan);
                      setShowPlanModal(false);
                    }}
                  >
                    Yes, Purchase
                  </button>
                  <button
                    className="view-more-btn"
                    onClick={() => setShowPlanModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Modal.Body>
          </Modal>
        </Container>
      </section>
    </Layout>
  );
}

export default SubscriptionPlan;
