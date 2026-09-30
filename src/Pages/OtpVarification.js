import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useNavigate } from "react-router-dom";
import OtpInput from "react-otp-input";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { toast } from "react-toastify";
import { useQuery } from "../utils/CommonFunction";
import { consumeAuthReturnUrl } from "../utils/authRedirect";
import { autoCompleteCustomerProfile } from "../utils/customerProfileAutoComplete";
import { Roles } from "../utils/Roles";
import { emit } from "../utils/socketService";
import { persistUserId, normalizeMongoId, resetPasswordPath } from "../utils/normalizeMongoId";

export default function OtpVarification() {

  const isTokenValid = () => {
  const token = localStorage.getItem("token");
  const expiresAt = localStorage.getItem("expiresAt");

  if (!token || !expiresAt) {
    return false;
  }

  if (Date.now() > parseInt(expiresAt)) {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("expiresAt");
    localStorage.removeItem("temptoken");
    return false;
  }

  return true;
};


  const navigate = useNavigate();
  const dispatch = useDispatch();
  const query = useQuery();
  const userId = normalizeMongoId(query.get("userId"));
  const type = query.get("type");
  const otpType = query.get("otpType") || "1"; // Default to 1 (email) if not provided
  const queryRole = Number(query.get("role"));
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(30);
  const [verifyOtpLoading, setVerifyOtpLoading] = useState(false);
  const [resendOtploading, setResendOtploading] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (isTokenValid()) {
      // Intentionally no redirect — user may be completing OTP verification
    }
  }, []);

  // Timer for OTP resend
  // useEffect(() => {
  //   let interval = null;
  //   if (timer > 0) {
  //     interval = setInterval(() => {
  //       setTimer((prevTimer) => prevTimer - 1);
  //     }, 1000);
  //   } else if (timer === 0) {
  //     clearInterval(interval);
  //   }
  //   return () => clearInterval(interval);
  // }, [timer]);

  // Validate query parameters
  useEffect(() => {
    if (!userId) {
      navigate("/login", { replace: true });
    }
  }, [userId, navigate]);

  // =================================================================

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendOTP = async () => {
    setResendOtploading(true);
    const payload = { user_id: userId, type: Number(otpType) };
    const res =
      queryRole === Roles.LOGISTICS
        ? await dispatch(LogisticsActions.resendOtp(payload))
        : await dispatch(CustomerActions.resendOtp(payload));
    if (res?.payload?.success) {
      const message = Number(otpType) === 3 
        ? "OTP has been resent to your WhatsApp number"
        : "OTP has been resent to your provided email";
      toast.success(message);
      setTimer(30);
      setOtp("");
    } else {
      toast.error(res?.payload?.message);
    }
    setResendOtploading(false);
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (otp.length !== 4) {
  //     toast.error("Please enter a valid 4-digit OTP");
  //     return;
  //   }
  //   setVerifyOtpLoading(true);
  //   let res = await dispatch(
  //     CustomerActions.verifyOtp({ user_id: userId, otp, type: 1 })
  //   );
  //   if (res?.payload?.success) {
  //     toast.success(res?.payload?.message);
  //     if (type === "forgot") {
  //       navigate(`/reset-password?userId=${res?.payload?.data?._id}`, {
  //         replace: true,
  //       });
  //     } else if (res?.payload?.data?.is_completeProfile == 0 && role == 1) {  // changed
  //       localStorage.setItem("temptoken", res?.payload?.data?.token);
  //       localStorage.setItem("userId", res?.payload?.data?._id);
  //       navigate("/complete-profile", { replace: true });
  //     } else if (role == 2) {
  //       localStorage.setItem("temptoken", res?.payload?.data?.token);
  //       localStorage.setItem("userId", res?.payload?.data?._id);
  //       navigate(`/provider`, { replace: true });
  //     } else {
  //       localStorage.removeItem("temptoken");
  //       localStorage.setItem("token", res?.payload?.data?.token);
  //       localStorage.setItem("userId", res?.payload?.data?._id);
  //       localStorage.setItem("role", res?.payload?.data.role);
  //       navigate(`/home`);
  //     }
  //     localStorage.removeItem('signupFormData');
  //   } else {
  //     toast.error(res?.payload?.message);
  //   }
  //   setVerifyOtpLoading(false);
  // };

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP");
      return;
    }
    setVerifyOtpLoading(true);
    const otpPayload = { user_id: userId, otp, type: Number(otpType) };
    const res =
      queryRole === Roles.LOGISTICS
        ? await dispatch(LogisticsActions.verifyOtp(otpPayload))
        : await dispatch(CustomerActions.verifyOtp(otpPayload));
    if (res?.payload?.success) {
      toast.success(res?.payload?.message);
      const data = res?.payload?.data || {};
      const userBlob = data.user || data;
      const token = data.token || userBlob.token;
      const verifiedUserId = persistUserId(userBlob._id || data._id);
      const userRole = userBlob.role ?? data.role ?? queryRole;
      // Set expiration (7 days)
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

      if (type === "forgot") {
        navigate(resetPasswordPath(verifiedUserId), { replace: true });
      } else if (Number(userRole) === Roles.LOGISTICS) {
        localStorage.removeItem("temptoken");
        localStorage.setItem("token", token);
        persistUserId(verifiedUserId);
        localStorage.setItem("role", String(Roles.LOGISTICS));
        localStorage.setItem("expiresAt", expiresAt);
        localStorage.removeItem("owner_id");
        localStorage.setItem(
          "logisticsPermissions",
          JSON.stringify(userBlob.permissions || [])
        );
        localStorage.setItem("activeModule", "logistics");
        localStorage.setItem(
          "isSubscribed",
          Number(userBlob.isSubscribed) === 1 || userBlob.isSubscribed === true
            ? "1"
            : "0"
        );
        if (userBlob.subscription_holder) {
          localStorage.setItem(
            "logisticsSubscriptionHolder",
            String(userBlob.subscription_holder)
          );
        }
        if (userBlob.owner_id) {
          localStorage.setItem("owner_id", String(userBlob.owner_id));
        }
        emit("new_user_connect", { userid: verifiedUserId });
        navigate(
          userBlob.owner_id ? "/logistics/driver" : "/logistics/owner",
          { replace: true }
        );
      } else if (
        Number(res?.payload?.data?.is_completeProfile) === 0 &&
        Number(userRole) === Roles.CUSTOMER
      ) {
        localStorage.setItem("temptoken", token);
        persistUserId(verifiedUserId);
        localStorage.setItem("expiresAt", expiresAt);

        const profileResult = await autoCompleteCustomerProfile(dispatch, {
          email: res?.payload?.data?.email,
          token,
          userId: verifiedUserId,
          role: userRole,
          expiresAt,
        });

        if (!profileResult.ok) {
          toast.error(profileResult.message);
        } else {
          emit("new_user_connect", { userid: verifiedUserId });
        }

        navigate(consumeAuthReturnUrl() || "/", { replace: true });
      } else if (Number(userRole) === 2 || Number(userRole) === 3) {
        localStorage.setItem("temptoken", token);
        persistUserId(verifiedUserId);
        localStorage.setItem("expiresAt", expiresAt);
        navigate(`/provider?role=${userRole}`, { replace: true });
      } else {
        localStorage.removeItem("temptoken");
        localStorage.setItem("token", token);
        persistUserId(verifiedUserId);
        localStorage.setItem("role", userRole);
        localStorage.setItem("expiresAt", expiresAt);
        navigate(consumeAuthReturnUrl() || "/", { replace: true });
      }
      localStorage.removeItem("signupFormData");
    } else {
      toast.error(res?.payload?.message || "Invalid OTP");
    }
    setVerifyOtpLoading(false);
  };


  return (
    <div className="p-3">
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={6} className="p-0">
            <div className="new-otp-banner-img"></div>
          </Col>
          <Col lg={6}>
            <div className="right-banner-part">
              <div className="login-cmn-box">
                <div className="login-box-inner-wrap">
                  <div className="login-logo cursor-pointer" onClick={() => navigate("/")}>
                    <img src={require("../Assets/Images/dark-logo.png")} alt="Simba Tasker" />
                  </div>
                  <h2>OTP</h2>
                  <p className="mb-0">
                    We’ve sent an OTP to your registered email.
                    <br />
                    Enter it below to continue.
                  </p>
                  <Form onSubmit={handleSubmit}>
                    <div className="form-set set-otp">
                      <OtpInput
                        value={otp}
                        onChange={setOtp}
                        numInputs={4}
                        renderInput={(props) => <input {...props} />}
                        inputStyle="otp-input" // Add this class in your CSS
                        isInputNum={true}
                      />
                    </div>

                    <button type="submit" className="submit forgot-btn">
                      {verifyOtpLoading ? "Verifying ..." : "Verify"}
                    </button>

                    <div className="resend-mail">
                      {timer > 0 ? (
                        <p>
                          Resend OTP in <span>{timer.toString().padStart(2, "0")}</span> seconds
                        </p>
                      ) : (
                        <p>
                          Didn't receive the OTP?{" "}
                          <span
                            onClick={handleResendOTP}
                            style={{ cursor: "pointer", fontWeight: "bold", display: "inline" }}
                          >
                            {resendOtploading ? "Sending ..." : "Resend OTP"}
                          </span>
                        </p>
                      )}
                    </div>

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
