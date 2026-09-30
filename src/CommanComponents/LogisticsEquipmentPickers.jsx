import { useEffect } from "react";
import {
  categoryLabel,
  getEquipmentCatalog,
  getSubtypesForEquipment,
} from "./logisticsEquipmentCatalog";
import { useLogisticsEquipmentTaxonomy } from "./useLogisticsEquipmentTaxonomy";

function EquipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 17h12l2-6H8l-2 6zM8 11V7h6v4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

export function LogisticsPickField({
  label,
  value,
  placeholder,
  onClick,
  required = false,
  className = "",
}) {
  return (
    <div className={`log-field log-field--pick${className ? ` ${className}` : ""}`}>
      <span className="log-fl">
        {label}
        {required ? <span className="log-req"> *</span> : null}
      </span>
      <button type="button" className="log-pick-field" onClick={onClick}>
        <span className={value ? "" : "is-ph"}>{value || placeholder}</span>
        <span className="log-pick-field__chev" aria-hidden="true">
          ▾
        </span>
      </button>
    </div>
  );
}

export function EquipmentPickerModal({ open, category, onClose, onSelect }) {
  const { byHub } = useLogisticsEquipmentTaxonomy();
  const catalog = getEquipmentCatalog(category, byHub);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="log-modal" role="dialog" aria-modal="true" aria-label={catalog.title}>
      <button type="button" className="log-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="log-modal__sheet">
        <div className="log-modal__head">
          <div>
            <h2>{catalog.title || `${categoryLabel(category)} equipment`}</h2>
            <p>{catalog.lead}</p>
          </div>
          <button type="button" className="log-modal__close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="log-modal__body">
          {(catalog.sections || []).map((section) => (
            <div key={section.heading} className="log-eq-sect">
              <div className="log-eq-sect__title">{section.heading}</div>
              <div className="log-eq-grid">
                {(section.items || []).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="log-eq-tile"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <span className="log-eq-tile__pic">
                      <EquipIcon />
                    </span>
                    <b>{item}</b>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SubtypePickerModal({ open, equipment, category, onClose, onSelect }) {
  const { byHub } = useLogisticsEquipmentTaxonomy();
  const catalog = getEquipmentCatalog(category, byHub);
  const options = getSubtypesForEquipment(equipment, catalog);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="log-modal" role="dialog" aria-modal="true" aria-label="Sub type">
      <button type="button" className="log-modal__backdrop" aria-label="Close" onClick={onClose} />
      <div className="log-modal__sheet log-modal__sheet--narrow">
        <div className="log-modal__head">
          <div>
            <h2>{equipment || "Equipment"} · sub type</h2>
            <p>
              Based on Equipment = {equipment || "—"}. Size band makes search and
              hire matching more accurate.
            </p>
          </div>
          <button type="button" className="log-modal__close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="log-modal__body">
          <div className="log-subpick">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="log-subpick__opt"
                onClick={() => {
                  onSelect(opt.label);
                  onClose();
                }}
              >
                <span className="log-subpick__pic">
                  <EquipIcon />
                </span>
                <span>
                  <b>{opt.label}</b>
                  <p>{opt.detail}</p>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
