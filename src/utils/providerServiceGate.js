import Api from "../Services/api";
import { toast } from "react-toastify";

const CACHE_KEY = "sp_has_service";

export const PROVIDER_SERVICE_REQUIRED_MESSAGE =
  "Please create at least one service to use the service provider facilities.";

/** Paths a service provider may use before creating their first service. */
const SETUP_EXACT = new Set(["/service/add", "/provider", "/login", "/sign-up"]);

const SETUP_PREFIXES = [
  "/otp-varification",
  "/forgot-password",
  "/reset-password",
  "/terms-and-conditions",
  "/privacy-policy",
];

export function clearProviderServiceGateCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function markProviderHasService(has) {
  try {
    sessionStorage.setItem(CACHE_KEY, has ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function getCachedProviderHasService() {
  try {
    const value = sessionStorage.getItem(CACHE_KEY);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

export function isProviderServiceSetupPath(pathname = "") {
  const path = String(pathname).split("?")[0];
  if (SETUP_EXACT.has(path)) return true;
  return SETUP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function countServicesFromPayload(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.services)) return data.services.length;
  if (Array.isArray(data?.data)) return data.data.length;
  return 0;
}

export function notifyProviderServiceRequired() {
  toast.dismiss("provider-service-required");
  toast.info(PROVIDER_SERVICE_REQUIRED_MESSAGE, {
    toastId: "provider-service-required",
  });
}

export async function fetchProviderHasService({ force = false } = {}) {
  if (!force) {
    const cached = getCachedProviderHasService();
    if (cached !== null) return cached;
  }

  const response = await Api.get("service/getMyServices");
  const has = countServicesFromPayload(response?.data) > 0;
  markProviderHasService(has);
  return has;
}

export async function resolveServiceProviderHomePath({ force = true } = {}) {
  try {
    const has = await fetchProviderHasService({ force });
    return has ? "/requests" : "/service/add";
  } catch (error) {
    console.error("Provider service gate check failed:", error);
    // Fail closed: force add-service so incomplete accounts cannot reach dashboard.
    markProviderHasService(false);
    return "/service/add";
  }
}
