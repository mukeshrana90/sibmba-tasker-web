/**
 * One-shot device GPS. Resolves { lat, lng, accuracy, captured_at } or null
 * when unavailable / denied / timed out — callers carry on without it.
 */
export function readDeviceGps(timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          captured_at: new Date(p.timestamp || Date.now()).toISOString(),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
}

function getPosition(opts) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, opts);
  });
}

const toFix = (p) => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: p.coords.accuracy,
  captured_at: new Date(p.timestamp || Date.now()).toISOString(),
});

/**
 * Best-effort location for emergencies: GPS (high accuracy) first, then a
 * network / Wi-Fi fix (works on laptops without GPS) or a recent cached one.
 * Resolves { fix, error } — error is "denied" | "unavailable" | "unsupported".
 */
export async function readBestLocation({ highTimeoutMs = 12000, lowTimeoutMs = 15000 } = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { fix: null, error: "unsupported" };
  }
  try {
    const p = await getPosition({ enableHighAccuracy: true, timeout: highTimeoutMs, maximumAge: 30000 });
    return { fix: toFix(p), error: null };
  } catch (e) {
    if (e?.code === 1) return { fix: null, error: "denied" };
  }
  try {
    const p = await getPosition({ enableHighAccuracy: false, timeout: lowTimeoutMs, maximumAge: 10 * 60 * 1000 });
    return { fix: toFix(p), error: null };
  } catch (e) {
    return { fix: null, error: e?.code === 1 ? "denied" : "unavailable" };
  }
}
