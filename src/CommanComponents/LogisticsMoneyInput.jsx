import { useLayoutEffect, useRef, useState } from "react";
import {
  LOGISTICS_MONEY_MAX,
  editableMoneyValue,
  formatMoneyInputValue,
  moneyInputMask,
  normalizeTypedMoney,
} from "../utils/logisticsMoney";

/**
 * Logistics money field: text + decimal keypad (no number spinner), "0.00"
 * placeholder, max 2 decimals / 99999.99. While typing it keeps a live ".00"
 * mask with the caret before it: 5 → 5.00, 53 → 53.00, "." moves into the
 * decimals, 53.2 → 53.20, 53.24. Formatted to 2 decimals on blur.
 * onChange receives the typed string ("53", "53.2", "53.24" / "53.00" after blur).
 */
export default function LogisticsMoneyInput({
  value,
  onChange,
  placeholder = "0.00",
  onBlur,
  onFocus,
  ...rest
}) {
  const inputRef = useRef(null);
  const caretRef = useRef(null);
  // Forces a render so the caret is restored even when the value didn't change
  const [, setTick] = useState(0);
  const typed = value == null ? "" : String(value);
  const { text } = moneyInputMask(typed);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (caretRef.current == null || !el || el !== document.activeElement) return;
    const pos = Math.min(caretRef.current, typed.length);
    caretRef.current = null;
    el.setSelectionRange(pos, pos);
  });

  const emit = (next, caret) => {
    caretRef.current = caret;
    setTick((t) => t + 1);
    if (next !== typed) onChange?.(next);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    const { pad } = moneyInputMask(typed);
    // The auto-filled zeros sit after the caret; strip them to get what was typed
    const typedEnd = pad && v.endsWith(pad) ? v.length - pad.length : v.length;
    const before = v.slice(0, typedEnd);
    const next = normalizeTypedMoney(before);
    const caret = Math.min(e.target.selectionStart ?? typedEnd, typedEnd);
    emit(next, Math.max(0, caret + next.length - before.length));
  };

  // Keep a collapsed caret out of the auto-filled ".00" (selections are left alone)
  const handleSelect = (e) => {
    const el = e.target;
    if (el.selectionStart === el.selectionEnd && el.selectionStart > typed.length) {
      el.setSelectionRange(typed.length, typed.length);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      title={`Amount up to ${LOGISTICS_MONEY_MAX}, max 2 decimals`}
      {...rest}
      ref={inputRef}
      placeholder={placeholder}
      value={text}
      onChange={handleChange}
      onSelect={handleSelect}
      onFocus={(e) => {
        // Resume editing a formatted value: "53.00" → typed "53" (looks the same)
        const editable = editableMoneyValue(typed);
        if (editable !== typed) emit(editable, editable.length);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        const formatted = formatMoneyInputValue(typed);
        if (formatted !== typed) onChange?.(formatted);
        onBlur?.(e);
      }}
    />
  );
}
