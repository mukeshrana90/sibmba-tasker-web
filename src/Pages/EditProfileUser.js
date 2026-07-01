import React, { useEffect, useRef, useState, useCallback } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import AddressAutocomplete from "../CommanComponents/AddressAutocomplete";
import defaultSilhouette from "../Assets/Images/silhotte.svg";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import Layout from "../Components/Layout/Layout";
import { setCustomer } from "../Redux/Reducers/LoginSlice";
import { ImagePathCustomer } from "../utils/ImagePath";
import { handleUserImageError } from "../utils/landingUtils";
import { sanitizeProfileValue } from "../utils/customerProfileUtils";

export default function EditProfileUser() {
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { customerDetails } = useSelector((state) => state.login);
  const [isLoader, setIsLoading] = useState(false);
  const profileInputRef = useRef(null);
  const [previews, setPreviews] = useState({
    profile_image: "",
  });
  const [initialValues, setInitialValues] = useState({
    full_name: "",
    house_number: "",
    address: "",
    suburbs: "",
    country: "",
    post_code: "",
    landMark: "",
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
    initialValues,
    enableReinitialize: true,
    validationSchema: Yup.object({
      full_name: Yup.string().required("Full Name is required"),
      house_number: Yup.string().required("House Number is required"),
      suburbs: Yup.string().required("Suburbs is required"),
      country: Yup.string().required("Country is required"),
      post_code: Yup.string().required("Post Code or PO Box is required"),
    }),
    onSubmit: async (values) => {
      if (!values?.profile_image && !customerDetails?.profile_image) {
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
      setIsLoading(true);
      const apiRes = await dispatch(CustomerActions.createProfile(formData));
      if (apiRes?.payload?.success) {
        // toast.success(apiRes?.payload?.message);
        toast.success("Profile Updated Successfully.");
        getProfileApiCall();
        navigate(`/`)
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

  const getProfileApiCall = useCallback(async () => {
    const apiRes = await dispatch(CustomerActions.getProfile());
    if (apiRes?.payload?.success) {
      dispatch(setCustomer(apiRes?.payload?.data));
    }
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      getProfileApiCall();
    }
  }, [token, getProfileApiCall]);

  useEffect(() => {
    if (customerDetails) {
      setInitialValues({
        full_name: sanitizeProfileValue(customerDetails.full_name),
        email: sanitizeProfileValue(customerDetails.email),
        house_number: sanitizeProfileValue(customerDetails.house_number),
        address: sanitizeProfileValue(customerDetails.address),
        suburbs: sanitizeProfileValue(customerDetails.suburbs),
        country: sanitizeProfileValue(customerDetails.country),
        post_code: sanitizeProfileValue(customerDetails.post_code),
        landMark: sanitizeProfileValue(customerDetails.landMark),
      });
      // setPreviews({ profile_image: customerDetails?.profile_image });
    }
  }, [customerDetails]);


  return (
    <Layout>
      <div className="p-2 p-md-5 mt-5">
        <Container fluid className="">
          <div className="row">
            <Col lg={6} className="mx-auto">
              <div className="complete-profile-box mt-5">
                <div className="login-box-inner-wrap py-4 px-3">
                  <h2>Edit your Profile</h2>
                  <p className="mb-0">Enter Your Details Clearly!</p>


                  {/* <div className="profile-upload-sec justify-content-start mt-0">
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
                              background: "#0f5c4c",
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
                            src={
                              customerDetails?.profile_image
                                ? ImagePathCustomer(
                                    customerDetails?.profile_image
                                  )
                                : defaultSilhouette
                            }
                            alt="Default Profile"
                            onError={handleUserImageError}
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
                              background: "#0f5c4c",
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
                  </div>  */}

                  <div className="profile-upload-sec mt-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      {previews.profile_image ? (
                        <div
                          onClick={() => triggerFileInput('profile_image')}
                          style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}
                        >
                          <img
                            src={previews.profile_image}
                            alt="Profile Preview"
                            style={{
                              width: '110px',
                              height: '110px',
                              objectFit: 'cover',
                              borderRadius: '50%',
                              display: 'block',
                              margin: '0 auto', // Center image horizontally
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '5px',
                              right: '5px',
                              background: '#0f5c4c',
                              borderRadius: '50%',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '20px',
                            }}
                          >
                            ✏️
                          </span>
                        </div>
                      ) : (
                        <div
                          onClick={() => triggerFileInput('profile_image')}
                          style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}
                        >
                          <img
                            src={
                              customerDetails?.profile_image
                                ? ImagePathCustomer(customerDetails?.profile_image)
                                : defaultSilhouette
                            }
                            alt="Default Profile"
                            onError={handleUserImageError}
                            style={{
                              width: '110px',
                              height: '110px',
                              objectFit: 'cover',
                              borderRadius: '50%',
                              display: 'block',
                              margin: '0 auto', // Center image horizontally
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: '5px',
                              right: '5px',
                              background: '#0f5c4c',
                              borderRadius: '50%',
                              width: '30px',
                              height: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '20px',
                            }}
                          >
                            ✏️
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
                          handleFileChange(e, formik.setFieldValue, 'profile_image', formik.values);
                          formik.setFieldTouched('profile_image', true);
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
                          isInvalid={
                            !!formik.errors.full_name &&
                            formik.touched.full_name
                          }
                        />
                        <Form.Control.Feedback type="invalid">
                          {formik.errors.full_name}
                        </Form.Control.Feedback>
                      </Form.Group>
                          <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Email*</Form.Label>
                        <Form.Control readOnly className="text-muted"
                          type="text"
                          name="full_name"
                          placeholder="Enter your full name"
                          value={formik.values.email}
                          isInvalid={
                            !!formik.errors.email &&
                            formik.touched.email
                          }
                        />
                       
                      </Form.Group>

                    </div>
                    <div>
                      <h6>Address</h6>
                    </div>
                    <Row>
                      <Col lg={6}>
                        <div className="form-set">
                          <Form.Group
                            className="mb-3"
                            controlId="formBasicEmail"
                          >
                            <Form.Label>House Number*</Form.Label>
                            <Form.Control
                              type="text"
                              name="house_number"
                              placeholder="Enter House Number"
                              value={formik.values.house_number  !== "undefined" ? formik.values.house_number : ""}
                              onChange={formik.handleChange}
                              isInvalid={
                                !!formik.errors.house_number &&
                                formik.touched.house_number
                              }
                            />
                            <Form.Control.Feedback type="invalid">
                              {formik.errors.house_number}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                      <Col lg={6}>
                        <div className="form-set">
                          <Form.Group
                            className="mb-3"
                            controlId="formBasicEmail"
                          >
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
                              defaultValue={formik.values.address !== "undefined" ? formik.values.address : ""}
                              options={{
                                types: ["address"],
                              }}
                              onChange={(e) => {
                                formik.setFieldValue("address", e.target.value);
                                formik.setFieldTouched("address", true);
                              }}
                            />
                            <Form.Control.Feedback type="invalid">
                              {formik.errors.address}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                      <Col lg={6}>
                        <div className="form-set">
                          <Form.Group
                            className="mb-3"
                            controlId="formBasicEmail"
                          >
                            <Form.Label>Suburbs*</Form.Label>
                            <Form.Control
                              type="text"
                              name="suburbs"
                              placeholder="Enter Suburbs"
                              value={formik.values.suburbs !== "undefined" ? formik.values.suburbs : ""}
                              onChange={formik.handleChange}
                              isInvalid={
                                !!formik.errors.suburbs &&
                                formik.touched.suburbs
                              }
                            />
                            <Form.Control.Feedback type="invalid">
                              {formik.errors.suburbs}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                      <Col lg={6}>
                        <div className="form-set">
                          <Form.Group
                            className="mb-3"
                            controlId="formBasicEmail"
                          >
                            <Form.Label>Country*</Form.Label>
                            <Form.Control
                              type="text"
                              name="country"
                              placeholder="Enter Country"
                              value={formik.values.country !== "undefined" ? formik.values.country : ""}
                              onChange={formik.handleChange}
                              isInvalid={
                                !!formik.errors.country &&
                                formik.touched.country
                              }
                            />
                            <Form.Control.Feedback type="invalid">
                              {formik.errors.country}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                      <Col lg={6}>
                        <div className="form-set">
                          <Form.Group
                            className="mb-3"
                            controlId="formBasicEmail"
                          >
                            <Form.Label>Post Code or PO Box*</Form.Label>
                            <Form.Control
                              type="text"
                              name="post_code"
                              placeholder="Enter Post Code or PO Box"
                              value={formik.values.post_code}
                              onChange={formik.handleChange}
                              isInvalid={
                                !!formik.errors.post_code &&
                                formik.touched.post_code
                              }
                            />
                            <Form.Control.Feedback type="invalid">
                              {formik.errors.post_code}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </div>
                      </Col>
                      <Col lg={6}>
                        <div className="form-set">
                          <Form.Group
                            className="mb-3"
                            controlId="formBasicEmail"
                          >
                            <Form.Label> Landmark</Form.Label>
                            <Form.Control
                              type="text"
                              name="landMark"
                              placeholder="Enter Landmark"
                              value={formik.values.landMark}
                              onChange={formik.handleChange}
                            />
                          </Form.Group>
                        </div>
                      </Col>
                    </Row>

                    <button type="submit" className="submit forgot-btn w-50">
                      {isLoader ? <ButtonLoader /> : "Update"}
                    </button>
                  </Form>
                </div>
              </div>
            </Col>
          </div>
        </Container>
      </div>
    </Layout>
  );
}
