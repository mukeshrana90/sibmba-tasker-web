import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link } from "react-router-dom";

export default function Error() {
  return (
    <div>
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={12} className="p-0">
            <div className="error-banner-img">
              <div className="error-text-box">
                <h2>404</h2>
                <div className="">Page Not Found️ ⚠️</div>
                <p>we couldn't find the page you are looking for</p>
                <Link to="/">Back to home</Link>
              </div>
            </div>
          </Col>
        </div>
      </Container>
    </div>
  );
}
