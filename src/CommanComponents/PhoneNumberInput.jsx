import React, { useState, useMemo } from "react";
import { PhoneInput, defaultCountries, parseCountry } from "react-international-phone";
import "react-international-phone/style.css";
import { Form } from "react-bootstrap";

/** Dial code ("263") for an iso2 country ("zw"). */
function dialCodeForIso(iso) {
  const entry = defaultCountries.find((c) => parseCountry(c).iso2 === iso);
  return entry ? parseCountry(entry).dialCode : "263";
}

// Default country is Zimbabwe (+263) everywhere, same as sign-up / logistics
const PhoneNumberInput = ({ value, onChange, setFieldValue, error, touched, initialCountry = "zw", formik, onPhoneChange }) => {
  const [dialCode, setDialCode] = useState("");

  const displayValue = useMemo(() => {
    const v = (value || "").trim();
    const dial = dialCode || dialCodeForIso(initialCountry);
    // Keep the dial code even when empty so the picked country sticks
    if (!v) return `+${dial}`;
    if (v.startsWith("+")) return v;
    return `+${dial} ${v}`;
  }, [value, dialCode, initialCountry]);

  const handleChange = (phone, meta) => {
    const nextDialCode = meta?.country?.dialCode || dialCode;
    if (meta?.country?.dialCode) setDialCode(meta.country.dialCode);

    const countryCode = nextDialCode ? `+${nextDialCode}` : "";
    let phoneWithoutCountryCode = phone;
    if (nextDialCode && phone.startsWith(`+${nextDialCode}`)) {
      phoneWithoutCountryCode = phone.substring(`+${nextDialCode}`.length).trim();
    } else if (phone.startsWith("+")) {
      phoneWithoutCountryCode = phone.replace(/^\+?\d+\s*/, "").trim();
    }
    
    if (formik) {
      formik.setFieldValue("phone_number", phoneWithoutCountryCode);
      formik.setFieldValue("country_code", countryCode);
      formik.setFieldTouched("phone_number", true);
    } else if (setFieldValue && onChange) {
      setFieldValue("phone_number", phoneWithoutCountryCode);
      onChange(phoneWithoutCountryCode, countryCode);
    } else if (setFieldValue) {
      setFieldValue("ref_phone_number", phoneWithoutCountryCode);
      if (onChange) onChange(phoneWithoutCountryCode, countryCode);
    } else if (onChange) {
      onChange(phoneWithoutCountryCode, countryCode);
    } else if (onPhoneChange) {
      onPhoneChange(phoneWithoutCountryCode, countryCode);
    }
  };

  return (
    <div className="form-set">
      <Form.Group className="mb-3" controlId="formPhoneNumber">
        <div className="number-country">
          <PhoneInput
            defaultCountry={initialCountry || "zw"}
            forceDialCode
            value={displayValue}
            onChange={handleChange}
            placeholder="Enter phone number"
            disableFlags
            inputClassName="form-control"
            countrySelectorStyleProps={{
              dropdownStyleProps: {
                style: { zIndex: 60, maxHeight: 260, overflowY: "auto", top: "calc(100% + 4px)" },
              },
              buttonClassName: "custom-country-selector",
              buttonStyle: {
                border: "1px solid #ced4da",
                borderRight: "none",
                borderRadius: "0.25rem 0 0 0.25rem",
                padding: "0.375rem 0.75rem",
                backgroundColor: "#fff",
                fontSize: "1rem",
                width: "50px",
                textAlign: "left",
                height: "42px",
              },
            }}
            inputStyle={{
              border: "1px solid #ced4da",
              borderLeft: "none",
              borderRadius: "0 0.25rem 0.25rem 0",
              padding: "0.375rem 0.75rem",
              flex: "1",
              width: "50%",
              height: "42px",
              fontSize: "1rem",
            }}
            // No overflow:hidden — it clipped the country dropdown
            containerStyle={{
              display: "flex",
              position: "relative",
              border: "1px solid #ced4da",
              borderRadius: "0.25rem",
              width: "100%",
            }}

          />
        </div>
        {touched && error && <div className="text-danger">{error}</div>}
      </Form.Group>
    </div>
  );
};

export default PhoneNumberInput;