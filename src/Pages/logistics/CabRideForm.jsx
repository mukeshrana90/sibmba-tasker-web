import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsMoneyInput from "../../CommanComponents/LogisticsMoneyInput";
import LogisticsLocationField from "../../CommanComponents/LogisticsLocationField";
import {
  CategoryGlyph,
  IconBolt,
  IconCheck,
  IconChevronRight,
  IconDollar,
  IconSend,
  LogFieldLabel,
} from "../../CommanComponents/LogisticsFormIcons";
import {
  DEFAULT_CAB_CLASSES,
  cabClassMeta,
  useLogisticsConfig,
} from "../../CommanComponents/useLogisticsConfig";
import {
  formatMoneyInputValue,
  parseLogisticsMoney,
} from "../../utils/logisticsMoney";
import { estimateRideFare, formatFare } from "../../utils/cabFare";

/** Cab ride form state from an existing ride job (edit) or a targeted cab (direct book). */
export function cabFormFrom({ job, asset } = {}) {
  return {
    pickup: job?.pickup?.address || "",
    pickup_coords: job?.pickup?.coordinates || null,
    dropoff: job?.dropoff?.address || "",
    dropoff_coords: job?.dropoff?.coordinates || null,
    cab_class: job?.ride?.cab_class || asset?.cab_class || "car",
    passengers: String(job?.ride?.passengers || 1),
    fare:
      job?.budget?.amount != null ? formatMoneyInputValue(job.budget.amount) : "",
    negotiable: job ? job.budget?.negotiable !== false : true,
    note: job?.special_notes || "",
  };
}

/**
 * Cab ride post (hub_category "cab"). Always "Now": nearby cabs of the chosen
 * class are alerted and quote; auto-cancels after the server's cab window.
 */
export default function CabRideForm({ initial, editId, targetAsset, header = null }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { config } = useLogisticsConfig();
  const classes = config.cab_classes || DEFAULT_CAB_CLASSES;
  const minutes = config.cab_now_job_expiry_minutes || config.now_job_expiry_minutes;
  const [form, setForm] = useState(() => initial || cabFormFrom());
  const [saving, setSaving] = useState(false);
  const classLocked = Boolean(targetAsset);
  const meta = cabClassMeta(classes, form.cab_class);
  const maxSeats = Math.min(
    meta?.max_seats || 1,
    targetAsset?.seats ? Number(targetAsset.seats) : Infinity
  );

  const currency = config.cab_fare_currency || "USD";
  // Distance-based fare guide (same formula the server enforces on submit)
  const estimate = useMemo(
    () =>
      estimateRideFare(
        meta,
        form.pickup_coords,
        form.dropoff_coords,
        config.cab_road_distance_factor
      ),
    [meta, form.pickup_coords, form.dropoff_coords, config.cab_road_distance_factor]
  );
  const fareValue = parseLogisticsMoney(form.fare, { field: "Fare" });
  const fareBelowMin =
    Boolean(estimate) && fareValue.ok && fareValue.value < estimate.min_fare - 1e-9;

  // Fare follows the minimum (points / cab type change) until the customer types their own
  const fareTyped = useRef(Boolean(initial?.fare));
  useEffect(() => {
    if (!estimate || fareTyped.current) return;
    setForm((f) => ({ ...f, fare: formatMoneyInputValue(estimate.min_fare) }));
  }, [estimate]);

  const onLocation = (field, coordsField) => ({ address, coords }) =>
    setForm((f) => ({ ...f, [field]: address || "", [coordsField]: coords }));

  const validate = () => {
    if (!form.pickup || !form.pickup_coords) {
      toast.error("Choose the pickup location on the map");
      return false;
    }
    if (!form.dropoff || !form.dropoff_coords) {
      toast.error("Choose the drop-off location on the map");
      return false;
    }
    const pax = Number(form.passengers);
    if (!Number.isInteger(pax) || pax < 1 || pax > maxSeats) {
      toast.error(`Passengers must be 1–${maxSeats} for this cab`);
      return false;
    }
    const fare = parseLogisticsMoney(form.fare, { field: "Fare" });
    if (!fare.ok) {
      toast.error(fare.message);
      return false;
    }
    if (estimate && fare.value < estimate.min_fare - 1e-9) {
      toast.error(
        `Minimum fare for this ${meta?.label || "cab"} ride (~${estimate.distance_km} km) is ${formatFare(
          estimate.min_fare,
          currency
        )}`
      );
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        job_type: "ride",
        hub_category: "cab",
        job_class: "local",
        need_now: true,
        load_type: `Ride · ${meta?.label || "Cab"}`,
        ride: { cab_class: form.cab_class, passengers: Number(form.passengers) },
        pickup: { address: form.pickup, coordinates: form.pickup_coords },
        dropoff: { address: form.dropoff, coordinates: form.dropoff_coords },
        special_notes: form.note,
        budget: {
          amount: parseLogisticsMoney(form.fare, { field: "Fare" }).value,
          currency: "USD",
          negotiable: Boolean(form.negotiable),
        },
        ...(targetAsset && !editId ? { targeted_asset_id: targetAsset._id } : {}),
      };

      if (editId) {
        const res = await dispatch(LogisticsActions.updateJob({ jobId: editId, payload }));
        if (res?.payload?.success) {
          toast.success("Ride updated");
          navigate(`/logistics/jobs/${editId}`);
        } else {
          toast.error(res?.payload?.message || "Could not update ride");
        }
        return;
      }

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      const res = await dispatch(LogisticsActions.createJob(fd));
      if (res?.payload?.success) {
        toast.success(
          targetAsset
            ? "Ride requested — this cab's fleet has been notified"
            : "Ride requested — nearby cabs are being alerted"
        );
        navigate(`/logistics/jobs/${res.payload.data.job._id}`);
      } else {
        toast.error(res?.payload?.message || "Could not request ride");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="log-form-card log-form-card--post" onSubmit={submit} noValidate>
      {header}
      <div className="log-form-grid">
        <div className="log-field log-field--full">
          <LogFieldLabel icon={<CategoryGlyph type="cab" size={16} />} required>
            Cab type
            {classLocked ? <span className="log-cat-block__lock"> · Locked</span> : null}
          </LogFieldLabel>
          <div className="log-when log-when--cab" role="radiogroup" aria-label="Cab type">
            {classes.map((c) => {
              const on = form.cab_class === c.id;
              const disabled = classLocked && !on;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  className={`log-when__opt${on ? " on" : ""}`}
                  onClick={() =>
                    !classLocked &&
                    setForm((f) => ({
                      ...f,
                      cab_class: c.id,
                      passengers: String(Math.min(Number(f.passengers) || 1, c.max_seats)),
                    }))
                  }
                >
                  <span className="log-when__text">
                    <b>{c.label}</b>
                    <small>
                      {c.wheels}-wheeler · up to {c.max_seats} passenger
                      {c.max_seats === 1 ? "" : "s"}
                    </small>
                    {c.fare ? (
                      <small className="log-cab-rate">
                        {currency} {c.fare.min_per_km.toFixed(2)}–{c.fare.max_per_km.toFixed(2)}/km ·
                        min {currency} {c.fare.min_fare.toFixed(2)}
                      </small>
                    ) : null}
                  </span>
                  {on ? (
                    <span className="log-when__check" aria-hidden="true">
                      <IconCheck size={11} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <LogisticsLocationField
          label="Pickup"
          required
          address={form.pickup}
          coords={form.pickup_coords}
          title="Pickup location"
          onChange={onLocation("pickup", "pickup_coords")}
        />
        <LogisticsLocationField
          label="Drop-off"
          required
          address={form.dropoff}
          coords={form.dropoff_coords}
          title="Drop-off location"
          onChange={onLocation("dropoff", "dropoff_coords")}
        />

        <label className="log-field">
          <span className="log-fl">
            Passengers <span className="log-req"> *</span>
          </span>
          <select
            value={form.passengers}
            onChange={(e) => setForm((f) => ({ ...f, passengers: e.target.value }))}
          >
            {Array.from({ length: Number.isFinite(maxSeats) ? maxSeats : 1 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>

        <label className="log-field">
          <LogFieldLabel icon={<IconDollar size={16} />} required>
            Fare
          </LogFieldLabel>
          <LogisticsMoneyInput
            value={form.fare}
            onChange={(next) => {
              fareTyped.current = true;
              setForm((f) => ({ ...f, fare: next }));
            }}
            aria-label="Fare"
            required
          />
          {fareBelowMin ? (
            <span className="log-field-error" role="alert">
              Below the minimum of {formatFare(estimate.min_fare, currency)}
            </span>
          ) : null}
        </label>

        <div className="log-cab-fare log-field--full" aria-live="polite">
          {estimate ? (
            <>
              <div className="log-cab-fare__row">
                <span>Estimated distance</span>
                <b>~{estimate.distance_km} km</b>
              </div>
              <div className="log-cab-fare__row">
                <span>
                  {meta?.label} rate · {currency} {estimate.min_per_km.toFixed(2)}–
                  {estimate.max_per_km.toFixed(2)}/km
                </span>
                <b>
                  {formatFare(estimate.min_fare, currency)} –{" "}
                  {formatFare(estimate.max_fare, currency)}
                </b>
              </div>
              <div className="log-cab-fare__row log-cab-fare__row--min">
                <span>Minimum fare you can offer</span>
                <b>{formatFare(estimate.min_fare, currency)}</b>
              </div>
              <p className="log-hint">
                Minimum = distance × {currency} {estimate.min_per_km.toFixed(2)}/km (at least{" "}
                {formatFare(estimate.fare_floor, currency)}). Offering
                nearer the top of the range gets quicker quotes. Distance is estimated from the
                map points (road ≈ straight line × {config.cab_road_distance_factor || 1.3}).
              </p>
              {fareBelowMin ? (
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  onClick={() =>
                    setForm((f) => ({ ...f, fare: formatMoneyInputValue(estimate.min_fare) }))
                  }
                >
                  Use minimum {formatFare(estimate.min_fare, currency)}
                </button>
              ) : null}
            </>
          ) : (
            <p className="log-hint" style={{ margin: 0 }}>
              Set pickup and drop-off to see the distance and the minimum fare for a{" "}
              {meta?.label || "cab"}.
            </p>
          )}
        </div>

        <div className="log-check-row log-field--full">
          <label className="log-check log-check--row">
            <input
              type="checkbox"
              checked={form.negotiable}
              onChange={(e) => setForm((f) => ({ ...f, negotiable: e.target.checked }))}
            />
            <span>
              Fare negotiable
              <small>
                {form.negotiable
                  ? "Operators can quote above or below your fare."
                  : "Operators must quote this exact fare."}
              </small>
            </span>
          </label>
        </div>

        <label className="log-field log-field--full">
          <span className="log-fl">Note for operator</span>
          <textarea
            rows={2}
            maxLength={300}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Landmark, luggage, etc."
          />
        </label>

        <div className="log-when-now log-field--full">
          <span className="log-when-now__pic">
            <IconBolt size={16} />
          </span>
          <span>
            <b>Ride right now</b>
            {targetAsset
              ? " Only this cab's fleet is alerted."
              : " Nearby cabs of this type are alerted instantly."}{" "}
            Valid for {minutes} minutes — auto-cancels if no quote is accepted.
          </span>
        </div>
      </div>

      <div className="log-form-actions">
        <button
          className="logistics-cta logistics-cta--primary log-form-submit"
          type="submit"
          disabled={saving}
        >
          <IconSend size={18} />
          <span>
            {saving ? (editId ? "Saving…" : "Requesting…") : editId ? "Save changes" : "Request ride"}
          </span>
          {!saving ? <IconChevronRight size={16} /> : null}
        </button>
      </div>
    </form>
  );
}
