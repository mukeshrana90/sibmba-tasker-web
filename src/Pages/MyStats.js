import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import CorporatePageShell from "../CommanComponents/CorporatePageShell";
import CustomerActions from "../Redux/Actions/CustomerActions";
import EarningsIcon from "../Assets/Images/stats/Earnings.svg";
import RejectedBookingsIcon from "../Assets/Images/stats/RejectedBookings.svg";
import TotalFeedbackIcon from "../Assets/Images/stats/TotalFeedback.svg";
import TotalBookingsIcon from "../Assets/Images/stats/TotalBookings.svg";
import CompletedBookingsIcon from "../Assets/Images/stats/CompletedBookings.svg";
import PublishedIcon from "../Assets/Images/stats/Published.svg";

const STAT_CARDS = [
  { key: "bookingsCount", label: "Total Bookings", icon: TotalBookingsIcon },
  {
    key: "completeBookingsCount",
    label: "Completed Bookings",
    icon: CompletedBookingsIcon,
  },
  {
    key: "rejectBookingsCount",
    label: "Rejected Bookings",
    icon: RejectedBookingsIcon,
  },
  {
    key: "totalFeedbacksCount",
    label: "Total Feedback",
    icon: TotalFeedbackIcon,
  },
  {
    key: "totalFeedbacksPublishedCount",
    label: "Published Feedback",
    icon: PublishedIcon,
  },
  {
    key: "myearnings",
    label: "My Earnings",
    icon: EarningsIcon,
    format: (v) => `$${v ?? 0}`,
  },
];

export default function MyStats() {
  const dispatch = useDispatch();
  const statsDetail = useSelector((e) => e.UserSlice.statsListData) || {};

  useEffect(() => {
    dispatch(CustomerActions.statsListing());
  }, [dispatch]);

  return (
    <CorporatePageShell
      title="My Stats"
      pageClass="p-mystats"
      showBanner={false}
    >
      <div className="stats-grid">
        {STAT_CARDS.map(({ key, label, icon, format }) => (
          <div key={key} className="stat-card">
            <div className="sc-top">
              <h3>{label}</h3>
              <div className="stat-ico">
                <img src={icon} alt="" width={22} height={22} />
              </div>
            </div>
            <div className="stat-num">
              {format
                ? format(statsDetail[key])
                : statsDetail[key] ?? 0}
            </div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </CorporatePageShell>
  );
}
