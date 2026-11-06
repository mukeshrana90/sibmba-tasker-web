/**
 * Item 51: returning visitors can land on the section they last used. New
 * visitors never have this key, so they always get the balanced home. Saved only
 * on an explicit choice (home cards and chips, the switcher, the bottom nav);
 * `activeModule` is separate and overwritten by every page view.
 */
export const LAST_SECTION_KEY = "lastSection";
const ENTRY_SEEN_KEY = "simba_entry_seen";

export function getLastSection() {
  try {
    const v = localStorage.getItem(LAST_SECTION_KEY);
    return v === "logistics" || v === "services" ? v : null;
  } catch {
    return null;
  }
}

/** Accepts the switcher's "tasker" as well as "services". */
export function setLastSection(section) {
  const next = section === "logistics" ? "logistics" : "services";
  try {
    localStorage.setItem(LAST_SECTION_KEY, next);
  } catch {
    /* storage unavailable */
  }
  return next;
}

// Only the first page of a tab can redirect, so the logo and the switcher still reach home.
let entryEligible = false;
try {
  if (!sessionStorage.getItem(ENTRY_SEEN_KEY)) {
    sessionStorage.setItem(ENTRY_SEEN_KEY, "1");
    entryEligible = window.location.pathname === "/" && !window.location.hash && !window.location.search;
  }
} catch {
  entryEligible = false;
}

/** Where to send a visitor opening "/" in a new tab, or null for the balanced home. */
export function lastSectionRedirect() {
  if (!entryEligible) return null;
  const last = getLastSection();
  return last === "logistics" ? "/logistics" : last === "services" ? "/services" : null;
}

export function consumeLastSectionRedirect() {
  entryEligible = false;
}
