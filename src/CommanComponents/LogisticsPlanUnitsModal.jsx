import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { useLogisticsConfig } from "./useLogisticsConfig";

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
  busy = false,
  onCancel,
  onConfirm,
}) {
  const dispatch = useDispatch();
  const { cabEnabled } = useLogisticsConfig();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState({});

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
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
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId]);

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
          {loading ? <p className="logistics-empty">Loading your units…</p> : null}
          {!loading && !choiceBuckets.length ? (
            <p className="log-plan-units__none">
              ✓ All your units fit in the {preview?.plan_name || "selected"} plan — nothing will be disabled.
            </p>
          ) : null}
          {!loading &&
            choiceBuckets.map(({ k, label }) => {
              const b = preview.buckets[k];
              const chosen = picked[k] || [];
              return (
                <fieldset key={k} className="log-plan-units__bucket">
                  <legend>
                    {label}
                    <span className={chosen.length === b.limit ? "is-full" : ""}>
                      {chosen.length} / {b.limit} active
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
                              disabled={busy}
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
                </fieldset>
              );
            })}
          {!loading && choiceBuckets.length ? (
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
              Go back
            </button>
            <button
              type="submit"
              className="logistics-cta logistics-cta--primary"
              disabled={busy || loading}
            >
              {busy ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
