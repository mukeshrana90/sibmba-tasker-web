import { Link } from "react-router-dom";
import { fmtExpiry } from "../utils/docExpiry";

function line(d) {
  if (d.status === "expired") return `${d.label} expired ${fmtExpiry(d.expires)}`;
  if (d.status === "today") return `${d.label} expires today`;
  if (d.status === "no_expiry") return `${d.label}: no expiry date set`;
  if (d.status === "required") return `${d.label} not uploaded`;
  return `${d.label} expires in ${d.days_left} day${d.days_left === 1 ? "" : "s"} (${fmtExpiry(d.expires)})`;
}

/**
 * Owner dashboard: "Documents needing attention" (dashboard.document_alerts).
 * Expired unit docs hide the unit; expired operator licence / medical stop the
 * operator going live or quoting.
 */
export function OwnerDocAlertsCard({ alerts }) {
  const items = alerts?.items || [];
  if (!items.length) return null;
  return (
    <section className={`log-doc-alerts${alerts.expired || alerts.required ? " is-danger" : ""}`}>
      <div className="log-doc-alerts__head">
        <b>Documents needing attention</b>
        <span>
          {alerts.required ? `${alerts.required} required · ` : ""}
          {alerts.expired ? `${alerts.expired} expired · ` : ""}
          {alerts.expiring ? `${alerts.expiring} expiring soon` : ""}
          {alerts.missing_expiry ? `${alerts.expired || alerts.expiring ? " · " : ""}${alerts.missing_expiry} without expiry` : ""}
        </span>
      </div>
      <ul>
        {items.slice(0, 8).map((d, i) => (
          <li key={`${d.subject}-${d.asset_id || d.operator_id}-${d.type}-${i}`} className={`is-${d.status}`}>
            <span>
              <b>{d.name}</b> · {line(d)}
              {(d.status === "expired" || d.status === "required") && d.blocking !== false
                ? d.subject === "unit"
                  ? " — hidden from customers"
                  : " — can't go live or quote"
                : d.status === "expired"
                  ? " — supporting document"
                  : ""}
            </span>
            <Link
              to={
                d.subject === "unit"
                  ? `/logistics/owner/fleet/${d.asset_id}`
                  : "/logistics/owner/operators"
              }
            >
              {d.status === "expired" || d.status === "no_expiry" || d.status === "required" ? "Update" : "View"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Operator dashboard: my licence / medical status. */
export function OperatorDocBanner({ compliance }) {
  // v2.7.49: only the licence blocks; an expired medical is a reminder
  const expired = (compliance?.expired || []).filter((d) => d.blocking !== false);
  const expiring = [...(compliance?.expiring || []), ...(compliance?.expired || []).filter((d) => d.blocking === false)];
  if (!expired.length && !expiring.length) return null;
  return (
    <div className={`log-callout ${expired.length ? "log-callout--danger" : "log-callout--warn"}`} style={{ marginBottom: 14 }}>
      <p>
        {expired.length ? (
          <>
            <strong>You can&apos;t go live or quote:</strong>{" "}
            {expired.map((d) => `${d.label} expired ${fmtExpiry(d.expires)}`).join("; ")}. Ask
            your company to upload the renewed document.
          </>
        ) : (
          <>
            <strong>Renew soon:</strong> {expiring.map(line).join("; ")}. Send the renewed
            document to your company before it expires.
          </>
        )}
      </p>
    </div>
  );
}
