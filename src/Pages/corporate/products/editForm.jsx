import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../Components/Layout/Layout";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

const CorporateEditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "",
    price: "",
  });

  useEffect(() => {
    // Simulate fetch product by ID
    // Replace with API call
    const product = {
      id,
      name: "22mm Gate Valve",
      category: "Fittings",
      stock: 25,
      price: 15.5,
    };
    setForm(product);
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitting updated product:", form);
    // Call API to update product
    navigate("/corporate/products");
  };

  return (
    <Layout>
      <section className="search-results-sec py-8">
        <Container>
          <h3 className="mb-4">Edit Product</h3>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Control
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Stock</Form.Label>
              <Form.Control
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price (USD)</Form.Label>
              <Form.Control
                type="number"
                name="price"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </Form>
        </Container>
      </section>
    </Layout>
  );
};

export default CorporateEditProduct;
