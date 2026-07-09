import { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const CalendarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
  </svg>
);

export default function SimbaDatePicker({
  id,
  selected,
  onChange,
  onBlur,
  minDate = new Date(),
  placeholder = "Select date",
  className = "control",
  disabled,
}) {
  const pickerRef = useRef(null);

  return (
    <div className="simba-date-field">
      <DatePicker
        ref={pickerRef}
        id={id}
        selected={toDate(selected)}
        onChange={onChange}
        onBlur={onBlur}
        minDate={minDate}
        placeholderText={placeholder}
        className={className}
        disabled={disabled}
        dateFormat="dd/MM/yyyy"
        isClearable
        todayButton="Today"
        calendarClassName="simba-datepicker"
        popperClassName="simba-datepicker-popper"
        popperPlacement="bottom-start"
        showPopperArrow={false}
      />
      <button
        type="button"
        className="simba-date-field__icon"
        aria-label="Open calendar"
        disabled={disabled}
        onClick={() => pickerRef.current?.setOpen(true)}
      >
        <CalendarIcon />
      </button>
    </div>
  );
}
