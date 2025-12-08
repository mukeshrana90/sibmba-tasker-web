import  { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import eyeOpenIcon from "../Assets/Images/eye-fill.svg";
import eyeClosedIcon from "../Assets/Images/eye-off-fill.svg";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useQuery } from "../utils/CommonFunction";
import OtpSelectionModal from "../CommanComponents/Modals/OtpSelectionModal";
import { toast } from "react-toastify";

export default function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const query = useQuery();
  const role = query.get("role");
  const [localLoading, setLocalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
      country_code: "+91",
    },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email address").required("Email is Required"),
      phone: Yup.string().required("Phone Number is Required"),
      password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .required("Password is Required"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("password"), null], "Passwords must match")
        .required("Confirm password is Required"),
      terms: Yup.boolean().oneOf([true], "You must accept the terms"),
    }),
    onSubmit: async (values) => {
      if (!formik.isValid) {
        return;
      }
      localStorage.setItem("signupFormData", JSON.stringify(values));
      setShowOtpModal(true);
    },
  });

  const handlePhoneChange = (value, country) => {
    formik.setFieldValue("country_code", `+${country.dialCode}`);
    formik.setFieldValue("phone", value.slice(country.dialCode.length));

    // setFormData((prevState) => ({
    //   ...prevState,
    //   phoneNumber: value.slice(country.dialCode.length),
    //   countryCode: `+${country.dialCode}`,
    //   country: country.name,
    // }));
  };

  useEffect(() => {
    const savedData = localStorage.getItem("signupFormData");
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      formik.setValues(parsedData);
    }
  }, []);

  const handleOtpTypeSelection = async (otpType) => {
    setSignupLoading(true);
    const payload = {
      email: formik.values.email,
      country_code: formik.values.country_code || "+91",
      phone_number: formik.values.phone,
      password: formik.values.password,
      role: Number(role) || 1,
      type: otpType,
    };
    const response = await dispatch(CustomerActions.createCustomer(payload));
    if (response?.payload?.status_code === 200) {
      toast.success(response?.payload?.message || "Registration successful");
      setShowOtpModal(false);
      navigate(
        `/otp-varification?userId=${response?.payload?.data?._id}&role=${role || 1}&otpType=${otpType}`
      );
    } else {
      toast.error(response?.payload?.message || "Registration failed");
      if (response?.payload?.status_code === 400) {
        setShowOtpModal(false);
      }
    }
    setSignupLoading(false);
  };

  return (
    <div className="p-3">
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={6} className="p-0">
            <div className="signUp-banner-img"></div>
          </Col>
          <Col lg={6}>
            <div className="right-banner-part">
              <div className="login-cmn-box">
                <div className="login-box-inner-wrap">
                  <div className="login-logo cursor-pointer" onClick={() => navigate("/")}>
                    {" "}
                    <img src={require("../Assets/Images/dark-logo.png")} />
                  </div>
                  <h2>{role == 2 ? "Sign up as a Service Provider" : "Sign up"}</h2>
                  <p className="mb-0">
                  Provide Trusted Services to Our Users
                  </p>
                  <Form onSubmit={formik.handleSubmit}>
                    <div className="form-set">
                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Email ID</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          placeholder="Enter your Email"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        {formik.touched.email && formik.errors.email && (
                          <div className="text-danger mt-1">
                            {formik.errors.email}
                          </div>
                        )}
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Phone Number</Form.Label>
                        <PhoneInput
                          country={"in"}
                          value={`${formik.values.country_code}${formik.values.phone}`}
                          // onChange={(phone) =>
                          //   formik.setFieldValue("phone", phone)
                          // }
                          onChange={handlePhoneChange}
                          inputProps={{
                            name: "phone",
                            required: true,
                            className: "form-control",
                          }}
                          containerClass="phone-input-container"
                          buttonClass="country-dropdown"
                        // onBlur={() => formik.setFieldTouched("phone", true)}
                        />
                        {formik.touched.phone && formik.errors.phone && (
                          <div className="text-danger mt-1">
                            {formik.errors.phone}
                          </div>
                        )}
                      </Form.Group>
                      <Form.Group
                        className="mb-3 pass-eys"
                        controlId="formBasicPassword"
                      >
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          className="password-input"
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter your Password"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        <img
                          src={showPassword ? eyeClosedIcon : eyeOpenIcon}
                          alt="Toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          className="password-toggle-icon"
                        />
                        {formik.touched.password && formik.errors.password && (
                          <div className="text-danger mt-1">
                            {formik.errors.password}
                          </div>
                        )}
                      </Form.Group>
                      <Form.Group
                        className="mb-3 pass-eys"
                        controlId="formBasicPassword"
                      >
                        <Form.Label>Confirm Password</Form.Label>
                        <Form.Control
                          className="password-input"
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Re-Enter your Password"
                          value={formik.values.confirmPassword}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        />
                        <img
                          src={
                            showConfirmPassword ? eyeClosedIcon : eyeOpenIcon
                          }
                          alt="Toggle password visibility"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="password-toggle-icon"
                        />
                        {formik.touched.confirmPassword &&
                          formik.errors.confirmPassword && (
                            <div className="text-danger mt-1">
                              {formik.errors.confirmPassword}
                            </div>
                          )}
                      </Form.Group>
                    </div>
                    <div className="remember-check">
                      <Form.Check
                        type="checkbox"
                        class="red"
                        id="filled-in-box"
                        name="terms"
                        checked={formik.values.terms}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        // isInvalid={formik.touched.terms && formik.errors.terms}
                        feedback={formik.errors.terms}
                        feedbackType="invalid"
                      />
                      {/* <input type="checkbox" class="red" id="filled-in-box" /> */}
                      <Form.Label>
                        I have read and agreed to the{" "}
                        <a
                          href="https://simbatasker.com/terms-and-conditions"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="login-link-txt"
                        >
                          Terms and Conditions of Service
                        </a>
                        {/* <Link
                          to={`https://simbatasker.com/terms-and-conditions`}
                          className="login-link-txt"
                        ></Link> */}
                      </Form.Label>
                    </div>
                    {formik.touched.terms && formik.errors.terms && (
                      <div className="text-danger mt-1">
                        {formik.errors.terms}
                      </div>
                    )}

                    <button
                      type="submit"
                      variant="primary"
                      className="submit forgot-btn"
                      disabled={localLoading}
                    >
                      {localLoading ? <ButtonLoader /> : "Sign Up"}
                    </button>

                    <div className="alreadyac-txt-line">
                      <p>
                        Already have an account?{" "}
                        <Link to="/login" className="login-link-txt">
                          Log In
                        </Link>
                      </p>
                    </div>
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
        email={formik.values.email}
        phoneNumber={`${formik.values.country_code}${formik.values.phone}`}
        onSelect={handleOtpTypeSelection}
        isLoading={signupLoading}
      />
    </div>
  );
}
