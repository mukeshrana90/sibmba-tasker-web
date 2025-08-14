import { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useDispatch, useSelector } from "react-redux";
import  ServiceActions  from "../../Redux/Actions/ServiceActions";

const SuggestCorporateModal = ({ show, onClose, onSave,customerData }) => {
  const [search, setSearch] = useState("");
  const [selectedCorps, setSelectedCorps] = useState([]); 
  const dispatch = useDispatch();
 const corporateSuggestions = useSelector(
    (state) => state.service.corporateSuggestions
  );
useEffect(() => {
  if (show && customerData) {
    const payload = {
      lat: customerData?.location?.coordinates?.[1], 
      lng: customerData?.location?.coordinates?.[0],
      category_id: customerData?.serviceCategory || customerData.category_id?._id,
      limit:1000,
      page:1
    };
    dispatch(ServiceActions.getNearbyCorporateUser(payload));
  }
}, [show, customerData, dispatch]);

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
          {filteredList.map((corp) => {const isSelected = selectedCorps.some((c) => c._id === corp._id);
          return (
            <div
              key={corp._id}
              className={`d-flex align-items-center p-2 mb-2 border rounded ${
                isSelected ? "border-success" : ""
              }`}
              style={{ cursor: "pointer" }}
            >
              {/* Checkbox */}
              <Form.Check
                type="checkbox"
                className="me-3"
                checked={isSelected}
                onChange={() => toggleSelect(corp)}
              />

              {/* Avatar */}
              {corp.profile_image ? (
                <img
                  src={`${process.env.REACT_APP_API_URL}/${corp.profile_image}`}
                  alt={corp.full_name}
                  className="rounded-circle me-3"
                  width={40}
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
          );})}
        </div>

        <div className="modal-footer-fixed px-4 pb-3 pt-2">
          <button
            className="btn btn-success mt-2"
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
