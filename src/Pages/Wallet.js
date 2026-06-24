import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import ServiceActions from "../Redux/Actions/ServiceActions";

export default function Wallet() {
  const dispatch = useDispatch();
  const walletLists = useSelector((e) => e.service.walletDetail);

  useEffect(() => {
    dispatch(ServiceActions.getMyWallets());
  }, [dispatch]);

  const balance = walletLists?.totalBalance ?? 0;
  const transactions = walletLists?.transactions ?? [];

  return (
    <CorporatePageShell
      title="Wallet"
      crumbLabel="Wallet"
      pageClass="p-wallet"
    >
      <div className="balance-card">
        <div className="bal-label">My balance</div>
        <div className="bal-amt">${balance.toLocaleString()}</div>
      </div>

      <h2 className="history-head">Payment History</h2>
      <div className="txn-list">
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <div key={transaction._id} className="txn">
              <div className="txn-l">
                <div className="txn-ico credit">+</div>
                <div className="txn-meta">
                  <b>Payment Received</b>
                  {transaction.bookingId ? (
                    <small>Order ID: {transaction.bookingId}</small>
                  ) : null}
                </div>
              </div>
              <span className="amt credit">
                + ${transaction.amount.toLocaleString()}
              </span>
            </div>
          ))
        ) : (
          <div className="empty">No transactions available</div>
        )}
      </div>
    </CorporatePageShell>
  );
}
