import { Modal } from "react-bootstrap";
import ButtonLoader from "../ButtonLoader";

const DeleteConfirmation = ({
    show,
    onHide,
    onConfirm,
    title,
    message,
    confirmText,
    isLoading = false,
}) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Body>
                <div className="comman-small-pop text-center">
                    <div className="center-icon mb-3">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="56"
                            height="56"
                            viewBox="0 0 56 56"
                            fill="none"
                        >
                            <path
                                d="M28 55.5C43.1878 55.5 55.5 43.1878 55.5 28C55.5 12.8122 43.1878 0.5 28 0.5C12.8122 0.5 0.5 12.8122 0.5 28C0.5 43.1878 12.8122 55.5 28 55.5Z"
                                fill="#C10C00"
                            />
                            <path
                                d="M30.9151 27.9993L37.7076 21.2068C38.072 20.8159 38.2703 20.2987 38.2609 19.7644C38.2514 19.2301 38.035 18.7203 37.6571 18.3424C37.2792 17.9645 36.7694 17.748 36.2351 17.7386C35.7007 17.7292 35.1836 17.9275 34.7926 18.2918L28.0001 25.0843L21.2076 18.2918C20.8167 17.9275 20.2995 17.7292 19.7652 17.7386C19.2309 17.748 18.7211 17.9645 18.3432 18.3424C17.9653 18.7203 17.7488 19.2301 17.7394 19.7644C17.73 20.2987 17.9283 20.8159 18.2926 21.2068L25.0851 27.9993L18.2926 34.7918C17.9064 35.1786 17.6895 35.7028 17.6895 36.2493C17.6895 36.7959 17.9064 37.3201 18.2926 37.7068C18.6794 38.0931 19.2036 38.31 19.7501 38.31C20.2967 38.31 20.8209 38.0931 21.2076 37.7068L28.0001 30.9143L34.7926 37.7068C35.1794 38.0931 35.7036 38.31 36.2501 38.31C36.7967 38.31 37.3209 38.0931 37.7076 37.7068C38.0939 37.3201 38.3108 36.7959 38.3108 36.2493C38.3108 35.7028 38.0939 35.1786 37.7076 34.7918L30.9151 27.9993Z"
                                fill="#EDEBEA"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-2">{title}</h3>
                    <p>{message}</p>
                    <div className="comman-pop-action-double mt-4">
                        <button className="btn-outline" onClick={onHide}>
                            Cancel
                        </button>
                        <button
                            className="btn-fill-danger"
                            onClick={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? <ButtonLoader /> : confirmText}
                        </button>

                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default DeleteConfirmation;