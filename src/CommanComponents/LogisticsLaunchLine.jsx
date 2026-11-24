import { formatApprovalsFrom, formatZimPhone, useLaunchConfig } from "../utils/logisticsLaunch";

/**
 * 23 Nov (client): "Approvals from 25 Nov 2026 · First 60 days free · simbatasker.com ·
 * WhatsApp +263 786 545 442". Hidden until backend .env LOGISTICS_APPROVALS_FROM_TS is set.
 */
export default function LogisticsLaunchLine({ className = "" }) {
  const c = useLaunchConfig();
  if (!c.approvals_from) return null;
  const wa = c.support_whatsapp ? String(c.support_whatsapp).replace(/[^\d]/g, "") : "";
  return (
    <p className={`log-launch-line ${className}`.trim()} data-testid="logistics-launch-line">
      <span>Approvals from {formatApprovalsFrom(c.approvals_from)}</span>
      <span aria-hidden="true"> · </span>
      <span>First {c.free_days} days free</span>
      <span aria-hidden="true"> · </span>
      <a href="https://simbatasker.com" target="_blank" rel="noreferrer">
        simbatasker.com
      </a>
      {wa ? (
        <>
          <span aria-hidden="true"> · </span>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
            WhatsApp {formatZimPhone(c.support_whatsapp)}
          </a>
        </>
      ) : null}
    </p>
  );
}
