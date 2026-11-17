import { useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";
import LogisticsPhoneInput, { DEFAULT_COUNTRY_CODE } from "./LogisticsPhoneInput";
import ButtonLoader from "./ButtonLoader";
import { leadingZeroError } from "../utils/logisticsPhone";

/**
 * /edit-profile phone number (v2.7.69, every role on that page).
 * Shows the stored number; "Change" sends a code to the NEW number
 * (WhatsApp or SMS) and saves it only after the code is verified.
 */
export default function ProfilePhoneField({ countryCode, phoneNumber, onChanged }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState({ country_code: countryCode || DEFAULT_COUNTRY_CODE, phone_number: "" });
  const [channel, setChannel] = useState("whatsapp");
  const [sent, setSent] = useState(null); // { phone_masked, channel }
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const hasPhone = Boolean(String(phoneNumber || "").replace(/\D/g, ""));

  const reset = () => {
    setOpen(false);
    setSent(null);
    setOtp("");
    setError("");
    setWait(0);
    setNext({ country_code: countryCode || DEFAULT_COUNTRY_CODE, phone_number: "" });
  };

  const sendCode = async () => {
    setError("");
    if (String(next.phone_number || "").length < 6) {
      setError("Enter the new phone number");
      return;
    }
    // v2.7.71 (client test B1)
    const zero = leadingZeroError(next.phone_number, next.country_code);
    if (zero) {
      setError(zero);
      return;
    }
    setBusy(true);
    const res = await dispatch(CustomerActions.sendPhoneChangeCode({ ...next, channel }));
    setBusy(false);
    const p = res?.payload;
    if (p?.success) {
      setSent({ phone_masked: p.data?.phone_masked, channel: p.data?.channel || channel });
      setOtp("");
      setWait(Number(p.data?.resend_in) || 30);
      toast.success(p.message || "Code sent");
    } else {
      setError(p?.message || "Could not send the code");
    }
  };

  const verify = async () => {
    setError("");
    if (!/^\d{4}$/.test(otp)) {
      setError("Enter the 4-digit code");
      return;
    }
    setBusy(true);
    const res = await dispatch(CustomerActions.verifyPhoneChange({ otp }));
    setBusy(false);
    const p = res?.payload;
    if (p?.success) {
      toast.success("Phone number updated");
      reset();
      onChanged?.(p.data);
    } else {
      setError(p?.message || "Could not verify the code");
    }
  };

  return (
    <Form.Group className="mb-3 profile-phone" controlId="profilePhoneNumber">
      <Form.Label>Phone Number</Form.Label>
      <div className="profile-phone__row">
        <div className="profile-phone__current">
          {hasPhone ? (
            <LogisticsPhoneInput
              id="profilePhoneNumber"
              countryCode={countryCode}
              phoneNumber={phoneNumber}
              disabled
            />
          ) : (
            <Form.Control readOnly className="text-muted" value="No phone number added" />
          )}
        </div>
        {!open ? (
          <button
            type="button"
            className="btn btn-outline-success profile-phone__change"
            onClick={() => setOpen(true)}
          >
            {hasPhone ? "Change" : "Add"}
          </button>
        ) : null}
      </div>
      <Form.Text className="text-muted">
        Used for sign-in codes, password reset and WhatsApp alerts.
      </Form.Text>

      {open ? (
        <div className="profile-phone__panel">
          {!sent ? (
            <>
              <Form.Label htmlFor="profileNewPhone">New phone number</Form.Label>
              <LogisticsPhoneInput
                id="profileNewPhone"
                name="new_phone_number"
                countryCode={next.country_code}
                phoneNumber={next.phone_number}
                onChange={(v) => setNext(v)}
              />
              <div className="profile-phone__channels" role="radiogroup" aria-label="Send the code by">
                <Form.Check
                  inline
                  type="radio"
                  id="profilePhoneChannelWa"
                  name="profilePhoneChannel"
                  label="WhatsApp"
                  checked={channel === "whatsapp"}
                  onChange={() => setChannel("whatsapp")}
                />
                <Form.Check
                  inline
                  type="radio"
                  id="profilePhoneChannelSms"
                  name="profilePhoneChannel"
                  label="SMS"
                  checked={channel === "sms"}
                  onChange={() => setChannel("sms")}
                />
              </div>
              <div className="profile-phone__actions">
                <button type="button" className="btn btn-success profile-phone__send" onClick={sendCode} disabled={busy}>
                  {busy ? <ButtonLoader /> : "Send code"}
                </button>
                <button type="button" className="btn btn-link profile-phone__cancel" onClick={reset} disabled={busy}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-2">
                Enter the code we sent by {sent.channel === "sms" ? "SMS" : "WhatsApp"} to{" "}
                <strong>{next.country_code} {sent.phone_masked}</strong>.
              </p>
              <Form.Control
                id="profilePhoneOtp"
                className="profile-phone__otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                placeholder="4-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => {
                  // inside the profile <form>: Enter verifies instead of submitting the profile
                  if (e.key === "Enter") { e.preventDefault(); verify(); }
                }}
              />
              <div className="profile-phone__actions">
                <button type="button" className="btn btn-success profile-phone__verify" onClick={verify} disabled={busy}>
                  {busy ? <ButtonLoader /> : "Verify"}
                </button>
                <button
                  type="button"
                  className="btn btn-link profile-phone__resend"
                  onClick={sendCode}
                  disabled={busy || wait > 0}
                >
                  {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  className="btn btn-link profile-phone__back"
                  onClick={() => { setSent(null); setOtp(""); setError(""); }}
                  disabled={busy}
                >
                  Use another number
                </button>
                <button type="button" className="btn btn-link profile-phone__cancel" onClick={reset} disabled={busy}>
                  Cancel
                </button>
              </div>
            </>
          )}
          {error ? <div className="text-danger small mt-2 profile-phone__error">{error}</div> : null}
        </div>
      ) : null}
    </Form.Group>
  );
}
