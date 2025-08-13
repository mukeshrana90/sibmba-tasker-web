import React, { useState, useRef, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import uploadSvg from "../Assets/Images/upload.svg";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import AddressAutocomplete from "../CommanComponents/AddressAutocomplete";
import moment from "moment";

const validationSchema = Yup.object({
  need_done: Yup.string().required("Task description is required"),
  details: Yup.string().required("Details are required"),
  when_done: Yup.date().required("Date is required").nullable(),
  budget: Yup.number()
    .typeError("Budget must be a number")
    .required("Budget is required")
    .positive("Budget must be a positive number"),
  // images: Yup.mixed().test("fileCount", "Minimum 1 image required", (value) => {
  //   return value && value.length >= 1;
  // }),
  task_time: Yup.string().required("Please select a time slot"),
  address: Yup.string().required("Street address is required"),
});

export default function EditTask() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  const [selectedTime, setSelectedTime] = useState("");
  const [previews, setPreviews] = useState([]);
  const serviceImagesInputRefs = useRef(
    Array(6)
      .fill()
      .map(() => React.createRef())
  );

  const postTaskDetails = useSelector((state) => state.UserSlice.postTaskDetail);

  useEffect(() => {
    dispatch(CustomerActions.getPostTaskDetail(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (postTaskDetails?.data?.task?.images) {
      const imagePreviews = postTaskDetails.data.task.images.map(
        (image) => `${process.env.REACT_APP_API_URLL}${image}`
      );
      setPreviews(imagePreviews);
    }
    if (postTaskDetails?.data?.task?.task_time) {
      setSelectedTime(postTaskDetails.data.task.task_time);
    }
  }, [postTaskDetails]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [previews]);

  const handleTimeSelect = (time, setFieldValue) => {
    setSelectedTime(time);
    setFieldValue("task_time", time);
  };

  const handleFileChange = (event, setFieldValue, values) => {
    const files = event.target.files;
    if (files.length === 0) return;

    const validFiles = Array.from(files).filter(
      (file) => file.size <= 10 * 1024 * 1024
    ); // 10 MB limit
    if (validFiles.length < files.length) {
      toast.error("Some files exceed the 10 MB limit and were not added.");
    }

    const currentFiles = Array.isArray(values.images) ? [...values.images] : [];
    const totalImages = currentFiles.length;

    if (totalImages + validFiles.length <= 6) {
      const newFiles = validFiles;
      setFieldValue("images", [...currentFiles, ...newFiles]);

      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
    } else {
      toast.error("Maximum 6 images allowed.");
    }
  };

  const triggerFileInput = (index) => {
    const ref = serviceImagesInputRefs.current[index]?.current;
    if (ref) {
      ref.click();
    } else {
      console.error(`Ref at index ${index} is null. Check input rendering.`);
    }
  };

  const handlePlaceSelect = (place, setFieldValue, setFieldTouched) => {
    if (place && place.formatted_address) {
      setFieldValue("address", place.formatted_address);
      setFieldValue("lat", place.geometry.location.lat());
      setFieldValue("long", place.geometry.location.lng());
      setFieldTouched("address", true);
    }
  };

  const categories = useSelector((e) => e.UserSlice.categories);

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      try {
        const [categoryResponse] = await Promise.all([
          dispatch(CustomerActions.getCategories()),
        ]);
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {

      }
    };

    fetchCategoryAndServices();
  }, [dispatch]);

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>Edit Task</h2>
                <p>Home / Task</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="post-task-form">
            <Formik
              enableReinitialize
              initialValues={{
                need_done: postTaskDetails?.data?.task?.need_done || "",
                details: postTaskDetails?.data?.task?.details || "",
                when_done: postTaskDetails?.data?.task?.when_done
                  ? new Date(postTaskDetails.data.task.when_done)
                    .toISOString()
                    .split("T")[0]
                  : "",
                budget: postTaskDetails?.data?.task?.budget || "",
                images: postTaskDetails?.data?.task?.images || [],
                task_time: postTaskDetails?.data?.task?.task_time || "",
                address: postTaskDetails?.data?.task?.address || "",
                lat: postTaskDetails?.data?.task?.lat || "",
                long: postTaskDetails?.data?.task?.long || "",
                category_id: postTaskDetails?.data?.task?.category_id?._id || "",
              }}
              validationSchema={validationSchema}
              onSubmit={async (values, { setSubmitting }) => {
                setSubmitting(true);
                try {
                  const formData = new FormData();
                  formData.append("need_done", values.need_done);
                  formData.append("details", values.details);
                  formData.append("when_done", moment(values.when_done).format("MM-DD-YYYY"));
                  formData.append("budget", values.budget);
                  formData.append("task_time", values.task_time);
                  formData.append("address", values.address);
                  formData.append("lat", values.lat);
                  formData.append("long", values.long);
                  formData.append("task_id", id);
                  formData.append("category_id", values.category_id);

                  if (Array.isArray(values.images)) {
                    values.images.forEach((file) => {
                      if (file instanceof File) {
                        formData.append("images", file);
                      }
                    });
                  }

                  const action = CustomerActions.updatePost(formData);
                  const response = await dispatch(action);

                  if (response?.payload?.status_code === 200) {
                    toast.success(response?.payload?.message);
                    navigate("/my-task");
                  } else {
                    toast.error(
                      response?.payload?.message || "Failed to update task"
                    );
                  }
                } catch (error) {
                  console.error("Task submission failed:", error);
                  toast.error("An error occurred during submission.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {({
                handleSubmit,
                setFieldValue,
                values,
                errors,
                touched,
                setFieldTouched,
              }) => (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col lg={6}>
                      <div>
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>Select Service Category</Form.Label>
                          <Field
                            name="category_id"
                            as={Form.Select}
                          >
                            <option value="">Select a service</option>
                            {categories?.allCat?.map((ele, index) => (
                              <option value={ele?._id}>{ele?.service_category_name}</option>
                            ))}


                          </Field>
                          <ErrorMessage
                            name="category_id"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>What do you need done?</Form.Label>
                          <Field
                            name="need_done"
                            as={Form.Control}
                            type="text"
                            placeholder="eg: Sofa cleaning"
                          />
                          <ErrorMessage
                            name="need_done"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicPassword">
                          <Form.Label>What are the details?</Form.Label>
                          <Field
                            name="details"
                            as={Form.Control}
                            // as="textarea"
                            rows={3}
                            placeholder="Type here..."
                          />
                          <ErrorMessage
                            name="details"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicAddress">
                          <Form.Label>Address</Form.Label>
                          <AddressAutocomplete
                            apiKey={"AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww"}
                            onPlaceSelected={(place) =>
                              handlePlaceSelect(place, setFieldValue, setFieldTouched)
                            }
                            defaultValue={values.address}
                            options={{
                              types: ["address"],
                            }}
                            onChange={(e) => {
                              setFieldValue("address", e.target.value);
                              setFieldTouched("address", true);
                            }}
                          />
                          <ErrorMessage
                            name="address"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicImages">
                          <Form.Label>Images (Max 6, Min 1)</Form.Label>
                          <div
                            className="image-scroll-container"
                            style={{
                              overflowX: "auto",
                              whiteSpace: "nowrap",
                              padding: "10px 0",
                              border: "1px solid #28a745",
                              borderRadius: "5px",
                              maxWidth: "100%",
                              display: "flex",
                              justifyContent: "center",
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
                                onClick={() => triggerFileInput(index)}
                              >
                                <img
                                  src={preview}
                                  alt={`Service Image ${index + 1} Preview`}
                                  style={{
                                    width: "150px",
                                    height: "150px",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                    cursor: "pointer",
                                  }}
                                />
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
                                  width: "150px",
                                  height: "150px",
                                  border: "1px dashed #28a745",
                                  borderRadius: "5px",
                                  textAlign: "center",
                                  verticalAlign: "top",
                                  padding: "10px",
                                  cursor: "pointer",
                                }}
                                onClick={() => triggerFileInput(previews.length)}
                              >
                                <img
                                  src={uploadSvg}
                                  alt="Upload"
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    marginBottom: "10px",
                                  }}
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
                          {/* <ErrorMessage
                            name="images"
                            component="div"
                            className="text-danger"
                          /> */}
                        </Form.Group>
                      </div>
                    </Col>

                    <Col lg={6}>
                      <div>
                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>When do you need this done?</Form.Label>
                          <Field
                            name="when_done"
                            as={Form.Control}
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <ErrorMessage
                            name="when_done"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>What is your budget?</Form.Label>
                          <Field
                            name="budget"
                            as={Form.Control}
                            type="number"
                            placeholder="$ Enter here..."
                          />
                          <ErrorMessage
                            name="budget"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formBasicEmail">
                          <Form.Label>Certain time in day</Form.Label>
                          <div className="certain-time-boxs">
                            <div
                              className={
                                selectedTime === "Before 10 AM" ? "active" : ""
                              }
                              onClick={() =>
                                handleTimeSelect("Before 10 AM", setFieldValue)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="91"
                                height="56"
                                viewBox="0 0 91 56"
                                fill="none"
                              >
                                <path
                                  d="M46.3469 0C47.8654 0.558838 48.3445 1.52357 48.3077 2.82948C48.2266 5.77662 48.293 8.72375 48.2782 11.6709C48.2708 12.8003 47.2757 13.6768 45.9489 13.7827C44.5778 13.8945 43.3837 13.2297 43.0741 12.1591C43.0004 11.9121 43.0077 11.6474 43.0077 11.3944C43.0004 8.54139 43.0594 5.68839 42.9783 2.83537C42.9414 1.52946 43.4205 0.5706 44.939 0.00587927C45.4034 -3.23122e-06 45.8752 0 46.3469 0Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                                <path
                                  d="M0.556824 35.4003C1.25709 34.1885 2.45861 33.8061 4.10241 33.8355C7.79542 33.9002 11.4884 33.8473 15.1815 33.8591C16.6041 33.865 17.695 34.6591 17.8277 35.7121C17.9678 36.8121 17.1348 37.7592 15.7932 38.0062C15.4542 38.0709 15.093 38.0651 14.7465 38.0651C11.2009 38.0709 7.65537 38.0239 4.10978 38.0886C2.47336 38.118 1.27184 37.7356 0.564202 36.5238C0.556831 36.1474 0.556824 35.7709 0.556824 35.4003Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                                <path
                                  d="M80.8058 45.1014C80.8058 46.319 79.6485 47.2014 77.9973 47.2014H13.1596C11.5232 47.2014 10.3732 46.3014 10.3806 45.0778C10.388 43.8719 11.56 42.9954 13.2038 42.9895C16.6314 42.9836 20.0665 42.9895 23.4941 42.9895H24.4008C20.8626 34.0481 23.1992 26.5362 32.8114 20.9537C40.05 16.7536 50.2297 16.5771 57.66 20.589C67.8544 26.0891 70.3975 33.754 66.793 42.9895H67.7218C71.1494 42.9895 74.5844 42.9836 78.0121 42.9895C79.6485 42.9954 80.8132 43.8896 80.8058 45.1014Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                                <path
                                  d="M45.684 51.2245C50.9324 51.2245 56.1807 51.2245 61.4291 51.2245C61.7829 51.2245 62.1367 51.2186 62.4831 51.248C63.7363 51.3539 64.7019 52.1598 64.7904 53.1481C64.8788 54.1893 64.0754 55.1128 62.8149 55.3422C62.3947 55.4187 61.945 55.4305 61.5101 55.4305C50.8955 55.4364 40.2809 55.4364 29.6662 55.4305C29.3124 55.4305 28.9586 55.4305 28.6121 55.3834C27.2337 55.2011 26.327 54.3069 26.386 53.2069C26.445 52.1363 27.4843 51.2833 28.8775 51.2363C29.9906 51.1951 31.1036 51.2186 32.2167 51.2186C36.7058 51.2245 41.1949 51.2245 45.684 51.2245Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                                <path
                                  d="M82.0472 33.8522C83.9195 33.8522 85.7992 33.8522 87.6715 33.8522C89.4627 33.8522 90.6569 34.6875 90.6716 35.9405C90.6864 37.1935 89.4848 38.0641 87.7157 38.0641C83.9121 38.07 80.1012 38.07 76.2976 38.0641C74.5727 38.0641 73.4081 37.217 73.4007 35.9758C73.386 34.7052 74.558 33.8581 76.3418 33.8522C78.2436 33.8463 80.1454 33.8522 82.0472 33.8522Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                                <path
                                  d="M14.624 9.00488C15.2285 9.26371 15.9361 9.43431 16.4079vellous 9.79902C18.5824 11.4697 20.7127 13.1815 22.8209 14.8992C23.9192 15.7933 23.9045 17.0933 22.8504 17.9169C21.8184 18.7287 20.2336 18.7522 19.1353 17.8933C16.9534 16.1933 14.8083 14.4697 12.6706 12.7344C11.8598 12.0755 11.6534 11.2755 12.1031 10.4049C12.5085 9.6402 13.4889 9.1343 14.624 9.00488Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                                <path
                                  d="M70.5197 18.5586C69.156 18.4586 68.323 18.0821 67.8734 17.2821C67.4311 16.4821 67.5343 15.6762 68.2936 15.0585C70.5197 13.2291 72.7679 11.4173 75.0751 9.65251C76.0924 8.87014 77.6846 8.99367 78.6502 9.78781C79.5937 10.5584 79.719 11.7937 78.7608 12.5879C76.5273 14.4409 74.2348 16.2527 71.9203 18.041C71.5075 18.3468 70.8367 18.441 70.5197 18.5586Z"
                                  fill="rgba(225, 225, 225, 1)"
                                />
                              </svg>
                              <p>Before 10 AM</p>
                            </div>
                            <div
                              className={
                                selectedTime === "10 AM - 2 PM" ? "active" : ""
                              }
                              onClick={() =>
                                handleTimeSelect("10 AM - 2 PM", setFieldValue)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="70"
                                height="56"
                                viewBox="0 0 70 56"
                                fill="none"
                              >
                                <path
                                  d="M35.5519 0C36.9757 0.462887 37.4677 1.32849 37.4156 2.52273C37.352 4.08729 37.4272 5.66111 37.3809 7.22567C37.3693 7.66078 37.2478 8.1283 37.0047 8.51712C36.559 9.22997 35.5055 9.56788 34.5331 9.41512C33.607 9.267 32.8372 8.6421 32.6809 7.87371C32.6288 7.62838 32.6173 7.37379 32.6173 7.1192C32.6115 5.58705 32.6636 4.05489 32.5999 2.52273C32.5478 1.32849 33.0398 0.462887 34.4637 0C34.8283 0 35.1872 0 35.5519 0Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M0.341675 27.2874C0.920654 26.1487 2.00335 25.7552 3.49712 25.7969C5.45406 25.8478 7.42258 25.7876 9.37952 25.8247C9.92376 25.8339 10.5085 25.9311 10.9949 26.1256C11.8865 26.482 12.3092 27.3244 12.1181 28.1021C11.9328 28.8427 11.1512 29.4583 10.1901 29.5833C9.88325 29.625 9.56481 29.6342 9.24637 29.6342C7.32995 29.6389 5.41354 29.5972 3.49712 29.6481C2.00335 29.6898 0.920654 29.2963 0.341675 28.1576C0.341675 27.8614 0.341675 27.5744 0.341675 27.2874Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M35.0401 13.7793C44.5643 13.8025 52.4442 20.0931 52.4673 27.703C52.4905 35.299 44.4427 41.7285 35.0053 41.6544C25.4406 41.5803 17.5375 35.2434 17.6012 27.6984C17.6649 20.0607 25.5622 13.7608 35.0401 13.7793Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M63.7943 25.8098C64.9465 25.8098 66.0929 25.782 67.2392 25.8191C68.4956 25.8561 69.4162 26.5041 69.6246 27.416C69.8041 28.1983 69.2541 29.0685 68.2872 29.4157C67.9282 29.5453 67.5056 29.6147 67.1119 29.6194C64.8596 29.6379 62.6016 29.6425 60.3494 29.624C59.0351 29.6101 58.0566 28.9574 57.8714 28.0502C57.6861 27.1568 58.2825 26.2912 59.3478 25.9718C59.7183 25.8607 60.1352 25.8237 60.5347 25.8144C61.6289 25.7913 62.7116 25.8052 63.7943 25.8098Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M37.3854 50.743C37.3854 51.678 37.426 52.6177 37.3739 53.5527C37.3218 54.5248 36.5057 55.2469 35.3828 55.4089C34.4046 55.5524 33.3164 55.1127 32.8823 54.3443C32.7202 54.0573 32.6276 53.7194 32.6276 53.4046C32.6044 51.604 32.5986 49.7987 32.6218 47.9981C32.6392 46.9473 33.4495 46.1651 34.5898 46.0123C35.7011 45.8642 36.7951 46.3363 37.1887 47.1927C37.3334 47.5028 37.3739 47.8592 37.3854 48.1971C37.4144 49.0442 37.397 49.8913 37.397 50.7384C37.3912 50.743 37.3854 50.743 37.3854 50.743Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M57.5335 47.8725C57.2151 47.7336 56.5898 47.5716 56.1614 47.2429C54.4823 45.9654 52.8496 44.6415 51.2285 43.3177C50.2153 42.4891 50.2152 41.3689 51.1764 40.619C52.1143 39.883 53.4981 39.883 54.5055 40.6699C56.1787 41.9799 57.8346 43.3084 59.4731 44.6461C60.1968 45.2386 60.4111 45.9515 59.971 46.7291C59.5658 47.4605 58.8189 47.803 57.5335 47.8725Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M19.4707 13.49C19.4475 14.2399 19.0249 14.8046 18.1912 15.1472C17.3516 15.4943 16.5237 15.4295 15.771 14.9852C15.4121 14.7722 15.1052 14.5038 14.781 14.2492C13.3914 13.1429 11.9961 12.0366 10.6181 10.9164C9.52964 10.0369 9.48332 8.8982 10.4734 8.12981C11.4576 7.36142 12.8182 7.41234 13.9067 8.26868C15.4931 9.52773 17.0679 10.796 18.6486 12.0551C19.1465 12.4578 19.4823 12.9068 19.4707 13.49Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M50.5377 13.2448C50.6709 13.0319 50.833 12.5505 51.2093 12.2357C52.8768 10.8378 54.5906 9.47691 56.3217 8.13453C57.2712 7.39391 58.6376 7.42168 59.5524 8.1299C60.4498 8.82886 60.5425 9.9583 59.6335 10.7128C57.966 12.1061 56.2522 13.4716 54.5153 14.8094C53.7858 15.3741 52.8594 15.5592 51.8925 15.1843C51.0298 14.851 50.5898 14.2678 50.5377 13.2448Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M19.4989 42.1969C19.3368 42.433 19.1457 42.9375 18.7404 43.2801C17.1251 44.6409 15.4518 45.9555 13.7728 47.2701C12.7885 48.0385 11.4279 48.0432 10.49 47.3211C9.54625 46.599 9.50572 45.4556 10.4726 44.6548C12.1053 43.3078 13.767 41.984 15.4518 40.674C16.1813 40.1046 17.0903 39.8825 18.0688 40.225C18.9604 40.5398 19.4236 41.1415 19.4989 42.1969Z"
                                  fill="#E1E1E1"
                                />
                              </svg>
                              <p>10 AM - 2 PM</p>
                            </div>
                            <div
                              className={
                                selectedTime === "2 PM - 6 PM" ? "active" : ""
                              }
                              onClick={() =>
                                handleTimeSelect("2 PM - 6 PM", setFieldValue)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="83"
                                height="56"
                                viewBox="0 0 83 56"
                                fill="none"
                              >
                                <path
                                  d="M82.0226 34.654C82.0047 35.9652 80.7024 36.945 78.9184 36.945H3.33159C1.5387 36.945 0.236395 35.9581 0.227475 34.654C0.209635 33.3076 1.52087 32.3348 3.3762 32.3278C6.89954 32.3207 10.4318 32.3278 13.9641 32.3278H14.9452C16.4705 21.8386 27.9147 13.9436 41.125 13.9365C54.5672 13.9365 65.8687 22.0431 67.3048 32.3278H68.286C71.8182 32.3278 75.3505 32.3207 78.8739 32.3278C80.7203 32.3348 82.0404 33.3217 82.0226 34.654Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M49.9033 41.5637C55.6833 41.5637 61.4634 41.5566 67.2435 41.5637C69.5091 41.5707 70.9809 43.2061 70.1157 44.764C69.5716 45.7438 68.5547 46.1879 67.1989 46.1879C62.1146 46.1809 57.0392 46.1879 51.9548 46.1879C45.5058 46.1879 39.0567 46.195 32.5987 46.1879C30.3153 46.1879 28.8524 44.5948 29.6552 43.0158C30.1279 42.0853 31.1805 41.5707 32.6433 41.5707C38.4056 41.5637 44.1589 41.5637 49.9033 41.5637Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M33.8834 50.8049C37.1391 50.8049 40.3948 50.8049 43.6506 50.8049C45.6576 50.8049 46.9955 51.7424 46.9866 53.1311C46.9777 54.4916 45.6486 55.4221 43.7041 55.4221C37.1302 55.4221 30.5563 55.4221 23.9912 55.4221C22.0467 55.4221 20.7176 54.4916 20.7087 53.1311C20.6998 51.7354 22.0289 50.8049 24.0358 50.8049C27.3094 50.7978 30.5919 50.8049 33.8834 50.8049Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M38.2194 5.77341C38.2194 4.64555 38.2016 3.51063 38.2194 2.38276C38.2373 1.02227 39.4771 0.0142414 41.1095 0.000143098C42.7685 -0.0139552 44.0441 1.01522 44.053 2.41096C44.0708 4.64555 44.0708 6.88013 44.053 9.12177C44.0441 10.5246 42.7775 11.5537 41.1184 11.5467C39.4593 11.5396 38.2283 10.5105 38.2194 9.09357C38.2105 7.98685 38.2194 6.88013 38.2194 5.77341Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M19.257 46.1803C17.8299 46.1803 16.3938 46.1944 14.9666 46.1803C13.2094 46.1662 11.9071 45.1511 11.9249 43.84C11.9428 42.55 13.2272 41.5772 14.9488 41.5701C17.812 41.556 20.6664 41.556 23.5296 41.5701C25.2333 41.5772 26.5267 42.5852 26.5267 43.8682C26.5267 45.1511 25.2512 46.1591 23.5475 46.1803C22.1114 46.1944 20.6842 46.1803 19.257 46.1803Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M63.9547 19.0466C62.688 18.9268 61.7871 18.5109 61.2609 17.6509C60.7257 16.7698 60.806 15.8675 61.6623 15.1696C63.8119 13.4073 66.0062 11.6732 68.2362 9.97436C69.2977 9.17075 71.0727 9.26944 72.1252 10.0942C73.1867 10.9189 73.383 12.3147 72.3661 13.1676C70.1896 14.9793 67.9418 16.7345 65.6584 18.4545C65.2302 18.7717 64.5255 18.8563 63.9547 19.0466Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M21.3553 16.426C21.275 17.5961 20.7666 18.3363 19.6784 18.7381C18.5723 19.1469 17.4217 19.1047 16.5297 18.4279C14.2908 16.7291 12.0965 15.002 9.95574 13.2327C8.92995 12.3868 9.07267 10.9911 10.1074 10.1593C11.1421 9.32041 12.9171 9.16533 13.9875 9.96893C16.2799 11.6889 18.501 13.4724 20.6863 15.2699C21.0966 15.6083 21.2126 16.1651 21.3553 16.426Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M55.8082 50.8025C56.7537 50.8025 57.6903 50.7884 58.6358 50.8025C60.286 50.8378 61.5437 51.8388 61.5526 53.0935C61.5615 54.3483 60.3127 55.3915 58.6804 55.4127C56.7002 55.4409 54.7289 55.4409 52.7487 55.4127C51.1164 55.3915 49.8676 54.3483 49.8765 53.0935C49.8854 51.8317 51.1431 50.8448 52.7933 50.8096C53.8013 50.7814 54.8003 50.8025 55.8082 50.8025Z"
                                  fill="#E1E1E1"
                                />
                              </svg>
                              <p>2 PM - 6 PM</p>
                            </div>
                            <div
                              className={
                                selectedTime === "After 6 PM" ? "active" : ""
                              }
                              onClick={() =>
                                handleTimeSelect("After 6 PM", setFieldValue)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="70"
                                height="56"
                                viewBox="0 0 70 56"
                                fill="none"
                              >
                                <path
                                  d="M35.3413 0C35.389 0.0317051 35.4366 0.0824331 35.4921 0.0951152C36.3652 0.355097 36.8652 0.849695 36.9207 1.58525C36.9763 2.31447 36.4921 2.79004 35.7461 3.17051C32.8255 4.67332 30.4048 6.59465 28.5159 8.9218C19.627 19.8727 26.2461 33.9498 41.1112 37.9573C49.3731 40.183 57.0636 39.0796 64.0398 34.8819C65.0239 34.2922 65.9605 34.2224 66.77 34.7043C67.5636 35.1799 67.7779 35.8965 67.3493 36.7969C62.7938 46.3972 54.3176 52.5226 41.7699 54.7673C32.9128 56.3526 24.4842 55.0844 16.7619 51.2798C8.31748 47.1137 2.94445 41.1215 0.769843 33.3601C0.452382 32.2377 0.341271 31.0836 0.126984 29.9423C0.0952383 29.7647 0.0476191 29.5935 0 29.4159C0 28.2619 0 27.1078 0 25.9538C0.0396826 25.7762 0.0873018 25.605 0.119048 25.4275C0.325398 24.2924 0.452382 23.1383 0.75397 22.016C2.46826 15.7257 6.49208 10.5324 12.6588 6.4171C17.3889 3.26562 22.8096 1.24918 28.8969 0.418507C30.135 0.247299 31.389 0.139502 32.6271 0C33.5318 0 34.4366 0 35.3413 0Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M57.127 11.4774C57.1191 12.4032 56.246 13.0436 54.9524 13.088C52.373 13.1705 50.1825 14.4323 49.373 16.3537C49.1667 16.8419 49.0714 17.3682 49.0238 17.8818C48.9286 18.8647 48.1349 19.5622 47 19.5685C45.8413 19.5812 45 18.8774 44.9444 17.8565C44.8016 15.1742 42.3254 13.1895 38.9762 13.0817C37.6984 13.0373 36.8174 12.3778 36.8254 11.452C36.8333 10.5453 37.6984 9.87948 38.9286 9.83509C42.2936 9.71461 44.8095 7.67281 44.9444 4.95885C44.9762 4.26768 45.3095 3.73504 46.0873 3.42433C47.4524 2.87266 48.9365 3.63992 49.0159 4.92715C49.1349 6.95627 50.3095 8.47812 52.5952 9.35952C53.3572 9.6512 54.2698 9.74632 55.1349 9.82875C56.2857 9.94289 57.1429 10.596 57.127 11.4774Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M63.2005 6.48551C62.1053 6.47282 61.1926 5.73727 61.2005 4.85587C61.2005 3.96178 62.1688 3.21354 63.2878 3.23891C64.383 3.26427 65.2799 4.01885 65.2561 4.89391C65.2322 5.77531 64.2957 6.49819 63.2005 6.48551Z"
                                  fill="#E1E1E1"
                                />
                                <path
                                  d="M69.318 17.952C69.318 18.827 68.4053 19.5689 67.31 19.5753C66.191 19.5816 65.2465 18.827 65.2624 17.9329C65.2783 17.0579 66.2069 16.3287 67.3021 16.335C68.3973 16.3413 69.31 17.0769 69.318 17.952Z"
                                  fill="#E1E1E1"
                                />
                              </svg>
                              <p>After 6 PM</p>
                            </div>
                          </div>
                          <ErrorMessage
                            name="task_time"
                            component="div"
                            className="text-danger"
                          />
                        </Form.Group>
                      </div>
                    </Col>

                    <Col lg={12}>
                      <div className="post-task-post">
                        <button type="submit">Update Task</button>
                      </div>
                    </Col>
                  </Row>
                </Form>
              )}
            </Formik>
          </div>
        </Container>
      </section>
    </Layout>
  );
}
