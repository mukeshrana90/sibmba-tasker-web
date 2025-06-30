import React, { useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import AddressAutocomplete from "../CommanComponents/AddressAutocomplete";
import defaultSilhouette from "../Assets/Images/silhotte.svg";
import ButtonLoader from "../CommanComponents/ButtonLoader";

export default function CompleteProfile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoader, setIsLoading] = useState(false);
  const profileInputRef = useRef(null);

  const [previews, setPreviews] = useState({
    profile_image: "",
  });

  const handlePlaceSelect = (place, setFieldValue, setFieldTouched, values) => {
    const addressComponents = place.address_components;
    const geometry = place.geometry.location;
    let streetNumber = "";
    let route = "";
    let suburb = "";
    let city = "";
    let country = "";
    let postalCode = "";

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes("street_number")) streetNumber = component.long_name;
      if (types.includes("route")) route = component.long_name;
      if (types.includes("locality") || types.includes("sublocality"))
        suburb = component.long_name;
      if (types.includes("administrative_area_level_1"))
        city = component.long_name;
      if (types.includes("country")) country = component.long_name;
      if (types.includes("postal_code")) postalCode = component.long_name;
    });

    setFieldValue("address", route || "");
    if (!values.house_number || !values.house_number.trim()) {
      setFieldValue("house_number", streetNumber || "");
    }
    setFieldValue("suburbs", suburb || city);
    setFieldValue("country", country);
    setFieldValue("post_code", postalCode);
    setFieldValue("lat", geometry.lat());
    setFieldValue("long", geometry.lng());
    setFieldTouched("address", true);
    if (streetNumber) {
      setFieldTouched("house_number", true);
    }
  };

  const formik = useFormik({
    initialValues: {
      full_name: "",
      house_number: "",
      address: "",
      suburbs: "",
      country: "",
      post_code: "",
      landMark: "",
    },
    validationSchema: Yup.object({
      full_name: Yup.string().required("Full Name is required"),
      house_number: Yup.string().required("House Number is required"),
      suburbs: Yup.string().required("Suburbs is required"),
      country: Yup.string().required("Country is required"),
      post_code: Yup.string().required("Post Code or PO Box is required"),
    }),
    onSubmit: async (values) => {
      console.log("Form Submitted", values);
      if (!values?.profile_image) {
        return toast.warn("Please add profile image");
      }
      if (!values?.address) {
        return toast.warn("Please add street address");
      }
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (values[key] instanceof File && values[key]) {
          formData.append(key, values[key]);
        } else if (values[key]) {
          formData.append(key, values[key]);
        }
      });
      formData.append("is_completeProfile", 1);
      setIsLoading(true);
      const apiRes = await dispatch(CustomerActions.createProfile(formData));
      if (apiRes?.payload?.success) {
        toast.success(apiRes?.payload?.message);
        let temptokenVal = localStorage.getItem("temptoken");
        localStorage.setItem("token", temptokenVal);
        localStorage.setItem("role", 1);        // changed
        localStorage.removeItem("temptoken");
        navigate(`/`, { replace: true });
      } else {
        toast.error(apiRes?.payload?.message);
      }
      setIsLoading(false);
    },
  });

  const triggerFileInput = (fieldName, index = null) => {
    const inputRefs = {
      profile_image: profileInputRef,
    };
    if (inputRefs[fieldName]?.current) {
      inputRefs[fieldName].current.value = null;
      inputRefs[fieldName].current.click();
    }
  };

  const handleFileChange = (
    event,
    setFieldValue,
    fieldName,
    values,
    isMultiple = false,
    index = null
  ) => {
    const files = event.target.files;
    if (files.length === 0) return;

    if (isMultiple && index !== null) {
      const validFiles = Array.from(files).filter(
        (file) => file.size <= 10 * 1024 * 1024
      );
      if (validFiles.length < files.length) {
        toast.error("Some files exceed the 10 MB limit and were not added.");
      }
      const currentFiles = [...(values[fieldName] || [])];
      const newFiles = validFiles.slice(0, 1);
      currentFiles[index] = newFiles[0];
      const updatedFiles = currentFiles.slice(0, 3);
      setFieldValue(fieldName, updatedFiles);
      const newPreviews = updatedFiles.map((file) =>
        file ? URL.createObjectURL(file) : ""
      );
      setPreviews((prev) => ({ ...prev, [fieldName]: newPreviews }));
    } else {
      const file = files[0];
      if (file && file.size <= 10 * 1024 * 1024) {
        setFieldValue(fieldName, file);
        setPreviews((prev) => ({
          ...prev,
          [fieldName]: URL.createObjectURL(file),
        }));
      } else {
        toast.error("File size exceeds 10 MB limit");
      }
    }
  };

  return (
    <div className="p-2 p-md-5">
      <Container fluid className="">
        <div className="row">
          <Col lg={6} className="mx-auto">
            <div className="complete-profile-box">
              <div className="login-box-inner-wrap py-4 px-3">
                <h2>Complete your Profile</h2>
                <p className="mb-0">
                  Enter Your Details Clearly for Easy Discovery by Others!
                </p>

                {/* <div className="profile-upload-sec">
                  <div>
                    <img
                      src={require("../Assets/Images/my-profile.svg").default}
                    />
                    <span>
                      <label htmlFor="uplod-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="17"
                          viewBox="0 0 16 17"
                          fill="none"
                        >
                          <g clip-path="url(#clip0_3224_377)">
                            <path
                              d="M9.88081 3.18744L1.07744 11.9915C1.03311 12.0359 1.00152 12.0915 0.985954 12.1523L0.010151 16.0688C-0.00420054 16.127 -0.00332103 16.1878 0.0127046 16.2455C0.0287303 16.3032 0.0593605 16.3557 0.101637 16.3981C0.166572 16.4629 0.254492 16.4992 0.346172 16.4993C0.374454 16.4993 0.402627 16.4958 0.430055 16.4889L4.34662 15.513C4.40752 15.4977 4.46311 15.4661 4.50743 15.4216L13.3116 6.61818L9.88081 3.18744ZM15.4926 1.98701L14.5126 1.00708C13.8577 0.352131 12.7162 0.352781 12.0619 1.00708L10.8616 2.20751L14.2922 5.63812L15.4926 4.43773C15.8197 4.11071 16 3.6754 16 3.21245C16 2.7495 15.8197 2.3142 15.4926 1.98701Z"
                              fill="white"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_3224_377">
                              <rect
                                width="16"
                                height="16"
                                fill="white"
                                transform="translate(0 0.5)"
                              />
                            </clipPath>
                          </defs>
                        </svg>
                      </label>
                      <input type="file" id="uplod-icon" className="d-none" />
                    </span>
                  </div>
                </div> */}
                {/* 
                <div className="profile-upload-sec justify-content-start mt-0">
                  <div style={{ position: "relative" }}>
                    {previews.profile_image ? (
                      <div
                        onClick={() => {
                          triggerFileInput("profile_image");
                        }}
                        style={{ cursor: "pointer", position: "relative" }}
                      >
                        <img
                          src={previews.profile_image}
                          alt="Profile Preview"
                          style={{
                            width: "120px",
                            height: "120px",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            bottom: "5px",
                            right: "5px",
                            background: "#038654",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "20px",
                          }}
                        >
                          ✏️
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          // setEditMode((prev) => ({
                          //   ...prev,
                          //   profile_image: true,
                          // }));
                          triggerFileInput("profile_image");
                        }}
                        style={{ cursor: "pointer", position: "relative" }}
                      >
                        <img
                          src={defaultSilhouette}
                          alt="Default Profile"
                          style={{
                            width: "150px",
                            height: "150px",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            bottom: "5px",
                            right: "5px",
                            background: "#038654",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "20px",
                          }}
                        >
                          +
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      id="upload-profile"
                      ref={profileInputRef}
                      className="d-none"
                      accept="image/*"
                      onChange={(e) => {
                        handleFileChange(
                          e,
                          formik.setFieldValue,
                          "profile_image",
                          formik.values
                        );
                        formik.setFieldTouched("profile_image", true);
                      }}
                    />
                  </div>
                </div> */}

                <div
                  className="profile-upload-sec mt-5"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    {previews.profile_image ? (
                      <div
                        onClick={() => triggerFileInput("profile_image")}
                        style={{
                          cursor: "pointer",
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <img
                          src={previews.profile_image}
                          alt="Profile Preview"
                          style={{
                            width: "110px",
                            height: "110px",
                            objectFit: "cover",
                            borderRadius: "50%",
                            display: "block",
                            margin: "0 auto",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            bottom: "5px",
                            right: "5px",
                            background: "#038654",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "20px",
                          }}
                        >
                          ✏️
                        </span>
                      </div>
                    ) : (
                      <div
                        onClick={() => triggerFileInput("profile_image")}
                        style={{
                          cursor: "pointer",
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <img
                          src={defaultSilhouette}
                          alt="Default Profile"
                          style={{
                            width: "110px",
                            height: "110px",
                            objectFit: "cover",
                            borderRadius: "50%",
                            display: "block",
                            margin: "0 auto", // Center image horizontally
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            bottom: "5px",
                            right: "5px",
                            background: "#038654",
                            borderRadius: "50%",
                            width: "30px",
                            height: "30px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "20px",
                          }}
                        >
                          +
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      id="upload-profile"
                      ref={profileInputRef}
                      className="d-none"
                      accept="image/*"
                      onChange={(e) => {
                        handleFileChange(
                          e,
                          formik.setFieldValue,
                          "profile_image",
                          formik.values
                        );
                        formik.setFieldTouched("profile_image", true);
                      }}
                    />
                  </div>
                </div>

                <Form onSubmit={formik.handleSubmit}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                      <Form.Label>Full Name*</Form.Label>
                      <Form.Control
                        type="text"
                        name="full_name"
                        placeholder="Enter your full name"
                        value={formik.values.full_name}
                        onChange={formik.handleChange}
                      />
                      {formik.touched.full_name && formik.errors.full_name && (
                        <div className="text-danger mt-1">
                          {formik.errors.full_name}
                        </div>
                      )}
                    </Form.Group>
                  </div>
                  <div>
                    <h6>Address</h6>
                  </div>
                  <Row>
                    <Col lg={6}>
                      <div className="form-set">
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>House Number*</Form.Label>
                          <Form.Control
                            type="text"
                            name="house_number"
                            placeholder="Enter here"
                            value={formik.values.house_number}
                            onChange={formik.handleChange}
                          />
                          {formik.touched.house_number &&
                            formik.errors.house_number && (
                              <div className="text-danger mt-1">
                                {formik.errors.house_number}
                              </div>
                            )}
                        </Form.Group>
                      </div>
                    </Col>
                    <Col lg={6}>
                      <div className="form-set">
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>Street Address*</Form.Label>
                          <AddressAutocomplete
                            apiKey={"AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww"}
                            onPlaceSelected={(place) =>
                              handlePlaceSelect(
                                place,
                                formik.setFieldValue,
                                formik.setFieldTouched,
                                formik.values
                              )
                            }
                            defaultValue={formik.values.address}
                            options={{
                              types: ["address"],
                            }}
                            onChange={(e) => {
                              formik.setFieldValue("address", e.target.value);
                              formik.setFieldTouched("address", true);
                            }}
                          />
                          {formik.touched.address && formik.errors.address && (
                            <div className="text-danger mt-1">
                              {formik.errors.address}
                            </div>
                          )}
                        </Form.Group>
                      </div>
                    </Col>
                    <Col lg={6}>
                      <div className="form-set">
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>Suburbs*</Form.Label>
                          <Form.Control
                            type="text"
                            name="suburbs"
                            placeholder="Enter here"
                            value={formik.values.suburbs}
                            onChange={formik.handleChange}
                          />
                          {formik.touched.suburbs && formik.errors.suburbs && (
                            <div className="text-danger mt-1">
                              {formik.errors.suburbs}
                            </div>
                          )}
                        </Form.Group>
                      </div>
                    </Col>
                    <Col lg={6}>
                      <div className="form-set">
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>Country*</Form.Label>
                          <Form.Control
                            type="text"
                            name="country"
                            placeholder="Enter here"
                            value={formik.values.country}
                            onChange={formik.handleChange}
                          />
                          {formik.touched.country && formik.errors.country && (
                            <div className="text-danger mt-1">
                              {formik.errors.country}
                            </div>
                          )}
                        </Form.Group>
                      </div>
                    </Col>
                    <Col lg={6}>
                      <div className="form-set">
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>Post Code or PO Box*</Form.Label>
                          <Form.Control
                            type="text"
                            name="post_code"
                            placeholder="Enter here"
                            value={formik.values.post_code}
                            onChange={formik.handleChange}
                          />
                          {formik.touched.post_code &&
                            formik.errors.post_code && (
                              <div className="text-danger mt-1">
                                {formik.errors.post_code}
                              </div>
                            )}
                        </Form.Group>
                      </div>
                    </Col>
                    <Col lg={6}>
                      <div className="form-set">
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label> Landmark ( Optional )</Form.Label>
                          <Form.Control
                            type="text"
                            name="landMark"
                            placeholder="Enter here"
                            value={formik.values.landMark}
                            onChange={formik.handleChange}
                          />
                        </Form.Group>
                      </div>
                    </Col>
                  </Row>

                  <button type="submit" className="submit forgot-btn w-50">
                    {isLoader ? <ButtonLoader /> : "Save"}
                  </button>
                </Form>
              </div>
            </div>
          </Col>
        </div>
      </Container>
    </div>
  );
}
