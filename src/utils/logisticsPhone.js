/** Default dial code for logistics phone fields (Zimbabwe, same as sign-up). */
export const DEFAULT_COUNTRY_CODE = "+263";

/**
 * Phone-input value "+263 77 222 3344" + dial code "263"
 * → { country_code: "+263", phone_number: "772223344" }.
 */
export function splitPhoneValue(phone, dialCode, fallbackCode = DEFAULT_COUNTRY_CODE) {
  const country_code = dialCode ? `+${dialCode}` : fallbackCode;
  let local = String(phone || "");
  if (dialCode && local.startsWith(`+${dialCode}`)) {
    local = local.slice(`+${dialCode}`.length);
  } else if (local.startsWith("+")) {
    local = local.replace(/^\+/, "");
  }
  return { country_code, phone_number: local.replace(/\D/g, "") };
}

/**
 * v2.7.71 (client test B1): a local number must not start with 0 after the dial code
 * (+263 0788… is wrong, +263 788… is right). Returns the message, or "" when fine.
 */
export function leadingZeroError(phoneNumber, countryCode = DEFAULT_COUNTRY_CODE) {
  const raw = String(phoneNumber || "");
  if (!/^\D*0/.test(raw)) return "";
  const cc = String(countryCode || DEFAULT_COUNTRY_CODE);
  const example = cc.replace(/\D/g, "") === "263" ? "77xxxxxxx" : "the number without the first 0";
  return `Remove the 0 after ${cc}, e.g. ${cc} ${example}`;
}

/** Phone hint shown under phone fields (client test I6). */
export const PHONE_FORMAT_HINT = "Pick your country, then type the number without the first 0 (e.g. +263 77 123 4567).";
