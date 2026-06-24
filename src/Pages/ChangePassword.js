import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import ButtonLoader from "../CommanComponents/ButtonLoader";

function LockIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.2A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 11s3.5 7 10 7a9.5 9.5 0 0 0 4.2-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function PasswordField({ label, name, placeholder, formik, show, onToggle }) {
  const touched = formik.touched[name];
  const error = formik.errors[name];

  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="input-shell">
        <LockIcon />
        <input
          id={name}
          type={show ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        />
        <button type="button" className="toggle-eye" onClick={onToggle} aria-label="Toggle password visibility">
          {show ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      </div>
      {touched && error && <div className="field-error">{error}</div>}
    </div>
  );
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordShow, setPasswordShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string()
        .required("Current password is required")
        .min(6, "Password must be at least 6 characters"),
      newPassword: Yup.string()
        .required("New password is required")
        .min(6, "Password must be at least 6 characters"),
      confirmPassword: Yup.string()
        .required("Confirm password is required")
        .oneOf([Yup.ref("newPassword")], "Passwords must match"),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsLoading(true);
      const payload = {
        old_password: values.currentPassword,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword,
      };
      const apiRes = await dispatch(CustomerActions.changePassword(payload));
      if (apiRes?.payload?.success) {
        toast.success(apiRes?.payload?.message);
        if (role === "2") {
          navigate("/requests");
        } else {
          navigate("/");
        }
        resetForm();
      } else {
        toast.error(apiRes?.payload?.message);
      }
      setIsLoading(false);
    },
  });

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-changepassword">
        <main className="page">
          <div className="wrap">
            <div className="page-head">
              <h1>Change Password</h1>
              <p>Update your password to keep your account secure.</p>
            </div>

            <div className="form-card">
              <form onSubmit={formik.handleSubmit} noValidate>
                <PasswordField
                  label="Current password"
                  name="currentPassword"
                  placeholder="Enter your current password"
                  formik={formik}
                  show={passwordShow.current}
                  onToggle={() =>
                    setPasswordShow((s) => ({ ...s, current: !s.current }))
                  }
                />
                <PasswordField
                  label="New password"
                  name="newPassword"
                  placeholder="Enter your new password"
                  formik={formik}
                  show={passwordShow.new}
                  onToggle={() =>
                    setPasswordShow((s) => ({ ...s, new: !s.new }))
                  }
                />
                <PasswordField
                  label="Confirm password"
                  name="confirmPassword"
                  placeholder="Re-enter your new password"
                  formik={formik}
                  show={passwordShow.confirm}
                  onToggle={() =>
                    setPasswordShow((s) => ({ ...s, confirm: !s.confirm }))
                  }
                />

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={isLoading}
                >
                  {isLoading ? <ButtonLoader /> : "Change password"}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
