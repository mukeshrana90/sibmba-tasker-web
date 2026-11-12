import { useEffect, useMemo, useRef, useState } from "react";
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
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import { useQuery } from "../utils/CommonFunction";
import OtpSelectionModal from "../CommanComponents/Modals/OtpSelectionModal";
import { toast } from "react-toastify";
import { getFirebaseToken } from "../utils/fireBaseConfig";
import {
  normalizeWebDeviceToken,
  resolveWebDeviceToken,
} from "../utils/webDeviceToken";
import { safeReturnUrl, setAuthReturnUrl, resolvePostAuthPath } from "../utils/authRedirect";
import { otpVerificationPath } from "../utils/normalizeMongoId";
import GoogleSignInButton from "../CommanComponents/GoogleSignInButton";
import AppleSignInButton from "../CommanComponents/AppleSignInButton";
import { handleAuthSuccess } from "../utils/handleAuthSuccess";
import {
  isAppleLoginDisabled,
  isGoogleLoginDisabled,
} from "../utils/featureFlags";
import { Roles } from "../utils/Roles";
import { EMAIL_PATTERN, checkEmailRemote } from "../utils/emailCheck";
import { DOC_ACCEPT, keepAllowedFiles } from "../utils/uploadLimits";
import LogisticsLocationField from "../CommanComponents/LogisticsLocationField";
import "./logistics/logistics.css";

// Company documents for the Simba approval (Equipment Owner sign-up only).
// Files live in formik values but never in localStorage.
const BUSINESS_DOCS = [
  { name: "business_registration", label: "Business registration certificate", required: true },
  { name: "owner_id", label: "Owner ID", required: true, expiryRequired: true, hint: "National ID, passport or driving licence" },
  { name: "tax", label: "Tax certificate", required: false },
  { name: "address_proof", label: "Proof of address", required: false },
];
const OWNER_ID_KINDS = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "driving_licence", label: "Driving licence" },
];
const BUSINESS_DOC_NAMES = BUSINESS_DOCS.map((d) => d.name);
// As-you-type casing: names Title Case ("ravi KUMAR" → "Ravi Kumar"); business
// names only get a capital first letter per word so "ABC Logistics" keeps its
// acronym; emails are always lower case.
const titleCaseName = (v) => String(v || "").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
const capitalizeWords = (v) => String(v || "").replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
// 30 Oct 2026: owner sign-up in two steps — 1 account details, 2 business documents
// (skippable; skipped owners upload them on /logistics/owner/verification)
const STEP1_FIELDS = ["full_name", "company_name", "email", "phone", "password", "confirmPassword"];
const withoutFiles = (values) =>
  Object.fromEntries(Object.entries(values).filter(([k]) => !BUSINESS_DOC_NAMES.includes(k)));

const ROLE_COPY = {
  [Roles.LOGISTICS]: {
    title: "Sign up as Equipment Owner",
    sub: "List trucks & plant, hire drivers, and win logistics jobs.",
  },
  [Roles.CUSTOMER]: {
    title: "Sign up as a User",
    sub: "Find & hire trusted professionals near you.",
  },
  [Roles.SERVICE_PROVIDER]: {
    title: "Sign up as a Provider",
    sub: "Offer your services and grow your business.",
  },
  [Roles.CORPORATE]: {
    title: "Sign up as Corporate",
    sub: "Enterprise solutions for your organization.",
  },
};

/** Equipment/Logistic first — under logo, before Tasker role tabs */
const ROLE_OPTIONS = [
  { key: Roles.LOGISTICS, label: "Equipment Owner" },
  { key: Roles.CUSTOMER, label: "Need a Service" },
  { key: Roles.SERVICE_PROVIDER, label: "Provider" },
  { key: Roles.CORPORATE, label: "Corporate" },
];

const AUTH_VISUAL_IMG =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

function parseRoleFromQuery(value) {
  if (value === "4" || value === "logistics" || value === "equipment") {
    return Roles.LOGISTICS;
  }
  if (value === "2" || value === "provider") return Roles.SERVICE_PROVIDER;
  if (value === "3" || value === "corporate") return Roles.CORPORATE;
  if (value === "1" || value === "user") return Roles.CUSTOMER;
  return Roles.CUSTOMER;
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
  const cc = String(countryCode || "+263").replace(/\D/g, "");
  // Keep the dial code even when the number is empty so the picked country sticks
  if (!local) return `+${cc}`;
  return `+${cc}${local}`;
}

const SIGNUP_DEFAULT_VALUES = {
  full_name: "",
  company_name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
  country_code: "+263",
  owner_id_kind: "national_id",
  // 30 Oct 2026: optional owner business location → User.logistics_base
  business_base_address: "",
  business_base_coords: null,
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
  const [emailSuggestion, setEmailSuggestion] = useState("");
  const [ownerStep, setOwnerStep] = useState(1);
  const skipDocsRef = useRef(false);

  const roleCopy = ROLE_COPY[selectedRole] || ROLE_COPY[1];
  // doc 12 · 4.1: equipment owners give their real name and business name
  const isLogisticsSignup = Number(selectedRole) === Roles.LOGISTICS;
  const returnUrl = resolvePostAuthPath(query.get("returnUrl"));

  const formik = useFormik({
    initialValues: getSignupInitialValues(),
    validationSchema: Yup.object({
      full_name: isLogisticsSignup
        ? Yup.string().trim().max(80, "Keep it under 80 characters").required("Full name is required")
        : Yup.string(),
      company_name: isLogisticsSignup
        ? Yup.string().trim().max(80, "Keep it under 80 characters").required("Business name is required")
        : Yup.string(),
      email: Yup.string()
        .trim()
        .matches(EMAIL_PATTERN, "Enter a valid email address (e.g. name@gmail.com)")
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
      // Step 2 is optional, but once a document is chosen the required ones must all be there
      const skipped = skipDocsRef.current;
      skipDocsRef.current = false;
      if (isLogisticsSignup && !skipped && BUSINESS_DOC_NAMES.some((n) => values[n])) {
        const noDate = BUSINESS_DOCS.filter((d) => d.expiryRequired && values[d.name] && !values[`${d.name}_expires`]);
        if (noDate.length) {
          setOwnerStep(2);
          noDate.forEach((d) => {
            formik.setFieldTouched(d.name, true, false);
            formik.setFieldError(d.name, `${d.label}: pick the expiry date`);
          });
          return;
        }
        const missing = BUSINESS_DOCS.filter((d) => d.required && !values[d.name]);
        if (missing.length) {
          setOwnerStep(2);
          missing.forEach((d) => {
            formik.setFieldTouched(d.name, true, false);
            formik.setFieldError(d.name, `${d.label} is required — or remove the files and skip this step`);
          });
          return;
        }
      }
      // Genuine email (deliverable domain, no gmail.comcom-style typo) before
      // we offer to send an OTP to it
      setEmailSuggestion("");
      const check = await checkEmailRemote(values.email);
      if (!check.ok) {
        formik.setFieldTouched("email", true, false);
        formik.setFieldError("email", check.message || "Enter a valid email address");
        setEmailSuggestion(check.suggestion || "");
        return;
      }
      localStorage.setItem("signupFormData", JSON.stringify(withoutFiles(values)));
      setShowOtpModal(true);
    },
  });

  // Sign Up pressed on step 2 with a step-1 mistake → show step 1
  useEffect(() => {
    if (!isLogisticsSignup || ownerStep !== 2 || !formik.submitCount) return;
    if (STEP1_FIELDS.some((n) => formik.errors[n])) setOwnerStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.submitCount]);

  const goToDocsStep = async () => {
    const errors = await formik.validateForm();
    const bad = STEP1_FIELDS.filter((n) => errors[n]);
    if (bad.length) {
      bad.forEach((n) => formik.setFieldTouched(n, true, false));
      return;
    }
    setOwnerStep(2);
  };

  const skipDocsStep = () => {
    skipDocsRef.current = true;
    BUSINESS_DOC_NAMES.forEach((n) => formik.setFieldValue(n, undefined, false));
    formik.setErrors({});
    formik.submitForm();
  };

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
      roleKey === Roles.CUSTOMER ? "/sign-up" : `/sign-up?role=${roleKey}`;
    navigate(path, { replace: true });
  };

  const handleOtpTypeSelection = async (otpType) => {
    setSignupLoading(true);
    try {
      const deviceToken = await resolveWebDeviceToken(fcmToken);
      if (deviceToken) {
        localStorage.setItem("device_token", deviceToken);
        setFcmToken(deviceToken);
      }

      const payload = {
        email: String(formik.values.email || "").trim().toLowerCase(),
        country_code: formik.values.country_code || "+263",
        phone_number: formik.values.phone,
        password: formik.values.password,
        role: selectedRole,
        type: otpType,
        device_type: "web",
        device_token: deviceToken,
      };

      let logisticsBody = null;
      if (isLogisticsSignup) {
        // Multipart: the business documents go with the sign-up
        logisticsBody = new FormData();
        const fields = {
          ...payload,
          full_name: String(formik.values.full_name || "").trim(),
          company_name: String(formik.values.company_name || "").trim(),
          vertical: "both",
          owner_id_kind: formik.values.owner_id_kind || "national_id",
          // "0" = step 2 skipped: documents are uploaded after sign-up
          business_docs: BUSINESS_DOC_NAMES.some((n) => formik.values[n]) ? "1" : "0",
        };
        const baseCoords = formik.values.business_base_coords;
        if (Array.isArray(baseCoords) && baseCoords.length === 2) {
          fields.logistics_base = JSON.stringify({
            address: String(formik.values.business_base_address || "").trim(),
            lat: Number(baseCoords[1]),
            lng: Number(baseCoords[0]),
          });
        }
        Object.entries(fields).forEach(([k, v]) => {
          if (v !== undefined && v !== null) logisticsBody.append(k, v);
        });
        BUSINESS_DOCS.forEach((d) => {
          if (!formik.values[d.name]) return;
          logisticsBody.append(d.name, formik.values[d.name]);
          if (formik.values[`${d.name}_expires`]) logisticsBody.append(`${d.name}_expires`, formik.values[`${d.name}_expires`]);
        });
      }
      const response = isLogisticsSignup
        ? await dispatch(LogisticsActions.register(logisticsBody))
        : await dispatch(CustomerActions.createCustomer(payload));

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
    } catch (error) {
      toast.error(error?.message || "Registration failed. Please try again.");
    } finally {
      setSignupLoading(false);
    }
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
                {/* {Number(selectedRole) === Roles.LOGISTICS && (
                  <span className="brand-module">| Equipment/Logistic</span>
                )} */}
              </Link>

              <div
                className={`role-toggle${
                  ROLE_OPTIONS.length > 3 ? " role-toggle--quad" : ""
                }`}
              >
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
                {isLogisticsSignup ? (
                  <ol className="signup-steps" aria-label="Sign-up steps">
                    <li className={ownerStep === 1 ? "is-active" : "is-done"}>
                      <button type="button" onClick={() => setOwnerStep(1)} aria-current={ownerStep === 1 ? "step" : undefined}>
                        <span className="signup-steps__num">1</span>
                        Account details
                      </button>
                    </li>
                    <li className={ownerStep === 2 ? "is-active" : ""}>
                      <button type="button" onClick={goToDocsStep} aria-current={ownerStep === 2 ? "step" : undefined}>
                        <span className="signup-steps__num">2</span>
                        Business documents
                      </button>
                    </li>
                  </ol>
                ) : null}

                <div className="signup-step" data-step="1" hidden={isLogisticsSignup && ownerStep !== 1}>
                {isLogisticsSignup ? (
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="full_name">Full name</label>
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
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
                        </svg>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          autoComplete="name"
                          placeholder="Your real name"
                          value={formik.values.full_name}
                          onChange={(e) => formik.setFieldValue("full_name", titleCaseName(e.target.value))}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {fieldError("full_name")}
                    </div>

                    <div className="field">
                      <label htmlFor="company_name">Business name</label>
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
                          <rect x="3" y="7" width="18" height="14" rx="2" />
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <input
                          type="text"
                          id="company_name"
                          name="company_name"
                          autoComplete="organization"
                          placeholder="Company or trading name"
                          value={formik.values.company_name}
                          onChange={(e) => formik.setFieldValue("company_name", capitalizeWords(e.target.value))}
                          onBlur={formik.handleBlur}
                        />
                      </div>
                      {fieldError("company_name")}
                    </div>
                  </div>
                ) : null}


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
                      autoCapitalize="none"
                      value={formik.values.email}
                      onChange={(e) => formik.setFieldValue("email", e.target.value.toLowerCase())}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  {fieldError("email")}
                  {emailSuggestion ? (
                    <button
                      type="button"
                      className="email-suggestion"
                      onClick={() => {
                        formik.setFieldValue("email", emailSuggestion.toLowerCase());
                        formik.setFieldError("email", undefined);
                        setEmailSuggestion("");
                      }}
                    >
                      Use {emailSuggestion}
                    </button>
                  ) : null}
                </div>

                <div className="field signup-phone-field">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="input-shell">
                    <PhoneInput
                      defaultCountry={defaultPhoneCountry}
                      forceDialCode
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

                {isLogisticsSignup ? (
                  <button type="button" className="btn btn-ghost btn-block signup-step-next" onClick={goToDocsStep}>
                    Next: business documents
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                ) : null}
                </div>

                {isLogisticsSignup ? (
                  <div className="field log-signup-docs signup-step" data-step="2" hidden={ownerStep !== 2}>
                    <div className="signup-step-head">
                      <label>Business documents</label>
                      <button type="button" className="signup-step-skip" onClick={skipDocsStep} disabled={signupLoading}>
                        Skip for now
                      </button>
                    </div>
                    <div className="field signup-base-field">
                      <label>
                        Business location <span className="signup-optional">(optional)</span>
                      </label>
                      <LogisticsLocationField
                        address={formik.values.business_base_address}
                        coords={formik.values.business_base_coords}
                        title="Business location"
                        hint="Where your trucks / equipment are usually based. Search or pin it on the map."
                        chooseLabel="Choose your business location"
                        onChange={({ address, coords }) => {
                          formik.setFieldValue("business_base_address", address || "");
                          formik.setFieldValue("business_base_coords", coords || null);
                        }}
                      />
                      <p className="signup-field-hint">Where your trucks / equipment are usually based — new equipment starts here. You can change it later in your profile.</p>
                  </div>
                    <p className="log-signup-docs__note">
                      Simba checks these before approving your company. You can add equipment and operators once it&apos;s
                      approved. PDF, JPG, PNG or Word. You can skip this step and upload them after sign-up.
                    </p>
                    {BUSINESS_DOCS.map((d) => {
                      const file = formik.values[d.name];
                      return (
                        <div key={d.name} className="log-signup-doc" data-doc={d.name}>
                          <div className="log-signup-doc__head">
                            <span className="log-signup-doc__label">
                              {d.label}
                              {d.required ? <span className="log-signup-doc__req"> *</span> : <span className="log-signup-doc__opt"> (optional)</span>}
                            </span>
                            {d.name === "owner_id" ? (
                              <select
                                className="log-signup-doc__kind"
                                name="owner_id_kind"
                                aria-label="Type of ID"
                                value={formik.values.owner_id_kind || "national_id"}
                                onChange={formik.handleChange}
                              >
                                {OWNER_ID_KINDS.map((k) => (
                                  <option key={k.value} value={k.value}>
                                    {k.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                          <label className={`log-signup-doc__pick${file ? " has-file" : ""}`}>
                            <input
                              type="file"
                              id={`biz-${d.name}`}
                              name={d.name}
                              accept={`${DOC_ACCEPT},.doc,.docx`}
                              hidden
                              onChange={(e) => {
                                const [f] = keepAllowedFiles(e.target.files);
                                if (f) {
                                  skipDocsRef.current = false;
                                  formik.setFieldValue(d.name, f);
                                  formik.setFieldTouched(d.name, true, false);
                                }
                                e.target.value = "";
                              }}
                            />
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              {file ? <path d="M20 6 9 17l-5-5" /> : <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></>}
                            </svg>
                            <span className="log-signup-doc__file">{file ? file.name : d.hint ? `Upload — ${d.hint}` : "Upload file"}</span>
                            {file ? <span className="log-signup-doc__change">Change</span> : null}
                          </label>
                          {file ? (
                            <label className="log-signup-doc__expiry">
                              <span>{d.expiryRequired ? "Expiry date *" : "Expiry date (optional)"}</span>
                              <input
                                type="date"
                                name={`${d.name}_expires`}
                                min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)}
                                value={formik.values[`${d.name}_expires`] || ""}
                                onChange={formik.handleChange}
                              />
                            </label>
                          ) : null}
                          {file && !d.required ? (
                            <button type="button" className="log-signup-doc__remove" onClick={() => formik.setFieldValue(d.name, undefined)}>
                              Remove
                            </button>
                          ) : null}
                          {(formik.touched[d.name] || formik.submitCount > 0) && formik.errors[d.name] ? (
                            <div className="field-error">{formik.errors[d.name]}</div>
                          ) : null}
                        </div>
                      );
                    })}
                    <button type="button" className="signup-step-back" onClick={() => setOwnerStep(1)}>
                      ← Back to account details
                    </button>
                  </div>
                ) : null}

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
                <AppleSignInButton
                  role={selectedRole}
                  disabled={signupLoading}
                  label="Sign up with Apple"
                  showDivider={isGoogleLoginDisabled() && !isAppleLoginDisabled()}
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
