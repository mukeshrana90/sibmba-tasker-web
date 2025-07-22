import React, { useState, useEffect, useRef } from "react";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import defaultSilhouette from "../Assets/Images/silhotte.svg";
import uploadSvg from "../Assets/Images/upload.svg";
import PhoneNumberInput from "./PhoneNumberInput";
import SuccessModal from "./Modals/SuccessModal";
import AddressAutocomplete from "./AddressAutocomplete";
import { toast } from "react-toastify";
import { timeSchedule, weekDays } from "../utils/rawjson";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useNavigate } from "react-router-dom";

const ProviderForm = ({
  currentStep,
  setCurrentStep,
  handleSubmit,
  handleServiceSubmit,
  isCorporate,
}) => {
  const initialValues = {
    full_name: "",
    facebook_link: "",
    instagram_link: "",
    website_link: "",
    profile_image: null,
    identify_yourself: "",
    company_name: "",
    house_number: "",
    street_address: "",
    suburbs: "",
    country: "",
    post_code_or_po_box: "",
    landmark: "",
    lat: "",
    long: "",
    reference_name: "",
    relation: "",
    designation: "",
    referenceEmail: "",
    phone_number: "",
    govtIssueId: null,
    businessLicence: null,
    permit: null,
    certifications: null,
    images: [],
    dayAvailability: { day: [], timeArr: [] },
    serviceCategoryId: "",
    serviceSubCategoryName: "",
    price: "",
    desc: "",
    shop_name: "",
  };

  const validationSchemas = [
    // Step 0: Personal Information
    Yup.object({
      full_name: Yup.string().trim().required("Owner Name is required"),
      facebook_link: Yup.string().url("Invalid URL").nullable(),
      instagram_link: Yup.string().url("Invalid URL").nullable(),
      website_link: Yup.string().url("Invalid URL").nullable(),
    }),
    // Step 1: Company Details
    Yup.object({
      identify_yourself: Yup.string().required("Identify yourself is required"),
      ...(isCorporate
        ? {
            shop_name: Yup.string().trim().required("Shop Name is required"),
          }
        : {
            company_name: Yup.string()
              .trim()
              .required("Company Name is required"),
          }),

      house_number: Yup.string().trim().required("House Number is required"),
      street_address: Yup.string()
        .trim()
        .required("Street Address is required"),
      suburbs: Yup.string().trim().nullable(),
      country: Yup.string().trim().nullable(),
      post_code_or_po_box: Yup.string().trim().nullable(),
      landmark: Yup.string().trim().nullable(),
    }),
    // Step 2: Reference Details
    Yup.object({
      reference_name: Yup.string().trim().required("Name is required"),
      relation: Yup.string().trim().required("Relation is required"),
      designation: Yup.string().trim().nullable(),
      referenceEmail: Yup.string()
        .email("Invalid email")
        .required("Email is required"),
      phone_number: Yup.string().trim().required("Phone number is required"),
    }),
    Yup.object({}),
    // Step 4: Service Details
    Yup.object({
      dayAvailability: Yup.object({
        day: Yup.array().min(1, "At least one day is required"),
        timeArr: Yup.array().min(1, "At least one time slot is required"),
      }),
      serviceCategoryId: Yup.string().required("Service category is required"),
      serviceSubCategoryName: Yup.string()
        .trim()
        .required("Service Name is required"),
      price: Yup.number()
        .required("Price is required")
        .positive("Price must be positive"),
      desc: Yup.string().trim().required("Description is required"),
      images: Yup.array().test(
        "atLeastOneImage",
        "At least one service image is required",
        (value) => value && value.filter(Boolean).length > 0
      ),
    }),
  ];
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const categoryList = useSelector((e) => e.service.category);
  const identificationLists = useSelector((e) => e.service.identificationList);

  const [previews, setPreviews] = useState({
    profile_image: "",
    govtIssueId: "",
    businessLicence: "",
    permit: "",
    certifications: "",
    images: [],
  });
  const [editMode, setEditMode] = useState({
    profile_image: false,
    govtIssueId: false,
    businessLicence: false,
    permit: false,
    certifications: false,
    images: false,
  });
  const [showModal, setShowModal] = useState(false);

  const profileInputRef = useRef(null);
  const govtIssueIdInputRef = useRef(null);
  const businessLicenceInputRef = useRef(null);
  const permitInputRef = useRef(null);
  const certificationsInputRef = useRef(null);
  const serviceImagesInputRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    dispatch(ServiceActions.getCategoryList());
    dispatch(ServiceActions.getIdentificationList());
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;
    return () => {
      if (isMounted) {
        Object.values(previews).forEach((preview) => {
          if (typeof preview === "string" && preview.startsWith("blob:")) {
            URL.revokeObjectURL(preview);
          }
        });
      }
    };
  }, []);

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
    setEditMode((prev) => ({ ...prev, [fieldName]: false }));
  };

  const removeImage = (fieldName, setFieldValue, index = null) => {
    if (index !== null) {
      const updatedImages = [...previews.images];
      const updatedFiles = [...previews.images];
      updatedImages[index] = "";
      updatedFiles[index] = null;
      setPreviews((prev) => ({ ...prev, images: updatedImages }));
      setFieldValue("images", updatedFiles);
    } else {
      setPreviews((prev) => ({ ...prev, [fieldName]: "" }));
      setFieldValue(fieldName, null);
    }
  };

  const triggerFileInput = (fieldName, index = null) => {
    const inputRefs = {
      profile_image: profileInputRef,
      govtIssueId: govtIssueIdInputRef,
      businessLicence: businessLicenceInputRef,
      permit: permitInputRef,
      certifications: certificationsInputRef,
    };
    if (fieldName === "images" && index !== null) {
      if (serviceImagesInputRefs[index]?.current) {
        serviceImagesInputRefs[index].current.value = null;
        serviceImagesInputRefs[index].current.click();
      }
    } else if (inputRefs[fieldName]?.current) {
      inputRefs[fieldName].current.value = null;
      inputRefs[fieldName].current.click();
    }
  };

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

    setFieldValue("street_address", route || "");
    if (!values.house_number || !values.house_number.trim()) {
      setFieldValue("house_number", streetNumber || "");
    }
    setFieldValue("suburbs", suburb || city);
    setFieldValue("country", country);
    setFieldValue("post_code_or_po_box", postalCode);
    setFieldValue("lat", geometry.lat());
    setFieldValue("long", geometry.lng());
    setFieldTouched("street_address", true);
    if (streetNumber) {
      setFieldTouched("house_number", true);
    }
  };

  const validatePreviousSteps = async (values) => {
    for (let i = 0; i < currentStep; i++) {
      try {
        await validationSchemas[i].validate(values, { abortEarly: false });
      } catch (errors) {
        return false;
      }
    }
    return true;
  };

  const filterApiPayload = (values) => {
    const { suburbs, country, post_code_or_po_box, ...filteredValues } = values;
    return filteredValues;
  };

  const createServicePayload = (values) => {
    return {
      serviceCategoryId: values.serviceCategoryId,
      images: values.images,
      serviceSubCategoryName: values.serviceSubCategoryName,
      desc: values.desc,
      price: values.price,
      dayAvailability: [values.dayAvailability],
    };
  };

  const renderStepContent = (
    setFieldValue,
    values,
    setFieldTouched,
    touched
  ) => {
    switch (currentStep) {
      case 0:
        return (
          <div className="provider-form-field">
            <div className="profile-upload-sec justify-content-start mt-0">
              <div style={{ position: "relative" }}>
                {previews.profile_image ? (
                  <div
                    onClick={() => {
                      setEditMode((prev) => ({ ...prev, profile_image: true }));
                      triggerFileInput("profile_image");
                    }}
                    style={{ cursor: "pointer", position: "relative" }}
                  >
                    <img
                      src={previews.profile_image}
                      alt="Profile Preview"
                      style={{
                        width: "110px",
                        height: "110px",
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
                      setEditMode((prev) => ({ ...prev, profile_image: true }));
                      triggerFileInput("profile_image");
                    }}
                    style={{ cursor: "pointer", position: "relative" }}
                  >
                    <img
                      src={defaultSilhouette}
                      alt="Default Profile"
                      style={{
                        width: "110px",
                        height: "110px",
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
                    handleFileChange(e, setFieldValue, "profile_image", values);
                    setFieldTouched("profile_image", true);
                  }}
                />
              </div>
            </div>

            <Row>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formFullName">
                    <Form.Label>Owner Name*</Form.Label>
                    <Field
                      name="full_name"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Owner Name"
                    />
                    <ErrorMessage
                      name="full_name"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
            </Row>
            <div>
              <h6>Social Links (Optional) </h6>
            </div>
            <Row>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formFacebookLink">
                    <Form.Label>Facebook</Form.Label>
                    <Field
                      name="facebook_link"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Facebook Link"
                    />
                    <ErrorMessage
                      name="facebook_link"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formInstagramLink">
                    <Form.Label>Instagram</Form.Label>
                    <Field
                      name="instagram_link"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Instagram Link"
                    />
                    <ErrorMessage
                      name="instagram_link"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formWebsiteLink">
                    <Form.Label>Website</Form.Label>
                    <Field
                      name="website_link"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Website Link"
                    />
                    <ErrorMessage
                      name="website_link"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
            </Row>
          </div>
        );
      case 1:
        return (
          <div className="provider-form-field">
            <Row>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formIdentifyYourself">
                    <Form.Label>Identify yourself*</Form.Label>
                    <Field
                      name="identify_yourself"
                      as="select"
                      className="form-select"
                    >
                      <option value="">Select</option>
                      {identificationLists?.data?.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="identify_yourself"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              {isCorporate ? (
                <Col lg={6}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId="formShopName">
                      <Form.Label>Shop Name*</Form.Label>
                      <Field
                        name="shop_name"
                        as={Form.Control}
                        type="text"
                        placeholder="Shop Name"
                      />
                      <ErrorMessage
                        name="shop_name"
                        component="div"
                        className="text-danger"
                      />
                    </Form.Group>
                  </div>
                </Col>
              ) : (
                <Col lg={6}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId="formCompanyName">
                      <Form.Label>Company Name*</Form.Label>
                      <Field
                        name="company_name"
                        as={Form.Control}
                        type="text"
                        placeholder="Name"
                      />
                      <ErrorMessage
                        name="company_name"
                        component="div"
                        className="text-danger"
                      />
                    </Form.Group>
                  </div>
                </Col>
              )}

              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formHouseNumber">
                    <Form.Label>House Number*</Form.Label>
                    <Field
                      name="house_number"
                      as={Form.Control}
                      type="text"
                      placeholder="Number"
                      onChange={(e) => {
                        setFieldValue("house_number", e.target.value);
                        setFieldTouched("house_number", true);
                      }}
                    />
                    <ErrorMessage
                      name="house_number"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formStreetAddress">
                    <Form.Label>Street Address*</Form.Label>
                    {/* <AddressAutocomplete
                      apiKey={"AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww"}
                      onPlaceSelected={(place) => handlePlaceSelect(place, setFieldValue, setFieldTouched, values)}
                      defaultValue={values.street_address}
                      options={{
                        types: ["address"],
                      }}
                      onChange={(e) => {
                        setFieldValue("street_address", e.target.value);
                        setFieldTouched("street_address", true);
                      }}
                    /> */}
                    <AddressAutocomplete
                      apiKey={"AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww"}
                      onPlaceSelected={(place) =>
                        handlePlaceSelect(
                          place,
                          setFieldValue,
                          setFieldTouched,
                          values
                        )
                      }
                      defaultValue={values.street_address}
                      options={{
                        types: ["address"],
                      }}
                      onChange={(e) => {
                        setFieldValue("street_address", e.target.value);
                        setFieldTouched("street_address", true);
                        if (e.target.value.trim() === "") {
                          setFieldValue("street_address", "");
                          setFieldTouched("street_address", false);
                        }
                      }}
                    />
                    <ErrorMessage
                      name="street_address"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formSuburbs">
                    <Form.Label>Suburbs</Form.Label>
                    <Field
                      name="suburbs"
                      as={Form.Control}
                      type="text"
                      placeholder="Suburbs"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formCountry">
                    <Form.Label>Country</Form.Label>
                    <Field
                      name="country"
                      as={Form.Control}
                      type="text"
                      placeholder="Country"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formPostCodeOrPOBox">
                    <Form.Label>Post Code or PO Box</Form.Label>
                    <Field
                      name="post_code_or_po_box"
                      as={Form.Control}
                      type="text"
                      placeholder="Code"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formLandmark">
                    <Form.Label>Landmark ( Optional )</Form.Label>
                    <Field
                      name="landmark"
                      as={Form.Control}
                      type="text"
                      placeholder="Landmark"
                    />
                  </Form.Group>
                </div>
              </Col>
            </Row>
          </div>
        );
      case 2:
        return (
          <div className="provider-form-field">
            <Row>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formReferenceName">
                    <Form.Label>Name*</Form.Label>
                    <Field
                      name="reference_name"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Name"
                    />
                    <ErrorMessage
                      name="reference_name"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formRelation">
                    <Form.Label>Relation*</Form.Label>
                    <Field
                      name="relation"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Relation"
                    />
                    <ErrorMessage
                      name="relation"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formDesignation">
                    <Form.Label>Designation</Form.Label>
                    <Field
                      name="designation"
                      as={Form.Control}
                      type="text"
                      placeholder="Enter Designation"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formReferenceEmail">
                    <Form.Label>Email*</Form.Label>
                    <Field
                      name="referenceEmail"
                      as={Form.Control}
                      type="email"
                      placeholder="Enter Email"
                    />
                    <ErrorMessage
                      name="referenceEmail"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                {/* <PhoneNumberInput
                 initialCountry="in"
                  value={values.phone_number}
                  onChange={(setFieldValue, phone) => {
                    setFieldValue("phone_number", phone);
                    setFieldTouched("phone_number", true);
                  }}
                  setFieldValue={setFieldValue}
                  error={
                    touched.phone_number && (
                      <ErrorMessage
                        name="phone_number"
                        component="div"
                        className="text-danger"
                      />
                    )
                  }
                /> */}
                <PhoneNumberInput
                  initialCountry="in"
                  value={values.phone_number || ""}
                  setFieldValue={setFieldValue}
                  onChange={(phone) => {
                    setFieldValue("phone_number", phone);
                    setFieldTouched("phone_number", true);
                  }}
                  error={
                    touched.phone_number && (
                      <ErrorMessage
                        name="phone_number"
                        component="div"
                        className="text-danger"
                      />
                    )
                  }
                  touched={touched.phone_number}
                />
              </Col>
            </Row>
          </div>
        );
      case 3:
        return (
          <div className="provider-form-field">
            <Row>
              {[
                "govtIssueId",
                "businessLicence",
                "permit",
                "certifications",
              ].map((field, index) => (
                <Col lg={6} key={index} style={{ marginBottom: "20px" }}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId={`form${field}`}>
                      <Form.Label>
                        {field
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </Form.Label>
                      <div
                        style={{ position: "relative", textAlign: "center" }}
                      >
                        {previews[field] ? (
                          <div
                            style={{
                              position: "relative",
                              display: "inline-block",
                            }}
                          >
                            <img
                              src={previews[field]}
                              alt={`${field} Preview`}
                              style={{
                                width: "372px",
                                height: "200px",
                                objectFit: "cover",
                                border: "1px dashed #00aaff",
                              }}
                              onClick={() => {
                                setEditMode((prev) => ({
                                  ...prev,
                                  [field]: true,
                                }));
                                triggerFileInput(field);
                              }}
                            />
                            <span
                              style={{
                                position: "absolute",
                                top: "-11px",
                                right: "-11px",
                                background: "#038654",
                                borderRadius: "50%",
                                width: "27px",
                                height: "27px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "16px",
                                cursor: "pointer",
                              }}
                              onClick={() => removeImage(field, setFieldValue)}
                            >
                              X
                            </span>
                          </div>
                        ) : (
                          <label
                            className="upld-provider-docu"
                            htmlFor={`upload-${field}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="44"
                              height="44"
                              viewBox="0 0 44 44"
                              fill="none"
                            >
                              <path
                                d="M21.7487 14.8347V29.1679M21.7487 14.8347C20.4941 14.8347 18.1502 18.4078 17.2695 19.3138M21.7487 14.8347C23.0032 14.8347 25.3472 18.4078 26.2278 19.3138"
                                stroke="#038654"
                                strokeWidth="2.14998"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M4.73047 21.9954C4.73047 13.9718 4.73047 9.95999 7.22309 7.46735C9.71572 4.97473 13.7275 4.97473 21.7512 4.97473C29.7747 4.97473 33.7866 4.97473 36.2793 7.46735C38.7719 9.95999 38.7719 13.9718 38.7719 21.9954C38.7719 30.019 38.7719 34.0309 36.2793 36.5236C33.7866 39.0161 29.7747 39.0161 21.7512 39.0161C13.7275 39.0161 9.71572 39.0161 7.22309 36.5236C4.73047 34.0309 4.73047 30.019 4.73047 21.9954Z"
                                stroke="#038654"
                                strokeWidth="2.14998"
                              />
                            </svg>
                            <p>Click to upload (Max files size: 10 MB)</p>
                          </label>
                        )}
                        <input
                          type="file"
                          id={`upload-${field}`}
                          ref={
                            field === "govtIssueId"
                              ? govtIssueIdInputRef
                              : field === "businessLicence"
                              ? businessLicenceInputRef
                              : field === "permit"
                              ? permitInputRef
                              : certificationsInputRef
                          }
                          className="d-none"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            handleFileChange(e, setFieldValue, field, values);
                            setFieldTouched(field, true);
                          }}
                        />
                      </div>
                    </Form.Group>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        );
      case 4:
        return (
          <div className="provider-form-field">
            <Row>
              <Col lg={12}>
                <Form.Label>Images*</Form.Label>
              </Col>
              {[0, 1, 2].map((index) => (
                <Col lg={4} key={index}>
                  <div className="form-set">
                    <Form.Group
                      className="mb-3"
                      controlId={`formServiceImage${index + 1}`}
                    >
                      <div
                        style={{
                          position: "relative",
                          textAlign: "center",
                          border: "1px dashed #28a745",
                          borderRadius: "5px",
                          height: "150px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          // width: "220px",
                          // padding: "20px",
                        }}
                      >
                        {previews.images[index] ? (
                          <div
                            style={{
                              position: "relative",
                              display: "  ",
                            }}
                          >
                            <img
                              src={previews.images[index]}
                              alt={`Service Image ${index + 1} Preview`}
                              style={{
                                width: "274px",
                                height: "150px",
                                objectFit: "cover",
                                borderRadius: "5px",
                              }}
                              onClick={() => {
                                setEditMode((prev) => ({
                                  ...prev,
                                  images: true,
                                }));
                                triggerFileInput("images", index);
                              }}
                            />
                            <span
                              style={{
                                position: "absolute",
                                top: "-11px",
                                right: "-11px",
                                background: "#038654",
                                borderRadius: "50%",
                                width: "27px",
                                height: "27px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "16px",
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                removeImage("images", setFieldValue, index)
                              }
                            >
                              X
                            </span>
                          </div>
                        ) : (
                          <label
                            className="upload-label"
                            htmlFor={`upload-service-images-${index}`}
                            style={{ display: "block", cursor: "pointer" }}
                          >
                            <img
                              src={uploadSvg}
                              alt="Upload"
                              style={{
                                width: "24px",
                                height: "24px",
                                display: "block",
                                margin: "0 auto 10px",
                              }}
                            />
                            <span>Click to upload (Max files size: 10 MB)</span>
                          </label>
                        )}
                      </div>
                      <input
                        type="file"
                        id={`upload-service-images-${index}`}
                        ref={serviceImagesInputRefs[index]}
                        className="d-none"
                        accept="image/*"
                        onChange={(e) => {
                          handleFileChange(
                            e,
                            setFieldValue,
                            "images",
                            values,
                            true,
                            index
                          );
                          setFieldTouched("images", true);
                        }}
                      />
                    </Form.Group>
                  </div>
                </Col>
              ))}
              <Col lg={12}>
                {touched.images && (
                  <ErrorMessage
                    name="images"
                    component="div"
                    className="text-danger"
                  />
                )}
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group
                    className="mb-3"
                    controlId="formServiceCategoryId"
                  >
                    <Form.Label>Service Category*</Form.Label>
                    <Field
                      name="serviceCategoryId"
                      as="select"
                      className="form-select"
                      onChange={(e) => {
                        setFieldValue("serviceCategoryId", e.target.value);
                        setFieldTouched("serviceCategoryId", true);
                      }}
                    >
                      <option value="">Select</option>
                      {categoryList?.data?.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.service_category_name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage
                      name="serviceCategoryId"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                  <Form.Group
                    className="mb-3"
                    controlId="formServiceSubCategoryName"
                  >
                    <Form.Label>Service Name*</Form.Label>
                    <Field
                      name="serviceSubCategoryName"
                      as={Form.Control}
                      type="text"
                      placeholder="Name"
                    />
                    <ErrorMessage
                      name="serviceSubCategoryName"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formPrice">
                    <Form.Label>Price*</Form.Label>
                    <Field
                      name="price"
                      as={Form.Control}
                      type="number"
                      placeholder="Enter Price..."
                    />
                    <ErrorMessage
                      name="price"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formDesc">
                    <Form.Label>Description*</Form.Label>
                    <Field
                      name="desc"
                      as="textarea"
                      className="form-control"
                      rows={4}
                      placeholder="Type here"
                    />
                    <ErrorMessage
                      name="desc"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6}>
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formAvailability">
                    <Form.Label>Availability*</Form.Label>
                    <Row>
                      <div className="">
                        <Form.Label>Select Day</Form.Label>
                        <Col>
                          {weekDays.map((day) => (
                            <button
                              key={day}
                              type="button"
                              className={`btn ${
                                values.dayAvailability.day.some(
                                  (d) => d.toLowerCase() === day.toLowerCase()
                                )
                                  ? "btn-success"
                                  : "btn-outline-secondary"
                              } m-1`}
                              onClick={() => {
                                const days = Array.isArray(
                                  values.dayAvailability.day
                                )
                                  ? values.dayAvailability.day
                                  : [];
                                const updatedDays = days.some(
                                  (d) => d.toLowerCase() === day.toLowerCase()
                                )
                                  ? days.filter(
                                      (d) =>
                                        d.toLowerCase() !== day.toLowerCase()
                                    )
                                  : [...days, day.toLowerCase()];
                                setFieldValue(
                                  "dayAvailability.day",
                                  updatedDays
                                );
                                setFieldTouched("dayAvailability", true);
                              }}
                            >
                              {day.charAt(0).toUpperCase() +
                                day.slice(1).toLowerCase()}
                            </button>
                          ))}
                          {touched.dayAvailability && (
                            <ErrorMessage
                              name="dayAvailability.day"
                              component="div"
                              className="text-danger"
                            />
                          )}
                        </Col>
                      </div>
                      <Col>
                        <Form.Label>Select Time</Form.Label>
                        <div>
                          {(timeSchedule.length > 0
                            ? timeSchedule
                            : ["08am-09am", "07am-08am", "09am-10am"]
                          ).map((time) => (
                            <button
                              key={time}
                              type="button"
                              className={`btn ${
                                values.dayAvailability.timeArr.includes(time)
                                  ? "btn-success"
                                  : "btn-outline-secondary"
                              } m-1`}
                              onClick={() => {
                                const updatedTimes =
                                  values.dayAvailability.timeArr.includes(time)
                                    ? values.dayAvailability.timeArr.filter(
                                        (t) => t !== time
                                      )
                                    : [...values.dayAvailability.timeArr, time];
                                setFieldValue(
                                  "dayAvailability.timeArr",
                                  updatedTimes
                                );
                                setFieldTouched("dayAvailability", true);
                              }}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                        {touched.dayAvailability && (
                          <ErrorMessage
                            name="dayAvailability.timeArr"
                            component="div"
                            className="text-danger"
                          />
                        )}
                      </Col>
                    </Row>
                  </Form.Group>
                </div>
              </Col>
            </Row>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchemas[currentStep]}
      validateOnChange={true}
      validateOnBlur={false}
      onSubmit={async (values, { setSubmitting }) => {
        if (currentStep === 0 && !values.profile_image) {
          toast.error("Please upload a profile image before proceeding.");
          setSubmitting(false);
          return;
        }

        if (currentStep === 3) {
          if (
            !values.govtIssueId &&
            !values.businessLicence &&
            !values.permit &&
            !values.certifications
          ) {
            toast.error("At least one document is required");
            setSubmitting(false);
            return;
          }
        }

        const previousStepsValid = await validatePreviousSteps(values);
        if (!previousStepsValid) {
          toast.error("Please complete all previous steps before proceeding.");
          setSubmitting(false);
          return;
        }

        if (currentStep < 3) {
          setCurrentStep(currentStep + 1);
        } else if (currentStep === 3) {
          setSubmitting(true);
          try {
            const filteredValues = filterApiPayload(values);
            await handleSubmit(filteredValues);
            // setShowModal(true);
            // setCurrentStep(currentStep + 1);
            if(isCorporate){
              setShowModal(true);
            }else{
                setCurrentStep(currentStep + 1);
            }    
          } catch (error) {
            console.error("Step 3 submission failed:", error);
            toast.error("An error occurred during submission.");
          } finally {
            setSubmitting(false);
          }
        } else if (currentStep === 4 && !isCorporate) {
          setSubmitting(true);
          try {
            // const servicePayload = createServicePayload(values);
            // await handleServiceSubmit(servicePayload);
            // setShowModal(true);

            const servicePayload = createServicePayload(values);
            await handleServiceSubmit(servicePayload);
            setShowModal(true);
          } catch (error) {
            console.error("Step 4 submission failed:", error);
            toast.error("An error occurred during submission.");
          } finally {
            setSubmitting(false);
          }
        }
      }}
    >
      {({
        setFieldValue,
        values,
        isSubmitting,
        setFieldTouched,
        touched,
        errors,
      }) => (
        <FormikForm className="commn-provider-docu">
          {renderStepContent(setFieldValue, values, setFieldTouched, touched)}
          <div className="submit-btnn">
            <button
              type="submit"
              className="submit forgot-btn half-width-btn"
              disabled={isSubmitting}
            >
              {currentStep === 3 || currentStep === 4 ? "Submit" : "Continue"}
            </button>
          </div>

          {/* <SuccessModal
            show={showModal}
            onHide={() => setShowModal(false)}
            message="You’re all set!"
            onNext={() => setCurrentStep(currentStep + 1)}
          /> */}

          <SuccessModal
            backdrop="static"
            keyboard={false}
            show={showModal}
            onHide={() => {
              setShowModal(false);
            }}
            message="You’re all set!"
            onNext={() => {
              const tokenval = localStorage.getItem("temptoken");
              if (tokenval) {
                localStorage.setItem("token", tokenval);
                if (isCorporate) {
                  localStorage.setItem("role", 3);
                  navigate("/corporate", { replace: true });
                } else {
                  localStorage.setItem("role", 2);
                  navigate("/requests", { replace: true });
                }
                localStorage.removeItem("temptoken");
              } else {
                toast.error("Temporary token missing. Please try again.");
              }
              setShowModal(false);
            }}
            // onNext={() => {
            //   setShowModal(false);
            //   let tokenval = localStorage.getItem("temptoken");
            //   localStorage.setItem("token", tokenval);
            //   localStorage.setItem("role", 2);
            //   localStorage.removeItem("temptoken");
            //   navigate("/requests", { replace: true });
            // }}
          />
        </FormikForm>
      )}
    </Formik>
  );
};

export default ProviderForm;
