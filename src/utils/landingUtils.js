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
  img.remove();
  parent.classList.remove("avatar--img");
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
  if (String(filename).startsWith("http")) return filename;

  let normalized = String(filename).replace(/\\/g, "/").trim();
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
  } else if (!normalized.startsWith("/user/") && !normalized.startsWith("/service/")) {
    normalized = `/user${normalized}`;
  }

  return buildPublicAssetUrl(normalized) || defaultImage;
}

/** True when a path/filename looks like a displayable photo (not PDF/docs). */
export function isDisplayableServiceImage(filename) {
  if (!filename || filename === "undefined" || filename === "null") return false;
  const path = String(filename).split("?")[0].toLowerCase();
  if (/\.pdf$/i.test(path) || path.includes(".pdf")) return false;
  if (/\.(jpe?g|png|gif|webp|bmp|heic|heif|avif|svg)$/i.test(path)) return true;
  // Uploaded blob URLs / unknown extensions without .pdf — allow
  if (path.startsWith("blob:") || path.startsWith("data:image")) return true;
  // No extension but not clearly a doc
  if (!/\.[a-z0-9]{2,5}$/i.test(path)) return true;
  return false;
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

export function parsePriceValue(price) {
  if (price == null || price === "") return null;
  if (typeof price === "number") {
    return Number.isFinite(price) ? price : null;
  }
  const cleaned = String(price).replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Formats a price for display as `$10` / `$10.50` without double currency symbols. */
export function formatMoney(price, fallback = "N/A") {
  const n = parsePriceValue(price);
  if (n == null) return fallback;
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2)}`;
}

export function formatPrice(price) {
  const n = parsePriceValue(price);
  if (n == null) {
    if (price == null || price === "") return "Contact";
    const s = String(price).trim();
    // Non-numeric labels like "Quote" / "Contact"
    if (s && !/[$\d]/.test(s)) return s;
    return "Contact";
  }
  return `$${n}/hr`;
}

export function formatDisplayTitle(value, fallback = "") {
  if (value == null || value === "") return fallback;
  let text = String(value).trim();
  if (!text) return fallback;

  // Normalize awkward commas: "A , B ,C" → "A, B, C"
  text = text.replace(/\s*,\s*/g, ", ").replace(/,\s*,+/g, ", ").trim();

  const letters = text.replace(/[^A-Za-z]/g, "");
  const isAllCaps = letters.length > 0 && letters === letters.toUpperCase();
  const isAllLower = letters.length > 0 && letters === letters.toLowerCase();

  // ALL CAPS / all lowercase → full Title Case for consistent cards.
  if (isAllCaps || isAllLower) {
    return text
      .toLowerCase()
      .replace(/(^|[\s/_-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
  }

  // Mixed case → Title Case each word; keep short ALL-CAPS tokens (e.g. MTM).
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      const wordLetters = part.replace(/[^A-Za-z]/g, "");
      if (
        wordLetters.length >= 2 &&
        wordLetters.length <= 4 &&
        wordLetters === wordLetters.toUpperCase()
      ) {
        return part;
      }
      const lower = part.toLowerCase();
      return lower.replace(/^[a-z]/, (c) => c.toUpperCase());
    })
    .join("");
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
