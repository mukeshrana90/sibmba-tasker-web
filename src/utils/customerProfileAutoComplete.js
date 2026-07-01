import CustomerActions from "../Redux/Actions/CustomerActions";
import { setCustomer } from "../Redux/Reducers/LoginSlice";
import {
  buildMinimalCustomerProfileFormData,
  emailUsernameFromEmail,
  finalizeCustomerSession,
  resolveCustomerEmail,
} from "./customerProfileUtils";

export {
  buildMinimalCustomerProfileFormData,
  customerDisplayName,
  emailUsernameFromEmail,
  finalizeCustomerSession,
  resolveCustomerEmail,
  sanitizeProfileValue,
} from "./customerProfileUtils";

export async function autoCompleteCustomerProfile(
  dispatch,
  { email, token, userId, role = 1, expiresAt }
) {
  if (!token || !userId) {
    return { ok: false, message: "Missing session details" };
  }

  localStorage.setItem("temptoken", token);
  localStorage.setItem("userId", userId);
  if (expiresAt != null) {
    localStorage.setItem("expiresAt", String(expiresAt));
  }

  const fullName = emailUsernameFromEmail(resolveCustomerEmail({ email }));
  const formData = buildMinimalCustomerProfileFormData(fullName);
  const apiRes = await dispatch(CustomerActions.createProfile(formData));

  if (apiRes?.payload?.success) {
    finalizeCustomerSession({ token, userId, role, expiresAt });
    if (apiRes?.payload?.data) {
      dispatch(setCustomer(apiRes.payload.data));
    }
    return {
      ok: true,
      message: apiRes?.payload?.message || "Profile created successfully",
      data: apiRes?.payload?.data,
    };
  }

  finalizeCustomerSession({ token, userId, role, expiresAt });
  return {
    ok: false,
    message: apiRes?.payload?.message || "Profile setup failed",
  };
}
