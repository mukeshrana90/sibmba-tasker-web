import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { emergencyContactsPath } from "../utils/logisticsSos";

const DISMISS_KEY = "simba:sos-contacts-prompt-dismissed";

function dismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Asks customers / operators to add SOS emergency contacts when they have none. */
export default function LogisticsSosContactsPrompt() {
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (dismissed()) return undefined;
    let alive = true;
    dispatch(LogisticsActions.getEmergencyContacts()).then((res) => {
      if (!alive || !res?.payload?.success) return;
      setShow(!(res.payload.data?.contacts || []).length);
    });
    return () => {
      alive = false;
    };
  }, [dispatch]);

  if (!show) return null;
  return (
    <div className="log-callout log-callout--warn log-sos-prompt">
      <p>
        <b>Add emergency contacts for SOS.</b> If you ever press SOS, we&apos;ll
        also text and email them your location.{" "}
        <Link to={emergencyContactsPath()}>Add contacts</Link>
      </p>
      <button
        type="button"
        className="log-modal__close"
        onClick={() => {
          try {
            sessionStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignore */
          }
          setShow(false);
        }}
      >
        Later
      </button>
    </div>
  );
}
