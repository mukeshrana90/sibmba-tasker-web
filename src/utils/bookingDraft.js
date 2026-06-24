const DRAFT_KEY = "serviceBookingDraft";

export function buildServiceDetailBookingPath(serviceId) {
  const params = new URLSearchParams({
    service_id: serviceId,
    openBooking: "1",
  });
  return `/customer-service-detail?${params.toString()}`;
}

export function saveBookingDraft(draft) {
  if (!draft?.serviceId) return;
  sessionStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      serviceId: draft.serviceId,
      selectedDate: draft.selectedDate || "",
      timeState: draft.timeState || "",
      msgState: draft.msgState || "",
      customLocation: draft.customLocation || null,
    })
  );
}

export function loadBookingDraft() {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export function clearBookingDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function hasBookingDraftForService(serviceId) {
  const draft = loadBookingDraft();
  return Boolean(draft && draft.serviceId === serviceId);
}

export function parseDraftDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
