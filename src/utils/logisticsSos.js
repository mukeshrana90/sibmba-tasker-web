/** Where the emergency-contacts editor lives for the current user. */
export function emergencyContactsPath() {
  const role = Number(localStorage.getItem("role"));
  const ownerId = localStorage.getItem("owner_id");
  if (role === 4 && ownerId && ownerId !== "null") {
    return "/logistics/driver/emergency-contacts";
  }
  if (role === 4) return "/logistics/owner/emergency-contacts";
  return "/logistics/emergency-contacts";
}

/** SOS: Hub customers (roles 1–3), operators and fleet owners (v2.7.33). */
export function canUseSos() {
  const role = Number(localStorage.getItem("role"));
  return role === 1 || role === 2 || role === 3 || role === 4;
}
