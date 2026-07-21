import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import LocationPermissionModal from "../CommanComponents/Modals/LocationPermissionModal";
import {
  beginDeviceLocationRequest,
  clearDeviceLocation,
  getGeolocationErrorMessage,
  getLocationSettingsInstructions,
  queryGeolocationPermission,
} from "../utils/landingGeocode";

function hintBlockedFromPermissionQuery(setPermissionBlocked) {
  queryGeolocationPermission().then((state) => {
    if (state === "denied") {
      setPermissionBlocked(true);
    }
  });
}

export function useNearbyLocationToggle({ onEnabled, onDisabled }) {
  const [loading, setLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState("");
  const gpsPendingRef = useRef(false);

  const finishWithCoords = useCallback(
    (coords) => {
      gpsPendingRef.current = false;
      setShowPermissionModal(false);
      setPermissionBlocked(false);
      setModalStatus("");
      onEnabled?.(coords);
    },
    [onEnabled]
  );

  const openBlockedModal = useCallback((message = "") => {
    clearDeviceLocation();
    setPermissionBlocked(true);
    setModalStatus(
      message ||
        "Location is blocked. Follow the steps below, then tap Allow location again."
    );
    setShowPermissionModal(true);
  }, []);

  const handleLocationError = useCallback(
    (err, { fromModal = false, setBusy = setLoading } = {}) => {
      gpsPendingRef.current = false;
      setBusy(false);
      if (err?.code === 1) {
        if (fromModal) {
          openBlockedModal(getLocationSettingsInstructions());
          toast.error(
            "Location is blocked in your browser. Use the steps in the popup, then try again."
          );
        } else {
          openBlockedModal();
        }
        return;
      }
      toast.error(getGeolocationErrorMessage(err));
    },
    [openBlockedModal]
  );

  const startGps = useCallback(
    ({ fromModal = false, setBusy = setLoading } = {}) => {
      if (gpsPendingRef.current) return;
      gpsPendingRef.current = true;
      setBusy(true);
      if (!fromModal) {
        setPermissionBlocked(false);
        setModalStatus("");
      }
      hintBlockedFromPermissionQuery(setPermissionBlocked);

      beginDeviceLocationRequest(
        (coords) => {
          setBusy(false);
          finishWithCoords(coords);
        },
        (err) => handleLocationError(err, { fromModal, setBusy })
      );
    },
    [finishWithCoords, handleLocationError]
  );

  const requestNearby = useCallback(() => {
    startGps({ fromModal: false, setBusy: setLoading });
  }, [startGps]);

  const handleToggle = useCallback(
    (e, isCurrentlyOn) => {
      e.preventDefault();
      e.stopPropagation();
      if (isCurrentlyOn) {
        onDisabled?.();
        return;
      }
      requestNearby();
    },
    [onDisabled, requestNearby]
  );

  const retryFromModal = useCallback(() => {
    startGps({ fromModal: true, setBusy: setModalLoading });
  }, [startGps]);

  const permissionModal = (
    <LocationPermissionModal
      show={showPermissionModal}
      onHide={() => {
        setShowPermissionModal(false);
        setModalStatus("");
      }}
      onAllow={retryFromModal}
      blocked={permissionBlocked}
      loading={modalLoading}
      statusMessage={modalStatus}
    />
  );

  return { loading, handleToggle, permissionModal };
}
