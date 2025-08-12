import { Card, Col, Container, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import successLogo from "../../Assets/Images/dark-logo.png";
import { useEffect } from "react";

const SubscriptionCancel = () => {
  const Navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => Navigate("/"), 3000);
  }, []);
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
                <h4 className="mb-3">Payment Failed </h4>
                <div>
                  <svg
                    width="128"
                    height="128"
                    viewBox="0 0 128 128"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="64" cy="64" r="64" fill="#C10C00" />
                    <path
                      d="M46.0001 78.1432C46.2406 77.0067 47.0092 76.2389 47.7854 75.4582C51.4653 71.7571 55.1295 68.0402 58.8031 64.3327C58.9088 64.2259 59.055 64.1602 59.1822 64.0753C59.1779 64.0184 59.1735 63.9616 59.1691 63.9048C59.0529 63.8251 58.9205 63.7618 58.8229 63.6633C54.9593 59.7627 51.0992 55.8584 47.2379 51.9555C46.2569 50.9639 45.9209 49.7829 46.3269 48.445C46.7329 47.1065 47.6692 46.2935 49.0294 46.0557C50.1586 45.8584 51.1635 46.1869 51.9859 47.0132C55.8257 50.8708 59.6637 54.7303 63.5013 58.5902C63.6505 58.7402 63.7879 58.9022 63.965 59.096C64.1008 58.9636 64.2072 58.863 64.3103 58.7589C68.138 54.889 71.9628 51.016 75.7943 47.1501C77.6687 45.259 80.7482 45.9749 81.5177 48.4898C81.9125 49.7802 81.6527 50.9561 80.698 51.9242C76.8426 55.8331 72.9788 59.7337 69.1166 63.6359C69.0265 63.727 68.9193 63.8007 68.7686 63.9249C68.9562 64.0965 69.0978 64.2161 69.2282 64.3471C73.1342 68.2718 77.0388 72.1979 80.9445 76.1231C81.6823 76.8646 82.0293 77.7562 81.9981 78.8091C81.9476 80.5127 80.509 81.9332 78.8209 81.9873C77.561 82.0277 76.5396 81.604 75.6464 80.6928C71.8691 76.8391 68.0643 73.0128 64.2725 69.1736C64.1747 69.0746 64.1109 68.9411 64.0312 68.8238C63.9795 68.8221 63.9276 68.8204 63.8759 68.8188C63.7973 68.9377 63.7357 69.0736 63.6377 69.1729C59.7631 73.096 55.8855 77.016 52.0078 80.936C50.8418 82.1148 48.8419 82.3453 47.4348 81.4708C46.7013 81.0149 46.3099 80.3239 46.0851 79.5127C46.0571 79.4116 46.0284 79.3107 46 79.2098C46.0001 78.8541 46.0001 78.4987 46.0001 78.1432Z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>

              <hr />

              <p className="small text-muted">
                Your subscription purchase was cancelled. You can try
                subscribing again or choose plan at any time.
              </p>
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default SubscriptionCancel;
