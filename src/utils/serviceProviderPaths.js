const EXACT_PATHS = new Set([
  "/requests",
  "/allmyservices",
  "/taskslist",
  "/service-pro",
  "/browse-corporate-category",
  "/payment",
  "/edit-profile-company",
  "/my-subscription",
  "/product-history",
  "/community",
  "/messages",
  "/customerreviews",
  "/wallet",
  "/training-material",
  "/my-stats",
  "/change-password",
  "/contact-us",
]);

const PREFIX_PATHS = [
  "/serviceprocategory",
  "/serviceprocategorydetail",
  "/requestdetail",
  "/requestreject",
  "/servicetasksdetails",
  "/quotations-detail",
  "/service/",
  "/service-details/",
  "/search-for-service",
];

export function isServiceProviderPortalPath(pathname) {
  if (EXACT_PATHS.has(pathname)) return true;
  return PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));
}
