import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Api from "../Services/api";

/**
 * Profile → "WhatsApp notifications" (v2.7.50). On by default; off → job alerts,
 * document reminders and account notices come in-app / push / email (and SMS
 * where a flow already sends one) — never WhatsApp. Fleet owners and operators
 * get WhatsApp only on a paid fleet plan (`/me` notifications.whatsapp_available).
 */
export default function LogisticsWhatsappNotifyCard() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const role = localStorage.getItem("role");
  const isOwner = role === "4" && !localStorage.getItem("owner_id");

  useEffect(() => {
    if (!localStorage.getItem("token")) return undefined;
    let live = true;
    Api.get("/logistics/me", { skipErrorToast: true })
      .then((r) => {
        const n = r?.data?.data?.user?.notifications;
        if (live && n) setPrefs(n);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!prefs) return null;
  const available = prefs.whatsapp_available !== false;
  const on = available && !!prefs.whatsapp;

  const toggle = async (next) => {
    setSaving(true);
    try {
      const r = await Api.patch("/logistics/me", { notifications: { whatsapp: next } });
      const n = r?.data?.data?.user?.notifications;
      if (r?.data?.success === false || !n) throw new Error(r?.data?.message || "Couldn't save");
      setPrefs(n);
      toast.success(next ? "WhatsApp notifications on" : "WhatsApp notifications off");
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`log-wa-profile${available ? "" : " log-wa-profile--locked"}`} data-testid="wa-notify-card">
      <div>
        <b>WhatsApp notifications</b>
        <p className="mb-0">
          {available ? (
            prefs.whatsapp ? (
              "Job updates, codes and reminders also come on WhatsApp. Turn off to get them only in the app, by push and email."
            ) : (
              "Off — you get job updates in the app, by push and email (and SMS where needed), not on WhatsApp."
            )
          ) : (
            <>
              WhatsApp notifications are on paid fleet plans. On the Free plan you and your operators get updates in the app, by push and
              email.{" "}
              {isOwner ? <Link to="/logistics/owner/subscription">See plans</Link> : "Ask your fleet owner about a paid plan."}
            </>
          )}
        </p>
      </div>
      {/* Own switch (not a checkbox): the site-wide input[type=checkbox] styles draw a tick into Bootstrap switches */}
      <div className="log-switch-wrap">
        <button
          type="button"
          role="switch"
          id="wa-notify-switch"
          aria-checked={on}
          aria-label="WhatsApp notifications"
          className={`log-switch${on ? " is-on" : ""}`}
          disabled={!available || saving}
          onClick={() => toggle(!on)}
        >
          <span className="log-switch__knob" aria-hidden="true" />
        </button>
        <span className="log-switch__state" aria-hidden="true">
          {on ? "On" : "Off"}
        </span>
      </div>
    </div>
  );
}
