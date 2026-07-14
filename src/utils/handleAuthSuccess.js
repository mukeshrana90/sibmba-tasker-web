import { toast } from "react-toastify";
import { consumeAuthReturnUrl } from "./authRedirect";
import { expiresAt } from "./CommonFunction";
import { Roles } from "./Roles";
import { autoCompleteCustomerProfile } from "./customerProfileAutoComplete";
import { persistUserId, otpVerificationPath } from "./normalizeMongoId";
import { emit } from "./socketService";

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

  const data = payload?.data;
  const token = data?.token;
  const userId = persistUserId(data?._id);
  const role = data?.role;

  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  localStorage.setItem("expiresAt", expiresAt);

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
    navigate(consumeAuthReturnUrl() || returnUrl || "/");
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
      navigate(`/provider?role=${role}`, { replace: true });
      toast.success("Please Complete Your Profile.");
      return true;
    }
  }

  localStorage.removeItem("temptoken");
  if (Number(role) === Roles.CUSTOMER) {
    emit("new_user_connect", { userid: userId });
    navigate(consumeAuthReturnUrl() || returnUrl || "/");
  } else if (Number(role) === Roles.SERVICE_PROVIDER) {
    navigate("/requests");
    emit("new_user_connect", { userid: userId });
  } else if (Number(role) === Roles.CORPORATE) {
    navigate("/corporate");
    emit("new_user_connect", { userid: userId });
  }
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
  return "/customer/auth/socialLogin";
}
