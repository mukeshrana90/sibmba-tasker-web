import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { readBestLocation } from "../utils/deviceGps";
import { emergencyContactsPath } from "../utils/logisticsSos";
import { useLogisticsConfig } from "./useLogisticsConfig";

const HOLD_MS = 3000;

/**
 * Logistics SOS (v2.7.30). Opens a sheet where the user must press and hold
 * for 3 s (no accidental triggers). Then: one GPS ping → POST /logistics/sos
 * → backend alerts the fleet owner, Simba and the
 * user's emergency contacts (push / SMS / email) — never the other party on
 * the job (v2.7.34: they may be the threat).
 *
 * variant: "pill" (red button on job screens / profile) | "menu" (header menu
 * row — opens the sheet through <LogisticsSosHost/> so it isn't hidden with
 * the closing menu).
 */
const OPEN_EVENT = "simba:open-sos";

export default function LogisticsSosButton({ jobId, jobRef, variant = "pill", className = "", onOpen }) {
  const [open, setOpen] = useState(false);
  const label = "SOS";
  return (
    <>
      {variant === "menu" ? (
        <button
          type="button"
          className={`am-item log-sos-menu-item ${className}`}
          role="menuitem"
          onClick={() => {
            onOpen?.();
            window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { jobId } }));
          }}
        >
          <span className="log-sos-dot" aria-hidden="true" />
          SOS emergency
        </button>
      ) : (
        <button
          type="button"
          className={`log-sos-pill ${className}`}
          onClick={() => setOpen(true)}
          aria-label="SOS emergency"
        >
          <span className="log-sos-dot" aria-hidden="true" />
          {label}
        </button>
      )}
      {open ? <LogisticsSosSheet jobId={jobId} jobRef={jobRef} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/**
 * Active-job SOS: an explanation bar in the page plus a floating SOS button
 * that stays on screen whenever the bar is scrolled out of view, so SOS is
 * always one hold away during a job.
 */
export function LogisticsSosJobBar({ jobId, jobRef, children }) {
  const barRef = useRef(null);
  const [barVisible, setBarVisible] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setBarVisible(entry.isIntersecting), {
      threshold: 0.1,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="log-sos-jobbar" ref={barRef}>
        <span>{children}</span>
        <LogisticsSosButton jobId={jobId} jobRef={jobRef} />
      </div>
      {!barVisible ? (
        <button
          type="button"
          className="log-sos-pill log-sos-fab"
          onClick={() => setOpen(true)}
          aria-label="SOS emergency"
        >
          <span className="log-sos-dot" aria-hidden="true" />
          SOS
        </button>
      ) : null}
      {open ? <LogisticsSosSheet jobId={jobId} jobRef={jobRef} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Mount once (Header): renders the SOS sheet opened from header menus. */
export function LogisticsSosHost() {
  const [req, setReq] = useState(null);
  useEffect(() => {
    const onOpen = (e) => setReq({ jobId: e?.detail?.jobId });
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  return req ? <LogisticsSosSheet jobId={req.jobId} onClose={() => setReq(null)} /> : null;
}

const SMS_NUMBER_KEY = "simba:sos_sms_number";

/** SOS SMS body the backend webhook understands: "SOS <lat>,<lng> <job ref>". */
function sosSmsBody(fix, jobRef) {
  return ["SOS", fix ? `${fix.lat.toFixed(5)},${fix.lng.toFixed(5)}` : "", jobRef || ""]
    .filter(Boolean)
    .join(" ");
}

/** sms: link that works on Android and iOS. */
function smsHref(number, body) {
  return `sms:${number}?&body=${encodeURIComponent(body)}`;
}

export function LogisticsSosSheet({ jobId, jobRef, onClose }) {
  const dispatch = useDispatch();
  const [contacts, setContacts] = useState(null); // null = loading
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | holding | sending | sent
  const [result, setResult] = useState(null);
  const [resolving, setResolving] = useState(false);
  // Location is requested as soon as the sheet opens, so the browser's
  // permission prompt appears BEFORE the hold, not while the SOS is sending.
  const [gps, setGps] = useState({ status: "locating", fix: null }); // locating | ok | denied | unavailable
  const gpsPromise = useRef(null);
  const sentAlertId = useRef(null);
  const timer = useRef(null);
  const started = useRef(0);

  // Keep the SOS SMS number for offline use (session config is only readable online)
  const { config } = useLogisticsConfig();
  useEffect(() => {
    const n = config?.sos?.sms_number;
    if (n) {
      try {
        localStorage.setItem(SMS_NUMBER_KEY, n);
      } catch {
        /* ignore */
      }
    }
  }, [config?.sos?.sms_number]);
  const smsNumber = (() => {
    if (config?.sos?.sms_number) return config.sos.sms_number;
    try {
      return localStorage.getItem(SMS_NUMBER_KEY) || "";
    } catch {
      return "";
    }
  })();
  const [offlineFix, setOfflineFix] = useState(null);

  useEffect(() => {
    let alive = true;
    gpsPromise.current = readBestLocation().then((r) => {
      if (alive) setGps({ status: r.fix ? "ok" : r.error || "unavailable", fix: r.fix });
      // SOS already sent without location → attach it to that alert now
      if (r.fix && sentAlertId.current) {
        dispatch(LogisticsActions.addSosLocation({ id: sentAlertId.current, ...r.fix }));
      }
      return r.fix;
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    dispatch(LogisticsActions.getEmergencyContacts()).then((res) => {
      if (alive) setContacts(res?.payload?.data?.contacts || []);
    });
    const onKey = (e) => {
      if (e.key === "Escape" && phase !== "sending") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
      clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(async () => {
    setPhase("sending");
    // Use the fix if it's ready; otherwise wait a little, then send without it
    // (it's attached as soon as it arrives — see the effect above).
    const fix = await Promise.race([
      gpsPromise.current || Promise.resolve(null),
      new Promise((r) => setTimeout(() => r(null), 6000)),
    ]);
    // Offline (no connection, or no answer within 12 s) → offer the SMS fallback
    const goOffline = () => {
      setOfflineFix(fix);
      setPhase("offline");
    };
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      goOffline();
      return;
    }
    const res = await Promise.race([
      dispatch(
        LogisticsActions.triggerSos({
          ...(fix || {}),
          job_id: jobId || undefined,
        })
      ),
      new Promise((r) => setTimeout(() => r({ timedOut: true }), 12000)),
    ]);
    const noServerAnswer =
      res?.timedOut ||
      (res?.meta?.requestStatus === "rejected" && res?.payload?.status_code == null && !res?.payload?.success);
    if (noServerAnswer) {
      goOffline();
      return;
    }
    if (res?.payload?.success) {
      setResult(res.payload.data);
      if (!fix) sentAlertId.current = res.payload.data?.alert?._id || null;
      setPhase("sent");
    } else {
      setPhase("idle");
      setProgress(0);
      toast.error(
        res?.payload?.message ||
          "Couldn't send SOS — check your connection. If you are in danger, call local emergency services."
      );
    }
  }, [dispatch, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startHold = (e) => {
    e.preventDefault();
    if (phase !== "idle") return;
    // Keep the press even if the sheet's layout shifts under the finger
    // (location / contacts lines load in) — only releasing cancels it.
    if (e.pointerId != null && e.currentTarget?.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    setPhase("holding");
    started.current = Date.now();
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timer.current);
        send();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (phase !== "holding") return;
    clearInterval(timer.current);
    setPhase("idle");
    setProgress(0);
  };

  const markSafe = async () => {
    const id = result?.alert?._id;
    if (!id) return onClose?.();
    setResolving(true);
    const res = await dispatch(LogisticsActions.resolveSos({ id, note: "User marked safe" }));
    setResolving(false);
    if (res?.payload?.success) {
      toast.success("Marked safe — everyone alerted was told");
      onClose?.();
    } else {
      toast.error(res?.payload?.message || "Could not update");
    }
  };

  const noContacts = Array.isArray(contacts) && contacts.length === 0;
  const alerted = result?.alerted || {};
  const deg = Math.round(progress * 360);

  return (
    <div className="log-modal log-sos-modal" role="dialog" aria-modal="true" aria-label="SOS emergency">
      <button
        type="button"
        className="log-modal__backdrop"
        aria-label="Close"
        onClick={() => phase !== "sending" && onClose?.()}
      />
      <div className="log-modal__sheet log-modal__sheet--narrow log-sos-sheet">
        <div className="log-modal__head">
          <div>
            <h2>
              {phase === "sent"
                ? "Help is being alerted"
                : phase === "offline"
                  ? "Send SOS by SMS"
                  : "SOS emergency"}
            </h2>
            <p>
              {phase === "sent"
                ? result?.repeated
                  ? "Your SOS is already active — we updated your location."
                  : "We sent your location and details."
                : phase === "offline"
                  ? "You're offline, so the SOS couldn't go over the internet — text it instead."
                  : "Press and hold the button for 3 seconds. We send your location once to your fleet owner, Simba and your emergency contacts."}
            </p>
          </div>
          {phase !== "sending" ? (
            <button type="button" className="log-modal__close" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>

        <div className="log-modal__body">
          {phase === "offline" ? (
            <div className="log-sos-offline">
              <p>
                <strong>No internet connection.</strong> Send your SOS by SMS instead —
                it reaches Simba, your fleet owner and your emergency contacts.
              </p>
              {smsNumber ? (
                <a
                  className="log-sos-pill log-sos-sms-btn"
                  href={smsHref(smsNumber, sosSmsBody(offlineFix || gps.fix, jobRef))}
                >
                  <span className="log-sos-dot" aria-hidden="true" />
                  Send SOS by SMS
                </a>
              ) : (
                <p className="log-sos-note">
                  SMS fallback isn&apos;t set up. Call your local emergency services or your
                  fleet owner now.
                </p>
              )}
              <p className="log-sos-hint">
                Your phone opens a text message with your location
                {jobRef ? " and job reference" : ""} — tap Send.
              </p>
              <div className="log-sos-actions">
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  onClick={() => {
                    setPhase("idle");
                    setProgress(0);
                  }}
                >
                  Try online again
                </button>
              </div>
            </div>
          ) : phase === "sent" ? (
            <>
              <ul className="log-sos-alerted">
                {result?.alert?.role !== "owner" ? (
                  <li className={alerted.owner ? "ok" : "off"}>
                    Fleet owner {alerted.owner ? "alerted" : "— no job owner found"}
                  </li>
                ) : null}
                <li className="ok">Simba Tasker team alerted</li>
                <li className={result?.alert?.location?.lat != null || gps.fix ? "ok" : "off"}>
                  {result?.alert?.location?.kind === "last_known" && !gps.fix
                    ? "Last known location sent (not live)"
                    : result?.alert?.location?.lat != null || gps.fix
                      ? "Your location was sent"
                      : "Location not sent — allow location access"}
                </li>
                <li className={alerted.contacts ? "ok" : "off"}>
                  {alerted.contacts
                    ? `${alerted.contacts} emergency contact${alerted.contacts === 1 ? "" : "s"} alerted by SMS / email`
                    : "No emergency contacts saved"}
                </li>
              </ul>
              {result?.alert?.job_id ? (
                <p className="log-sos-note">
                  {result?.alert?.role === "customer"
                    ? "The operator on your job is not told about this SOS."
                    : "The customer on this job is not told about this SOS."}
                </p>
              ) : null}
              <p className="log-sos-note">
                If your life is in danger, also call your local emergency services.
              </p>
              <div className="log-sos-actions">
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  disabled={resolving}
                  onClick={markSafe}
                >
                  {resolving ? "Updating…" : "I'm safe — close SOS"}
                </button>
                <button type="button" className="logistics-cta logistics-cta--primary" onClick={onClose}>
                  Keep SOS open
                </button>
              </div>
            </>
          ) : (
            <>
              {noContacts ? (
                <div className="log-callout log-callout--warn" style={{ marginBottom: 14 }}>
                  <p>
                    You have no emergency contacts yet — SOS will still alert your fleet
                    owner and Simba.{" "}
                    <Link to={emergencyContactsPath()} onClick={onClose}>
                      Add contacts
                    </Link>
                  </p>
                </div>
              ) : null}
              <p className={`log-sos-gps log-sos-gps--${gps.status}`} role="status">
                {gps.status === "ok"
                  ? `📍 Location ready${gps.fix?.accuracy ? ` (±${Math.round(gps.fix.accuracy)} m)` : ""}`
                  : gps.status === "locating"
                    ? "📍 Getting your location… allow location access if your browser asks"
                    : gps.status === "denied"
                      ? "📍 Location is blocked — allow it in your browser's site settings so we can send where you are. SOS still works without it."
                      : "📍 Location not available right now — SOS still works and we'll use your last known position."}
              </p>
              <div className="log-sos-hold-wrap">
                <button
                  type="button"
                  className={`log-sos-hold${phase === "holding" ? " is-holding" : ""}`}
                  style={{ "--sos-deg": `${deg}deg` }}
                  disabled={phase === "sending"}
                  onPointerDown={startHold}
                  onPointerUp={cancelHold}
                  onPointerCancel={cancelHold}
                  onContextMenu={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if ((e.key === " " || e.key === "Enter") && !e.repeat) startHold(e);
                  }}
                  onKeyUp={(e) => {
                    if (e.key === " " || e.key === "Enter") cancelHold();
                  }}
                  aria-label="Press and hold for 3 seconds to send SOS"
                >
                  <span className="log-sos-hold__inner">
                    {phase === "sending"
                      ? "Sending…"
                      : phase === "holding"
                        ? `${Math.max(1, Math.ceil((1 - progress) * (HOLD_MS / 1000)))}`
                        : "SOS"}
                  </span>
                </button>
                <p className="log-sos-hint">
                  {phase === "holding" ? "Keep holding…" : "Press and hold for 3 seconds"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
