import { setActiveModule } from "./Roles";

/**
 * Normalize Tasker login `{ ...user, token }` and Logistics `{ token, user }`.
 */
export function normalizeAuthPayload(payload) {
  const data = payload?.data;
  if (!data || typeof data !== "object") return null;
  if (data.user && data.token) {
    return { ...data.user, token: data.token };
  }
  return data;
}

export function persistLogisticsSession(user) {
  if (user?.owner_id) {
    localStorage.setItem("owner_id", String(user.owner_id));
  } else {
    localStorage.removeItem("owner_id");
  }
  if (Array.isArray(user?.permissions)) {
    localStorage.setItem(
      "logisticsPermissions",
      JSON.stringify(user.permissions)
    );
  }
  const paid =
    Number(user?.isSubscribed) === 1 || user?.isSubscribed === true ? "1" : "0";
  localStorage.setItem("isSubscribed", paid);
  if (user?.subscription_holder) {
    localStorage.setItem(
      "logisticsSubscriptionHolder",
      String(user.subscription_holder)
    );
  }
  setActiveModule("logistics");
}

export function persistTaskerSession() {
  localStorage.removeItem("owner_id");
  setActiveModule("tasker");
}
