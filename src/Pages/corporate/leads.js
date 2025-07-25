import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import { Row, Nav, Col, Tab, Container } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import CorporateActions from "../../Redux/Actions/corporateActions";
import PaginationComponent from "../../CommanComponents/PaginationComponent";
import CustomSelect from "../../CommanComponents/CustomSelect";
import Search from "../../CommanComponents/Search";

export default function CorporateLeedsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const leads = useSelector((state) => state.corporateSlice?.leads);
  const totalPages = leads?.totalPages;
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams?.get("page") || "tasks"
  );
  const [leadFilter, setLeadFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    dispatch(
      CorporateActions.getCorporateLeads({
        page,
        limit,
        status: leadFilter,
        search: searchText,
      })
    );
    dispatch(CorporateActions.getCorporateDashboard());
  }, [dispatch, page, limit, leadFilter, searchText]);

  useEffect(() => {
    setSearchParams({ page: activeTab });
  }, [activeTab, setSearchParams]);

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
    )
      .then((res) => {
        if (res?.payload) {
          status === 1
            ? toast.success("Accepted successfully.")
            : toast.error("Rejected successfully.");
          dispatch(CorporateActions.getCorporateLeads({ page, limit }));
        }
      })
      .catch(() => {
        toast.error("An error occurred. Please try again.");
      });
  };

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
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain">
                <h2>Leeds</h2>
                <div className="bookings-tabs">
                  <Tab.Container
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    defaultActiveKey="tasks"
                  >
                    <Row>
                      <Col sm={12}>
                        <Nav variant="pills" className="bookings-tab-nav mb-4">
                          <Nav.Item>
                            <Nav.Link eventKey="tasks">Upcoming Tasks</Nav.Link>
                          </Nav.Item>
                          <Nav.Item>
                            <Nav.Link eventKey="leads">New Leads</Nav.Link>
                          </Nav.Item>
                        </Nav>
                      </Col>

                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="tasks">
                            <div className="bookings-cards">
                              <ul className="list-unstyled">
                                {upcomingTasks.map((res, idx) => (
                                  <li key={idx} className="mb-3">
                                    <div className="booking-card">
                                      <h5 className="mb-1">{res.title}</h5>
                                      <p className="mb-1 small text-muted">
                                        {res.subtitle}
                                      </p>
                                      <small className="text-muted">
                                        {res.date}
                                      </small>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </Tab.Pane>

                          <Tab.Pane eventKey="leads">
                            <div className="bookings-cards">
                              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
                                <div className="nav-serch-bar leads-search-wrapper d-flex align-items-center mr-0 gap-2">
                                  <img
                                    className="search-icn leads-search mt-0"
                                    src={
                                      require("../../Assets/Images/search-icon.svg")
                                        .default
                                    }
                                  />

                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search Leeds..."
                                    value={searchText}
                                    onChange={(e) =>
                                      setSearchText(e.target.value)
                                    }
                                  />
                                </div>

                                {/* Filter */}
                                <div className="mt-3 mt-md-0">
                                  <CustomSelect
                                    selected={leadFilter}
                                    setSelected={setLeadFilter}
                                  />
                                </div>
                              </div>
                              <ul className="list-unstyled">
                                {leads?.leads?.length > 0 ? (
                                  leads.leads
                                    .filter((res) =>
                                      leadFilter === "all"
                                        ? true
                                        : res.status === leadFilter
                                    )
                                    .map((res, idx) => {
                                      const corp = res.corporateIds || {};
                                      const item = res.taskId || {};
                                      const status = res.status;

                                      return (
                                        <li
                                          key={res._id || idx}
                                          className="mb-3"
                                        >
                                          <div className="booking-card">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                              <div>
                                                <h5 className="mb-1">
                                                  {item.need_done ||
                                                    "Untitled Task"}
                                                </h5>
                                                <div className="small text-muted">
                                                  <i className="bi bi-geo-alt-fill me-1"></i>
                                                  {item.address ||
                                                    "No Location"}{" "}
                                                  &nbsp; | &nbsp;
                                                  <i className="bi bi-calendar-event me-1"></i>
                                                  {item.when_done || "No Date"}
                                                </div>
                                              </div>
                                              <span
                                                className={`corporate_inner ${status}`}
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
                                                Suggested by:{" "}
                                                <strong>
                                                  {corp.full_name}
                                                </strong>
                                              </p>
                                            </div>

                                            {(res.userStatus === 1 &&
                                              res.corporateStatus === 1) ||
                                            status === "rejected" ? (
                                              <div className="book-service-action-btn leads-btn d-flex gap-2">
                                                <button
                                                  className="btn btn-success btn-sm text-white"
                                                  onClick={() =>
                                                    navigate(
                                                      `/corporate/lead-details/${item?._id}`
                                                    )
                                                  }
                                                >
                                                  See More
                                                </button>
                                              </div>
                                            ) : res.userStatus === 1 &&
                                              status !== "rejected" ? (
                                              <div className="book-service-action-btn d-flex gap-2">
                                                <button
                                                  className="btn btn-outline-danger btn-sm"
                                                  onClick={() =>
                                                    handleAccept(item, 0)
                                                  }
                                                >
                                                  Reject
                                                </button>
                                                <button
                                                  className="btn btn-success btn-sm"
                                                  onClick={() =>
                                                    handleAccept(item, 1)
                                                  }
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
                                  <li className="text-muted">
                                    No leads available.
                                  </li>
                                )}
                              </ul>
                            </div>

                            {totalPages > 10 && (
                              <div className="pagination-flexs mt-5">
                                <PaginationComponent
                                  page={page}
                                  setPage={setPage}
                                  totalPages={totalPages}
                                />
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
      </section>
    </Layout>
  );
}
