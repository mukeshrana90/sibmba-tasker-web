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
