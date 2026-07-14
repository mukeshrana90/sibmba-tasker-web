import { useMemo } from "react";
import Select from "react-select";
import { defaultCountries, parseCountry } from "react-international-phone";

export const COUNTRY_OPTIONS = (() => {
  const seen = new Set();
  const options = [];
  for (const entry of defaultCountries) {
    const country = parseCountry(entry);
    const name = country?.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ value: name, label: name });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
})();

export const COUNTRY_NAMES = COUNTRY_OPTIONS.map((opt) => opt.value);

export function findCountryOption(value) {
  if (!value || value === "undefined") return null;
  const needle = String(value).trim().toLowerCase();
  return (
    COUNTRY_OPTIONS.find((opt) => opt.value.toLowerCase() === needle) || null
  );
}

const SIMBA_GREEN = "#0f5c4c";
const SIMBA_GREEN_SOFT = "rgba(15, 92, 76, 0.12)";
const BORDER = "#ced4da";
const BORDER_FOCUS = "#0f5c4c";
const BORDER_PROVIDER = "var(--line-strong, #d1d5db)";

function buildSelectStyles(variant = "default") {
  const isProvider = variant === "provider";
  const height = isProvider ? 48 : 42;
  const innerHeight = height - 2;
  const radius = isProvider ? 12 : 6;
  const borderDefault = isProvider ? BORDER_PROVIDER : BORDER;

  return {
    control: (base, state) => ({
      ...base,
      minHeight: height,
      height,
      borderRadius: radius,
      borderWidth: isProvider ? 1.5 : 1,
      borderColor: state.isFocused ? BORDER_FOCUS : borderDefault,
      boxShadow: state.isFocused
        ? isProvider
          ? "0 0 0 4px rgba(15, 92, 76, 0.12)"
          : "none"
        : isProvider
          ? "none"
          : "0px 1px 2px 0px #1018280d",
      backgroundColor: "#fff",
      fontFamily: isProvider
        ? 'var(--font-body, "Inter", sans-serif)'
        : '"Inter", serif',
      fontSize: isProvider ? "0.98rem" : 14,
      cursor: "pointer",
      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        borderColor: state.isFocused ? BORDER_FOCUS : "#b9b8be",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      height: innerHeight,
      padding: "0 12px",
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: "#212529",
      fontFamily: isProvider
        ? 'var(--font-body, "Inter", sans-serif)'
        : '"Inter", serif',
      fontSize: isProvider ? "0.98rem" : 14,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: innerHeight,
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      padding: "6px 10px",
      color: state.isFocused ? SIMBA_GREEN : "#acaab1",
      "&:hover": { color: SIMBA_GREEN },
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: "6px 8px",
      color: "#acaab1",
      "&:hover": { color: SIMBA_GREEN },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "#e4e4e7",
      marginTop: 12,
      marginBottom: 12,
    }),
    singleValue: (base) => ({
      ...base,
      margin: 0,
      color: "#212529",
      fontFamily: isProvider
        ? 'var(--font-body, "Inter", sans-serif)'
        : '"Inter", serif',
      fontSize: isProvider ? "0.98rem" : 14,
      lineHeight: `${innerHeight}px`,
    }),
    placeholder: (base) => ({
      ...base,
      margin: 0,
      color: "#acaab1",
      fontFamily: isProvider
        ? 'var(--font-body, "Inter", sans-serif)'
        : '"Inter", serif',
      fontSize: isProvider ? "0.98rem" : 14,
      fontWeight: 400,
      lineHeight: `${innerHeight}px`,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 30,
      borderRadius: 8,
      border: "1px solid #e9e9e9",
      boxShadow: "0 8px 24px rgba(16, 24, 40, 0.12)",
      overflow: "hidden",
      marginTop: 4,
    }),
    menuList: (base) => ({
      ...base,
      padding: 4,
      maxHeight: 220,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: 6,
      fontFamily: isProvider
        ? 'var(--font-body, "Inter", sans-serif)'
        : '"Inter", serif',
      fontSize: 14,
      padding: "8px 12px",
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? SIMBA_GREEN
        : state.isFocused
          ? SIMBA_GREEN_SOFT
          : "transparent",
      color: state.isSelected ? "#fff" : "#212529",
      "&:active": {
        backgroundColor: SIMBA_GREEN,
        color: "#fff",
      },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      fontFamily: isProvider
        ? 'var(--font-body, "Inter", sans-serif)'
        : '"Inter", serif',
      fontSize: 14,
      color: "#acaab1",
    }),
  };
}

export default function CountrySelect({
  value,
  onChange,
  onBlur,
  placeholder = "Search and select country",
  isDisabled = false,
  name = "country",
  classNamePrefix = "country-select",
  variant = "default",
}) {
  const selected = useMemo(() => findCountryOption(value), [value]);
  const styles = useMemo(() => buildSelectStyles(variant), [variant]);

  return (
    <Select
      name={name}
      classNamePrefix={classNamePrefix}
      options={COUNTRY_OPTIONS}
      value={selected}
      onChange={(option) => onChange(option?.value || "")}
      onBlur={onBlur}
      placeholder={placeholder}
      isClearable
      isSearchable
      isDisabled={isDisabled}
      styles={styles}
      noOptionsMessage={() => "No country found"}
    />
  );
}
