function safeVal(v) {
  return !v || v === "undefined" ? null : v;
}

export function formatWhatsAppPhone(provider) {
  const raw = provider?.phone_number;
  if (!raw) return "";

  const local = String(raw).startsWith("0") ? String(raw).slice(1) : String(raw);
  const digits = local.replace(/\D/g, "");
  const cc = String(provider?.country_code || "").replace(/\D/g, "");
  return `${cc}${digits}`;
}

export function buildWhatsAppQuoteMessage({
  providerName,
  serviceName,
  userLocation,
}) {
  return [
    `Hi ${providerName}, I found you on Simba Tasker.`,
    `I need help with:`,
    `Service: ${serviceName || "a service"}`,
    userLocation ? `Location: ${userLocation}` : null,
    `Please provide a quote. Thank you.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWhatsAppQuoteUrl(provider, message) {
  const phone = formatWhatsAppPhone(provider);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function resolveUserLocation(customerDetails) {
  return (
    safeVal(customerDetails?.street_address) ||
    safeVal(customerDetails?.suburbs) ||
    null
  );
}
