import { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Tab, Nav, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CorporatePageShell from "../../../CommanComponents/CorporatePageShell";
import ProductActions, {
  removeProduct,
} from "../../../Redux/Actions/ProductActions";
import { toast } from "react-toastify";
import * as bootstrap from "bootstrap";
import {
  handleCategoryImageError,
  productImageUrl,
} from "../../../utils/landingUtils";

export default function CorporateProducts() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dropdownRefs = useRef({});
  const [dropdownStates, setDropdownStates] = useState({});
  const { items: myProducts,  loading, error} = useSelector((state) => state?.products);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const ServiceLimit = localStorage.getItem("ServiceLimit");
  const [showProductPlanModal, setShowProductPlanModal] = useState("");

  useEffect(() => {
    dispatch(ProductActions.fetchProducts());
  }, [dispatch]);
    const handleProviderClick = (prodId) => {
      navigate(`/corporate/products/details/${prodId}`);
    };

  const handleAddService = () => {
    const isServiceLimitReached = ServiceLimit?.isService_add === 1 && ServiceLimit?.isSubscribed === 0;
    if (isServiceLimitReached) {
      setShowProductPlanModal(true);
    } else {
      navigate("/corporate/products/add");
    }
  };

  const handleButtonClick = (id) => {
    setDropdownStates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      let shouldCloseAll = true;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(event.target)) {
          shouldCloseAll = false;
        }
      });
      if (shouldCloseAll) {
        setDropdownStates((prev) => {
          let newStates = { ...prev };
          Object.keys(newStates).forEach((key) => {
            newStates[key] = false;
          });
          return newStates;
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRemoveProduct = (prodId) => {
    setDeleteProductId(prodId);
    const modal = new bootstrap.Modal(
      document.getElementById("deleteConfirmModal")
    );
    modal.show();
  };
  const handleConfirmDelete = () => {
    if (!deleteProductId) return;

    dispatch(removeProduct(deleteProductId))
      .unwrap()
      .then(() => {
        toast.success("Product deleted successfully");
        setDeleteProductId(null);
        dispatch(ProductActions.fetchProducts());
      })
      .catch((err) => {
        toast.error("Failed to delete product");
      });
  };
  return (
    <>
    <CorporatePageShell title="Products" crumbLabel="Products">
              <div className="search-results-contain">
                <div className="corp-portal-toolbar">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddService}
                  >
                    + Add Product
                  </button>
                </div>

                <div className="bookings-tabs">
                  <Tab.Container
                    id="left-tabs-example"
                    defaultActiveKey="first"
                  >
                    <Row>
                      <Col sm={12}>
                        <Tab.Content>
                          <Tab.Pane eventKey="first">
                            {error && <p className="text-danger">{error}</p>}
                            {!loading && !error && myProducts?.length === 0 && (
                              <div className="no-upcoming-bookings">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="80"
                                  height="80"
                                  viewBox="0 0 80 80"
                                  fill="none"
                                >
                                  <path
                                    d="M80 37.4898C80 39.1586 80 40.8215 80 42.4903C79.7966 43.9258 79.6351 45.3733 79.3957 46.8029C76.6437 63.2041 63.3082 76.5666 46.8855 79.3839C45.4317 79.6351 43.96 79.7966 42.4942 80C40.825 80 39.1618 80 37.4926 80C37.2414 79.9521 36.9901 79.8923 36.7388 79.8564C35.3448 79.665 33.9449 79.5454 32.5629 79.2882C26.0178 78.0441 20.1188 75.3524 14.9916 71.1175C5.49098 63.2639 0.35779 53.1791 0.0167742 40.8274C-0.252449 31.2033 2.72097 22.5481 8.79943 15.0832C16.6966 5.39328 26.963 0.279139 39.4969 0.00997335C47.6633 -0.16947 55.2016 2.07358 61.968 6.65537C71.4327 13.0615 77.2958 21.9021 79.3838 33.1772C79.653 34.6007 79.7966 36.0483 80 37.4898ZM16.9958 66.4699C31.6355 79.4916 54.1845 78.1637 67.2149 62.3427C79.7846 47.084 76.3685 27.4529 66.4132 17.0511C49.9547 33.5121 33.4962 49.9731 16.9958 66.4699ZM63.0748 13.5879C48.6265 0.727748 26.6699 1.79245 13.5258 16.7341C0.423601 31.6339 3.02609 51.7615 13.6455 63.0366C15.189 61.4874 16.7086 59.9262 18.2761 58.401C18.7188 57.9703 18.9043 57.5396 18.9043 56.9116C18.8863 45.17 18.8923 33.4224 18.8923 21.6808C18.8923 19.7907 19.7778 18.8934 21.6444 18.8934C26.6938 18.8934 31.7492 18.8934 36.7986 18.8934C37.0739 18.8934 37.3431 18.8934 37.6422 18.8934C37.6422 22.0397 37.6362 25.0543 37.6422 28.075C37.6482 29.5404 38.6054 30.5872 39.9456 30.6111C41.3156 30.635 42.3207 29.5763 42.3267 28.075C42.3387 25.473 42.3267 22.8651 42.3267 20.2632C42.3267 19.8265 42.3267 19.3899 42.3267 18.8875C42.6857 18.8875 42.9669 18.8875 43.248 18.8875C47.8548 18.8875 52.4674 18.8934 57.0742 18.8815C57.3673 18.8815 57.7562 18.8575 57.9357 18.6841C59.6587 17.0212 61.3398 15.3225 63.0748 13.5879Z"
                                    fill="#CCCCCC"
                                  />
                                  <path
                                    d="M29.0929 61.0866C39.7721 50.4097 50.4213 39.7568 61.0886 29.0918C61.0886 29.2892 61.0886 29.5404 61.0886 29.7916C61.0886 39.2962 61.0886 48.8007 61.0886 58.3053C61.0886 60.1894 60.1971 61.0866 58.3245 61.0866C48.794 61.0866 39.2635 61.0866 29.733 61.0866C29.4997 61.0866 29.2724 61.0866 29.0929 61.0866Z"
                                    fill="#CCCCCC"
                                  />
                                </svg>
                                <h3>No Product Found</h3>
                                <p>Currently you don’t have any Products.</p>
                              </div>
                            )}
                            {!loading && myProducts?.length > 0 && (
                              <div className="bookings-cards">
                                <ul className="list-unstyled">
                                  {myProducts?.map((item) => (
                                    <li key={item._id}>
                                      <div className="bookings-card-item">
                                        <img
                                          src={
                                            item?.images?.length
                                              ? productImageUrl(item?.images[0])
                                              : ""
                                          }
                                          alt={""}
                                          onError={handleCategoryImageError}
                                          onClick={() =>
                                            handleProviderClick(item?._id)
                                          }
                                          style={{
                                            cursor: "pointer",
                                            maxWidth: "200px",
                                          }}
                                        />
                                        <div className="bookings-card-data my-task-ad-card">
                                          <div>
                                            <h3 className="text-capitalize">
                                              {item?.name || "-"}
                                            </h3>
                                            
                                            <span>
                                              {item?.description ||
                                                "No description available."}
                                            </span>
                                            {item?.category && (
                                              <>
                                              <h6 className="mb-1 mt-3">Category Details</h6>
                                                <span>
                                                  Name: {item.category.name || "-"}
                                                </span>
                                                <span>
                                                  Description:
                                                  {item.category.description || "No description available."}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          <div
                                            className="chat-btn-card"
                                            style={{ position: "relative" }}
                                            ref={(el) =>
                                              (dropdownRefs.current[item._id] =
                                                el)
                                            }
                                          >
                                            <button
                                              className="btn"
                                              onClick={() =>
                                                handleButtonClick(item?._id)
                                              }
                                            >
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="32"
                                                height="35"
                                                viewBox="0 0 32 35"
                                                fill="none"
                                              >
                                                <path
                                                  d="M16.0001 11.084C16.8838 11.084 17.6001 10.3005 17.6001 9.33398C17.6001 8.36749 16.8838 7.58398 16.0001 7.58398C15.1165 7.58398 14.4001 8.36749 14.4001 9.33398C14.4001 10.3005 15.1165 11.084 16.0001 11.084Z"
                                                  fill="#545454"
                                                />
                                                <path
                                                  d="M16.0001 19.25C16.8838 19.25 17.6001 18.4665 17.6001 17.5C17.6001 16.5335 16.8838 15.75 16.0001 15.75C15.1165 15.75 14.4001 16.5335 14.4001 17.5C14.4001 18.4665 15.1165 19.25 16.0001 19.25Z"
                                                  fill="#545454"
                                                />
                                                <path
                                                  d="M16.0001 27.418C16.8838 27.418 17.6001 26.6345 17.6001 25.668C17.6001 24.7015 16.8838 23.918 16.0001 23.918C15.1165 23.918 14.4001 24.7015 14.4001 25.668C14.4001 26.6345 15.1165 27.418 16.0001 27.418Z"
                                                  fill="#545454"
                                                />
                                              </svg>
                                            </button>
                                            {dropdownStates[item._id] && (
                                              <div
                                                style={{
                                                  position: "absolute",
                                                  top: "100%",
                                                  left: "-50",
                                                  background: "#fff",
                                                  border: "1px solid #ccc",
                                                  borderRadius: "5px",
                                                  boxShadow:
                                                    "0 2px 5px rgba(0,0,0,0.2)",
                                                  padding: "5px 0",
                                                  zIndex: 10,
                                                  maxWidth: "200px",
                                                }}
                                              >
                                                <button
                                                  style={{
                                                    display: "block",
                                                    width: "100%",
                                                    padding: "5px 10px",
                                                    textAlign: "left",
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                  }}
                                                  onClick={() =>
                                                    navigate(
                                                      `/corporate/products/edit/${item._id}`
                                                    )
                                                  }
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  style={{
                                                    display: "block",
                                                    width: "100%",
                                                    padding: "5px 10px",
                                                    textAlign: "left",
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                  }}
                                                  onClick={() =>
                                                    handleRemoveProduct(
                                                      item._id
                                                    )
                                                  }
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </Tab.Pane>
                        </Tab.Content>
                      </Col>
                    </Row>
                  </Tab.Container>
                </div>
              </div>
    </CorporatePageShell>
      <div
        className="modal fade deleteConfirmModal"
        id="deleteConfirmModal"
        tabIndex="-1"
        aria-labelledby="deleteConfirmModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="deleteConfirmModalLabel">
                Confirm Deletion
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              Are you sure you want to delete this product?
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-default btn-sm action-btn"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm text-white action-btn "
                onClick={handleConfirmDelete}
                data-bs-dismiss="modal"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Plan Limit Modal */}
    <Modal
      show={showProductPlanModal}
      onHide={() => setShowProductPlanModal(false)}
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Body>
        <div className="comman-small-pop">
          <h2 className="mb-2">Limit Reached</h2>
          <div className="download-app-section">
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="app-store-buttons mb-0">
                Please upgrade your plan to add more services
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="comman-pop-action-double mt-4 d-flex">
              <button
                className="btn-fill"
                onClick={() => navigate("/payment")}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
    </>
  );
}
