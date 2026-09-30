/**
 * Resolve Socket.IO server URL.
 * In local HTTPS CRA, REACT_APP_API_URLL is often "/" — use same-origin so
 * setupProxy can forward /socket.io → REACT_APP_PROXY_TARGET (backend).
 */
export function getSocketBaseUrl(envUrl = process.env.REACT_APP_API_URLL) {
  const raw = envUrl == null ? "" : String(envUrl).trim();
  if (!raw || raw === "/") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  return raw.replace(/\/+$/, "") || "";
}

/** Paths the CRA dev proxy must forward to the API (including Socket.IO). */
export const DEV_PROXY_SOCKET_PATH = "/socket.io";
