import locationPin from "../Assets/Images/corporate/locationPin.svg";
import calenderIcon from "../Assets/Images/corporate/calenderIcon.svg";
import { formatTaskWhenDoneDisplay } from "../utils/CommonFunction";

function formatLeadDate(value) {
  if (value == null || value === "") return "No Date";
  const formatted = formatTaskWhenDoneDisplay(value);
  return formatted === "N/A" ? String(value) : formatted;
}

function formatLeadTime(value) {
  if (value == null || value === "") return null;
  return String(value).trim();
}

export default function CorporateLeadCardMeta({ address, date, time }) {
  const locationText = address?.trim() || "No Location";
  const dateText = formatLeadDate(date);
  const timeText = formatLeadTime(time);

  return (
    <div className="corp-lead-meta">
      <span className="corp-lead-meta__item">
        <img src={locationPin} alt="" aria-hidden="true" />
        <span>{locationText}</span>
      </span>
      {timeText ? (
        <span className="corp-lead-meta__item">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
            <path
              d="M8 4.5V8L10.5 9.5"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
          <span>{timeText}</span>
        </span>
      ) : null}
      <span className="corp-lead-meta__item">
        <img src={calenderIcon} alt="" aria-hidden="true" />
        <span>{dateText}</span>
      </span>
    </div>
  );
}
