import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryGlyph } from "./LogisticsFormIcons";

const PLANT_KEYS = ["agricultural", "construction", "industrial"];

/** Category tile a unit belongs to: logistic | cab | agricultural | construction | industrial. */
export function unitCategory(a) {
  if (a?.kind === "cab") return "cab";
  if (a?.kind === "equipment") {
    const s = String(a.services?.[0] || "").toLowerCase();
    return PLANT_KEYS.includes(s) ? s : "agricultural";
  }
  return "logistic";
}

const CATEGORY_LABEL = {
  logistic: "Logistic truck",
  cab: "Cab",
  agricultural: "Agricultural equipment",
  construction: "Construction equipment",
  industrial: "Industrial equipment",
};
const GROUP_LABEL = {
  logistic: "Logistic trucks",
  cab: "Cabs",
  agricultural: "Agricultural equipment",
  construction: "Construction equipment",
  industrial: "Industrial equipment",
};
const GROUP_ORDER = ["logistic", "cab", "agricultural", "construction", "industrial"];

/** Unit switched off by the owner (plan limit or by hand) — not selectable. */
export function unitDisabled(a) {
  return Number(a?.is_active) === 0;
}

function unitMeta(a) {
  const cat = unitCategory(a);
  const kind =
    cat === "cab" && a.cab_class
      ? `Cab · ${a.cab_class.charAt(0).toUpperCase()}${a.cab_class.slice(1)}`
      : CATEGORY_LABEL[cat];
  return [a.registration, kind].filter(Boolean).join(" · ");
}

/**
 * Operator "Using now" picker (v2.7.34): each unit with its category icon,
 * grouped by category; units the owner switched off are listed last under
 * "Disabled by your owner — not selectable" and can't be picked.
 * Replaces a native <select> (options there can't show icons).
 */
export default function LogisticsUnitPicker({ units = [], value, onChange, disabled = false, id }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const usable = useMemo(() => units.filter((a) => !unitDisabled(a)), [units]);
  const off = useMemo(() => units.filter(unitDisabled), [units]);
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((cat) => ({ cat, items: usable.filter((a) => unitCategory(a) === cat) })).filter(
        (g) => g.items.length
      ),
    [usable]
  );
  // Keyboard order = usable units in group order
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selected = units.find((a) => String(a._id) === String(value)) || null;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const i = flat.findIndex((a) => String(a._id) === String(value));
    setActive(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector(`[data-unit-id="${flat[active]?._id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, flat]);

  const pick = (a) => {
    if (!a || unitDisabled(a)) return;
    onChange?.(String(a._id));
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(flat[active]);
    }
  };

  const row = (a, { off: isOff = false } = {}) => {
    const sel = String(a._id) === String(value);
    const hot = !isOff && flat[active] && String(flat[active]._id) === String(a._id);
    return (
      <li
        key={a._id}
        role="option"
        data-unit-id={a._id}
        aria-selected={sel}
        aria-disabled={isOff || undefined}
        className={`log-unit-pick__opt${sel ? " is-selected" : ""}${hot ? " is-active" : ""}${isOff ? " is-off" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => pick(a)}
        onMouseEnter={() => !isOff && setActive(flat.findIndex((x) => String(x._id) === String(a._id)))}
      >
        <span className={`log-unit-pick__icon log-unit-pick__icon--${unitCategory(a)}`} aria-hidden="true">
          <CategoryGlyph type={unitCategory(a)} size={18} />
        </span>
        <span className="log-unit-pick__text">
          <b>{a.name || "Unit"}</b>
          <small>{unitMeta(a)}</small>
        </span>
        {isOff ? (
          <span className="log-unit-pick__chip">{a.plan_locked ? "Owner's plan limit" : "Disabled by owner"}</span>
        ) : sel ? (
          <span className="log-unit-pick__check" aria-hidden="true">✓</span>
        ) : null}
      </li>
    );
  };

  return (
    <div className={`log-unit-pick${open ? " is-open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="log-unit-pick__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Using now: ${selected ? selected.name : "none selected"}`}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        {selected ? (
          <>
            <span className={`log-unit-pick__icon log-unit-pick__icon--${unitCategory(selected)}`} aria-hidden="true">
              <CategoryGlyph type={unitCategory(selected)} size={18} />
            </span>
            <span className="log-unit-pick__text">
              <b>{selected.name || "Unit"}</b>
              <small>{unitMeta(selected)}</small>
            </span>
          </>
        ) : (
          <span className="log-unit-pick__text log-unit-pick__placeholder">
            {usable.length ? "Select the unit you are using" : "No usable unit — all disabled by your owner"}
          </span>
        )}
        <span className="log-unit-pick__caret" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="log-unit-pick__list" role="listbox" aria-label="Using now" ref={listRef}>
          {groups.map((g) => (
            <li key={g.cat} role="presentation" className="log-unit-pick__group">
              <span className="log-unit-pick__group-label">{GROUP_LABEL[g.cat]}</span>
              <ul role="group" aria-label={GROUP_LABEL[g.cat]}>
                {g.items.map((a) => row(a))}
              </ul>
            </li>
          ))}
          {off.length ? (
            <li role="presentation" className="log-unit-pick__group log-unit-pick__group--off">
              <span className="log-unit-pick__group-label">Disabled by your owner — not selectable</span>
              <ul role="group" aria-label="Disabled by your owner — not selectable">
                {off.map((a) => row(a, { off: true }))}
              </ul>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
