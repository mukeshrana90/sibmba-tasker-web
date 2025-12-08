import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import ButtonLoader from "../ButtonLoader";

const OtpSelectionModal = ({
  show,
  onHide,
  phoneNumber,
  email,
  onSelect,
  isLoading = false,
}) => {
  const [selectedType, setSelectedType] = useState(null);

  const handleNext = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
    >
      <Modal.Header className="border-none pb-0 position-relative" closeButton={false}>
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
          aria-label="Close"
          style={{
            position: "absolute",
            right: "16px",
            top: "16px",
            zIndex: 1,
            opacity: 1,
          }}
        ></button>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="otp-selection-modal">
          <h2 className="mb-2">Receive OTP</h2>
          <p className="mb-4 text-muted">How would you like to receive OTP?</p>

          <div className="otp-options-container mb-4">
            {/* Phone Number Option */}
            <div
              className={`otp-option-card ${
                selectedType === 3 ? "selected" : ""
              }`}
              onClick={() => setSelectedType(3)}
              style={{
                cursor: "pointer",
                padding: "16px",
                border: `2px solid ${selectedType === 3 ? "#10B981" : "#e5e7eb"}`,
                borderRadius: "12px",
                marginBottom: "16px",
                backgroundColor: selectedType === 3 ? "#f0fdf4" : "#ffffff",
                transition: "all 0.3s ease",
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="me-3"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-grow-1">
                  <h5 className="mb-1" style={{ fontWeight: "600", color: "#111827" }}>
                    Phone Number
                  </h5>
                  <p className="mb-1 text-muted" style={{ fontSize: "14px" }}>
                    An OTP will be sent on WhatsApp
                  </p>
                  {phoneNumber && (
                    <p
                      className="mb-0"
                      style={{ color: "#10B981", fontWeight: "500", fontSize: "14px" }}
                    >
                      {phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Email Option */}
            <div
              className={`otp-option-card ${
                selectedType === 1 ? "selected" : ""
              }`}
              onClick={() => setSelectedType(1)}
              style={{
                cursor: "pointer",
                padding: "16px",
                border: `2px solid ${selectedType === 1 ? "#10B981" : "#e5e7eb"}`,
                borderRadius: "12px",
                backgroundColor: selectedType === 1 ? "#f0fdf4" : "#ffffff",
                transition: "all 0.3s ease",
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="me-3"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-grow-1">
                  <h5 className="mb-1" style={{ fontWeight: "600", color: "#111827" }}>
                    Email
                  </h5>
                  <p className="mb-1 text-muted" style={{ fontSize: "14px" }}>
                    An OTP will be sent on your email
                  </p>
                  {email && (
                    <p
                      className="mb-0"
                      style={{ color: "#10B981", fontWeight: "500", fontSize: "14px" }}
                    >
                      {email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-success w-100"
            onClick={handleNext}
            disabled={!selectedType || isLoading}
            style={{
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "600",
              backgroundColor: "#10B981",
              border: "none",
            }}
          >
            {isLoading ? <ButtonLoader /> : "Next"}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default OtpSelectionModal;
