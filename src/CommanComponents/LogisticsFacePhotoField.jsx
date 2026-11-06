import { PHOTO_ACCEPT } from "../utils/uploadLimits";

/** Face photo slot shared by the operator form and the owner-operator setup. */
export default function LogisticsFacePhotoField({
  preview,
  canRemove = false,
  onPick,
  onRemove,
  hint,
  label = "Face photo",
  required = true,
}) {
  return (
    <div className="log-field log-field--full" data-field="profile_photo">
      <span className="log-fl">
        {label}
        {required ? <span className="log-req"> *</span> : null}
      </span>
      <div className="log-photo-slots">
        {preview ? (
          <div className="log-photo-slot log-photo-slot--filled">
            <img src={preview} alt={label} />
            {canRemove ? (
              <button
                type="button"
                className="log-photo-slot__remove"
                aria-label="Remove photo"
                onClick={onRemove}
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}
        <label className="log-photo-slot log-photo-slot--add">
          <input type="file" accept={PHOTO_ACCEPT} hidden onChange={onPick} />
          <span className="log-photo-slot__plus">+</span>
          <span className="log-photo-slot__label">{preview ? "Replace" : "Add"}</span>
        </label>
      </div>
      {hint ? <p className="log-hint">{hint}</p> : null}
    </div>
  );
}
