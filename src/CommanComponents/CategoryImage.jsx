import React from "react";
import {
  categoryImageFromPath,
  categoryImageUrl,
  handleCategoryImageError,
} from "../utils/landingUtils";

export default function CategoryImage({
  category,
  src,
  image,
  className,
  alt = "Category",
  ...rest
}) {
  let imageSrc = src;
  if (imageSrc === undefined) {
    if (category) imageSrc = categoryImageUrl(category);
    else imageSrc = categoryImageFromPath(image);
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={handleCategoryImageError}
      {...rest}
    />
  );
}
