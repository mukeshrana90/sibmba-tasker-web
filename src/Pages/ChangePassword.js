import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";

import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import eyeOpenIcon from "../Assets/Images/eye-fill.svg";
import eyeClosedIcon from "../Assets/Images/eye-off-fill.svg";

export default function ChangePassword() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role")
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordShow, setPasswordShow] = useState({
    current: false,
    new: false,
    confime: false,
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
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setIsLoading(true);
      let payload = {
        old_password: values?.currentPassword,
        new_password: values?.newPassword,
        confirm_password: values?.confirmPassword,
      };
      const apiRes = await dispatch(CustomerActions?.changePassword(payload));
      if (apiRes?.payload?.success) {
        toast.success(apiRes?.payload?.message);
        if(role == 2){
          navigate(`/requests`)
        } else {
          navigate(`/`)
        }

      } else {
        toast.error(apiRes?.payload?.message);
      }
      resetForm();
      setIsLoading(false);
    },
  });

  return (
    <Layout>
      <section className="contact-us-sec">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto">
              <div className="contact-us-box">
                <h2 className="mb-4">Change Password</h2>
                {/* <p>We’d love to hear from you. Please fill out this form.</p> */}
                <Form onSubmit={formik.handleSubmit}>
                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Current Password</Form.Label>
                    <div className="eye-ad-icon">
                      <Form.Control
                        type={passwordShow.current ? "text" : "password"}
                        name="currentPassword"
                        placeholder="Enter your current password"
                        value={formik.values.currentPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <img
                        src={passwordShow.current ? eyeClosedIcon : eyeOpenIcon}
                        alt="Toggle password visibility"
                        onClick={() =>
                          setPasswordShow({
                            ...passwordShow,
                            current: !passwordShow.current,
                          })
                        }
                        className="password-toggle-icon"
                      />

                      {/* <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="14"
                        viewBox="0 0 20 14"
                        fill="none"
                      >
                        <path
                          d="M0 6.25816C0.29217 5.47771 0.868981 4.8909 1.41115 4.28339C2.03917 3.57981 2.76207 2.97378 3.54068 2.43426C3.58135 2.40618 3.6205 2.37218 3.67472 2.32932C3.29068 1.95683 2.91116 1.59765 2.54369 1.22812C2.27562 0.957626 2.26658 0.552621 2.50152 0.267345C2.72441 -0.00315094 3.12954 -0.0814912 3.43677 0.0929267C3.5196 0.140226 3.5949 0.206742 3.66267 0.273257C7.13408 3.67736 10.604 7.08442 14.0739 10.49C14.8239 11.2261 15.5739 11.9637 16.3254 12.6968C16.5393 12.9053 16.6522 13.1432 16.5784 13.4389C16.4399 13.9991 15.7576 14.1897 15.3314 13.7803C14.7636 13.2349 14.2049 12.6821 13.6477 12.1263C13.5618 12.042 13.491 12.0273 13.3766 12.0627C10.1748 13.0545 7.13559 12.6673 4.25906 11C2.63857 10.0569 1.32079 8.79313 0.263556 7.26475C0.150603 7.0992 0.0873499 6.90114 0 6.71785C0 6.56413 0 6.41188 0 6.25816ZM6.17172 4.79038C5.40666 6.36162 5.8404 8.36743 7.16269 9.53958C8.55126 10.7709 10.4669 10.8595 11.72 10.2358C11.348 9.87215 10.9835 9.51001 10.613 9.15527C10.5814 9.12423 10.5091 9.12718 10.4549 9.1257C10.1371 9.11979 9.81181 9.16413 9.50458 9.10797C8.03168 8.83304 7.12354 7.56629 7.30426 6.08226C7.31179 6.0187 7.31932 5.92558 7.28318 5.88863C6.92324 5.52205 6.55275 5.16583 6.17172 4.79038Z"
                          fill="#888888"
                        />
                        <path
                          d="M6.47745 0.960582C7.76963 0.518625 9.06933 0.341251 10.4007 0.38855C12.7154 0.469847 14.7802 1.24438 16.6447 2.56582C17.8646 3.43052 18.8857 4.48737 19.7336 5.70682C20.0724 6.1946 20.092 6.7415 19.7697 7.2145C18.8601 8.55219 17.7275 9.67704 16.3811 10.595C16.3661 10.6053 16.348 10.6127 16.3209 10.626C16.2757 10.5846 16.2275 10.5432 16.1823 10.5004C15.4459 9.77755 14.7124 9.0518 13.97 8.33639C13.8555 8.22553 13.8525 8.14276 13.9067 8.00825C14.9911 5.29886 12.988 2.38401 10.0227 2.3574C9.47144 2.35297 8.9353 2.45052 8.42626 2.6619C8.29523 2.71659 8.22144 2.69294 8.12656 2.59834C7.62505 2.09725 7.11601 1.60208 6.60998 1.10544C6.57082 1.06405 6.53317 1.02118 6.47745 0.960582Z"
                          fill="#888888"
                        />
                        <path
                          d="M12.6492 6.98539C11.598 5.95366 10.5422 4.9175 9.49102 3.88578C10.0754 3.62415 11.2576 3.96412 11.9037 4.57606C12.6672 5.29886 12.854 6.41927 12.6492 6.98539Z"
                          fill="#888888"
                        />
                      </svg> */}

                      {formik.touched.currentPassword &&
                        formik.errors.currentPassword && (
                          <div className="text-danger mt-1">
                            {formik.errors.currentPassword}
                          </div>
                        )}
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>New Password</Form.Label>
                    <div className="eye-ad-icon">
                      <Form.Control
                        type={passwordShow.new ? "text" : "password"}
                        name="newPassword"
                        placeholder="Enter your new password"
                        value={formik.values.newPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />

                      <img
                        src={passwordShow.new ? eyeClosedIcon : eyeOpenIcon}
                        alt="Toggle password visibility"
                        onClick={() =>
                          setPasswordShow({
                            ...passwordShow,
                            new: !passwordShow.new,
                          })
                        }
                        className="password-toggle-icon"
                      />

                      {/* <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="14"
                        viewBox="0 0 20 14"
                        fill="none"
                      >
                        <path
                          d="M0 6.25816C0.29217 5.47771 0.868981 4.8909 1.41115 4.28339C2.03917 3.57981 2.76207 2.97378 3.54068 2.43426C3.58135 2.40618 3.6205 2.37218 3.67472 2.32932C3.29068 1.95683 2.91116 1.59765 2.54369 1.22812C2.27562 0.957626 2.26658 0.552621 2.50152 0.267345C2.72441 -0.00315094 3.12954 -0.0814912 3.43677 0.0929267C3.5196 0.140226 3.5949 0.206742 3.66267 0.273257C7.13408 3.67736 10.604 7.08442 14.0739 10.49C14.8239 11.2261 15.5739 11.9637 16.3254 12.6968C16.5393 12.9053 16.6522 13.1432 16.5784 13.4389C16.4399 13.9991 15.7576 14.1897 15.3314 13.7803C14.7636 13.2349 14.2049 12.6821 13.6477 12.1263C13.5618 12.042 13.491 12.0273 13.3766 12.0627C10.1748 13.0545 7.13559 12.6673 4.25906 11C2.63857 10.0569 1.32079 8.79313 0.263556 7.26475C0.150603 7.0992 0.0873499 6.90114 0 6.71785C0 6.56413 0 6.41188 0 6.25816ZM6.17172 4.79038C5.40666 6.36162 5.8404 8.36743 7.16269 9.53958C8.55126 10.7709 10.4669 10.8595 11.72 10.2358C11.348 9.87215 10.9835 9.51001 10.613 9.15527C10.5814 9.12423 10.5091 9.12718 10.4549 9.1257C10.1371 9.11979 9.81181 9.16413 9.50458 9.10797C8.03168 8.83304 7.12354 7.56629 7.30426 6.08226C7.31179 6.0187 7.31932 5.92558 7.28318 5.88863C6.92324 5.52205 6.55275 5.16583 6.17172 4.79038Z"
                          fill="#888888"
                        />
                        <path
                          d="M6.47745 0.960582C7.76963 0.518625 9.06933 0.341251 10.4007 0.38855C12.7154 0.469847 14.7802 1.24438 16.6447 2.56582C17.8646 3.43052 18.8857 4.48737 19.7336 5.70682C20.0724 6.1946 20.092 6.7415 19.7697 7.2145C18.8601 8.55219 17.7275 9.67704 16.3811 10.595C16.3661 10.6053 16.348 10.6127 16.3209 10.626C16.2757 10.5846 16.2275 10.5432 16.1823 10.5004C15.4459 9.77755 14.7124 9.0518 13.97 8.33639C13.8555 8.22553 13.8525 8.14276 13.9067 8.00825C14.9911 5.29886 12.988 2.38401 10.0227 2.3574C9.47144 2.35297 8.9353 2.45052 8.42626 2.6619C8.29523 2.71659 8.22144 2.69294 8.12656 2.59834C7.62505 2.09725 7.11601 1.60208 6.60998 1.10544C6.57082 1.06405 6.53317 1.02118 6.47745 0.960582Z"
                          fill="#888888"
                        />
                        <path
                          d="M12.6492 6.98539C11.598 5.95366 10.5422 4.9175 9.49102 3.88578C10.0754 3.62415 11.2576 3.96412 11.9037 4.57606C12.6672 5.29886 12.854 6.41927 12.6492 6.98539Z"
                          fill="#888888"
                        />
                      </svg> */}

                      {formik.touched.newPassword &&
                        formik.errors.newPassword && (
                          <div className="text-danger mt-1">
                            {formik.errors.newPassword}
                          </div>
                        )}
                    </div>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Confirm Password</Form.Label>
                    <div className="eye-ad-icon">
                      <Form.Control
                        type={passwordShow.confime ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Re-enter your password"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                      />
                      <img
                        src={passwordShow.confime ? eyeClosedIcon : eyeOpenIcon}
                        alt="Toggle password visibility"
                        onClick={() =>
                          setPasswordShow({
                            ...passwordShow,
                            confime: !passwordShow.confime,
                          })
                        }
                        className="password-toggle-icon"
                      />

                      {/* <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="14"
                        viewBox="0 0 20 14"
                        fill="none"
                      >
                        <path
                          d="M0 6.25816C0.29217 5.47771 0.868981 4.8909 1.41115 4.28339C2.03917 3.57981 2.76207 2.97378 3.54068 2.43426C3.58135 2.40618 3.6205 2.37218 3.67472 2.32932C3.29068 1.95683 2.91116 1.59765 2.54369 1.22812C2.27562 0.957626 2.26658 0.552621 2.50152 0.267345C2.72441 -0.00315094 3.12954 -0.0814912 3.43677 0.0929267C3.5196 0.140226 3.5949 0.206742 3.66267 0.273257C7.13408 3.67736 10.604 7.08442 14.0739 10.49C14.8239 11.2261 15.5739 11.9637 16.3254 12.6968C16.5393 12.9053 16.6522 13.1432 16.5784 13.4389C16.4399 13.9991 15.7576 14.1897 15.3314 13.7803C14.7636 13.2349 14.2049 12.6821 13.6477 12.1263C13.5618 12.042 13.491 12.0273 13.3766 12.0627C10.1748 13.0545 7.13559 12.6673 4.25906 11C2.63857 10.0569 1.32079 8.79313 0.263556 7.26475C0.150603 7.0992 0.0873499 6.90114 0 6.71785C0 6.56413 0 6.41188 0 6.25816ZM6.17172 4.79038C5.40666 6.36162 5.8404 8.36743 7.16269 9.53958C8.55126 10.7709 10.4669 10.8595 11.72 10.2358C11.348 9.87215 10.9835 9.51001 10.613 9.15527C10.5814 9.12423 10.5091 9.12718 10.4549 9.1257C10.1371 9.11979 9.81181 9.16413 9.50458 9.10797C8.03168 8.83304 7.12354 7.56629 7.30426 6.08226C7.31179 6.0187 7.31932 5.92558 7.28318 5.88863C6.92324 5.52205 6.55275 5.16583 6.17172 4.79038Z"
                          fill="#888888"
                        />
                        <path
                          d="M6.47745 0.960582C7.76963 0.518625 9.06933 0.341251 10.4007 0.38855C12.7154 0.469847 14.7802 1.24438 16.6447 2.56582C17.8646 3.43052 18.8857 4.48737 19.7336 5.70682C20.0724 6.1946 20.092 6.7415 19.7697 7.2145C18.8601 8.55219 17.7275 9.67704 16.3811 10.595C16.3661 10.6053 16.348 10.6127 16.3209 10.626C16.2757 10.5846 16.2275 10.5432 16.1823 10.5004C15.4459 9.77755 14.7124 9.0518 13.97 8.33639C13.8555 8.22553 13.8525 8.14276 13.9067 8.00825C14.9911 5.29886 12.988 2.38401 10.0227 2.3574C9.47144 2.35297 8.9353 2.45052 8.42626 2.6619C8.29523 2.71659 8.22144 2.69294 8.12656 2.59834C7.62505 2.09725 7.11601 1.60208 6.60998 1.10544C6.57082 1.06405 6.53317 1.02118 6.47745 0.960582Z"
                          fill="#888888"
                        />
                        <path
                          d="M12.6492 6.98539C11.598 5.95366 10.5422 4.9175 9.49102 3.88578C10.0754 3.62415 11.2576 3.96412 11.9037 4.57606C12.6672 5.29886 12.854 6.41927 12.6492 6.98539Z"
                          fill="#888888"
                        />
                      </svg> */}

                      {formik.touched.confirmPassword &&
                        formik.errors.confirmPassword && (
                          <div className="text-danger mt-1">
                            {formik.errors.confirmPassword}
                          </div>
                        )}
                    </div>
                  </Form.Group>

                  <div className="contact-action-btn">
                    <button
                      variant="primary"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? "Updating..." : "Change Password"}
                    </button>
                  </div>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
