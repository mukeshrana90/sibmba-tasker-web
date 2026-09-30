import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import "./logistics.css";

/**
 * Lightweight placeholders for sidebar destinations not fully built yet.
 */
export default function LogisticsSupplyPlaceholder({
  title,
  lead,
  homeTo,
  midLabel = "Logistics",
}) {
  return (
    <LogisticsPageShell
      title={title}
      crumbLabel={title}
      midCrumb={{ to: homeTo, label: midLabel }}
      homeTo={homeTo}
    >
      <div className="log-form-card">
        <p className="log-op-lead" style={{ maxWidth: 520 }}>
          {lead ||
            "This section is part of the Logistics supply workspace and will be expanded next."}
        </p>
      </div>
    </LogisticsPageShell>
  );
}
