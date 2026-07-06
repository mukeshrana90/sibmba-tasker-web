import { normalizeMongoId } from "./normalizeMongoId";

function unwrapDoc(item) {
  if (!item || typeof item !== "object") return item;
  return item._doc && typeof item._doc === "object" ? item._doc : item;
}

export function normalizeCategoryItem(item) {
  const doc = unwrapDoc(item);
  if (!doc || typeof doc !== "object") return null;

  const service_category_name = doc.service_category_name ?? doc.name ?? "";
  const _id = normalizeMongoId(doc._id);

  if (!_id || !service_category_name) return null;

  return {
    _id,
    service_category_name,
    image: doc.image ?? null,
    image_thumb: doc.image_thumb ?? item?.image_thumb ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function normalizeCategoryList(items) {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeCategoryItem).filter(Boolean);
}

export function normalizeCategoryResponseData(data) {
  if (!data || typeof data !== "object") return data;
  if (!Array.isArray(data.allCat)) return data;
  return {
    ...data,
    allCat: normalizeCategoryList(data.allCat),
  };
}
