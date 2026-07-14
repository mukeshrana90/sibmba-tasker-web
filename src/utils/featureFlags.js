/**
 * Feature flags from CRA env vars (REACT_APP_*).
 * Restart `npm start` / rebuild after changing .env values.
 */

function truthyEnv(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/** When true, Google login/signup buttons are hidden on web. */
export function isGoogleLoginDisabled() {
  return truthyEnv(process.env.REACT_APP_GOOGLE_LOGIN_DISABLE);
}
