import { normalizeMongoId } from "./normalizeMongoId";

const ID_FIELD = /^(_id|.*Id)$/;

function unwrapDoc(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (value._doc && typeof value._doc === "object") return unwrapDoc(value._doc);
  return value;
}

function shouldNormalizeIdField(key, val) {
  if (key === "_id") return true;
  if (!ID_FIELD.test(key)) return false;
  if (val == null || typeof val !== "object" || Array.isArray(val)) return false;
  return normalizeMongoId(val) !== "";
}

export function normalizeApiDocument(value, depth = 0) {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeApiDocument(item, depth + 1));
  }
  if (typeof value !== "object" || value instanceof Date) return value;

  const doc = unwrapDoc(value);
  if (typeof doc !== "object" || Array.isArray(doc)) return doc;
  if (depth > 15) return doc;

  const result = {};
  for (const [key, val] of Object.entries(doc)) {
    if (shouldNormalizeIdField(key, val)) {
      result[key] = normalizeMongoId(val);
      continue;
    }
    if (val && typeof val === "object") {
      result[key] = normalizeApiDocument(val, depth + 1);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export function normalizeBookingList(data) {
  if (Array.isArray(data)) {
    return data.map((item) => normalizeApiDocument(item));
  }
  return normalizeApiDocument(data);
}
