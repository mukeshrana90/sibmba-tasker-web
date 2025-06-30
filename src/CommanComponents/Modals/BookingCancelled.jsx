import moment from "moment";
import React from "react";
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const BookingCancelled = ({ isRequestModal, setIsRequestModal, type, request }) => {
    const navigate = useNavigate();

    return (
        <>
            <Modal
                show={isRequestModal}
                onHide={() => setIsRequestModal(false)}
                centered
                dialogClassName="booking-confirmation-modal"
            >
                <Modal.Body>
                    <div className="text-center p-4">
                        {/* Checkmark icon */}
                        <div className="mb-3">
                            <svg width="61" height="60" viewBox="0 0 61 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0.5 31.7533C0.5 30.582 0.5 29.4092 0.5 28.2379C0.591161 27.4685 0.662894 26.6961 0.774976 25.9282C1.8151 18.7466 4.97285 12.6676 10.3424 7.77622C14.6493 3.853 19.696 1.40734 25.4496 0.449691C26.5435 0.267424 27.6479 0.147905 28.7463 0C29.918 0 31.0911 0 32.2627 0C32.4331 0.0343618 32.602 0.0866515 32.7738 0.0986034C35.7941 0.306268 38.7142 0.968106 41.5238 2.08711C55.8584 7.78818 63.48 23.121 59.4092 38.049C55.6013 52.0073 42.0453 61.3104 27.5896 59.8493C21.3593 59.2188 15.806 56.9196 11.0432 52.8335C5.58557 48.1498 2.21113 42.2501 0.963275 35.1566C0.764515 34.0301 0.652432 32.8872 0.5 31.7533ZM26.959 29.9799C26.7647 30.1846 26.6212 30.34 26.4718 30.4894C23.7938 33.1681 21.1128 35.8468 18.4362 38.527C18.2434 38.7198 18.0447 38.9125 17.8833 39.1306C16.8357 40.5439 17.556 42.5653 19.2597 43.0135C20.2968 43.2854 21.1277 42.9209 21.854 42.1933C24.5843 39.4548 27.3206 36.7223 30.054 33.9898C30.1989 33.8449 30.3543 33.7089 30.5382 33.5386C31.1733 34.1825 31.7591 34.7831 32.3524 35.3762C34.6434 37.671 36.9314 39.9673 39.2283 42.2531C40.3073 43.3272 41.7584 43.399 42.8015 42.4548C43.9089 41.4523 43.9044 39.8627 42.7641 38.7168C40.0233 35.9619 37.2706 33.2189 34.5223 30.4699C34.3744 30.322 34.2369 30.1637 34.0755 29.9904C34.2518 29.8066 34.3938 29.6512 34.5433 29.5018C37.2213 26.8231 39.9023 24.1444 42.5803 21.4642C42.7597 21.2849 42.942 21.1056 43.0959 20.9054C44.2033 19.4533 43.4725 17.402 41.6971 16.9658C40.7048 16.7222 39.9023 17.0644 39.2059 17.7621C36.4741 20.4991 33.7378 23.2316 31.0029 25.9641C30.843 26.1239 30.6757 26.2748 30.4425 26.4974C30.2482 26.2614 30.1123 26.0672 29.9479 25.9013C27.216 23.1643 24.4857 20.4258 21.7419 17.7023C20.6599 16.6281 19.1446 16.6117 18.1284 17.6246C17.1151 18.6346 17.1376 20.1495 18.2091 21.2356C19.7319 22.7789 21.2712 24.3042 22.806 25.8356C24.1704 27.1996 25.5393 28.5636 26.959 29.9799Z" fill="#C10C00" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h2 className="fw-bold mb-3" style={{ fontSize: "24px", color: "#333" }}>Booking Canceled !</h2>

                        {/* Message */}
                        <p className="mb-0" style={{ fontSize: "16px", lineHeight: "1.5", color: "#555" }}>
                            Dear <span><b>{request?.serviceProvider?.full_name || "Service provider"}</b></span> you have successfully
                            <br />
                            canceled the booking request of <span><b>{request?.serviceSubCategory?.serviceSubCategoryName}</b></span>
                            <br />
                            on Date <span><b>{`${moment(request?.date).format("DD MMM")} at ${request?.slotTime[0]}`}</b></span>. Customer will be notified.
                        </p>
                    </div>

                    <div className="cancel mt-3">
                        <button type="button" onClick={() => navigate("/requests")} className="btn-fill">
                            View all request
                        </button>
                    </div>
                </Modal.Body>
            </Modal>

            <style jsx>{`
        .booking-confirmation-modal .modal-content {
          border: none;
          border-radius: 12px;
          padding: 20px;
        }
        .booking-confirmation-modal .modal-body {
          padding: 0;
        }
      `}</style>
        </>
    );
};

export default BookingCancelled;
