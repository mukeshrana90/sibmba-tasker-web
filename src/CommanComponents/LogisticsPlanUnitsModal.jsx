import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { useLogisticsConfig } from "./useLogisticsConfig";
import { LogisticsListSkeleton } from "./LogisticsSkeleton";

const BUCKETS = [
  { k: "vehicles", label: "Logistic trucks" },
  { k: "cabs", label: "Cabs" },
  { k: "equipment", label: "Non-logistic equipment" },
];

function unitMeta(u) {
  const bits = [];
  if (u.registration) bits.push(u.registration);
  bits.push(u.rating?.count ? `${Number(u.rating.average).toFixed(1)} ★ (${u.rating.count})` : "No reviews");
  bits.push(`${u.completed_jobs || 0} job${u.completed_jobs === 1 ? "" : "s"}`);
  if (u.createdAt) bits.push(`added ${new Date(u.createdAt).toLocaleDateString()}`);
  return bits.join(" · ");
}

/**
 * Pick which units stay active on a plan with limits.
 * `focus` ("vehicles" | "cabs" | "equipment" | "operators") opens one row of
 * the plan usage: only that bucket is listed (read-only when everything fits),
 * while saving still keeps the owner's picks for the other buckets.
 * Operators are never disabled by a plan, so "operators" lists the seats
 * (operators + pending invites) read-only with a link to the Operators page.
 * Preselects the server's automatic pick (owner's saved choice, else best
 * rating → most jobs → first added). Confirm returns the chosen ids; any
 * slot left empty is filled automatically by the server.
 */
export default function LogisticsPlanUnitsModal({
  open,
  planId,
  title,
  message,
  confirmLabel = "Save",
  focus = null,
  operatorLimit,
  busy = false,
  onCancel,
  onConfirm,
}) {
  const dispatch = useDispatch();
  const { cabEnabled } = useLogisticsConfig();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState({});
  const [seats, setSeats] = useState(null);
  const operatorsView = focus === "operators";

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    if (operatorsView) {
      dispatch(LogisticsActions.listSubUsers()).then((res) => {
        if (!alive) return;
        const d = res?.payload?.data || {};
        const ops = Array.isArray(d.operators) ? d.operators : Array.isArray(d.drivers) ? d.drivers : [];
        setSeats({ operators: ops, invites: Array.isArray(d.invites) ? d.invites : [] });
        setLoading(false);
      });
      return () => {
        alive = false;
        window.removeEventListener("keydown", onKey);
      };
    }
    dispatch(LogisticsActions.getPlanUnits(planId)).then((res) => {
      if (!alive) return;
      const data = res?.payload?.success ? res.payload.data : null;
      setPreview(data);
      const next = {};
      BUCKETS.forEach(({ k }) => {
        next[k] = (data?.buckets?.[k]?.units || [])
          .filter((u) => u.will_be_active)
          .map((u) => String(u._id));
      });
      setPicked(next);
      setLoading(false);
    });
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId, focus]);

  // Only buckets with a limit and more units than it need a choice
  const choiceBuckets = useMemo(
    () =>
      BUCKETS.filter(({ k }) => {
        // Cab service off → cabs can't be used anyway; the server keeps its own pick
        if (k === "cabs" && !cabEnabled) return false;
        const b = preview?.buckets?.[k];
        return b && b.limit != null && b.total > b.limit;
      }),
    [preview, cabEnabled]
  );

  // Focused row: that bucket only — shown even when all its units fit
  const focusBucket = focus && focus !== "operators" ? BUCKETS.find((b) => b.k === focus) : null;
  const shownBuckets = focusBucket
    ? preview?.buckets?.[focusBucket.k]
      ? [focusBucket]
      : []
    : choiceBuckets;
  const isChoice = (k) => choiceBuckets.some((b) => b.k === k);
  const canSave = !operatorsView && shownBuckets.some(({ k }) => isChoice(k));

  if (!open) return null;

  const toggle = (bucket, id, limit) => {
    setPicked((prev) => {
      const cur = prev[bucket] || [];
      if (cur.includes(id)) return { ...prev, [bucket]: cur.filter((x) => x !== id) };
      // Full: replace the oldest pick so the click always does something
      const next = cur.length >= limit ? [...cur.slice(1), id] : [...cur, id];
      return { ...prev, [bucket]: next };
    });
  };

  const submit = (e) => {
    e.preventDefault();
    const ids = choiceBuckets.flatMap(({ k }) => picked[k] || []);
    onConfirm?.(ids);
  };

  return (
    <div className="log-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="log-modal__backdrop"
        aria-label="Close"
        onClick={() => !busy && onCancel?.()}
      />
      <form className="log-modal__sheet log-plan-units" onSubmit={submit}>
        <div className="log-modal__head">
          <h2>{title}</h2>
          {message ? <p>{message}</p> : null}
        </div>
        <div className="log-modal__body">
          {/* Skeleton until the first response too (no empty frame before the fetch starts) */}
          {loading || (operatorsView ? !seats : !preview) ? (
            <LogisticsListSkeleton rows={3} media={false} label="Loading your units" />
          ) : null}
          {!loading && operatorsView && seats ? (
            <fieldset className="log-plan-units__bucket">
              <legend>
                Operator seats
                <span className={operatorLimit != null && seats.operators.length + seats.invites.length >= operatorLimit ? "is-full" : ""}>
                  {seats.operators.length + seats.invites.length}
                  {operatorLimit != null ? ` / ${operatorLimit}` : ""} used
                </span>
              </legend>
              {seats.operators.length + seats.invites.length ? (
                <ul>
                  {seats.operators.map((op) => (
                    <li key={op._id}>
                      <div className="log-plan-units__unit is-on">
                        <span className="log-plan-units__text">
                          <b>{op.full_name || op.email}</b>
                          <small>{[op.email, op.phone_number].filter(Boolean).join(" · ")}</small>
                        </span>
                        <span className="log-plan-units__state is-on">Operator</span>
                      </div>
                    </li>
                  ))}
                  {seats.invites.map((inv) => (
                    <li key={inv._id}>
                      <div className="log-plan-units__unit">
                        <span className="log-plan-units__text">
                          <b>{inv.full_name || inv.email}</b>
                          <small>{[inv.email, inv.phone_number].filter(Boolean).join(" · ")}</small>
                        </span>
                        <span className="log-plan-units__state">Invite pending</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="log-plan-units__none">No operators yet.</p>
              )}
              <p className="log-hint">
                Your plan never switches operators off — they can always log in. Pending invites use a
                seat too. To free a seat, remove an operator or cancel an invite on the Operators page.
              </p>
            </fieldset>
          ) : null}
          {!loading && !operatorsView && !shownBuckets.length ? (
            <p className="log-plan-units__none">
              ✓ All your units fit in the {preview?.plan_name || "selected"} plan — nothing will be disabled.
            </p>
          ) : null}
          {!loading &&
            !operatorsView &&
            shownBuckets.map(({ k, label }) => {
              const b = preview.buckets[k];
              const choice = isChoice(k);
              // Nothing to choose (fits / unlimited): every unit stays active
              const chosen = choice ? picked[k] || [] : b.units.map((u) => String(u._id));
              if (!b.units.length) {
                return (
                  <p key={k} className="log-plan-units__none">
                    No {label.toLowerCase()} yet.
                  </p>
                );
              }
              return (
                <fieldset key={k} className="log-plan-units__bucket">
                  <legend>
                    {label}
                    <span className={b.limit != null && chosen.length === b.limit ? "is-full" : ""}>
                      {chosen.length}
                      {b.limit != null ? ` / ${b.limit}` : ""} active
                    </span>
                  </legend>
                  <ul>
                    {b.units.map((u) => {
                      const id = String(u._id);
                      const on = chosen.includes(id);
                      return (
                        <li key={id}>
                          <label className={`log-plan-units__unit${on ? " is-on" : ""}`}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggle(k, id, b.limit)}
                              disabled={busy || !choice}
                            />
                            <span className="log-plan-units__text">
                              <b>{u.name}</b>
                              <small>{unitMeta(u)}</small>
                            </span>
                            <span className={`log-plan-units__state${on ? " is-on" : ""}`}>
                              {on ? "Active" : "Disabled"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {!choice ? (
                    <p className="log-plan-units__none">
                      ✓ All your {label.toLowerCase()} fit in the {preview?.plan_name || "current"} plan —
                      every one stays active.
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          {!loading && canSave ? (
            <p className="log-hint">
              Disabled units are hidden from customers and their operators are set offline and can't
              quote with them (operators can still log in). Empty slots are filled automatically:
              best rating, then most jobs, then first added.
            </p>
          ) : null}
          <div className="log-reason-modal__actions">
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={onCancel}
              disabled={busy}
            >
              {focus && !canSave ? "Close" : "Go back"}
            </button>
            {operatorsView ? (
              <Link className="logistics-cta logistics-cta--primary" to="/logistics/owner/operators">
                Manage operators
              </Link>
            ) : !focus || canSave ? (
              <button
                type="submit"
                className="logistics-cta logistics-cta--primary"
                disabled={busy || loading}
              >
                {busy ? "Please wait…" : confirmLabel}
              </button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
