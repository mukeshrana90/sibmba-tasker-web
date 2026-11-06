/**
 * Google / Apple popup sign-in: stop the button spinner when the user closes
 * the popup. Firebase only reports "popup closed" after its own polling plus an
 * 8 s timeout (and never when the popup's opener link is cut), so the button
 * kept loading. When our window gets focus back and the sign-in still hasn't
 * finished after `graceMs`, `onAbandoned` runs. The sign-in promise itself is
 * left alone: a slow but real success still completes.
 *
 * Returns a stop() function — call it once the popup promise settles.
 */
export function watchPopupAbandoned(onAbandoned, { graceMs = 2500 } = {}) {
  if (typeof window === "undefined") return () => {};
  let timer = null;
  let stopped = false;
  const arm = () => {
    if (stopped || (typeof document !== "undefined" && document.visibilityState === "hidden")) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped) onAbandoned();
    }, graceMs);
  };
  window.addEventListener("focus", arm);
  document.addEventListener("visibilitychange", arm);
  return () => {
    stopped = true;
    clearTimeout(timer);
    window.removeEventListener("focus", arm);
    document.removeEventListener("visibilitychange", arm);
  };
}

/** Firebase codes meaning the user closed / replaced the popup (no error toast). */
export function isPopupCancel(error) {
  const code = error?.code;
  return code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled";
}

/** Resolve `promise`, or `fallback` after `ms` (e.g. a browser prompt nobody answers). */
export function withTimeout(promise, ms, fallback) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
