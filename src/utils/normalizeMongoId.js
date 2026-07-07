export function normalizeMongoId(id) {
  if (id == null) return "";
  if (typeof id === "string") {
    const trimmed = id.trim();
    if (trimmed === "[object Object]") return "";
    return trimmed;
  }

  if (typeof id === "object") {
    if (typeof id.$oid === "string") return id.$oid;

    const bufferData =
      id.buffer?.data ?? (id.type === "Buffer" ? id.data : null);
    if (Array.isArray(bufferData) && bufferData.length === 12) {
      return bufferData
        .map((byte) => Number(byte).toString(16).padStart(2, "0"))
        .join("");
    }

    if (typeof id.toString === "function") {
      const str = id.toString();
      if (/^[a-f\d]{24}$/i.test(str)) return str;
    }
  }

  const asString = String(id);
  return asString === "[object Object]" ? "" : asString;
}

export function persistUserId(id) {
  const normalized = normalizeMongoId(id);
  if (normalized) {
    localStorage.setItem("userId", normalized);
  }
  return normalized;
}

export function getStoredUserId(fallbackId) {
  const fromStorage = normalizeMongoId(localStorage.getItem("userId"));
  if (fromStorage) return fromStorage;

  const fromFallback = normalizeMongoId(fallbackId);
  if (fromFallback) {
    persistUserId(fromFallback);
    return fromFallback;
  }

  return "";
}

export function persistReceiverId(id) {
  const normalized = normalizeMongoId(id);
  if (normalized) {
    localStorage.setItem("reciverID", normalized);
  }
  return normalized;
}

export function messagesPath(peerId) {
  const id = normalizeMongoId(peerId);
  if (!id) return "/messages";
  return `/messages?userID=${encodeURIComponent(id)}`;
}

export function bookingDetailPath(bookingId, query = "") {
  const id = normalizeMongoId(bookingId);
  if (!id) return "/requests";
  return query ? `/requestdetail/${id}?${query}` : `/requestdetail/${id}`;
}

export function serviceEditPath(serviceId) {
  const id = normalizeMongoId(serviceId);
  if (!id) return "/allmyservices";
  return `/service/edit?service_id=${encodeURIComponent(id)}`;
}

export function serviceDetailPath(serviceId) {
  const id = normalizeMongoId(serviceId);
  if (!id) return "/allmyservices";
  return `/service-details/${id}`;
}

export function customerServiceDetailPath(serviceId, extraParams = {}) {
  const id = normalizeMongoId(serviceId);
  const params = new URLSearchParams();
  if (id) {
    params.set("service_id", id);
  }
  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/customer-service-detail?${query}` : "/customer-service-detail";
}

export function customerCategoryDetailPath(categoryId) {
  const id = normalizeMongoId(categoryId);
  return id
    ? `/customer-category-detail?categoryId=${encodeURIComponent(id)}`
    : "/services";
}

export function taskDetailPath(taskId) {
  const id = normalizeMongoId(taskId);
  return id ? `/task-detail/${id}` : "/my-task";
}

export function serviceProviderPath(providerId, serviceId) {
  const pid = normalizeMongoId(providerId);
  const sid = normalizeMongoId(serviceId);
  if (!pid) return "/services";
  return sid
    ? `/service-provider/${pid}?serviceId=${encodeURIComponent(sid)}`
    : `/service-provider/${pid}`;
}

export function serviceProCategoryPath(categoryId) {
  const id = normalizeMongoId(categoryId);
  return id ? `/serviceprocategory/${id}` : "/service-pro";
}

export function serviceProCategoryDetailPath(serviceId) {
  const id = normalizeMongoId(serviceId);
  return id ? `/serviceprocategorydetail/${id}` : "/service-pro";
}

export function otpVerificationPath(userId, extraParams = {}) {
  const id = normalizeMongoId(userId);
  if (!id) return "/login";
  const params = new URLSearchParams({ userId: id });
  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    params.set(key, String(value));
  });
  return `/otp-varification?${params.toString()}`;
}

export function resetPasswordPath(userId) {
  const id = normalizeMongoId(userId);
  return id ? `/reset-password?userId=${encodeURIComponent(id)}` : "/forgot-password";
}
