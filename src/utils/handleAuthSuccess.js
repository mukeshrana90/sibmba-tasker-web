import { toast } from "react-toastify";
import {
  consumeAuthReturnUrl,
  resolvePostLoginPath,
} from "./authRedirect";
import {
  normalizeAuthPayload,
  persistLogisticsSession,
  persistTaskerSession,
} from "./authSession";
import { expiresAt } from "./CommonFunction";
import { Roles } from "./Roles";
import { autoCompleteCustomerProfile } from "./customerProfileAutoComplete";
import { persistUserId, otpVerificationPath } from "./normalizeMongoId";
import { emit } from "./socketService";
import {
  clearProviderServiceGateCache,
  notifyProviderServiceRequired,
  resolveServiceProviderHomePath,
} from "./providerServiceGate";

export { normalizeAuthPayload, persistLogisticsSession } from "./authSession";
export { resolvePostLoginPath } from "./authRedirect";

export async function handleAuthSuccess({
  payload,
  dispatch,
  navigate,
  returnUrl,
  fallbackEmail = "",
}) {
  if (payload?.status_code !== 200) {
    toast.error(payload?.message || "Authentication failed");
    return false;
  }

  const data = normalizeAuthPayload(payload);
  const token = data?.token;
  const userId = persistUserId(data?._id);
  const role = data?.role;
  const ownerId = data?.owner_id || null;

  if (!token || userId == null) {
    toast.error(payload?.message || "Authentication failed");
    return false;
  }

  localStorage.setItem("token", token);
  localStorage.setItem("role", String(role));
  localStorage.setItem("expiresAt", expiresAt);

  if (Number(role) === Roles.LOGISTICS) {
    persistLogisticsSession(data);
  } else {
    persistTaskerSession();
  }

  if (Number(data?.email_verified) === 0) {
    navigate(otpVerificationPath(userId), { replace: true });
    toast.success(payload?.message);
    return true;
  }

  if (
    Number(data?.is_completeProfile) === 0 &&
    Number(role) === Roles.CUSTOMER
  ) {
    localStorage.setItem("temptoken", token);
    persistUserId(userId);
    localStorage.setItem("expiresAt", expiresAt);

    const profileResult = await autoCompleteCustomerProfile(dispatch, {
      email: data?.email || fallbackEmail,
      token,
      userId,
      role,
      expiresAt,
    });

    emit("new_user_connect", { userid: userId });
    const dest = resolvePostLoginPath({
      role,
      ownerId,
      returnUrl: consumeAuthReturnUrl() || returnUrl,
    });
    navigate(dest, { replace: true });
    toast.success(
      profileResult.ok
        ? payload?.message
        : profileResult.message || "Please try again later."
    );
    return true;
  }

  if (Number(data?.is_completeProfile) === 0) {
    if (
      Number(role) === Roles.SERVICE_PROVIDER ||
      Number(role) === Roles.CORPORATE
    ) {
      localStorage.setItem("temptoken", token);
      persistUserId(userId);
      clearProviderServiceGateCache();
      navigate(`/provider?role=${role}`, { replace: true });
      toast.success("Please Complete Your Profile.");
      return true;
    }
  }

  localStorage.removeItem("temptoken");

  const deepLink = consumeAuthReturnUrl() || returnUrl;
  let dest = resolvePostLoginPath({ role, ownerId, returnUrl: deepLink });

  if (Number(role) === Roles.SERVICE_PROVIDER) {
    clearProviderServiceGateCache();
    const homePath = await resolveServiceProviderHomePath({ force: true });
    dest =
      homePath === "/service/add"
        ? homePath
        : resolvePostLoginPath({ role, ownerId, returnUrl: deepLink });
    emit("new_user_connect", { userid: userId });
    navigate(dest, { replace: true });
    if (homePath === "/service/add") {
      notifyProviderServiceRequired();
    }
    toast.success(payload?.message);
    return true;
  }

  emit("new_user_connect", { userid: userId });
  navigate(dest, { replace: true });
  toast.success(payload?.message);
  return true;
}

export function socialLoginEndpoint(role) {
  const normalizedRole = Number(role);
  if (normalizedRole === Roles.SERVICE_PROVIDER) {
    return "/service/auth/socialLogin";
  }
  if (normalizedRole === Roles.CORPORATE) {
    return "/corporate/auth/socialLogin";
  }
  if (normalizedRole === Roles.LOGISTICS) {
    return "/logistics/auth/socialLogin";
  }
  return "/customer/auth/socialLogin";
}
