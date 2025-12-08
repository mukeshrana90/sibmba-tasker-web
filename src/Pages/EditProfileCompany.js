import React, { useEffect, useRef, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { useFormik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import AddressAutocomplete from "../CommanComponents/AddressAutocomplete";
import defaultSilhouette from "../Assets/Images/silhotte.svg";
import ButtonLoader from "../CommanComponents/ButtonLoader";
import Layout from "../Components/Layout/Layout";
import { ImagePathCustomer } from "../utils/ImagePath";
import { setCustomer } from "../Redux/Reducers/LoginSlice";
import PhoneNumberInput from "../CommanComponents/PhoneNumberInput";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useNavigate } from "react-router-dom";
import { Roles } from "../utils/Roles";

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
  const [role, setRole] = useState("");
  const corporateCategory = useSelector((e) => e.service.corporateCategory);

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
    company_name: customerDetails?.company_name || "",
    phone_number: phoneData.phone,
    country_code: phoneData.countryCode,
    email: customerDetails?.email || "",
    house_number: customerDetails?.house_number || "",
    address: customerDetails?.address || customerDetails?.street_address || "",
    suburbs: customerDetails?.suburbs || "",
    country: customerDetails?.country || "",
    post_code: customerDetails?.post_code || "",
    landMark: customerDetails?.landMark || "",
    profile_image: null,
    // Social Media initial values
    facebook_link: customerDetails?.facebook_link || "",
    instagram_link: customerDetails?.instagram_link || "",
    website_link: customerDetails?.website_link || "",
    // Reference initial values
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
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!values?.profile_image && !customerDetails?.profile_image) {
        return toast.warn("Please add profile image");
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
        toast.success("Profile Updated Successfully.");
        // getProfileApiCall();
        navigate("/requests");
      } else {
        toast.error(apiRes?.payload?.message);
      }
      setIsLoading(false);
    },
  });

  const handlePlaceSelect = (place, setFieldValue, setFieldTouched) => {
    const addressComponents = place.address_components;
    let streetNumber = "";
    let route = "";
    let suburb = "";
    let country = "";
    let postalCode = "";

    addressComponents.forEach((component) => {
      const types = component.types;
      if (types.includes("street_number")) streetNumber = component.long_name;
      if (types.includes("route")) route = component.long_name;
      if (types.includes("locality") || types.includes("sublocality"))
        suburb = component.long_name;
      if (types.includes("country")) country = component.long_name;
      if (types.includes("postal_code")) postalCode = component.long_name;
    });

    setFieldValue("address", route || "");
    if (!formik.values.house_number || !formik.values.house_number.trim()) {
      setFieldValue("house_number", streetNumber || "");
    }
    setFieldValue("suburbs", suburb || "");
    setFieldValue("country", country || "");
    setFieldValue("post_code", postalCode || "");
    setFieldTouched("address", true);
    if (streetNumber) {
      setFieldTouched("house_number", true);
    }
  };

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

  const getProfileApiCall = async () => {
    let apiRes = await dispatch(CustomerActions.getProfile());
    if (apiRes?.payload?.success) {
      dispatch(setCustomer(apiRes?.payload?.data));
    }
  };

  useEffect(() => {
    if (token) getProfileApiCall();
  }, [token]);

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
    const apiRes = await dispatch(
      ServiceActions.updateReference(referenceData)
    );
    setShowReferenceModal(false);
  };

  useEffect(() => {
    dispatch(ServiceActions.getIdentificationList());
    dispatch(ServiceActions.getCorporateCategoryList());
    setRole(customerDetails?.role);
  }, [role, dispatch]);

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

                  <Form onSubmit={formik.handleSubmit}>
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
                    {role !== Roles.CORPORATE && (
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
                            >
                              <option value="">Select</option>
                              {identificationLists?.data?.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </Form.Control>
                          </Form.Group>
                        </Col>

                        <Col lg={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Company Name*</Form.Label>
                            <Form.Control
                              type="text"
                              name="company_name"
                              value={formik.values.company_name && formik.values.company_name !== 'undefined' ? formik.values.company_name : '-'}
                              onChange={formik.handleChange}
                              placeholder="Enter Company Name"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    {role === Roles.CORPORATE && (
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
                            >
                              <option value="">Select</option>
                              {corporateCategory?.data?.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {item.name}
                                </option>
                              ))}
                            </Form.Control>
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
                            value={formik.values.country_code && formik.values.phone_number 
                              ? `${formik.values.country_code} ${formik.values.phone_number}` 
                              : formik.values.phone_number || ""}
                            onPhoneChange={(phone, countryCode) => {
                              formik.setFieldValue("phone_number", phone);
                              formik.setFieldValue("country_code", countryCode);
                              formik.setFieldTouched("phone_number", true);
                            }}
                          />
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
                            placeholder="Enter House Number"
                          />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Street Address*</Form.Label>
                          <AddressAutocomplete
                            apiKey={"AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww"}
                            onPlaceSelected={(place) =>
                              handlePlaceSelect(
                                place,
                                formik.setFieldValue,
                                formik.setFieldTouched
                              )
                            }
                            options={{
                              types: ["address"],
                            }}
                            defaultValue={formik.values.address}
                            onChange={(e) => {
                              formik.setFieldValue("address", e.target.value);
                            }}
                          />
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
                            placeholder="Enter Suburbs"
                          />
                        </Form.Group>
                      </Col>
                      <Col lg={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Country*</Form.Label>
                          <Form.Control
                            type="text"
                            name="country"
                            value={formik.values.country}
                            onChange={formik.handleChange}
                            placeholder="Enter Country"
                          />
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
                            placeholder="Enter Post Code or PO Box"
                          />
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

                    <Row className="mb-3">
                      <Col lg={role === Roles.CORPORATE? '12' : '6'}>
                        <Button
                          variant="outline-success"
                          className="w-100"
                          onClick={() => setShowSocialMediaModal(true)}
                        >
                          Social Media Links
                        </Button>
                      </Col>
                         {role !== Roles.CORPORATE &&  role === Roles.SERVICE_PROVIDER &&                     <Col lg={6}>
                        <Button
                          variant="outline-success"
                          className="w-100"
                          onClick={() => setShowReferenceModal(true)}
                        >
                          Reference Details
                        </Button>
                      </Col>
                        }
                    </Row>
                    <div className="submit-btn">
                      <button
                        type="submit"
                        className="btn btn-success w-50"
                        disabled={isLoader}
                      >
                        {isLoader ? <ButtonLoader /> : "Save"}
                      </button>
                    </div>
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
                          <Button
                            variant="success"
                            type="submit"
                            className="w-50"
                          >
                            Save
                          </Button>
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
                          <Button
                            variant="success"
                            type="submit"
                            className="w-50"
                          >
                            Save
                          </Button>
                        </div>
                      </Form>
                    </Modal.Body>
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
