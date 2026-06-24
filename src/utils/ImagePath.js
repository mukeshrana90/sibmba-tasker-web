import {
  buildPublicAssetUrl,
  categoryImageFromPath,
  corporateCategoryImageUrl,
  defaultImage,
  defaultProviderAvatar,
  productImageUrl,
  serviceImageUrl,
  userImageUrl,
} from "./landingUtils";

const ImagePathService = (filename) => {
  if (!filename) return defaultImage;
  if (filename.startsWith("http")) return filename;
  const path = filename.startsWith("/service/")
    ? filename
    : `/service/${filename}`;
  return buildPublicAssetUrl(path) || defaultImage;
};

const ImagePathCustomer = (filename) => userImageUrl(filename);

export {
  ImagePathService,
  ImagePathCustomer,
  buildPublicAssetUrl,
  categoryImageFromPath,
  corporateCategoryImageUrl,
  defaultImage,
  defaultProviderAvatar,
  productImageUrl,
  serviceImageUrl,
  userImageUrl,
};
