import Modal from "react-bootstrap/Modal";
import { getLocationSettingsInstructions } from "../../utils/landingGeocode";

export default function LocationPermissionModal({
  show,
  onHide,
  onAllow,
  blocked = false,
  loading = false,
}) {
  const instructions = getLocationSettingsInstructions();

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="location-permission-modal"
    >
      <Modal.Header closeButton className="border-none pb-0">
        <Modal.Title>Allow location access</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="location-permission-pop">
          <p className="location-permission-lead">
            Nearby search needs your location to find providers close to you.
          </p>
          {blocked ? (
            <p className="location-permission-help">{instructions}</p>
          ) : (
            <p className="location-permission-help">
              Tap <strong>Allow location</strong> and choose Allow when your
              browser asks.
            </p>
          )}
          <div className="location-permission-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAllow}
              disabled={loading}
            >
              {loading ? "Checking…" : "Allow location"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onHide}
              disabled={loading}
            >
              Not now
            </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
