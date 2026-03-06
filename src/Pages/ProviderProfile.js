import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { replace, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import ProviderForm from "../CommanComponents/ProviderForm";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useQuery } from "../utils/CommonFunction";
import { Roles } from "../utils/Roles";

export default function ProviderProfile() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const query = useQuery();
  const role = query.get("role");
  const isCorporate = role == Roles.CORPORATE;
  const [validateForm, setValidateForm] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const steps = [
    "Some basic info",
    isCorporate ? "Business Information" : "Company details",
    ...(!isCorporate ? ["Reference details"] : []),
    "Document Verification",
    ...(!isCorporate ? ["Your service"] : [])
  ];
  const handleSubmit = async (values) => {
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (key === "images") {
          values[key].forEach((file) => {
            if (file) formData.append("images", file);
          });
        } else if (values[key] instanceof File && values[key]) {
          formData.append(key, values[key]);
        } else if (values[key] !== null && values[key] !== undefined && values[key] !== "") {
          // Only append skip flags if they're explicitly true
          if (key === "reference_skip" || key === "document_skip") {
            if (values[key] === true) {
              formData.append(key, true);
            }
          } else {
            formData.append(key, values[key]);
          }
        }
      });
      if(isCorporate && currentStep === 3){
        formData.append('is_completeProfile', 1);
      }
      const response = await dispatch(ServiceActions.createProfile(formData));
      if (response?.payload?.status_code === 200) {
        setShowModal(true);
        // toast.success(response?.payload?.message);
      } else {
        toast.error(response?.payload?.message || "Failed to create profile");
      }
    } catch (error) {
      console.error("Error submitting Step 3 form:", error);
      throw error;
    }
  };

  const handleServiceSubmit = async (values) => {
    try {
      const formData = new FormData();
      Object.keys(values).forEach((key) => {
        if (key === "images") {
          values[key].forEach((file) => {
            if (file) formData.append("images", file);
          });
        } else if (key === "dayAvailability") {
          formData.append("dayAvailability", JSON.stringify(values[key]));
        } else if (values[key]) {
          formData.append(key, values[key]);
        }
      });

      const response = await dispatch(ServiceActions.createServices(formData));

      if (response?.payload?.status_code === 200) {
        // toast.success(response?.payload?.message);
        // toast.success("Success");
        // let tokenval = localStorage.getItem("temptoken");
        // localStorage.setItem("token", tokenval);
        // localStorage.setItem("role", 2);
        // localStorage.removeItem("temptoken");
        // navigate("/requests", { replace: true });
      } else {
        toast.error(response?.payload?.message || "Failed to create service");
      }
    } catch (error) {
      console.error("Error submitting Step 4 form:", error);
      toast.error("An error occurred during service submission");
      throw error;
    }
  };

  const handleStepChange = (index) => {
    console.log(
      `handleStepChange called with index: ${index}, currentStep: ${currentStep}`
    );
    if (index === currentStep) {
      return;
    }
    if (index < currentStep) {
      setCurrentStep(index);
      return;
    }
    if (index > currentStep) {
      console.log(
        `Attempted to navigate to further step: ${index}. Use Continue button instead.`
      );
      toast.info("Please use the Continue button to move to the next step.");
      return;
    }
  };

  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="community-list-contain provider-profile-tabs">
                <div className="community-list-show">
                  <ul>
                    {steps.map((step, index) => (
                      <li
                        key={index}
                        className={currentStep === index ? "active" : ""}
                        onClick={() => handleStepChange(index)}
                        style={{
                          cursor:
                            index > currentStep ? "not-allowed" : "pointer",
                        }}
                      >
                        <p>{step}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <ProviderForm
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  handleSubmit={handleSubmit}
                  handleServiceSubmit={handleServiceSubmit}
                  setValidateForm={setValidateForm}
                  isCorporate={isCorporate}
                  setShowModalCop={setShowModal}
                  showModalCop={showModal}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
