import { Link } from "react-router-dom";
import { useLogisticsAccount } from "./LogisticsAccountBanner";
import { whatsappPackText, whatsappExtrasLabel } from "../utils/ownerOperator";

export { whatsappPackText, whatsappExtrasLabel };

/** Countdown line. Pass `whatsapp`, or it reads the signed-in account. */
export default function LogisticsWhatsappExtras({ whatsapp, upgradeLink = true, className = "" }) {
  const account = useLogisticsAccount();
  const wa = whatsapp || account?.whatsapp;
  const label = whatsappExtrasLabel(wa);
  if (!label) return null;
  const isOwner = !localStorage.getItem("owner_id");
  const ended = wa.source !== "paid" && !wa.extras_active && wa.trial_status !== "not_started";
  const soon = wa.source === "trial" && wa.extras_active && Number(wa.trial_days_left) <= 14;
  return (
    <p
      className={`log-wa-extras${soon || ended ? " is-soon" : ""}${className ? ` ${className}` : ""}`}
      data-testid="whatsapp-extras-countdown"
      data-source={wa.source}
    >
      <span>{label}</span>
      {upgradeLink && isOwner && (soon || ended) ? (
        <Link to="/logistics/owner/subscription" data-testid="whatsapp-extras-upgrade">
          Upgrade
        </Link>
      ) : null}
    </p>
  );
}
