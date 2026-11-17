import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import LogisticsPhoneInput from "./LogisticsPhoneInput";

/** Blank operator block for the Add equipment form. */
export const emptyUnitOperator = () => ({
  existing_id: "",
  full_name: "",
  email: "",
  country_code: "+263",
  phone_number: "",
  face: null,
  face_preview: "",
  docs: {},
});

/** One-form onboarding: invite a new operator, or pick an existing one, for the unit being added. */
export default function LogisticsUnitOperatorStep({ mode, value, onChange }) {
  const dispatch = useDispatch();
  const [existing, setExisting] = useState([]);

  useEffect(() => {
    if (mode !== "existing") return;
    dispatch(LogisticsActions.listSubUsers()).then((res) => {
      setExisting(res?.payload?.data?.operators || []);
    });
  }, [dispatch, mode]);

  const patch = (next) => onChange({ ...value, ...next });

  if (mode === "existing") {
    return (
      <label className="log-field log-field--full" data-field="op_existing">
        <span className="log-fl">Choose an operator</span>
        <select value={value.existing_id} onChange={(e) => patch({ existing_id: e.target.value })} data-testid="unit-op-existing">
          <option value="">Select operator…</option>
          {existing.map((o) => (
            <option key={o._id} value={o._id}>
              {o.full_name || o.email}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (mode !== "invite") return null;

  return (
    <div className="log-field--full log-unit-op-step" data-testid="unit-op-invite">
      <label className="log-field" data-field="op_full_name">
        <span className="log-fl">Operator's full name <span className="log-req">*</span></span>
        <input value={value.full_name} onChange={(e) => patch({ full_name: e.target.value })} placeholder="Full name" data-testid="unit-op-name" />
      </label>
      <label className="log-field" data-field="op_email">
        <span className="log-fl">Operator's email <span className="log-req">*</span></span>
        <input type="email" value={value.email} onChange={(e) => patch({ email: e.target.value })} placeholder="name@example.com" data-testid="unit-op-email" />
      </label>
      <div className="log-field">
        <label className="log-fl" htmlFor="unit-op-phone">Phone</label>
        <LogisticsPhoneInput
          id="unit-op-phone"
          countryCode={value.country_code}
          phoneNumber={value.phone_number}
          onChange={({ country_code, phone_number }) => patch({ country_code, phone_number })}
        />
      </div>
      <div className="log-field--full">
        <p className="log-hint" data-testid="unit-op-invite-note">
          We send the operator an invite link. When they accept, they take a live selfie and upload their driving
          licence. Simba Tasker checks both before they can go live on this unit.
        </p>
      </div>
    </div>
  );
}
