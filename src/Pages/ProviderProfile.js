import { useState } from "react";
import Layout from "../Components/Layout/Layout";
import ProviderForm from "../CommanComponents/ProviderForm";
import ServiceActions from "../Redux/Actions/ServiceActions";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { useQuery } from "../utils/CommonFunction";
import { isCorporateRole, Roles } from "../utils/Roles";

const SETUP_COPY = {
  [Roles.SERVICE_PROVIDER]: {
    title: "Complete your provider profile",
    sub: "Tell us about your business so customers can find and book you.",
  },
  [Roles.CORPORATE]: {
    title: "Complete your business profile",
    sub: "Set up your corporate account to start receiving leads.",
  },
};

export default function ProviderProfile() {
  const [currentStep, setCurrentStep] = useState(0);
  const dispatch = useDispatch();
  const query = useQuery();
  const roleNumber = Number(
    query.get("role") ?? localStorage.getItem("role")
  );
  const isCorporate = isCorporateRole(roleNumber);
  const [showModal, setShowModal] = useState(false);
  const copy =
    SETUP_COPY[isCorporate ? Roles.CORPORATE : Roles.SERVICE_PROVIDER];

  const steps = [
    "Some basic info",
    isCorporate ? "Business Information" : "Company details",
    ...(!isCorporate ? ["Reference details"] : []),
    "Document Verification",
    ...(!isCorporate ? ["Your service"] : []),
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
          if (key === "reference_skip" || key === "document_skip") {
            if (values[key] === true) {
              formData.append(key, true);
            }
          } else {
            formData.append(key, values[key]);
          }
        }
      });
      if (isCorporate && currentStep === 3) {
        formData.append("is_completeProfile", 1);
      }
      const response = await dispatch(ServiceActions.createProfile(formData));
      if (response?.payload?.status_code === 200) {
        setShowModal(true);
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
        // success handled by modal flow
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
    if (index === currentStep) {
      return;
    }
    if (index < currentStep) {
      setCurrentStep(index);
      return;
    }
    if (index > currentStep) {
      toast.info("Please use the Continue button to move to the next step.");
    }
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-provider-setup">
        <main className="page">
          <div className="wrap">
            <div className="setup-head">
              <h1>{copy.title}</h1>
              <p>{copy.sub}</p>
              <div className="setup-progress">
                <span>
                  Step {currentStep + 1} of {steps.length}
                </span>
                <div className="setup-progress-bar">
                  <div
                    className="setup-progress-fill"
                    style={{
                      width: `${((currentStep + 1) / steps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="setup-shell">
              <aside className="setup-steps" aria-label="Profile setup steps">
                {steps.map((step, index) => {
                  const isActive = currentStep === index;
                  const isDone = index < currentStep;
                  const isLocked = index > currentStep;

                  return (
                    <button
                      key={step}
                      type="button"
                      className={`setup-step${isActive ? " active" : ""}${
                        isDone ? " done" : ""
                      }${isLocked ? " disabled" : ""}`}
                      onClick={() => handleStepChange(index)}
                      disabled={isLocked}
                    >
                      <span className="step-num">
                        {isDone ? "✓" : index + 1}
                      </span>
                      <span className="step-label">{step}</span>
                    </button>
                  );
                })}
              </aside>

              <div className="setup-form-card">
                <ProviderForm
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  handleSubmit={handleSubmit}
                  handleServiceSubmit={handleServiceSubmit}
                  isCorporate={isCorporate}
                  setShowModalCop={setShowModal}
                  showModalCop={showModal}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
