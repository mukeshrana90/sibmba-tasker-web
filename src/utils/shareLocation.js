export function buildLocationShareData(url) {
  return {
    title: "Live location",
    text: "View this location on Google Maps",
    url,
  };
}

export function canUseNativeShare(shareData) {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare(shareData))
  );
}

export async function tryNativeLocationShare(url) {
  if (!url) return false;
  const shareData = buildLocationShareData(url);
  if (!canUseNativeShare(shareData)) return false;

  try {
    await navigator.share(shareData);
    return true;
  } catch (err) {
    if (err?.name === "AbortError") return true;
    return false;
  }
}
