export function isLoggedIn() {
  return Boolean(localStorage.getItem("token"));
}

export function loginPathWithReturn(returnPath) {
  const path =
    returnPath ||
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/login?returnUrl=${encodeURIComponent(path)}`;
}

export function redirectToLogin(navigate, returnPath) {
  navigate(loginPathWithReturn(returnPath));
}

export function requireLogin(navigate, returnPath) {
  if (isLoggedIn()) return true;
  redirectToLogin(navigate, returnPath);
  return false;
}

export function safeReturnUrl(returnUrl) {
  if (!returnUrl || typeof returnUrl !== "string") return null;
  if (!returnUrl.startsWith("/") || returnUrl.startsWith("//")) return null;
  return returnUrl;
}

export const AUTH_RETURN_URL_KEY = "authReturnUrl";

export function setAuthReturnUrl(returnUrl) {
  const safe = safeReturnUrl(returnUrl);
  if (safe) {
    sessionStorage.setItem(AUTH_RETURN_URL_KEY, safe);
  }
}

export function peekAuthReturnUrl() {
  return safeReturnUrl(sessionStorage.getItem(AUTH_RETURN_URL_KEY));
}

export function consumeAuthReturnUrl() {
  const url = peekAuthReturnUrl();
  sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
  return url;
}

export function resolvePostAuthPath(queryReturnUrl) {
  return (
    safeReturnUrl(queryReturnUrl) ||
    peekAuthReturnUrl() ||
    null
  );
}
