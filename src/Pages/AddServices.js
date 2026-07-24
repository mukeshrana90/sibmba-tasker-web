import { useEffect, useRef, useState } from "react";
import { Formik, Form as FormikForm, Field, ErrorMessage } from "formik";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { timeSchedule } from "../utils/rawjson";
import { useQuery } from "../utils/CommonFunction";
import { serviceImageUrl } from "../utils/landingUtils";
import { normalizeMongoId } from "../utils/normalizeMongoId";
import {
  getCachedProviderHasService,
  markProviderHasService,
} from "../utils/providerServiceGate";

function FieldError({ name }) {
  return <ErrorMessage name={name} component="div" className="field-error" />;
}

const SERVICE_IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i;

function isServiceImageFile(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime === "application/pdf" || mime.includes("pdf")) return false;
  return SERVICE_IMAGE_EXT.test(String(file.name || ""));
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V5M12 5l-4 4M12 5l4 4" />
      <path d="M4 18h16" />
    </svg>
  );
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AddService() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const getQueryURL = useQuery();
  const searchValFromUrl = normalizeMongoId(getQueryURL.get("service_id"));

  const categoryList = useSelector((e) => e.service.category);
  const serviceDetail = useSelector((e) => e.service.serviceDetail);

  const [previews, setPreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const fileInputRef = useRef(null);

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
      const imagePreviews = serviceDetail.images.map((image) =>
        serviceImageUrl(image)
      );
      setExistingImages(imagePreviews);
      setPreviews(imagePreviews);
    } else if (!searchValFromUrl) {
      setExistingImages([]);
      setPreviews([]);
    }
  }, [searchValFromUrl, serviceDetail]);

  const initialValues =
    searchValFromUrl && serviceDetail
      ? {
          images: [],
          dayAvailability: serviceDetail.availability || [{ day: [], timeArr: [] }],
          serviceCategoryId:
            normalizeMongoId(
              serviceDetail.serviceCategoryId?._id ??
                serviceDetail.serviceCategoryId
            ) || "",
          serviceSubCategoryName: serviceDetail.serviceSubCategoryName || "",
          price: serviceDetail.price || "",
          desc: serviceDetail.desc || "",
        }
      : {
          images: [],
          dayAvailability: [{ day: [], timeArr: [] }],
          serviceCategoryId: "",
          serviceSubCategoryName: "",
          price: "",
          desc: "",
        };

  const handleFileChange = (event, setFieldValue, values) => {
    const files = event.target.files;
    if (!files?.length) return;

    const selected = Array.from(files);
    const imageFiles = selected.filter(isServiceImageFile);
    if (imageFiles.length < selected.length) {
      toast.error("Only image files are allowed for service images.");
    }
    if (imageFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const validFiles = imageFiles.filter(
      (file) => file.size <= 10 * 1024 * 1024
    );
    if (validFiles.length < imageFiles.length) {
      toast.error("Some files exceed the 10 MB limit and were not added.");
    }

    const currentFiles = Array.isArray(values.images) ? [...values.images] : [];
    const totalImages = existingImages.length + currentFiles.length;

    if (totalImages + validFiles.length <= 6) {
      setFieldValue("images", [...currentFiles, ...validFiles]);
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setPreviews([...previews, ...newPreviews]);
    } else {
      toast.error("Maximum 6 images allowed.");
    }

    event.target.value = "";
  };

  const handleDeleteImage = (index, setFieldValue, values) => {
    if (index < existingImages.length) {
      const updatedExisting = existingImages.filter((_, i) => i !== index);
      setExistingImages(updatedExisting);
      setPreviews([
        ...updatedExisting,
        ...(Array.isArray(values.images)
          ? values.images.map((file) => URL.createObjectURL(file))
          : []),
      ]);
      return;
    }

    const newImageIndex = index - existingImages.length;
    const updatedImages = Array.isArray(values.images)
      ? values.images.filter((_, i) => i !== newImageIndex)
      : [];
    setFieldValue("images", updatedImages);
    setPreviews([
      ...existingImages,
      ...updatedImages.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const validate = (values) => {
    const errors = {};
    if (!values.serviceCategoryId) {
      errors.serviceCategoryId = "Service category is required";
    }
    if (!values.serviceSubCategoryName) {
      errors.serviceSubCategoryName = "Service name is required";
    }
    if (!values.price || values.price <= 0) {
      errors.price = "Price is required and must be positive";
    }
    if (!values.desc) {
      errors.desc = "Description is required";
    }
    if (!values.dayAvailability?.[0]?.day?.length) {
      errors.dayAvailability = { day: "At least one day is required" };
    }
    if (!values.dayAvailability?.[0]?.timeArr?.length) {
      if (!errors.dayAvailability) errors.dayAvailability = {};
      errors.dayAvailability.timeArr = "At least one time slot is required";
    }

    const totalImages =
      (Array.isArray(values.images) ? values.images.length : 0) +
      existingImages.length;
    if (totalImages === 0) {
      errors.images = "At least one image is required";
    }
    if (totalImages > 6) {
      errors.images = "Maximum 6 images allowed";
    }

    return errors;
  };

  const pageTitle = searchValFromUrl ? "Edit Service" : "Add Service";

  return (
    <CorporatePageShell
      title={pageTitle}
      crumbLabel="Services"
      pageClass="p-corporate-portal p-sp-services p-sp-add-service"
    >
      <Formik
        initialValues={initialValues}
        enableReinitialize
        validate={validate}
        validateOnChange
        validateOnBlur={false}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          try {
            const formData = new FormData();
            formData.append("serviceCategoryId", values.serviceCategoryId);
            formData.append(
              "serviceSubCategoryName",
              values.serviceSubCategoryName
            );
            formData.append("desc", values.desc);
            formData.append("price", values.price);
            formData.append(
              "dayAvailability",
              JSON.stringify(values.dayAvailability)
            );

            if (searchValFromUrl) {
              formData.append("service_id", searchValFromUrl);
              const originalImages = (serviceDetail?.images || []).map((img) =>
                serviceImageUrl(img)
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
              if (!searchValFromUrl) {
                markProviderHasService(true);
              }
              toast.success(response?.payload?.message);
              navigate("/allmyservices");
            } else {
              toast.error(
                response?.payload?.message || "Failed to create service"
              );
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
          <FormikForm className="form-card sp-add-form" noValidate>
            <div className="field">
              <label>
                Images <span className="req">*</span>
                <span className="field-hint"> Max 6, Min 1</span>
              </label>
              <div className="sp-upload-row">
                {previews.map((preview, index) => (
                  <div key={`${preview}-${index}`} className="sp-upload-thumb">
                    <img src={preview} alt={`Service preview ${index + 1}`} />
                    <button
                      type="button"
                      className="sp-upload-remove"
                      aria-label="Remove image"
                      onClick={() =>
                        handleDeleteImage(index, setFieldValue, values)
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                {previews.length < 6 && (
                  <button
                    type="button"
                    className="sp-upload-add"
                    onClick={triggerFileInput}
                  >
                    <UploadIcon />
                    <span>Upload</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="d-none"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleFileChange(e, setFieldValue, values);
                    setFieldTouched("images", true);
                  }}
                />
              </div>
              {touched.images && <FieldError name="images" />}
            </div>

            <div className="sp-add-grid">
              <div className="sp-add-details">
                <div className="field">
                  <label htmlFor="serviceCategoryId">
                    Service category <span className="req">*</span>
                  </label>
                  <Field
                    id="serviceCategoryId"
                    name="serviceCategoryId"
                    as="select"
                    className="control"
                    onChange={(e) => {
                      setFieldValue("serviceCategoryId", e.target.value);
                      setFieldTouched("serviceCategoryId", true);
                    }}
                  >
                    <option value="">Select category</option>
                    {categoryList?.data?.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.service_category_name}
                      </option>
                    ))}
                  </Field>
                  <FieldError name="serviceCategoryId" />
                </div>

                <div className="field">
                  <label htmlFor="serviceSubCategoryName">
                    Service name <span className="req">*</span>
                  </label>
                  <Field
                    id="serviceSubCategoryName"
                    name="serviceSubCategoryName"
                    type="text"
                    className="control"
                    placeholder="e.g. Emergency plumbing"
                  />
                  <FieldError name="serviceSubCategoryName" />
                </div>

                <div className="field">
                  <label htmlFor="price">
                    Price <span className="req">*</span>
                  </label>
                  <Field
                    id="price"
                    name="price"
                    type="number"
                    className="control"
                    placeholder="Enter price"
                    min="0"
                  />
                  <FieldError name="price" />
                </div>

                <div className="field">
                  <label htmlFor="desc">
                    Description <span className="req">*</span>
                  </label>
                  <Field
                    id="desc"
                    name="desc"
                    as="textarea"
                    className="control"
                    rows={5}
                    placeholder="Describe what this service includes…"
                  />
                  <FieldError name="desc" />
                </div>
              </div>

              <div className="sp-add-availability">
                <div className="field">
                  <label>
                    Availability <span className="req">*</span>
                  </label>
                  <p className="avail-label">Select day</p>
                  <div className="sp-chip-row">
                    {DAYS.map((day) => {
                      const selected = values.dayAvailability[0].day.some(
                        (d) => d.toLowerCase() === day.toLowerCase()
                      );
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`sp-chip${selected ? " active" : ""}`}
                          onClick={() => {
                            const updatedDays = selected
                              ? values.dayAvailability[0].day.filter(
                                  (d) => d.toLowerCase() !== day.toLowerCase()
                                )
                              : [...values.dayAvailability[0].day, day];
                            setFieldValue("dayAvailability[0].day", updatedDays);
                            setFieldTouched("dayAvailability", true);
                          }}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  {touched.dayAvailability && (
                    <ErrorMessage
                      name="dayAvailability.day"
                      component="div"
                      className="field-error"
                    />
                  )}
                </div>

                <div className="field">
                  <p className="avail-label">Select time</p>
                  <div className="sp-chip-row sp-chip-row--times">
                    {timeSchedule?.map((time) => {
                      const normalizeTime = (t) =>
                        t
                          .replace(/\s+/g, "")
                          .replace(/[-–—]/g, "-")
                          .toLowerCase();
                      const selectedTimes = Array.isArray(
                        values?.dayAvailability?.[0]?.timeArr
                      )
                        ? values.dayAvailability[0].timeArr.map(normalizeTime)
                        : [];
                      const normalizedTime = normalizeTime(time);
                      const selected = selectedTimes.includes(normalizedTime);
                      const label = time.replace(
                        /(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)/i,
                        (_, p1, p2, p3, p4) =>
                          `${parseInt(p1, 10)} ${p2.toLowerCase()} – ${parseInt(
                            p3,
                            10
                          )} ${p4.toLowerCase()}`
                      );

                      return (
                        <button
                          key={time}
                          type="button"
                          className={`sp-chip sp-chip--time${
                            selected ? " active" : ""
                          }`}
                          onClick={() => {
                            const updatedTimes = selected
                              ? selectedTimes.filter((t) => t !== normalizedTime)
                              : [...selectedTimes, normalizedTime];
                            setFieldValue(
                              "dayAvailability[0].timeArr",
                              updatedTimes
                            );
                            setFieldTouched("dayAvailability", true);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {touched.dayAvailability && (
                    <ErrorMessage
                      name="dayAvailability.timeArr"
                      component="div"
                      className="field-error"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="form-foot sp-add-foot">
              {(searchValFromUrl || getCachedProviderHasService() === true) && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate("/allmyservices")}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving…"
                  : searchValFromUrl
                  ? "Update service"
                  : "Save service"}
              </button>
            </div>
          </FormikForm>
        )}
      </Formik>
    </CorporatePageShell>
  );
}
