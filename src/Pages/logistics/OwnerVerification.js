import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { BusinessDocsPanel } from "../../CommanComponents/LogisticsBusinessDocs";
import useDocDeepLink from "../../Hooks/useDocDeepLink";
import "./logistics.css";

// Company documents for the Simba approval (29 Oct 2026). Owners land here after a
// skipped sign-up step 2, a Google / Apple / app sign-up, and to re-upload after a rejection.
export default function OwnerVerification() {
  useDocDeepLink();
  return (
    <LogisticsPageShell
      title="Business documents"
      crumbLabel="Business documents"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <BusinessDocsPanel />
    </LogisticsPageShell>
  );
}
