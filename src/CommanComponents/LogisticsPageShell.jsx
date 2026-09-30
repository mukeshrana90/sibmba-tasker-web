import SimbaPageBanner from "./SimbaPageBanner";
import { getAppHomePath } from "../utils/appHomePath";

function isSupplyShell({ homeTo, midCrumb, hideBanner }) {
  if (hideBanner === true) return true;
  if (hideBanner === false) return false;
  const home = String(homeTo || "");
  const mid = String(midCrumb?.label || "");
  return (
    home.includes("/logistics/owner") ||
    home.includes("/logistics/driver") ||
    mid === "Owner" ||
    mid === "Operator"
  );
}

/**
 * Logistics content chrome.
 * Hub/customer: title banner + breadcrumbs.
 * Owner/operator supply: no banner (sidebar already labels the section).
 */
export default function LogisticsPageShell({
  title,
  crumbLabel,
  children,
  midCrumb = { to: "/logistics", label: "Logistics" },
  homeTo,
  hideBanner,
}) {
  const supply = isSupplyShell({ homeTo, midCrumb, hideBanner });
  const resolvedHome = homeTo ?? getAppHomePath();

  return (
    <div
      className={`simba-page p-logistics-hub${
        supply ? " p-logistics-supply" : ""
      }`}
    >
      {!supply ? (
        <SimbaPageBanner
          title={title}
          crumbLabel={crumbLabel || title}
          homeTo={resolvedHome}
          midCrumb={midCrumb}
          variant="logistics"
        />
      ) : null}
      <main className="page">
        <div className="wrap logistics-hub-wrap">{children}</div>
      </main>
    </div>
  );
}

export { isSupplyShell };
