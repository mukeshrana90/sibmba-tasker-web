import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Layout from "../Components/Layout/Layout";
import { Col, Container, Row, Table } from "react-bootstrap";
import Loader from "../CommanComponents/Loader";
import defaultImage from "../Assets/Images/placeholder.jpg";

export default function ProductHistorypservice() {
  const dispatch = useDispatch();

  const [purchaseProducts, setPurchaseProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resultAction = await dispatch(
          CustomerActions.getPurchaseProducts()
        ).unwrap();
        const response = resultAction.data;
        setPurchaseProducts(response.purchase || []);
        if (response?.totalPages) setTotalPages(response.totalPages);
      } catch (error) {
        console.error("Failed to fetch purchase products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch, page, limit]);

  return (
    <Layout>
      <section className="search-results-sec py-4">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="search-results-contain mt-3">
                <div className="bookings-details-title px-1 mb-3">
                  <h2>Product History</h2>
                </div>
                {loading ? (
                  <div className="text-center my-5">
                    <Loader />
                  </div>
                ) : purchaseProducts && purchaseProducts.length > 0 ? (
                  <Table responsive className="custom-transaction-table">
                    <thead>
                      <tr>
                        <th>Product Image</th>
                        <th>Product Name</th>
                        <th>Product Price</th>
                        <th>Product Quantity</th>
                        <th>Transaction Id</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseProducts.map((post, idx) => {
                        const firstProduct = post?.products?.[0];
                        const productname = post?.products?.[0];
                        const image = firstProduct?.productId?.images?.[0];
                        const type = post.type || "Top Up";
                        const status = post.status || "Pending";
                        const amount = Number(post.totalPrice).toFixed(2);
                        const isNegative = Number(post.totalPrice) < 0;
                        const products = Array.isArray(post.products)
                          ? post.products
                          : [];
                        const totalProductPrice = products
                          .reduce((sum, p) => sum + (p.price || 0), 0)
                          .toFixed(2);
                        const totalProductQuantity = products.reduce(
                          (sum, p) => sum + (p.quantity || 0),
                          0
                        );

                        return (
                          <tr key={idx}>
                            <td>
                              <img
                                src={
                                  image
                                    ? `${process.env.REACT_APP_API_URL}/products/${image}`
                                    : defaultImage
                                }
                                width={40}
                                height={40}
                                alt="Product"
                                style={{ objectFit: "cover", borderRadius: 6 }}
                              />
                            </td>
                            <td>{productname?.productId?.name || "-"}</td>
                            <td>£{totalProductPrice}</td>
                            <td>{totalProductQuantity}</td>
                            <td>{post.transactionId || "-"}</td>
                            <td>
                              <span
                                className={`pill-badge ${
                                  type === "Campaign Charge" ? "blue" : "yellow"
                                }`}
                              >
                                {type}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`pill-badge status ${
                                  status.toLowerCase() === "completed"
                                    ? "green"
                                    : status.toLowerCase() === "failed"
                                    ? "red"
                                    : "yellow"
                                }`}
                              >
                                <span className="dot" />
                                {status}
                              </span>
                            </td>
                            <td className={isNegative ? "text-danger" : ""}>
                              £{amount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <div className="no-upcoming-bookings text-center py-5">
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
                    <h5 className="mt-3 ">No Product History Found</h5>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
