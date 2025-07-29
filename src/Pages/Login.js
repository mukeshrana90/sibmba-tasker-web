import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import eyeOpenIcon from "../Assets/Images/eye-fill.svg";
import eyeClosedIcon from "../Assets/Images/eye-off-fill.svg";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import { emit } from "../utils/socketService";
import { getFirebaseToken } from "../utils/fireBaseConfig";
import { expiresAt } from "../utils/CommonFunction";
import { Roles } from "../utils/Roles";

export default function Login() {
  const [fcmToken, setFcmToken] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [localLoading, setLocalLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    const handleGetFirebaseToken = async () => {
      try {
        const token = await getFirebaseToken();
        setFcmToken(token);
      } catch (error) {
        console.error("An error occurred while retrieving the Firebase token: ", error);
      }
    };

    handleGetFirebaseToken();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
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

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validateForm()) return;

  //   let payload = formData;
  //   if (fcmToken) {
  //     payload = { ...payload, device_token: fcmToken };
  //   }
  //   setLocalLoading(true);
  //   const response = await dispatch(CustomerActions.loginCustomer(payload));
  //   if (response?.payload?.status_code === 200) {
  //     if (response?.payload?.data?.email_verified == 0) {
  //       navigate(`/otp-verification?userId=${response?.payload?.data?._id}`, { replace: true });
  //       toast.success(response?.payload?.message);
  //     } else if (response?.payload?.data?.is_completeProfile == 0 && response?.payload?.data?.role == 1) {
  //       localStorage.setItem("temptoken", response?.payload?.data?.token);
  //       localStorage.setItem("userId", response?.payload?.data?._id);
  //       navigate("/complete-profile", { replace: true });
  //       toast.success("Please Complete Your Profile.");
  //     } else if (response?.payload?.data?.is_completeProfile == 0 && response?.payload?.data?.role == 2) {
  //       localStorage.setItem("temptoken", response?.payload?.data?.token);
  //       localStorage.setItem("userId", response?.payload?.data?._id);
  //       navigate("/provider", { replace: true });
  //       toast.success("Please Complete Your Profile.");
  //     } else {
  //       localStorage.removeItem("temptoken");
  //       localStorage.setItem("token", response?.payload?.data?.token);
  //       localStorage.setItem("userId", response?.payload?.data?._id);
  //       localStorage.setItem("role", response?.payload?.data?.role);
  //       if (response?.payload?.data?.role == 1) {
  //         emit('new_user_connect', { userid: response?.payload?.data?._id });
  //         navigate("/");
  //       } else {
  //         navigate("/requests");
  //         emit('new_user_connect', { userid: response?.payload?.data?._id });
  //       }
  //       toast.success(response?.payload?.message);
  //     }
  //   } else {
  //     toast.error(response?.payload?.message);
  //   }
  //   setLocalLoading(false);
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
  
    let payload = formData;
    if (fcmToken) {
      payload = { ...payload, device_token: fcmToken };
    }
    setLocalLoading(true);
    const response = await dispatch(CustomerActions.loginCustomer(payload));
  
    if (response?.payload?.status_code === 200) {
      const token = response?.payload?.data?.token;
      const userId = response?.payload?.data?._id;
      const role = response?.payload?.data?.role;
  
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userId);
      localStorage.setItem("role", role);
      localStorage.setItem("expiresAt", expiresAt);
  
      if (response?.payload?.data?.email_verified == 0) {
        navigate(`/otp-verification?userId=${userId}`, { replace: true });
        toast.success(response?.payload?.message);
      } else if (response?.payload?.data?.is_completeProfile == 0 && role == Roles.CUSTOMER) {
        localStorage.setItem("temptoken", token);
        localStorage.setItem("userId", userId);
        navigate("/complete-profile", { replace: true });
        toast.success("Please Complete Your Profile.");
      } else if (response?.payload?.data?.is_completeProfile === 0) {
        if(role == Roles.SERVICE_PROVIDER || role == Roles.CORPORATE ){
        localStorage.setItem("temptoken", token);
        localStorage.setItem("userId", userId);
        navigate(`/provider?role=${role}`, { replace: true });
        toast.success("Please Complete Your Profile.");
        }
      }  else {
        localStorage.removeItem("temptoken");
        if (role == Roles.CUSTOMER) {
          emit("new_user_connect", { userid: userId });
          navigate("/");
        } else if (role ==  Roles.SERVICE_PROVIDER) {
          navigate("/requests");
          emit("new_user_connect", { userid: userId });
        } else if (role == Roles.CORPORATE) {
          navigate("/corporate");
          emit("new_user_connect", { userid: userId });
        }
        toast.success(response?.payload?.message);
      }
    } else {
      toast.error(response?.payload?.message);
    }
    setLocalLoading(false);
  };
  

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
    return false;
  }

  return true;
};

useEffect(() => {
  if (!isTokenValid()) {
    navigate("/login");
  }
}, []);


  return (
    <div className="p-3">
      {/* <Container fluid>
        <Row>
          <Col lg={12}>
            <div className="logo">
              <img src={require("../Assets/Images/Logo.svg").default} />
            </div>
          </Col>
        </Row>
      </Container> */}
      <Container fluid className="">
        <div className="row  sign-banner-part">
          <Col lg={6} className="p-0">
            <div className="left-banner-img"></div>
          </Col>
          <Col lg={6}>
            <div className="right-banner-part">
              <div className="login-cmn-box">
                <div className="login-box-inner-wrap">
                  <div className="login-logo cursor-pointer"  onClick={() => navigate("/")}>
                    {" "}
                    <img src={require("../Assets/Images/dark-logo.png")} />
                  </div>
                  <h2>Welcome back!</h2>
                  <p>Login to pick up exactly where you left off.</p>
                  <Form onSubmit={handleSubmit}>
                    <div className="form-set">
                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Email ID</Form.Label>
                        <Form.Control
                          type="email"
                          placeholder="Email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                        // autoComplete="off"
                        // readOnly={isReadOnly}
                        // onFocus={() => setReadOnly(false)}
                        />
                      </Form.Group>

                      <Form.Group
                        className="mb-3 pass-eys"
                        controlId="formBasicPassword"
                      >
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="password-input"
                        />
                        <img
                          src={showPassword ? eyeClosedIcon : eyeOpenIcon}
                          alt="Toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          className="password-toggle-icon"
                        />
                        {/* <img
                          src={require("../Assets/Images/eye.svg").default}
                        /> */}
                      </Form.Group>
                    </div>
                    <div className="pass-rember-line">
                      <Link to="/forgot-password" className="forgot">
                        Forgot Password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      className="submit"
                      disabled={localLoading}
                    >
                      {localLoading ? <ButtonLoader /> : "Login"}
                    </button>
                    {/* <Link
                      to="/otp-varification"
                      variant="primary"
                      type="submit"
                      className="submit"
                    >
                    </Link> */}
                    {/* <div className="or-divider">
                      <p>or</p>
                    </div>
                    <div className="sign-social-links">
                      <button>
                        <img
                          src={
                            require("../Assets/Images/android-icon.svg").default
                          }
                        />
                        Continue with Google
                      </button>
                      <button>
                        {" "}
                        <img
                          src={require("../Assets/Images/ios-icon.svg").default}
                        />
                        Continue with Apple
                      </button>
                    </div> */}
                    <div className="alreadyac-txt-line">
                      <p>
                        Don't have an account?{" "}
                        <Link to="/sign-up" className="login-link-txt">
                          Sign Up{" "}
                        </Link>
                      </p>
                    </div>

                    <div className="alreadyac-txt-line">
                      <p>
                        Want to join as a service provider?{" "} 
                        <Link to="/sign-up?role=2" className="login-link-txt">
                           Register here{" "}
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
    </div>
  );
}
