import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsPhoneInput from "../../CommanComponents/LogisticsPhoneInput";
import LogisticsSosButton from "../../CommanComponents/LogisticsSosButton";
import { DEFAULT_COUNTRY_CODE } from "../../utils/logisticsPhone";
import "./logistics.css";
import {
  LogisticsFormSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";

const MAX_CONTACTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,24}$/i;

const blank = () => ({
  name: "",
  relation: "",
  country_code: DEFAULT_COUNTRY_CODE,
  phone_number: "",
  email: "",
});

function validate(rows) {
  for (const [i, c] of rows.entries()) {
    const n = i + 1;
    if (!c.name.trim()) return `Contact ${n}: add a name`;
    if (!c.phone_number.trim() && !c.email.trim()) return `Contact ${n}: add a phone number or an email`;
    if (c.email.trim() && !EMAIL_RE.test(c.email.trim())) return `Contact ${n}: enter a valid email`;
  }
  return null;
}

/**
 * SOS emergency contacts (customers + operators). These people get an SMS /
 * email with the user's location when SOS is pressed.
 * homeTo / midLabel follow the shell the page is mounted in.
 */
export default function LogisticsEmergencyContacts({ homeTo, midLabel = "Logistics" }) {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await dispatch(LogisticsActions.getEmergencyContacts());
      const list = res?.payload?.data?.contacts || [];
      setRows(
        list.length
          ? list.map((c) => ({ ...blank(), ...c, country_code: c.country_code || DEFAULT_COUNTRY_CODE }))
          : [blank()]
      );
      setLoading(false);
    })();
  }, [dispatch]);

  const update = (i, patch) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async (e) => {
    e.preventDefault();
    const filled = rows.filter((r) => r.name.trim() || r.phone_number.trim() || r.email.trim());
    const err = validate(filled);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(LogisticsActions.saveEmergencyContacts(filled));
      if (res?.payload?.success) {
        toast.success("Emergency contacts saved");
        const saved = res.payload.data?.contacts || [];
        setRows(saved.length ? saved.map((c) => ({ ...blank(), ...c })) : [blank()]);
      } else {
        toast.error(res?.payload?.message || "Could not save");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <LogisticsPageShell
      title="Emergency contacts"
      crumbLabel="Emergency contacts"
      midCrumb={homeTo ? { to: homeTo, label: midLabel } : undefined}
      homeTo={homeTo}
    >
      <div className="log-sos-contacts">
        <div className="log-form-card log-sos-intro">
          <div>
            <h2 className="log-sect" style={{ margin: 0 }}>
              SOS safety
            </h2>
            <p className="log-hint" style={{ margin: "6px 0 0" }}>
              When you press and hold <b>SOS</b>, we send your location once to your
              fleet owner, the Simba Tasker team, the other person on your job, and
              the contacts below (SMS and email). Add up to {MAX_CONTACTS} people.
            </p>
          </div>
          <LogisticsSosButton />
        </div>

        {loading ? (
          <LogisticsFormSkeleton fields={4} label="Loading contacts" />
        ) : (
          <form className="log-form-card" onSubmit={save} noValidate>
            {rows.map((c, i) => (
              <fieldset key={i} className="log-sos-contact">
                <legend>Contact {i + 1}</legend>
                <div className="log-form-grid">
                  <label className="log-field">
                    <span className="log-fl">Name</span>
                    <input
                      value={c.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="e.g. Rudo Moyo"
                      maxLength={80}
                    />
                  </label>
                  <label className="log-field">
                    <span className="log-fl">Relation (optional)</span>
                    <input
                      value={c.relation}
                      onChange={(e) => update(i, { relation: e.target.value })}
                      placeholder="e.g. Spouse, brother"
                      maxLength={40}
                    />
                  </label>
                  <div className="log-field">
                    <span className="log-fl">Mobile (SMS)</span>
                    <LogisticsPhoneInput
                      id={`sos-phone-${i}`}
                      countryCode={c.country_code}
                      phoneNumber={c.phone_number}
                      onChange={(v) => update(i, v)}
                    />
                  </div>
                  <label className="log-field">
                    <span className="log-fl">Email (optional)</span>
                    <input
                      type="email"
                      value={c.email}
                      onChange={(e) => update(i, { email: e.target.value })}
                      placeholder="name@example.com"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  onClick={() =>
                    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [blank()]))
                  }
                >
                  Remove
                </button>
              </fieldset>
            ))}
            <div className="log-sos-actions">
              {rows.length < MAX_CONTACTS ? (
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  onClick={() => setRows((prev) => [...prev, blank()])}
                >
                  Add another contact
                </button>
              ) : null}
              <button type="submit" className="logistics-cta logistics-cta--primary" disabled={saving}>
                {saving ? "Saving…" : "Save contacts"}
              </button>
            </div>
          </form>
        )}
      </div>
    </LogisticsPageShell>
  );
}
