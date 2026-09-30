import {
  CategoryGlyph,
  IconCheck,
  IconGrid,
  LogFieldLabel,
} from "./LogisticsFormIcons";
import { useLogisticsConfig } from "./useLogisticsConfig";

const CATEGORIES = [
  { id: "logistic", label: "Logistic", shortLabel: "Truck", icon: "logistic" },
  {
    id: "agricultural",
    label: "Agricultural",
    shortLabel: "Agri",
    icon: "agricultural",
  },
  {
    id: "construction",
    label: "Construction",
    shortLabel: "Build",
    icon: "construction",
  },
  {
    id: "industrial",
    label: "Industrial",
    shortLabel: "Plant",
    icon: "industrial",
  },
];

// Shown only when backend CAB_SERVICE_ENABLED=true (session config)
const CAB_CATEGORY = { id: "cab", label: "Cab", shortLabel: "Cab", icon: "cab" };

export default function LogisticsCategoryTiles({
  value,
  onChange,
  hint,
  compact = false,
  locked = false,
  lockedHint,
  hideCab = false,
}) {
  const { cabEnabled } = useLogisticsConfig();
  const categories =
    (cabEnabled && !hideCab) || value === "cab" ? [...CATEGORIES, CAB_CATEGORY] : CATEGORIES;
  const defaultHint =
    value === "logistic"
      ? "Logistic = transport / trucks. Plant categories = equipment hire."
      : value === "cab"
        ? "Cab = passenger ride (bike, auto or car) — Now only."
        : "Plant categories = equipment hire. Fields below match this category.";

  return (
    <div
      className={`log-cat-block${compact ? " log-cat-block--compact" : ""}${
        locked ? " log-cat-block--locked" : ""
      }`}
    >
      {compact ? (
        <span className="log-fl">
          Category
          {locked ? <span className="log-cat-block__lock"> · Locked</span> : null}
        </span>
      ) : (
        <LogFieldLabel icon={<IconGrid size={16} />}>
          Category
          {locked ? <span className="log-cat-block__lock"> · Locked</span> : null}
        </LogFieldLabel>
      )}
      <div
        className={`log-catrow${categories.length > 4 ? " log-catrow--5" : ""}`}
      >
        {categories.map((c) => {
          const selected = value === c.id;
          const disabled = locked && !selected;
          return (
            <button
              key={c.id}
              type="button"
              className={`log-cattile${selected ? " on" : ""}${
                disabled ? " is-disabled" : ""
              }`}
              onClick={() => {
                if (disabled || locked) return;
                onChange(c.id);
              }}
              disabled={disabled}
              title={
                locked && !selected
                  ? "Category locked for this direct booking"
                  : c.label
              }
              aria-label={c.label}
              aria-disabled={disabled || locked}
            >
              {selected ? (
                <span className="log-cattile__check" aria-hidden="true">
                  <IconCheck size={12} />
                </span>
              ) : null}
              <span className="log-cattile__pic">
                <CategoryGlyph
                  type={c.icon}
                  size={compact ? 20 : categories.length > 4 ? 22 : 28}
                />
              </span>
              <b>{compact ? c.shortLabel || c.label : c.label}</b>
            </button>
          );
        })}
      </div>
      {!compact ? (
        <p className="log-hint">
          {locked
            ? lockedHint ||
              "Category is fixed because you are booking a specific vehicle or machine."
            : hint || defaultHint}
        </p>
      ) : null}
    </div>
  );
}

export function isCabCategory(cat) {
  return cat === "cab";
}

export function isPlantCategory(cat) {
  return Boolean(cat) && cat !== "logistic" && cat !== "cab";
}

export { CATEGORIES, CAB_CATEGORY };
