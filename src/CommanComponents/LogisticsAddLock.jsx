import { Link } from "react-router-dom";
import { useCompanyApproval } from "./LogisticsAccountBanner";

// v2.7.66: one verification, so owners build the whole package before Simba checks it. The old
// lock returns only when built with REACT_APP_LOGISTICS_ADD_REQUIRES_APPROVAL=true.

/** true while the signed-in owner's company is pending / rejected (false while loading). */
export function useAddLocked() {
  const approval = useCompanyApproval();
  if (process.env.REACT_APP_LOGISTICS_ADD_REQUIRES_APPROVAL !== "true") return false;
  return approval === "pending" || approval === "rejected";
}

export const ADD_LOCKED_TITLE = "Available after Simba Tasker approves your company";

/** Shown instead of an add form while the company waits for approval. */
export default function LogisticsAddLock({ what = "equipment" }) {
  const approval = useCompanyApproval();
  const thing = what === "operators" ? "invite operators" : "add equipment";
  return (
    <div
      className={`log-callout ${approval === "rejected" ? "log-callout--danger" : "log-callout--warn"} log-locked-add`}
      role="status"
      data-locked={what}
    >
      <p>
        <strong>{ADD_LOCKED_TITLE}.</strong>{" "}
        {approval === "rejected"
          ? `Simba Tasker couldn't approve your company yet — upload corrected business documents, then you can ${thing}.`
          : `Simba Tasker is checking your business documents. You can ${thing} as soon as your company is approved.`}
      </p>
      <Link className="logistics-cta logistics-cta--ghost" to="/logistics/owner/verification">
        Business documents
      </Link>
    </div>
  );
}
