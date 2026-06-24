import { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import { convertDateToStringNew } from "../../utils/CommonFunction";
import RequestSentByUser from "./RequestSentByUser";
import BookingLocationPickerModal from "./BookingLocationPickerModal";
import {
  isLoggedIn,
  redirectToLogin,
  setAuthReturnUrl,
} from "../../utils/authRedirect";
import {
  buildServiceDetailBookingPath,
  clearBookingDraft,
  loadBookingDraft,
  parseDraftDate,
  saveBookingDraft,
} from "../../utils/bookingDraft";
import {
  handleCategoryImageError,
  serviceImageUrl,
} from "../../utils/landingUtils";

function getDayName(date) {
  return date
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();
}

function getAvailabilityList(serviceDetail, data) {
  if (serviceDetail?.availability?.length) {
    return serviceDetail.availability;
  }
  return data?.serviceSubCategory?.availability || [];
}

function getTimeSlotsForDate(date, availability) {
  if (!date || !availability?.length) return [];
  const dayName = getDayName(date);
  const slot = availability.find((entry) => {
    if (!entry?.day) return false;
    if (Array.isArray(entry.day)) {
      return entry.day.map((d) => String(d).toLowerCase()).includes(dayName);
    }
    return String(entry.day).toLowerCase().includes(dayName);
  });
  return Array.isArray(slot?.timeArr) ? slot.timeArr : [];
}

const CustomerBookServiceModal = ({ show, setShow, service_id, data }) => {
  const serviceDetail = useSelector((e) => e.UserSlice.serviceDetail);
  const customerDetails = useSelector((e) => e.login.customerDetails);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(null);
  const [msgState, setMsgState] = useState("");
  const [timeState, setTimeState] = useState("");
  const [isRequestModal, setIsRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customLocation, setCustomLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const availability = useMemo(
    () => getAvailabilityList(serviceDetail, data),
    [serviceDetail, data]
  );

  const timeSlots = useMemo(
    () => getTimeSlotsForDate(selectedDate, availability),
    [selectedDate, availability]
  );

  const profileAddress =
    customerDetails?.address ||
    customerDetails?.street_address ||
    "";
  const profileCoords = customerDetails?.location?.coordinates;

  const displayLocation = customLocation || {
    address: isLoggedIn()
      ? profileAddress || "Your saved profile address"
      : "Tap to choose where you need the service",
    isProfile: isLoggedIn(),
  };

  const isDateAvailable = (date) => {
    if (!date) return false;
    const dayName = getDayName(date);
    return availability.some((slot) => {
      if (!slot?.day) return false;
      if (Array.isArray(slot.day)) {
        return slot.day.map((d) => String(d).toLowerCase()).includes(dayName);
      }
      return String(slot.day).toLowerCase().includes(dayName);
    });
  };

  const resetForm = () => {
    setSelectedDate(null);
    setMsgState("");
    setTimeState("");
    setCustomLocation(null);
  };

  const handleBooking = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }
    if (!timeState) {
      toast.error("Please select a time slot.");
      return;
    }
    if (!msgState.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    if (!isLoggedIn()) {
      if (!service_id) {
        toast.error("Service not found.");
        return;
      }
      saveBookingDraft({
        serviceId: service_id,
        selectedDate: selectedDate.toISOString(),
        timeState,
        msgState: msgState.trim(),
        customLocation,
      });
      const returnPath = buildServiceDetailBookingPath(service_id);
      setAuthReturnUrl(returnPath);
      toast.info("Sign in to complete your booking. Your details are saved.");
      setShow(false);
      redirectToLogin(navigate, returnPath);
      return;
    }

    const finalDate = convertDateToStringNew(selectedDate);
    const basePayload = {
      date: finalDate,
      serviceSubCategory: serviceDetail?._id,
      serviceCategory: serviceDetail?.serviceCategoryId?._id,
      serviceProvider: serviceDetail?.serviceProviderId?._id,
      slotTime: timeState,
      message: msgState.trim(),
    };

    if (customLocation) {
      basePayload.address = customLocation.address;
      basePayload.lat = customLocation.lat;
      basePayload.long = customLocation.lng;
    }

    setSubmitting(true);
    try {
      let apiRes;
      if (data) {
        apiRes = await dispatch(
          CustomerActions.editBooking({
            ...basePayload,
            booking_id: data._id,
          })
        );
      } else {
        apiRes = await dispatch(CustomerActions.createBooking(basePayload));
      }

      if (apiRes?.payload?.success) {
        clearBookingDraft();
        toast.success(apiRes?.payload?.message);
        setShow(false);
        resetForm();
        if (!data) setIsRequestModal(true);
      } else {
        toast.error(apiRes?.payload?.message || "Booking failed");
      }
    } catch (error) {
      console.error("Booking failed:", error);
      toast.error("An error occurred while booking.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (show && service_id) {
      dispatch(CustomerActions.getServiceDetail({ service_id }));
    }
  }, [dispatch, service_id, show]);

  useEffect(() => {
    if (!show) return;
    if (data) {
      setTimeState(data?.slotTime?.[0] || "");
      const rawDate = data?.date || data?.when_done;
      let parsedDate = null;
      if (rawDate) {
        const direct = new Date(rawDate);
        if (!Number.isNaN(direct.getTime())) {
          parsedDate = direct;
        } else if (typeof rawDate === "string") {
          const m = rawDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (m) parsedDate = new Date(`${m[3]}-${m[1]}-${m[2]}`);
        }
      }
      setSelectedDate(parsedDate);
      setMsgState(data?.message || "");
      if (data?.address && data?.location?.coordinates?.length === 2) {
        const [lng, lat] = data.location.coordinates;
        setCustomLocation({
          address: data.address,
          lat,
          lng,
        });
      }
      return;
    }

    const draft = loadBookingDraft();
    if (draft && draft.serviceId === service_id) {
      setSelectedDate(parseDraftDate(draft.selectedDate));
      setTimeState(draft.timeState || "");
      setMsgState(draft.msgState || "");
      setCustomLocation(draft.customLocation || null);
      return;
    }

    resetForm();
  }, [data, show, service_id]);

  useEffect(() => {
    if (timeState && !timeSlots.includes(timeState)) {
      setTimeState("");
    }
  }, [timeSlots, timeState]);

  const serviceName =
    serviceDetail?.serviceSubCategoryName ||
    data?.serviceSubCategory?.serviceSubCategoryName ||
    "Service";
  const serviceThumb =
    Array.isArray(serviceDetail?.images) && serviceDetail.images.length > 0
      ? serviceImageUrl(serviceDetail.images[0])
      : Array.isArray(data?.serviceSubCategory?.images) &&
        data.serviceSubCategory.images.length > 0
      ? serviceImageUrl(data.serviceSubCategory.images[0])
      : null;

  const locationPickerInitial = customLocation ||
    (profileCoords?.length === 2
      ? {
          address: profileAddress,
          lat: profileCoords[1],
          lng: profileCoords[0],
        }
      : null);

  return (
    <>
      <Modal
        show={show}
        onHide={() => setShow(false)}
        centered
        size="lg"
        className="simba-book-modal"
        backdropClassName="simba-book-backdrop"
      >
        <Modal.Header closeButton className="bk-modal-head">
          <Modal.Title>{data ? "Edit booking" : "Book service"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bk-modal-body">
          <div className="bk-service">
            <div className="bk-service-thumb">
              {serviceThumb ? (
                <img
                  src={serviceThumb}
                  alt={serviceName}
                  onError={handleCategoryImageError}
                />
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.5-3.5L9 20" />
                </svg>
              )}
            </div>
            <div>
              <h3>{serviceName}</h3>
              <p>Choose when you need this service and where it should happen.</p>
            </div>
          </div>

          <div className="bk-grid">
            <div className="bk-col bk-col-date">
              <label className="bk-label">Select date</label>
              <div className="bk-datepicker-wrap">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => {
                    setSelectedDate(date);
                    setTimeState("");
                  }}
                  minDate={new Date()}
                  filterDate={isDateAvailable}
                  inline
                  calendarClassName="bk-datepicker"
                />
              </div>
            </div>

            <div className="bk-col bk-col-details">
              <label className="bk-label">Select time</label>
              {timeSlots.length > 0 ? (
                <div className="bk-times">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`bk-time${timeState === slot ? " active" : ""}`}
                      onClick={() => setTimeState(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="bk-times-empty">
                  {selectedDate
                    ? "No time slots available for this day."
                    : "Select a date to see available times."}
                </p>
              )}

              <label className="bk-label">Service location</label>
              <button
                type="button"
                className="bk-location"
                onClick={() => setShowLocationPicker(true)}
              >
                <span className="bk-location-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <span className="bk-location-text">
                  <b>{displayLocation.address}</b>
                  <small>
                    {customLocation
                      ? "Custom location selected — tap to change"
                      : isLoggedIn()
                      ? "Using your profile address — tap to pick another"
                      : "Optional — otherwise your profile address is used after sign-in"}
                  </small>
                </span>
                <span className="bk-location-change">Change</span>
              </button>

              <label className="bk-label" htmlFor="bk-message">
                Message
              </label>
              <textarea
                id="bk-message"
                className="control bk-message"
                rows={4}
                placeholder="Tell the provider anything they should know…"
                value={msgState}
                onChange={(e) => setMsgState(e.target.value)}
              />
            </div>
          </div>

          <div className="bk-modal-foot">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShow(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBooking}
              disabled={submitting}
            >
              {submitting ? "Booking…" : data ? "Save changes" : "Book service"}
            </button>
          </div>
        </Modal.Body>
      </Modal>

      <BookingLocationPickerModal
        show={showLocationPicker}
        onHide={() => setShowLocationPicker(false)}
        initialLocation={locationPickerInitial}
        onConfirm={(loc) => setCustomLocation(loc)}
      />

      <RequestSentByUser
        isRequestModal={isRequestModal}
        setIsRequestModal={setIsRequestModal}
      />
    </>
  );
};

export default CustomerBookServiceModal;
