import {
  LOGISTICS_MONEY_MAX,
  formatMoneyInputValue,
  sanitizeMoneyInput,
} from "../utils/logisticsMoney";

/**
 * Logistics money field: text + decimal keypad (no number spinner), "0.00"
 * placeholder, max 2 decimals / 99999.99 while typing, formatted to 2
 * decimals on blur (25 → 25.00). onChange receives the sanitized string.
 */
export default function LogisticsMoneyInput({
  value,
  onChange,
  placeholder = "0.00",
  onBlur,
  ...rest
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      maxLength={8}
      title={`Amount up to ${LOGISTICS_MONEY_MAX}, max 2 decimals`}
      {...rest}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange?.(sanitizeMoneyInput(e.target.value))}
      onBlur={(e) => {
        const formatted = formatMoneyInputValue(value);
        if (formatted !== (value ?? "")) onChange?.(formatted);
        onBlur?.(e);
      }}
    />
  );
}
