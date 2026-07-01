import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { consumeAuthReturnUrl } from "../utils/authRedirect";
import {
  autoCompleteCustomerProfile,
  resolveCustomerEmail,
} from "../utils/customerProfileAutoComplete";

export default function CompleteProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Setting up your account...");

  useEffect(() => {
    const run = async () => {
      const token =
        localStorage.getItem("temptoken") || localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const expiresAt = localStorage.getItem("expiresAt");

      if (!token || !userId) {
        navigate("/login", { replace: true });
        return;
      }

      const result = await autoCompleteCustomerProfile(dispatch, {
        email: resolveCustomerEmail(),
        token,
        userId,
        role: 1,
        expiresAt,
      });

      if (!result.ok) {
        setMessage(result.message || "Redirecting...");
      }

      navigate(consumeAuthReturnUrl() || "/", { replace: true });
    };

    run();
  }, [dispatch, navigate]);

  return (
    <div className="p-2 p-md-5">
      <Container fluid>
        <Col lg={6} className="mx-auto">
          <div className="complete-profile-box">
            <div className="login-box-inner-wrap py-4 px-3 text-center">
              <h2>Welcome to Simba Tasker</h2>
              <p className="mb-0">{message}</p>
            </div>
          </div>
        </Col>
      </Container>
    </div>
  );
}
