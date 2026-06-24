import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import moment from "moment";
import Layout from "../Components/Layout/Layout";
import AddressAutocomplete from "../CommanComponents/AddressAutocomplete";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { today } from "../utils/CommonFunction";
import { Roles } from "../utils/Roles";
import {
  redirectToLogin,
  setAuthReturnUrl,
} from "../utils/authRedirect";
import {
  clearPostTaskDraft,
  loadPostTaskDraft,
  savePostTaskDraft,
} from "../utils/postTaskDraft";

const TIME_SLOTS = [
  {
    key: "Before 10 AM",
    label: "Before 10 AM",
    sub: "Early morning",
    icon: (
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v3M4.9 9.9 3.5 8.5M19.1 9.9l1.4-1.4M2 18h20M6 18a6 6 0 0 1 12 0M22 22H2" />
      </svg>
    ),
  },
  {
    key: "10 AM - 2 PM",
    label: "10 AM – 2 PM",
    sub: "Midday",
    icon: (
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    ),
  },
  {
    key: "2 PM - 6 PM",
    label: "2 PM – 6 PM",
    sub: "Afternoon",
    icon: (
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4v2M5 9 3.5 7.5M19 9l1.5-1.5M2 16h20M5 16a7 7 0 0 1 14 0M19 20H5" />
      </svg>
    ),
  },
  {
    key: "After 6 PM",
    label: "After 6 PM",
    sub: "Evening",
    icon: (
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    ),
  },
];

const validationSchema = Yup.object({
  need_done: Yup.string().required("Task description is required"),
  category_id: Yup.string().required("Service category is required"),
  details: Yup.string().required("Details are required"),
  when_done: Yup.date().required("Date is required").nullable(),
  budget: Yup.number()
    .typeError("Budget must be a number")
    .required("Budget is required")
    .positive("Budget must be a positive number"),
  images: Yup.array()
    .min(1, "Please add at least 1 image")
    .max(6, "Maximum 6 images allowed"),
  task_time: Yup.string().required("Please select a time slot"),
  address: Yup.string().required("Street address is required"),
});

function FieldError({ name }) {
  return (
    <ErrorMessage name={name} component="div" className="field-error" />
  );
}

const EMPTY_VALUES = {
  need_done: "",
  details: "",
  when_done: "",
  budget: "",
  images: [],
  task_time: "",
  address: "",
  lat: "",
  long: "",
  category_id: "",
};

export default function PostTask() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const categories = useSelector((e) => e.UserSlice.categories);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isCustomer = Boolean(token && role == Roles.CUSTOMER);

  const [selectedTime, setSelectedTime] = useState("");
  const [previews, setPreviews] = useState([]);
  const [initialValues, setInitialValues] = useState(EMPTY_VALUES);
  const [draftReady, setDraftReady] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  useEffect(() => {
    let active = true;

    const restoreDraft = async () => {
      const draft = await loadPostTaskDraft();
      if (!active) return;

      if (draft) {
        setInitialValues({
          ...EMPTY_VALUES,
          ...draft,
          images: draft.images || [],
        });
        setSelectedTime(draft.task_time || "");
        setPreviews(
          (draft.images || []).map((file) => URL.createObjectURL(file))
        );
      }
      setDraftReady(true);
    };

    restoreDraft();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    dispatch(CustomerActions.getCategories());
  }, [dispatch]);

  const cancelPath = useMemo(
    () => (isCustomer ? "/my-task" : "/"),
    [isCustomer]
  );

  const handleTimeSelect = (time, setFieldValue) => {
    setSelectedTime(time);
    setFieldValue("task_time", time);
  };

  const processFiles = (files, setFieldValue, values, setFieldTouched) => {
    if (!files?.length) return;

    const validFiles = Array.from(files).filter(
      (file) => file.size <= 10 * 1024 * 1024
    );
    if (validFiles.length < files.length) {
      toast.error("Some files exceed the 10 MB limit and were not added.");
    }

    const currentFiles = Array.isArray(values.images) ? [...values.images] : [];
    const remaining = 6 - currentFiles.length;

    if (remaining <= 0) {
      toast.error("Maximum 6 images allowed.");
      return;
    }

    const newFiles = validFiles.slice(0, remaining);
    if (validFiles.length > remaining) {
      toast.error("Maximum 6 images allowed.");
    }

    setFieldValue("images", [...currentFiles, ...newFiles]);
    setFieldTouched("images", true);
    setPreviews((prev) => [
      ...prev,
      ...newFiles.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const removeImage = (index, setFieldValue, values) => {
    const newFiles = [...(values.images || [])];
    newFiles.splice(index, 1);
    setFieldValue("images", newFiles);

    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePlaceSelect = (place, setFieldValue, setFieldTouched) => {
    if (place?.formatted_address) {
      setFieldValue("address", place.formatted_address);
      setFieldValue("lat", place.geometry.location.lat());
      setFieldValue("long", place.geometry.location.lng());
      setFieldTouched("address", true);
    }
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-posttask">
        <section className="banner">
          <div className="wrap">
            <div className="crumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              {isCustomer && (
                <>
                  <Link to="/my-task">My Tasks</Link>
                  <span>/</span>
                </>
              )}
              <span style={{ color: "#fff", opacity: 1 }}>Post a Task</span>
            </div>
            <h1>Post a task</h1>
            <p>
              Tell us what you need done and get quotes from trusted providers.
            </p>
          </div>
        </section>

        <section className="form-wrap">
          <div className="wrap">
            {draftReady && (
            <Formik
              enableReinitialize
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={async (values, { setSubmitting }) => {
                if (!token) {
                  try {
                    await savePostTaskDraft(values, values.images);
                    setAuthReturnUrl("/post-task");
                    toast.info("Sign in to post your task. Your details are saved.");
                    redirectToLogin(navigate, "/post-task");
                  } catch (error) {
                    console.error("Failed to save task draft:", error);
                    toast.error("Could not save your task. Please try again.");
                  } finally {
                    setSubmitting(false);
                  }
                  return;
                }

                if (role != Roles.CUSTOMER) {
                  toast.error("Only customers can post tasks.");
                  setSubmitting(false);
                  return;
                }

                setSubmitting(true);
                try {
                  const formData = new FormData();
                  formData.append("need_done", values.need_done);
                  formData.append("details", values.details);
                  formData.append(
                    "when_done",
                    moment(values.when_done).format("MM-DD-YYYY")
                  );
                  formData.append("budget", values.budget);
                  formData.append("task_time", values.task_time);
                  formData.append("address", values.address);
                  formData.append("lat", values.lat);
                  formData.append("long", values.long);
                  formData.append("category_id", values.category_id);

                  values.images.forEach((file) => {
                    if (file) formData.append("images", file);
                  });

                  const response = await dispatch(
                    CustomerActions.createPost(formData)
                  );

                  if (response?.payload?.status_code === 200) {
                    await clearPostTaskDraft();
                    toast.success(response?.payload?.message);
                    navigate("/my-task");
                  } else {
                    toast.error(
                      response?.payload?.message || "Failed to create task"
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
                isSubmitting,
                setFieldTouched,
              }) => (
                <form className="form-card" onSubmit={handleSubmit} noValidate>
                  <div className="form-grid">
                    <div className="col-left">
                      <div className="field">
                        <label htmlFor="category_id">
                          Select service category <span className="req">*</span>
                        </label>
                        <Field
                          as="select"
                          id="category_id"
                          name="category_id"
                          className="control"
                        >
                          <option value="">Select a service</option>
                          {categories?.allCat?.map((ele) => (
                            <option key={ele?._id} value={ele?._id}>
                              {ele?.service_category_name}
                            </option>
                          ))}
                        </Field>
                        <FieldError name="category_id" />
                      </div>

                      <div className="field">
                        <label htmlFor="need_done">
                          What do you need done? <span className="req">*</span>
                        </label>
                        <Field
                          id="need_done"
                          name="need_done"
                          type="text"
                          className="control"
                          placeholder="e.g. Sofa cleaning"
                        />
                        <FieldError name="need_done" />
                      </div>

                      <div className="field">
                        <label htmlFor="details">What are the details?</label>
                        <Field
                          as="textarea"
                          id="details"
                          name="details"
                          className="control"
                          placeholder="Type here…"
                        />
                        <FieldError name="details" />
                      </div>

                      <div className="field">
                        <label htmlFor="address">
                          Address <span className="req">*</span>
                        </label>
                        <AddressAutocomplete
                          apiKey="AIzaSyBbvuzwkAMflFBj3Po5oybfHCAjejwj6ww"
                          className="control"
                          onPlaceSelected={(place) =>
                            handlePlaceSelect(
                              place,
                              setFieldValue,
                              setFieldTouched
                            )
                          }
                          defaultValue={values.address}
                          options={{ types: ["address"] }}
                          onChange={(e) => {
                            setFieldValue("address", e.target.value);
                            setFieldTouched("address", true);
                          }}
                        />
                        <FieldError name="address" />
                      </div>

                      <div className="field">
                        <label>
                          Images <span className="req">*</span>{" "}
                          <span
                            style={{ fontWeight: 600, color: "var(--muted)" }}
                          >
                            (Max 6, Min 1)
                          </span>
                        </label>
                        <div
                          className="dropzone"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = "#DCEBE5";
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.background = "";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = "";
                            processFiles(
                              e.dataTransfer.files,
                              setFieldValue,
                              values,
                              setFieldTouched
                            );
                          }}
                        >
                          <svg
                            width="26"
                            height="26"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                          </svg>
                          <b>Upload images</b>
                          <small>PNG or JPG, up to 6 photos</small>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            processFiles(
                              e.target.files,
                              setFieldValue,
                              values,
                              setFieldTouched
                            );
                            e.target.value = "";
                          }}
                        />
                        {previews.length > 0 && (
                          <div className="thumbs">
                            {previews.map((preview, index) => (
                              <div className="thumb" key={preview}>
                                <img
                                  src={preview}
                                  alt={`Upload ${index + 1}`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                                <button
                                  type="button"
                                  className="rm"
                                  aria-label="Remove image"
                                  onClick={() =>
                                    removeImage(index, setFieldValue, values)
                                  }
                                >
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                  >
                                    <path d="M18 6 6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="hint">
                          {previews.length} / 6 added
                        </div>
                        <FieldError name="images" />
                      </div>
                    </div>

                    <div className="col-right">
                      <div className="field">
                        <label htmlFor="when_done">
                          When do you need this done?{" "}
                          <span className="req">*</span>
                        </label>
                        <Field
                          id="when_done"
                          name="when_done"
                          type="date"
                          className="control"
                          min={today}
                        />
                        <FieldError name="when_done" />
                      </div>

                      <div className="field">
                        <label htmlFor="budget">
                          What is your budget? <span className="req">*</span>
                        </label>
                        <div className="input-pre">
                          <span className="pre">$</span>
                          <Field
                            id="budget"
                            name="budget"
                            type="number"
                            min="0"
                            placeholder="Enter here…"
                          />
                        </div>
                        <FieldError name="budget" />
                      </div>

                      <div className="field">
                        <label>Certain time in day</label>
                        <div className="tod-grid">
                          {TIME_SLOTS.map((slot) => (
                            <button
                              key={slot.key}
                              type="button"
                              className={`tod${
                                selectedTime === slot.key ? " active" : ""
                              }`}
                              onClick={() =>
                                handleTimeSelect(slot.key, setFieldValue)
                              }
                            >
                              <div className="ti">{slot.icon}</div>
                              <b>{slot.label}</b>
                              <small>{slot.sub}</small>
                              <span className="check">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m20 6-11 11-5-5" />
                                </svg>
                              </span>
                            </button>
                          ))}
                        </div>
                        <FieldError name="task_time" />
                      </div>
                    </div>
                  </div>

                  <div className="form-foot">
                    <Link to={cancelPath} className="btn btn-ghost">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Posting…" : "Post task"}
                      {!isSubmitting && (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </Formik>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
