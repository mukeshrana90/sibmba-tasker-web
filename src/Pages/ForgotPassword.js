import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [forgotLoading, setForgotLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setForgotLoading(true);
    let res = await dispatch(
      CustomerActions.forgotPassword({ email, type: 1 })
    );
    if (res.payload.success) {
      toast.success(res.payload.message);
      navigate(`/otp-varification?userId=${res.payload.data._id}&type=forgot`, {
        replace: true,
      });
    } else {
      toast.error(res.payload.message);
    }
    setForgotLoading(false);
    console.log("Sending reset password email to:", email);
  };

  return (
    <div className="p-3">
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={6} className="p-0">
            <div className="otp-banner-img"></div>
          </Col>
          <Col lg={6}>
            <div className="right-banner-part">
              <div className="login-cmn-box">
                <div className="login-box-inner-wrap">
                  <div className="login-logo">
                    {" "}
                    <img src={require("../Assets/Images/dark-logo.png")} />
                  </div>
                  <h2>Forgot password</h2>
                  <p className="mb-0">Please enter your registered email</p>
                  <Form onSubmit={handleSubmit}>
                    <div className="form-set">
                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Email ID</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="Enter your Register Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          // isInvalid={!!error}
                        />
                      </Form.Group>
                    </div>

                    <button
                      variant="primary"
                      type="submit"
                      className="submit forgot-btn"
                    >
                      {forgotLoading ? <ButtonLoader /> : "Submit"}
                    </button>
                  </Form>
                </div>
              </div>
            </div>
          </Col>
        </div>
      </Container>
    </div>
  );
}
