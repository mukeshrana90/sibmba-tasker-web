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

export function bookingDetailPath(bookingId, query = "") {
  const id = normalizeMongoId(bookingId);
  if (!id) return "/requests";
  return query ? `/requestdetail/${id}?${query}` : `/requestdetail/${id}`;
}
