import { useEffect, useRef, useState } from "react";

const MAX_LEN = 500;

/**
 * On-brand replacement for window.prompt when a reason is needed
 * (reject / cancel a logistics job). Uses the shared .log-modal styles.
 */
export default function LogisticsReasonModal({
  open,
  title,
  message,
  label = "Reason",
  placeholder = "Tell the other side why…",
  required = false,
  confirmLabel = "Confirm",
  cancelLabel = "Go back",
  tone = "danger",
  busy = false,
  // Plain confirm (no reason box), e.g. plan switch
  hideReason = false,
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setReason("");
    setError("");
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const value = reason.trim();
    if (required && !value) {
      setError("Please enter a reason");
      inputRef.current?.focus();
      return;
    }
    onConfirm?.(value);
  };

  return (
    <div className="log-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="log-modal__backdrop"
        aria-label="Close"
        onClick={() => !busy && onCancel?.()}
      />
      <form
        className={`log-modal__sheet log-modal__sheet--narrow log-reason-modal log-reason-modal--${tone}`}
        onSubmit={submit}
      >
        <div className="log-modal__head">
          <div className="log-reason-modal__head">
            <span className="log-reason-modal__icon" aria-hidden="true">
              !
            </span>
            <div>
              <h2>{title}</h2>
              {message ? <p>{message}</p> : null}
            </div>
          </div>
        </div>
        <div className="log-modal__body">
          {!hideReason ? (
          <>
          <label className="log-field">
            <span className="log-fl">
              {label}
              {required ? <span className="log-req"> *</span> : " (optional)"}
            </span>
            <textarea
              ref={inputRef}
              rows={4}
              maxLength={MAX_LEN}
              value={reason}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
            />
          </label>
          <div className="log-reason-modal__meta">
            {error ? (
              <span className="log-field-error">{error}</span>
            ) : (
              <span />
            )}
            <span className="log-hint">
              {reason.length}/{MAX_LEN}
            </span>
          </div>
          </>
          ) : null}
          <div className="log-reason-modal__actions">
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className={`logistics-cta ${
                tone === "danger"
                  ? "logistics-cta--danger log-reason-modal__confirm"
                  : "logistics-cta--primary"
              }`}
              disabled={busy}
            >
              {busy ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
