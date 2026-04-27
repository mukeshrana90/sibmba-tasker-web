import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BookingConfirmationModal from "../CommanComponents/Modals/BookingConfirmationModal";
import CancelModal from "../CommanComponents/Modals/CancelModal";
import FilterModal from "../CommanComponents/Modals/FilterModal";
import moment from "moment";
import defaultImage from "../Assets/Images/placeholder.jpg";
import JobFlowStepper from "../CommanComponents/JobFlowStepper";
import { getTaskFlowDescription, taskStatus } from "../utils/jobFlowStatus";
export default function ServiceTasks() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab");
  const allowedTabs = new Set(["first", "second", "third", "fourth"]);
  const [activeTab, setActiveTab] = useState(
    allowedTabs.has(initialTab) ? initialTab : "first"
  );
  const [showModal, setShowModal] = useState(false);
  const [isRequestModal, setIsRequestModal] = useState(false);
  const [showModalCancel, setShowModalCancel] = useState(false);
  const [ids, setIds] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [selectedCompletedTask, setSelectedCompletedTask] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTask, setDisputeTask] = useState(null);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [filteredData, setFilteredData] = useState({
    acceptedTasks: [],
    myQuotations: [],
    tasks: [],
    completedTasks: [],
  });
  const postTasksList = useSelector(
    (state) => state.service.getPostTaskService
  );

  // Fetch post tasks list on mount
  useEffect(() => {
    let data = {
      need_done: "",
      budget: "",
      date: "",
      time: "",
    };

    dispatch(ServiceActions.getPostTaskList(data));
  }, [dispatch]);

  useEffect(() => {
    if (!postTasksList) return;

    const query = searchQuery.toLowerCase().trim();

    if (activeTab === "first") {
      const filteredAccepted = (postTasksList.acceptedTasks || []).filter(
        (task) =>
          task?.need_done?.toLowerCase().includes(query) ||
          task?.user_details?.full_name?.toLowerCase().includes(query)
      );
      setFilteredData({
        acceptedTasks: filteredAccepted,
        myQuotations: [],
        tasks: [],
        completedTasks: [],
      });
    } else if (activeTab === "second") {
      const filteredQuotations = (postTasksList.myQuotations || []).filter(
        (quotation) =>
          quotation?.need_done?.toLowerCase().includes(query) ||
          quotation?.user_details?.full_name?.toLowerCase().includes(query)
      );
      setFilteredData({
        acceptedTasks: [],
        myQuotations: filteredQuotations,
        tasks: [],
        completedTasks: [],
      });
    } else if (activeTab === "third") {
      const filteredTasks = (postTasksList.tasks || []).filter(
        (task) =>
          task?.need_done?.toLowerCase().includes(query) ||
          task?.user_details?.full_name?.toLowerCase().includes(query)
      );
      setFilteredData({
        acceptedTasks: [],
        myQuotations: [],
        tasks: filteredTasks,
        completedTasks: [],
      });
    } else if (activeTab === "fourth") {
      const filteredCompleted = (postTasksList.completedTasks || []).filter((task) => {
        const matchesQuery =
          task?.need_done?.toLowerCase().includes(query) ||
          task?.user_details?.full_name?.toLowerCase().includes(query);
        return Number(task?.status) === taskStatus.COMPLETED && matchesQuery;
      });
      setFilteredData({
        acceptedTasks: [],
        myQuotations: [],
        tasks: [],
        completedTasks: filteredCompleted,
      });
    }
  }, [postTasksList, searchQuery, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === activeTab) return;
    params.set("tab", activeTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [activeTab, location.pathname, location.search, navigate]);

  // useEffect(() => {
  //   if (!postTasksList) return;

  //   const filterData = () => {
  //     const query = searchQuery.toLowerCase().trim();

  //     if (!query) {
  //       // If search query is empty, show all data
  //       setFilteredData({
  //         acceptedTasks: postTasksList.tasks || [],
  //         myQuotations: postTasksList.myQuotations || [],
  //         tasks: postTasksList.acceptedTasks || [],
  //       });
  //       return;
  //     }

  //     // Filter based on active tab
  //     setFilteredData({
  //       acceptedTasks:
  //         activeTab === "first"
  //           ? (postTasksList.acceptedTasks || []).filter(
  //             (task) =>
  //               task?.need_done?.toLowerCase().includes(query) ||
  //               task?.user_details?.full_name?.toLowerCase().includes(query)
  //           )
  //           : postTasksList.acceptedTasks || [],
  //       myQuotations:
  //         activeTab === "second"
  //           ? (postTasksList.myQuotations || []).filter(
  //             (quotation) =>
  //               quotation?.need_done?.toLowerCase().includes(query) ||
  //               quotation?.user_details?.full_name?.toLowerCase().includes(query)
  //           )
  //           : postTasksList.myQuotations || [],
  //       tasks:
  //         activeTab === "third"
  //           ? (postTasksList.tasks || []).filter(
  //             (task) =>
  //               task?.need_done?.toLowerCase().includes(query) ||
  //               task?.user_details?.full_name?.toLowerCase().includes(query)
  //           )
  //           : postTasksList.tasks || [],
  //     });
  //   };

  //   filterData();
  // }, [postTasksList, searchQuery, activeTab]);

  // Format date (e.g., "24 Apr")
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDatee = (dateString) => {
    return moment(dateString).format("DD MMM");
  };

  // Handle reject button
  const handleReject = (id) => {
    setShowModalCancel(true);
    setIds(id);
  };

  // Confirm cancel action
  const handleConfirmCancel = () => {
    navigate(`/requestdetail/${ids}?service=reject`);
    setShowModalCancel(false);
  };

  // Close cancel modal with navigation
  const handleCloseModalCancel = () => {
    navigate(`/requestdetail/${ids}`);
    setShowModalCancel(false);
  };

  const handleCloseModalCancell = () => {
    setShowModalCancel(false);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenFeedback = (task) => {
    setSelectedCompletedTask(task);
    setFeedbackRating(0);
    setFeedbackMessage("");
    setShowFeedbackModal(true);
  };

  const handleCloseFeedback = () => {
    if (feedbackSubmitting) return;
    setShowFeedbackModal(false);
    setFeedbackRating(0);
    setFeedbackMessage("");
    setSelectedCompletedTask(null);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedCompletedTask?._id) return;
    if (!feedbackRating || !feedbackMessage.trim()) {
      toast.error("Please give rating and message.");
      return;
    }
    setFeedbackSubmitting(true);
    const customerId =
      selectedCompletedTask?.user_details?._id ||
      selectedCompletedTask?.user_details?.id ||
      selectedCompletedTask?.bookBy?._id ||
      selectedCompletedTask?.bookBy?.id ||
      selectedCompletedTask?.user_id?._id ||
      selectedCompletedTask?.user_id?.id ||
      (typeof selectedCompletedTask?.user_id === "string"
        ? selectedCompletedTask.user_id
        : null) ||
      selectedCompletedTask?.customer_id ||
      selectedCompletedTask?.seekerId;
    if (!customerId) {
      toast.error("Could not identify the customer.");
      setFeedbackSubmitting(false);
      return;
    }
    const payload = {
      task_id: selectedCompletedTask._id,
      ratedSeekerId: customerId,
      rating: feedbackRating,
      message: feedbackMessage.trim(),
      type: 2,
    };
    try {
      const res = await dispatch(CustomerActions.giveFeedbackToSeeker(payload));
      if (res?.payload?.success) {
        toast.success("Feedback submitted successfully.");
        handleCloseFeedback();
      } else {
        toast.error(res?.payload?.message || "Could not submit feedback.");
      }
    } catch {
      toast.error("Could not submit feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleOpenDispute = (task) => {
    setDisputeTask(task);
    setDisputeTitle("");
    setDisputeDescription("");
    setShowDisputeModal(true);
  };

  const handleCloseDispute = () => {
    if (disputeSubmitting) return;
    setShowDisputeModal(false);
    setDisputeTask(null);
    setDisputeTitle("");
    setDisputeDescription("");
  };

  const handleSubmitDispute = async () => {
    if (!disputeTitle.trim() || !disputeDescription.trim()) {
      toast.error("Please enter title and message.");
      return;
    }
    const refId = disputeTask?.referenceId ?? disputeTask?.reference_id ?? null;
    if (!refId) {
      toast.error("Task reference not found.");
      return;
    }
    setDisputeSubmitting(true);
    try {
      const res = await dispatch(
        CustomerActions.raiseDispute({
          referenceId: refId,
          reason: disputeTitle.trim(),
          description: disputeDescription.trim(),
        })
      );
      if (res?.payload?.success) {
        toast.success(res?.payload?.message || "Dispute submitted successfully.");
        handleCloseDispute();
      } else {
        toast.error(res?.payload?.message || "Could not submit dispute.");
      }
    } catch {
      toast.error("Could not submit dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const getTaskMapCoordinates = (task) => {
    const directLat = Number(
      task?.latitude ?? task?.lat ?? task?.location?.lat
    );
    const directLng = Number(
      task?.longitude ?? task?.lng ?? task?.location?.lng
    );
    if (!Number.isNaN(directLat) && !Number.isNaN(directLng)) {
      return { lat: directLat, lng: directLng };
    }
    const coords = task?.location?.coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lng, lat] = coords;
      if (!Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
        return { lat: Number(lat), lng: Number(lng) };
      }
    }
    return null;
  };

  const renderTaskCard = (task) => (
    <div className="quotation-requests" key={task?._id}>
      <div className="bookings-card-item">
        <img
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/servicetasksdetails/${task?._id}`)}
          src={
            task?.images?.length > 0
              ? `${process.env.REACT_APP_API_URLL}${task.images[0]}`
              : require("../Assets/Images/placeholder.jpg")
          }
          alt="Task"
          className="task-image"
        />
        <div className="requests-time-checkup">
          <h3>{task?.need_done || ""}</h3>
          <p>
            {task?.task_time}, {formatDate(task?.when_done)} - {task?.address}
          </p>
          <p>{task.details}</p>
          <p className="task-price">${task.budget}</p>
        </div>
      </div>
    </div>
  );

  const renderTaskCardTask = (task) => (
    <div className="quotation-requests" key={task?._id}>
      <div className="bookings-card-item3">
        <img
          style={{ cursor: "pointer" }}
          onClick={() =>
            navigate(
              `/servicetasksdetails/${task?._id}?status=task&fromTab=${activeTab}`
            )
          }
          src={
            task?.images?.length > 0
              ? `${process.env.REACT_APP_API_URLL}${task.images[0]}`
              : defaultImage
          }
          alt="Task"
          className="task-image"
        />
        <div className="requests-time-checkup">
          <h3>{task?.need_done || ""}</h3>
          <p>
            {task?.task_time}, {formatDatee(task?.when_done)} - {task?.address}
          </p>
          <p>{task.details}</p>
          <p className="task-price">${task.budget}</p>
        </div>
      </div>
    </div>
  );

  const renderMyQuotations = (task) => (
    <div className="quotation" key={task?._id}>
      <div>
        <div className="quotation-txt-show">
          <div
            className="profile-side cursor-pointer"
            onClick={() => navigate(`/quotations-detail/${task?._id}`)}
          >
            <img
              className="point-cursor"
              src={
                task?.user_details?.profile_image  
                  ? `${process.env.REACT_APP_API_URL}${task?.user_details?.profile_image}`
                  : defaultImage
              }
              alt="Service Provider"
            />
            <div>
              <h5>{task?.user_details?.full_name || ""}</h5>
              <p>
                {task?.user_details?.address &&
                task.user_details.address !== "undefined"
                  ? task.user_details.address
                  : "-"}
              </p>
              {/* <div className="rating-stars">
                <ul> <StarRating averageRating={task.averageRating} /></ul>
              </div> */}
            </div>
          </div>
          <div>
            <h5>${task?.offer_price || "N/A"}</h5>
            <p>Offer Price</p>
          </div>
        </div>
        <p>{task?.description || "No description provided"}</p>
      </div>
    </div>
  );

  const renderCompletedTaskCard = (task) => {
    const detailUrl = `/servicetasksdetails/${task?._id}?status=task&fromTab=${activeTab}`;
    const map = getTaskMapCoordinates(task);
    const mapUrl = map
      ? `https://maps.google.com/maps?q=${map.lat},${map.lng}&z=14&output=embed`
      : null;
    const shareUrl = map
      ? `https://maps.google.com/?q=${map.lat},${map.lng}`
      : null;

    return (
      <div
        className="quotation-requests quotation-requests--completed"
        key={task?._id}
      >
        <div className="requests-completed-main map-container-service-tasks">
          <div className="requests-time-checkup requests-completed-left d-flex gap-3">
            <img
              style={{ cursor: "pointer", width: 100, height: 100, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
              onClick={() => navigate(detailUrl)}
              src={
                task?.images?.length > 0
                  ? `${process.env.REACT_APP_API_URLL}${task.images[0]}`
                  : defaultImage
              }
              alt="Task"
              className="task-image"
            />
            <div className="flex-grow-1">
              <h3
                style={{ cursor: "pointer" }}
                onClick={() => navigate(detailUrl)}
              >
                {task?.need_done || ""}
              </h3>
              <p className="text-muted">{task?.details || ""}</p>
              <p>
                {task?.task_time}, {formatDatee(task?.when_done)}
              </p>
              <p>{task?.address}</p>
              <p className="task-price mb-0">${task?.budget}</p>
              <div className="mt-3">
                <JobFlowStepper mode="task" status={task?.status} />
                <p className="mt-2 mb-0">
                  {getTaskFlowDescription(task?.status)}
                </p>
                <div className="completed-status-note">
                  Job completed. Payment will be processed by the customer.
                </div>
                <div className="book-service-action-btn d-flex gap-2 mt-3">
                  <button
                    type="button"
                    className="booking-job-done-btn"
                    onClick={() => handleOpenFeedback(task)}
                  >
                    Rate the Customer
                  </button>
                </div>
                <button
                  type="button"
                  className="task-dispute-link-btn"
                  onClick={() => handleOpenDispute(task)}
                >
                  Having an issue? <span>Raise Dispute</span>
                </button>
              </div>
            </div>
          </div>
          {map && mapUrl && shareUrl ? (
            <div className="requests-completed-map">
              <iframe
                title={`completed-task-map-${task?._id}`}
                src={mapUrl}
                width="100%"
                height="220"
                style={{ border: 0, borderRadius: "8px" }}
                loading="lazy"
              />
              <div className="book-service-action-btn d-flex gap-2 mt-3 requests-completed-map-actions">
                <button
                  type="button"
                  className="booking-job-done-btn"
                  onClick={() => window.open(shareUrl, "_blank")}
                >
                  Open in Maps
                </button>
                <button
                  type="button"
                  className="booking-job-done-btn"
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({
                        title: "Task location",
                        text: "Completed task location",
                        url: shareUrl,
                      });
                      return;
                    }
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      toast.success("Location copied.");
                    }
                  }}
                >
                  Share Location
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <section className="search-results-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain">
                <div className="taskk">
                  <div>
                    <h2>Browse Task</h2>
                  </div>
                  <div className="task-nav">
                    <div className="search-bar">
                      <input
                        type="text"
                        placeholder="Search by name or task"
                        value={searchQuery}
                        onChange={handleSearchChange}
                      />
                      {activeTab != "second" && (
                        <div
                          className="mt-1"
                          onClick={() => setShowModal(true)}
                        >
                          <svg
                            className="cursor-pointer"
                            width="24"
                            height="25"
                            viewBox="0 0 24 25"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M20.0215 3.5H3.97905C3.57179 3.50032 3.17338 3.61885 2.83216 3.84119C2.49095 4.06353 2.22162 4.38013 2.05684 4.75257C1.89206 5.12501 1.83893 5.53727 1.90389 5.93931C1.96885 6.34136 2.14911 6.71591 2.4228 7.0175L9.3753 14.6637V21.875C9.37536 22.016 9.41515 22.1541 9.49009 22.2734C9.56504 22.3928 9.67212 22.4887 9.79905 22.55C9.90049 22.6 10.0122 22.6257 10.1253 22.625C10.2958 22.6249 10.4611 22.5667 10.594 22.46L12.0003 21.335L14.344 19.46C14.4318 19.3898 14.5026 19.3008 14.5512 19.1995C14.5999 19.0982 14.6252 18.9873 14.6253 18.875V14.6637L21.5778 7.0175C21.8515 6.71591 22.0317 6.34136 22.0967 5.93931C22.1617 5.53727 22.1085 5.12501 21.9438 4.75257C21.779 4.38013 21.5096 4.06353 21.1684 3.84119C20.8272 3.61885 20.4288 3.50032 20.0215 3.5Z"
                              fill="#252525"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bookings-tabs">
                  <Tab.Container
                    id="left-tabs-example"
                    activeKey={activeTab}
                    onSelect={(key) => setActiveTab(key)}
                  >
                    <Row>
                      <Col sm={12}>
                        <div className="task-post-action mb-4">
                          <Nav variant="pills" className="bookings-tab-nav">
                            <Nav.Item>
                              <Nav.Link eventKey="first">Tasks</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                              <Nav.Link eventKey="second">Quotation</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                              <Nav.Link eventKey="third">Upcoming</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                              <Nav.Link eventKey="fourth">Completed</Nav.Link>
                            </Nav.Item>
                          </Nav>
                        </div>
                      </Col>
                      <Col sm={12}>
                        <Tab.Content>
                          {/* Tasks Tab (acceptedTasks) */}
                          <Tab.Pane eventKey="first">
                            {filteredData?.acceptedTasks?.length > 0 ? (
                              filteredData?.acceptedTasks?.map(
                                renderTaskCardTask
                              )
                            ) : (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  fill="none"
                                >
                                  <path
                                    d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                    fill="#CCCCCC"
                                  />
                                  <path
                                    d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                    fill="#CCCCCC"
                                  />
                                </svg>
                                <h3>No Tasks Found</h3>
                                <p>
                                  {searchQuery
                                    ? "No tasks match your search."
                                    : "Currently you don’t have any tasks."}
                                </p>
                              </div>
                            )}
                          </Tab.Pane>
                          {/* Quotation Tab (myQuotations) */}
                          <Tab.Pane eventKey="second">
                            {filteredData?.myQuotations?.length > 0 ? (
                              filteredData?.myQuotations?.map(
                                renderMyQuotations
                              )
                            ) : (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  fill="none"
                                >
                                  <path
                                    d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                    fill="#CCCCCC"
                                  />
                                  <path
                                    d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                    fill="#CCCCCC"
                                  />
                                </svg>
                                <h3>No Quotations Found</h3>
                                <p>
                                  {searchQuery
                                    ? "No quotations match your search."
                                    : "Currently you don’t have any quotations."}
                                </p>
                              </div>
                            )}
                          </Tab.Pane>
                          {/* Upcoming Tab (tasks) */}
                          <Tab.Pane eventKey="third">
                            {filteredData?.tasks?.length > 0 ? (
                              filteredData?.tasks.map(renderTaskCard)
                            ) : (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  fill="none"
                                >
                                  <path
                                    d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                    fill="#CCCCCC"
                                  />
                                  <path
                                    d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                    fill="#CCCCCC"
                                  />
                                </svg>
                                <h3>No Upcoming Tasks Found</h3>
                                <p>
                                  {searchQuery
                                    ? "No upcoming tasks match your search."
                                    : "Currently you don’t have any upcoming tasks."}
                                </p>
                              </div>
                            )}
                          </Tab.Pane>
                          <Tab.Pane eventKey="fourth">
                            {filteredData?.completedTasks?.length > 0 ? (
                              filteredData?.completedTasks.map(
                                renderCompletedTaskCard
                              )
                            ) : (
                              <div className="no-upcoming-bookings">
                                <h3>No Completed Tasks Found</h3>
                                <p>
                                  {searchQuery
                                    ? "No completed tasks match your search."
                                    : "Currently you don’t have any completed tasks."}
                                </p>
                              </div>
                            )}
                          </Tab.Pane>
                        </Tab.Content>
                      </Col>
                    </Row>
                  </Tab.Container>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
        <BookingConfirmationModal
          show={isRequestModal}
          handleClose={() => setIsRequestModal(false)}
        />
        <CancelModal
          show={showModalCancel}
          handleClose={handleCloseModalCancell}
          handleConfirm={handleConfirmCancel}
          handleCloseModal={handleCloseModalCancel}
        />
        <FilterModal
          show={showModal}
          handleClose={() => setShowModal(false)}
          type={activeTab}
        />
        <Modal
          show={showFeedbackModal}
          onHide={handleCloseFeedback}
          centered
          backdrop={feedbackSubmitting ? "static" : true}
        >
          <Modal.Header closeButton={!feedbackSubmitting}>
            <Modal.Title>Rate Customer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="rating-stars mb-3">
              <ul className="d-flex list-unstyled gap-2 mb-0">
                {[1, 2, 3, 4, 5].map((star) => (
                  <li key={star}>
                    <button
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{ background: "transparent", border: 0, padding: 0 }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill={star <= feedbackRating ? "#FFC107" : "#E0E0E0"}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Form.Group>
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Write your feedback"
                disabled={feedbackSubmitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="rate-customer-modal-footer">
            <button
              type="button"
              className="btn btn-light border rate-customer-modal-btn"
              onClick={handleCloseFeedback}
              disabled={feedbackSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="booking-job-done-btn rate-customer-modal-btn"
              onClick={handleSubmitFeedback}
              disabled={feedbackSubmitting}
            >
              {feedbackSubmitting ? "Please wait..." : "Submit"}
            </button>
          </Modal.Footer>
        </Modal>
        <Modal
          show={showDisputeModal}
          onHide={handleCloseDispute}
          centered
          backdrop={disputeSubmitting ? "static" : true}
        >
          <Modal.Header closeButton={!disputeSubmitting}>
            <Modal.Title>Raise Dispute</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Dispute title"
                value={disputeTitle}
                onChange={(e) => setDisputeTitle(e.target.value)}
                disabled={disputeSubmitting}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Describe the issue..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                disabled={disputeSubmitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0 dispute-modal-footer">
            <button
              type="button"
              className="btn btn-light border rate-customer-modal-btn"
              onClick={handleCloseDispute}
              disabled={disputeSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="booking-job-done-btn rate-customer-modal-btn"
              onClick={handleSubmitDispute}
              disabled={disputeSubmitting}
            >
              {disputeSubmitting ? "Please wait..." : "Submit"}
            </button>
          </Modal.Footer>
        </Modal>
        <ToastContainer />
      </section>
    </Layout>
  );
}
