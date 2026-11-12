import { useState } from "react";
import LogisticsFaceCamera from "./LogisticsFaceCamera";

/** Face photo slot shared by the operator form and the owner-operator setup: live camera only. */
export default function LogisticsFacePhotoField({
  preview,
  canRemove = false,
  onCapture,
  onRemove,
  hint,
  label = "Face photo",
  required = true,
  locked = false,
  lockedNote = "",
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="log-field log-field--full" data-field="profile_photo">
      <span className="log-fl">
        {label}
        {required ? <span className="log-req"> *</span> : null}
      </span>
      <div className="log-photo-slots">
        {preview ? (
          <div className="log-photo-slot log-photo-slot--filled" data-testid="face-photo-preview">
            <img src={preview} alt={label} />
            {canRemove ? (
              <button type="button" className="log-photo-slot__remove" aria-label="Remove photo" onClick={onRemove}>
                ×
              </button>
            ) : null}
          </div>
        ) : null}
        {locked ? null : (
          <button
            type="button"
            className="log-photo-slot log-photo-slot--add log-face-photo-take"
            onClick={() => setOpen(true)}
            data-testid="face-photo-take"
          >
            <span className="log-photo-slot__plus" aria-hidden="true">+</span>
            <span className="log-photo-slot__label">{preview ? "Retake" : "Take photo"}</span>
          </button>
        )}
      </div>
      {locked && lockedNote ? <p className="log-hint" data-testid="face-photo-locked">{lockedNote}</p> : null}
      {hint && !locked ? <p className="log-hint">{hint}</p> : null}
      {locked ? null : <LogisticsFaceCamera show={open} onHide={() => setOpen(false)} onCapture={onCapture} />}
    </div>
  );
}
