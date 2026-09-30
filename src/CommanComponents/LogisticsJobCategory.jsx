import { CATEGORIES, CAB_CATEGORY } from "./LogisticsCategoryTiles";
import { CategoryGlyph } from "./LogisticsFormIcons";
import { useLogisticsConfig } from "./useLogisticsConfig";
import { hubCategoryLabel, jobCategoryKey } from "../utils/jobKind";

/** Small icon + name showing which category tile a job belongs to. */
export function JobCategoryBadge({ job, compact = false }) {
  const key = jobCategoryKey(job);
  const label = key === "cab" ? "Cab" : hubCategoryLabel(key);
  return (
    <span
      className={`log-job-card__cat log-job-card__cat--${key}${
        compact ? " log-job-card__cat--compact" : ""
      }`}
      title={`Category: ${label}`}
    >
      <span className="log-job-card__cat-icon" aria-hidden="true">
        <CategoryGlyph type={key} size={18} />
      </span>
      <small>{label}</small>
    </span>
  );
}

/** "Category" filter select (All + tiles; Cab only while the service is on). */
export function JobCategorySelect({ value, onChange, appliedValue }) {
  const { cabEnabled } = useLogisticsConfig();
  const options =
    cabEnabled || appliedValue === "cab" || value === "cab"
      ? [...CATEGORIES, CAB_CATEGORY]
      : CATEGORIES;
  return (
    <label>
      <span className="log-fl">Category</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filter by category"
      >
        <option value="all">All</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
