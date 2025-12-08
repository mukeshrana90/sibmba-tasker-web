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
import OtpSelectionModal from "../CommanComponents/Modals/OtpSelectionModal";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [forgotLoading, setForgotLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [countryCode, setCountryCode] = useState(null);
  const [sendingOtpLoading, setSendingOtpLoading] = useState(false);

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
      setUserId(res.payload.data._id);
      setPhoneNumber(res.payload.data?.phone_number || null);
      setCountryCode(res.payload.data?.country_code || null);
      setShowOtpModal(true);
    } else {
      toast.error(res.payload.message);
    }
    setForgotLoading(false);
  };

  const handleOtpTypeSelection = async (otpType) => {
    setSendingOtpLoading(true);
    const payload = {
      phone_number: phoneNumber,
      country_code: countryCode,
      email: email,
      type: otpType,
      // value: 1, // Default role for forgot password flow
    };
    let res = await dispatch(
      CustomerActions.forgotPassword(payload)
    );
    if (res.payload.success) {
      toast.success(res.payload.message);
      setShowOtpModal(false);
      navigate(`/otp-varification?userId=${userId}&type=forgot&otpType=${otpType}`, {
        replace: true,
      });
    } else {
      toast.error(res.payload.message);
    }
    setSendingOtpLoading(false);
  };

  return (
    <div className="p-3">
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={6} className="p-0">
            <div className="forgot-banner-img"></div>
          </Col>
          <Col lg={6}>
            <div className="right-banner-part">
              <div className="login-cmn-box">
                <div className="login-box-inner-wrap">
                  <div className="login-logo cursor-pointer" onClick={() => navigate("/")}>
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
      <OtpSelectionModal
        show={showOtpModal}
        onHide={() => setShowOtpModal(false)}
        email={email}
        phoneNumber={phoneNumber}
        onSelect={handleOtpTypeSelection}
        isLoading={sendingOtpLoading}
      />
    </div>
  );
}
