import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";

/** "Last known · 1 Oct, 11:15" for a server fallback position, else "". */
export function sosLocationNote(alert) {
  const loc = alert?.location;
  if (!loc || loc.kind !== "last_known") return "";
  const at = loc.captured_at ? new Date(loc.captured_at).toLocaleString() : "time unknown";
  return `Last known position (not live) · ${at}`;
}

function who(alert) {
  const u = alert.user || {};
  const phone = [u.country_code, u.phone_number].filter(Boolean).join(" ");
  return [u.full_name || "User", phone].filter(Boolean).join(" · ");
}

/**
 * Owner dashboard: red live banner for open / acknowledged SOS alerts
 * (dashboard recent_alerts). Acknowledge, then Resolve with a note.
 */
export default function LogisticsSosBanner({ alerts = [], onChanged }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(null);
  const [notes, setNotes] = useState({});
  if (!alerts.length) return null;

  const act = async (alert, kind) => {
    setBusy(alert._id);
    try {
      const res =
        kind === "ack"
          ? await dispatch(LogisticsActions.ackSos(alert._id))
          : await dispatch(
              LogisticsActions.resolveSos({ id: alert._id, note: notes[alert._id] || "" })
            );
      if (res?.payload?.success) {
        toast.success(kind === "ack" ? "Acknowledged — they were told you're responding" : "SOS resolved");
        onChanged?.();
      } else {
        toast.error(res?.payload?.message || "Could not update");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="log-sos-banner" role="alert" aria-live="assertive">
      <div className="log-sos-banner__head">
        <span className="log-sos-dot log-sos-dot--pulse" aria-hidden="true" />
        <b>
          {alerts.length === 1 ? "SOS emergency" : `${alerts.length} SOS emergencies`}
        </b>
        <Link to="/logistics/owner/sos">SOS log</Link>
      </div>
      <ul>
        {alerts.map((a) => (
          <li key={a._id} className="log-sos-banner__row">
            <div className="log-sos-banner__info">
              <b>
                {who(a)} <span className="log-sos-banner__role">({a.role})</span>
              </b>
              <p>
                {a.asset ? `${a.asset.name || "Unit"}${a.asset.registration ? ` · ${a.asset.registration}` : ""} · ` : ""}
                {a.job_number ? (
                  <Link to={`/logistics/owner/job/${a.job_id}`}>Job #{a.job_number}</Link>
                ) : (
                  "No active job"
                )}
                {" · "}
                {new Date(a.createdAt).toLocaleString()}
                {a.status === "acknowledged" ? " · Acknowledged" : ""}
              </p>
              {a.map_url ? (
                <>
                  <a href={a.map_url} target="_blank" rel="noreferrer">
                    Open location in Maps
                  </a>
                  {sosLocationNote(a) ? (
                    <span className="log-sos-banner__locnote"> · {sosLocationNote(a)}</span>
                  ) : null}
                </>
              ) : (
                <span>Location not shared yet — it appears here as soon as their phone sends it</span>
              )}
            </div>
            <div className="log-sos-banner__actions">
              {a.status === "open" ? (
                <button
                  type="button"
                  className="logistics-cta logistics-cta--primary"
                  disabled={busy === a._id}
                  onClick={() => act(a, "ack")}
                >
                  Acknowledge
                </button>
              ) : null}
              <input
                type="text"
                placeholder="Resolution note"
                value={notes[a._id] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [a._id]: e.target.value }))}
                aria-label="Resolution note"
              />
              <button
                type="button"
                className="logistics-cta logistics-cta--ghost"
                disabled={busy === a._id}
                onClick={() => act(a, "resolve")}
              >
                Resolved
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
