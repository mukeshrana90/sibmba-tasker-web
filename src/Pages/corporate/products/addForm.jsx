import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../../Components/Layout/Layout";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { toast } from "react-toastify";
import { Formik, Field } from "formik";
import * as Yup from "yup";

const CorporateAddProduct = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState(Array(6).fill(null));

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const validationSchema = Yup.object().shape({
    category: Yup.string().required("Category is required"),
    name: Yup.string().trim().required("Product name is required"),
    price: Yup.number().required("Price is required").positive("Price must be positive"),
    description: Yup.string().trim().required("Description is required"),
  });

  const handleImageChange = (e, index) => {
    const files = [...images];
    files[index] = e.target.files[0];
    setImages(files);
  };

  const handleSubmit = (values) => {
    const uploaded = images.filter((img) => img !== null);
    if (uploaded.length === 0) {
      toast.error("Please upload at least one product image");
      return;
    }

    // Simulate saving
    console.log({ ...values, images: uploaded });
    toast.success("Product added successfully.");
    navigate("/corporate/products");
  };

  return (
    <Layout>
      <section className="search-results-sec py-8">
        <Container style={{ maxWidth: "500px" }}>
          <h4 className="fw-semibold mb-4">Add Product</h4>

          <Formik
            initialValues={{
              category: "",
              name: "",
              price: "",
              description: "",
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ handleSubmit, handleChange, values, errors, touched }) => (
              <Form noValidate onSubmit={handleSubmit}>
                {/* Image Upload */}
                <Form.Group className="mb-4">
                  <Form.Label>Upload Images</Form.Label>
                  <Row xs={3} className="g-2">
                    {images.map((img, idx) => (
                      <Col key={idx}>
                        <Card className="text-center" style={{ height: "70px", background: "#f5f5f5" }}>
                          <Form.Label className="h-100 d-flex justify-content-center align-items-center m-0 cursor-pointer">
                            {img ? (
                              <span className="text-success fw-bold">✔</span>
                            ) : (
                              <span style={{ fontSize: "24px", color: "#ccc" }}>＋</span>
                            )}
                            <Form.Control
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={(e) => handleImageChange(e, idx)}
                            />
                          </Form.Label>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Form.Group>

                {/* Category */}
                <Form.Group className="mb-3">
                  <Form.Select
                    name="category"
                    value={values.category}
                    onChange={handleChange}
                    isInvalid={touched.category && errors.category}
                  >
                    <option value="">Select Service Category</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Fittings">Fittings</option>
                    <option value="Piping">Piping</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.category}
                  </Form.Control.Feedback>
                </Form.Group>

                {/* Product Name */}
                <Form.Group className="mb-3">
                  <Form.Control
                    name="name"
                    placeholder="Product Name"
                    value={values.name}
                    onChange={handleChange}
                    isInvalid={touched.name && errors.name}
                  />
                  <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                </Form.Group>

                {/* Price */}
                <Form.Group className="mb-3">
                  <Form.Control
                    type="number"
                    name="price"
                    placeholder="Price"
                    value={values.price}
                    onChange={handleChange}
                    isInvalid={touched.price && errors.price}
                  />
                  <Form.Control.Feedback type="invalid">{errors.price}</Form.Control.Feedback>
                </Form.Group>

                {/* Description */}
                <Form.Group className="mb-4">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    placeholder="Type here..."
                    value={values.description}
                    onChange={handleChange}
                    isInvalid={touched.description && errors.description}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.description}
                  </Form.Control.Feedback>
                </Form.Group>

                <Button type="submit" className="w-100" variant="primary">
                  Save Product
                </Button>
              </Form>
            )}
          </Formik>
        </Container>
      </section>
    </Layout>
  );
};

export default CorporateAddProduct;
