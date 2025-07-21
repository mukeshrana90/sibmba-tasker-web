import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../Components/Layout/Layout";

const CorporateDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">
          Welcome to Your Corporate Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="Your Leads"
            onClick={() => navigate("/corporate/leads")}
          />
          <Card
            title="Product Listings"
            onClick={() => navigate("/corporate/materials")}
          />
          <Card
            title="Subscription Plan"
            onClick={() => navigate("/corporate/subscription")}
          />
        </div>
      </div>
    </Layout>
  );
};

const Card = ({ title, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white shadow-lg hover:shadow-xl rounded-lg p-5 cursor-pointer transition-all border hover:border-blue-500"
  >
    <h2 className="text-xl font-medium">{title}</h2>
  </div>
);

export default CorporateDashboard;
