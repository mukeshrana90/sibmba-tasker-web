/**
 * Scroll a form field into view, flash it and focus its input — used when
 * validation fails so the user sees WHICH field needs attention (instead of
 * only a toast while the field is off-screen). Fields are tagged with
 * data-field="<name>".
 */
export function focusField(name) {
  if (typeof document === "undefined") return;
  const el = document.querySelector(`[data-field="${name}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("field-flash");
  // restart the animation
  void el.offsetWidth;
  el.classList.add("field-flash");
  setTimeout(() => el.classList.remove("field-flash"), 2600);
  const input = el.matches("input, select, textarea, button")
    ? el
    : el.querySelector("input, select, textarea, button");
  setTimeout(() => input?.focus?.({ preventScroll: true }), 350);
}
