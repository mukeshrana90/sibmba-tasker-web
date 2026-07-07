import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import OtpSelectionModal from "../CommanComponents/Modals/OtpSelectionModal";
import { normalizeMongoId, otpVerificationPath } from "../utils/normalizeMongoId";

const AUTH_VISUAL_IMG =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

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

    try {
      setForgotLoading(true);
      const res = await dispatch(
        CustomerActions.forgotPassword({ email, type: 1 })
      );
      if (res?.payload?.success) {
        setUserId(normalizeMongoId(res.payload.data?._id));
        setPhoneNumber(res.payload.data?.phone_number || null);
        setCountryCode(res.payload.data?.country_code || null);
        setShowOtpModal(true);
      } else {
        toast.error(
          res?.payload?.message || "Something went wrong. Please try again."
        );
      }
    } catch {
      toast.error("Unable to send OTP. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpTypeSelection = async (otpType) => {
    setSendingOtpLoading(true);
    const payload = {
      phone_number: phoneNumber,
      country_code: countryCode,
      email,
      type: otpType,
    };
    try {
      const res = await dispatch(CustomerActions.forgotPassword(payload));
      if (res?.payload?.success) {
        toast.success(res?.payload?.message || "OTP sent successfully");
        setShowOtpModal(false);
        navigate(
          otpVerificationPath(userId, { type: "forgot", otpType }),
          { replace: true }
        );
      } else {
        toast.error(
          res?.payload?.message || "Failed to send OTP. Please try again."
        );
      }
    } catch {
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setSendingOtpLoading(false);
    }
  };

  return (
    <div className="simba-marketing-layout">
      <div className="simba-page p-signup p-forgot">
        <div className="auth">
          <div className="auth-visual">
            <img src={AUTH_VISUAL_IMG} alt="Trusted service provider at work" />
            <div className="av-grain" />
            <div className="av-content">
              <div className="av-top" />
              <div className="av-bottom">
                <h2>
                  Reset your <span className="hl">password</span> securely
                </h2>
                <p>
                  We&apos;ll send a one-time code to your registered email or
                  phone so you can get back into your account.
                </p>
              </div>
            </div>
          </div>

          <div className="auth-form">
            <div className="fcard">
              <Link to="/" className="brand">
                <img
                  src={require("../Assets/Images/dark-logo.png")}
                  alt="Simba Tasker"
                />
              </Link>

              <div className="form-head">
                <h1>Forgot password</h1>
                <p>Enter your registered email and we&apos;ll send you a code.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="email">Email ID</label>
                  <div className="input-shell">
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 6 10-6" />
                    </svg>
                    <input
                      type="email"
                      id="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? <ButtonLoader /> : "Send reset code"}
                  {!forgotLoading && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </button>
              </form>

              <p className="alt">
                Remember your password?{" "}
                <Link to="/login" className="link-gold">
                  Back to log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

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
