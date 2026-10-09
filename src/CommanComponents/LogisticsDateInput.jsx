import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
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

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Calendar header: prev/next arrows, month <select> and a custom year list.
 * The year list isn't a native <select> because Chrome pins the selected
 * option to the edge of its popup (with ~200 years the current year sat at
 * the very bottom, so later years needed scrolling). This one opens with the
 * selected year centred, so earlier and later years are both one glance away.
 */
function CalendarHeader({ date, changeYear, changeMonth, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled, minDate, maxDate }) {
  const [yearsOpen, setYearsOpen] = useState(false);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const year = date.getFullYear();
  const month = date.getMonth();
  const minYear = minDate ? minDate.getFullYear() : 1900;
  const maxYear = maxDate ? maxDate.getFullYear() : 2100;
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  // Centre the selected year in the list and focus it when the list opens
  useLayoutEffect(() => {
    if (!yearsOpen || !listRef.current) return;
    const list = listRef.current;
    const el = list.querySelector('[aria-selected="true"]');
    if (!el) return;
    list.scrollTop = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
    el.focus({ preventScroll: true });
  }, [yearsOpen]);

  // Close the year list on outside click / Escape (Escape must not close the calendar)
  useEffect(() => {
    if (!yearsOpen) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setYearsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [yearsOpen]);

  const pickYear = (y) => {
    changeYear(y);
    setYearsOpen(false);
  };

  const onListKey = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[e.key];
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setYearsOpen(false);
      wrapRef.current?.querySelector(".log-dp-year__btn")?.focus();
    } else if (step) {
      e.preventDefault();
      const cur = Number(document.activeElement?.dataset?.year) || year;
      const next = Math.min(maxYear, Math.max(minYear, cur + step));
      listRef.current?.querySelector(`[data-year="${next}"]`)?.focus();
    }
  };

  const monthDisabled = (m) =>
    (minDate && (year < minYear || (year === minYear && m < minDate.getMonth()))) ||
    (maxDate && (year > maxYear || (year === maxYear && m > maxDate.getMonth())));

  return (
    <div className="log-dp-head" ref={wrapRef}>
      <button
        type="button"
        className="react-datepicker__navigation react-datepicker__navigation--previous"
        aria-label="Previous month"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous" />
      </button>
      <div className="react-datepicker__header__dropdown">
        <select aria-label="Month" value={month} onChange={(e) => changeMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i} disabled={monthDisabled(i)}>{m}</option>
          ))}
        </select>
        <button
          type="button"
          className={`log-dp-year__btn${yearsOpen ? " is-open" : ""}`}
          aria-label="Year"
          aria-haspopup="listbox"
          aria-expanded={yearsOpen}
          onClick={() => setYearsOpen((o) => !o)}
        >
          {year}
        </button>
      </div>
      <button
        type="button"
        className="react-datepicker__navigation react-datepicker__navigation--next"
        aria-label="Next month"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
      >
        <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next" />
      </button>
      {yearsOpen && (
        <div className="log-dp-year__list" role="listbox" aria-label="Choose year" ref={listRef} onKeyDown={onListKey}>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              role="option"
              aria-selected={y === year}
              data-year={y}
              tabIndex={y === year ? 0 : -1}
              className={`log-dp-year__opt${y === year ? " is-selected" : ""}${y === new Date().getFullYear() ? " is-current" : ""}`}
              onClick={() => pickYear(y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  // Pick from the calendar only (no typing) — document expiry dates
  pickerOnly = false,
}) {
  const pickerRef = useRef(null);
  const minDate = parseYmd(min);
  const maxDate = parseYmd(max);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Only offer "Today" when today can actually be chosen (direct bookings
  // start tomorrow, so the button would pick an invalid date)
  const todayAllowed = (!minDate || minDate <= today) && (!maxDate || maxDate >= today);

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
      minDate={minDate}
      maxDate={maxDate}
      openToDate={parseYmd(value) || minDate || undefined}
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
      todayButton={todayAllowed ? "Today" : undefined}
      // Picker-only: ignore typed text (react-datepicker skips parsing when
      // onChangeRaw calls preventDefault) and don't raise the phone keyboard
      onChangeRaw={pickerOnly ? (e) => e?.preventDefault?.() : undefined}
      isClearable={clearable && !required && !disabled && Boolean(value)}
      clearButtonClassName="log-dp-clear"
      renderCustomHeader={(p) => <CalendarHeader {...p} minDate={minDate} maxDate={maxDate} />}
      customInput={
        <DateField
          style={style}
          inputMode={pickerOnly ? "none" : undefined}
          data-picker-only={pickerOnly ? "true" : undefined}
          aria-label={ariaLabel}
          onIconClick={() => pickerRef.current?.setOpen(true)}
        />
      }
    />
  );
}
