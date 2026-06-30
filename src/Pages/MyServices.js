import { useEffect, useRef, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import Loader from "../CommanComponents/Loader";
import ServiceActions from "../Redux/Actions/ServiceActions";
import {
  handleCategoryImageError,
  serviceImageUrl,
} from "../utils/landingUtils";

function PlaceholderThumbIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="empty">
      <svg
        width="54"
        height="54"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
      <h3>No services yet</h3>
      <p>Add your first service to start receiving bookings.</p>
    </div>
  );
}

function ServiceCard({ service, menuOpen, onToggleMenu, onEdit, onView, menuRef }) {
  const imageSrc = service.images?.length ? service.images[0] : null;

  return (
    <div className="scard">
      <button type="button" className="scard-main" onClick={onView}>
        <div className={`tthumb${imageSrc ? " tthumb--photo" : ""}`}>
          {imageSrc ? (
            <img
              src={serviceImageUrl(imageSrc)}
              alt={service.serviceSubCategoryName || "Service"}
              onError={handleCategoryImageError}
            />
          ) : (
            <PlaceholderThumbIcon />
          )}
        </div>
        <div className="tinfo">
          <h3>{service.serviceSubCategoryName || "N/A"}</h3>
          <div className="tsched">
            {service.serviceCategoryId?.service_category_name || "N/A"}
          </div>
          <div className="tdesc tdesc--wrap">
            {service.desc || "No description available."}
          </div>
        </div>
      </button>
      <div className="tside">
        <div className="scard-menu" ref={menuRef}>
          <button
            type="button"
            className="scard-menu-btn"
            aria-label="Service options"
            onClick={onToggleMenu}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
          {menuOpen && (
            <div className="scard-dropdown">
              <button type="button" onClick={onEdit}>
                Edit service
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyServices() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const dropdownRefs = useRef({});
  const { myservices, loading, error } = useSelector((state) => state.service);
  const [dropdownStates, setDropdownStates] = useState({});
  const [showProductPlanModal, setShowProductPlanModal] = useState(false);

  useEffect(() => {
    dispatch(ServiceActions.getMyServicesList());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      let shouldCloseAll = true;
      Object.values(dropdownRefs.current).forEach((ref) => {
        if (ref && ref.contains(event.target)) {
          shouldCloseAll = false;
        }
      });
      if (shouldCloseAll) {
        setDropdownStates({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddService = () => {
    const serviceLimit = JSON.parse(localStorage.getItem("ServiceLimit") || "null");

    if (
      serviceLimit?.isService_add === 1 &&
      serviceLimit?.isSubscribed === 0 &&
      location.pathname !== "/payment"
    ) {
      setShowProductPlanModal(true);
      return;
    }

    navigate("/service/add");
  };

  return (
    <CorporatePageShell
      title="My Services"
      crumbLabel="Services"
      pageClass="p-corporate-portal p-mytasks p-sp-services"
    >
      <div className="head-row">
        <p className="sp-page-lead">Manage the services you offer to customers.</p>
        <button type="button" className="btn btn-primary service-btn" onClick={handleAddService}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add service
        </button>
      </div>

      {loading ? (
        <div className="svc-loading">
          <Loader />
        </div>
      ) : error ? (
        <p className="svc-empty">{error}</p>
      ) : !myservices?.length ? (
        <EmptyState />
      ) : (
        <div className="svc-list">
          {myservices.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              menuOpen={!!dropdownStates[service._id]}
              menuRef={(el) => {
                dropdownRefs.current[service._id] = el;
              }}
              onToggleMenu={() =>
                setDropdownStates((prev) => ({
                  ...prev,
                  [service._id]: !prev[service._id],
                }))
              }
              onView={() => navigate(`/service-details/${service._id}`)}
              onEdit={() => navigate(`/service/edit?service_id=${service._id}`)}
            />
          ))}
        </div>
      )}

      <Modal
        show={showProductPlanModal}
        onHide={() => setShowProductPlanModal(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body>
          <div className="comman-small-pop text-center">
            <h2 className="mb-2">Limit reached</h2>
            <p className="mb-4">Please upgrade your plan to add more services.</p>
            <div className="comman-pop-action mt-4">
              <button
                type="button"
                className="btn-fill"
                onClick={() => navigate("/payment")}
              >
                Upgrade plan
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </CorporatePageShell>
  );
}
