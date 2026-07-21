import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import LocationPermissionModal from "../CommanComponents/Modals/LocationPermissionModal";
import {
  clearDeviceLocation,
  getGeolocationErrorMessage,
  readDeviceLocationFromGesture,
} from "../utils/landingGeocode";

export function useNearbyLocationToggle({ onEnabled, onDisabled }) {
  const [loading, setLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const finishWithCoords = useCallback(
    (coords) => {
      setShowPermissionModal(false);
      setPermissionBlocked(false);
      onEnabled?.(coords);
    },
    [onEnabled]
  );

  const handleLocationError = useCallback((err) => {
    if (err?.code === 1) {
      clearDeviceLocation();
      setPermissionBlocked(true);
      setShowPermissionModal(true);
      return;
    }
    toast.error(getGeolocationErrorMessage(err));
  }, []);

  const requestNearby = useCallback(() => {
    setLoading(true);
    setPermissionBlocked(false);
    readDeviceLocationFromGesture()
      .then(finishWithCoords)
      .catch(handleLocationError)
      .finally(() => setLoading(false));
  }, [finishWithCoords, handleLocationError]);

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
    setModalLoading(true);
    readDeviceLocationFromGesture()
      .then(finishWithCoords)
      .catch((err) => {
        if (err?.code === 1) {
          clearDeviceLocation();
          setPermissionBlocked(true);
        } else {
          toast.error(getGeolocationErrorMessage(err));
        }
      })
      .finally(() => setModalLoading(false));
  }, [finishWithCoords]);

  const permissionModal = (
    <LocationPermissionModal
      show={showPermissionModal}
      onHide={() => setShowPermissionModal(false)}
      onAllow={retryFromModal}
      blocked={permissionBlocked}
      loading={modalLoading}
    />
  );

  return { loading, handleToggle, permissionModal };
}
