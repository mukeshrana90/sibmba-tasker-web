/** Same-origin Leaflet (avoids CDN cross-origin "Script error" in CRA overlay). */
const LEAFLET_CSS = "/vendor/leaflet/leaflet.css";
const LEAFLET_JS = "/vendor/leaflet/leaflet.js";

let loadPromise = null;

export function loadLeaflet() {
  if (typeof window !== "undefined" && window.L) {
    return Promise.resolve(window.L);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      if (window.L) {
        resolve(window.L);
        return;
      }
      const onLoad = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet loaded without window.L"));
      };
      const onError = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
        reject(new Error("Failed to load Leaflet"));
      };
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet loaded without window.L"));
    };
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}
