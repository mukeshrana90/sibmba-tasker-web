import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Api from "../Services/api";

// v2.7.36 — admin account state for owners / operators, from GET /logistics/me
// (user.account = { banned, reason, banned_at, scope: "owner"|"fleet", fleet_verified,
// approval: { status: "pending"|"approved"|"rejected", reason } (v2.7.49) }).
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
      const user = r?.data?.data?.user;
      // 30 Oct 2026: required business documents still missing (owners only)
      cache = user?.account
        ? {
            ...user.account,
            business_docs_missing: user.business_docs?.missing || [],
            // owner onboarding popup (30 Oct 2026)
            company_name: user.company_name || "",
            logistics_base: user.logistics_base || null,
            // v2.7.61: owner-operator state and the WhatsApp trial countdown
            owner_operator: user.owner_operator || null,
            logistics_self_operator: Boolean(user.logistics_self_operator),
            whatsapp: user.whatsapp || null,
          }
        : null;
      cacheAt = Date.now();
      // Item 4: chat is open in the trial or on Paid, without touching isSubscribed
      try {
        localStorage.setItem("logisticsChatExtras", user?.whatsapp?.extras_active ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      listeners.forEach((fn) => fn(cache));
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Reload the account state (e.g. after business documents were uploaded). */
export function refreshLogisticsAccount() {
  return load(true);
}

/** Current account state; loads it when needed (route guards). */
export function loadLogisticsAccount() {
  return load();
}

/** Approval status of the signed-in owner's company: "approved" | "pending" | "rejected" | null (loading). */
export function useCompanyApproval() {
  const account = useLogisticsAccount();
  if (!account) return null;
  return account.approval?.status || "approved";
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
  // v2.7.49: new company waiting for (or refused) Simba approval
  const approval = account?.approval?.status;
  if (!account?.banned && (approval === "pending" || approval === "rejected")) {
    const fleet = account.scope === "fleet";
    return (
      <div
        className={`log-callout ${approval === "rejected" ? "log-callout--danger" : "log-callout--warn"} log-account-banner log-approval-banner`}
        role="status"
        data-approval={approval}
      >
        <p>
          <strong>
            {approval === "pending"
              ? fleet
                ? "Your fleet owner's company is waiting for Simba approval."
                : "Your company is waiting for Simba approval."
              : fleet
                ? "Your fleet owner's company wasn't approved by Simba."
                : "Simba couldn't approve your company."}
          </strong>{" "}
          {approval === "pending"
            ? fleet
              ? "You can't go live or take jobs until Simba approves it."
              : "Add your business documents, units and operators so Simba can check everything at once."
            : fleet
              ? "You can't go live or take jobs until it's approved."
              : `${account.approval.reason ? `Reason: ${account.approval.reason}. ` : ""}Upload corrected business documents — Simba will check them again.`}
        </p>
        {!fleet ? (
          <Link className="logistics-cta logistics-cta--ghost log-approval-banner__docs" to="/logistics/owner/verification">
            {approval === "rejected" ? "Upload corrected documents" : "Business documents"}
          </Link>
        ) : null}
        {approval === "rejected" ? (
          <Link className="logistics-cta logistics-cta--ghost" to={support}>
            Contact Simba admin
          </Link>
        ) : null}
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
