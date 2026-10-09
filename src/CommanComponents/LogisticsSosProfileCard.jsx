import { Link } from "react-router-dom";
import LogisticsSosButton from "./LogisticsSosButton";
import { canUseSos, emergencyContactsPath } from "../utils/logisticsSos";

/** Profile → "Logistics safety (SOS)": hold-to-confirm SOS + emergency contacts link. */
export default function LogisticsSosProfileCard() {
  if (!canUseSos()) return null;
  return (
    <div className="log-sos-profile">
      <div>
        <b>Logistics safety (SOS)</b>
        <p className="mb-0">
          Hold SOS in an emergency to alert the fleet owner, Simba and your
          emergency contacts.{" "}
          <Link to={emergencyContactsPath()}>Emergency contacts</Link>
        </p>
      </div>
      <LogisticsSosButton />
    </div>
  );
}
