import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import ButtonLoader from "../ButtonLoader";

const ROLE_OPTIONS = [
  {
    key: 1,
    title: "I Need a Service",
    hint: "Find & hire trusted professionals near you.",
  },
  {
    key: 2,
    title: "Service Provider",
    hint: "Offer your services and grow your business.",
  },
  {
    key: 3,
    title: "Corporate",
    hint: "Enterprise solutions for your organization.",
  },
];

export default function RoleSelectModal({
  show,
  onHide,
  onSelect,
  isLoading = false,
}) {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleNext = () => {
    if (selectedRole) {
      onSelect(selectedRole);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
      className="otp-selection-modal-wrap"
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
          <h2 className="mb-2">Choose account type</h2>
          <p className="mb-4 text-muted">
            You don&apos;t have an account yet. Select the type of account you
            want to create.
          </p>

          <div className="otp-options-container mb-4">
            {ROLE_OPTIONS.map((opt) => (
              <div
                key={opt.key}
                className={`otp-option-card ${
                  selectedRole === opt.key ? "selected" : ""
                }`}
                onClick={() => setSelectedRole(opt.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedRole(opt.key);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex-grow-1">
                  <h5 className="otp-option-card__title mb-1">{opt.title}</h5>
                  <p className="mb-0 text-muted otp-option-card__hint">
                    {opt.hint}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary w-100 otp-selection-modal__next"
            onClick={handleNext}
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? <ButtonLoader /> : "Continue"}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
