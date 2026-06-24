import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import moment from "moment";

import Layout from "../Components/Layout/Layout";
import CustomerActions from "../Redux/Actions/CustomerActions";
import CustomerBookServiceModal from "../CommanComponents/Modals/CustomerBookServiceModal";
import SimbaPageBanner from "../CommanComponents/SimbaPageBanner";
import { getStatusLabel } from "../utils/CommonFunction";
import { taskStatus } from "../utils/jobFlowStatus";
import {
  formatDisplayTitle,
  handleCategoryImageError,
  providerDisplayName,
  serviceImageUrl,
  taskImageUrl,
  userImageUrl,
} from "../utils/landingUtils";

const AVATAR_COLORS = [
  "#0F5C4C",
  "#C2682B",
  "#2B5FC2",
  "#7A2BC2",
  "#1F7C66",
  "#B0421F",
];

function ClockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 7v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function PlaceholderThumbIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function initials(name) {
  return (name || "P")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getServiceStatusMeta(status) {
  const s = Number(status);
  if (s === 4) return { cls: "st-completed", label: getStatusLabel(s) };
  if (s === 3 || s === 5) return { cls: "st-cancelled", label: getStatusLabel(s) };
  if ([2, 6, 7].includes(s)) {
    return { cls: "st-progress", label: getStatusLabel(s) };
  }
  return { cls: "st-upcoming", label: getStatusLabel(s) };
}

function getTaskStatusMeta(status) {
  const s = Number(status);
  if (s === taskStatus.COMPLETED) {
    return { cls: "st-completed", label: "Completed" };
  }
  if (s === taskStatus.REJECTED) {
    return { cls: "st-cancelled", label: "Rejected" };
  }
  if (
    [taskStatus.ACCEPTED, taskStatus.ON_THE_WAY, taskStatus.IN_PROGRESS].includes(
      s
    )
  ) {
    if (s === taskStatus.ON_THE_WAY) {
      return { cls: "st-progress", label: "On the Way" };
    }
    if (s === taskStatus.IN_PROGRESS) {
      return { cls: "st-progress", label: "In Progress" };
    }
    return { cls: "st-progress", label: "Accepted" };
  }
  return { cls: "st-upcoming", label: "Upcoming" };
}

function EmptyBookings({ seg, tab }) {
  const segLabel = seg === "task" ? "task" : "service";
  const tabLabel = tab === "upcoming" ? "coming up" : "in history";
  return (
    <div className="empty">
      <svg
        width="54"
        height="54"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <h3>
        No {segLabel} bookings {tabLabel}
      </h3>
      <p>
        When you book a {segLabel}, it&apos;ll show up here.
      </p>
    </div>
  );
}

function ServiceBookingCard({ data, colorIndex, onEdit }) {
  const navigate = useNavigate();
  const statusMeta = getServiceStatusMeta(data?.status);
  const provider = data?.serviceProvider;
  const showProvider = [2, 4, 6, 7].includes(Number(data?.status));
  const showChat = showProvider && provider?._id;
  const canEdit = data?.status === 0 || data?.status === 1;
  const thumbSrc = data?.serviceSubCategory?.images?.[0]
    ? serviceImageUrl(data.serviceSubCategory.images[0])
    : null;
  const providerLoc =
    provider?.street_address !== "undefined"
      ? provider?.street_address
      : provider?.suburbs !== "undefined"
      ? provider?.suburbs
      : "-";
  const providerName = providerDisplayName(provider);

  return (
    <Link to={`/user-booking-detail/${data?._id}`} className="bcard">
      <div className="bthumb">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={data?.serviceSubCategory?.serviceSubCategoryName || "Service"}
            onError={handleCategoryImageError}
          />
        ) : (
          <PlaceholderThumbIcon />
        )}
      </div>
      <div className="binfo">
        <h3>{formatDisplayTitle(data?.serviceSubCategory?.serviceSubCategoryName, "N/A")}</h3>
        <div className="bsched">
          <ClockIcon />
          {`${data?.slotTime || ""}, ${moment(data?.date).format("DD MMM")}`}
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-primary btn-sm bcard-edit"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(data?.serviceSubCategory?._id, data);
            }}
          >
            Edit
          </button>
        )}
        {showProvider && provider && (
          <div className="bprov">
            <span
              className="pav"
              style={{
                background: `linear-gradient(145deg,${AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]},${AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]}cc)`,
              }}
            >
              <img
                src={userImageUrl(provider)}
                alt={providerName}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.textContent = initials(
                    provider?.full_name
                  );
                }}
              />
            </span>
            <div className="pmeta">
              <b>{providerName}</b>
              <small>
                <LocationIcon />
                {providerLoc}
              </small>
            </div>
          </div>
        )}
      </div>
      <div className="bside">
        <span className={`status-badge ${statusMeta.cls}`}>
          <span className="sdot" />
          {statusMeta.label}
        </span>
        {showChat && (
          <span
            className="chat-btn"
            role="button"
            tabIndex={0}
            aria-label="Message"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              localStorage.setItem("reciverID", provider._id);
              navigate(`/messages?userID=${provider._id}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                localStorage.setItem("reciverID", provider._id);
                navigate(`/messages?userID=${provider._id}`);
              }
            }}
          >
            <ChatIcon />
          </span>
        )}
      </div>
    </Link>
  );
}

function TaskBookingCard({ data, colorIndex }) {
  const navigate = useNavigate();
  const statusMeta = getTaskStatusMeta(data?.status);
  const provider = data?.serviceProvider || data?.serviceProviderId;
  const taskNumericStatus = Number(data?.status);
  const showProvider = [2, 3, 4, 5].includes(taskNumericStatus);
  const showChat = showProvider && provider?._id;
  const canEdit = taskNumericStatus === taskStatus.PENDING;
  const showEditButton =
    taskNumericStatus === taskStatus.PENDING ||
    taskNumericStatus === taskStatus.ACCEPTED;
  const thumbSrc =
    Array.isArray(data?.images) && data.images[0]
      ? taskImageUrl(data.images[0])
      : null;
  const providerLoc =
    provider?.suburbs !== "undefined" ? provider?.suburbs : "-";
  const providerName = providerDisplayName(provider);

  return (
    <Link
      to={`/user-booking-detail/${data._id}`}
      state={{ type: data.type }}
      className="bcard"
    >
      <div className="bthumb">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={data?.need_done || "Task"}
            onError={handleCategoryImageError}
          />
        ) : (
          <PlaceholderThumbIcon />
        )}
      </div>
      <div className="binfo">
        <h3>{formatDisplayTitle(data?.need_done, "N/A")}</h3>
        <div className="bsched">
          <ClockIcon />
          {`${data?.task_time || ""}, ${moment(data?.date).format("DD MMM")}`}
        </div>
        {showEditButton && (
          <button
            type="button"
            className="btn btn-primary btn-sm bcard-edit"
            disabled={!canEdit}
            title={
              canEdit
                ? "Edit task"
                : "Task already accepted, editing disabled"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!canEdit) return;
              navigate(`/edit-task/${data?._id}`);
            }}
          >
            Edit
          </button>
        )}
        {showProvider && provider && (
          <div className="bprov">
            <span
              className="pav"
              style={{
                background: `linear-gradient(145deg,${AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]},${AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]}cc)`,
              }}
            >
              <img
                src={userImageUrl(provider)}
                alt={providerName}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.textContent = initials(
                    provider?.full_name
                  );
                }}
              />
            </span>
            <div className="pmeta">
              <b>{providerName}</b>
              <small>
                <LocationIcon />
                {providerLoc}
              </small>
            </div>
          </div>
        )}
      </div>
      <div className="bside">
        <span className={`status-badge ${statusMeta.cls}`}>
          <span className="sdot" />
          {statusMeta.label}
        </span>
        {showChat && (
          <span
            className="chat-btn"
            role="button"
            tabIndex={0}
            aria-label="Message"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const receiverId = provider?._id;
              if (!receiverId) return;
              localStorage.setItem("reciverID", receiverId);
              navigate(`/messages?userID=${receiverId}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                const receiverId = provider?._id;
                if (!receiverId) return;
                localStorage.setItem("reciverID", receiverId);
                navigate(`/messages?userID=${receiverId}`);
              }
            }}
          >
            <ChatIcon />
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Bookings() {
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookingList, setBookingList] = useState([]);
  const [bookingTypeView, setBookingTypeView] = useState("service");
  const [show, setShow] = useState(false);
  const [boookingId, setBookingId] = useState(null);
  const [selectedBoooking, setSelectedBoooking] = useState(null);

  useEffect(() => {
    const status = activeTab === "past" ? 4 : null;
    dispatch(CustomerActions.getAllBookingList({ status })).then((res) => {
      if (res?.payload?.success) {
        setBookingList(res.payload.data || []);
      }
    });
  }, [activeTab, show, dispatch]);

  useEffect(() => {
    setBookingTypeView("service");
  }, [activeTab]);

  const handleOpen = (id, bookingData) => {
    setShow(true);
    setBookingId(id);
    setSelectedBoooking(bookingData);
  };

  const handleClose = () => {
    setShow(false);
    setBookingId(null);
    setSelectedBoooking(null);
  };

  const { serviceBookings, taskBookings } = useMemo(() => {
    const byLatest = (a, b) => {
      const aTime = new Date(
        a?.createdAt || a?.updatedAt || a?.date || 0
      ).getTime();
      const bTime = new Date(
        b?.createdAt || b?.updatedAt || b?.date || 0
      ).getTime();
      return bTime - aTime;
    };
    return {
      serviceBookings: bookingList
        .filter((item) => item.type === "booking")
        .sort(byLatest),
      taskBookings: bookingList
        .filter((item) => item.type === "task")
        .sort(byLatest),
    };
  }, [bookingList]);

  const list =
    bookingTypeView === "service" ? serviceBookings : taskBookings;
  const listLabel =
    bookingTypeView === "task" ? "Task Bookings" : "Service Bookings";
  const showSegment = serviceBookings.length > 0 || taskBookings.length > 0;

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-bookings">
        <SimbaPageBanner title="Bookings" crumbLabel="Bookings" />

        <main className="page">
          <div className="wrap">
            <div className="tabs">
              <button
                type="button"
                className={`tab${activeTab === "upcoming" ? " active" : ""}`}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </button>
              <button
                type="button"
                className={`tab${activeTab === "past" ? " active" : ""}`}
                onClick={() => setActiveTab("past")}
              >
                History
              </button>
            </div>

            {showSegment && (
              <div className="seg-row">
                <div className="seg">
                  <button
                    type="button"
                    className={bookingTypeView === "service" ? "active" : ""}
                    onClick={() => setBookingTypeView("service")}
                  >
                    Service Bookings
                  </button>
                  <button
                    type="button"
                    className={bookingTypeView === "task" ? "active" : ""}
                    onClick={() => setBookingTypeView("task")}
                  >
                    Task Bookings
                  </button>
                </div>
              </div>
            )}

            {showSegment && <h2 className="list-label">{listLabel}</h2>}

            <div className="bookings">
              {!showSegment || list.length === 0 ? (
                <EmptyBookings
                  seg={bookingTypeView}
                  tab={activeTab === "past" ? "history" : "upcoming"}
                />
              ) : bookingTypeView === "service" ? (
                serviceBookings.map((data, index) => (
                  <ServiceBookingCard
                    key={data._id || data.id}
                    data={data}
                    colorIndex={index}
                    onEdit={handleOpen}
                  />
                ))
              ) : (
                taskBookings.map((data, index) => (
                  <TaskBookingCard
                    key={data._id}
                    data={data}
                    colorIndex={index}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      <CustomerBookServiceModal
        show={show}
        setShow={handleClose}
        service_id={boookingId}
        data={selectedBoooking}
      />
    </Layout>
  );
}
