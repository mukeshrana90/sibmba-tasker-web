import { useState } from "react";
import {
  avatarColor,
  buildPublicAssetUrl,
  defaultProviderAvatar,
  providerDisplayName,
  providerInitials,
} from "../utils/landingUtils";

function resolveCustomProfileImage(provider) {
  const raw = provider?.profile_image;
  if (!raw || raw === "undefined" || raw === "null") return null;
  if (String(raw).startsWith("http")) {
    return String(raw) === defaultProviderAvatar ? null : String(raw);
  }

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

  const url = buildPublicAssetUrl(normalized);
  if (!url || url === defaultProviderAvatar) return null;
  if (/default-avatar/i.test(url)) return null;
  return url;
}

/**
 * Shows provider photo when available and loadable; otherwise colored initials.
 */
export default function ProviderAvatar({
  provider,
  className = "avatar",
  imgClassName = "avatar--img",
  name: nameOverride,
  children,
}) {
  const name = nameOverride || providerDisplayName(provider);
  const color = avatarColor(name);
  const initials = providerInitials(name);
  const imageSrc = resolveCustomProfileImage(provider);
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(imageSrc) && !imgFailed;

  return (
    <div
      className={`${className}${showImage ? ` ${imgClassName}` : ""}`}
      style={{ background: `linear-gradient(145deg,${color},${color}cc)` }}
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt=""
          onLoad={(e) => {
            const img = e.currentTarget;
            if (!img.naturalWidth || !img.naturalHeight) {
              setImgFailed(true);
            }
          }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="provider-avatar__initials">{initials}</span>
      )}
      {children}
    </div>
  );
}

export { resolveCustomProfileImage };
