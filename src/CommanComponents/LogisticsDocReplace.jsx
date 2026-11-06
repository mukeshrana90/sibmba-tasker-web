import { useState } from "react";
import { DOC_ACCEPT, keepAllowedFiles } from "../utils/uploadLimits";
import { docNeedsReplace, tomorrowYmd } from "../utils/docExpiry";
import LogisticsDateInput from "./LogisticsDateInput";

/**
 * Item 18: one-tap "Replace document" on a rejected or expired document. Picks
 * the file, asks for the new expiry date when the type has one, then uploads
 * only that file (it goes back to Pending check).
 * onUpload(file, expires) resolves true when saved.
 */
export default function LogisticsDocReplace({ doc, type, label, needsExpiry = false, onUpload }) {
  const [file, setFile] = useState(null);
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  if (!docNeedsReplace(doc)) return null;

  const send = async (f, date) => {
    setBusy(true);
    try {
      const ok = await onUpload(f, date);
      if (ok) {
        setFile(null);
        setExpires("");
      }
    } finally {
      setBusy(false);
    }
  };

  if (file) {
    return (
      <div className="log-doc-replace__confirm" data-testid="doc-replace-confirm">
        <p className="log-hint">
          {file.name} · pick the {String(label || "document").toLowerCase()} expiry date
        </p>
        <LogisticsDateInput
          pickerOnly
          value={expires}
          min={tomorrowYmd()}
          onChange={(e) => setExpires(e.target.value)}
        />
        <div className="log-doc-replace__btns">
          <button
            type="button"
            className="logistics-cta logistics-cta--primary"
            data-testid="doc-replace-upload"
            disabled={busy || !expires}
            onClick={() => send(file, expires)}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={busy}
            onClick={() => setFile(null)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      className={`logistics-cta logistics-cta--primary log-doc-replace${busy ? " is-busy" : ""}`}
      data-testid="doc-replace"
      data-doc-type={type}
    >
      <input
        type="file"
        accept={DOC_ACCEPT}
        hidden
        disabled={busy}
        onChange={(e) => {
          const [f] = keepAllowedFiles(e.target.files);
          e.target.value = "";
          if (!f) return;
          if (needsExpiry) setFile(f);
          else send(f, "");
        }}
      />
      {busy ? "Uploading…" : "Replace document"}
    </label>
  );
}

/** Line under a document: "Optional — …" warning from the API (only compulsory documents block). */
export function DocWarning({ doc }) {
  if (!doc?.warning) return null;
  return <small className="log-doc-row__warn" data-testid="doc-warning">{doc.warning}</small>;
}
