import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { toast } from "react-toastify";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

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

const AddQuotationModal = ({ show, handleClose, task, onSubmit, quatation }) => {
  const isEdit = !!quatation;

  // Initial form values
  const initialValues = {
    price: quatation?.offer_price || "",
    description: quatation?.description || "",
  };

  useEffect(() => {
    // Reset form when modal is opened/closed or quotation changes
    if (!show) {
      initialValues.price = "";
      initialValues.description = "";
    }
  }, [show, quatation]);

  const handleSubmit = (values, { resetForm }) => {
    const payload = {
      offer_price: values.price,
      description: values.description,
      task_id: task?._id,
      ...(isEdit && { quatation_id: quatation._id }),
    };

    onSubmit(payload);
    resetForm();
    handleClose();
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