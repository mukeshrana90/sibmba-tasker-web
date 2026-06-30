import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { toast } from "react-toastify";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import SuggestCorporateModal from "./SuggestCorporateModal";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { useDispatch } from "react-redux";
import {
  handleUserImageError,
  userImageUrl,
} from "../../utils/landingUtils";

// Validation schema using Yup
const validationSchema = Yup.object({
  price: Yup.number()
    .required("Price is required")
    .positive("Price must be positive")
    .min(0.01, "Price must be at least 0.01")
    .test("maxDigits", "Price must have at most 2 decimal places", (value) =>
      /^\d+(\.\d{1,2})?$/.test(value)
    ),
  description: Yup.string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description cannot exceed 500 characters"),
});
const AddQuotationModal = ({
  show,
  handleClose,
  task,
  onSubmit,
  quatation,
  fallbackCoords = null,
}) => {
  const isEdit = !!quatation;
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [selectedCorporate, setSelectedCorporate] = useState([]);
  const dispatch = useDispatch();

  const initialValues = useMemo(
    () => ({
      price: quatation?.offer_price || "",
      description: quatation?.description || "",
    }),
    [quatation?.offer_price, quatation?.description]
  );

  useEffect(() => {
    if (!show) {
      setSelectedCorporate([]);
    } else if (
      Array.isArray(quatation?.corporateSuggestion) &&
      quatation.corporateSuggestion.length > 0
    ) {
      const firstCorporate = quatation.corporateSuggestion.find(
        (corp) => !!corp._id
      );
      setSelectedCorporate(firstCorporate?.corporateIds);
    }
  }, [show, quatation]);

  const handleSubmit = (values, { resetForm }) => {
    const payload = {
      offer_price: values.price,
      description: values.description,
      task_id: task?._id,
      ...(isEdit && { quatation_id: quatation._id }),
    };
    if (selectedCorporate && !isEdit) {
      dispatch(
        CustomerActions.createCorporateSuggestionsForTask({
          taskId: task?._id,
          corporateIds: selectedCorporate.map(corp => corp._id), 
        })
      )
        .unwrap()
        .then(() => {
          onSubmit(payload);
          resetForm();
          handleClose();
        })
        .catch((err) => {
          toast.error(err,"Failed to suggest corporate");
        });
    } else {
      onSubmit(payload);
      resetForm();
      handleClose();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Body>
        <div className="comman-small-pop">
          <h3>{isEdit ? "Edit Quotation" : "Add Quotation"}</h3>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ handleSubmit }) => (
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="offerPrice" className="mb-3">
                  <Form.Label>Offer a Price</Form.Label>
                  <Field
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="Enter here..."
                    className="form-control"
                  />
                  <ErrorMessage
                    name="price"
                    component="div"
                    className="text-danger"
                  />
                </Form.Group>
                <Form.Group controlId="description">
                  <Form.Label>Description</Form.Label>
                  <Field
                    name="description"
                    as="textarea"
                    rows={3}
                    placeholder="Type here..."
                    className="form-control"
                  />
                  <ErrorMessage
                    name="description"
                    component="div"
                    className="text-danger"
                  />
                </Form.Group>
                {/* Show profile OR Add Corporate button */}
                {selectedCorporate?.length > 0 ? (
                  <>
                    <div className="d-block">
                      <Form.Label className="mt-2">
                        Suggested Corporates
                      </Form.Label>
                    </div>

                  {selectedCorporate.map((corp, index) => (
                    <div
                      key={corp._id || index}
                      className="selected-corporate p-2 border rounded d-flex justify-content-between align-items-center mb-2"
                    >
                      <div className="d-flex align-items-center">
                      {corp.profile_image ? (
                        <img
                          src={userImageUrl(corp)}
                          alt={corp.full_name}
                          width={40}
                          height={40}
                          onError={handleUserImageError}
                          className="rounded-circle me-2"
                        />
                      ) : (
                        <div
                          className="rounded-circle me-2 bg-secondary text-white d-flex align-items-center justify-content-center"
                          style={{
                            width: 40,
                            height: 40,
                            fontWeight: "bold",
                          }}
                        >
                          {corp.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <div className="fw-bold">{corp.full_name}</div>
                        <div className="text-muted small">
                          {corp.shop_name}
                          </div>
                        </div>
                      </div>
                    {!isEdit && (
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() =>
                          setSelectedCorporate((prev) =>
                            prev.filter((c) => c._id !== corp._id)
                          )
                        }
                      />
                    )}
                    </div>
                  ))}
                  </>
                ) : (
                  !isEdit && (
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      className="quotation-btn text-success"
                      onClick={() => setShowSuggestModal(true)}
                    >
                      <span className="icon">+</span>
                      Add Corporate
                    </button>
                  </div>
                )
                )}

                {/* Suggest Modal */}
                <SuggestCorporateModal
                  show={showSuggestModal}
                  onClose={() => setShowSuggestModal(false)}
                  onSave={(corp) => {
                    setSelectedCorporate(corp);
                    setShowSuggestModal(false);
                  }}
                  customerData={task}
                  fallbackCoords={fallbackCoords}
                />

                <div className="quotation-requestss mt-3">
                  <button type="submit" className="btn-fill">
                    {isEdit ? "Update" : "Send"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default AddQuotationModal;
