import React, { useState, useMemo } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { Form } from "react-bootstrap";

const PhoneNumberInput = ({ value, onChange, setFieldValue, error, touched, initialCountry, formik, onPhoneChange }) => {
  const [dialCode, setDialCode] = useState("");

  const displayValue = useMemo(() => {
    const v = (value || "").trim();
    if (!v) return "";
    if (v.startsWith("+")) return v;
    return dialCode ? `+${dialCode} ${v}` : "";
  }, [value, dialCode]);

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
            defaultCountry={initialCountry || "in"}
            value={displayValue}
            onChange={handleChange}
            placeholder="Enter phone number"
            disableFlags
            inputClassName="form-control"
            countrySelectorStyleProps={{
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
            containerStyle={{
              display: "flex",
              border: "1px solid #ced4da",
              borderRadius: "0.25rem",
              overflow: "hidden",
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