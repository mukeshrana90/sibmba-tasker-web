import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { isPlanBucketFull } from "../utils/logisticsPlan";

const BUCKET_LABEL = {
  vehicles: "Trucks",
  cabs: "Cabs",
  equipment: "Equipment",
  operators: "Operators",
};

/**
 * Plan + usage strip for owner pages (Fleet, Operators). Re-fetches on `refreshKey`;
 * `onLoaded(subscription)` lets the page react to limits (e.g. lock the add form).
 */
export default function LogisticsPlanBanner({
  buckets = ["vehicles", "cabs", "equipment", "operators"],
  refreshKey = 0,
  onLoaded,
}) {
  const dispatch = useDispatch();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    let alive = true;
    dispatch(LogisticsActions.getSubscription()).then((res) => {
      if (alive && res?.payload?.success) {
        setSub(res.payload.data);
        onLoaded?.(res.payload.data);
      }
    });
    return () => {
      alive = false;
    };
    // onLoaded is a notification hook — re-fetch only on refreshKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, refreshKey]);

  if (!sub?.plan) return null;
  // Any plan without unit limits counts as "paid" styling; lowest-ranked plan shows Upgrade
  const unlimited = ["vehicles", "cabs", "equipment"].every((k) => sub.plan.limits?.[k] == null);
  const paid = Number(sub.plan.price?.amount) > 0;
  const topRank = Math.max(...(sub.plans || []).map((p) => p.rank ?? 0), 0);
  const canUpgrade = (sub.plan.rank ?? 0) < topRank;
  const locked = Number(sub.plan_locked_units) || 0;
  return (
    <>
    <div className={`log-plan-banner${paid ? " is-paid" : ""}`} role="status">
      <span className="log-plan-banner__plan">
        <b>{sub.plan.name} plan</b>
        <small>
          {unlimited ? "Unlimited fleet" : "Limits apply"}
          {sub.expires_at ? ` · ends ${new Date(sub.expires_at).toLocaleDateString()}` : ""}
        </small>
      </span>
      <span className="log-plan-banner__meters">
        {buckets.map((k) => {
          const max = sub.plan.limits?.[k];
          const used = sub.usage?.[k] ?? 0;
          const full = max != null && used >= max;
          return (
            <span key={k} className={`log-plan-banner__meter${full ? " is-full" : ""}`}>
              <small>{BUCKET_LABEL[k]}</small>
              <b>
                {used}
                {max != null ? ` / ${max}` : ""}
                {max == null ? <em> · ∞</em> : null}
              </b>
              {max != null ? (
                <i style={{ width: `${Math.min(100, (used / max) * 100)}%` }} aria-hidden="true" />
              ) : null}
            </span>
          );
        })}
      </span>
      {canUpgrade ? (
        <Link className="logistics-cta logistics-cta--primary log-plan-banner__cta" to="/logistics/owner/subscription">
          Upgrade plan
        </Link>
      ) : (
        <Link className="log-plan-banner__link" to="/logistics/owner/subscription">
          Manage plan
        </Link>
      )}
    </div>
    {locked ? (
      <div className="log-plan-locked-strip" role="alert">
        <b>
          {locked} unit{locked === 1 ? " is" : "s are"} disabled by your plan limit
        </b>
        <span>— hidden from customers; their operators can't go online or quote.</span>
        <Link to="/logistics/owner/subscription">Choose active units →</Link>
      </div>
    ) : null}
    </>
  );
}

/** Toast helper for PLAN_LIMIT errors: message + click to open plans. */
export function isPlanLimitError(payload) {
  return payload?.data?.code === "PLAN_LIMIT";
}


export { isPlanBucketFull };
