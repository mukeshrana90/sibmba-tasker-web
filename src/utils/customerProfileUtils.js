export function emailUsernameFromEmail(email) {
  if (email == null || email === "") return "User";
  const raw = String(email).trim();
  const at = raw.indexOf("@");
  const local = (at >= 0 ? raw.slice(0, at) : raw).trim();
  if (!local || local === "undefined" || local === "null") return "User";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function sanitizeProfileValue(value, fallback = "") {
  if (value == null || value === "" || value === "undefined" || value === "null") {
    return fallback;
  }
  return String(value).trim();
}

export function customerDisplayName(customer, fallback = "User") {
  const name = sanitizeProfileValue(customer?.full_name);
  if (name) return name;
  const email = sanitizeProfileValue(customer?.email);
  if (email) return emailUsernameFromEmail(email);
  return fallback;
}

export function resolveCustomerEmail(source = {}) {
  const fromSource = sanitizeProfileValue(source?.email);
  if (fromSource) return fromSource;

  try {
    const saved = JSON.parse(localStorage.getItem("signupFormData") || "{}");
    const fromSignup = sanitizeProfileValue(saved?.email);
    if (fromSignup) return fromSignup;
  } catch {
    /* ignore malformed signup cache */
  }

  return "";
}

export function buildMinimalCustomerProfileFormData(fullName) {
  const formData = new FormData();
  formData.append("full_name", fullName);
  formData.append("is_completeProfile", "1");
  return formData;
}

export function finalizeCustomerSession({ token, userId, role = 1, expiresAt }) {
  localStorage.setItem("token", token);
  localStorage.setItem("userId", userId);
  localStorage.setItem("role", String(role));
  if (expiresAt != null) {
    localStorage.setItem("expiresAt", String(expiresAt));
  }
  localStorage.removeItem("temptoken");
}
