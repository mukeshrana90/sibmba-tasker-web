import defaultImage from "../Assets/Images/placeholder.jpg";
import defaultProviderAvatar from "../Assets/Images/default-avatar.png";

const API_URL = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");

function buildPublicAssetUrl(relativePath) {
  if (!relativePath || relativePath === "undefined" || relativePath === "null") {
    return null;
  }
  if (relativePath.startsWith("http")) return relativePath;
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  const encoded = path
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(segment) : ""))
    .join("/");
  return `${API_URL}${encoded}`;
}

const AVATAR_COLORS = [
  "#0F5C4C",
  "#C2682B",
  "#2B5FC2",
  "#7A2BC2",
  "#0E7C6A",
  "#B0421F",
  "#C2A12B",
  "#2B86C2",
];

export function categoryImageFromPath(imagePath) {
  if (!imagePath || imagePath === "undefined" || imagePath === "null") {
    return defaultImage;
  }
  return buildPublicAssetUrl(imagePath) || defaultImage;
}

export function categoryImageUrl(cat) {
  return categoryImageFromPath(cat?.image);
}

export function providerImageUrl(sp) {
  const raw = sp?.profile_image ?? (typeof sp === "string" ? sp : null);
  if (!raw || raw === "undefined" || raw === "null") return defaultProviderAvatar;
  if (String(raw).startsWith("http")) return raw;

  let normalized = String(raw).replace(/\\/g, "/");
  if (normalized.startsWith("/public/")) {
    normalized = normalized.slice("/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) {
    normalized = normalized.startsWith("user/")
      ? `/${normalized}`
      : `/user/${normalized}`;
  } else if (!normalized.startsWith("/user/")) {
    const bare = normalized.slice(1);
    if (bare && !bare.includes("/")) {
      normalized = `/user/${bare}`;
    }
  }

  return buildPublicAssetUrl(normalized) || defaultProviderAvatar;
}

/** Any user object or profile_image path string */
export function userImageUrl(userOrPath) {
  if (userOrPath == null) return defaultProviderAvatar;
  if (typeof userOrPath === "string") {
    return providerImageUrl({ profile_image: userOrPath });
  }
  return providerImageUrl(userOrPath);
}

export function corporateCategoryImageUrl(image) {
  if (!image || image === "undefined" || image === "null") return defaultImage;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/corporate-category")) {
    return buildPublicAssetUrl(image) || defaultImage;
  }
  return buildPublicAssetUrl(`/corporate-category/${image}`) || defaultImage;
}

export function productImageUrl(filename) {
  if (!filename || filename === "undefined" || filename === "null") {
    return defaultImage;
  }
  if (filename.startsWith("http")) return filename;
  if (filename.startsWith("/products/")) {
    return buildPublicAssetUrl(filename) || defaultImage;
  }
  return buildPublicAssetUrl(`/products/${filename}`) || defaultImage;
}

export function handleUserImageError(e) {
  if (e?.currentTarget) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = defaultProviderAvatar;
  }
}

export function handleCategoryImageError(e) {
  if (e?.currentTarget) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = defaultImage;
  }
}

export function serviceImageUrl(filename) {
  if (!filename || filename === "undefined" || filename === "null") {
    return defaultImage;
  }
  if (filename.startsWith("http")) return filename;
  if (filename.startsWith("/")) return buildPublicAssetUrl(filename) || defaultImage;
  return buildPublicAssetUrl(`/user/${filename}`) || defaultImage;
}

export function taskImageUrl(filename) {
  if (!filename || filename === "undefined" || filename === "null") {
    return defaultImage;
  }
  if (filename.startsWith("http")) return filename;

  let normalized = String(filename).replace(/\\/g, "/");

  // API may store public/user/file.jpg — REACT_APP_API_URL already ends with /public
  if (normalized.startsWith("/public/")) {
    normalized = normalized.slice("/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }

  if (!normalized.startsWith("/")) {
    normalized = normalized.startsWith("user/")
      ? `/${normalized}`
      : `/user/${normalized}`;
  } else if (!normalized.startsWith("/user/")) {
    normalized = `/user${normalized}`;
  }

  return buildPublicAssetUrl(normalized) || defaultImage;
}

/** Community event photos are stored as `public/service/<file>` or bare filename. */
export function communityImageUrl(photo) {
  if (!photo || photo === "undefined" || photo === "null") {
    return defaultImage;
  }
  if (photo.startsWith("http")) return photo;

  let normalized = String(photo).replace(/\\/g, "/");
  if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) {
    normalized = normalized.startsWith("service/")
      ? `/${normalized}`
      : `/service/${normalized}`;
  } else if (!normalized.startsWith("/service/")) {
    normalized = `/service${normalized}`;
  }

  return buildPublicAssetUrl(normalized) || defaultImage;
}

export function providerInitials(name) {
  if (!name) return "SP";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function renderStars(rating) {
  const r = Math.round(parseFloat(rating) || 0);
  const filled = "★★★★★".slice(0, r);
  const empty = "☆☆☆☆☆".slice(0, 5 - r);
  return filled + empty;
}

export function formatPrice(price) {
  if (price == null || price === "") return "Contact";
  const n = Number(price);
  if (Number.isNaN(n)) return String(price);
  return `$${n}/hr`;
}

export function formatDisplayTitle(value, fallback = "") {
  if (value == null || value === "") return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function providerDisplayName(sp) {
  if (!sp) return "Provider";
  const raw = sp.company_name || sp.full_name || "Provider";
  return formatDisplayTitle(raw, "Provider");
}

function cleanLocationValue(val) {
  if (val == null || val === "" || val === "undefined" || val === "null") {
    return null;
  }
  return String(val).trim() || null;
}

export function providerLocation(sp) {
  if (!sp) return "Zimbabwe";
  return (
    cleanLocationValue(sp.suburbs) ||
    cleanLocationValue(sp.street_address) ||
    cleanLocationValue(sp.city) ||
    "Zimbabwe"
  );
}

export function isVerified(sp) {
  return sp?.email_verified === 1 || sp?.phone_verified === 1;
}

export { buildPublicAssetUrl, defaultImage, defaultProviderAvatar };
