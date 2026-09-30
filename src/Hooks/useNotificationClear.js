import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";

export default function useNotificationClear() {
  const dispatch = useDispatch();
  const [clearing, setClearing] = useState(false);

  const clearOne = useCallback(
    async (notificationId) => {
      if (!notificationId) return;
      const res = await dispatch(CustomerActions.clearNotification(notificationId));
      if (CustomerActions.clearNotification.fulfilled.match(res)) {
        return true;
      }
      toast.error(res?.payload?.message || "Could not clear notification");
      return false;
    },
    [dispatch]
  );

  const clearAll = useCallback(async () => {
    setClearing(true);
    try {
      const res = await dispatch(CustomerActions.clearAllNotifications());
      if (CustomerActions.clearAllNotifications.fulfilled.match(res)) {
        toast.success("All notifications cleared");
        return true;
      }
      toast.error(res?.payload?.message || "Could not clear notifications");
      return false;
    } finally {
      setClearing(false);
    }
  }, [dispatch]);

  return { clearOne, clearAll, clearing };
}
