import React, { useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";

export default function Wallet() {
  const dispatch = useDispatch();
  const walletLists = useSelector((e) => e.service.walletDetail);

  useEffect(() => {
    dispatch(ServiceActions.getMyWallets());
  }, [dispatch]);

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>Wallet</h2>
                <p>Home / Wallet</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="pt-0 mt-5">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto">
              <div className="my-balance-card">
                <div>
                  <p>My balance</p>
                  <h2>
                    £{walletLists?.totalBalance?.toLocaleString() || "0"}
                  </h2>
                </div>
                {/* <button>Withdraw</button> */}
              </div>
              <div className="payment-history-list">
                <h2>Payment History</h2>
                <ul>
                  {walletLists?.transactions?.length > 0 ? (
                    walletLists.transactions.map((transaction) => (
                      <li key={transaction._id}>
                        <div className="payment-pro">
                          {/* <img
                            src={require("../Assets/Images/user-next.png")}
                            alt="user"
                          /> */}
                          <div>
                            <h3>Payment Received</h3>
                            {/* <p>Order ID: {transaction.bookingId}</p> */}
                          </div>
                        </div>
                        <span>+ £{transaction.amount.toLocaleString()}</span>
                      </li>
                    ))
                  ) : (
                    <li>No transactions available</li>
                  )}
                </ul>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}