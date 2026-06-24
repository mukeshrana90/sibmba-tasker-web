import React, { useState, useRef, useEffect } from "react";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import uploadSvg from "../Assets/Images/upload.svg";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { timeSchedule } from "../utils/rawjson";
import Layout from "../Components/Layout/Layout";
import { Container, Button } from "react-bootstrap";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useNavigate } from "react-router-dom";
import { useQuery } from "../utils/CommonFunction";
import { serviceImageUrl } from "../utils/landingUtils";

const validationSchema = Yup.object({
    images: Yup.array()
        .max(6, "Maximum 6 images allowed")
        .test(
            "fileSize",
            "File size must be less than 10MB",
            (value) => !value || value.every((file) => file && file.size <= 10 * 1024 * 1024)
        ),
    dayAvailability: Yup.array()
        .of(
            Yup.object({
                day: Yup.array().min(1, "At least one day is required"),
                timeArr: Yup.array().min(1, "At least one time slot is required"),
            })
        )
        .min(1, "At least one availability entry is required"),
    serviceCategoryId: Yup.string().required("Service category is required"),
    serviceSubCategoryName: Yup.string().trim().required("Service Name is required"),
    price: Yup.number()
        .required("Price is required")
        .positive("Price must be positive"),
    desc: Yup.string().trim().required("Description is required"),
});

const AddService = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const getQueryURL = useQuery();
    const searchValFromUrl = getQueryURL.get("service_id");

    const categoryList = useSelector((e) => e.service.category);
    const serviceDetail = useSelector((e) => e.service.serviceDetail);

    const [previews, setPreviews] = useState([]);
    const [existingImages, setExistingImages] = useState([]); // Track existing images
    const serviceImagesInputRefs = useRef([
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
        useRef(null),
    ]);

    useEffect(() => {
        dispatch(ServiceActions.getCategoryList());
    }, [dispatch]);

    useEffect(() => {
        if (searchValFromUrl) {
            dispatch(ServiceActions.getMyServiceDetailById({ id: searchValFromUrl }));
        } else {
            setPreviews([]);
            setExistingImages([]);
        }
    }, [searchValFromUrl, dispatch]);

    useEffect(() => {
        if (searchValFromUrl && serviceDetail?.images?.length > 0) {
            const imagePreviews = serviceDetail.images.map(
                (image) => serviceImageUrl(image)
            );
            setExistingImages(imagePreviews);
            setPreviews(imagePreviews);
        } else {
            setExistingImages([]);
            setPreviews([]);
        }
    }, [searchValFromUrl, serviceDetail]);

    const initialValues = searchValFromUrl && serviceDetail ? {
        images: [], // Only new files go here
        dayAvailability: serviceDetail.availability || [{ day: [], timeArr: [] }],
        serviceCategoryId: serviceDetail.serviceCategoryId?._id || "",
        serviceSubCategoryName: serviceDetail.serviceSubCategoryName || "",
        price: serviceDetail.price || "",
        desc: serviceDetail.desc || "",
    } : {
        images: [],
        dayAvailability: [{ day: [], timeArr: [] }],
        serviceCategoryId: "",
        serviceSubCategoryName: "",
        price: "",
        desc: "",
    };

    const handleFileChange = (event, setFieldValue, values) => {
        const files = event.target.files;
        if (files.length === 0) return;

        const validFiles = Array.from(files).filter((file) => file.size <= 10 * 1024 * 1024);
        if (validFiles.length < files.length) {
            toast.error("Some files exceed the 10 MB limit and were not added.");
        }

        const currentFiles = Array.isArray(values.images) ? [...values.images] : [];
        const totalImages = existingImages.length + currentFiles.length;

        if (totalImages + validFiles.length <= 6) {
            const newFiles = validFiles;
            setFieldValue("images", [...currentFiles, ...newFiles]);

            // Update previews
            const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
            setPreviews([...previews, ...newPreviews]);
        } else {
            toast.error("Maximum 6 images allowed.");
        }
    };

    const handleDeleteImage = (index, setFieldValue, values) => {
        if (index < existingImages.length) {
            // Deleting an existing image
            const updatedExistingImages = existingImages.filter((_, i) => i !== index);
            setExistingImages(updatedExistingImages);
            setPreviews([
                ...updatedExistingImages,
                ...(Array.isArray(values.images) ? values.images.map((file) => URL.createObjectURL(file)) : []),
            ]);
        } else {
            // Deleting a new image
            const newImageIndex = index - existingImages.length;
            const updatedImages = Array.isArray(values.images)
                ? values.images.filter((_, i) => i !== newImageIndex)
                : [];
            setFieldValue("images", updatedImages);
            setPreviews([
                ...existingImages,
                ...updatedImages.map((file) => URL.createObjectURL(file)),
            ]);
        }
    };

    const triggerFileInput = (index) => {
        if (serviceImagesInputRefs.current[index]?.current) {
            serviceImagesInputRefs.current[index].current.value = null;
            serviceImagesInputRefs.current[index].current.click();
        }
    };

    const validate = (values) => {
        const errors = {};
        if (!values.serviceCategoryId) {
            errors.serviceCategoryId = "Service category is required";
        }
        if (!values.serviceSubCategoryName) {
            errors.serviceSubCategoryName = "Service Name is required";
        }
        if (!values.price || values.price <= 0) {
            errors.price = "Price is required and must be positive";
        }
        if (!values.desc) {
            errors.desc = "Description is required";
        }
        if (values.dayAvailability[0].day.length === 0) {
            errors.dayAvailability = { day: "At least one day is required" };
        }
        if (values.dayAvailability[0].timeArr.length === 0) {
            if (!errors.dayAvailability) errors.dayAvailability = {};
            errors.dayAvailability.timeArr = "At least one time slot is required";
        }
        if (values.dayAvailability.length === 0) {
            errors.dayAvailability = "At least one availability entry is required";
        }

        const totalImages = (Array.isArray(values.images) ? values.images.length : 0) + existingImages.length;
        if (totalImages === 0) {
            errors.images = "At least one image is required";
        }
        if (totalImages > 6) {
            errors.images = "Maximum 6 images allowed";
        }
        if (Array.isArray(values.images)) {
            values.images.forEach((file, index) => {
                if (file && file.size > 10 * 1024 * 1024) {
                    if (!errors.images) errors.images = [];
                    errors.images[index] = "File size must be less than 10MB";
                }
            });
        }

        return errors;
    };
    return (
        <Layout>
            <section className="search-results-sec service-details-sec">
                <Container>
                    <Row>
                        <Col lg={12}>
                            <h5 className="mb-4 mt-1">{searchValFromUrl ? "Edit" : "Add"} Service</h5>
                            <Formik
                                initialValues={initialValues}
                                enableReinitialize={true}
                                validate={validate}
                                validateOnChange={true}
                                validateOnBlur={false}
                                onSubmit={async (values, { setSubmitting }) => {
                                    setSubmitting(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append("serviceCategoryId", values.serviceCategoryId);
                                        formData.append("serviceSubCategoryName", values.serviceSubCategoryName);
                                        formData.append("desc", values.desc);
                                        formData.append("price", values.price);
                                        formData.append("dayAvailability", JSON.stringify(values.dayAvailability));
                                        if (searchValFromUrl) {
                                            formData.append("service_id", searchValFromUrl);
                                            // Send deleted images to backend
                                            const originalImages = serviceDetail.images.map(
                                                (img) => serviceImageUrl(img)
                                            );
                                            const deletedImages = originalImages.filter(
                                                (img) => !existingImages.includes(img)
                                            );
                                            formData.append("deletedImages", JSON.stringify(deletedImages));
                                        }
                                        if (Array.isArray(values.images)) {
                                            values.images.forEach((file) => {
                                                if (file) formData.append("images", file);
                                            });
                                        }

                                        const action = searchValFromUrl
                                            ? ServiceActions.updateServices(formData)
                                            : ServiceActions.createServices(formData);

                                        const response = await dispatch(action);

                                        if (response?.payload?.status_code === 200) {
                                            toast.success(response?.payload?.message);
                                            navigate("/allmyservices");
                                        } else {
                                            toast.error(response?.payload?.message || "Failed to create service");
                                        }
                                    } catch (error) {
                                        console.error("Service submission failed:", error);
                                        toast.error("An error occurred during submission.");
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                {({ setFieldValue, values, isSubmitting, setFieldTouched, touched }) => (
                                    <FormikForm className="commn-provider-docu">
                                        <div className="provider-form-field">
                                            <Row>
                                                <Col lg={12}>
                                                    <Form.Label>Images* (Max 6, Min 1)</Form.Label>
                                                </Col>
                                                <Col lg={12}>
                                                    <div
                                                        className="image-scroll-container  edittask-image-scroll"
                                                        style={{
                                                            overflowX: "auto",
                                                            whiteSpace: "nowrap",
                                                            padding: "10px 0",
                                                            border: "1px solid #28a745",
                                                            borderRadius: "5px",
                                                            maxWidth: "100%",
                                                            display: "flex",
                                                            // justifyContent: "center",
                                                        }}
                                                    >
                                                        {previews.map((preview, index) => (
                                                            <div
                                                                key={index}
                                                                className="image-preview-wrapper"
                                                                style={{
                                                                    display: "inline-block",
                                                                    marginRight: "10px",
                                                                    position: "relative",
                                                                    verticalAlign: "top",
                                                                    border: "2px solid #28a745",
                                                                    borderRadius: "5px",
                                                                    overflow: "hidden",
                                                                }}
                                                            >
                                                                <img
                                                                    src={preview}
                                                                    alt={`Service Image ${index + 1} Preview`}
                                                                    style={{
                                                                        width: "200px",
                                                                        height: "180px",
                                                                        objectFit: "cover",
                                                                        borderRadius: "",
                                                                    }}
                                                                />
                                                                {/* <span
                                                                    onClick={() => triggerFileInput(index)}
                                                                    style={{
                                                                        position: "absolute",
                                                                        bottom: "5px",
                                                                        left: "5px",
                                                                        background: "#28a745",
                                                                        borderRadius: "50%",
                                                                        width: "30px",
                                                                        height: "30px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        color: "white",
                                                                        fontSize: "20px",
                                                                        cursor: "pointer",
                                                                    }}
                                                                >
                                                                    ✏️
                                                                </span> */}
                                                                {/* <span
                                                                    onClick={() => handleDeleteImage(index, setFieldValue, values)}
                                                                    style={{
                                                                        position: "absolute",
                                                                        top: "5px",
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
                                                                        cursor: "pointer",
                                                                    }}
                                                                >
                                                                    X
                                                                </span> */}
                                                                <input
                                                                    type="file"
                                                                    id={`upload-service-images-${index}`}
                                                                    ref={serviceImagesInputRefs.current[index]}
                                                                    className="d-none"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        handleFileChange(e, setFieldValue, values);
                                                                        setFieldTouched("images", true);
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                        {previews.length < 6 && (
                                                            <div
                                                                className="upload-placeholder"
                                                                style={{
                                                                    display: "inline-block",
                                                                    width: "180px",
                                                                    height: "180px",
                                                                    border: "1px dashed #28a745",
                                                                    borderRadius: "5px",
                                                                    textAlign: "center",
                                                                    verticalAlign: "top",
                                                                    padding: "10px",
                                                                    cursor: "pointer",
                                                                    paddingTop: "76px",
                                                                }}
                                                                onClick={() => triggerFileInput(previews.length)}
                                                            >
                                                                <img
                                                                    src={uploadSvg}
                                                                    alt="Upload"
                                                                    style={{ width: "24px", height: "24px", marginBottom: "10px" }}
                                                                />
                                                                <span>Upload Image</span>
                                                                <input
                                                                    type="file"
                                                                    id={`upload-service-images-${previews.length}`}
                                                                    ref={serviceImagesInputRefs.current[previews.length]}
                                                                    className="d-none"
                                                                    accept="image/*"
                                                                    onChange={(e) => {
                                                                        handleFileChange(e, setFieldValue, values);
                                                                        setFieldTouched("images", true);
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </Col>
                                                <Col lg={12}>
                                                    {touched.images && (
                                                        <ErrorMessage name="images" component="div" className="text-danger" />
                                                    )}
                                                </Col>
                                                <Col lg={6}>
                                                    <div className="form-set mt-3">
                                                        <Form.Group className="mb-3" controlId="formServiceCategoryId">
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
                                                        <Form.Group className="mb-3" controlId="formServiceSubCategoryName">
                                                            <Form.Label>Service Subcategory Name</Form.Label>
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
                                                    <div className="form-set mt-3">
                                                        <Form.Group className="mb-3" controlId="formAvailability">
                                                            <Form.Label>Availability*</Form.Label>
                                                            <Row>
                                                                <div className="">
                                                                    <Form.Label>Select Day</Form.Label>
                                                                    <Col className="availability-slots">
                                                                        {/* {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map(
                                                                            (day) => (
                                                                                <Button
                                                                                    key={day}
                                                                                    variant={values.dayAvailability[0].day.includes(day) ? "success" : "outline-secondary"}
                                                                                    className="m-1"
                                                                                    onClick={() => {
                                                                                        const updatedDays = values.dayAvailability[0].day.includes(day)
                                                                                            ? values.dayAvailability[0].day.filter((d) => d !== day)
                                                                                            : [...values.dayAvailability[0].day, day];
                                                                                        setFieldValue("dayAvailability[0].day", updatedDays);
                                                                                        setFieldTouched("dayAvailability", true);
                                                                                    }}
                                                                                >
                                                                                    {day}
                                                                                </Button>
                                                                            )
                                                                        )} */}
                                                                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                                                                            (day) => (
                                                                                <Button
                                                                                    key={day}
                                                                                    variant={
                                                                                        values.dayAvailability[0].day.some((d) => d.toLowerCase() === day.toLowerCase())
                                                                                            ? "success"
                                                                                            : "outline-secondary"
                                                                                    }
                                                                                    className="m-1"
                                                                                    onClick={() => {
                                                                                        const updatedDays = values.dayAvailability[0].day.some((d) => d.toLowerCase() === day.toLowerCase())
                                                                                            ? values.dayAvailability[0].day.filter((d) => d.toLowerCase() !== day.toLowerCase())
                                                                                            : [...values.dayAvailability[0].day, day];
                                                                                        setFieldValue("dayAvailability[0].day", updatedDays);
                                                                                        setFieldTouched("dayAvailability", true);
                                                                                    }}
                                                                                >
                                                                                    {day}
                                                                                </Button>
                                                                            )
                                                                        )}
                                                                        {touched.dayAvailability && (
                                                                            <ErrorMessage
                                                                                name="dayAvailability[0].day"
                                                                                component="div"
                                                                                className="text-danger"
                                                                            />
                                                                        )}
                                                                    </Col>
                                                                </div>
                                                                <Col>
                                                                    <Form.Label>Select Time</Form.Label>
                                                                    <div className="availability-slots">
                                                                        {timeSchedule?.map((time) => {
                                                                            const normalizeTime = (t) => t.replace(/\s+/g, "").replace(/[-–—]/g, "-").toLowerCase();
                                                                            const selectedTimes = Array.isArray(values?.dayAvailability?.[0]?.timeArr)
                                                                                ? values.dayAvailability[0].timeArr.map(normalizeTime)
                                                                                : [];

                                                                            const normalizedTime = normalizeTime(time);

                                                                            return (
                                                                                <Button
                                                                                    key={time}
                                                                                    variant={selectedTimes.includes(normalizedTime) ? "success" : "outline-secondary"}
                                                                                    className="m-1"
                                                                                    onClick={() => {
                                                                                        const updatedTimes = selectedTimes.includes(normalizedTime)
                                                                                            ? selectedTimes.filter((t) => t !== normalizedTime)
                                                                                            : [...selectedTimes, normalizedTime];

                                                                                        setFieldValue("dayAvailability[0].timeArr", updatedTimes);
                                                                                        setFieldTouched("dayAvailability", true);
                                                                                    }}
                                                                                >
                                                                                    {time.replace(
                                                                                        /(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)/i,
                                                                                        (match, p1, p2, p3, p4) => `${parseInt(p1)} ${p2.toLowerCase()} - ${parseInt(p3)} ${p4.toLowerCase()}`
                                                                                    )}
                                                                                </Button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {touched?.dayAvailability && (
                                                                        <ErrorMessage
                                                                            name="dayAvailability[0].timeArr"
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
                                        <div className="submit-btnn mb-3 text-center">
                                            <button
                                                type="submit"
                                                className="submit forgot-btn half-width-btn"
                                                disabled={isSubmitting}
                                            >
                                                {searchValFromUrl ? "Update" : "Save"}
                                            </button>
                                        </div>
                                    </FormikForm>
                                )}
                            </Formik>
                        </Col>
                    </Row>
                </Container>
            </section>
        </Layout>
    );
};

export default AddService;