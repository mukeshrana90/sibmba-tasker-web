import { useNavigate } from "react-router-dom";
import CorporateLeadCardMeta from "./CorporateLeadCardMeta";
import {
  formatDisplayTitle,
  handleUserImageError,
  providerDisplayName,
  userImageUrl,
} from "../utils/landingUtils";
import {
  formatCorporateLeadStatusLabel,
  getCorporateLeadStatus,
  canCorporateViewLeadDetails,
} from "../utils/corporateLeadStatus";

export default function CorporateUpcomingTaskCard({ lead }) {
  const navigate = useNavigate();
  const leadStatus = getCorporateLeadStatus(lead);
  const isTask = lead?.type === "task";
  const item = isTask ? lead?.taskId : lead?.bookingId;

  const title = isTask
    ? formatDisplayTitle(item?.need_done, "Untitled Task")
    : formatDisplayTitle(lead?.userId?.full_name, "Booking");

  const address = item?.address;
  const date = isTask ? item?.when_done : item?.date;
  const time = isTask ? item?.task_time : lead?.bookingId?.slotTime?.[0];

  const detailId = lead?.bookingId?._id || lead?.taskId?._id;

  return (
    <div className="booking-card">
      <div className="d-flex justify-content-between align-items-start mb-2 gap-3 corp-lead-card-head">
        <div className="corp-lead-card-head__main">
          <h5 className="mb-1">{title}</h5>
          {isTask && item?.details ? (
            <p className="mb-0 small text-muted corp-lead-desc">
              {formatDisplayTitle(item.details)}
            </p>
          ) : null}
          {!isTask && lead?.userId?.email ? (
            <p className="mb-0 small text-muted">{lead.userId.email}</p>
          ) : null}
          <CorporateLeadCardMeta address={address} date={date} time={time} />
        </div>
        <span className={`corporate_inner ${leadStatus}`}>
          {formatCorporateLeadStatusLabel(leadStatus)}
        </span>
      </div>

      {lead?.serviceProviderId ? (
        <div className="d-flex align-items-center gap-2 mb-3">
          <img
            src={userImageUrl(lead.serviceProviderId)}
            onError={handleUserImageError}
            alt={providerDisplayName(lead.serviceProviderId)}
            className="booking-avatar rounded-circle"
            width={40}
            height={40}
          />
          <p className="mb-0 small">
            Suggested by:{" "}
            <strong>{providerDisplayName(lead.serviceProviderId)}</strong>
          </p>
        </div>
      ) : null}

      {canCorporateViewLeadDetails(lead) && detailId ? (
        <div className="book-service-action-btn leads-btn d-flex gap-2">
          <button
            type="button"
            className="primaryBtn"
            onClick={() =>
              navigate(
                `/corporate/lead-details/${detailId}?type=${lead.type}`
              )
            }
          >
            See More
          </button>
        </div>
      ) : null}
    </div>
  );
}
