import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  PhoneInput,
  defaultCountries,
  parseCountry,
} from "react-international-phone";
import "react-international-phone/style.css";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import { useQuery } from "../utils/CommonFunction";
import OtpSelectionModal from "../CommanComponents/Modals/OtpSelectionModal";
import { toast } from "react-toastify";
import { getFirebaseToken } from "../utils/fireBaseConfig";
import { safeReturnUrl, setAuthReturnUrl, resolvePostAuthPath } from "../utils/authRedirect";
import { otpVerificationPath } from "../utils/normalizeMongoId";
import GoogleSignInButton from "../CommanComponents/GoogleSignInButton";
import { handleAuthSuccess } from "../utils/handleAuthSuccess";

const ROLE_COPY = {
  1: {
    title: "Sign up as a User",
    sub: "Find & hire trusted professionals near you.",
  },
  2: {
    title: "Sign up as a Provider",
    sub: "Offer your services and grow your business.",
  },
  3: {
    title: "Sign up as Corporate",
    sub: "Enterprise solutions for your organization.",
  },
};

const ROLE_OPTIONS = [
  { key: 1, label: "I Need a Service" },
  { key: 2, label: "Service Provider" },
  { key: 3, label: "Corporate" },
];

const AUTH_VISUAL_IMG =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

function parseRoleFromQuery(value) {
  if (value === "2" || value === "provider") return 2;
  if (value === "3" || value === "corporate") return 3;
  if (value === "1" || value === "user") return 1;
  return 1;
}

function normalizeWebDeviceToken(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return s || "";
}

async function resolveWebDeviceTokenForRegister(fcmTokenState) {
  const tryFresh = async () => {
    try {
      const token = await getFirebaseToken();
      return normalizeWebDeviceToken(token);
    } catch {
      return "";
    }
  };

  let resolved = await tryFresh();
  if (!resolved) {
    await new Promise((r) => setTimeout(r, 400));
    resolved = await tryFresh();
  }
  if (!resolved) {
    resolved = normalizeWebDeviceToken(localStorage.getItem("device_token"));
  }
  if (!resolved) {
    resolved = normalizeWebDeviceToken(fcmTokenState);
  }
  return resolved;
}

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

function countryCodeToIso(dialCode) {
  const digits = String(dialCode || "+263").replace(/\D/g, "");
  for (const entry of defaultCountries) {
    const country = parseCountry(entry);
    if (country.dialCode === digits) return country.iso2;
  }
  return "zw";
}

function buildPhoneInputValue(countryCode, phone) {
  const local = String(phone || "").replace(/\D/g, "");
  if (!local) return "";
  const cc = String(countryCode || "+263").replace(/\D/g, "");
  return `+${cc}${local}`;
}

const SIGNUP_DEFAULT_VALUES = {
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
  country_code: "+263",
};

function getSignupInitialValues() {
  const savedData = localStorage.getItem("signupFormData");
  if (!savedData) return SIGNUP_DEFAULT_VALUES;
  try {
    return { ...SIGNUP_DEFAULT_VALUES, ...JSON.parse(savedData) };
  } catch {
    localStorage.removeItem("signupFormData");
    return SIGNUP_DEFAULT_VALUES;
  }
}

export default function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const query = useQuery();
  const queryRole = query.get("role");

  const [selectedRole, setSelectedRole] = useState(() =>
    parseRoleFromQuery(queryRole)
  );
  const [fcmToken, setFcmToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const roleCopy = ROLE_COPY[selectedRole] || ROLE_COPY[1];
  const returnUrl = resolvePostAuthPath(query.get("returnUrl"));

  const formik = useFormik({
    initialValues: getSignupInitialValues(),
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Invalid email address")
        .required("Email is Required"),
      phone: Yup.string()
        .transform((value) => value.replace(/\D/g, ""))
        .matches(/^\d{7,15}$/, "Please enter a valid phone number")
        .required("Phone number is required"),
      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is Required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords must match")
        .required("Confirm password is Required"),
      terms: Yup.boolean().oneOf([true], "You must accept the terms"),
    }),
    onSubmit: async (values) => {
      localStorage.setItem("signupFormData", JSON.stringify(values));
      setShowOtpModal(true);
    },
  });

  const defaultPhoneCountry = useMemo(
    () => countryCodeToIso(formik.values.country_code),
    [formik.values.country_code]
  );

  const phoneInputValue = buildPhoneInputValue(
    formik.values.country_code,
    formik.values.phone
  );

  const handlePhoneChange = (phone, meta) => {
    const dialCode = meta?.country?.dialCode || "";
    const countryCode = dialCode
      ? `+${dialCode}`
      : formik.values.country_code || "+263";

    let localNumber = phone;
    if (dialCode && phone.startsWith(`+${dialCode}`)) {
      localNumber = phone.slice(`+${dialCode}`.length);
    } else if (phone.startsWith("+")) {
      localNumber = phone.replace(/^\+/, "");
    }
    localNumber = localNumber.replace(/\D/g, "");

    formik.setFieldValue("country_code", countryCode);
    formik.setFieldValue("phone", localNumber);
  };

  useEffect(() => {
    setSelectedRole(parseRoleFromQuery(queryRole));
  }, [queryRole]);

  useEffect(() => {
    const handleGetFirebaseToken = async () => {
      try {
        const token = await getFirebaseToken();
        const normalized = normalizeWebDeviceToken(token);
        setFcmToken(normalized || null);
        if (normalized) {
          localStorage.setItem("device_token", normalized);
        }
      } catch (error) {
        console.error(
          "An error occurred while retrieving the Firebase token: ",
          error
        );
      }
    };
    handleGetFirebaseToken();
  }, []);

  useEffect(() => {
    const returnUrl = safeReturnUrl(query.get("returnUrl"));
    if (returnUrl) {
      setAuthReturnUrl(returnUrl);
    }
  }, [query]);

  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    const path =
      roleKey === 1 ? "/sign-up" : `/sign-up?role=${roleKey}`;
    navigate(path, { replace: true });
  };

  const handleOtpTypeSelection = async (otpType) => {
    setSignupLoading(true);
    const deviceToken = await resolveWebDeviceTokenForRegister(fcmToken);
    if (deviceToken) {
      localStorage.setItem("device_token", deviceToken);
      setFcmToken(deviceToken);
    }

    const payload = {
      email: formik.values.email,
      country_code: formik.values.country_code || "+263",
      phone_number: formik.values.phone,
      password: formik.values.password,
      role: selectedRole,
      type: otpType,
      device_type: "web",
      device_token: deviceToken,
    };

    const response = await dispatch(CustomerActions.createCustomer(payload));
    if (response?.payload?.status_code === 200) {
      toast.success(response?.payload?.message || "Registration successful");
      setShowOtpModal(false);
      navigate(
        otpVerificationPath(response?.payload?.data?._id, {
          role: selectedRole,
          otpType,
        })
      );
    } else {
      toast.error(response?.payload?.message || "Registration failed");
      if (response?.payload?.status_code === 400) {
        setShowOtpModal(false);
      }
    }
    setSignupLoading(false);
  };

  const fieldError = (name) =>
    formik.touched[name] && formik.errors[name] ? (
      <div className="field-error">{formik.errors[name]}</div>
    ) : null;

  return (
    <div className="simba-marketing-layout">
      <div className="simba-page p-signup">
        <div className="auth">
          <div className="auth-visual">
            <img src={AUTH_VISUAL_IMG} alt="Trusted service provider at work" />
            <div className="av-grain" />
            <div className="av-content">
              <div className="av-top" />
              <div className="av-bottom">
                <h2>
                  Join Zimbabwe&apos;s <span className="hl">trusted</span>{" "}
                  services marketplace.
                </h2>
                <p>
                  Create your account to find verified pros — or grow your
                  business with thousands of new customers.
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

              <div className="role-toggle">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={selectedRole === opt.key ? "active" : ""}
                    onClick={() => handleRoleChange(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="form-head">
                <h1>{roleCopy.title}</h1>
                <p>{roleCopy.sub}</p>
              </div>

              <form onSubmit={formik.handleSubmit} noValidate>
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
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  {fieldError("email")}
                </div>

                <div className="field signup-phone-field">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-shell">
                    <PhoneInput
                      defaultCountry={defaultPhoneCountry}
                      value={phoneInputValue}
                      onChange={handlePhoneChange}
                      onBlur={() => formik.setFieldTouched("phone", true)}
                      placeholder="77 123 4567"
                      inputProps={{ id: "phone", name: "phone" }}
                    />
                  </div>
                  {fieldError("phone")}
                </div>

                <div className="field-row">
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
                        placeholder="Enter password"
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
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
                    {fieldError("password")}
                  </div>

                  <div className="field">
                    <label htmlFor="confirmPassword">Confirm Password</label>
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
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        placeholder="Re-enter password"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <button
                        type="button"
                        className="toggle-eye"
                        aria-label="Toggle confirm password visibility"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? (
                          <EyeClosedIcon />
                        ) : (
                          <EyeOpenIcon />
                        )}
                      </button>
                    </div>
                    {fieldError("confirmPassword")}
                  </div>
                </div>

                <div className="consent">
                  <input
                    type="checkbox"
                    id="terms"
                    name="terms"
                    checked={formik.values.terms}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <label htmlFor="terms">
                    I agree to receive a one-time SMS code for account
                    verification. Message and data rates may apply. See our{" "}
                    <a
                      href="https://simbatasker.com/terms-and-conditions"
                      className="link-gold"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms &amp; Conditions
                    </a>
                    .
                  </label>
                </div>
                {fieldError("terms")}

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={signupLoading}
                >
                  {signupLoading ? <ButtonLoader /> : "Sign Up"}
                  {!signupLoading && (
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
                  role={selectedRole}
                  disabled={signupLoading}
                  label="Sign up with Google"
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
                Already have an account?{" "}
                <Link
                  to={
                    safeReturnUrl(query.get("returnUrl"))
                      ? `/login?returnUrl=${encodeURIComponent(
                          safeReturnUrl(query.get("returnUrl"))
                        )}`
                      : "/login"
                  }
                  className="link-gold"
                >
                  Log In
                </Link>
              </p>

              <p className="legal">
                By signing up you agree to Simba Tasker&apos;s
                <br />
                <a
                  href="https://simbatasker.com/terms-and-conditions"
                  className="link-gold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href="https://simbatasker.com/privacy-policy"
                  className="link-gold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <OtpSelectionModal
          show={showOtpModal}
          onHide={() => setShowOtpModal(false)}
          email={formik.values.email}
          phoneNumber={`${formik.values.country_code}${formik.values.phone}`}
          onSelect={handleOtpTypeSelection}
          isLoading={signupLoading}
        />
      </div>
    </div>
  );
}
