import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Layout from "../Components/Layout/Layout";
import Loader from "../CommanComponents/Loader";
import {
  handleCategoryImageError,
  productImageUrl,
} from "../utils/landingUtils";

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "credit";
  if (s === "failed") return "debit";
  return "pending";
}

export default function ProductHistory() {
  const dispatch = useDispatch();
  const [purchaseProducts, setPurchaseProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resultAction = await dispatch(
          CustomerActions.getPurchaseProducts()
        ).unwrap();
        const response = resultAction.data;
        setPurchaseProducts(response.purchase || []);
      } catch (error) {
        console.error("Failed to fetch purchase products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch]);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-wallet p-producthistory">
        <main className="page">
          <div className="wrap">
            <div className="page-head">
              <h1>Product History</h1>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <Loader />
              </div>
            ) : purchaseProducts.length > 0 ? (
              <>
                <h2 className="history-head">Purchase history</h2>
                <div className="txn-list">
                  {purchaseProducts.map((post, idx) => {
                    const firstProduct = post?.products?.[0];
                    const image = firstProduct?.productId?.images?.[0];
                    const name = firstProduct?.productId?.name || "Product";
                    const type = post.type || "Top Up";
                    const status = post.status || "Pending";
                    const amount = Number(post.totalPrice || 0);
                    const isNegative = amount < 0;
                    const products = Array.isArray(post.products)
                      ? post.products
                      : [];
                    const totalQty = products.reduce(
                      (sum, p) => sum + (p.quantity || 0),
                      0
                    );
                    const stCls = statusClass(status);

                    return (
                      <div className="txn" key={post._id || idx}>
                        <div className="txn-l">
                          <span className={`txn-ico ${stCls}`}>
                            {image ? (
                              <img
                                src={productImageUrl(image)}
                                alt=""
                                width={42}
                                height={42}
                                style={{ objectFit: "cover", borderRadius: 12 }}
                                onError={handleCategoryImageError}
                              />
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                              </svg>
                            )}
                          </span>
                          <div className="txn-meta">
                            <b>{name}</b>
                            <small>
                              {type}
                              {totalQty > 0 ? ` · Qty ${totalQty}` : ""}
                              {post.transactionId
                                ? ` · ${post.transactionId}`
                                : ""}
                            </small>
                            <span className={`ph-status ph-status--${stCls}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                        <span className={`amt ${isNegative ? "debit" : "credit"}`}>
                          {isNegative ? "−" : "+"} ${Math.abs(amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty">
                <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
                </svg>
                <h3>No product history</h3>
                <p>Your product purchases will appear here.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
