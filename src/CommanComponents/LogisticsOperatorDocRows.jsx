import { buildPublicAssetUrl } from "../utils/ImagePath";
import {
  OPERATOR_COMPLIANCE_TYPES,
  docExpiryChip,
  docReviewChip,
  docRuleHint,
  fmtExpiry,
  tomorrowYmd,
} from "../utils/docExpiry";
import { DOC_ACCEPT, keepAllowedFiles } from "../utils/uploadLimits";
import LogisticsDateInput from "./LogisticsDateInput";
import LogisticsDocReplace, { DocWarning } from "./LogisticsDocReplace";

export function publicUrl(path) {
  if (!path) return null;
  let normalized = String(path).replace(/\\/g, "/").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (normalized.startsWith("http") || normalized.startsWith("blob:")) {
    return normalized;
  }
  const absPublic = normalized.indexOf("/public/");
  if (absPublic !== -1) {
    normalized = normalized.slice(absPublic + "/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return buildPublicAssetUrl(normalized);
}

/** Licence / medical rows, shared by the operator form and the owner-operator setup. */
export default function LogisticsOperatorDocRows({ items, docs, onPick, onExpiry, onReplace }) {
  return (
    <ul className="log-doc-list">
      {items.map((d) => {
        const entry = docs[d.id];
        const fileLabel =
          entry?.name || entry?.file?.name || (entry?.url ? "On file" : null);
        const existingHref = entry?.url ? publicUrl(entry.url) : null;
        // Item 9: the expiry is compulsory only once a file is attached
        const attached = Boolean(entry?.file || entry?.url);
        const needsExpiry = OPERATOR_COMPLIANCE_TYPES.includes(d.id);
        return (
          <li key={d.id} className="log-doc-row" data-field={`doc-${d.id}`} data-doc-anchor={d.id}>
            <span className="log-doc-row__icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M7 3h7l5 5v13H7V3Z" />
                <path d="M14 3v5h5" />
              </svg>
            </span>
            <span className="log-doc-row__body">
              <b>{d.label}</b>
              {d.id === "licence" || d.id === "medical" ? (
                <small className="log-doc-row__rule">{docRuleHint(d.id, { operator: true })}</small>
              ) : null}
              <p>
                {fileLabel
                  ? `${fileLabel}${
                      entry?.expires ? ` · expires ${fmtExpiry(entry.expires)}` : ""
                    }`
                  : d.hint}
                {existingHref && !entry?.file ? (
                  <>
                    {" · "}
                    <a href={existingHref} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </>
                ) : null}
              </p>
              <DocWarning doc={entry} />
            </span>
            {entry?.url || entry?.file ? (
              <span className={`log-chip log-chip--${docExpiryChip(entry?.expires).tone}`}>
                {docExpiryChip(entry?.expires).label}
              </span>
            ) : null}
            {entry?.url && !entry?.file && docReviewChip(entry.review) ? (
              <span
                className={`log-chip log-chip--${docReviewChip(entry.review).tone} log-doc-review`}
                data-review={entry.review?.status}
              >
                {docReviewChip(entry.review).label}
              </span>
            ) : null}
            <label className="log-doc-row__expiry">
              <span>
                Expiry date
                {needsExpiry && attached ? <span className="log-req"> *</span> : null}
              </span>
              <LogisticsDateInput
                pickerOnly
                value={entry?.expires || ""}
                onChange={(e) => onExpiry?.(d.id, e.target.value)}
                required={needsExpiry && attached}
                min={tomorrowYmd()}
              />
              {attached && !entry?.expires && needsExpiry ? (
                <span className="log-field-error">Expiry date is required</span>
              ) : null}
            </label>
            {onReplace && entry?.url && !entry?.file ? (
              <LogisticsDocReplace
                doc={entry}
                type={d.id}
                label={d.label}
                needsExpiry={needsExpiry}
                onUpload={(file, expires) => onReplace(d.id, file, expires)}
              />
            ) : null}
            <label
              className="log-doc-row__add"
              title={fileLabel ? "Replace file" : "Upload"}
            >
              <input
                type="file"
                accept={DOC_ACCEPT}
                hidden
                onChange={(e) => {
                  const [f] = keepAllowedFiles(e.target.files);
                  if (f) onPick(d.id, f);
                  e.target.value = "";
                }}
              />
              {fileLabel ? "↻" : "+"}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
