import React, { useEffect, useRef, useState, useCallback } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import AddressAutocomplete from "../CommanComponents/AddressAutocomplete";
import MapComponent from "../CommanComponents/MapComponent";
import { getGoogleMapsApiKey } from "../utils/landingPlaces";
import defaultSilhouette from "../Assets/Images/silhotte.svg";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import Layout from "../Components/Layout/Layout";
import { ImagePathCustomer } from "../utils/ImagePath";
import { handleUserImageError } from "../utils/landingUtils";
import { setCustomer } from "../Redux/Reducers/LoginSlice";
import PhoneNumberInput from "../CommanComponents/PhoneNumberInput";
import CountrySelect, {
  findCountryOption,
} from "../CommanComponents/CountrySelect";
import Modal from "react-bootstrap/Modal";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useNavigate } from "react-router-dom";
import { Roles } from "../utils/Roles";

function hasValidLocationCoords(lat, lng) {
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  if (Number.isNaN(latN) || Number.isNaN(lngN)) return false;
  if (latN === 0 && lngN === 0) return false;
  return true;
}

const locationCoordsValidation = Yup.mixed().test(
  "pick-location",
  "Please search or pin your location on the map",
  function validateCoords() {
    const { lat, long } = this.parent;
    return hasValidLocationCoords(lat, long);
  }
);

const DEFAULT_ZIMBABWE_LOCATION = {
  lat: -17.8292,
  lng: 31.0522,
  address: "Harare, Zimbabwe",
};

function FieldError({ formik, name }) {
  if (!(formik.touched[name] && formik.errors[name])) return null;
  return (
    <div className="text-danger small mt-1" style={{ fontWeight: 600 }}>
      {formik.errors[name]}
    </div>
  );
}

export default function EditProfileCompany() {
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { customerDetails } = useSelector((state) => state.login);
  const [isLoader, setIsLoading] = useState(false);
  const profileInputRef = useRef(null);
  const [preview, setPreview] = useState(customerDetails?.profile_image || "");
  const identificationLists = useSelector((e) => e.service.identificationList);
  const [showSocialMediaModal, setShowSocialMediaModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressSearchText, setAddressSearchText] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasExistingAddress, setHasExistingAddress] = useState(false);
  const [role, setRole] = useState(() => localStorage.getItem("role") || "");
  const corporateCategory = useSelector((e) => e.service.corporateCategory);
  const userRole = Number(role);
  const isCorporate = userRole === Roles.CORPORATE;
  const isServiceProvider = userRole === Roles.SERVICE_PROVIDER;
  const mapsApiKey =
    getGoogleMapsApiKey() || "AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww";

  const existingCoords = customerDetails?.location?.coordinates;
  const existingLat =
    Array.isArray(existingCoords) && existingCoords.length >= 2
      ? existingCoords[1]
      : "";
  const existingLong =
    Array.isArray(existingCoords) && existingCoords.length >= 2
      ? existingCoords[0]
      : "";

  const getPhoneNumberAndCountryCode = (phoneValue) => {
    if (!phoneValue) return { phone: "", countryCode: "" };
    
    if (phoneValue.startsWith("+")) {
      const match = phoneValue.match(/^\+(\d+)\s*(.+)$/);
      if (match) {
        return {
          phone: match[2].trim(),
          countryCode: `+${match[1]}`,
        };
      }
    }
    
    if (customerDetails?.country_code) {
      return {
        phone: phoneValue,
        countryCode: customerDetails.country_code,
      };
    }
    
    return { phone: phoneValue, countryCode: "" };
  };

  const phoneData = getPhoneNumberAndCountryCode(customerDetails?.phone_number || "");

  const initialValues = {
    full_name: customerDetails?.full_name || "",
    identify_yourself: customerDetails?.identify_yourself || "",
    company_name:
      customerDetails?.company_name &&
      customerDetails.company_name !== "undefined"
        ? customerDetails.company_name
        : "",
    phone_number: phoneData.phone,
    country_code: phoneData.countryCode,
    email: customerDetails?.email || "",
    house_number: customerDetails?.house_number || "",
    address: customerDetails?.address || customerDetails?.street_address || "",
    suburbs: customerDetails?.suburbs || "",
    country: findCountryOption(customerDetails?.country)?.value || "",
    post_code: customerDetails?.post_code || "",
    landMark: customerDetails?.landMark || "",
    lat: existingLat,
    long: existingLong,
    profile_image: null,
    facebook_link: customerDetails?.facebook_link || "",
    instagram_link: customerDetails?.instagram_link || "",
    website_link: customerDetails?.website_link || "",
    reference_name: customerDetails?.referenceDetails?.reference_name || "",
    relation: customerDetails?.referenceDetails?.relation || "",
    designation: customerDetails?.referenceDetails?.designation || "",
    referenceEmail: customerDetails?.referenceDetails?.referenceEmail || "",
    ref_phone_number: customerDetails?.referenceDetails?.phone_number || "",
    corporateCategoryId:
      customerDetails?.corporateCategoryId?._id ||
      customerDetails?.corporateCategoryId ||
      "",
  };

  const validationSchema = Yup.object({
    phone_number: Yup.string()
      .trim()
      .required("Phone number is required"),
    house_number: Yup.string().trim().required("House Number is required"),
    address: Yup.string().trim().required("Street Address is required"),
    suburbs: Yup.string().trim().required("Suburbs is required"),
    country: Yup.string()
      .trim()
      .required("Country is required")
      .test(
        "valid-country",
        "Please select a valid country from the list",
        (value) => !!findCountryOption(value)
      ),
    post_code: Yup.string().trim().required("Post Code or PO Box is required"),
    lat: locationCoordsValidation,
    long: locationCoordsValidation,
    ...(isCorporate
      ? {
          corporateCategoryId: Yup.string().required(
            "Business category is required"
          ),
        }
      : {
          identify_yourself: Yup.string().required(
            "Identify yourself is required"
          ),
          company_name: Yup.string()
            .trim()
            .required("Company Name is required")
            .notOneOf(["-", "undefined"], "Company Name is required"),
        }),
  });

  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      if (!values?.profile_image && !customerDetails?.profile_image) {
        return toast.warn("Please add profile image");
      }
      if (!hasValidLocationCoords(values.lat, values.long)) {
        return toast.error(
          "Please search or pin your location on the map before saving"
        );
      }
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (values[key] instanceof File && values[key]) {
          formData.append(key, values[key]);
        } else if (
          values[key] !== "" &&
          values[key] !== null &&
          values[key] !== undefined
        ) {
          formData.append(key, values[key]);
        }
      });
      setIsLoading(true);
      const apiRes = await dispatch(CustomerActions.createProfile(formData));
      if (apiRes?.payload?.success) {
        toast.success("Profile Updated Successfully.");
        navigate("/requests");
      } else {
        toast.error(apiRes?.payload?.message);
      }
      setIsLoading(false);
    },
  });

  const handlePlaceSelect = (place, setFieldValue, setFieldTouched, values) => {
    const addressComponents = place?.address_components || [];
    const geometry = place?.geometry?.location;
    let streetNumber = "";
    let route = "";
    let suburb = "";
    let city = "";
    let country = "";
    let postalCode = "";
    let premise = "";
    let sublocality = "";
    let neighborhood = "";

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes("street_number")) streetNumber = component.long_name;
      if (types.includes("route")) route = component.long_name;
      if (types.includes("premise")) premise = component.long_name;
      if (types.includes("neighborhood")) neighborhood = component.long_name;
      if (
        types.includes("sublocality") ||
        types.includes("sublocality_level_1") ||
        types.includes("sublocality_level_2")
      ) {
        if (!sublocality) sublocality = component.long_name;
      }
      if (types.includes("locality")) suburb = component.long_name;
      if (types.includes("administrative_area_level_1"))
        city = component.long_name;
      if (types.includes("country")) country = component.long_name;
      if (types.includes("postal_code")) postalCode = component.long_name;
    });

    const streetLine =
      route ||
      premise ||
      neighborhood ||
      sublocality ||
      place?.formatted_address?.split(",")[0]?.trim() ||
      "";

    setFieldValue("address", streetLine);
    if (!values?.house_number || !String(values.house_number).trim()) {
      setFieldValue("house_number", streetNumber || "");
    }
    setFieldValue("suburbs", suburb || sublocality || city || "");
    setFieldValue(
      "country",
      findCountryOption(country)?.value || country || ""
    );
    setFieldValue("post_code", postalCode || "");
    if (geometry) {
      setFieldValue(
        "lat",
        typeof geometry.lat === "function" ? geometry.lat() : geometry.lat
      );
      setFieldValue(
        "long",
        typeof geometry.lng === "function" ? geometry.lng() : geometry.lng
      );
    }
    setFieldTouched("address", true);
    setFieldTouched("suburbs", true);
    setFieldTouched("country", true);
    setFieldTouched("post_code", true);
    setFieldTouched("lat", true);
    setFieldTouched("long", true);
    if (streetNumber) {
      setFieldTouched("house_number", true);
    }
  };

  const closeAddressModal = () => {
    if (
      document.activeElement &&
      typeof document.activeElement.blur === "function"
    ) {
      document.activeElement.blur();
    }
    document.querySelectorAll(".pac-container").forEach((el) => {
      el.style.display = "none";
    });
    setShowAddressModal(false);
    setSelectedAddress(null);
    setAddressSearchText("");
    setCurrentLocation(null);
    setHasExistingAddress(false);
  };

  const openAddressModal = () => {
    const existing = formik.values.address;
    setAddressSearchText(existing || "");
    if (
      existing &&
      hasValidLocationCoords(formik.values.lat, formik.values.long)
    ) {
      setSelectedAddress({
        label: existing,
        lat: parseFloat(formik.values.lat),
        lng: parseFloat(formik.values.long),
        value: { description: existing },
        place: {
          formatted_address: existing,
          address_components: [],
          geometry: {
            location: {
              lat: () => parseFloat(formik.values.lat),
              lng: () => parseFloat(formik.values.long),
            },
          },
        },
      });
      setHasExistingAddress(true);
    } else {
      setSelectedAddress(null);
      setHasExistingAddress(false);
    }
    setShowAddressModal(true);
  };

  const applyAddressSelection = () => {
    if (
      !selectedAddress?.place ||
      !hasValidLocationCoords(selectedAddress.lat, selectedAddress.lng)
    ) {
      toast.error(
        "Please choose a location from Google search suggestions or pin it on the map"
      );
      return;
    }

    const hasComponents =
      Array.isArray(selectedAddress.place.address_components) &&
      selectedAddress.place.address_components.length > 0;

    if (hasComponents) {
      handlePlaceSelect(
        selectedAddress.place,
        formik.setFieldValue,
        formik.setFieldTouched,
        formik.values
      );
    } else {
      const label =
        selectedAddress.place.formatted_address ||
        selectedAddress.label ||
        selectedAddress.value?.description;
      if (label) {
        formik.setFieldValue("address", label);
        formik.setFieldTouched("address", true);
      }
    }

    formik.setFieldValue("lat", selectedAddress.lat);
    formik.setFieldValue("long", selectedAddress.lng);
    formik.setFieldTouched("lat", true);
    formik.setFieldTouched("long", true);

    closeAddressModal();
  };

  useEffect(() => {
    if (
      showAddressModal &&
      !currentLocation &&
      !selectedAddress &&
      !hasExistingAddress
    ) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            setCurrentLocation({
              lat: DEFAULT_ZIMBABWE_LOCATION.lat,
              lng: DEFAULT_ZIMBABWE_LOCATION.lng,
            });
          }
        );
      } else {
        setCurrentLocation({
          lat: DEFAULT_ZIMBABWE_LOCATION.lat,
          lng: DEFAULT_ZIMBABWE_LOCATION.lng,
        });
      }
    }
  }, [showAddressModal, currentLocation, selectedAddress, hasExistingAddress]);

  useEffect(() => {
    if (!showAddressModal) return undefined;
    const style = document.createElement("style");
    style.id = "edit-company-pac-zindex";
    style.textContent = `
      .pac-container { z-index: 1055 !important; position: absolute !important; }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById("edit-company-pac-zindex");
      if (existing) existing.remove();
    };
  }, [showAddressModal]);

  const triggerFileInput = () => {
    if (profileInputRef.current) {
      profileInputRef.current.value = null;
      profileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      formik.setFieldValue("profile_image", file);
      setPreview(URL.createObjectURL(file));
    } else {
      toast.error("File size exceeds 10 MB limit");
    }
  };

  const getProfileApiCall = useCallback(async () => {
    const apiRes = await dispatch(CustomerActions.getProfile());
    if (apiRes?.payload?.success) {
      dispatch(setCustomer(apiRes?.payload?.data));
    }
  }, [dispatch]);

  useEffect(() => {
    if (token) getProfileApiCall();
  }, [token, getProfileApiCall]);

  useEffect(() => {
    setPreview(customerDetails?.profile_image || "");
  }, [customerDetails]);

  const handleSocialMediaSubmit = (e) => {
    e.preventDefault();
    setShowSocialMediaModal(false);
  };

  const handleReferenceSubmit = async (e) => {
    e.preventDefault();
    const referenceData = {
      reference_name: formik.values.reference_name,
      relation: formik.values.relation,
      designation: formik.values.designation,
      referenceEmail: formik.values.referenceEmail,
      ref_phone_number: formik.values.ref_phone_number,
      corporateCategoryId: formik.values.corporateCategoryId,
    };
    await dispatch(ServiceActions.updateReference(referenceData));
    setShowReferenceModal(false);
  };

  useEffect(() => {
    dispatch(ServiceActions.getIdentificationList());
    dispatch(ServiceActions.getCorporateCategoryList());
  }, [dispatch]);

  useEffect(() => {
    if (customerDetails?.role != null && customerDetails.role !== "") {
      setRole(customerDetails.role);
    }
  }, [customerDetails?.role]);

  return (
    <Layout>
      <div className="p-2 p-md-5">
        <Container fluid>
          <Row>
            <Col lg={6} className="mx-auto">
              <div className="complete-profile-box mt-5">
                <div className="login-box-inner-wrap py-4 px-1">
                  <h2>Edit Basic Details</h2>
                  <p className="mb-4">Edit Your Details Clearly!</p>

                  <div className="profile-upload-sec mb-4">
                    <div style={{ position: "relative" }}>
                      {preview ? (
                        <div
                          onClick={triggerFileInput}
                          style={{ cursor: "pointer", position: "relative" }}
                        >
                          <img
                            src={
                              preview.startsWith("blob:") ||
                              preview.startsWith("http")
                                ? preview
                                : ImagePathCustomer(preview)
                            }
                            alt="Profile Preview"
                            onError={handleUserImageError}
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
                          onClick={triggerFileInput}
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
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  <Form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const errors = await formik.validateForm();
                      if (Object.keys(errors).length > 0) {
                        formik.setTouched(
                          Object.keys(formik.values).reduce((acc, key) => {
                            acc[key] = true;
                            return acc;
                          }, {})
                        );
                        toast.error(
                          "Please fill all required fields and set your location on the map"
                        );
                        return;
                      }
                      formik.handleSubmit();
                    }}
                  >
                    <Row>
                      <Col lg={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Owner Name</Form.Label>
                          <Form.Control
                            type="text"
                            name="full_name"
                            value={formik.values.full_name}
                            onChange={formik.handleChange}
                            placeholder="Enter Owner Name"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    {!isCorporate && (
                      <Row>
                        <Col lg={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Identify Yourself*</Form.Label>
                            <Form.Control
                              as="select"
                              name="identify_yourself"
                              className="form-select"
                              value={formik.values.identify_yourself}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                            >
                              <option value="">Select</option>
                              {identificationLists?.data?.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </Form.Control>
                            <FieldError formik={formik} name="identify_yourself" />
                          </Form.Group>
                        </Col>

                        <Col lg={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Company Name*</Form.Label>
                            <Form.Control
                              type="text"
                              name="company_name"
                              value={formik.values.company_name || ""}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                              placeholder="Enter Company Name"
                            />
                            <FieldError formik={formik} name="company_name" />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    {isCorporate && (
                      <Row>
                        <Col lg={12}>
                          <Form.Group className="mb-3">
                            <Form.Label>Business Category*</Form.Label>
                            <Form.Control
                              as="select"
                              name="corporateCategoryId"
                              className="form-select"
                              value={formik.values.corporateCategoryId}
                              onChange={formik.handleChange}
                              onBlur={formik.handleBlur}
                            >
                              <option value="">Select</option>
                              {corporateCategory?.data?.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {item.name}
                                </option>
                              ))}
                            </Form.Control>
                            <FieldError
                              formik={formik}
                              name="corporateCategoryId"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    <Row>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Phone Number*</Form.Label>
                          <PhoneNumberInput
                            initialCountry="in"
                            value={
                              formik.values.country_code &&
                              formik.values.phone_number
                                ? `${formik.values.country_code} ${formik.values.phone_number}`
                                : formik.values.phone_number || ""
                            }
                            onPhoneChange={(phone, countryCode) => {
                              formik.setFieldValue("phone_number", phone);
                              formik.setFieldValue("country_code", countryCode);
                              formik.setFieldTouched("phone_number", true);
                            }}
                          />
                          <FieldError formik={formik} name="phone_number" />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email Address*</Form.Label>
                          <Form.Control
                            readOnly
                            className="text-muted"
                            type="email"
                            name="email"
                            value={formik.values.email}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div>
                      <h6>Address*</h6>
                    </div>
                    <Row>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>House Number*</Form.Label>
                          <Form.Control
                            type="text"
                            name="house_number"
                            value={formik.values.house_number}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            placeholder="Enter House Number"
                          />
                          <FieldError formik={formik} name="house_number" />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <Form.Label className="mb-0">Street Address*</Form.Label>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none"
                              style={{
                                color: "#0f5c4c",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                              }}
                              onClick={openAddressModal}
                            >
                              Pick on map
                            </button>
                          </div>
                          <Form.Control
                            type="text"
                            name="address"
                            value={formik.values.address}
                            readOnly
                            placeholder="Use Pick on map to select address"
                            onClick={openAddressModal}
                            onBlur={formik.handleBlur}
                            style={{ cursor: "pointer", background: "#fafafa" }}
                          />
                          <FieldError formik={formik} name="address" />
                          {(formik.touched.lat || formik.touched.long) &&
                            (formik.errors.lat || formik.errors.long) && (
                              <div
                                className="text-danger small mt-1"
                                style={{ fontWeight: 600 }}
                              >
                                Please search or pin your location on the map
                              </div>
                            )}
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Suburbs*</Form.Label>
                          <Form.Control
                            type="text"
                            name="suburbs"
                            value={formik.values.suburbs}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            placeholder="Enter Suburbs"
                          />
                          <FieldError formik={formik} name="suburbs" />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Country*</Form.Label>
                          <CountrySelect
                            name="country"
                            value={formik.values.country}
                            onChange={(country) => {
                              formik.setFieldValue("country", country);
                              formik.setFieldTouched("country", true, false);
                            }}
                            onBlur={() => formik.setFieldTouched("country", true)}
                            placeholder="Search and select country"
                          />
                          <FieldError formik={formik} name="country" />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Post Code or PO Box*</Form.Label>
                          <Form.Control
                            type="text"
                            name="post_code"
                            value={formik.values.post_code}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            placeholder="Enter Post Code or PO Box"
                          />
                          <FieldError formik={formik} name="post_code" />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Landmark (Optional)</Form.Label>
                          <Form.Control
                            type="text"
                            name="landMark"
                            value={formik.values.landMark}
                            onChange={formik.handleChange}
                            placeholder="Enter Landmark (Optional)"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row className="mb-3 g-3">
                      <Col lg={6}>
                        <div className="submit-btn">
                          <button
                            type="button"
                            className="submit forgot-btn w-100"
                            onClick={() => setShowSocialMediaModal(true)}
                          >
                            Social Media Links
                          </button>
                        </div>
                      </Col>
                      {isCorporate ? (
                        <Col lg={6}>
                          <div className="submit-btn">
                            <button
                              type="submit"
                              className="submit forgot-btn w-100"
                              disabled={isLoader}
                            >
                              {isLoader ? <ButtonLoader /> : "Save"}
                            </button>
                          </div>
                        </Col>
                      ) : isServiceProvider ? (
                        <Col lg={6}>
                          <div className="submit-btn">
                            <button
                              type="button"
                              className="submit forgot-btn w-100"
                              onClick={() => setShowReferenceModal(true)}
                            >
                              Reference Details
                            </button>
                          </div>
                        </Col>
                      ) : null}
                    </Row>
                    {!isCorporate && (
                      <div className="submit-btn">
                        <button
                          type="submit"
                          className="submit forgot-btn w-50"
                          disabled={isLoader}
                        >
                          {isLoader ? <ButtonLoader /> : "Save"}
                        </button>
                      </div>
                    )}
                  </Form>

                  <Modal
                    show={showSocialMediaModal}
                    onHide={() => setShowSocialMediaModal(false)}
                  >
                    <Modal.Header closeButton>
                      <Modal.Title>Social Media Links</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <Form onSubmit={handleSocialMediaSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>Facebook</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Enter Facebook Link"
                            name="facebook_link"
                            value={formik.values.facebook_link}
                            onChange={formik.handleChange}
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label>Instagram</Form.Label>
                          <Form.Control
                            type="text"
                            placeholder="Enter Instagram Link"
                            name="instagram_link"
                            value={formik.values.instagram_link}
                            onChange={formik.handleChange}
                          />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Label>Website</Form.Label>
                          <Form.Control
                            placeholder="Enter Website Link"
                            type="text"
                            name="website_link"
                            value={formik.values.website_link}
                            onChange={formik.handleChange}
                          />
                        </Form.Group>
                        <div className="submit-btn">
                          <button type="submit" className="submit w-50">
                            Save
                          </button>
                        </div>
                      </Form>
                    </Modal.Body>
                  </Modal>

                  <Modal
                    show={showReferenceModal}
                    onHide={() => setShowReferenceModal(false)}
                  >
                    <Modal.Header closeButton>
                      <Modal.Title>Reference Details</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <Form onSubmit={handleReferenceSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>Name</Form.Label>
                          <Form.Control
                            type="text"
                            name="reference_name"
                            value={formik.values.reference_name}
                            onChange={formik.handleChange}
                          />
                        </Form.Group>
                        <Row>
                          <Col lg={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Relation</Form.Label>
                              <Form.Control
                                type="text"
                                name="relation"
                                value={formik.values.relation}
                                onChange={formik.handleChange}
                              />
                            </Form.Group>
                          </Col>
                          <Col lg={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Designation</Form.Label>
                              <Form.Control
                                type="text"
                                name="designation"
                                value={formik.values.designation}
                                onChange={formik.handleChange}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        <Row>
                          <Col lg={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Email</Form.Label>
                              <Form.Control
                                type="email"
                                name="referenceEmail"
                                value={formik.values.referenceEmail}
                                onChange={formik.handleChange}
                              />
                            </Form.Group>
                          </Col>
                          <Col lg={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Phone Number</Form.Label>
                              <PhoneNumberInput
                                initialCountry="in"
                                value={formik.values.ref_phone_number || ""}
                                onChange={(phone) => {
                                  formik.setFieldValue(
                                    "ref_phone_number",
                                    phone
                                  );
                                  formik.setFieldTouched(
                                    "ref_phone_number",
                                    true
                                  );
                                }}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                        <div className="submit-btn">
                          <button type="submit" className="submit w-50">
                            Save
                          </button>
                        </div>
                      </Form>
                    </Modal.Body>
                  </Modal>
                  <Modal
                    show={showAddressModal}
                    onHide={closeAddressModal}
                    backdrop="static"
                    keyboard={false}
                    enforceFocus={false}
                    restoreFocus={false}
                    centered
                    size="lg"
                    style={{ zIndex: 1050 }}
                  >
                    <Modal.Header closeButton className="border-none pb-0">
                      <Modal.Title>Select Address</Modal.Title>
                    </Modal.Header>
                    <Modal.Body
                      style={{
                        position: "relative",
                        overflow: "visible",
                        padding: "20px",
                      }}
                    >
                      <div className="comman-small-pop" style={{ position: "relative" }}>
                        <p className="text-muted small mb-3">
                          Search with Google and pick a suggestion, or click the
                          map to pin a location if the exact area is not listed.
                        </p>
                        <div className="mb-3" style={{ position: "relative" }}>
                          <label
                            className="form-label"
                            style={{ marginBottom: "8px", display: "block" }}
                          >
                            Search Address
                          </label>
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              display: "flex",
                              gap: "10px",
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ flex: 1, position: "relative" }}>
                              <AddressAutocomplete
                                key={`edit-company-ac-${showAddressModal}-${selectedAddress?.label || ""}`}
                                apiKey={mapsApiKey}
                                onPlaceSelected={(place) => {
                                  if (!place) return;
                                  const geometry = place.geometry?.location;
                                  const address =
                                    place.formatted_address || place.name;
                                  let lat;
                                  let lng;
                                  if (geometry) {
                                    lat =
                                      typeof geometry.lat === "function"
                                        ? geometry.lat()
                                        : geometry.lat;
                                    lng =
                                      typeof geometry.lng === "function"
                                        ? geometry.lng()
                                        : geometry.lng;
                                  }
                                  if (lat != null && lng != null) {
                                    setSelectedAddress({
                                      label: address,
                                      lat: parseFloat(lat),
                                      lng: parseFloat(lng),
                                      value: { description: address },
                                      place,
                                    });
                                    setCurrentLocation(null);
                                  }
                                }}
                                defaultValue={
                                  selectedAddress?.label ||
                                  addressSearchText ||
                                  formik.values.address ||
                                  ""
                                }
                                options={{
                                  types: ["geocode", "establishment"],
                                  componentRestrictions: { country: [] },
                                }}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setAddressSearchText(next);
                                  if (
                                    selectedAddress &&
                                    next !== selectedAddress.label
                                  ) {
                                    setSelectedAddress(null);
                                  }
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                padding: "8px 20px",
                                borderRadius: "8px",
                                whiteSpace: "nowrap",
                                height: "38px",
                                background: "#0f5c4c",
                                borderColor: "#0f5c4c",
                              }}
                              onClick={applyAddressSelection}
                              disabled={
                                !selectedAddress?.place ||
                                !hasValidLocationCoords(
                                  selectedAddress?.lat,
                                  selectedAddress?.lng
                                )
                              }
                            >
                              Select
                            </button>
                          </div>
                        </div>
                        <div
                          className="mt-3"
                          style={{
                            height: "400px",
                            width: "100%",
                            minHeight: "400px",
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          <MapComponent
                            key={`edit-company-map-${showAddressModal}-${
                              selectedAddress?.lat ??
                              currentLocation?.lat ??
                              DEFAULT_ZIMBABWE_LOCATION.lat
                            }`}
                            coordinates={
                              selectedAddress?.lat != null &&
                              selectedAddress?.lng != null
                                ? [
                                    parseFloat(selectedAddress.lng),
                                    parseFloat(selectedAddress.lat),
                                  ]
                                : hasValidLocationCoords(
                                      formik.values.lat,
                                      formik.values.long
                                    )
                                  ? [
                                      parseFloat(formik.values.long),
                                      parseFloat(formik.values.lat),
                                    ]
                                  : currentLocation
                                    ? [
                                        parseFloat(currentLocation.lng),
                                        parseFloat(currentLocation.lat),
                                      ]
                                    : [
                                        DEFAULT_ZIMBABWE_LOCATION.lng,
                                        DEFAULT_ZIMBABWE_LOCATION.lat,
                                      ]
                            }
                            address={
                              selectedAddress?.value?.description ||
                              selectedAddress?.label ||
                              formik.values.address ||
                              (currentLocation
                                ? "Current Location"
                                : DEFAULT_ZIMBABWE_LOCATION.address)
                            }
                            onMapClick={async (clickedPosition) => {
                              try {
                                if (!window.google?.maps?.Geocoder) {
                                  toast.error(
                                    "Map is still loading. Please try again."
                                  );
                                  return;
                                }
                                const geocoder = new window.google.maps.Geocoder();
                                geocoder.geocode(
                                  { location: clickedPosition },
                                  (results, status) => {
                                    if (status === "OK" && results?.[0]) {
                                      const place = {
                                        formatted_address:
                                          results[0].formatted_address,
                                        address_components:
                                          results[0].address_components,
                                        geometry: {
                                          location: {
                                            lat: () => clickedPosition.lat,
                                            lng: () => clickedPosition.lng,
                                          },
                                        },
                                      };
                                      setSelectedAddress({
                                        label: results[0].formatted_address,
                                        lat: clickedPosition.lat,
                                        lng: clickedPosition.lng,
                                        value: {
                                          description:
                                            results[0].formatted_address,
                                        },
                                        place,
                                      });
                                      setCurrentLocation(null);
                                    } else {
                                      toast.error(
                                        "Could not get address for selected location"
                                      );
                                    }
                                  }
                                );
                              } catch (error) {
                                console.error(
                                  "Error reverse geocoding:",
                                  error
                                );
                                toast.error(
                                  "Error getting address for selected location"
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={closeAddressModal}
                      >
                        Cancel
                      </button>
                    </Modal.Footer>
                  </Modal>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </Layout>
  );
}
