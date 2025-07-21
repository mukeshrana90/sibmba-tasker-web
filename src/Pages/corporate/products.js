import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../Components/Layout/Layout";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";

const CorporateProductPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "3") {
      toast.error("Unauthorized access.");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Static placeholder product data
  const products = [
    {
      id: 1,
      name: "Kwikot 150L Geyser",
      category: "Plumbing",
      stock: 10,
      price: 450.0,
    },
    {
      id: 2,
      name: "22mm Gate Valve",
      category: "Fittings",
      stock: 25,
      price: 15.5,
    },
    {
      id: 3,
      name: "Copper Pipe 22mm (per meter)",
      category: "Piping",
      stock: 50,
      price: 8.0,
    },
  ];

  return (
    <Layout>
      <section className="search-results-sec py-8">
        <Container>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h4 fw-semibold mb-0">Product Listings</h1>
            <Button variant="primary" onClick={() => toast.info("Coming soon!")}>
              Add New Product
            </Button>
          </div>

          <Table bordered hover responsive>
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price (USD)</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product, idx) => (
                  <tr key={product.id}>
                    <td>{idx + 1}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{product.stock}</td>
                    <td>${product.price.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-3">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Container>
      </section>
    </Layout>
  );
};

export default CorporateProductPage;
