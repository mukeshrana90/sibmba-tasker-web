import React, { useState, useEffect, useRef } from "react";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import defaultSilhouette from "../Assets/Images/silhotte.svg";
import uploadSvg from "../Assets/Images/upload.svg";
import PhoneNumberInput from "./PhoneNumberInput";
import SuccessModal from "./Modals/SuccessModal";
import AddressAutocomplete from "./AddressAutocomplete";
import MapComponent from "./MapComponent";
import CountrySelect, { findCountryOption } from "./CountrySelect";
import { getGoogleMapsApiKey, loadGooglePlaces } from "../utils/landingPlaces";
import { toast } from "react-toastify";
import { timeSchedule, weekDays } from "../utils/rawjson";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useNavigate } from "react-router-dom";

function hasValidLocationCoords(lat, lng) {
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  if (Number.isNaN(latN) || Number.isNaN(lngN)) return false;
  if (latN === 0 && lngN === 0) return false;
  return true;
}

function formatLocationDisplay(address, lat, lng) {
  if (!hasValidLocationCoords(lat, lng)) return "";
  return `latitude: ${Number(lat).toFixed(6)}, longitude: ${Number(lng).toFixed(6)}`;
}

const locationCoordsRequired = Yup.mixed().test(
  "pick-location",
  "Location is required",
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

function ProviderLocationAutoDetect({
  currentStep,
  values,
  setFieldValue,
  setFieldTouched,
  detectAndFillCurrentLocation,
  triedRef,
}) {
  useEffect(() => {
    if (currentStep !== 1 || triedRef.current) return;
    triedRef.current = true;
    detectAndFillCurrentLocation(setFieldValue, setFieldTouched, values);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when company-details step opens
  }, [currentStep]);

  return null;
}

const ProviderForm = ({
  currentStep,
  setCurrentStep,
  handleSubmit,
  handleServiceSubmit,
  isCorporate,
  showModalCop, 
  setShowModalCop
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
    ref_phone_number: "",
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
    address: "",
    corporateCategoryId: "",
    reference_skip: false,
    document_skip: false,
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
      ...(isCorporate
        ? {
            corporateCategoryId: Yup.string().nullable(),
            address: Yup.string().trim().required("Location is required"),
            street_address: Yup.string().trim().nullable(),
          }
        : {
            company_name: Yup.string().trim().nullable(),
            identify_yourself: Yup.string().nullable(),
            street_address: Yup.string()
              .trim()
              .required("Location is required"),
          }),
      house_number: Yup.string().trim().nullable(),
      lat: locationCoordsRequired,
      long: locationCoordsRequired,
      suburbs: Yup.string().trim().nullable(),
      country: Yup.string()
        .trim()
        .nullable()
        .test(
          "valid-country",
          "Please select a valid country from the list",
          (value) => !value || !!findCountryOption(value)
        ),
      post_code_or_po_box: Yup.string().trim().nullable(),
      landmark: Yup.string().trim().nullable(),
    }),
    // Step 2: Reference Details
    isCorporate
      ? Yup.object({})
      : Yup.object({
          reference_name: Yup.string().trim().required("Name is required"),
          relation: Yup.string().trim().required("Relation is required"),
          designation: Yup.string().trim().nullable(),
          referenceEmail: Yup.string()
            .email("Invalid email")
            .required("Email is required"),
          ref_phone_number: Yup.string()
            .trim()
            .required("Phone number is required"),
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
  const corporateCategory = useSelector((e) => e.service.corporateCategory);
  const [previews, setPreviews] = useState({
    profile_image: "",
    govtIssueId: "",
    businessLicence: "",
    permit: "",
    certifications: "",
    images: [],
  });
  const [, setEditMode] = useState({
    profile_image: false,
    govtIssueId: false,
    businessLicence: false,
    permit: false,
    certifications: false,
    images: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState("street_address");
  const [addressSearchText, setAddressSearchText] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hasExistingAddress, setHasExistingAddress] = useState(false);
  const locationAutoDetectTried = useRef(false);
  const mapsApiKey =
    getGoogleMapsApiKey() || "AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww";

  // Get current location when modal opens
  useEffect(() => {
    if (showAddressModal && !currentLocation && !selectedAddress && !hasExistingAddress) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Error getting current location:", error);
            // If geolocation fails, use default Zimbabwe location
            setCurrentLocation({
              lat: DEFAULT_ZIMBABWE_LOCATION.lat,
              lng: DEFAULT_ZIMBABWE_LOCATION.lng,
            });
          }
        );
      } else {
        // If geolocation is not available, use default Zimbabwe location
        setCurrentLocation({
          lat: DEFAULT_ZIMBABWE_LOCATION.lat,
          lng: DEFAULT_ZIMBABWE_LOCATION.lng,
        });
      }
    }

    // Fix Google Places Autocomplete dropdown z-index when modal is open
    if (showAddressModal) {
      const fixPacContainer = () => {
        const pacContainers = document.querySelectorAll('.pac-container');
        pacContainers.forEach((container) => {
          if (container) {
            container.style.zIndex = '1055';
            container.style.position = 'absolute';
          }
        });
      };

      // Fix immediately and also after a short delay to catch dynamically created containers
      fixPacContainer();
      const interval = setInterval(fixPacContainer, 100);

      return () => {
        clearInterval(interval);
      };
    }
  }, [showAddressModal, currentLocation, selectedAddress, hasExistingAddress]);

  const profileInputRef = useRef(null);
  const govtIssueIdInputRef = useRef(null);
  const businessLicenceInputRef = useRef(null);
  const permitInputRef = useRef(null);
  const certificationsInputRef = useRef(null);
  const serviceImagesInputRefs = [useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    dispatch(ServiceActions.getCategoryList());
    dispatch(ServiceActions.getIdentificationList());
    dispatch(ServiceActions.getCorporateCategoryList());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke blob URLs on unmount only
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
    const addressComponents = place?.address_components || [];
    const geometry = place.geometry?.location;
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

    const fullAddress =
      place?.formatted_address ||
      place?.name ||
      [streetNumber, route].filter(Boolean).join(" ").trim() ||
      premise ||
      neighborhood ||
      sublocality ||
      "";

    // Location field (visible) + keep hidden address parts for API payload
    setFieldValue("street_address", fullAddress);
    if (isCorporate) {
      setFieldValue("address", fullAddress);
    }
    if (!values.house_number || !values.house_number.trim()) {
      setFieldValue("house_number", streetNumber || "");
    }
    setFieldValue("suburbs", suburb || sublocality || city);
    setFieldValue(
      "country",
      findCountryOption(country)?.value || country || ""
    );
    setFieldValue("post_code_or_po_box", postalCode);
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
    setFieldTouched("street_address", true);
    if (isCorporate) setFieldTouched("address", true);
    setFieldTouched("lat", true);
    setFieldTouched("long", true);
    if (streetNumber) {
      setFieldTouched("house_number", true);
    }
  };

  const detectAndFillCurrentLocation = async (
    setFieldValue,
    setFieldTouched,
    values
  ) => {
    const addressValue = isCorporate ? values.address : values.street_address;
    if (
      (addressValue && String(addressValue).trim()) ||
      hasValidLocationCoords(values.lat, values.long)
    ) {
      return;
    }

    const applyCoords = async (lat, lng) => {
      try {
        await loadGooglePlaces();
        if (!window.google?.maps?.Geocoder) return;
        const geocoder = new window.google.maps.Geocoder();
        const results = await new Promise((resolve) => {
          geocoder.geocode({ location: { lat, lng } }, (res, status) => {
            resolve(status === "OK" && res?.[0] ? res : null);
          });
        });
        if (results?.[0]) {
          handlePlaceSelect(results[0], setFieldValue, setFieldTouched, values);
          return;
        }
      } catch (err) {
        console.error("Reverse geocode failed:", err);
      }
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setFieldValue("street_address", fallback);
      if (isCorporate) setFieldValue("address", fallback);
      setFieldValue("lat", lat);
      setFieldValue("long", lng);
    };

    if (!navigator.geolocation) {
      toast.info(
        "Location access is not available in this browser. Please use Pick on map to set your location."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        await applyCoords(lat, lng);
      },
      (error) => {
        const denied = error?.code === 1; // PERMISSION_DENIED
        toast.warn(
          denied
            ? "Please allow location access so we can fill your Location, or use Pick on map."
            : "Could not detect your location. Please allow location access or use Pick on map."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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

  const openAddressModal = (target, values) => {
    setAddressModalTarget(target);
    const existing =
      target === "address" ? values.address : values.street_address;
    setAddressSearchText(existing || "");
    if (existing && values.lat && values.long) {
      setSelectedAddress({
        label: existing,
        lat: parseFloat(values.lat),
        lng: parseFloat(values.long),
        value: { description: existing },
      });
      setHasExistingAddress(true);
    } else {
      setSelectedAddress(null);
      setHasExistingAddress(false);
    }
    setShowAddressModal(true);
  };

  const applyAddressSelection = (setFieldValue, setFieldTouched, values) => {
    if (
      !selectedAddress?.place ||
      !hasValidLocationCoords(selectedAddress.lat, selectedAddress.lng)
    ) {
      toast.error(
        "Please choose a location from Google search suggestions or pin it on the map"
      );
      return;
    }

    const label =
      selectedAddress.place.formatted_address ||
      selectedAddress.label ||
      selectedAddress.value?.description;

    handlePlaceSelect(
      selectedAddress.place,
      setFieldValue,
      setFieldTouched,
      values
    );

    setFieldValue("lat", selectedAddress.lat);
    setFieldValue("long", selectedAddress.lng);
    setFieldTouched("lat", true);
    setFieldTouched("long", true);

    if (label) {
      if (isCorporate && addressModalTarget === "address") {
        setFieldValue("address", label);
        setFieldTouched("address", true);
      } else {
        setFieldValue("street_address", label);
        setFieldTouched("street_address", true);
      }
    }

    closeAddressModal();
  };

  const validatePreviousSteps = async (values) => {
    for (let i = 0; i < currentStep; i++) {
      // Skip validation for step 2 (reference step) if reference_skip is true
      if (i === 2 && !isCorporate && (values.reference_skip === true || values.reference_skip === "true")) {
        continue;
      }
      // Skip validation for step 3 (document step) if document_skip is true
      if (i === 3 && !isCorporate && (values.document_skip === true || values.document_skip === "true")) {
        continue;
      }
      try {
        await validationSchemas[i].validate(values, { abortEarly: false });
      } catch (errors) {
        return false;
      }
    }
    return true;
  };

  const filterApiPayload = (values) => {
    const { suburbs, country, post_code_or_po_box, landmark, ...filteredValues } =
      values;

    // Map form keys to DB keys for edit-profile (/edit-profile-company).
    return {
      ...filteredValues,
      ...(suburbs ? { suburbs } : {}),
      ...(country ? { country } : {}),
      ...(post_code_or_po_box ? { post_code: post_code_or_po_box } : {}),
      ...(landmark ? { landMark: landmark } : {}),
    };
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
    touched,
    handleSubmit,
    setCurrentStep,
    filterApiPayload,
    errors,
    isSubmitting,
    showAddressModal,
    setShowAddressModal,
    selectedAddress,
    setSelectedAddress,
    handlePlaceSelect,
    currentLocation
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
                <div className="form-set" >
                  <Form.Group className="mb-3" controlId="formIdentifyYourself">
                    <Form.Label>
                      {isCorporate
                        ? "Business Category"
                        : "Identify yourself"}
                    </Form.Label>

                    {isCorporate ? (
                      <Field name="corporateCategoryId">
                        {({ field }) => (
                          <select {...field} className="form-select">
                            <option value="">Select</option>
                            {corporateCategory?.data?.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    ) : (
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
                    )}

                    <ErrorMessage
                      name={
                        isCorporate
                          ? "corporateCategoryId"
                          : "identify_yourself"
                      }
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              {isCorporate ? (
                <Col lg={12}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId="formShopName">
                      <Form.Label className="d-flex align-items-center justify-content-between gap-2">
                        <span>Location*</span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          onClick={() => openAddressModal("address", values)}
                        >
                          Pick on map
                        </button>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        readOnly
                        value={formatLocationDisplay(
                          values.address,
                          values.lat,
                          values.long
                        )}
                        placeholder="Allow location access or use Pick on map"
                        onClick={() => openAddressModal("address", values)}
                        style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
                      />
                      <ErrorMessage
                        name="address"
                        component="div"
                        className="text-danger"
                      />
                      {(errors.lat || errors.long) && (touched.address || touched.lat) && (
                        <div className="text-danger small mt-1">
                          Location is required. Allow access or use Pick on map.
                        </div>
                      )}
                    </Form.Group>
                  </div>
                </Col>
              ) : (
                <Col lg={6}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId="formCompanyName">
                      <Form.Label>Company Name</Form.Label>
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

              {/* Hidden but still submitted: house_number, suburbs, country, post_code */}
              <Col lg={6} className="d-none">
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formHouseNumber">
                    <Form.Label>House Number</Form.Label>
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
              {!isCorporate && (
                <Col lg={12}>
                  <div className="form-set">
                    <Form.Group className="mb-3" controlId="formStreetAddress">
                      <Form.Label className="d-flex align-items-center justify-content-between gap-2">
                        <span>Location*</span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          onClick={() => openAddressModal("street_address", values)}
                        >
                          Pick on map
                        </button>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        readOnly
                        value={formatLocationDisplay(
                          values.street_address,
                          values.lat,
                          values.long
                        )}
                        placeholder="Allow location access or use Pick on map"
                        onClick={() =>
                          openAddressModal("street_address", values)
                        }
                        style={{ cursor: "pointer", backgroundColor: "#f8f9fa" }}
                      />
                      <ErrorMessage
                        name="street_address"
                        component="div"
                        className="text-danger"
                      />
                      {(errors.lat || errors.long) &&
                        (touched.street_address || touched.lat) && (
                        <div className="text-danger small mt-1">
                          Location is required. Allow access or use Pick on map.
                        </div>
                      )}
                    </Form.Group>
                  </div>
                </Col>
              )}
              <Col lg={6} className="d-none">
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
              <Col lg={6} className="d-none">
                <div className="form-set">
                  <Form.Group className="mb-3" controlId="formCountry">
                    <Form.Label>Country</Form.Label>
                    <CountrySelect
                      name="country"
                      value={values.country}
                      onChange={(country) => {
                        setFieldValue("country", country);
                        setFieldTouched("country", true, false);
                      }}
                      onBlur={() => setFieldTouched("country", true)}
                      placeholder="Search and select country"
                      variant="provider"
                    />
                    <ErrorMessage
                      name="country"
                      component="div"
                      className="text-danger"
                    />
                  </Form.Group>
                </div>
              </Col>
              <Col lg={6} className="d-none">
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
      case !isCorporate && 2:
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
                    {touched.reference_name && errors.reference_name && (
                      <div className="text-danger">{errors.reference_name}</div>
                    )}
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
                    {touched.relation && errors.relation && (
                      <div className="text-danger">{errors.relation}</div>
                    )}
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
                    {touched.referenceEmail && errors.referenceEmail && (
                      <div className="text-danger">{errors.referenceEmail}</div>
                    )}
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
                  initialCountry="zw"
                  value={values.ref_phone_number || ""}
                  setFieldValue={setFieldValue}
                  onChange={(phone) => {
                    setFieldValue("ref_phone_number", phone);
                    setFieldTouched("ref_phone_number", true);
                  }}
                  error={
                    touched.ref_phone_number && (
                      <ErrorMessage
                        name="ref_phone_number"
                        component="div"
                        className="text-danger"
                      />
                    )
                  }
                  touched={touched.ref_phone_number}
                />
              </Col>
            </Row>
          </div>
        );
      case isCorporate ? 2 : 3:
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
                                background: "#0f5c4c",
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
                                stroke="#0f5c4c"
                                strokeWidth="2.14998"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M4.73047 21.9954C4.73047 13.9718 4.73047 9.95999 7.22309 7.46735C9.71572 4.97473 13.7275 4.97473 21.7512 4.97473C29.7747 4.97473 33.7866 4.97473 36.2793 7.46735C38.7719 9.95999 38.7719 13.9718 38.7719 21.9954C38.7719 30.019 38.7719 34.0309 36.2793 36.5236C33.7866 39.0161 29.7747 39.0161 21.7512 39.0161C13.7275 39.0161 9.71572 39.0161 7.22309 36.5236C4.73047 34.0309 4.73047 30.019 4.73047 21.9954Z"
                                stroke="#0f5c4c"
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
      case isCorporate ? 3 : 4:
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
                              alt={`Service ${index + 1} preview`}
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
                                background: "#0f5c4c",
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
                        <Col className="availability-slots">
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
                        <div className="availability-slots">
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
      validateOnChange={false}
      validateOnBlur={false}
      validateOnMount={false}
      enableReinitialize={true}
      onSubmit={async (values, { setSubmitting, setTouched, validateForm }) => {
        // Mark reference fields as touched only when user clicks Continue (not on page load)
        if (currentStep === 2 && !isCorporate) {
          const errors = await validateForm();
          if (errors && Object.keys(errors).length > 0) {
            setTouched({
              reference_name: true,
              relation: true,
              referenceEmail: true,
              ref_phone_number: true,
            });
            setSubmitting(false);
            return;
          }
        }
        
        if (currentStep === 0 && !values.profile_image) {
          toast.error("Please upload a profile image before proceeding.");
          setSubmitting(false);
          return;
        }

        if (currentStep === 3 || (currentStep === 2 && isCorporate)) {
          // Skip document validation if document_skip is true
          if (!values.document_skip) {
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
        }

        // Skip validation check for provider side if reference or documents were skipped
        // Only validate previous steps if we're not skipping any steps
        const shouldSkipValidation = 
          (!isCorporate && currentStep === 3 && values.reference_skip === true) ||
          (!isCorporate && currentStep === 4 && (values.reference_skip === true || values.document_skip === true));
        
        if (!shouldSkipValidation) {
          const previousStepsValid = await validatePreviousSteps(values);
          if (!previousStepsValid) {
            toast.error("Please complete all previous steps before proceeding.");
            setSubmitting(false);
            return;
          }
        }
        if (currentStep < 3) {
          if (currentStep === 2 && isCorporate) {
            setSubmitting(true);
            try {
              const filteredValues = filterApiPayload(values);
              await handleSubmit(filteredValues);
              setShowModal(true);
            } catch (error) {
              toast.error("An error occurred during submission.");
            } finally {
              setSubmitting(false);
            }
          } else {
            setCurrentStep(currentStep + 1);
          }
        } else if (currentStep === 3) {
          // If documents were skipped, proceed without validation
          if (!isCorporate && values.document_skip) {
            setCurrentStep(currentStep + 1);
            setSubmitting(false);
            return;
          }
          
          setSubmitting(true);
          try {
            const filteredValues = filterApiPayload(values);
            await handleSubmit(filteredValues);
            // setShowModal(true);
            // setCurrentStep(currentStep + 1);
            if (isCorporate) {
              setShowModalCop(true);
            } else {
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
          <ProviderLocationAutoDetect
            currentStep={currentStep}
            values={values}
            setFieldValue={setFieldValue}
            setFieldTouched={setFieldTouched}
            detectAndFillCurrentLocation={detectAndFillCurrentLocation}
            triedRef={locationAutoDetectTried}
          />
          {renderStepContent(setFieldValue, values, setFieldTouched, touched, handleSubmit, setCurrentStep, filterApiPayload, errors, isSubmitting, showAddressModal, setShowAddressModal, selectedAddress, setSelectedAddress, handlePlaceSelect, currentLocation)}
          <div className="submit-btnn" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center" }}>
            {!isCorporate && currentStep === 2 && (
              <button
                type="button"
                className="submit forgot-btn half-width-btn"
                style={{ 
                  backgroundColor: "#f5f5f5", 
                  borderColor: "#e0e0e0",
                  color: "#333",
                  borderRadius: "16px",
                  padding: "10px 24px",
                  fontWeight: "500",
                  border: "1px solid #e0e0e0",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e8e8e8";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f5f5f5";
                }}
                disabled={isSubmitting}
                onClick={async () => {
                  try {
                    // Set reference_skip in form values so it persists across steps
                    await setFieldValue("reference_skip", true);
                    const skipValues = { ...values, reference_skip: true };
                    const filteredValues = filterApiPayload(skipValues);
                    await handleSubmit(filteredValues);
                    // Small delay to ensure form values are updated
                    setTimeout(() => {
                      setCurrentStep(currentStep + 1);
                    }, 100);
                  } catch (error) {
                    console.error("Error skipping reference:", error);
                    toast.error("An error occurred while skipping reference.");
                  }
                }}
              >
                Skip
              </button>
            )}
            {!isCorporate && currentStep === 3 && (
              <button
                type="button"
                className="submit forgot-btn half-width-btn"
                style={{ 
                  backgroundColor: "#f5f5f5", 
                  borderColor: "#e0e0e0",
                  color: "#333",
                  borderRadius: "16px",
                  padding: "10px 24px",
                  fontWeight: "500",
                  border: "1px solid #e0e0e0",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#e8e8e8";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f5f5f5";
                }}
                disabled={isSubmitting}
                onClick={async () => {
                  try {
                    // Set document_skip in form values so it persists across steps
                    await setFieldValue("document_skip", true);
                    const skipValues = { ...values, document_skip: true };
                    const filteredValues = filterApiPayload(skipValues);
                    await handleSubmit(filteredValues);
                    // Small delay to ensure form values are updated
                    setTimeout(() => {
                      setCurrentStep(currentStep + 1);
                    }, 100);
                  } catch (error) {
                    console.error("Error skipping documents:", error);
                    toast.error("An error occurred while skipping documents.");
                  }
                }}
              >
                Skip
              </button>
            )}
            <button
              type="submit"
              className="submit forgot-btn half-width-btn provider-setup-submit"
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
            show={isCorporate ? showModalCop : showModal}
            onHide={() => {
              if (isCorporate) setShowModalCop(true);
              else setShowModal(false);
            }}
            message="You’re all set!"
            onNext={() => {
              const tokenval = localStorage.getItem("temptoken");
              const token = localStorage.getItem("token");
              if (tokenval || token) {
                localStorage.setItem("token", tokenval || token);
                if (isCorporate) {
                  localStorage.setItem("role", 3);
                  navigate("/corporate/subscription-plan?type=free", { replace: true });
                } else {
                  localStorage.setItem("role", 2);
                  navigate("/requests", { replace: true });
                }
                localStorage.removeItem("temptoken");
              } else {
                toast.error("Temporary token missing. Please try again.");
              }
              setShowModal(false);
              setShowModalCop(false)
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

          {/* Address Selection Modal */}
          <Modal
            show={showAddressModal}
            onHide={closeAddressModal}
            enforceFocus={false}
            restoreFocus={false}
            centered
            size="lg"
            style={{ zIndex: 1050 }}
          >
            <style>
              {`
                .pac-container {
                  z-index: 1055 !important;
                  position: absolute !important;
                }
                .modal.show {
                  z-index: 1050 !important;
                }
                .modal-backdrop {
                  z-index: 1040 !important;
                }
              `}
            </style>
            <Modal.Header closeButton className="border-none pb-0">
              <Modal.Title>Select Address</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ position: "relative", overflow: "visible", padding: "20px" }}>
              <div className="comman-small-pop" style={{ position: "relative" }}>
                <p className="text-muted small mb-3">
                  Search with Google, pick a suggestion from the dropdown, or click
                  the map to pin your location. Manual address entry is not allowed.
                </p>
                <div className="mb-3" style={{ position: "relative" }}>
                  <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>Search Address</label>
                  <div style={{ position: "relative", width: "100%", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <AddressAutocomplete
                        key={`address-autocomplete-${showAddressModal}-${addressModalTarget}-${selectedAddress?.label}`}
                        apiKey={mapsApiKey}
                        onPlaceSelected={(place) => {
                          if (place) {
                            const geometry = place.geometry?.location;
                            const address = place.formatted_address || place.name;
                            
                            // Get lat/lng - handle both function and number formats
                            let lat, lng;
                            if (geometry) {
                              lat = typeof geometry.lat === 'function' ? geometry.lat() : (geometry.lat || geometry.lat());
                              lng = typeof geometry.lng === 'function' ? geometry.lng() : (geometry.lng || geometry.lng());
                            }
                            
                            // Store selected address for map display immediately
                            if (lat != null && lng != null) {
                              const addressData = {
                                label: address,
                                lat: parseFloat(lat),
                                lng: parseFloat(lng),
                                value: {
                                  description: address,
                                },
                                place: place // Store the place object for later use
                              };
                              setSelectedAddress(addressData);
                              setCurrentLocation(null); // Clear current location when address is selected
                            }
                            
                            // Don't populate form fields yet - wait for Select button click
                            // Don't close modal automatically - user will click Select button
                          }
                        }}
                        defaultValue={
                          selectedAddress?.label ||
                          addressSearchText ||
                          (addressModalTarget === "address"
                            ? values.address
                            : values.street_address) ||
                          ""
                        }
                        options={{
                          types: ["geocode", "establishment"],
                          componentRestrictions: { country: [] }
                        }}
                        onChange={(e) => {
                          const next = e.target.value;
                          setAddressSearchText(next);
                          if (selectedAddress && next !== selectedAddress.label) {
                            setSelectedAddress(null);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary provider-setup-select-btn"
                      style={{
                        padding: "8px 20px",
                        borderRadius: "8px",
                        whiteSpace: "nowrap",
                        height: "38px",
                        marginTop: "0",
                      }}
                      onClick={() =>
                        applyAddressSelection(
                          setFieldValue,
                          setFieldTouched,
                          values
                        )
                      }
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
                <div className="mt-3" style={{ height: "400px", width: "100%", minHeight: "400px", position: "relative", zIndex: 1 }}>
                  {((selectedAddress && selectedAddress.lat && selectedAddress.lng) || (values.lat && values.long) || currentLocation || DEFAULT_ZIMBABWE_LOCATION) ? (
                    <MapComponent
                      key={`address-map-${showAddressModal}-${selectedAddress?.lat ?? currentLocation?.lat ?? DEFAULT_ZIMBABWE_LOCATION.lat}`}
                      coordinates={
                        selectedAddress && selectedAddress.lat && selectedAddress.lng
                          ? [parseFloat(selectedAddress.lng), parseFloat(selectedAddress.lat)]
                          : values.lat && values.long
                          ? [parseFloat(values.long), parseFloat(values.lat)]
                          : currentLocation
                          ? [parseFloat(currentLocation.lng), parseFloat(currentLocation.lat)]
                          : [DEFAULT_ZIMBABWE_LOCATION.lng, DEFAULT_ZIMBABWE_LOCATION.lat]
                      }
                      address={
                        selectedAddress?.value?.description || 
                        selectedAddress?.label || 
                        (isCorporate ? values.address : values.street_address) || 
                        (currentLocation ? "Current Location" : DEFAULT_ZIMBABWE_LOCATION.address) ||
                        DEFAULT_ZIMBABWE_LOCATION.address
                      }
                      onMapClick={async (clickedPosition) => {
                        try {
                          // Reverse geocode the clicked coordinates
                          const geocoder = new window.google.maps.Geocoder();
                          geocoder.geocode(
                            { location: clickedPosition },
                            (results, status) => {
                              if (status === 'OK' && results && results[0]) {
                                const place = {
                                  formatted_address: results[0].formatted_address,
                                  address_components: results[0].address_components,
                                  geometry: {
                                    location: {
                                      lat: () => clickedPosition.lat,
                                      lng: () => clickedPosition.lng,
                                    }
                                  }
                                };

                                // Update selected address with place object
                                const addressData = {
                                  label: results[0].formatted_address,
                                  lat: clickedPosition.lat,
                                  lng: clickedPosition.lng,
                                  value: {
                                    description: results[0].formatted_address,
                                  },
                                  place: place // Store the place object for later use
                                };
                                setSelectedAddress(addressData);
                                setCurrentLocation(null);
                                
                                // Don't populate form fields yet - wait for Select button click
                                // Don't close modal automatically - user will click Select button
                              } else {
                                console.error('Geocoder failed due to: ' + status);
                                toast.error('Could not get address for selected location');
                              }
                            }
                          );
                        } catch (error) {
                          console.error('Error reverse geocoding:', error);
                          toast.error('Error getting address for selected location');
                        }
                      }}
                    />
                  ) : (
                    <div style={{ 
                      height: "400px", 
                      width: "100%", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      backgroundColor: "#f5f5f5",
                      border: "1px dashed #ccc"
                    }}>
                      <p className="text-muted">Map will appear when you search or select an address</p>
                    </div>
                  )}
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
        </FormikForm>
      )}
    </Formik>
  );
};

export default ProviderForm;
