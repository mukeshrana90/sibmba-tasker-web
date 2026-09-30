import { forwardRef, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

/** "YYYY-MM-DD" (or ISO) → local Date at midnight; null when empty/invalid. */
function parseYmd(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local Date → "YYYY-MM-DD" (no UTC shift). */
function toYmd(date) {
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const CalendarIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <path d="M3 9.5h18M8 3v3M16 3v3" />
  </svg>
);

// Text input + calendar icon; react-datepicker drives open/close through onClick/onFocus
const DateField = forwardRef(function DateField({ className, onIconClick, ...props }, ref) {
  return (
    <span className="log-dp-field">
      <input ref={ref} {...props} className={className} autoComplete="off" />
      <button
        type="button"
        className="log-dp-field__icon"
        tabIndex={-1}
        aria-label="Open calendar"
        disabled={props.disabled}
        onClick={onIconClick}
      >
        <CalendarIcon />
      </button>
    </span>
  );
});

/**
 * Brand-themed replacement for <input type="date"> on logistics pages.
 * Same contract as the native input: `value` is "YYYY-MM-DD" (or ""), `min` /
 * `max` are "YYYY-MM-DD", and `onChange` gets an event-like object whose
 * `target.value` is "YYYY-MM-DD" — so callers need no other change.
 * The calendar is portalled to <body> so cards with overflow:hidden never clip it.
 */
export default function LogisticsDateInput({
  value,
  onChange,
  min,
  max,
  name,
  id,
  className = "",
  placeholder = "dd/mm/yyyy",
  required,
  disabled,
  style,
  "aria-label": ariaLabel,
  clearable = true,
}) {
  const pickerRef = useRef(null);

  const emit = (date) => {
    const v = toYmd(date);
    const target = { value: v, name, id, type: "date" };
    onChange?.({ target, currentTarget: target });
  };

  return (
    <DatePicker
      ref={pickerRef}
      id={id}
      name={name}
      selected={parseYmd(value)}
      onChange={emit}
      minDate={parseYmd(min)}
      maxDate={parseYmd(max)}
      placeholderText={placeholder}
      dateFormat="dd/MM/yyyy"
      required={required}
      disabled={disabled}
      className={`log-dp-input ${className}`.trim()}
      wrapperClassName="log-dp"
      calendarClassName="log-datepicker"
      popperClassName="log-dp-popper"
      popperPlacement="bottom-start"
      portalId="log-dp-portal"
      showPopperArrow={false}
      todayButton="Today"
      isClearable={clearable && !required && !disabled && Boolean(value)}
      clearButtonClassName="log-dp-clear"
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      customInput={
        <DateField
          style={style}
          aria-label={ariaLabel}
          onIconClick={() => pickerRef.current?.setOpen(true)}
        />
      }
    />
  );
}
