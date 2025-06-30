import React from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { Form } from "react-bootstrap";

const PhoneNumberInput = ({ value, onChange, setFieldValue, error, touched, initialCountry, formik }) => {

  const handleChange = (phone) => {
    if (formik) {
      formik.setFieldValue("phone_number", phone);
      formik.setFieldTouched("phone_number", true);
    } else if (setFieldValue) {
      // setFieldValue("phone_number", phone);
      setFieldValue("ref_phone_number", phone);
      if (onChange) {
        onChange(phone); 
      }
    } else if (onChange) {
      onChange(phone); 
    }
  };

  return (
    <div className="form-set">
      <Form.Group className="mb-3" controlId="formPhoneNumber">
        <div className="number-country">
          <PhoneInput
            defaultCountry={initialCountry || "in"}
            value={value}
            onChange={handleChange}
            placeholder="Enter here"
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