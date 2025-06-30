import React from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const RequestSentByUser = ({ isRequestModal, setIsRequestModal }) => {
  const navigate = useNavigate();
  const handleRoute = () => {
    toast.success("Request sent successfully");
    setIsRequestModal(false);
    navigate(`/bookings`);
  };
  return (
    <>
      <Modal
        show={isRequestModal}
        //   onHide={()=>setIsRequestModal(false)}
        centered
      >
        <Modal.Body>
          <div className="comman-small-pop">
            <h2>Request sent</h2>
            <p>Your booking request has been sent successfully</p>
            <div className="comman-pop-action">
              <button
                type="button"
                onClick={() => handleRoute()}
                className="btn-fill"
              >
                Track
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default RequestSentByUser;
