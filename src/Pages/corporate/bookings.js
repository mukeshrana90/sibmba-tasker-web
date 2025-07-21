import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import dayjs from "dayjs";

const CorporateBookingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Static placeholder quote bookings
  const bookings = [
    {
      id: "b1",
      seeker_name: "Amit Sharma",
      request_details: "Need quote for 1x 150L Geyser and 5m copper pipe",
      status: "pending",
      created_at: dayjs().subtract(2, "day").toISOString(),
    },
    {
      id: "b2",
      seeker_name: "Neha Verma",
      request_details: "Looking for 10x PVC elbows and ball valves",
      status: "responded",
      created_at: dayjs().subtract(5, "day").toISOString(),
    },
  ];

  const getStatusVariant = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "responded":
        return "success";
      case "declined":
        return "danger";
      default:
        return "secondary";
    }
  };

  return (
    <Layout>
      <section className="search-results-sec py-8">
        <Container>
          <div className="mb-4">
            <h1 className="h4 fw-semibold">Quote Requests / Bookings</h1>
            <p className="text-muted small">These are requests sent to your corporate team.</p>
          </div>

          <Table bordered hover responsive>
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Seeker</th>
                <th>Request</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map((booking, idx) => (
                  <tr key={booking.id}>
                    <td>{idx + 1}</td>
                    <td>{booking.seeker_name}</td>
                    <td>{booking.request_details}</td>
                    <td>
                      <Badge bg={getStatusVariant(booking.status)} className="text-capitalize">
                        {booking.status}
                      </Badge>
                    </td>
                    <td>{dayjs(booking.created_at).format("DD MMM, YYYY")}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => toast.info("Detail view coming soon!")}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-3">
                    No quote requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Container>
      </section>
    </Layout>
  );
};

export default CorporateBookingPage;
