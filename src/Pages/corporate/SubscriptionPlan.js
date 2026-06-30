import React, { useEffect, useState } from "react";
import { Row, Col, Modal } from "react-bootstrap";
import CorporatePageShell from "../../CommanComponents/CorporatePageShell";
import checkIcon from "../../Assets/Images/status-check.svg";
import darkCheckIcon from "../../Assets/Images/dark-status-check.svg";
import { useDispatch } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { setCustomer } from "../../Redux/Reducers/LoginSlice";
import Loader from "../../CommanComponents/Loader";
import { useLocation, useNavigate } from "react-router-dom";
function SubscriptionPlan() {
  const [activePlan, setActivePlan] = useState(null);
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoader, setLoader] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isSignup = searchParams.get("type") === "free";
  const navigate = useNavigate();

  let plans = [
    {
      id: "bronze",
      name: "Bronze Package",
      price: 50,
      details: ["300 Leads Responses", "No online shop linking"],
    },
    {
      id: "silver",
      name: "Silver Package",
      price: 100,
      details: ["700 Leads Responses", "Unlimited online shop linking"],
      popular: true,
    },
    {
      id: "gold",
      name: "Gold Package",
      price: 150,
      details: ["Unlimited Leads Responses", "Unlimited online shop linking"],
    },
  ];
  if (isSignup) {
    plans = [
      {
        id: "free",
        name: "Free Plan",
        price: 0,
        details: ["Continue with 90-Day Free Plan"],
      },
      ...plans,
    ];
  }

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
    <CorporatePageShell title="Choose Your Plan" crumbLabel="Subscription">
          {isLoader ? (
            <Loader />
          ) : (
            <Row className="g-4 corp-subscription-plans">
              {plans.map((plan) => {
                const isActivePlan =
                  activePlan?.subscriptionPlan?.split(" ")[0]?.toLowerCase() ===
                  plan?.name?.split(" ")[0]?.toLowerCase();
                const isCurrentActive =
                  isActivePlan && activePlan?.status === "active";
                return (
                  <Col
                    md={isSignup ? 3 : 4}
                    key={plan.id}
                    className="d-flex"
                  >
                    <div
                      className={`plan-card corp-plan-card ${
                        isCurrentActive ? "highlight" : ""
                      } ${plan.popular ? "is-popular" : ""}`}
                    >
                      {plan.popular && (
                        <div className="popular-badge">Popular</div>
                      )}
                      <div className="plan-card__body">
                        <h6 className="plan-name">{plan.name}</h6>
                        <div className="plan-price">
                          <span className="currency">$</span>
                          <span className="amount">{plan.price}</span>
                          <span className="duration">/month</span>
                        </div>
                        <ul className="plan-features">
                          {plan.details.map((feature, idx) => (
                            <li key={idx}>
                              <img
                                src={isCurrentActive ? darkCheckIcon : checkIcon}
                                alt=""
                                className="check-icon"
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="plan-card__footer">
                        {plan.price === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              navigate("/corporate", { replace: true });
                            }}
                            className="cursor-pointer primaryBtn"
                          >
                            Try For Free
                          </button>
                        )}

                        {plan.price !== 0 && !isCurrentActive && (
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

                        {plan.price !== 0 && isCurrentActive && (
                          <span className="plan-active-label">Current Plan</span>
                        )}
                      </div>
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
    </CorporatePageShell>
  );
}

export default SubscriptionPlan;
