import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "../utils/CommonFunction";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import ButtonLoader from "../CommanComponents/ButtonLoader";

export default function ResetPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const query = useQuery();
  const userId = query.get("userId");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [passwordStrength, setPasswordStrength] = useState("weak");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "password") {
      validatePassword(value);
    }
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (minLength && hasLowerCase && hasUpperCase && hasSpecialChar) {
      setPasswordStrength("strong");
    } else if (minLength && (hasLowerCase || hasUpperCase)) {
      setPasswordStrength("normal");
    } else {
      setPasswordStrength("weak");
    }

    return minLength && hasLowerCase && hasUpperCase && hasSpecialChar;
  };

  const handlePasswordFocus = () => {
    setPasswordFocused(true);
  };

  const handlePasswordBlur = () => {
    if (!formData.password) {
      setPasswordFocused(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password) {
      toast.error("Please enter password");
      return;
    } else if (!formData.confirmPassword) {
      toast.error("Please enter a confirm password");
      return;
    } else if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    } else if (passwordStrength !== "strong") {
      toast.error("Please ensure your password meets all requirements");
      return;
    } else if (!userId) {
      toast.error(
        "User ID not found. Please try the password reset process again."
      );
      return;
    } else {
      setResetLoading(true);
      const res = await dispatch(
        CustomerActions.resetPassword({
          id: userId,
          password: formData.password,
        })
      );
      if (res.payload.success) {
        toast.success(res?.payload?.message);
        navigate(`/login`);
      } else {
        toast.error(res?.payload?.message);
      }
      setResetLoading(false);
    }
  };

  return (
    <div className="p-3">
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={6} className="p-0">
            <div className="resetPassowrd-banner-img"></div>
          </Col>
          <Col lg={6}>
            <div className="right-banner-part">
              <div className="login-cmn-box">
                <div className="login-box-inner-wrap">
                  <div className="login-logo cursor-pointer" onClick={() => navigate("/")}>
                    <img src={require("../Assets/Images/dark-logo.png")} />
                  </div>
                  <h2>Reset Passwoard </h2>
                  <p className="mb-0">Please create a new strong password</p>
                  <Form onSubmit={handleSubmit}>
                    <div className="form-set">
                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter here"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          onFocus={handlePasswordFocus}
                          onBlur={handlePasswordBlur}
                        />
                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter here"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                        />
                      </Form.Group>

                      {formData.password && (
                        <>
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              marginTop: "10px",
                            }}
                          >
                            {[1, 2, 3].map((index) => (
                              <div
                                key={index}
                                style={{
                                  flex: 1,
                                  height: "4px",
                                  backgroundColor:
                                    (passwordStrength === "weak" &&
                                      index === 1) ||
                                    (passwordStrength === "normal" &&
                                      index <= 2) ||
                                    passwordStrength === "strong"
                                      ? "#23AE5D"
                                      : "gray",
                                  borderRadius: "8px",
                                }}
                              />
                            ))}
                          </div>
                          {formData.password && (
                            <Form.Label
                              style={{
                                width: "100%",
                                textAlign: "center",
                                marginTop: "8px",
                              }}
                            >
                              Your password is {passwordStrength}
                            </Form.Label>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      variant="primary"
                      type="submit"
                      className="submit forgot-btn"
                      disabled={resetLoading}
                    >
                      {resetLoading ? <ButtonLoader /> : "Update Password"}
                    </button>

                    {/* <div className="back-link-ad">
                      <Link to="/forgot-password">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="7"
                          height="13"
                          viewBox="0 0 7 13"
                          fill="none"
                        >
                          <path
                            d="M6 1.5L1 6.5L6 11.5"
                            stroke="#7367F0"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                        Back to login
                      </Link>
                    </div> */}
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
