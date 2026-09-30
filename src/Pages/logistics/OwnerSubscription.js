import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsReasonModal from "../../CommanComponents/LogisticsReasonModal";
import LogisticsPlanUnitsModal from "../../CommanComponents/LogisticsPlanUnitsModal";
import "./logistics.css";

const USAGE_ROWS = [
  { k: "operators", label: "Operators" },
  { k: "vehicles", label: "Logistic trucks" },
  { k: "cabs", label: "Cabs" },
  { k: "equipment", label: "Non-logistic equipment" },
];

function limitText(v) {
  return v == null ? "Unlimited" : String(v);
}

function planSummary(p) {
  const l = p?.limits || {};
  const all = ["operators", "vehicles", "cabs", "equipment"].every((k) => l[k] == null);
  const units = all
    ? "Unlimited operators and units"
    : `${limitText(l.operators)} operators, ${limitText(l.vehicles)} trucks, ${limitText(l.cabs)} cabs and ${limitText(l.equipment)} equipment`;
  return p?.featured_in_hub
    ? `${units}, and one truck of your choice is featured in the Hub's “Top logistics providers”.`
    : `${units}.`;
}

function daysLeft(date) {
  if (!date) return null;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

/** Owner plans: Free (default) + priced tiers (demo — no payment yet). Plans come from the API. */
export default function LogisticsOwnerSubscription() {
  const dispatch = useDispatch();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState(null);
  // { planId, mode: "downgrade" | "manage", title, message }
  const [unitsModal, setUnitsModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await dispatch(LogisticsActions.getSubscription());
    if (res?.payload?.success) setSub(res.payload.data);
    else toast.error(res?.payload?.message || "Could not load your plan");
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const switchPlan = async (planId, keepIds) => {
    setSwitching(true);
    try {
      const res = await dispatch(
        LogisticsActions.choosePlan(keepIds ? { plan: planId, keep_asset_ids: keepIds } : planId)
      );
      if (!res?.payload?.success) {
        toast.error(res?.payload?.message || "Could not change plan");
        return;
      }
      const data = res.payload.data;
      setSub(data);
      // Paid-fleet features on the web read this flag
      try {
        localStorage.setItem("isSubscribed", String(data.isSubscribed ?? 0));
      } catch {
        /* storage unavailable */
      }
      toast.success(res.payload.message);
      announceUnitChanges(data);
    } finally {
      setSwitching(false);
      setConfirmPlan(null);
      setUnitsModal(null);
    }
  };

  const announceUnitChanges = (data) => {
    const locked = data?.locked_units || [];
    const unlocked = data?.unlocked_units || [];
    if (locked.length) {
      toast.info(
        `${locked.length} unit${locked.length === 1 ? "" : "s"} disabled by plan limit: ${locked
          .map((u) => u.name)
          .join(", ")}. Their operators were set offline and notified.`
      );
    }
    if (unlocked.length) {
      toast.success(
        `${unlocked.length} unit${unlocked.length === 1 ? "" : "s"} active again: ${unlocked
          .map((u) => u.name)
          .join(", ")}.`
      );
    }
  };

  const saveActiveUnits = async (ids) => {
    setSwitching(true);
    try {
      const res = await dispatch(LogisticsActions.setActivePlanUnits(ids));
      if (!res?.payload?.success) {
        toast.error(res?.payload?.message || "Could not update active units");
        return;
      }
      toast.success(res.payload.message);
      announceUnitChanges(res.payload.data);
      setUnitsModal(null);
      await load();
    } finally {
      setSwitching(false);
    }
  };

  const current = sub?.current_plan;
  const plans = sub?.plans || [];
  const currentRank = sub?.plan?.rank ?? 0;
  const lowestPlan = plans[0];
  const unlimitedNow =
    sub && ["vehicles", "cabs", "equipment"].every((k) => sub.plan.limits?.[k] == null);
  const endsIn = daysLeft(sub?.expires_at);
  const pricedCurrent = Number(sub?.plan?.price?.amount) > 0;

  const pickPlan = (p) => {
    if ((p.rank ?? 0) < currentRank) {
      // Smaller plan: let the owner choose which units stay active
      setUnitsModal({
        planId: p.id,
        mode: "downgrade",
        title: `Switch to ${p.name}?`,
        message: `${planSummary(p)} Choose which units stay active — the rest are disabled and their operators set offline.`,
        confirmLabel: `Switch to ${p.name}`,
      });
      return;
    }
    setConfirmPlan(p);
  };
  return (
    <LogisticsPageShell
      title="Plans & subscription"
      crumbLabel="Subscription"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <div className="log-sub-page">
        {loading && !sub ? <p className="logistics-empty">Loading…</p> : null}

        {sub ? (
          <>
            <section className={`log-sub-current log-sub-current--${current}`}>
              <div>
                <small>Your current plan</small>
                <h2>{sub.plan.name}</h2>
                <p>{planSummary(sub.plan)}</p>
                {sub.expires_at ? (
                  <p className={`log-sub-expiry${endsIn <= 3 ? " is-soon" : ""}`}>
                    {endsIn > 0
                      ? `Ends on ${new Date(sub.expires_at).toLocaleDateString()} (${endsIn} day${endsIn === 1 ? "" : "s"} left).`
                      : "Ends today."}{" "}
                    When it ends you move to {lowestPlan?.name || "Free"} and units above its limits are disabled.
                    {pricedCurrent ? (
                      <button
                        type="button"
                        className="log-sub-expiry__renew"
                        disabled={switching}
                        onClick={() => setConfirmPlan({ ...sub.plan, renew: true })}
                      >
                        Renew
                      </button>
                    ) : null}
                  </p>
                ) : null}
                {sub.plan_locked_units > 0 ? (
                  <div className="log-sub-locked" role="alert">
                    <b>
                      {sub.plan_locked_units} unit{sub.plan_locked_units === 1 ? " is" : "s are"} disabled by your plan limit.
                    </b>
                    <span>Customers can't see them and operators can't go online or quote with them.</span>
                    <button
                      type="button"
                      className="logistics-cta logistics-cta--ghost"
                      onClick={() =>
                        setUnitsModal({
                          planId: current,
                          mode: "manage",
                          title: "Choose active units",
                          message: `Your ${sub.plan.name} plan keeps a limited number of units active. Pick which ones.`,
                          confirmLabel: "Save active units",
                        })
                      }
                    >
                      Choose active units
                    </button>
                  </div>
                ) : unlimitedNow && lowestPlan && lowestPlan.id !== current ? (
                  <button
                    type="button"
                    className="log-sub-keep-link"
                    onClick={() =>
                      setUnitsModal({
                        planId: lowestPlan.id,
                        mode: "manage",
                        title: "If your plan ends…",
                        message: `Pick which units stay active if you move to ${lowestPlan.name}. Unpicked slots use best rating → most jobs → first added.`,
                        confirmLabel: "Save my choice",
                      })
                    }
                  >
                    Choose which units stay active if your plan ends →
                  </button>
                ) : !unlimitedNow ? (
                  <button
                    type="button"
                    className="log-sub-keep-link"
                    onClick={() =>
                      setUnitsModal({
                        planId: current,
                        mode: "manage",
                        title: "Choose active units",
                        message: `Pick which units use your ${sub.plan.name} plan slots.`,
                        confirmLabel: "Save active units",
                      })
                    }
                  >
                    Choose which units are active →
                  </button>
                ) : null}
              </div>
              <dl className="log-sub-usage">
                {USAGE_ROWS.map((r) => {
                  const max = sub.plan.limits?.[r.k];
                  const used = sub.usage?.[r.k] ?? 0;
                  const over = max != null && used > max;
                  const full = max != null && used >= max;
                  return (
                    <div key={r.k} className={`log-sub-usage__row${full ? " is-full" : ""}${over ? " is-over" : ""}`}>
                      <dt>{r.label}</dt>
                      <dd>
                        <b>{used}</b> / {limitText(max)}
                      </dd>
                      <span className="log-sub-usage__bar" aria-hidden="true">
                        <i style={{ width: max == null ? "100%" : `${Math.min(100, (used / Math.max(max, 1)) * 100)}%` }} />
                      </span>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section className="log-sub-plans" aria-label="Plans">
              {sub.plans.map((p) => {
                const isCurrent = p.id === current;
                return (
                  <article key={p.id} className={`log-sub-plan log-sub-plan--${p.id}${isCurrent ? " is-current" : ""}`}>
                    {p.id === plans[plans.length - 1]?.id && plans.length > 1 ? (
                      <span className="log-sub-plan__ribbon">Recommended</span>
                    ) : null}
                    <header>
                      <h3>{p.name}</h3>
                      <p className="log-sub-plan__price">
                        <b>
                          {p.price.currency} {p.price.amount}
                        </b>
                        <span> / {p.price.interval}</span>
                      </p>
                    </header>
                    <ul className="log-sub-plan__limits">
                      <li>
                        <span>Operators</span>
                        <b>{limitText(p.limits.operators)}</b>
                      </li>
                      <li>
                        <span>Logistic trucks</span>
                        <b>{limitText(p.limits.vehicles)}</b>
                      </li>
                      <li>
                        <span>Cabs</span>
                        <b>{limitText(p.limits.cabs)}</b>
                      </li>
                      <li>
                        <span>Non-logistic equipment</span>
                        <b>{limitText(p.limits.equipment)}</b>
                      </li>
                      <li>
                        <span>Hub “Top logistics providers”</span>
                        <b>{p.featured_in_hub ? "Listed" : "—"}</b>
                      </li>
                    </ul>
                    <ul className="log-sub-plan__features">
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span className="log-sub-plan__current">✓ Current plan</span>
                    ) : (
                      <button
                        type="button"
                        className={`logistics-cta ${
                          (p.rank ?? 0) > currentRank ? "logistics-cta--primary" : "logistics-cta--ghost"
                        }`}
                        disabled={switching}
                        onClick={() => pickPlan(p)}
                      >
                        {(p.rank ?? 0) > currentRank ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                      </button>
                    )}
                  </article>
                );
              })}
            </section>

            {sub.demo ? (
              <p className="log-hint log-sub-demo">
                Demo plans — no payment is collected yet. Switching takes effect immediately; a paid
                period lasts {plans.find((p) => p.period_days)?.period_days || 30} days.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <LogisticsReasonModal
        open={Boolean(confirmPlan)}
        title={confirmPlan?.renew ? `Renew ${confirmPlan.name}?` : `Upgrade to ${confirmPlan?.name}?`}
        message={
          confirmPlan?.renew
            ? `Adds another ${confirmPlan.period_days || 30}-day period after the current one ends.`
            : `${planSummary(confirmPlan)} Units disabled by your old plan's limit become active again.`
        }
        confirmLabel={confirmPlan?.renew ? "Renew" : "Upgrade"}
        hideReason
        tone="primary"
        busy={switching}
        onCancel={() => setConfirmPlan(null)}
        onConfirm={() => switchPlan(confirmPlan.id)}
      />

      <LogisticsPlanUnitsModal
        open={Boolean(unitsModal)}
        planId={unitsModal?.planId}
        title={unitsModal?.title}
        message={unitsModal?.message}
        confirmLabel={unitsModal?.confirmLabel}
        busy={switching}
        onCancel={() => setUnitsModal(null)}
        onConfirm={(ids) =>
          unitsModal.mode === "downgrade"
            ? switchPlan(unitsModal.planId, ids.length ? ids : null)
            : saveActiveUnits(ids)
        }
      />
    </LogisticsPageShell>
  );
}
