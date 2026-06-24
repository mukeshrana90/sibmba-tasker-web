export function scrollToLandingSection(sectionId) {
  if (!sectionId) return false;
  const el = document.getElementById(sectionId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `/#${sectionId}`);
  return true;
}

export function navigateToLandingSection(sectionId, navigate, pathname) {
  if (pathname === "/") {
    scrollToLandingSection(sectionId);
    return;
  }
  navigate(`/#${sectionId}`);
}
