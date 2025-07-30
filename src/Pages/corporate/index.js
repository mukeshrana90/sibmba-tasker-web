import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import { Row, Nav, Col, Tab } from "react-bootstrap";
import TotalLeadsIcon from "../../Assets/Images/corporate/TotalLeads.svg";
import PendingIcon from "../../Assets/Images/corporate/PendingIcon.svg";
import ProductsIcon from "../../Assets/Images/corporate/ProductsIcon.svg";
import TierIcon from "../../Assets/Images/corporate/TierIcon.svg";
import { useDispatch, useSelector } from "react-redux";
import CorporateActions from "../../Redux/Actions/corporateActions";
import PaginationComponent from "../../CommanComponents/PaginationComponent";
import locationPin from "../../Assets/Images/corporate/locationPin.svg";
import calenderIcon from "../../Assets/Images/corporate/calenderIcon.svg";

const CorporateDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const leads = useSelector((state) => state.corporateSlice?.leads);
  const corporateDashboard = useSelector(
    (state) => state.corporateSlice?.corporateDashboard
  );
  const upcomingTasks = useSelector(
    (state) => state.corporateSlice?.upcomingtask?.leads
  );
  const totalPages = leads?.totalPages;
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams?.get("page") || "tasks"
  );
  const [leadFilter, setLeadFilter] = useState("all");

  useEffect(() => {
    dispatch(
      CorporateActions.getCorporateLeads({ page, limit, status: leadFilter })
    );
    dispatch(CorporateActions.getCorporateDashboard());
  }, [dispatch, page, limit, leadFilter]);

  useEffect(() => {
    dispatch(CorporateActions.getUpcomingCorporateLeads({ page, limit }));
  }, [dispatch, page, limit]);

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

   const handleAccept = (data, status) => {
    const payload = {
      status: status,
    };

    if (data?.type == "task") {
      payload.taskId = data?.taskId?._id;
    } else {
      payload.bookingId = data?.bookingId?._id;
    }

    dispatch(CorporateActions.acceptRejectCorporateSuggestion(payload))
      .then((res) => {
        if (res?.payload) {
          toast.success(status === 1 ? "Accepted successfully." : "Rejected successfully.");
          dispatch(CorporateActions.getCorporateLeads({ page, limit }));
        }
      })
      .catch(() => {
        toast.error("An error occurred. Please try again.");
      });
  };

  const CorporateDashboard = [
    {
      label: "Total Leads",
      value: corporateDashboard?.total_leads|| 0,
      icon: TotalLeadsIcon,
      router: "/corporate/leads?page=tasks",
    },
    {
      label: "Pending",
      value: corporateDashboard?.total_leads_pending  || 0,
      icon: PendingIcon,
      router: "/corporate/leads?page=leads",
    },
    {
      label: "Products",
      value: corporateDashboard?.total_products || 0,
      icon: ProductsIcon,
      router: "/corporate/products"
    },
    {
      label: "Current Tier",
      value: corporateDashboard?.current_subscription?.subscriptionPlan?.split('.')[1] || 'Subscribe Now',
      icon: TierIcon,
      router: "/payment",
    },
  ];

  return (
    <Layout>
      <section className="search-results-sec">
        <div className="container corporate-wrapper pt-5">
          <h1 className="h4 mb-4 fw-semibold">Corporate Dashboard</h1>

          <div className="dashbox-box-wrap">
            {CorporateDashboard?.map((item, idx) => (
              <div key={idx} className="dashbox-box cursor-pointer"  onClick={() => navigate(item.router)}>
                <div className="title-wrap">
                  <span className="icon-img">
                    <img src={item.icon} alt="" />
                  </span>
                  <p className="dashboard-value" style={{textTransform:'capitalize'}}>{item.value}</p>
                </div>
                <h4 className="title">{item.label}</h4>
              </div>
            ))}
          </div>

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
                      <div className="d-flex justify-content-end mb-3">
                        <button
                          className="view-more-btn"
                          onClick={() =>
                            navigate(`/corporate/leads?page=tasks`)
                          }
                        >
                          View More
                        </button>
                      </div>
                      <ul className="list-unstyled">
                        {upcomingTasks?.length > 0 ? (
                          upcomingTasks.slice(0, 10).map((res, idx) => (
                            <li key={idx} className="mb-3">
                              <div className="booking-card">
                                <div className="d-flex justify-content-between">
                                  <h5 className="mb-2">
                                    {res?.taskId?.need_done}
                                  </h5>
                                  <h5 className="mb-2 corporate_inner pending">
                                    Pending
                                  </h5>
                                  {/* Replace 'pending' with dynamic status class if needed */}
                                </div>
                                <p className="mb-1 small text-muted">
                                  {res?.taskId?.details}
                                </p>
                                <p className="mb-1 mt-2">
                                  Address: {res?.taskId?.address}
                                </p>
                                <div className="d-flex gap-3 mt-3">
                                  <small className="text-muted">
                                    Time: {res.taskId?.task_time}
                                  </small>
                                  <small className="text-muted">
                                    Date: {res.taskId?.when_done}
                                  </small>
                                </div>
                              </div>
                            </li>
                          ))
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
                                <h3>No Leads Found</h3>
                                <p>
                                Currently you don’t have any upcoming leads
                                </p>
                              </div>
                        )}
                      </ul>
                    </div>
                  </Tab.Pane>

                  <Tab.Pane eventKey="leads">
                    <div className="bookings-cards">
                      <div className="d-flex justify-content-end mb-3">
                        <button
                          className="view-more-btn"
                          onClick={() =>
                            navigate(`/corporate/leads?page=leads`)
                          }
                        >
                          View More
                        </button>
                      </div>
                      <ul className="list-unstyled">
                        {leads?.leads?.length > 0 ? (
                          leads.leads
                            .filter((res) =>
                              leadFilter === "all"
                                ? true
                                : res.status === leadFilter
                            )
                            .slice(0, 10)
                            .map((res, idx) => {
                              const corp = res?.corporateIds || {};
                              const item = res.taskId || {};
                              const status = res.status;

                              return (
                                <li key={res._id || idx} className="mb-3">
                                  <div className="booking-card">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <div>
                                        <h5 className="mb-1 text-transform ">
                                          {item.need_done || "Untitled Task"}
                                        </h5>
                                        <div className="small text-muted">
                                         <img src={locationPin} alt="" height={20} width={20}></img>
                                          {item.address || "No Location"} &nbsp;
                                          | &nbsp;
                                          <img src={calenderIcon} alt="" height={20} width={20}></img>  {item.when_done || "No Date"}
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
                                        <strong>{corp.full_name}</strong>
                                      </p>
                                    </div>

                                    {(res.userStatus === 1 &&
                                      res.corporateStatus === 1) ||
                                    status === "rejected" ? (
                                      <div className="book-service-action-btn d-flex gap-2">
                                        <button
                                          className="primaryBtn"
                                          onClick={() =>
                                            navigate(
                                             `/corporate/lead-details/${res?.bookingId?._id || res?.taskId?._id}`
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
                                          className="view-more-btn"
                                          onClick={() => handleAccept(res, 0)}
                                        >
                                          Reject
                                        </button>
                                        <button
                                          className="primaryBtn"
                                          onClick={() => handleAccept(res, 1)}
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
                          <h3>No Leads Found</h3>
                          <p>
                          Currently you don’t have any Leads.
                          </p>
                        </div>
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
      </section>
    </Layout>
  );
};

export default CorporateDashboard;
