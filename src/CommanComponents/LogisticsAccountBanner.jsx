import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Api from "../Services/api";

// v2.7.36 — admin account state for owners / operators, from GET /logistics/me
// (user.account = { banned, reason, banned_at, scope: "owner"|"fleet", fleet_verified }).
// One shared request; refreshed on focus and when an account notification arrives.
let cache = null;
let cacheAt = 0;
let inflight = null;
const listeners = new Set();

function load(force = false) {
  if (!force && cache && Date.now() - cacheAt < 30000) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = Api.get("/logistics/me")
    .then((r) => {
      cache = r?.data?.data?.user?.account || null;
      cacheAt = Date.now();
      listeners.forEach((fn) => fn(cache));
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useLogisticsAccount() {
  const [account, setAccount] = useState(cache);
  useEffect(() => {
    listeners.add(setAccount);
    load();
    const onFocus = () => load();
    const onNotif = (e) => {
      if (/ACCOUNT/.test(String(e?.detail?.type || ""))) load(true);
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("simba:logistics_notification", onNotif);
    return () => {
      listeners.delete(setAccount);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("simba:logistics_notification", onNotif);
    };
  }, []);
  return account;
}

/** Shown above every owner / operator page while Simba admin has restricted the fleet. */
export default function LogisticsAccountBanner({ isDriver }) {
  const account = useLogisticsAccount();
  const support = isDriver ? "/logistics/driver/support" : "/logistics/owner/support";
  // v2.7.36: admin suspension / account being closed (self or the fleet owner)
  if (account?.suspended || account?.deletion_pending) {
    return (
      <div className="log-callout log-callout--danger log-account-banner" role="alert">
        <p>
          <strong>{account.deletion_pending ? "This account is being closed by Simba admin." : "Account suspended by Simba admin."}</strong>{" "}
          {account.restriction_message || "You can browse and finish work already in progress, but you can't start anything new."}
        </p>
        <Link className="logistics-cta logistics-cta--ghost" to={support}>
          Contact Simba admin
        </Link>
      </div>
    );
  }
  if (!account?.banned) return null;
  return (
    <div className="log-callout log-callout--danger log-account-banner" role="alert">
      <p>
        <strong>
          {account.scope === "fleet"
            ? "Your fleet owner's account is restricted by Simba admin."
            : "Your account is restricted by Simba admin."}
        </strong>{" "}
        {account.scope === "fleet"
          ? "You can finish jobs already in progress, but you can't go live or take new jobs."
          : "Your units are hidden from customers and new jobs can't be accepted. Jobs already in progress can still be finished."}
        {account.scope !== "fleet" && account.reason ? <> Reason: {account.reason}.</> : null}
      </p>
      <Link className="logistics-cta logistics-cta--ghost" to={support}>
        Contact Simba admin
      </Link>
    </div>
  );
}
