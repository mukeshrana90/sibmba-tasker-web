import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import { Row, Nav, Col, Tab } from "react-bootstrap";
import TotalLeadsIcon from "../../Assets/Images/corporate/TotalLeads.svg";
import PendingIcon from "../../Assets/Images/corporate/PendingIcon.svg";
import ProductsIcon from "../../Assets/Images/corporate/ProductsIcon.svg";
import TierIcon from "../../Assets/Images/corporate/TierIcon.svg";
import dummyIcon from "../../Assets/Images/my-profile.svg";
import { useDispatch, useSelector } from "react-redux";
import CorporateActions from "../../Redux/Actions/corporateActions";

const CorporateDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const leads = useSelector((state) => state.corporateSlice?.leads);

  useEffect(() => {
    dispatch(CorporateActions.getCorporateLeads({ page, limit }));
  }, [dispatch, page, limit]);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleAccept = (id, status) => {
  dispatch(
    CorporateActions.acceptRejectCorporateSuggestion({
      taskId: id._id,
      status: status,
    })
  ).then((res) => {
    if (res?.payload) {
      if(status === 1 ){
      toast.success("Accepted successfully." );
      }else{
      toast.error("Rejected successfully.");
      }
    }
  }).catch((error) => {
    toast.error("An error occurred. Please try again.");
  });
};

  const summaryData = [
    { label: "Total Leads", value: 198, icon: TotalLeadsIcon },
    { label: "Pending", value: 15, icon: PendingIcon },
    { label: "Products", value: 15, icon: ProductsIcon },
    { label: "Current Tier", value: "Bronze", icon: TierIcon },
  ];

  const upcomingTasks = [
    {
      title: "Bathroom Renovation",
      subtitle: "Anti-slip Tiles",
      status: "Pending",
      date: "24 July 2025",
    },
    {
      title: "Sleek Oasis",
      subtitle: "Anti-slip Tiles",
      status: "Pending",
      date: "25 July 2025",
    },
  ];

  return (
    <Layout>
      <section className="search-results-sec">
        <div className="container corporate-wrapper pt-5">
          <h1 className="h4 mb-4 fw-semibold">Corporate Dashboard</h1>

          <div className="dashbox-box-wrap">
            {summaryData.map((item, idx) => (
              <div key={idx} className="dashbox-box">
                <div className="title-wrap">
                  <span className="icon-img">
                    <img src={item.icon} alt="" />
                  </span>
                  <p className="dashboard-value">{item.value}</p>
                </div>
                <h4 className="title">{item.label}</h4>
              </div>
            ))}
          </div>

          <Tab.Container defaultActiveKey="first">
            <Row>
              <Col sm={12}>
                <Nav variant="pills" className="bookings-tab-nav mb-4">
                  <Nav.Item>
                    <Nav.Link eventKey="first">Upcoming Tasks</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="second">New Leads</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>

              <Col sm={12}>
                <Tab.Content>
                  <Tab.Pane eventKey="first">
                    <div className="bookings-cards">
                      <ul className="list-unstyled">
                        {upcomingTasks.map((res, idx) => (
                          <li key={idx} className="mb-3">
                            <div className="booking-card">
                              <h5 className="mb-1">{res.title}</h5>
                              <p className="mb-1 small text-muted">{res.subtitle}</p>
                              <small className="text-muted">{res.date}</small>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Tab.Pane>

                  <Tab.Pane eventKey="second">
                    <div className="bookings-cards">
                      <ul className="list-unstyled">
                        {leads?.leads?.length > 0 ? (
                          leads.leads.map((res, idx) => {
                            const corp = res.corporateIds || {};
                            const item = res.taskId || {};
                            const status = res.corporateStatus && res.userStatus === 1 ? "In Progress" : "Pending";

                            return (
                              <li key={res._id || idx} className="mb-3">
                                <div className="booking-card p-3 border rounded shadow-sm">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                      <h5 className="mb-1">
                                        {item.need_done || "Untitled Task"}
                                      </h5>
                                      <div className="small text-muted">
                                        <i className="bi bi-geo-alt-fill me-1"></i>
                                        {item.address || "No Location"} &nbsp; | &nbsp;
                                        <i className="bi bi-calendar-event me-1"></i>
                                        {item.when_done || "No Date"}
                                      </div>
                                    </div>
                                    <span
                                    className={`corporate_inner ${
                                      status === "In Progress" ? "in-progress" : "pending"
                                    }`}
                                  >
                                    {status}
                                  </span>
                                  </div>

                                  <div className="d-flex align-items-center gap-2 mb-3">
                                    <img
                                      src={`${process.env.REACT_APP_API_URL}/${corp.profile_image}`}
                                      alt={corp.full_name}
                                      className="booking-avatar rounded-circle"
                                      width={40}
                                      height={40}
                                    />
                                    <p className="mb-0 small">
                                      Suggested by: <strong>{corp.full_name}</strong>
                                    </p>
                                  </div>

                                  {res.userStatus === 1 && res.corporateStatus === 1 ? (
                                  <div className="book-service-action-btn leads-btn d-flex gap-2">
                                    <button
                                      className="btn btn-success btn-sm text-white"
                                      onClick={() => navigate(`/corporate/lead-details/${item?._id}`)}
                                    >
                                      See More
                                    </button>
                                  </div>
                                ) : res.userStatus === 1 ? (
                                  <div className="book-service-action-btn d-flex gap-2">
                                    <button
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => handleAccept(item, 0)}
                                    >
                                      Reject
                                    </button>
                                    <button
                                      className="btn btn-success btn-sm"
                                      onClick={() => handleAccept(item, 1)}
                                    >
                                      Accept
                                    </button>
                                  </div>
                                ) : null}

                                 
                                </div>
                              </li>
                            );
                          })
                        ) : (
                          <li className="text-muted">No leads available.</li>
                        )}
                      </ul>
                    </div>
                  </Tab.Pane>
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        </div>
      </section>
    </Layout>
  );
};

export default CorporateDashboard;
