import React from "react";
import {
  handleUserImageError,
  userImageUrl,
} from "../utils/landingUtils";

export default function UserAvatar({
  user,
  src,
  profileImage,
  className,
  alt = "",
  ...rest
}) {
  const imageSrc =
    src !== undefined && src !== null
      ? src || userImageUrl(null)
      : userImageUrl(user ?? profileImage);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleUserImageError}
      {...rest}
    />
  );
}
