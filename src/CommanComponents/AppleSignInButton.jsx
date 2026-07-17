import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../Redux/Actions/CustomerActions";
import ButtonLoader from "./ButtonLoader";
import { getAppleIdToken } from "../utils/appleAuth";
import { getFirebaseToken } from "../utils/fireBaseConfig";
import { isAppleLoginDisabled } from "../utils/featureFlags";

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.427 2.204-1.252 3.08-.96 1.03-2.24 1.656-3.37 1.55-.07-1.1.42-2.24 1.23-3.1.93-1 2.41-1.74 3.39-1.53zM20.86 17.41c-.61 1.36-.9 1.96-1.68 3.16-1.09 1.66-2.63 3.73-4.54 3.75-1.07.02-1.8-.7-3.34-.7-1.55 0-2.34.68-3.4.72-1.85.07-3.26-2.24-4.36-3.9C1.7 17.6.2 12.74 2.45 9.48c1.24-1.8 3.2-2.93 5.06-2.93 1.56 0 2.87 1.02 3.34 1.02.47 0 1.87-1.26 3.74-.96.64.03 2.44.26 3.6 1.96-.09.06-2.15 1.26-2.13 3.76.03 2.98 2.61 3.97 2.8 4.08z" />
    </svg>
  );
}

export default function AppleSignInButton({
  role = 1,
  disabled = false,
  onSuccess,
  onNeedRole,
  allowCreate = true,
  label = "Continue with Apple",
  showDivider = false,
}) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  if (isAppleLoginDisabled()) {
    return null;
  }

  const handleClick = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      const socialToken = await getAppleIdToken();
      const deviceToken =
        (await getFirebaseToken().catch(() => "")) ||
        localStorage.getItem("device_token") ||
        "";

      const response = await dispatch(
        CustomerActions.socialLogin({
          type: 2,
          social_token: socialToken,
          role: Number(role),
          device_type: "web",
          device_token: deviceToken || undefined,
          allow_create: allowCreate,
        })
      );

      const payload = response?.payload;

      if (payload?.status_code === 200 && payload?.data?.needs_role) {
        if (onNeedRole) {
          onNeedRole({ socialToken, deviceToken, type: 2 });
        }
        return;
      }

      if (onSuccess) {
        await onSuccess(payload);
      }
    } catch (error) {
      const code = error?.code;
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      const message =
        code === "auth/unauthorized-domain"
          ? "Apple sign-in isn't enabled for this domain yet."
          : code === "auth/operation-not-allowed"
            ? "Apple sign-in is not enabled in Firebase yet."
            : error?.message || "Apple sign-in failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showDivider && (
        <div className="auth-divider">
          <span>or</span>
        </div>
      )}
      <button
        type="button"
        className="btn btn-apple btn-block"
        onClick={handleClick}
        disabled={loading || disabled}
      >
        {loading ? <ButtonLoader /> : <AppleIcon />}
        {!loading && label}
      </button>
    </>
  );
}
