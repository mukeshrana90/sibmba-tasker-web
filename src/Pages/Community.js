// import React, { useEffect, useState } from "react";
// import Container from "react-bootstrap/Container";
// import Row from "react-bootstrap/Row";
// import Col from "react-bootstrap/Col";
// import { useNavigate } from "react-router-dom";
// import Layout from "../Components/Layout/Layout";
// import { useDispatch, useSelector } from "react-redux";
// import CustomerActions from "../Redux/Actions/CustomerActions";

// export default function Community() {
//   const navigate = useNavigate();
//   const dispatch = useDispatch();
//   const [selectedEvent, setSelectedEvent] = useState(null); // Track selected event
//   const communityData = useSelector((state) => state.UserSlice.communityDetail);
//   const communityDataId = useSelector((state) => state.UserSlice.communityDetailById);

//   useEffect(() => {
//     dispatch(CustomerActions.getCommunity());
//   }, [dispatch]);

//   useEffect(() => {
//     // Set the first event as selected by default if communityData is available
//     if (communityData && communityData.length > 0 && !selectedEvent) {
//       setSelectedEvent(communityData[0]);
//     }
//   }, [communityData, selectedEvent]);

//   const handleEventClick = (event) => {
//     setSelectedEvent(event);
//      dispatch(CustomerActions.getCommunityById(event?._id))
//   };

//   // Extract image URL from the photos field (assuming format like "timestamp--url")
//   const getImageUrl = (photo) => {
//     if (!photo) return require("../Assets/Images/my-profile.svg").default;
//     const url = photo.split("--")[1]; // Extract the URL part
//     return url || require("../Assets/Images/my-profile.svg").default;
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString("en-US", {
//       day: "numeric",
//       month: "long",
//       year: "numeric",
//     });
//   };

//   return (
//     <Layout>
//       <section className="service-detail-sec">
//         <Container>
//           <Row>
//             <Col lg={12}>
//               <div className="bookings-details-title">
//                 <h2>Community</h2>
//               </div>
//               <div className="community-list-contain">
//                 <div className="community-list-show">
//                   <ul>
//                     {communityData && communityData.length > 0 ? (
//                       communityData.map((event) => (
//                         <li
//                           key={event._id}
//                           className={
//                             selectedEvent && selectedEvent._id === event._id
//                               ? "active"
//                               : ""
//                           }
//                           onClick={() => handleEventClick(event)}
//                         >
//                           <img
//                           src={`${process.env.REACT_APP_API_URL}/service/${event?.photos[0]}`}
//                           alt={``}
//                         />
//                           <p>{event.eventName}</p>
//                         </li>
//                       ))
//                     ) : (
//                       <li>No events available</li>
//                     )}
//                   </ul>
//                 </div>
//                 <div className="community-data-view">
//                   {selectedEvent ? (
//                     <>
//                       <div className="community-detail-card">
//                         <img
//                           src={getImageUrl(selectedEvent.photos[0])}
//                           alt={selectedEvent.eventName}
//                           onError={(e) =>
//                             (e.target.src = require("../Assets/Images/living-room-cleaning.png"))
//                           }
//                         />
//                         <div>
//                           <h3>
//                             <span>{selectedEvent.eventName}</span>
//                           </h3>
//                           <h4>
//                             <svg
//                               xmlns="http://www.w3.org/2000/svg"
//                               width="11"
//                               height="15"
//                               viewBox="0 0 11 15"
//                               fill="none"
//                             >
//                               <path
//                                 d="M5.86821 0.549682C6.70956 0.602244 7.53688 0.831042 8.26605 1.23608C9.87 2.12757 10.9379 3.83841 10.9972 5.60902C11.0457 7.06529 10.4611 8.47725 9.71791 9.74904C8.71261 11.4702 7.40097 13.0254 5.86498 14.3415C5.75819 14.4332 5.63846 14.5281 5.49608 14.5373C5.30516 14.5497 5.1466 14.4085 5.01393 14.2776C3.75406 13.0347 2.50931 11.7567 1.55794 10.2839C0.748953 9.03276 0.155696 7.62286 0.0187075 6.14907C-0.0999437 4.87315 0.353088 3.57148 1.1707 2.5594C1.64639 1.97091 2.24827 1.47518 2.93645 1.12889C3.83281 0.67954 4.85968 0.486814 5.86821 0.549682ZM8.55189 5.68632C8.47962 4.06102 7.07306 2.79129 5.41734 2.85313C3.71415 2.91703 2.37879 4.26509 2.44459 5.85534C2.51254 7.47445 3.92773 8.75449 5.57914 8.68956C7.28664 8.62154 8.62308 7.27142 8.55189 5.68632Z"
//                                 fill="#545454"
//                               />
//                             </svg>
//                             {selectedEvent.eventAddress}
//                           </h4>
//                           <h5>{formatDate(selectedEvent.eventDate)}</h5>
//                           <div className="book-service-action-btn">
//                             <button
//                               onClick={() =>
//                                 window.open(selectedEvent.bookingLink, "_blank")
//                               }
//                             >
//                               Book Ticket
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                       <div className="community-disc">
//                         <h3>Description</h3>
//                         <p>{selectedEvent.description}</p>
//                       </div>
//                     </>
//                   ) : (
//                     <p>No event selected</p>
//                   )}
//                 </div>
//               </div>
//             </Col>
//           </Row>
//         </Container>
//       </section>
//     </Layout>
//   );
// }


import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import MapComponent from "../CommanComponents/MapComponent";


export default function Community() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const communityData = useSelector((state) => state.UserSlice.communityDetail);
  const communityDataId = useSelector((state) => state.UserSlice.communityDetailById);

  useEffect(() => {
    dispatch(CustomerActions.getCommunity());
  }, [dispatch]);

  useEffect(() => {
    if (communityData && communityData.length > 0 && !selectedEvent) {
      setSelectedEvent(communityData[0]);
    }
  }, [communityData, selectedEvent]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    dispatch(CustomerActions.getCommunityById(event?._id));
  };

  const getImageUrl = (photo) => {
    if (!photo) return require("../Assets/Images/my-profile.svg").default;
    const url = photo.split("--")[1];
    return url || require("../Assets/Images/my-profile.svg").default;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const eventData = communityDataId || selectedEvent;

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title">
                <h2>Community</h2>
              </div>
              <div className="community-list-contain">
                <div className="community-list-show">
                  <ul>
                    {communityData && communityData.length > 0 ? (
                      communityData.map((event) => (
                        <li
                          key={event._id}
                          className={
                            selectedEvent && selectedEvent._id === event._id
                              ? "active"
                              : "list-inner"
                          }
                          onClick={() => handleEventClick(event)}
                        >
                          <img
                            src={`${process.env.REACT_APP_API_URL}/service/${event?.photos[0]}`}
                            alt={event?.eventName || ""}
                            onError={(e) =>
                              (e.target.src = require("../Assets/Images/my-profile.svg").default)
                            }
                          />
                          <p>{event.eventName}</p>
                        </li>
                      ))
                    ) : (
                      <li>No events available</li>
                    )}
                  </ul>
                </div>
                <div className="community-data-view">
                  {eventData ? (
                    <>
                      <div className="community-detail-card">
                        <img
                          src={`${process.env.REACT_APP_API_URL}/service/${eventData?.photos[0]}`}
                          alt={eventData?.eventName || ""}
                          onError={(e) =>
                            (e.target.src = require("../Assets/Images/my-profile.svg").default)
                          }
                        />
                        <div>
                          <h3>
                            <span>{eventData.eventName}</span>
                          </h3>
                          <h4>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="11"
                              height="15"
                              viewBox="0 0 11 15"
                              fill="none"
                            >
                              <path
                                d="M5.86821 0.549682C6.70956 0.602244 7.53688 0.831042 8.26605 1.23608C9.87 2.12757 10.9379 3.83841 10.9972 5.60902C11.0457 7.06529 10.4611 8.47725 9.71791 9.74904C8.71261 11.4702 7.40097 13.0254 5.86498 14.3415C5.75819 14.4332 5.63846 14.5281 5.49608 14.5373C5.30516 14.5497 5.1466 14.4085 5.01393 14.2776C3.75406 13.0347 2.50931 11.7567 1.55794 10.2839C0.748953 9.03276 0.155696 7.62286 0.0187075 6.14907C-0.0999437 4.87315 0.353088 3.57148 1.1707 2.5594C1.64639 1.97091 2.24827 1.47518 2.93645 1.12889C3.83281 0.67954 4.85968 0.486814 5.86821 0.549682ZM8.55189 5.68632C8.47962 4.06102 7.07306 2.79129 5.41734 2.85313C3.71415 2.91703 2.37879 4.26509 2.44459 5.85534C2.51254 7.47445 3.92773 8.75449 5.57914 8.68956C7.28664 8.62154 8.62308 7.27142 8.55189 5.68632Z"
                                fill="#545454"
                              />
                            </svg>
                            {eventData.eventAddress}
                          </h4>
                          <h5>{formatDate(eventData.eventDate)}</h5>
                          <div className="book-service-action">
                            {/* <button
                              onClick={() =>
                                window.open(eventData.bookingLink, "_blank")
                              }
                            >
                              Book Ticket
                            </button> */}
                            <button
                            onClick={() => {
                              const link = eventData.bookingLink.startsWith("http")
                                ? eventData.bookingLink
                                : `https://${eventData.bookingLink}`;
                              window.open(link, "_blank");
                            }}
                          >
                            Book Ticket
                          </button>
                          </div>
                        </div>
                      </div>
                      <div className="community-disc">
                        <h3>Description</h3>
                        <p>{eventData.description}</p>
                      </div>
                      <div className="community-map">
                        <MapComponent
                          coordinates={eventData.location?.coordinates}
                          address={eventData.eventAddress}
                        />
                      </div>
                    </>
                  ) : (
                    <p>No event selected</p>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}