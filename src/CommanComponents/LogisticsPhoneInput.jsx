import { useMemo } from "react";
import {
  PhoneInput,
  defaultCountries,
  parseCountry,
} from "react-international-phone";
import "react-international-phone/style.css";
import { DEFAULT_COUNTRY_CODE, splitPhoneValue } from "../utils/logisticsPhone";

export { DEFAULT_COUNTRY_CODE };

/** "+263" → "zw" (falls back to Zimbabwe, same as sign-up). */
export function countryCodeToIso(dialCode) {
  const digits = String(dialCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, "");
  for (const entry of defaultCountries) {
    const country = parseCountry(entry);
    if (country.dialCode === digits) return country.iso2;
  }
  return "zw";
}

/**
 * Logistics phone field with a country-code picker (same library + Zimbabwe
 * default as sign-up). Stores the dial code and local number separately, like
 * `users.country_code` + `users.phone_number`.
 * onChange({ country_code: "+263", phone_number: "772223344" }).
 */
export default function LogisticsPhoneInput({
  countryCode,
  phoneNumber,
  onChange,
  disabled,
  placeholder = "77 222 3344",
  id,
  name = "phone_number",
}) {
  const code = countryCode || DEFAULT_COUNTRY_CODE;
  const iso = useMemo(() => countryCodeToIso(code), [code]);
  const local = String(phoneNumber || "").replace(/\D/g, "");
  // Always pass the dial code so a country picked before typing sticks
  const value = `+${code.replace(/\D/g, "")}${local}`;

  return (
    <div className={`log-phone-input${disabled ? " is-disabled" : ""}`}>
      <PhoneInput
        defaultCountry={iso}
        // Dial code can't be deleted/retyped — country changes only via the
        // picker, so "+263" can't turn into "+61" while typing
        forceDialCode
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        inputProps={{ id, name }}
        onChange={(phone, meta) =>
          onChange?.(splitPhoneValue(phone, meta?.country?.dialCode, code))
        }
      />
    </div>
  );
}
