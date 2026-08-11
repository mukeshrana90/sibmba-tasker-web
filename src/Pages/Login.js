import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  resolvePostAuthPath,
  setAuthReturnUrl,
} from "../utils/authRedirect";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import { getFirebaseToken } from "../utils/fireBaseConfig";
import {
  normalizeWebDeviceToken,
  resolveWebDeviceTokenDetailed,
} from "../utils/webDeviceToken";
import { Roles, normalizeRole } from "../utils/Roles";
import GoogleSignInButton from "../CommanComponents/GoogleSignInButton";
import AppleSignInButton from "../CommanComponents/AppleSignInButton";
import RoleSelectModal from "../CommanComponents/Modals/RoleSelectModal";
import { handleAuthSuccess } from "../utils/handleAuthSuccess";
import {
  isAppleLoginDisabled,
  isGoogleLoginDisabled,
} from "../utils/featureFlags";

const AUTH_VISUAL_IMG =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

function EyeOpenIcon() {
  return (
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
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
      <path d="M9.9 4.2A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 11s3.5 7 10 7a9.5 9.5 0 0 0 4.2-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function isTokenValid() {
  const token = localStorage.getItem("token");
  const tokenExpiresAt = localStorage.getItem("expiresAt");
  if (!token || !tokenExpiresAt) return false;
  if (Date.now() > parseInt(tokenExpiresAt, 10)) {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("expiresAt");
    return false;
  }
  return true;
}

export default function Login() {
  const [fcmToken, setFcmToken] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const returnUrl = resolvePostAuthPath(searchParams.get("returnUrl"));
  const loginRole = normalizeRole(searchParams.get("role")) || Roles.CUSTOMER;
  const [localLoading, setLocalLoading] = useState(false);
  const [pendingSocial, setPendingSocial] = useState(null);
  const [roleModalLoading, setRoleModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    webPage: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const signUpPath = returnUrl
    ? `/sign-up?returnUrl=${encodeURIComponent(returnUrl)}`
    : "/sign-up";

  useEffect(() => {
    const handleGetFirebaseToken = async () => {
      try {
        const token = normalizeWebDeviceToken(await getFirebaseToken());
        setFcmToken(token || null);
        if (token) localStorage.setItem("device_token", token);
      } catch (error) {
        console.error("Firebase token error:", error);
      }
    };
    handleGetFirebaseToken();
  }, []);

  useEffect(() => {
    if (returnUrl) setAuthReturnUrl(returnUrl);
  }, [returnUrl]);

  useEffect(() => {
    if (isTokenValid()) {
      navigate(returnUrl || "/", { replace: true });
    }
  }, [navigate, returnUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLocalLoading(true);

    const { token: deviceToken, isFcm, reason } =
      await resolveWebDeviceTokenDetailed(fcmToken);

    if (isFcm && deviceToken) {
      localStorage.setItem("device_token", deviceToken);
      setFcmToken(deviceToken);
    }

    if (!isFcm) {
      console.warn("Login FCM unavailable:", reason);
      if (reason === "insecure_context_use_https_or_localhost") {
        toast.warn(
          "Open the site via HTTPS or localhost to enable push notifications."
        );
      } else if (String(reason).includes("notification_permission")) {
        toast.warn(
          "Allow browser notifications to receive job alerts on this device."
        );
      }
    }

    // Only send real FCM tokens — web-* fallbacks are not deliverable by Firebase.
    const payload = { ...formData, device_type: "web" };
    if (isFcm && deviceToken) payload.device_token = deviceToken;

    const response = await dispatch(CustomerActions.loginCustomer(payload));

    if (response?.payload?.status_code === 200) {
      await handleAuthSuccess({
        payload: response.payload,
        dispatch,
        navigate,
        returnUrl,
        fallbackEmail: formData.email,
      });
    } else {
      toast.error(response?.payload?.message);
    }
    setLocalLoading(false);
  };

  const handleSocialNeedRole = (pending) => {
    setPendingSocial(pending);
  };

  const handleRoleSelected = async (role) => {
    if (!pendingSocial) return;

    setRoleModalLoading(true);
    const response = await dispatch(
      CustomerActions.socialLogin({
        type: Number(pendingSocial.type) || 1,
        social_token: pendingSocial.socialToken,
        role: Number(role),
        device_type: "web",
        device_token: pendingSocial.deviceToken || undefined,
        allow_create: true,
      })
    );

    const ok = await handleAuthSuccess({
      payload: response?.payload,
      dispatch,
      navigate,
      returnUrl,
    });

    setRoleModalLoading(false);
    if (ok) {
      setPendingSocial(null);
    }
  };

  return (
    <div className="simba-marketing-layout">
      <div className="simba-page p-signup p-login">
        <div className="auth">
          <div className="auth-visual">
            <img src={AUTH_VISUAL_IMG} alt="Trusted service provider at work" />
            <div className="av-grain" />
            <div className="av-content">
              <div className="av-top" />
              <div className="av-bottom">
                <h2>
                  Welcome back to <span className="hl">Simba Tasker</span>
                </h2>
                <p>
                  Sign in to manage bookings, post tasks, and connect with
                  trusted professionals across Zimbabwe.
                </p>
                <div className="av-stats">
                  <div>
                    <b>2,400+</b>
                    <span>Verified providers</span>
                  </div>
                  <div>
                    <b>15k+</b>
                    <span>Jobs completed</span>
                  </div>
                  <div>
                    <b>4.8★</b>
                    <span>Average rating</span>
                  </div>
                </div>
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
                <h1>Welcome back!</h1>
                <p>Log in to pick up exactly where you left off.</p>
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
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="password">Password</label>
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
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="toggle-eye"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>
                </div>

                <div className="field-actions">
                  <Link to="/forgot-password" className="link-gold">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={localLoading}
                >
                  {localLoading ? <ButtonLoader /> : "Log in"}
                  {!localLoading && (
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

                <GoogleSignInButton
                  role={loginRole}
                  disabled={localLoading}
                  allowCreate={false}
                  onNeedRole={handleSocialNeedRole}
                  onSuccess={(payload) =>
                    handleAuthSuccess({
                      payload,
                      dispatch,
                      navigate,
                      returnUrl,
                    })
                  }
                />
                <AppleSignInButton
                  role={loginRole}
                  disabled={localLoading}
                  allowCreate={false}
                  showDivider={isGoogleLoginDisabled() && !isAppleLoginDisabled()}
                  onNeedRole={handleSocialNeedRole}
                  onSuccess={(payload) =>
                    handleAuthSuccess({
                      payload,
                      dispatch,
                      navigate,
                      returnUrl,
                    })
                  }
                />
              </form>

              <p className="alt">
                Don&apos;t have an account?{" "}
                <Link to={signUpPath} className="link-gold">
                  Sign up
                </Link>
              </p>

              <div className="signup-links">
                <p>
                  Are you a business?{" "}
                  <Link to="/sign-up?role=3" className="link-gold">
                    Register as Corporate
                  </Link>
                </p>
                <p>
                  Want to offer your services?{" "}
                  <Link to="/sign-up?role=2" className="link-gold">
                    Become a provider
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RoleSelectModal
        show={!!pendingSocial}
        onHide={() => setPendingSocial(null)}
        onSelect={handleRoleSelected}
        isLoading={roleModalLoading}
      />
    </div>
  );
}
