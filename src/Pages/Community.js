import { useEffect, useState } from "react";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import MapComponent from "../CommanComponents/MapComponent";
import {
  communityImageUrl,
  handleCategoryImageError,
} from "../utils/landingUtils";

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function openBookingLink(link) {
  if (!link) return;
  const url = link.startsWith("http") ? link : `https://${link}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function Community() {
  const dispatch = useDispatch();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const communityData = useSelector((state) => state.UserSlice.communityDetail);
  const communityDataId = useSelector(
    (state) => state.UserSlice.communityDetailById
  );

  useEffect(() => {
    dispatch(CustomerActions.getCommunity());
  }, [dispatch]);

  useEffect(() => {
    if (communityData?.length > 0 && !selectedEvent) {
      setSelectedEvent(communityData[0]);
      dispatch(CustomerActions.getCommunityById(communityData[0]._id));
    }
  }, [communityData, selectedEvent, dispatch]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    dispatch(CustomerActions.getCommunityById(event?._id));
  };

  const eventData = communityDataId || selectedEvent;
  const events = communityData || [];

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-training p-community">
        <main className="page">
          <div className="wrap">
            <h1>Community</h1>

            {events.length > 0 ? (
              <div className="course-grid">
                {events.map((event) => (
                  <button
                    key={event._id}
                    type="button"
                    className={`course-card${
                      selectedEvent?._id === event._id ? " active" : ""
                    }`}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="cc-img">
                      <img
                        src={communityImageUrl(event?.photos?.[0])}
                        alt={event.eventName || "Event"}
                        onError={handleCategoryImageError}
                      />
                    </div>
                    <div className="cc-cat">Community event</div>
                    <div className="cc-title">{event.eventName}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">
                <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h3>No events available</h3>
                <p>Check back soon for community events and meetups.</p>
              </div>
            )}

            {eventData && (
              <>
                <div className="tm-detail">
                  <div className="tm-video community-hero">
                    <img
                      src={communityImageUrl(eventData?.photos?.[0])}
                      alt={eventData.eventName || "Event"}
                      onError={handleCategoryImageError}
                    />
                  </div>
                  <div className="tm-info">
                    <h2>{eventData.eventName}</h2>
                    <div className="tm-cat">{eventData.eventAddress || "—"}</div>
                    <p className="tm-desc">
                      {eventData.description || "No description provided."}
                    </p>
                    <div className="tm-feats">
                      <div className="ft">
                        <CalendarIcon />
                        <span>{formatDate(eventData.eventDate)}</span>
                      </div>
                      <div className="ft">
                        <LocationIcon />
                        <span>{eventData.eventAddress || "—"}</span>
                      </div>
                    </div>
                    {eventData.bookingLink && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openBookingLink(eventData.bookingLink)}
                      >
                        Book ticket
                      </button>
                    )}
                  </div>
                </div>

                {eventData.location?.coordinates && (
                  <div className="community-map-wrap">
                    <MapComponent
                      coordinates={eventData.location.coordinates}
                      address={eventData.eventAddress}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
