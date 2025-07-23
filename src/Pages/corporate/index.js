import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import { Row, Nav, Col, Tab } from "react-bootstrap";
import TotalLeadsIcon from "../../Assets/Images/corporate/TotalLeads.svg";
import PendingIcon from "../../Assets/Images/corporate/PendingIcon.svg";
import ProductsIcon from "../../Assets/Images/corporate/ProductsIcon.svg";
import TierIcon from "../../Assets/Images/corporate/TierIcon.svg";

import dummyIcon from "../../Assets/Images/my-profile.svg";

const CorporateDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const summaryData = [
    {
      label: "Total Leads",
      value: 198,
      icon: TotalLeadsIcon,
    },
    {
      label: "Pending",
      value: 15,
      icon: PendingIcon,
    },
    {
      label: "Products",
      value: 15,
      icon: ProductsIcon,
    },
    {
      label: "Current Tier",
      value: "Bronze",
      icon: TierIcon,
    },
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

  const newLeads = [
    {
      title: "Bathroom Renovation",
      location: "New Jersey",
      date: "24 July 2025",
      status: "Pending",
      suggestedBy: "James Enterprises",
      avatar: dummyIcon,
    },
    {
      title: "Stylish Spa",
      location: "New Jersey",
      date: "24 July 2025",
      status: "Cancelled",
      suggestedBy: "Robert Carley",
      avatar: dummyIcon,
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
                    {newLeads.map((res, idx) => (
                      <li key={idx} className="mb-3">
                        <div className="booking-card">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <h5 className="mb-1">{res.title}</h5>
                              <div className="small text-muted">
                                <i className="bi bi-geo-alt-fill me-1"></i>
                                {res.location} &nbsp; | &nbsp;
                                <i className="bi bi-calendar-event me-1"></i>
                                {res.date}
                              </div>
                            </div>
                            <span
                              className={`corporate_inner ${
                                res.status.toLowerCase() === "pending"
                                  ? "pending"
                                  : "cancelled"
                              }`}
                            >
                              {res.status}
                            </span>
                          </div>

                          <div className="d-flex align-items-center gap-2 mb-3">
                            <img
                              src={res.avatar}
                              alt={res.suggestedBy}
                              className="booking-avatar"
                            />
                            <p className="mb-0 small">
                              Suggested by: <strong>{res.suggestedBy}</strong>
                            </p>
                          </div>

                          <div className="book-service-action-btn d-flex  gap-2">
                            <button className="">Reject</button>
                            <button className="">Accept</button>
                          </div>
                        </div>
                      </li>
                    ))}
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
