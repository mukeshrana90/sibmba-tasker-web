import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import dayjs from "dayjs";
import Container from "react-bootstrap/Container";

const CorporateDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("team");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Static placeholder data
  const team = [
    { id: 1, full_name: "Jane Doe", email: "jane@halsteds.com", role: "owner" },
    { id: 2, full_name: "Mark Smith", email: "mark@halsteds.com", role: "sales" },
    { id: 3, full_name: "Sarah Lee", email: "sarah@halsteds.com", role: "support" },
  ];

  const quotes = [
    {
      id: "q1",
      request_details: "Need quote for 150L geyser, copper pipes.",
      status: "pending",
      created_at: dayjs().subtract(1, "day").toISOString(),
    },
    {
      id: "q2",
      request_details: "Follow-up quote for gate valves.",
      status: "responded",
      created_at: dayjs().subtract(3, "day").toISOString(),
    },
  ];

  return (
    <Layout>
      <section className="search-results-sec py-8">
        <Container>
          <div className="mb-4">
            <h1 className="h3 fw-semibold">Welcome to Your Corporate Dashboard</h1>
          </div>

          {/* Horizontal Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "team" ? "active" : ""}`}
                onClick={() => setActiveTab("team")}
              >
                Team Members
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "quotes" ? "active" : ""}`}
                onClick={() => setActiveTab("quotes")}
              >
                Recent Quotes
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          {activeTab === "team" && (
            <section className="mb-5">
              <div className="border rounded overflow-hidden">
                {team.map((member, index) => (
                  <div
                    key={member.id}
                    className={`d-flex justify-content-between align-items-center p-3 ${
                      index !== team.length - 1 ? "border-bottom" : ""
                    }`}
                  >
                    <div>
                      <div className="fw-medium">{member.full_name}</div>
                      <div className="text-muted small">{member.email}</div>
                    </div>
                    <span className="badge bg-light text-dark text-capitalize">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "quotes" && (
            <section>
              <div className="border rounded overflow-hidden">
                {quotes.map((quote, index) => (
                  <div
                    key={quote.id}
                    className={`d-flex justify-content-between align-items-start p-3 ${
                      index !== quotes.length - 1 ? "border-bottom" : ""
                    }`}
                  >
                    <div>
                      <div className="fw-medium">{quote.request_details}</div>
                      <div className="text-muted small text-capitalize">
                        Status: {quote.status}
                      </div>
                    </div>
                    <small className="text-muted">
                      {dayjs(quote.created_at).format("DD MMM")}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          )}
        </Container>
      </section>
    </Layout>
  );
};

export default CorporateDashboard;
