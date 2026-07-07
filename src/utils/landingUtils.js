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

export function handleProviderAvatarError(e, initials = "SP") {
  const img = e?.currentTarget;
  if (!img) return;
  img.onerror = null;
  const parent = img.parentElement;
  if (!parent) return;
  img.style.display = "none";
  parent.textContent = initials;
}

export function handleReviewAvatarError(e, name) {
  handleProviderAvatarError(e, providerInitials(name).slice(0, 1));
}

export function handleCategoryImageError(e) {
  if (e?.currentTarget) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = defaultImage;
  }
}

const THUMB_PREFIX = "thumb_";

/** Build thumb path from stored image path (e.g. file.jpg → thumb_file.jpg). */
export function getThumbImagePath(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return null;

  let normalized = imagePath.trim().replace(/\\/g, "/");
  if (!normalized || normalized === "undefined" || normalized === "null") return null;

  const parts = normalized.split("/");
  const filename = parts.pop();
  if (!filename || filename.startsWith(THUMB_PREFIX)) return normalized;

  const thumbName = `${THUMB_PREFIX}${filename}`;
  return parts.length ? `${parts.join("/")}/${thumbName}` : thumbName;
}

export function serviceImageThumbUrl(filename) {
  const thumbPath = getThumbImagePath(filename);
  if (!thumbPath) return null;
  return serviceImageUrl(thumbPath);
}

/** Try thumb first; on 404 fall back to full image, then placeholder. */
export function handleServiceImageError(e, originalFilename) {
  if (!e?.currentTarget) return;

  const fullSrc = originalFilename ? serviceImageUrl(originalFilename) : null;
  if (fullSrc && e.currentTarget.src !== fullSrc) {
    e.currentTarget.onerror = () => handleCategoryImageError(e);
    e.currentTarget.src = fullSrc;
    return;
  }
  handleCategoryImageError(e);
}

export function resolveServiceListImageSrc(imagePath, thumbPathFromApi) {
  if (!imagePath) return null;
  if (thumbPathFromApi) {
    return serviceImageUrl(thumbPathFromApi);
  }
  return serviceImageThumbUrl(imagePath) || serviceImageUrl(imagePath);
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

export function shortenLocationLabel(text, maxWords = 3) {
  const full = String(text || "").trim();
  if (!full) return { display: "", full: "" };
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return { display: full, full };
  }
  return {
    display: `${words.slice(0, maxWords).join(" ")}...`,
    full,
  };
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

export function isTruthyVerified(value) {
  return value === 1 || value === true || value === "1";
}

export function verificationLabel(flag) {
  return isTruthyVerified(flag) ? "Verified" : "Not Verified";
}

export function verificationPillClass(flag) {
  return isTruthyVerified(flag)
    ? "verif-pill verified"
    : "verif-pill unverified";
}

export function displayField(value) {
  if (value == null || value === "" || value === "undefined" || value === "null") {
    return "N/A";
  }
  return String(value);
}

export function formatProviderPhone(sp) {
  if (!sp?.phone_number || sp.phone_number === "undefined") return "N/A";
  const code = sp.country_code && sp.country_code !== "undefined" ? sp.country_code : "";
  return `${code}${sp.phone_number}`.trim() || "N/A";
}

export function providerRoleLabel(sp) {
  if (!sp) return "Service provider";
  const identify = sp.identify_yourself;
  if (identify && identify !== "undefined") return identify;
  const company = sp.company_name;
  if (company && company !== "undefined") return company;
  return "Service provider";
}

export { buildPublicAssetUrl, defaultImage, defaultProviderAvatar };
