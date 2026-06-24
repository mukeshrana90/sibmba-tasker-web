import { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import ServiceActions from "../../Redux/Actions/ServiceActions";
import {
  handleUserImageError,
  userImageUrl,
} from "../../utils/landingUtils";
import { resolveCoordsForCorporateSearch } from "../../utils/landingGeocode";

function resolveCategoryId(customerData) {
  return (
    customerData?.category_id?._id ??
    customerData?.category_id ??
    customerData?.serviceCategory ??
    undefined
  );
}

const SuggestCorporateModal = ({
  show,
  onClose,
  onSave,
  customerData,
  fallbackCoords = null,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCorps, setSelectedCorps] = useState([]);
  const [loadingCorporates, setLoadingCorporates] = useState(false);
  const dispatch = useDispatch();
  const corporateSuggestions = useSelector(
    (state) => state.service.corporateSuggestions
  );

  useEffect(() => {
    if (!show || !customerData) return undefined;

    let cancelled = false;

    const loadCorporates = async () => {
      setLoadingCorporates(true);

      const coords = await resolveCoordsForCorporateSearch(
        customerData,
        fallbackCoords
      );

      if (cancelled) return;

      if (!coords?.lat || !coords?.lng) {
        setLoadingCorporates(false);
        toast.error(
          "Could not determine a location for this task. Add a valid task address or allow location access."
        );
        return;
      }

      try {
        await dispatch(
          ServiceActions.getNearbyCorporateUser({
            lat: coords.lat,
            lng: coords.lng,
            category_id: resolveCategoryId(customerData),
            limit: 1000,
            page: 1,
          })
        ).unwrap();
      } catch {
        // Api interceptor already surfaces the error toast.
      } finally {
        if (!cancelled) setLoadingCorporates(false);
      }
    };

    loadCorporates();

    return () => {
      cancelled = true;
    };
  }, [show, customerData, fallbackCoords, dispatch]);

  const filteredList = (corporateSuggestions || []).filter((item) =>
    (item.full_name + " " + item.shop_name)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const toggleSelect = (corp) => {
    setSelectedCorps((prev) => {
      const exists = prev.find((x) => x._id === corp._id);
      if (exists) {
        return prev.filter((x) => x._id !== corp._id);
      }
      return [...prev, corp];
    });
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      size="lg"
      className="suggest_Corporate_model"
    >
      <Modal.Body className="p-0 d-flex flex-column">
        <div className="suggest_Corporate_search">
          <div className="modal-header-fixed">
            <h5 className="mb-0">Suggest Corporate</h5>
          </div>
          <div className="modal-search-fixed">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <img
                  src={require("../../Assets/Images/search-icon.svg").default}
                  alt="Search"
                  width="16"
                  height="16"
                />
              </span>
              <Form.Control
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-start-0"
              />
            </div>
          </div>
        </div>

        <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
          {loadingCorporates ? (
            <div className="text-center text-muted py-4">Loading corporates…</div>
          ) : filteredList.length === 0 ? (
            <div className="text-center text-muted py-4">
              No nearby corporates found for this task location.
            </div>
          ) : (
            filteredList.map((corp) => {
              const isSelected = selectedCorps.some((c) => c._id === corp._id);
              return (
                <div
                  key={corp._id}
                  className={`d-flex align-items-center p-2 mb-2 border rounded ${
                    isSelected ? "corp-suggest-selected" : ""
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <Form.Check
                    type="checkbox"
                    className="me-3"
                    checked={isSelected}
                    onChange={() => toggleSelect(corp)}
                  />

                  {corp.profile_image ? (
                    <img
                      src={userImageUrl(corp)}
                      alt={corp.full_name}
                      className="rounded-circle me-3"
                      width={40}
                      onError={handleUserImageError}
                      height={40}
                    />
                  ) : (
                    <div
                      className="rounded-circle me-3 bg-secondary text-white d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, fontWeight: "bold" }}
                    >
                      {corp.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}

                  <div>
                    <div className="fw-bold">{corp?.full_name}</div>
                    <div className="text-muted small">{corp?.shop_name}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="modal-footer-fixed px-4 pb-3 pt-2">
          <button
            className="btn btn-primary mt-2"
            disabled={selectedCorps.length === 0}
            onClick={() => {
              onSave(selectedCorps);
              onClose();
            }}
          >
            Save Corporates
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SuggestCorporateModal;
